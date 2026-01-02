<?php

$font_filename = basename($_SERVER['PHP_SELF']);

// if filename is fonts directory, instead import fonts css
if ($font_filename == 'fonts') {
	require('../app.php');
	app('fonts')->generateFontCSS(false);
	exit;
}

// point font lookup towards localhost primary server font storage location
$font_file = '../fonts/'.$font_filename;

if (file_exists($font_file)) {
	header('Content-Type: font/'.pathinfo($font_filename, PATHINFO_EXTENSION));
	header('Content-Disposition: inline; filename="'.$font_filename.'"');
	header('Content-Length: '.filesize($font_file));
	readfile($font_file);
} else {
	http_response_code(404);
}

?>