function handleProjectUpdateCallback(form_details, created, api_write = false) {
	
	// insert separate dataset paths into standard local side data injection
	if (form_details.pinpoint_dataset_updates.length > 0) {
		form_details.pinpoint_dataset_updates.forEach(key_pair => {
			
			key_pair = JSON.parse(key_pair);
			form_details[key_pair.source] = key_pair.value;
			
			// detect and push dependent source changes, self source was pushed through normal capture
			GLOBAL.source_changes.push(...dependentDatasetSourceChanges(key_pair.source));

		});
	}
	
	// removed deleted dataset entries
	let formatted_create_delete = [];
	form_details.create_delete.forEach(create_delete => {
		formatted_create_delete.push(JSON.parse(create_delete));
	});
	if (formatted_create_delete.length > 0) {
		formatted_create_delete.filter(v => v.type == 'delete').forEach(delete_entry => {
			delete GLOBAL.active_project.data.sets[delete_entry.set_name].entries[delete_entry.data];
			GLOBAL.source_changes.push(...dependentDatasetSourceChanges('$var$sets/'+delete_entry.set_name+'/entries/'+delete_entry.data+'$/var$'));
		});
	}
	
	// add created dataset entries
	// no field can rely on something that didn't exist, so just push the dataset to source_changes if not already included
	if (created.length > 0) {
		created.forEach(create_entry => {
			let set_name = Object.keys(GLOBAL.active_project.data.sets).find(v => GLOBAL.active_project.data.sets[v].uid == create_entry.dataset_uid);
			GLOBAL.active_project.data.sets[set_name].entries[create_entry.entry_uid] = create_entry.entry;
			if (!GLOBAL.source_changes.includes('$var$sets/'+set_name+'$/var$')) {
				GLOBAL.source_changes.push('$var$sets/'+set_name+'$/var$');
			}
		});
	}
	
	// using instanced 'form_details', update local project data
	Object.keys(form_details).forEach(path => {
		if (isPathVariable(path)) {
			setRealValue(path, form_details[path]);
			// if API write, source changes are not pushed by a form system like in create_ui, manually do it here
			if (api_write) {
				GLOBAL.source_changes.push(path);
			}
		}
	});
	
	// generate new overlays with updated sources, once complete, reset updated sources
	// strip pointers from source changes before sending to overlay generator
	generateStreamOverlays(GLOBAL.source_changes.map(v => stripPointer(v)), () => {
		GLOBAL.source_changes = [];
		
		// execute 3pa command list, 10ms delay to allow for read buffer to complete from previous p2p data and overlay send
		setTimeout(function () { 
			executeCommandList(GLOBAL.command_list);
			GLOBAL.command_list = [];
		}, 10);
		
	});
			
	// determine if UI should refresh or dataset based on current navigation, no active navigation when under file menu page .. so ?. check on inner html
	let current_nav = Select('.active_navigation')?.innerHTML;
	if (current_nav == 'Switchboard' && !Select('#ui_editor_toggle').checked) {
		refreshUIBuild(false);
	} else if (current_nav == 'Data Sets') {
		if (Select('[name="dataset_manager_type"]') && Select('[name="dataset_manager_type"]').value != 'create') {
			let dataset_uid = Select('[name="dataset_manager_type"]').value;
			loadDataset(GLOBAL.active_project.data.sets[Object.keys(GLOBAL.active_project.data.sets).find(v => GLOBAL.active_project.data.sets[v].uid == dataset_uid)]);
		}
	}
	
	
}