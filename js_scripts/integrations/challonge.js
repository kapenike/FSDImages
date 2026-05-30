class challonge extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = true;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'challonge';
	
	// values structure (excluding delay and priority)
	structure = ['preserve','id'];
	
	// enables priority check
	priority_check_enabled = false;
	
	// priority likeness comparison (&&) automatically includes "action" and "delay"
	priority_comparison = [];
	
	// priority likeness action equality (action ||), handles what actions are conflicting even if they are labelled separately
	priority_action_equality = [];
	
	// run the set
	process_all = false;
	
	constructor() {
		
		// lowkeylame
		super();
		
	}
	
	// (REQUIRED) integration parsing
	parse(parsed_command) {
		
		// create object from structure that include action, delay and priority
		let data = this.initStructure(parsed_command);
		
		// preserve attendee list by default, must pass false to remove past attendees
		data.preserve = (parsed_command?.values?.[0].trim() === 'false' ? false : true);

		// push to final command list
		this.command_list.push(data);
		
	}
	
	// (REQUIRED) run commands
	run(quickstart = false) {
		
		// ensure all required data is present
		if (!GLOBAL.active_project.settings?.integrations?.challonge?.tournament_id || !GLOBAL.active_project.settings?.integrations?.challonge?.auth_token) {
			notify('Please make sure you have a valid Tournament ID and Developer Auth Token set in the File > Integrations > Challonge tab.');
			return;
		}
		
		// this integration only accepts a single action, so shift the first sent and use
		let action = quickstart
			? { action: 'importAll', preserve: GLOBAL.active_project.settings?.integrations?.challonge?.preserve_attendees != 'false' }
			: this.command_list.shift();
			
		if (typeof action === 'undefined') {
			notify('Invalid Challonge Command Attempt.');
			return;
		}

		ajaxInitLoader('body');
	
		if (action.action == 'importAll') {
			// tell attendee import to continue to bracket import
			this.process_all = true;
			this.importAttendees(action.preserve);
		} else if (action.action == 'importAttendees') {
			this.importAttendees(action.preserve);
		} else {
			ajaxRemoveLoader('body');
		}
	
	}
	
	query(endpoint, callback) {
		ajax('POST', 'php_apps/integrations/bypassCORS.php', {
			request: JSON.stringify({
				url: 'https://api.challonge.com/v1/tournaments/'+GLOBAL.active_project.settings.integrations.challonge.tournament_id+'/'+endpoint+'?api_key='+GLOBAL.active_project.settings.integrations.challonge.auth_token,
				method: 'get'
			})
		}, callback);
	}
	
	// import attendee list
	importAttendees(preserve) {
		
		this.query(
			'participants.json',
			(status, data) => {
				if (status && data.status) {
					let entries = JSON.parse(data.msg).map(v => {
						return {
							display: v.participant.display_name,
							id: v.participant.id,
							name: v.participant.name,
							ordinal_seed: v.participant.ordinal_seed,
							seed: v.participant.seed
						}
					});
					this.importDataset('CHALLONGE_Attendees',
						entries,
						['display','id','name','ordinal_seed','seed'], 
						{ entries: 'id', preserve: preserve },
						() => {
							//check for switchboard refresh
							this.checkForSwitchBoardRefresh();
						}
					);
				} else {
					notify(data.msg);
					ajaxRemoveLoader('body');
				}
			}
		);
		
	}
	
}