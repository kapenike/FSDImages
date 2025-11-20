<?php

require('../../app.php');

$config = (object)[
	'host' => app('server')->ipv4,
	'ws_port' => app('server')->websocket_port,
	'host_port' => app('server')->client_port
];

?>
<html>
<script>

// init socket
const socket = new WebSocket('ws://<?php echo $config->host; ?>:<?php echo $config->ws_port; ?>');

const GLOBAL = {
	project_uid: 'uid_40657b63', // example project UID
};

// request images from server
function requestOverlay(uid, overlay_slug) {
	return 'http://<?php echo $config->host.':'.$config->host_port; ?>/request_image.php?uid='+uid+'&overlay_slug='+overlay_slug+'&time='+Date.now();
}
function requestAsset(uid, asset_slug, is_file) {
	let asset_reference = is_file ? 'asset_filename='+asset_slug : 'asset_slug='+asset_slug;
	return 'http://<?php echo $config->host.':'.$config->host_port; ?>/request_image.php?uid='+uid+'&'+asset_reference+'&time='+Date.now();
}

socket.addEventListener('open', (event) => {
	// required initialization to identify that this is a self-controlled client as well as request what overlays and data paths to listen to
	// self-controlled client will require a project UID otherwise it will do nothing
	socket.send(JSON.stringify({
		state: 'connect',
		self_controlled: true,
		project_uid: GLOBAL.project_uid, // example project UID
		listeners: {
			overlays: [
				'face_off_screen' // listen for changes to the Face off Screen overlay
			],
			data: [
				'series_type',
				'team_1/team_data',
				'team_1/series_score',
				'team_2/team_data',
				'team_2/series_score'
			]
		}
	}));
});

socket.addEventListener('message', (event) => {
	let data = JSON.parse(event.data);
	
	// initial connection will return requested data as a direct child of event.data
	// the best way to check for initialization data is if the "identifier" property is included
	if (data.identifier) {
		console.log('Initialization...');
		console.log('Data:');
		console.log(data.data);
		console.log('Overlays:');
		console.log(data.overlays);
		/*
			overlays can be requested over HTTP using...
			requestOverlay(GLOBAL.project_uid, data.overlays[some_index]);
			
			assets can also be requested over HTTP using two methods:
			- using the filename property found within an asset object within the asset data object
				- requestAsset(GLOBAL.project_uid, data.data['team_1/team_data'].logo.file, true); <- boolean tells the function to request using the filename
			- using a direct reference to the asset slug (not found in the return data but offered to the user via the asset manager within the FSDImages application
				- requestAsset(GLOBAL.project_uid, 'team_green_logo');
		*/
		return;
	}
	
	// updates to a specific data path or overlay are captured under data.update
	if (data.update) {
		console.log('Data path updates as [key=>value] pairs:');
		console.log(data.update.data);
		console.log('Overlays updated as list of overlay slugs:');
		console.log(data.update.overlays);
	}
	
});

socket.addEventListener('error', (event) => {
	// in the event of a server error
});

socket.addEventListener('close', (event) => {
	// in the event that the server shutsdown or client disconnects
});

</script>
<style>
html, body {
	width: 100%;
	height: 100%;
	padding: 0;
	margin: 0;
	font-family: Verdana;
}
</style>
<body>
</body>
</html>