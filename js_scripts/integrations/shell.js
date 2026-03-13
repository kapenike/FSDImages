/*
- Shell Command: shell::exec(true, ls -a)
	-	boolean - true: wait for a return, false: run in the background
	- command - command string to run
*/

class shell extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = true;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'shell';
	
	// values structure (excluding delay and priority)
	structure = ['command'];
	
	// enables priority check
	priority_check_enabled = false;
	
	// priority likeness comparison (&&) automatically includes "action" and "delay"
	priority_comparison = [];
	
	// priority likeness action equality (action ||), handles what actions are conflicting even if they are labelled separately
	priority_action_equality = [];
	
	constructor() {
		
		// lowkeylame
		super();
		
	}
	
	// (REQUIRED) integration parsing
	parse(parsed_command) {
		
		// create object from structure that include action, delay and priority
		let data = this.initStructure(parsed_command);
		
		data.command = parsed_command.values[0];

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
				application: 'shell_command',
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
						application: 'shell_command',
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