<?php

class FSDImages {
	
	// location of locally served application
	public $local_host = 'localhost';
	public $application_port = '8000';
	public $application_ip = null;
	
	function start($args) {
		
		// return running ip:ports to cli
		$cli_notif = (object)[];
		
		// if websocket only start
		if (in_array('websocket', $args)) {
			
			$cli_notif->client = app('server')->launchWebsocketServer();
			
		} else {
		
			// check if application should run on external ipv4 or localhost (external IP called via 'php start_client.php external')
			$this->application_ip = (in_array('external', $args) ? app('server')->ipv4 : $this->local_host);
			
			// start client
			$cli_notif->host = app('server')->launchApplication($this->application_ip);
			
			// if CLI includes 'all', start websocket server and client server as well
			if (in_array('all', $args)) {
				$cli_notif->client = app('server')->launchWebsocketServer();
			}
		
		}
		
		echo json_encode($cli_notif);
		
	}
	
	function stop($args) {
		
		// if websocket only stop
		if (in_array('websocket', $args)) {
			
			app('server')->stopWebsocketServer();
			
		} else {
		
			// kill application process
			app('server')->stopApplication();
			
			// if CLI includes reference to 'all', kill websocket server and client too
			if (in_array('all', $args)) {
				
				app('server')->stopWebsocketServer();
				
			}
		
		}
		
	}
	
}

?>