<?php

// this scripts requires a pipe key
if (!isset($_GET['pipe']) || empty($_GET['pipe'])) {
	http_response_code(404);
}

// require app, this also ensures current remote connection is from local machine or whitelisted ip
require('../app.php');

// get current api_server controller key
$controller_key = app('server')->requestConnectionDetails()->controller_key;

// output auth hash as js const var
echo 'const API_WORKER_AUTH_TOKEN = \''.hash('sha1', $controller_key.$_GET['pipe']).'\';';


?>
