/*
- OBS: obs::ACTION(scene, ...params)
	scene - obs::scene(Scene 1); sets obs program scene to "Scene 1"
	preview - obs::scene(Scene 2); sets obs preview scene to "Scene 2"
	studioMode - obs::studioMode(true); sets obs to studio mode (also accepts a priority)
	transition - obs::transition(); sends current preview scene to live program
	source - obs::source(Scene 1, Name Banners, true); sets the display of source "Name Banners" within "Scene 1" to visible, false would remove visibility
	volume - obs::volume(Main Audio Channel, 16); sets db level of "Main Audio Channel" to 16
	mute - obs::mute(Main Audio Channel, true); mutes "Main Audio Channel", set to false to unmute
*/

class obs extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = null;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'obs';
	
	// values structure (excluding delay and priority)
	structure = ['scene', 'source', 'audio_channel', 'mute', 'value'];
	
	// enables priority check
	priority_check_enabled = true;
	
	// priority likeness comparison (&&) automatically includes "action" and "delay"
	priority_comparison = ['source'];
	
	// priority likeness action equality (action ||), handles what actions are conflicting even if they are labelled separately
	priority_action_equality = [['mute', 'volume']];
	
	constructor() {
		
		// lowkeylame
		super();
		
		this.active = GLOBAL.active_project.settings.obs_3pa_enabled && API_SERVER.status == true;

	}
	
	// (REQUIRED) integration parsing
	parse(parsed_command) {
		
		// create object from structure that include action, delay and priority
		let data = this.initStructure(parsed_command);
		
		// set output in expected structure
		if (data.action == 'scene' || data.action == 'preview') {
			data.scene = parsed_command.values[0].trim();
		} else if (data.action == 'source') {
			data.scene = parsed_command.values[0].trim();
			data.source = parsed_command.values[1].trim();
			data.value = parsed_command.values[2].trim();
		} else if (data.action == 'mute' || data.action == 'volume') {
			data.source = parsed_command.values[0].trim();
			data.value = parsed_command.values[1].trim();
		} else if (data.action == 'studioMode') {
			data.value = parsed_command.values[0].trim();
		}
		
		// push to final command list
		this.command_list.push(data);
		
	}
	
	// (REQUIRED) run commands
	run() {
		
		let commands = {};
		
		// convert final commands to obs commands grouped by delay
		this.command_list.forEach((command, index) => {
			
			if (typeof commands[command.delay] === 'undefined') {
				commands[command.delay] = [];
			}
			
			if (command.action == 'scene') {
				commands[command.delay].push({
					requestType: 'SetCurrentProgramScene',
					requestId: index+1,
					requestData: {
						sceneName: command.scene
					}
				});
			} else if (command.action == 'preview') {
				commands[command.delay].push({
					requestType: 'SetCurrentPreviewScene',
					requestId: index+1,
					requestData: {
						sceneName: command.scene
					}
				});
			} else if (command.action == 'studioMode') {
				commands[command.delay].push({
					requestType: 'SetStudioModeEnabled',
					requestId: index+1,
					requestData: {
						studioModeEnabled: command.value == 'true'
					}
				});
			} else if (command.action == 'transition') {
				commands[command.delay].push({
					requestType: 'TriggerStudioModeTransition',
					requestId: index+1
				})
			}	else if (command.action == 'source') {
				commands[command.delay].push({
					requestType: 'SetSceneItemEnabled',
					requestId: index+1,
					requestData: {
						sceneName: command.scene,
						sourceName: command.source,
						sceneItemEnabled: command.value == 'true'
					}
				});
			} else if (command.action == 'mute') {
				commands[command.delay].push({
					requestType: 'SetInputMute',
					requestId: index+1,
					requestData: {
						inputName: command.source,
						inputMuted: command.value == 'true'
					}
				});
			} else if (command.action == 'volume') {
				commands[command.delay].push({
					requestType: 'SetInputVolume',
					requestId: index+1,
					requestData: {
						inputName: command.source,
						inputVolumeDb: parseFloat(command.value)
					}
				});
			}
		});
		
		// immediate command list
		if (commands['-1'] && commands['-1'].length > 0) {
			let immediate_commands = commands['-1'];
			API_SERVER.connection.send(JSON.stringify({
				action: 'obs_command',
				command: {
					'op': immediate_commands.length > 1 ? 8 : 6,
					'd': immediate_commands.length == 1 ? immediate_commands[0] : { requestId: '777', requests: immediate_commands }
				}
			}));
		}
		
		// delayed commands
		Object.keys(commands).filter(v => v != '-1').forEach(delay => {
			(function () {
				let project_uid = GLOBAL.active_project.uid;
				let delayed_commands = commands[delay];
				setTimeout(function () {
					API_SERVER.connection.send(JSON.stringify({
						action: 'obs_command',
						command: {
							'op': delayed_commands.length > 1 ? 8 : 6,
							'd': delayed_commands.length == 1 ? delayed_commands[0] : { requestId: '777', requests: delayed_commands }
						}
					}));
				}, delay);
			})();
		});
		
	}
	
	
	
}