function openPathEditor(uid) {
	
	// if existing path editor is open, toggle its path editor button
	if (Select('#path_selection_dialog')) {
		toggleSelectionEditorButton(false, Select('#path_selection_dialog').uid);
	}
	
	let elem = Select('#var_set_input_'+uid);
	let open_path = getOpenPath(uid);
	let base_path = Select('#variable_input_'+uid).data.base_path;
	
	/*if (use_anchor) {
		use anchor to determine which variable has been selected and use it to modify
		window.getSelection()
	}*/
	
	if (open_path == '') {
		open_path = null;
	}
	if (base_path == '') {
		base_path = null;
	}
	
	// save access to current input id
	GLOBAL.ui.active_path_field_id = elem.uid;
	
	// close previous path editor without toggling initializer
	closePathEditor(elem.uid, true);
	
	// open path selection dialog, change class name if path only or not
	elem.parentNode.appendChild(Create('div', {
		id: 'path_selection_dialog',
		className: elem.contentEditable == 'true' ? '' : 'path_selection_dialog_path_only',
		uid: elem.uid,
		children: createPathListForEditor(open_path, base_path)
	}));
	
	// change path editor toggle button 
	toggleSelectionEditorButton(true, elem.uid);
}

function closePathEditor(uid, init = false) {
	
	if (Select('#path_selection_dialog')) {
		Select('#path_selection_dialog').remove();
	}
	
	if (!init) {
		
		// if not during initialization, change action state of editor toggle button
		toggleSelectionEditorButton(false, uid);
		
		// ensure proper text nodes between variable nodes
		variableFieldProperSpacing(Select('#var_set_input_'+uid));
		
	}
}
