<?php 
// point font lookup towards localhost primary server font storage location

$font_filename = basename($_SERVER['PHP_SELF']);
$font_file = '../../../fonts/'.$font_filename;

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