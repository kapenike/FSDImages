class startgg extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = true;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'startgg';
	
	// values structure (excluding delay and priority)
	structure = ['preserve'];
	
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
		if (!GLOBAL.active_project.settings?.integrations?.startgg?.tournament_slug || !GLOBAL.active_project.settings?.integrations?.startgg?.auth_token) {
			notify('Please make sure you have a valid Tournament Slug and Developer Auth Token set in the File > Integrations menu tab.');
			return;
		}
		
		// this integration only accepts a single action, so shift the first sent and use
		let action = quickstart
			? { action: 'importAll', preserve: true }
			: this.command_list.shift();

		ajaxInitLoader('body');
	
		if (action.action == 'importAll') {
			// tell attendee import to continue to bracket import
			this.process_all = true;
			this.importAttendees(action.preserve);
		} else if (action.action == 'updateAttendees') {
			this.importAttendees(action.preserve);
		} else if (action.action == 'updateBrackets') {
			this.importBrackets();
		} else {
			ajaxRemoveLoader('body');
		}
		
	}
	
	// import attendee list
	importAttendees(preserve) {
		
		let query = `
			query TournamentAttendees($slug: String!, $page: Int!, $perPage: Int!) {
				tournament(slug: $slug) {
					participants(query: { page: $page, perPage: $perPage }) {
						pageInfo {
							total
							totalPages
						}
						nodes {
							id
							gamerTag
							prefix
							user {
								genderPronoun
							}
						}
					}
				}
			}
		`;

		let variables = {
			slug: GLOBAL.active_project.settings.integrations.startgg.tournament_slug,
			page: 1,
			perPage: 512
		};
		
		fetch('https://api.start.gg/gql/alpha', {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer '+GLOBAL.active_project.settings.integrations.startgg.auth_token,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query, variables }),
		}).then((response) => {
			if (!response.ok) {
				ajaxRemoveLoader('body');
				notify('Error connecting to Start.GG. Please check your integration configs "Tournament Slug" and "Developer Auth Token" fields.');
				return false;
			}
			return response.json();
		}).then((data) => {
			if (data !== false) {
				this.importAttendeeList(data.data.tournament.participants.nodes, preserve);
			}
		});
		
	}
	
	importAttendeeList(entries, preserve) {
		
		// map list to useable list
		entries = entries.map(v => {
			return {
				display: v.gamerTag,
				id: v.id.toString(),
				prefix: v.prefix || '',
				pronouns: v.user.genderPronoun || ''
			}
		});
		
		// if data set doesn't exist, create and import
		if (!GLOBAL.active_project.data.sets.SGG-Attendees) {
			
			// create import fields
			let create = [];
			let display = [];
			let id = [];
			let prefix = [];
			let pronouns = [];
			
			entries.forEach(entry => {
				create.push('create');
				display.push(entry.display);
				id.push(entry.id);
				prefix.push(entry.prefix);
				pronouns.push(entry.pronouns);
			});
			
			let form_details = {
				application: 'update_create_dataset',
				project_uid: GLOBAL.active_project.uid,
				dataset_manager_type: 'create',
				dataset_title: 'SGG-Attendees',
				structure: ['display','id','prefix','pronouns'],
				dataset_value_uid: create,
				dataset_value_display: display,
				dataset_value_id: id,
				dataset_value_prefix: prefix,
				dataset_value_pronouns: pronouns
			};
			
			ajax('POST', '/requestor.php', form_details, (status, data) => {
				if (status && data.status) {
					
					// import new data set into local
					GLOBAL.active_project.data.sets[data.msg.display] = data.msg;
					
					// sort attendee list and then continue
					ajax('POST', '/requestor.php', {
						application: 'sort_dataset',
						project_uid: GLOBAL.active_project.uid,
						uid: GLOBAL.active_project.data.sets.SGG-Attendees.uid
					}, (status, data) => {
					
						// if set to process all, continue to importing brackets
						if (this.process_all) {
							
							this.importBrackets();
							
						} else {
							
							// otherwise, check for switchboard refresh
							this.checkForSwitchBoardRefresh();
							
						}
					
					});
					
				} else {
					ajaxRemoveLoader('body');
					notify('Unexpected error while creating data set. Error: '+data.msg);
				}
			});
			
		} else {
			
			// search for existing, and update if changed. create new if not found
			
		}
		
	}
	
	importBrackets() {
		
		// get events
		let query = `
			query TournamentEvents($slug: String!) {
				tournament(slug: $slug) {
					id
					name
					events {
						id
						name
						slug
						state
						videogame {
							id
							name
						}
					}
				}
			}
		`;

		let variables = {
			slug: GLOBAL.active_project.settings.integrations.startgg.tournament_slug
		};
		
		fetch('https://api.start.gg/gql/alpha', {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer '+GLOBAL.active_project.settings.integrations.startgg.auth_token,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query, variables }),
		}).then((response) => {
			if (!response.ok) {
				ajaxRemoveLoader('body');
				notify('Error connecting to Start.GG. Please check your integration configs "Tournament Slug" and "Developer Auth Token" fields.');
				return false;
			}
			return response.json();
		}).then((data) => {
			if (data !== false) {
				console.log(data);
				ajaxRemoveLoader('body');
			}
		});
		
		
		
	}
	
	
	checkForSwitchBoardRefresh() {
		
	}
	
	
}