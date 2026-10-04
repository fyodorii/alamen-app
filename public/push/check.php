<?php
// Status page: open https://www.al-amen.com/app/push/check.php after uploading.
require __DIR__ . '/lib.php';

$checks = [];
$checks[] = ['إصدار PHP ' . PHP_VERSION, version_compare(PHP_VERSION, '7.1', '>='), 'يلزم 7.1 أو أحدث'];
$checks[] = ['OpenSSL', extension_loaded('openssl'), 'فعّل إضافة openssl من لوحة الاستضافة'];
$checks[] = ['cURL', function_exists('curl_init'), 'فعّل إضافة curl من لوحة الاستضافة'];
$checks[] = ['iconv', function_exists('iconv'), 'فعّل إضافة iconv'];
$writable = is_writable(__DIR__ . '/data');
$checks[] = ['مجلد push/data قابل للكتابة', $writable, 'اجعل صلاحيات المجلد 755 أو 775'];

$keyError = '';
try {
    if ($writable) vapid_keys();
} catch (Exception $e) {
    $keyError = $e->getMessage();
}
$checks[] = ['مفاتيح الإشعارات (VAPID)', $writable && !$keyError, $keyError ?: 'تعتمد على الخطوات السابقة'];
$checks[] = ['تشفير نص الإشعار', can_encrypt(), 'يعمل بدونه (يجلب الجهاز النص من الخادم)، لكن PHP 7.3+ أفضل'];

$subs = store_read('subscriptions.json');
$state = store_read('state.json');
$lastRun = isset($state['last_run']) ? date('Y-m-d H:i', $state['last_run']) . ' (توقيت الخادم)' : 'لم يعمل بعد';
?>
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>حالة الإشعارات</title>
<style>
  body { font-family: -apple-system, Tahoma, sans-serif; background: #eef2f7; color: #152238; max-width: 640px; margin: 0 auto; padding: 20px 16px; line-height: 1.8; }
  h1 { color: #1f4e79; font-size: 1.4em; }
  li { background: #fff; border: 1px solid #dde4ee; border-radius: 12px; padding: 8px 14px; margin: 6px 0; list-style: none; }
  ul { padding: 0; }
  .ok { color: #1d7a46; font-weight: bold; }
  .bad { color: #b42318; font-weight: bold; }
  small { color: #64748b; display: block; }
</style>
</head>
<body>
<h1>حالة إشعارات تطبيق الأمين</h1>
<ul>
<?php foreach ($checks as $c): ?>
  <li><span class="<?= $c[1] ? 'ok' : 'bad' ?>"><?= $c[1] ? '✔' : '✘' ?></span> <?= htmlspecialchars($c[0]) ?>
    <?php if (!$c[1]): ?><small><?= htmlspecialchars($c[2]) ?></small><?php endif; ?></li>
<?php endforeach; ?>
  <li>الأجهزة المشتركة: <b><?= count($subs) ?></b></li>
  <li>آخر تشغيل لمهمة الإرسال (cron): <b><?= htmlspecialchars($lastRun) ?></b></li>
</ul>
</body>
</html>
