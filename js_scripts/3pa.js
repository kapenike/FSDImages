/*
	!!! all sub_setters WITHOUT a save to path will be parsed as 3pa commands
			only 3pa applications enabled within project settings will be parsed and ran
	
	##APPS##
		- general
			delay - all commands can be delayed by prefacing with a delay command
				e.g.: delay(2000) vb::gain(3, -60) after a 2000ms delay, set bus 3 gain to -60 in voicemeeter
				
		- Voicemeeter: vb::ACTION(bus, ...params) 
				*priority defines which condition on a bus should activate if multiple affect the same, default is 0, first of same priority wins
					delayed commands match priority only if start and delay time are equal
			gain - vb::gain(3, -60, 7) sets gain to -60 on bus 3 with priority 7
			mute - vb::mute(2, true) sets bus 2 mute to true, set to false to unmute
			fade - vb::fade(2, 12, 2000, 2) fades bus 2 gain to 12 over a 2000ms delay with priority 2
			
		- OBS: obs::ACTION(scene, ...params)
				*priority defines which scene is set and the toggle condition of a source
			scene - obs::scene(Scene 1, 3); sets obs scene to "Scene 1" with priority 3
			source - obs::source(Scene 1, Name Banners, true); sets the display of source "Name Banners" within "Scene 1" to visible, false would remove visibility
			volume - obs::volume(Main Audio Channel, 16, 1); sets db level of "Main Audio Channel" to 16 with priority of 1
			mute - obs::mute(Main Audio Channel, true, 1); mutes "Main Audio Channel" priority of 1, set to false to unmute
*/

