/*
!!! ALL sub_setters WITHOUT a save to path will be parsed as 3pa commands
		only 3pa applications enabled within project settings will be parsed and ran
		
		COMMAS WITHIN THE VALUES LIST MUST BE ESCAPED
		action(value_1, value_2, this contains: commas\, value_3\, and this)

		delay - all commands can be delayed by prepending a delay command
			e.g.: delay(2000) vb::gain(3, -60) after a 2000ms delay, set bus 3 gain to -60 in voicemeeter
			
		priority - commands can conflict, either by intention or not. highest priority wins
			e.g.: priority(2)obs::scene(Scene 1) and priority(1)obs::scene(Scene 2) ... this will only continue with swapping to Scene 1 because its priority is highest
			
			... use case: batch hide all sources in a scene, like a list of all map images. Have a final entry that enables a source titled with the current match state map
										with the highest priority, so that even though its hidden by the command list, the current state to show wins by priority
						
		NOTE: priority filtering only affects actions on the same delay timer and action, or other factors set within the integration's class

*/

function executeCommandList(cl) {
	
	// initialize 3pa integration classes
	let integrations = {
		vb: new voicemeeter,
		obs: new obs,
		http: new http,
		shell: new shell
	};
	
	// if no integrations are active, return
	if (Object.keys(integrations).every(key => integrations[key].active == false)) {
		return;
	}
	
	// loop and parse commands
	cl.forEach(command => {
		
		// allow command to parse variables
		command = getRealValue(command);
		
		// if command returns an object from getRealValue, continue, user has messed up variable path
		if (isObject(command)) {
			return;
		}
		
		// parse command
		let parsed_command = parseCommand(command);
		
		// ensure parsing is valid
		if (parsed_command) {
			
			// ensure identifier exists and integration is active
			if (integrations[parsed_command.identifier] && integrations[parsed_command.identifier].active) {
				
				// run integration specific parse on remaining data
				integrations[parsed_command.identifier].parse(parsed_command);
				
			}
			
		}
		
	});
	
	// run priority check, then execute commands for each integration
	Object.keys(integrations).forEach(key => {
		
		// filter out conflicting commands
		integrations[key].priorityCheck();
		
		// run commands
		integrations[key].run();
		
	});
	
}

function parseCommand(command) {
	
	let output = {
		delay: -1,
		priority: 0
	};
	
	// convert HTML entities to text
	let working_area = Create('textarea', {
		innerHTML: command
	});
	command = working_area.value.trim();
	working_area = null;
	
	// convert break elements to newline characters
	command = command.replaceAll('<br>', '\n').replaceAll('<br />', '\n');
	
	// look for delay
	if (command.indexOf('delay(') > -1) {
		let delay = command.split('delay(')[1].split(')')[0];
		output.delay = delay;
		command = command.replace('delay('+delay+')','');
	}
	
	// look for priority
	if (command.indexOf('priority(') > -1) {
		let priority = command.split('priority(')[1].split(')')[0];
		output.priority = priority;
		command = command.replace('priority('+priority+')','');
	}
	
	// look for identifier
	if (command.indexOf('::') > -1) {
		
		// parse command
		let split_id_value = command.split('::');
		output.identifier = split_id_value[0].trim();
		split_id_value = split_id_value[1].split('(');
		output.action = split_id_value[0];
		let closer = split_id_value[1].lastIndexOf(')');
		output.values = split_id_value[1].slice(0, closer).split(',');
		
		// resolve any splits made on escaped commas
		for (let i=0; i<output.values.length; i++) {
			if (output.values[i].slice(-1) == '\\') {
				output.values[i] = output.values[i].slice(-1)+','+output.values[i+1];
				output.values.splice(i+1, 1);
			}
		}
		
		return output;
		
	} else {
		
		// no identifier, return
		return false;
		
	}
	
}