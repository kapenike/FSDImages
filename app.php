<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// no htaccess or hierarchical structure so create a relative base path method
function getBasePath() {
	$cwd = getcwd();
	if (!str_contains($cwd, 'FSDImages')) {
		http_response_code(400);
		exit;
	}
	$pos = strrpos($cwd, 'FSDImages');
	return substr($cwd, 0, $pos).'FSDImages/';
}

// $APP stores loaded classes as an instance of app({$class})
$APP = (object)[];

// app() is an instance and an initializer
function app($app, ...$params) {
	global $APP;
	if (!isset($APP->$app)) {
		// strip directory from app declarations
		$class_name = $app;
		if (str_contains($class_name, '/')) {
			$split = explode('/', $class_name);
			$class_name = array_pop($split);
		}
		require(getBasePath().'/php_apps/'.$app.'.php');
		$APP->$app = new $class_name(...$params);
	}
	return $APP->$app;
}

// ensure external launched application is only accessed from self or whitelisted ips
app('security')->test();

?>