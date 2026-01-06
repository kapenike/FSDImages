<?php

// require app
require('../app.php');

// get api connection details
$config = (object)[
	'host' => app('server')->ipv4,
	'ws_port' => app('server')->websocket_port,
	'host_port' => app('server')->client_port
];


?>
class api_server {
	
	connection = null;
	project_uid = null;
	listeners = null;
	event_functions = null;
	
	constructor(project_uid, listeners, event_functions, is_self_controlled = true) {
		
		// create connection
		this.connection = new WebSocket('ws://<?php echo $config->host.':'.$config->ws_port; ?>');
		
		this.project_uid = project_uid;
		this.listeners = listeners;
		
		// stash user supplied event functions
		this.event_functions = {
			open: event_functions.open || null,
			message: event_functions.message || null,
			error: event_functions.error || null,
			close: event_functions.close || null
		};
		
		// attach websocket events
		this.attachWebsocketEvents(is_self_controlled);
		
	}
	
	attachWebsocketEvents(is_self_controlled) {
		this.connection.addEventListener('open', (event) => {
			this.apiEvent('open', event);
			this.connection.send(JSON.stringify({
				state: 'connect',
				self_controlled: is_self_controlled,
				project_uid: this.project_uid,
				listeners: this.listeners
			}));
		});
		this.connection.addEventListener('message', (event) => {
			this.apiEvent('message', event);
		});
		this.connection.addEventListener('error', (event) => {
			this.apiEvent('error', event);
		});
		this.connection.addEventListener('close', (event) => {
			this.apiEvent('close', event);
		});
	}
	
	apiEvent(caller, event) {
		if (this.event_functions[caller] != null) {
			this.event_functions[caller](event);
		}
	}
	
	writePipe(data) {
		this.connection.send(JSON.stringify({ write_pipe: data }));
	}
	
	// request overlay from server with project uid and overlay slug
	requestOverlay(uid, overlay_slug) {
		return 'http://<?php echo $config->host.':'.$config->host_port; ?>/request_image/?uid='+uid+'&overlay_slug='+overlay_slug+'&'+Date.now();
	}
	
	// request asset image from server using project uid and asset_slug OR filename with "is_file" flag set to true
	requestAsset(uid, asset_slug, is_file) {
		let asset_reference = is_file ? 'asset_filename='+asset_slug : 'asset_slug='+asset_slug;
		return 'http://<?php echo $config->host.':'.$config->host_port; ?>/request_image/?uid='+uid+'&'+asset_reference+'&time='+Date.now();
	}
	
}
