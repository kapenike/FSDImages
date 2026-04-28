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
	
	query(query, variables, callback) {
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
				notify('Error connecting to Start.GG. Please check your integration configs "Tournament Slug" and "Developer Auth Token" fields.<br /><strong>StartGG Error:</strong> '+data.message+'');
				return;
			} else {
				callback(data);
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
						pronouns: v.user.genderPronoun || ''
					}
				});
				
				this.importDataset('SGG_Attendees',
					entries,
					['display','id','prefix','pronouns'], 
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
					console.log(total_completed);
					total_completed++;
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
								total
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
				perPage: 512
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
				
				
			}
		);
		
	}
	
	importDataset(dataset, entries, map, preserve, callback) {
		
		// if dataset doesn't exist, create new
		if (!GLOBAL.active_project.data.sets[dataset]) {
		
			// structure import
			let import_fields = {'create':[]};
			map.forEach(key => { import_fields[key] = [] });
			
			// map entries to import
			entries.forEach(entry => {
				import_fields.create.push('create');
				map.forEach(key => {
					import_fields[key].push(entry[key]);
				});
			});
			
			// form object
			let form_details = {
				application: 'update_create_dataset',
				project_uid: GLOBAL.active_project.uid,
				dataset_manager_type: 'create',
				dataset_title: dataset,
				structure: map,
				dataset_value_uid: import_fields.create
			};
			
			// insert structure formatted entries into form object
			map.forEach(key => { 
				form_details['dataset_value_'+key] = import_fields[key];
			});
		
			ajax('POST', '/requestor.php', form_details, (status, data) => {
				if (status && data.status) {
					
					// import new data set into local
					GLOBAL.active_project.data.sets[data.msg.display] = data.msg;
					
					// sort data set
					this.sortDataset(GLOBAL.active_project.uid, GLOBAL.active_project.data.sets[dataset].uid, callback);
					
				} else {
					ajaxRemoveLoader('body');
					notify('Unexpected error while creating data set. Error: '+data.msg);
				}
			});
		
		} else {
			
			// actions list
			let update_list = [];
			let found_ids = [];
			
			// manage current list
			let dataset_entries = Object.keys(GLOBAL.active_project.data.sets[dataset].entries);
			dataset_entries.forEach(entry_uid => {
				
				let entry = GLOBAL.active_project.data.sets[dataset].entries[entry_uid];
				
				let preserving = (preserve !== null && typeof preserve.entries !== 'undefined' && preserve.entries !== false);
				
				let found = (preserving ? entries[entries.findIndex(v => v[preserve.entries] == entry[preserve.entries])] : false);
				
				if (found) {
					
					// log this entry has been updated
					found_ids.push(found[preserve.entries]);

					// if found, check for updates
					map.forEach(key => {
						if (found[key] != entry[key] && typeof found[key] !== 'undefined') {
							update_list.push({
								source: 'sets/'+dataset+'/entries/'+entry_uid+'/'+key,
								value: found[key]
							})
						}
					});
					
				} else if (preserving && preserve.preserve === false) {
					
					// if not found and preserve is false, set to remove
					update_list.push({
						source: 'sets/'+dataset+'/delete',
						value: entry_uid
					})
					
				}
				
			});
			
			// loop new entry ids and create if not already found and updated
			entries.filter(v => !found_ids.includes(v[preserve.entries])).forEach(new_entry => {
				let new_entry_object = {
					source: 'sets/'+dataset+'/create',
					value: {}
				};
				map.forEach(key => {
					new_entry_object.value[key] = new_entry[key];
				});
				update_list.push(new_entry_object);
			});
			
			// if action list is empty, callback now
			if (update_list.length == 0) {
				callback();
				return;
			}
			
			this.handleDatasetCreateDelete(update_list, () => {
				// sort attendee list and then continue
				this.sortDataset(GLOBAL.active_project.uid, GLOBAL.active_project.data.sets[dataset].uid, callback);
			});
			
		}
	}
	
	checkForSwitchBoardRefresh() {
		let current_nav = Select('.active_navigation')?.innerHTML;
		if (current_nav == 'Switchboard' && !Select('#ui_editor_toggle').checked) {
			refreshUIBuild(false);
		}
		ajaxRemoveLoader('body');
	}
	
	sortDataset(project_uid, uid, callback) {
		ajax('POST', '/requestor.php', {
			application: 'sort_dataset',
			project_uid: project_uid,
			uid: uid
		}, (status, data) => {
			let sets = GLOBAL.active_project.data.sets;
			let ref = sets[Object.keys(sets).filter(v => sets[v].uid == data.uid)[0]];
			let new_entries = {};
			let old_entries = [];
			for (let [key, value] of Object.entries(ref.entries)) {
				value.uid = key;
				old_entries.push(value);
			}
			old_entries.sort((a,b) => {
				if (a.display < b.display) {
					return -1;
				} else if (a.display > b.display) {
					return 1;
				} else {
					return 0;
				}
			});
			old_entries.forEach(v => {
				let uid = v.uid;
				delete v.uid;
				new_entries[uid] = v;
			});
			ref.entries = new_entries;
			callback();
		});
	}
	
	handleDatasetCreateDelete(update_list, callback) {
		let pin_point = [];
		
		for (let i=0; i<update_list.length; i++) {
			update_list[i].source = '$var$'+update_list[i].source+'$/var$';
			if (update_list[i].source.includes('/entries/uid_')) {
				pin_point.push(JSON.stringify(...update_list.splice(i, 1)));
				i--;
			}
		}
		
		// creation deletion proper data structuring
		update_list = update_list.map(v => {
			let create_delete_temp_handler = { create_delete: [] };
			create_delete_temp_handler[v.source] = v.value;
			handleCreaterDeleterSetting(create_delete_temp_handler, v.source);
			return create_delete_temp_handler.create_delete.pop();
		});
		
		// create delete entries
		ajax('POST', '/requestor.php', {
			application: 'update_project_details',
			uid: GLOBAL.active_project.uid,
			pinpoint_dataset_updates: pin_point,
			create_delete: update_list
		}, (status, data) => {
			if (status && data.status) {
				
				// make local pinpointed changes
				pin_point.forEach(pin => {
					let data = JSON.parse(pin);
					setRealValue(data.source, data.value);
				});
				
				// removed deleted dataset entries
				let formatted_create_delete = [];
				update_list.forEach(create_delete => {
					formatted_create_delete.push(JSON.parse(create_delete));
				});
				if (formatted_create_delete.length > 0) {
					formatted_create_delete.filter(v => v.type == 'delete').forEach(delete_entry => {
						delete GLOBAL.active_project.data.sets[delete_entry.set_name].entries[delete_entry.data];
					});
				}
				
				// add created dataset entries
				if (data.created_dataset_entries.length > 0) {
					data.created_dataset_entries.forEach(create_entry => {
						let set_name = Object.keys(GLOBAL.active_project.data.sets).find(v => GLOBAL.active_project.data.sets[v].uid == create_entry.dataset_uid);
						GLOBAL.active_project.data.sets[set_name].entries[create_entry.entry_uid] = create_entry.entry;
					});
				}

				callback();
				
			} else {
				ajaxRemoveLoader('body');
				notify(data.msg);
			}
		});
	}
	
}