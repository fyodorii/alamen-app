<?php
// Web Push (RFC 8030 / 8291 / 8292) in plain PHP using only openssl and curl.
require_once __DIR__ . '/config.php';

function b64url_encode($bin)
{
    return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
}

function b64url_decode($s)
{
    return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4));
}

function data_path($name)
{
    return __DIR__ . '/data/' . $name;
}

function json_out($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function store_read($name)
{
    $path = data_path($name);
    if (!is_file($path)) return [];
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

// Read-modify-write a JSON file under an exclusive lock, so the cron job and
// subscribe requests never overwrite each other. $fn receives the data by reference.
function store_update($name, $fn)
{
    $fh = fopen(data_path($name), 'c+');
    if (!$fh) throw new Exception('Cannot write ' . $name . ' (is push/data writable?)');
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $data = $raw !== '' ? json_decode($raw, true) : [];
    if (!is_array($data)) $data = [];
    $result = $fn($data);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}

function ec_public_raw($key)
{
    $d = openssl_pkey_get_details($key);
    return "\x04" . str_pad($d['ec']['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\0", STR_PAD_LEFT);
}

function new_ec_key()
{
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$key) throw new Exception('OpenSSL cannot create EC keys on this server');
    return $key;
}

// The server's VAPID key pair, created on first use and kept in data/vapid.json.
function vapid_keys()
{
    $file = data_path('vapid.json');
    if (!is_file($file)) {
        $key = new_ec_key();
        openssl_pkey_export($key, $pem);
        $fresh = json_encode(['private_pem' => $pem, 'public' => b64url_encode(ec_public_raw($key))]);
        // "x" fails if another request created the file first; then we use theirs.
        $fh = @fopen($file, 'x');
        if ($fh) {
            fwrite($fh, $fresh);
            fclose($fh);
        }
    }
    $keys = json_decode(file_get_contents($file), true);
    if (empty($keys['private_pem'])) throw new Exception('Bad data/vapid.json');
    return $keys;
}

// ES256 signatures come out of OpenSSL as DER; JWT needs the raw 64-byte r||s form.
function der_to_raw_signature($der)
{
    $pos = 2;
    if (ord($der[1]) & 0x80) $pos += ord($der[1]) & 0x7f;
    $out = '';
    for ($i = 0; $i < 2; $i++) {
        $pos++; // INTEGER tag
        $len = ord($der[$pos++]);
        $int = ltrim(substr($der, $pos, $len), "\0");
        $pos += $len;
        $out .= str_pad($int, 32, "\0", STR_PAD_LEFT);
    }
    return $out;
}

function vapid_authorization($endpoint)
{
    $keys = vapid_keys();
    $u = parse_url($endpoint);
    $audience = $u['scheme'] . '://' . $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
    $header = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $claims = b64url_encode(json_encode([
        'aud' => $audience,
        'exp' => time() + 12 * 3600,
        'sub' => 'mailto:' . PUSH_CONTACT,
    ], JSON_UNESCAPED_SLASHES));
    $input = $header . '.' . $claims;
    if (!openssl_sign($input, $der, $keys['private_pem'], OPENSSL_ALGO_SHA256)) throw new Exception('VAPID signing failed');
    return 'vapid t=' . $input . '.' . b64url_encode(der_to_raw_signature($der)) . ', k=' . $keys['public'];
}

// Encrypted payloads need ECDH (PHP 7.3+). Without it we send an empty push and the
// service worker fetches the text from pending.php instead.
function can_encrypt()
{
    return function_exists('openssl_pkey_derive') && function_exists('hash_hkdf')
        && in_array('aes-128-gcm', openssl_get_cipher_methods(), true);
}

function ec_public_pem($raw)
{
    $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $raw;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

// RFC 8291 "aes128gcm" content encoding.
function encrypt_payload($payload, $p256dh, $auth)
{
    $uaPublic = b64url_decode($p256dh);
    $authSecret = b64url_decode($auth);
    if (strlen($uaPublic) !== 65 || strlen($authSecret) < 16) throw new Exception('Bad subscription keys');

    $local = new_ec_key();
    $asPublic = ec_public_raw($local);
    $shared = openssl_pkey_derive(openssl_pkey_get_public(ec_public_pem($uaPublic)), $local);
    if ($shared === false) throw new Exception('ECDH failed');
    $shared = str_pad($shared, 32, "\0", STR_PAD_LEFT);

    $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0" . $uaPublic . $asPublic, $authSecret);
    $salt = random_bytes(16);
    $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);

    $tag = '';
    $cipher = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
    return $salt . pack('N', 4096) . chr(65) . $asPublic . $cipher . $tag;
}

// Only the browsers' push services may be stored as endpoints.
function endpoint_allowed($endpoint)
{
    $u = parse_url((string) $endpoint);
    if (!$u || ($u['scheme'] ?? '') !== 'https' || empty($u['host'])) return false;
    $host = strtolower($u['host']);
    foreach (['web.push.apple.com', 'fcm.googleapis.com', 'android.googleapis.com', 'push.services.mozilla.com', 'notify.windows.com'] as $allowed) {
        if ($host === $allowed || substr($host, -strlen('.' . $allowed)) === '.' . $allowed) return true;
    }
    return false;
}

// Returns the HTTP status from the push service (201 = delivered, 404/410 = gone).
function push_send(array $sub, array $message)
{
    $headers = [
        'TTL: 86400',
        'Urgency: normal',
        'Authorization: ' . vapid_authorization($sub['endpoint']),
    ];
    $body = '';
    if (can_encrypt() && !empty($sub['keys']['p256dh']) && !empty($sub['keys']['auth'])) {
        $json = json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $body = encrypt_payload($json, $sub['keys']['p256dh'], $sub['keys']['auth']);
        $headers[] = 'Content-Encoding: aes128gcm';
        $headers[] = 'Content-Type: application/octet-stream';
    }
    $headers[] = 'Content-Length: ' . strlen($body);

    $ch = curl_init($sub['endpoint']);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $status;
}

function http_get($url)
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_USERAGENT => 'AlAmenPush/1.0',
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $status === 200 ? $body : false;
}

// Newest threads from the forum's RSS feed (served as windows-1256).
function latest_threads()
{
    $xml = http_get(FORUM_URL . 'external.php?type=RSS2');
    if ($xml === false) return [];
    $xml = iconv('windows-1256', 'UTF-8//IGNORE', $xml);
    preg_match_all('#<item>(.*?)</item>#s', $xml, $items);
    $threads = [];
    foreach ($items[1] as $item) {
        if (!preg_match('#<guid[^>]*>[^<]*?t=(\d+)#', $item, $id)) continue;
        $field = function ($tag) use ($item) {
            if (!preg_match('#<' . $tag . '[^>]*>(.*?)</' . $tag . '>#s', $item, $m)) return '';
            $v = preg_replace('#^<!\[CDATA\[|\]\]>$#', '', trim($m[1]));
            return trim(html_entity_decode(strip_tags($v), ENT_QUOTES, 'UTF-8'));
        };
        $threads[] = ['id' => (int) $id[1], 'title' => $field('title'), 'forum' => $field('category')];
    }
    return $threads;
}