function executeCommandList(cl) {
	
	// determine which 3pa apps are turned on
	let use_vb = GLOBAL.active_project.settings.voicemeeter_3pa_enabled;
	let use_obs = GLOBAL.active_project.settings.obs_3pa_enabled;
	
	// if none are active, return
	if (!use_vb && !use_obs) {
		return;
	}
	
	// app output
	let app_output = {
		vb: [],
		obs: []
	};
	
	cl.forEach(command => {
		
		// allow command to parse variables
		command = getRealValue(command);
		
		// if command returns an object from getRealValue, continue, user has messed up variable path
		if (isObject(command)) {
			return;
		}
		
		// check for delay
		let delay = command.indexOf('delay(');
		if (delay > -1) {
			let end = command.indexOf(')');
			delay = command.slice(delay, end);
			command = command.slice(end).trim();
		}
		
		// determine app
		if (command.indexOf('vb::') > -1) {
			
			// determine values for app command call
			let parsed_command = {
				delay: delay,
				action: null,
				bus: null,
				value: null,
				param_1: null,
				priority: 0
			};
			parsed_command.action = command.split('vb::')[1].split('(')[0];
			let values = command.split('(')[1].split(')')[0].split(',');
			parsed_command.bus = values[0].trim();
			parsed_command.value = values[1].trim();
			if (parsed_command.action == 'fade') {
				parsed_command.param_1 = values[2].trim();
				if (values[3]) {
					parsed_command.priority = parseInt(values[3].trim());
				}
			} else if (values[2]) {
				parsed_command.priority = parseInt(values[2].trim());
			}
			app_output.vb.push(parsed_command);
			
		} else if (command.indexOf('obs::') > -1) {
			
			// determine values for app command call
			let parsed_command = {
				delay: delay,
				action: null,
				scene: null,
				source: null,
				audio_channel: null,
				mute: null,
				value: null,
				priority: 0
			};
			parsed_command.action = command.split('obs::')[1].split('(')[0];
			let values = command.split('(')[1].split(')')[0].split(',');
			if (parsed_command.action == 'scene') {
				parsed_command.scene = values[0].trim();
				if (values[1]) {
					parsed_command.priority = values[1].trim();
				}
			} else if (parsed_command.action == 'source') {
				parsed_command.scene = values[0].trim();
				parsed_command.source = values[1].trim();
				parsed_command.value = values[2].trim();
				if (values[3]) {
					parsed_command.priority = values[3].trim();
				}
			} else if (parsed_command.action == 'mute' || parsed_command.action == 'volume') {
				parsed_command.source = values[0].trim();
				parsed_command.value = values[1].trim();
				if (values[2]) {
					parsed_command.priority = values[2].trim();
				}
			}
			app_output.obs.push(parsed_command);
			
		}
		
	});
	
	// if running voicemeeter commands are enabled
	if (use_vb) {
		
		// remove conflicting actions on bus based on priority
		for (let i=0; i<app_output.vb.length; i++) {
			let vb_o = app_output.vb[i];
			for (let i2=i+1; i2<app_output.vb.length; i2++) {
				let vb_n = app_output.vb[i2];
				if (vb_o.bus == vb_n.bus && vb_o.delay == vb_n.delay && (vb_o.action == vb_n.action || vb_o.action == 'gain' && vb_n.action == 'fade' || vb_o.action == 'fade' && vb_n.action == 'gain')) {
					if (vb_o.priority < vb_n.priority) {
						app_output.vb.splice(i, 1);
						i--;
						break;
					} else {
						app_output.vb.splice(i2, 1);
						i2--;
					}
				}
			}
		}
		
		// send immediate requests to voicemeeter controller
		ajax('POST', '/requestor.php', {
			project_uid: GLOBAL.active_project.uid,
			application: 'voicemeeter_command',
			commands: JSON.stringify(app_output.vb.filter(x => x.delay == -1))
		}, (status, data) => {
			// if error
			if (!data.status) {
				console.log(data.msg);
			}
		});
	
	}
	

	// if running obs commands are enabled
	if (use_obs) {
		
		// remove conflicting actions on scene or source tweaks
		for (let i=0; i<app_output.obs.length; i++) {
			let obs_o = app_output.obs[i];
			for (let i2=i+1; i2<app_output.obs.length; i2++) {
				let obs_n = app_output.obs[i2];
				if ((obs_o.action == obs_n.action || obs_o.action == 'mute' && obs_n.action == 'volume' || obs_o.action == 'volume' && obs_n.action == 'mute') && obs_o.delay == obs_n.delay && obs_o.source == obs_n.source) {
					if (obs_o.priority < obs_n.priority) {
						app_output.obs.splice(i, 1);
						i--;
						break;
					} else {
						app_output.obs.splice(i2, 1);
						i2--;
					}
				}
			}
		}
		
		let commands = [];
		
		app_output.obs.forEach((command, index) => {
			if (command.action == 'scene') {
				commands.push({
					requestType: 'SetCurrentProgramScene',
					requestId: index+1,
					requestData: {
						sceneName: command.scene
					}
				});
			} else if (command.action == 'source') {
				commands.push({
					requestType: 'SetSceneItemEnabled',
					requestId: index+1,
					requestData: {
						sceneName: command.scene,
						sourceName: command.source,
						sceneItemEnabled: command.value == 'true'
					}
				});
			} else if (command.action == 'mute') {
				commands.push({
					requestType: 'SetInputMute',
					requestId: index+1,
					requestData: {
						inputName: command.source,
						inputMuted: command.value == 'true'
					}
				});
			} else if (command.action == 'volume') {
				commands.push({
					requestType: 'SetInputVolume',
					requestId: index+1,
					requestData: {
						inputName: command.source,
						inputVolumeDb: parseFloat(command.value)
					}
				});
			}
		});
		
		if (app_output.obs.length > 0) {
			P2P_SERVER.connection.send(JSON.stringify({
				action: 'obs_command',
				command: {
					'op': commands.length > 1 ? 8 : 6,
					'd': commands.length == 1 ? commands[0] : { requestId: '777', requests: commands }
				}
			}));
		}
		
	}
	
}