<?php
// The most recent notification, for service workers that received an empty push
// (used when this server's PHP cannot encrypt payloads).
require __DIR__ . '/lib.php';

json_out(store_read('last.json'));
