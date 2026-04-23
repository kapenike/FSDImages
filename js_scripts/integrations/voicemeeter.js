/*
- Voicemeeter: vb::ACTION(bus, ...params) 
	gain - priority(7)vb::gain(3, -60) sets gain to -60 on bus 3 with priority 7
	mute - delay(1000)vb::mute(2, true) sets bus 2 mute to true after a 1 second delay, set to false to unmute
	fade - vb::fade(2, 12, 2000) fades bus 2 gain to 12 over a 2000ms delay
*/

class voicemeeter extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = null;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'vb';
	
	// values structure (excluding delay and priority)
	structure = ['bus', 'value', 'param_1'];
	
	// enables priority check
	priority_check_enabled = true;
	
	// priority likeness comparison (&&) automatically includes "action" and "delay"
	priority_comparison = ['bus'];
	
	// priority likeness action equality (action ||), handles what actions are conflicting even if they are labelled separately
	priority_action_equality = [['gain', 'fade']];
	
	constructor() {
		
		// lowkeylame
		super();
		
		this.active = GLOBAL.active_project.settings?.integrations?.vb?.enabled;
		
	}
	
	// (REQUIRED) integration parsing
	parse(parsed_command) {
		
		// create object from structure that include action, delay and priority
		let data = this.initStructure(parsed_command);
		
		// convert parsed command to structure command
		data.bus = parsed_command.values[0].trim();
		data.value = parsed_command.values[1].trim();
		if (data.action == 'fade') {
			data.param_1 = parsed_command.values[2].trim();
		}
		
		// push to final command list
		this.command_list.push(data);
		
	}
	
	// (REQUIRED) run commands
	run() {
		
		// run immediate command batch
		let exec_list = this.command_list.filter(x => x.delay == -1);
		if (exec_list.length > 0) {
			// send immediate requests to voicemeeter controller
			ajax('POST', '/requestor.php', {
				project_uid: GLOBAL.active_project.uid,
				application: 'voicemeeter_command',
				commands: JSON.stringify(exec_list)
			}, (status, data) => {
				// if error
				if (!data.status) {
					console.log(data.msg);
				}
			});
		}

		// created delayed container
		exec_list = {};
		
		// group by delay to send as batch
		this.command_list.filter(x => x.delay != -1).forEach(v => {
			if (exec_list[v.delay]) {
				exec_list[v.delay].push(v);
			} else {
				exec_list[v.delay] = [v];
			}
		});
		
		// delayed batches within their own closures
		Object.keys(exec_list).forEach(delay => {
			(function () {
				let project_uid = GLOBAL.active_project.uid;
				let delay_commands = exec_list[delay];
				setTimeout(function () {
					ajax('POST', '/requestor.php', {
						project_uid: project_uid,
						application: 'voicemeeter_command',
						commands: JSON.stringify(delay_commands)
					}, (status, data) => {
						// if error
						if (!data.status) {
							console.log(data.msg);
						}
					});
				}, delay);
			})();
		});
		
	}
	
	
	
}