class startgg extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = true;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'startgg';
	
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
		
		// if import bracket action, set id
		if (data.action == 'importBracket') {
			data.id = parsed_command?.values?.[0].trim();
		}

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
			? { action: 'importAll', preserve: GLOBAL.active_project.settings?.integrations?.startgg?.preserve_attendees != 'false' }
			: this.command_list.shift();
			
		if (typeof action === 'undefined') {
			notify('Invalid StartGG Command Attempt.');
			return;
		}

		ajaxInitLoader('body');
	
		if (action.action == 'importAll') {
			// tell attendee import to continue to bracket import
			this.process_all = true;
			this.importAttendees(action.preserve);
		} else if (action.action == 'importAttendees') {
			this.importAttendees(action.preserve);
		} else if (action.action == 'importTournament') {
			this.importTournament();
		} else if (action.action == 'importBracket') {
			this.importBracket(action.id);
		} else {
			ajaxRemoveLoader('body');
		}
		
	}
	
	query(query, variables, callback, page_merge = null, merge_obj = null) {
		fetch('https://api.start.gg/gql/alpha', {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer '+GLOBAL.active_project.settings.integrations.startgg.auth_token,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query, variables }),
		}).then((response) => {
			return response.json();
		}).then((data) => {
			if (typeof data.success !== 'undefined' && data.success == false || data.errors) {
				ajaxRemoveLoader('body');
				notify('Error connecting to Start.GG. Please check your integration configs "Tournament Slug" and "Developer Auth Token" fields.<br /><strong>StartGG Error:</strong> '+(data.message || data.errors?.[0]?.message)+'');
				return;
			} else {
				// paging requested
				if (page_merge != null) {
					if (merge_obj == null) {
						merge_obj = data;
					}
					// define path to page info and new pointer data
					let pointer = merge_obj;
					let new_pointer = data;
					page_merge.page_on.forEach((v, i) => {
						if (i < page_merge.page_on.length-1) {
							pointer = pointer[v];
							new_pointer = new_pointer[v];
						}
					});
					// last key used inline for original object reference setter
					let last_key = page_merge.page_on[page_merge.page_on.length-1];
					if (variables.page >= pointer[last_key].pageInfo.totalPages) {
						// if paging has ended, return data to callback
						callback(merge_obj);
					} else {
						// only merge new object if past page one
						if (pointer[last_key].pageInfo.page > 1) {
							pointer[last_key].push(...new_pointer[last_key].nodes);
						}
						// increment page variable
						variables.page++;
						// query into next page
						this.query(query, variables, callback, page_merge, merge_obj);
					}
				} else {
					callback(data);
				}
			}
		});
	}
	
	// import attendee list
	importAttendees(preserve) {
		
		this.query(
			`
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
									location {
										city
										state
										country
									}
								}
							}
						}
					}
				}
			`,
			{
				slug: GLOBAL.active_project.settings.integrations.startgg.tournament_slug,
				page: 1,
				perPage: 512
			},
			(data) => {
				
				let entries = data.data.tournament.participants.nodes.map(v => {
					return {
						display: v.gamerTag,
						id: v.id.toString(),
						prefix: v.prefix || '',
						city: v.user.location.city || '',
						state: v.user.location.state || '',
						country: v.user.location.country || '',
						pronouns: v.user.genderPronoun || ''
					}
				});
				
				this.importDataset('SGG_Attendees',
					entries,
					['display','id','prefix','city','state','country','pronouns'], 
					{ entries: 'id', preserve: preserve },
					() => {
						// if set to process all, continue to importing brackets
						if (this.process_all) {
							this.importTournament();
						} else {
							// otherwise, check for switchboard refresh
							this.checkForSwitchBoardRefresh();
						}
					}
				);
				
			}
		);
		
	}
	
	
	importTournament() {
		
		this.query(
			`
				query TournamentPhases($slug: String!) {
					tournament(slug: $slug) {
						id
						name
						events {
							id
							name
							phases {
								id
								name
								state
							}
						}
					}
				}
			`,
			{
				slug: GLOBAL.active_project.settings.integrations.startgg.tournament_slug
			},
			(data) => {
				
				let entries = [];
				let brackets = [];
		
				data.data.tournament.events.forEach(tournament_event => {
					tournament_event.phases.forEach(phase => {
						brackets.push('SGG_'+tournament_event.name+' : '+phase.name);
						entries.push({
							display: tournament_event.name+' - '+phase.name,
							bracket: 'SGG_'+tournament_event.name+' : '+phase.name,
							event_id: tournament_event.id.toString(),
							phase_id: phase.id.toString()
						});
					});
				});
				
				if (GLOBAL.active_project.data.sets.SGG_Tournament) {
					let sgg_entries = GLOBAL.active_project.data.sets.SGG_Tournament.entries;
					Object.keys(sgg_entries).forEach(entry_uid => {
						if (!brackets.includes(sgg_entries[entry_uid].bracket)) {
							brackets.push(sgg_entries[entry_uid].bracket);
						}
					});
				}
				
				this.importDataset('SGG_Tournament',
					entries,
					['display','bracket','event_id','phase_id'], 
					{ entries: 'phase_id', preserve: false },
					() => {
						this.manageBracketContainers(brackets, () => {
							this.checkForSwitchBoardRefresh();
						});
					}
				);

			}
		);
		
	}
	
	manageBracketContainers(brackets, callback) {

		let total = brackets.length;
		let total_completed = 0;

		brackets.forEach(bracket => {
			if (GLOBAL.active_project.data.sets[bracket]) {
				
				ajax('POST', '/requestor.php', {
					application: 'remove_dataset',
					project_uid: GLOBAL.active_project.uid,
					uid: GLOBAL.active_project.data.sets[bracket].uid
				}, (status, data) => {
					total_completed++;
					delete GLOBAL.active_project.data.sets[bracket];
					if (total_completed >= total) {
						callback();
					}
				});
				
			} else {
				total_completed++;
			}
		});
		
		if (total_completed == total) {
			callback();
		}
		
	}
	
	importBracket(phase_id) {
		
		this.query(
			`
				query PhaseSets($phaseId: ID!, $page: Int!, $perPage: Int!) {
					phase(id: $phaseId) {
						id
						name
						sets(page: $page, perPage: $perPage, sortType: STANDARD) {
							pageInfo {
								page
								totalPages
								perPage
							}
							nodes {
								id
								fullRoundText
								identifier
								slots {
									entrant {
										id
										name
										participants {
											id
										}
									}
									standing {
										stats {
											score {
												value
											}
										}
									}
								}
							}
						}
					}
				}
			`,
			{
				phaseId: phase_id,
				page: 1,
				perPage: 100
			},
			(data) => {
				
				let attendee_ref = GLOBAL.active_project.data.sets.SGG_Attendees.entries;
				let max_team_size = 0;
		
				let entries = data.data.phase.sets.nodes.map(v => {
					let team_1 = v.slots?.[0] || null;
					let team_2 = v.slots?.[1] || null;
					let team_size = Math.max((team_1?.entrant?.participants?.length || 0), (team_2?.entrant?.participants?.length || 0));
					
					let entry = {
						display: v.identifier+' - '+v.fullRoundText+': '+(team_1?.entrant?.name || '?')+' vs '+(team_2?.entrant?.name || '?'),
						set_id: v.id,
						identifier: v.identifier,
						title: v.fullRoundText,
						team_size: team_size.toString()
					};
					if (team_size > max_team_size) {
						max_team_size = team_size;
					}
					for (let i=0; i<2; i++) {
						entry['team_'+(i+1)+'_score'] = v.slots?.[i]?.standing?.stats?.score?.value || '0';
						for (let i2=0; i2<team_size; i2++) {
							let participant_uid = Object.keys(attendee_ref)[Object.keys(attendee_ref).findIndex(x => attendee_ref[x].id == v.slots?.[i]?.entrant?.participants?.[i2]?.id)];
							if (typeof participant_uid === 'string') {
								participant_uid = '$var$$pointer$1$/pointer$sets/SGG_Attendees/entries/'+participant_uid+'$/var$';
							} else {
								participant_uid = '';
							}
							entry['team_'+(i+1)+'_player_'+(i2+1)] = participant_uid;
						}
					}
					
					return entry;
					
				});
				
				if (entries.length == 0) {
					notify('Bracket is empty.');
					ajaxRemoveLoader('body');
					return;
				}
		
				// check if phase container exists, create if not, then update
				let set_entries = GLOBAL.active_project.data.sets.SGG_Tournament.entries;
				let phase = set_entries[Object.keys(set_entries).filter(v => set_entries[v].phase_id == phase_id).pop()];
				
				this.importDataset(phase.bracket,
					entries,
					Object.keys(entries[0]), 
					{ entries: 'set_id', preserve: false },
					() => {
						this.checkForSwitchBoardRefresh();
					}
				);
				
				
			},
			{
				page_on: ['data','phase','sets']
			}
		);
		
	}
	
}