<?php
require '../../app.php';

if (app('security')->isLocalMachine()) {
	$url = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
	if (substr($url,0,12) == '/api/forward') {
		header('Location: http://'.app('server')->ipv4.':'.app('server')->client_port.substr($url,12));
		exit();
	}
	http_response_code(400);
	exit;
}

http_response_code(400);
exit;
?>