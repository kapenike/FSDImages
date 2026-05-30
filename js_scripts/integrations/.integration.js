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
	challonge: {
		class_name: 'challonge',
		display: 'Challonge',
		ui: function () { return getChallongeEntryUI(); }
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
	
	// dataset management functions
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