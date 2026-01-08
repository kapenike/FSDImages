function workerWriteToSwitchboard(value_pairs) {
	
	// reset source change list and command list
	GLOBAL.source_changes = [];
	GLOBAL.command_list = [];
	
	// init form submission
	let form_details = {
		application: 'update_project_details',
		uid: GLOBAL.active_project.uid,
		pinpoint_dataset_updates: []
	}
	
	// loop values pairs and:
	//	- insert as direct child of form_details
	//	- move to dataset sub setter array if dataset pinpoint setter
	//	- append to command list if command
	value_pairs.forEach(key_value => {
		if ((typeof key_value.source === 'undefined' || key_value.source == '$var$$/var$') && key_value.value.indexOf('::') > -1) {
			// is command
			GLOBAL.command_list.push(key_value.value);
		} else if (key_value.source.slice(0,10) == '$var$sets/') {
			// ensure this dataset setter extends to the proper depth (5th "/" included in $/var$)
			if (key_value.source.split('/').length >= 5) {
				// is dataset, must be json encoded for post
				form_details.pinpoint_dataset_updates.push(JSON.stringify(key_value));
			}
		} else if (typeof key_value.source !== 'undefined' && isPathVariable(key_value.source)) {
			// is data structure value
			form_details[key_value.source] = key_value.value;
		}
	});
	
	// submit changes
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {
			
			// insert separate dataset paths into standard local side data injection
			if (form_details.pinpoint_dataset_updates.length > 0) {
				form_details.pinpoint_dataset_updates.forEach(key_pair => {
					
					key_pair = JSON.parse(key_pair);
					form_details[key_pair.source] = key_pair.value;
					
					// detect and push dependent source changes, self source is not pushed here (pushed below)
					GLOBAL.source_changes.push(...dependentDatasetSourceChanges(key_pair.source));

				});
			}
			
			// using instanced 'form_details', update local project data
			Object.keys(form_details).forEach(path => {
				if (isPathVariable(path)) {
					setRealValue(path, form_details[path]);
					GLOBAL.source_changes.push(path);
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
			
			// determine if UI should refresh or dataset based on current navigation
			let current_nav = Select('.active_navigation').innerHTML;
			if (current_nav == 'Switchboard') {
				refreshUIBuild(false);
			} else if (current_nav == 'Data Sets') {
				if (Select('[name="dataset_manager_type"]') && Select('[name="dataset_manager_type"]').value != 'create') {
					let dataset_uid = Select('[name="dataset_manager_type"]').value;
					loadDataset(GLOBAL.active_project.data.sets[Object.keys(GLOBAL.active_project.data.sets).find(v => GLOBAL.active_project.data.sets[v].uid == dataset_uid)]);
				}
			}
			
		}
		
	}, 'body');

}
