<?php

class shellController {
	
	function executeCommands($puid, $json) {
		
		foreach ($json as $command) {
			
			 pclose(popen($command->command, 'r'));
			
		}
		
		app('respond')->json(true, '');
		
	}
	
}

?>