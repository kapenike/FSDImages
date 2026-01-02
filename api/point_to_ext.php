<?php

// output ext api applications

if (file_exists($filename)) {
	header('Content-Type: application/octet-stream');
	header('Content-Disposition: inline; filename="'.$filename.'"');
	header('Content-Length: '.filesize($filename));
	readfile($filename);
	exit;
} else {
	http_response_code(404);
}

?>