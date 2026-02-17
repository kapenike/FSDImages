<?php

class atemController {
	
	function executeCommands($puid, $json) {
		
		$location = json_decode(file_get_contents(getBasePath().'/data/'.$puid.'/container.json'))->settings->atem_location;
		
		$host_port = (str_contains($location, ':') ? explode(':', $location) : null);
		
		if ($host_port != null) {
			
			// only expecting 1 command at a time until next update for integrations class
			$command = $json[0];
			
			$fp = fsockopen($host_port[0], $host_port[1], $errno, $errstr, 1);
			
			if ($fp) {
				
				fwrite($fp, "VIDEO OUTPUT ROUTING:\n".$command->output." ".$command->input."\n\n");

				fclose($fp);
				
				app('respond')->json(true, '');
				
			} else {
				
				app('respond')->json(false, $errno."\r\n".$errstr);
				
			}
			
		}
		
	}
	
}

?>