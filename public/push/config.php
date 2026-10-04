<?php
// Settings for the push notification scripts. Edit these before uploading.

// Contact address sent to the push services (Apple, Google, Mozilla) with each notification.
define('PUSH_CONTACT', 'alwaledi@outlook.sa');

// The forum, and where the app is hosted (notification taps open the app here).
define('FORUM_URL', 'https://www.al-amen.com/vb/');
define('APP_URL', 'https://www.al-amen.com/app/');

// Secret for running cron.php from a URL (cron jobs that use wget/curl instead of php).
define('CRON_KEY', 'W6wHOvUMLbdATSuIXd56kynl');

// Minutes between salawat reminders.
define('SALAWAT_EVERY_MINUTES', 15);

// Same texts as the app (src/salawat.js).
$SALAWAT = [
    'اللهم صلِّ وسلِّم وبارك على نبينا محمد ﷺ',
    '﴿إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا﴾ [الأحزاب: 56]',
    'اللهم صلِّ على محمد وعلى آل محمد، كما صليت على إبراهيم وعلى آل إبراهيم، إنك حميد مجيد',
    'قال ﷺ: «مَن صلّى عليَّ واحدةً صلّى الله عليه عشرًا» رواه مسلم',
];
