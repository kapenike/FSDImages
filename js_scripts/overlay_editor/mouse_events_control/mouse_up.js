function imageEditorMouseUp(event) {
	if (GLOBAL.overlay_editor.image_editor_drag != null) {
		if (GLOBAL.overlay_editor.image_editor_drag.dragging == true) {
			if (GLOBAL.overlay_editor.image_editor_drag.id != GLOBAL.overlay_editor.image_editor_drag.active_hover) {
				
				let drag_layer = getLayerById(GLOBAL.overlay_editor.image_editor_drag.id);
				let hover_layer = getLayerById(GLOBAL.overlay_editor.image_editor_drag.active_hover);
				

					
				// if hover target is an empty layer group area, append sub layer id to mock an insert
				if (event.target.className.split(' ').includes('editor_layer_group')) {
					GLOBAL.overlay_editor.image_editor_drag.active_hover += '_0';
				}
				
				// get reference to containing layers objects of dragged element, where the last id in pull_ids will be used later
				let pull_ids = GLOBAL.overlay_editor.image_editor_drag.id.toString().split('_').filter(v => v != 'layer');
				let last_pull_id = parseInt(pull_ids.pop());
				let pull_reference = GLOBAL.overlay_editor.current.layers;
				for (let i=0; i<pull_ids.length; i++) {
					pull_reference = pull_reference[pull_ids[i]].layers;
				}
				
				// get reference to containing layers objects of dropped element, where the last id in insert_ids will be used later
				let insert_ids = GLOBAL.overlay_editor.image_editor_drag.active_hover.toString().split('_').filter(v => v != 'layer');
				let last_insert_id = parseInt(insert_ids.pop());
				let insert_reference = GLOBAL.overlay_editor.current.layers;
				for (let i=0; i<insert_ids.length; i++) {
					insert_reference = insert_reference[insert_ids[i]].layers;
				}
				
				// detached clone pull for insert
				let insert_layer_copy = JSON.parse(JSON.stringify(pull_reference[last_pull_id]));
				
				// insert cloned layer
				if (last_insert_id == 0) {
					insert_reference.unshift(insert_layer_copy);
				} else {
					insert_reference.splice(last_insert_id, 0, insert_layer_copy);
				}
				
				// if path of pull id does not diverge from insert id, if can affect splice order or new layer position
				if (pull_ids.every((id, index) => id == insert_ids[index])) {
					
					if (pull_ids.length == insert_ids.length && last_pull_id >= last_insert_id) {
						
						// if insert and pull in the same list and the pull id was greater than the insert id, after insert the last pull id now needs incremented to splice its new location
						last_pull_id++;
						
					} else if (insert_ids.length > pull_ids.length && insert_ids[pull_ids.length] > last_pull_id) {
						
						// if insert is a sub layer that extends past a pull layer, but the pull layer removal would change that lists index of the parent insert id path, its id must be decremented at that index for the new layer to activated properly
						insert_ids[pull_ids.length]--;
						
					} else if (pull_ids.length == insert_ids.length && last_pull_id < last_insert_id) {
						
						// insert and pull same depth but pull < than insert, last insert id must decrement
						last_insert_id--;
						
					}

				}
					
				// remove pull layer
				pull_reference.splice(last_pull_id, 1);
					
				// set new active layer
				setActiveLayer([...insert_ids, last_insert_id].join('_'));	
				
			}
			
			// remove drag clone
			Select('#drag_clone').remove();
			
		}
		
		// reset drag state
		GLOBAL.overlay_editor.image_editor_drag = null;
		
	} else if (GLOBAL.overlay_editor.layer_selection_drag) {
		
		// end cursor drag
		GLOBAL.overlay_editor.layer_selection_drag = null;
		setupLayerInfoEditor();
		
	} else if (GLOBAL.overlay_editor.canvas_window.origins != null) {
		
		// reset project drag
		GLOBAL.overlay_editor.canvas_window.origins = null;
		
	} else if (GLOBAL.overlay_editor.custom_clip_path.drag_point != null) {
		
		// reset custom clip path point drag
		GLOBAL.overlay_editor.custom_clip_path.drag_point = null;
		
	} else if (GLOBAL.overlay_editor.transform_action_drag != null) {
		
		// reset transform drag
		GLOBAL.overlay_editor.transform_action_drag = null;
		setupLayerInfoEditor();
		
	}
}