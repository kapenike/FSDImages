function setPathEditorValue(path) {
	
	// get uid from path selection dropdown
	let uid = Select('#path_selection_dialog').uid;
	
	// variable input field
	let input_field = Select('#var_set_input_'+uid);
	
	// settings data
	let data = Select('#variable_input_'+uid).data;
	
	// if path only AND depth value is allowed
	let is_depth_path_only = data.path_only && Select('#depth_value_'+uid);
	
	// if path only, update to path will override all (reset innerHTML)
	if (data.path_only) {
		input_field.innerHTML = '';	
		
		// clear depth value so that the new field generation will default to depth value 1
		if (is_depth_path_only) {

			Select('#depth_value_'+uid, {
				innerHTML: '',
				style: {
					display: 'none'
				},
				children: [
					Create('option', {
						innerHTML: '',
						value: ''
					})
				]
			});
			
		}
	}
	
	// create new path variable entry
	if (GLOBAL.ui.variable_input_caret && GLOBAL.ui.variable_input_caret.uid == uid && GLOBAL.ui.variable_input_caret.position > -1) {
		// if valid caret position for entry, insert there
		variableInputCaretInsert(input_field, createPathVariableEntry(path));
	} else {
		// otherwise just append
		input_field.appendChild(createPathVariableEntry(path));
	}
	
	// store text representation of the current variable entry as the form value
	Select('#variable_input_'+uid).value = getFormValueOfPathSelection(uid, input_field.innerHTML);
	
	// call on edit function
	Select('#variable_input_'+uid).onedit();
	
	// if path only and depth allowed, also update depth value list
	if (is_depth_path_only) {
		Select('#depth_value_'+uid, {
			innerHTML: '',
			style: {
				display: 'inline-block'
			},
			children: generateDepthValueList(Select('#variable_input_'+uid).value)
		});
	}
	
	closePathEditor(uid);
}