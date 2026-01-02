<?php

$font_filename = basename($_SERVER['PHP_SELF']);

// if filename is empty, export font css instead
if (empty($font_filename)) {
	require('../app.php');
	app('fonts')->generateFontCSS(true);
}

// point font lookup towards localhost primary server font storage location
$font_file = '../fonts/'.$font_filename;

if (file_exists($font_file)) {
	header('Content-Type: application/octet-stream');
	header('Content-Disposition: inline; filename="'.$font_filename.'"');
	header('Content-Length: '.filesize($font_file));
	readfile($font_file);
	exit;
} else {
	http_response_code(404);
}

?>