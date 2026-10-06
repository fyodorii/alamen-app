<?php
// Lets the GitHub Pages preview read the forum. Browsers block cross-site reads
// unless the answer allows the preview's origin, and this server ignores Header
// lines in .htaccess, so this script fetches the guest page and adds the header.
// Only the pages the app reads (src/api.js), without cookies.

const PREVIEW_ORIGIN = 'https://fyodorii.github.io';
const FORUM_URL = 'https://www.al-amen.com/vb/';

header('Access-Control-Allow-Origin: ' . PREVIEW_ORIGIN);
header('Cache-Control: no-store');

$path = isset($_GET['p']) ? (string) $_GET['p'] : '';
if (!preg_match('~^(index|forumdisplay|printthread|showthread|external)\.php(\?[A-Za-z0-9_=&%.-]*)?$~', $path)) {
    http_response_code(400);
    exit;
}

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

$url = FORUM_URL . $path;
list($body, $status, $type) = fetch_forum($url);
if ($body === false || $status === 0) {
    list($body, $status, $type) = fetch_forum($url, ['www.al-amen.com:443:127.0.0.1']);
}
if ($body === false || $status === 0) {
    http_response_code(502);
    exit;
}

http_response_code($status);
header('Content-Type: ' . ($type !== '' ? $type : 'text/html; charset=windows-1256'));
echo $body;
