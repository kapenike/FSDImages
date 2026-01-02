<?php
// routing
$route = trim(parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH),'/');
if (substr($route,0,5) == 'fonts') {
	require('font.php');
} else if (substr($route,0,13) == 'request_image') {
	require('request_image.php');
} else {
	if ($route != '' && file_exists('./ext/'.$route)) {
		echo file_get_contents('./ext/'.$route);
		exit;
	}
}

// default api application for allowing easy connection to live display of output overlays
// parse init variables
$init = [];
if (isset($_GET['uid'])) {
	$init['project_uid'] = $_GET['uid'];
	if (isset($_GET['overlay'])) {
		$init['listeners']['overlays'] = [$_GET['overlay']];
	}
}

?>
<html>
<script src="/api_connection_library.js.php"></script>
<script>

document.addEventListener('DOMContentLoaded', function () {
	
	let init = JSON.parse('<?php echo json_encode($init); ?>');
	
	const apiserver = new api_server(init.project_uid, init.listeners, {
		message: function (event) {
			let data = JSON.parse(event.data);
	
			if (data.identifier) {
				
				// server identifier for controller to match up to screen, if no image is already present
				if (document.getElementById('main').children[0]?.tagName.toLowerCase() != 'img') {
					document.getElementById('main').innerHTML = '<h1>^_^<br />server connected<br />'+data.identifier+'</h1>';
				}
				
			}
			
			if (data.project_uid) {
				
				// global init from initial declaration, can change from controller
				GLOBAL = data;
				document.getElementById('main').innerHTML = '<img id="overlay_image" src="'+apiserver.requestOverlay(GLOBAL.project_uid, GLOBAL.overlays[0])+'" />';
				
			} else if (data.update) {

				// update of data within current state
				if (data.update.overlays.length > 0) {
					document.getElementById('overlay_image').src = apiserver.requestOverlay(GLOBAL.project_uid, GLOBAL.overlays[0]);
				}
			}
		},
		error: function () {
			document.getElementById('main').innerHTML = '<h1>x_x<br />server is dead</h1>';
		},
		close: function () {
			document.getElementById('main').innerHTML = '<h1>@_@<br />closed connection</h1>';
		}
	}, false);
	
});

</script>
<style>
html, body, #main {
	width: 100%;
	height: 100%;
	padding: 0;
	margin: 0;
	font-family: Verdana;
}

h1 {
	font-size: 120px;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
}
img {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	max-width: 100%;
  max-height: 100%;
  height: auto;
  display: block;
}
</style>
<body>
<div id="main"></div>
</body>
</html>