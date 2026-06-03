<?php
require '../../app.php';

if (app('security')->isLocalMachine()) {
	$url = $_SERVER["REQUEST_URI"];
	if (substr($url,0,12) == '/api/forward') {
		$server_data = app('server')->getServerData();
		if ($server_data->api_ip != null && $server_data->api_client_port != null) {
			header('Location: http://'.$server_data->api_ip.':'.$server_data->api_client_port.substr($url,12));
			exit();
		}
	}
	http_response_code(400);
	exit;
}

http_response_code(400);
exit;
?>