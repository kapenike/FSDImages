<?php

class FSDImages {
	
	function start($args) {
		
		// return running ip:ports to cli
		$cli_notif = (object)[];
		
		// only available on windows currently, allow api server to launch on a given network adapter
		$use_adapter = false;
		for ($i=0; $i<count($args); $i++) {
			if (str_contains($args[$i], 'websocket_use_adapter=')) {
				$use_adapter = trim(explode('websocket_use_adapter=',$args[$i])[1]);
				break;
			}
		}
		
		// if websocket only start
		if (in_array('websocket', $args)) {
			
			$cli_notif->client = app('server')->launchApiServer($use_adapter);
			
		} else {
		
			// start client, "external" arg determines if it should launch on ipv4 or localhost
			$cli_notif->host = app('server')->launchApplication(in_array('external', $args));
			
			// if CLI includes 'all', start websocket server and client server as well
			if (in_array('all', $args)) {
				$cli_notif->client = app('server')->launchApiServer($use_adapter);
			}
		
		}
		
		echo json_encode($cli_notif);
		
	}
	
	function stop($args) {
		
		// if websocket only stop
		if (in_array('websocket', $args)) {
			
			app('server')->stopApiServer();
			
		} else {
		
			// kill application process
			app('server')->stopApplication();
			
			// if CLI includes reference to 'all', kill websocket server and client too
			if (in_array('all', $args)) {
				
				app('server')->stopApiServer();
				
			}
		
		}
		
	}
	
}

?>