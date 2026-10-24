<?php
// Saves (or removes) a device's push subscription and which alerts it wants.
//   POST {"subscription": {...}, "topics": {"news": true, "salawat": true}}
//   POST {"endpoint": "...", "remove": true}
require __DIR__ . '/lib.php';

const MAX_SUBSCRIPTIONS = 50000;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'POST only'], 405);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) json_out(['error' => 'Bad JSON'], 400);

$endpoint = isset($in['subscription']['endpoint']) ? $in['subscription']['endpoint'] : (isset($in['endpoint']) ? $in['endpoint'] : '');
if (!endpoint_allowed($endpoint)) json_out(['error' => 'Unknown push service'], 400);

try {
    $ok = store_update('subscriptions.json', function (&$subs) use ($in, $endpoint) {
        $id = sha1($endpoint);
        if (!empty($in['remove'])) {
            unset($subs[$id]);
            return true;
        }
        if (!isset($subs[$id]) && count($subs) >= MAX_SUBSCRIPTIONS) return false;
        $keys = isset($in['subscription']['keys']) && is_array($in['subscription']['keys']) ? $in['subscription']['keys'] : [];
        $subs[$id] = [
            'endpoint' => $endpoint,
            'keys' => [
                'p256dh' => isset($keys['p256dh']) ? (string) $keys['p256dh'] : '',
                'auth' => isset($keys['auth']) ? (string) $keys['auth'] : '',
            ],
            'topics' => [
                'news' => !empty($in['topics']['news']),
                'salawat' => !empty($in['topics']['salawat']),
            ],
            'updated' => time(),
        ];
        return true;
    });
    json_out($ok ? ['ok' => true] : ['error' => 'Too many subscriptions'], $ok ? 200 : 503);
} catch (Exception $e) {
    json_out(['error' => $e->getMessage()], 500);
}
