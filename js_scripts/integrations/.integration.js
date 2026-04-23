// a declaration of integration classes / display names / and form elements
const INTEGRATIONS = {
	vb: {
		class_name: 'voicemeeter',
		display: 'Voicemeeter',
		ui: function () { return getVoicemeeterEntryUI(); }
	},
	obs: {
		class_name: 'obs',
		display: 'OBS Studio',
		ui: function () { return getObsEntryUI(); }
	},
	startgg: {
		class_name: 'startgg',
		display: 'Start GG',
		ui: function () { return getStartGGEntryUI(); }
	},
	http: {
		class_name: 'http',
		display: 'HTTP Requests',
		ui: null
	}
};

class integration {
	
	// final command list of current integration run
	command_list = [];
	
	initStructure(parsed_command) {
		
		// inject system delay and priority into command structure
		let structure = {
			action: parsed_command.action,
			delay: parsed_command.delay,
			priority: parsed_command.priority
		};
		
		// structure not required
		if (this.structure) {
			
			this.structure.forEach(key => {
				structure[key] = null;
			});
			
		}
		
		return structure;
		
	}
	
	priorityCheck() {
		
		// if priority check not enabled, return
		if (!this.priority_check_enabled) {
			return;
		}
		
		// remove conflicting actions
		for (let i=0; i<this.command_list.length; i++) {
			
			let check = this.command_list[i];
			
			for (let i2=i+1; i2<this.command_list.length; i2++) {
				
				let against = this.command_list[i2];
				
				if (
					check.delay == against.delay && (
						(
							this.priority_comparison &&
							this.priority_comparison.every(key => check[key] == against[key])
						) || !this.priority_comparison
					) && (
						check.action == against.action ||
						this.priority_action_equality.some(equal_actions =>
							check.action == equal_actions[0] && against.action == equal_actions[1] ||
							check.action == equal_actions[1] && against.action == equal_actions[0]
						)
					)
				) {
					
					// likeness confirmed, remove lower priority
					if (check.priority < against.priority) {
						
						// check lost, break nested loop after decrement
						this.command_list.splice(i, 1);
						i--;
						break;
						
					} else {
						
						// against lost, splice, decrement but continue nested loop
						this.command_list.splice(i2, 1);
						i2--;
						
					}
					
				}
				
			}
			
		}
		
	}
	
}