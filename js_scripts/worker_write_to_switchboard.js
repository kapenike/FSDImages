function workerWriteToSwitchboard(value_pairs) {
	
	// reset source change list and command list
	GLOBAL.source_changes = [];
	GLOBAL.command_list = [];
	
	// init form submission
	let form_details = {
		application: 'update_project_details',
		uid: GLOBAL.active_project.uid,
		create_delete: []
	}
	
	// handle create delete before casting to normal form capture on this edge case of raw data handling from api scripts rather than text from switchboard
	// this allows api to handle multiple creations and deletions as a batch unlike the switchboard
	// handled one by one and then split off into form_details.create_delete on success
	for (let i=0; i<value_pairs.length; i++) {
		let key_value = value_pairs[i];
		if (pathIsDatasetCreaterDeleter(key_value.source)) {
			let create_delete_temp_handler = { create_delete: [] };
			create_delete_temp_handler[key_value.source] = key_value.value;
			handleCreaterDeleterSetting(create_delete_temp_handler, key_value.source);
			if (create_delete_temp_handler.create_delete.length > 0) {
				form_details.create_delete.push(create_delete_temp_handler.create_delete.pop());
				value_pairs.splice(i, 1);
				i--;
			}
		}
	}
	
	// loop values pairs and:
	//	- append to command list if command
	//	- insert as direct child of form_details
	
	value_pairs.forEach(key_value => {
		if ((typeof key_value.source === 'undefined' || key_value.source == '$var$$/var$') && key_value.value.indexOf('::') > -1) {
			// is command
			GLOBAL.command_list.push(key_value.value);
		} else if (typeof key_value.source !== 'undefined' && isPathVariable(key_value.source)) {
			// is data structure value
			form_details[key_value.source] = key_value.value;
		}
	});
	
	// form fields attempting to write to dataset entries are separated into pinpoint_dataset_updates list
	splitDatasettersFromList(form_details);
	
	// submit changes
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {
			
			// send true boolean to let function know this is headless structure change
			handleProjectUpdateCallback(form_details, data.created_dataset_entries, true);
			
		}
		
	}, 'body');

}
