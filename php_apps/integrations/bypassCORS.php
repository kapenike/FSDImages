<?php
// cors doesn't do shit, cors has never done shit, it's like a no dumping sign behind a building where people still dump their trash
require('../../app.php');

if (isset($_POST['request'])) {
	$package = json_decode($_POST['request']);
	
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $package->url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	if (strtolower($package->method) == 'post') {
		curl_setopt($ch, CURLOPT_POST, true);
	}
	
	if (isset($package->data)) {
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($package->data));
	}
	
	$headers = [];
	if (isset($package->headers)) {
		foreach ($package->headers as $header) {
			$headers[] = $header;
		}
	}

	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

	$response = curl_exec($ch);

	if (curl_errno($ch)) {
		app('respond')->json(false, curl_error($ch));
	}
	
	app('respond')->json(true, $response);
	
}


?>