<?php
// The app reads the forum's guest pages through this script (src/api.js):
// - it keeps each page for a minute or two (cache/), so readers after the first
//   get it at once instead of waiting for the forum to build it (index.php takes
//   1-2 seconds), and sends it compressed;
// - it lets the GitHub Pages preview read the forum: browsers block cross-site
//   reads unless the answer allows the preview's origin, and this server ignores
//   Header lines in .htaccess.
// Only the pages the app reads, without cookies.

const PREVIEW_ORIGIN = 'https://fyodorii.github.io';
const FORUM_URL = 'https://www.al-amen.com/vb/';
// Seconds a page is reused, by script.
const CACHE_SECONDS = ['index' => 120, 'forumdisplay' => 45, 'printthread' => 60, 'showthread' => 120, 'external' => 60];
const CACHE_DIR = __DIR__ . '/cache';

header('Access-Control-Allow-Origin: ' . PREVIEW_ORIGIN);
header('Cache-Control: no-store');

$path = isset($_GET['p']) ? (string) $_GET['p'] : '';
if (!preg_match('~^(index|forumdisplay|printthread|showthread|external)\.php(\?[A-Za-z0-9_=&%.-]*)?$~', $path, $m)) {
    http_response_code(400);
    exit;
}
$ttl = CACHE_SECONDS[$m[1]];

function fetch_forum($url, $resolve = null)
{
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_USERAGENT => 'AlAmenApp/1.0 (preview)',
        CURLOPT_ENCODING => '',
    ];
    // Some hosts cannot reach their own public address; ask this machine directly.
    if ($resolve) $opts[CURLOPT_RESOLVE] = $resolve;
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    return [$body, $status, $type];
}

// Cache files hold the content type on the first line, then the page.
function cache_ready()
{
    if (!is_dir(CACHE_DIR) && !@mkdir(CACHE_DIR, 0755)) return false;
    if (!is_file(CACHE_DIR . '/.htaccess')) {
        @file_put_contents(CACHE_DIR . '/.htaccess', "Require all denied\nDeny from all\n");
    }
    return is_writable(CACHE_DIR);
}

function send_page($status, $type, $body, $state)
{
    http_response_code($status);
    header('Content-Type: ' . ($type !== '' ? $type : 'text/html; charset=windows-1256'));
    header('X-Cache: ' . $state);
    if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) ob_start('ob_gzhandler');
    echo $body;
    exit;
}

$useCache = cache_ready();
$file = CACHE_DIR . '/' . sha1($path) . '.page';
if ($useCache && is_file($file) && time() - filemtime($file) < $ttl) {
    $saved = @file_get_contents($file);
    $cut = $saved === false ? false : strpos($saved, "\n");
    if ($cut !== false) send_page(200, substr($saved, 0, $cut), substr($saved, $cut + 1), 'hit');
}

$url = FORUM_URL . $path;
list($body, $status, $type) = fetch_forum($url);
if ($body === false || $status === 0) {
    list($body, $status, $type) = fetch_forum($url, ['www.al-amen.com:443:127.0.0.1']);
}
if ($body === false || $status === 0) {
    http_response_code(502);
    exit;
}

if ($useCache && $status === 200 && $body !== '') {
    $tmp = $file . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $type . "\n" . $body) !== false) @rename($tmp, $file);
    // Now and then, drop pages nobody asked for in a day.
    if (mt_rand(1, 200) === 1) {
        foreach (glob(CACHE_DIR . '/*.page') ?: [] as $old) {
            if (time() - filemtime($old) > 86400) @unlink($old);
        }
    }
}
send_page($status, $type, $body, 'miss');
