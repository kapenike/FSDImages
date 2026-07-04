class parrygg extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = true;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'parrygg';
	
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
		if (!GLOBAL.active_project.settings?.integrations?.parrygg?.tournament_slug || !GLOBAL.active_project.settings?.integrations?.parrygg?.auth_token) {
			notify('Please make sure you have a valid Tournament Slug and Developer Auth Token set in the File > Integrations menu tab.');
			return;
		}
		
		// this integration only accepts a single action, so shift the first sent and use
		let action = quickstart
			? { action: 'importAll', preserve: GLOBAL.active_project.settings?.integrations?.parrygg?.preserve_attendees != 'false' }
			: this.command_list.shift();
			
		if (typeof action === 'undefined') {
			notify('Invalid Parry.gg Command Attempt.');
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
	
	query(service, method, data, callback) {
		ajax('POST', '/php_apps/integrations/bypassCORS.php', {
			request: JSON.stringify({
				url: 'https://grpcweb.parry.gg/parrygg.services.'+service+'/'+method,
				method: 'post',
				headers: [
					'Content-Type: application/json',
					'X-API-KEY: '+GLOBAL.active_project.settings?.integrations?.parrygg?.auth_token
				],
				data: data
			})
		}, (status, data) => {
			if (status) {
				data = JSON.parse(data.msg);
				if (typeof data.code === 'undefined') {
					callback(data);
				} else {
					notify('Parry.gg request error code: '+data.code);
				}
			} else {
				notify('Unable to reach Parry.gg API server :(');
			}
		}, 'body');
	}
	
	// import attendee list
	importAttendees(preserve) {
		
		this.query('TournamentService', 'GetTournamentAttendees', {
			tournament_identifier: {
				tournament_slug: GLOBAL.active_project.settings.integrations.parrygg.tournament_slug
			}
		}, (data) => {
			let entries = data.attendees.map(v => {
				return {
					id: v.user.id,
					display: v.user?.gamerTag || '',
					sponsor: v.user?.sponsorName || '',
					first_name: v.user?.firstName || '',
					last_name: v.user?.lastName || '',
					city: v.user?.locationCity || '',
					state: v.user?.locationState || '',
					country: v.user?.locationCountry || '',
					pronouns: v.user?.pronouns || ''
				}
			});
			
			this.importDataset('PGG_Attendees',
				entries,
				['display','id','sponsor','first_name','last_name','city','state','country','pronouns'],
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
		});

	}
	
	
	importTournament() {
		
		this.query('TournamentService', 'GetTournament', {
			tournament_identifier: {
				tournament_slug: GLOBAL.active_project.settings.integrations.parrygg.tournament_slug
			}
		}, (data) => {
			
			let entries = [];
			let brackets = [];
			
			data.tournament.events.forEach(event => {
				event.phases.forEach(phase => {
					phase.brackets.forEach(bracket => {
						let bracket_name = event.name+' : '+phase.slug+' - '+bracket.slug;
						brackets.push('PGG_'+bracket_name);
						entries.push({
							display: bracket_name,
							bracket: 'PGG_'+bracket_name,
							team_size: event.entrantSize.toString(),
							event_id: event.id,
							phase_id: phase.id,
							bracket_id: bracket.id,
							last_set_update: '1767294000'
						});
					});
				});
			});
			
			if (GLOBAL.active_project.data.sets.PGG_Tournament) {
				let pgg_entries = GLOBAL.active_project.data.sets.PGG_Tournament.entries;
				Object.keys(pgg_entries).forEach(entry_uid => {
					if (!brackets.includes(pgg_entries[entry_uid].bracket)) {
						brackets.push(pgg_entries[entry_uid].bracket);
					}
				});
			}
			
			this.importDataset('PGG_Tournament',
				entries,
				['display','bracket','team_size','event_id','phase_id','bracket_id','last_set_update'], 
				{ entries: 'phase_id', preserve: false },
				() => {
					this.manageBracketContainers(brackets, () => {
						this.checkForSwitchBoardRefresh();
					});
				}
			);
			
		});		
		
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
	
	importBracket(bracket_id) {
		
		let bracket_ref = GLOBAL.active_project.data.sets.PGG_Tournament.entries;
		let bracket_lookup_uid = Object.keys(bracket_ref).findIndex(x => bracket_ref[x].bracket_id == bracket_id);
		if (bracket_lookup_uid < 0) {
			notify('Bracket lookup failed.');
			ajaxRemoveLoader('body');
			return;
		}
		bracket_lookup_uid = Object.keys(bracket_ref)[bracket_lookup_uid];
		let bracket_lookup = bracket_ref[bracket_lookup_uid];
		let start_lookup_time = Date.now();
		
		this.query('BracketService', 'GetBracketTimestamp', {
			id: bracket_id
		}, (data) => {
			
			if (Date.parse(data.updateAt) < bracket_lookup.last_set_update) {
				notify('No changes have been made to the "'+bracket_lookup.display+'" bracket since your last request!');
				ajaxRemoveLoader('body');
				return;
			}
		
			this.query('BracketService', 'GetBracket', {
				id: bracket_id
			}, (data) => {
				
				let attendee_ref = Object.entries(GLOBAL.active_project.data.sets.PGG_Attendees.entries);
				let team_size_lookup = bracket_lookup.team_size;
		
				let bracket = [];
				
				data.bracket.matches.forEach(match => {
					
					let match_title = data.bracket.rounds.find(v => v.number == match.round && v.winnersSide === match.winnerSide).label;
					let team_1 = data.bracket.seeds.find(v => v.id == match.slots?.[0]?.seedId)?.eventEntrant?.entrant?.users;
					let team_2 = data.bracket.seeds.find(v => v.id == match.slots?.[1]?.seedId)?.eventEntrant?.entrant?.users;
					
					let bracket_entry = {
						display: match.identifier+' - '+match_title+': '+(team_1
							?	team_1.reduce((a,v,i) => a+(i > 0 ? ' / ' : '')+(v?.gamerTag || '?'), '')
							: '?'
						)+' vs '+(team_2
							?	team_2.reduce((a,v,i) => a+(i > 0 ? ' / ' : '')+(v?.gamerTag || '?'), '')
							: '?'
						),
						set_id: match.id,
						title: match_title,
						identifier: match.identifier,
						team_size: team_size_lookup
					};
					
					for (let i=0; i<2; i++) {
						bracket_entry['team_'+(i+1)+'_score'] = match.slots?.[i]?.score || '0';
						for (let i2=0; i2<team_size_lookup; i2++) {
							let team = i == 0 ? team_1 : team_2;
							bracket_entry['team_'+(i+1)+'_player_'+(i2+1)] = (team?.[i2]?.id
								?	'$var$$pointer$1$/pointer$sets/PGG_Attendees/entries/'+attendee_ref.find(v => v[1].id == team[i2].id)?.[0]+'$/var$'
								: ''
							);
						}
					}
					
					bracket.push(bracket_entry);
					
				});
				
				if (bracket.length == 0) {
					notify('Bracket is empty.');
					ajaxRemoveLoader('body');
					return;
				}
				
				// check if phase container exists, create if not, then update				
				this.importDataset(bracket_lookup.bracket,
					bracket,
					Object.keys(bracket[0]), 
					{ entries: 'set_id', preserve: true },
					() => {
						// update phase last set lookup time
						let pin_point_timestamp_update = [JSON.stringify({
							source: '$var$sets/PGG_Tournament/entries/'+bracket_lookup_uid+'/last_set_update$/var$',
							value: start_lookup_time
						})];
						ajax('POST', '/requestor.php', {
							application: 'update_project_details',
							uid: GLOBAL.active_project.uid,
							pinpoint_dataset_updates: pin_point_timestamp_update,
							create_delete: []
						}, (status, data) => {
							if (status && data.status) {
								// make local pinpointed changes
								pin_point_timestamp_update.forEach(pin => {
									let data = JSON.parse(pin);
									setRealValue(data.source, data.value);
								});
								this.checkForSwitchBoardRefresh();
							} else {
								this.checkForSwitchBoardRefresh();
								notify(data.msg);
							}
						});
						
					}
				);
				
				
			});
		
		});
		
	}
	
}