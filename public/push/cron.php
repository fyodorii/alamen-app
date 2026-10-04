<?php
// Sends the scheduled notifications. Run it every 15 minutes (or more often for
// quicker new-topic alerts; the salawat reminder keeps its own 15-minute spacing):
//   php /path/to/app/push/cron.php
//   or: wget -q -O - "https://www.al-amen.com/app/push/cron.php?key=CRON_KEY"
require __DIR__ . '/lib.php';

if (PHP_SAPI !== 'cli' && !(isset($_GET['key']) && hash_equals(CRON_KEY, (string) $_GET['key']))) {
    http_response_code(403);
    exit('Forbidden');
}
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(300);

// Skip this run if the previous one is still sending.
$lock = fopen(data_path('cron.lock'), 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) exit("Already running\n");

$state = store_read('state.json');
$now = time();
$outbox = []; // [topic, message]

// New topics since the last run. The first run only records where we are.
$threads = latest_threads();
if ($threads) {
    $newest = max(array_map(function ($t) { return $t['id']; }, $threads));
    $last = isset($state['last_thread_id']) ? (int) $state['last_thread_id'] : 0;
    if ($last) {
        $fresh = array_values(array_filter($threads, function ($t) use ($last) { return $t['id'] > $last; }));
        usort($fresh, function ($a, $b) { return $b['id'] - $a['id']; });
        if (count($fresh) === 1) {
            $outbox[] = ['news', [
                'title' => 'موضوع جديد · ' . $fresh[0]['forum'],
                'body' => $fresh[0]['title'],
                'url' => APP_URL . '?t=' . $fresh[0]['id'],
                'tag' => 'news',
            ]];
        } elseif (count($fresh) > 1) {
            $outbox[] = ['news', [
                'title' => count($fresh) . ' مواضيع جديدة في شبكة الأمين',
                'body' => $fresh[0]['title'] . ' … وغيرها',
                'url' => APP_URL . '?t=' . $fresh[0]['id'],
                'tag' => 'news',
            ]];
        }
    }
    $state['last_thread_id'] = max($last, $newest);
}

// Salawat reminder (a minute of slack so a 15-minute cron never skips one).
$lastSalawat = isset($state['last_salawat']) ? (int) $state['last_salawat'] : 0;
// An empty push carries no text, so without encryption send at most one message per run.
$roomForSalawat = can_encrypt() || !$outbox;
if ($roomForSalawat && $now - $lastSalawat >= SALAWAT_EVERY_MINUTES * 60 - 60) {
    $i = isset($state['salawat_index']) ? (int) $state['salawat_index'] : 0;
    $outbox[] = ['salawat', [
        'title' => 'الصلاة على النبي ﷺ',
        'body' => $SALAWAT[$i % count($SALAWAT)],
        'url' => APP_URL,
        'tag' => 'salawat',
    ]];
    $state['salawat_index'] = $i + 1;
    $state['last_salawat'] = $now;
}

$subs = store_read('subscriptions.json');
$gone = [];
$sent = 0;
foreach ($outbox as $item) {
    list($topic, $message) = $item;
    store_update('last.json', function (&$last) use ($message) { $last = $message; });
    foreach ($subs as $id => $sub) {
        if (empty($sub['topics'][$topic])) continue;
        try {
            $status = push_send($sub, $message);
        } catch (Exception $e) {
            echo 'Error: ' . $e->getMessage() . "\n";
            continue;
        }
        if ($status === 404 || $status === 410) $gone[] = $id;
        elseif ($status >= 200 && $status < 300) $sent++;
        else echo "Push service answered $status for one device\n";
    }
}

// Forget devices whose subscription has expired or was removed.
if ($gone) {
    store_update('subscriptions.json', function (&$all) use ($gone) {
        foreach ($gone as $id) unset($all[$id]);
    });
}

$state['last_run'] = $now;
$state['last_sent'] = $sent;
store_update('state.json', function (&$s) use ($state) { $s = $state; });

echo 'Messages: ' . count($outbox) . ", delivered: $sent, removed: " . count($gone) . ', devices: ' . count($subs) . "\n";
