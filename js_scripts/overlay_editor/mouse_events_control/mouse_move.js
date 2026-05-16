function imageEditorMouseMove(event) {
	
	// drag layer elements in layer window pane
	if (GLOBAL.overlay_editor.image_editor_drag != null) {
		
		if (GLOBAL.overlay_editor.image_editor_drag.dragging == false) {
			
			// create draggable ui indicator element
			Select('#body', {
				children: [
					Create('div', {
						id: 'drag_clone',
						style: {
							width: event.target.offsetWidth+'px',
							height: event.target.offsetHeight+'px'
						}
					})
				]
			});
			GLOBAL.overlay_editor.image_editor_drag.dragging = true;
		}
		
		// update drag clone location
		Select('#drag_clone', {
			style: {
				top: event.clientY+'px',
				left: event.clientX+'px'
			}
		});
		
		// layer drag border indicator
		if (targetIsLayerElem(event.target)) {
			// reset past drop element border
			Select('#'+GLOBAL.overlay_editor.image_editor_drag.active_hover).style.borderTop = '';
			// set new drop element
			event.target.style.borderTop = '4px solid #0469e2';
			GLOBAL.overlay_editor.image_editor_drag.active_hover = event.target.id;
		}
		
	} else if (GLOBAL.overlay_editor.layer_selection_drag) {
		
		// cursor move layer and reprint
		let x_diff = (GLOBAL.overlay_editor.layer_selection_drag.origin.x - event.clientX)/GLOBAL.overlay_editor.scale;
		let y_diff = (GLOBAL.overlay_editor.layer_selection_drag.origin.y - event.clientY)/GLOBAL.overlay_editor.scale;
		
		// drag hotkeys
		// ctrl - allow vertical only
		// shift - allow horizontal only
		if (GLOBAL.held_keys.ctrl) {
			x_diff = 0;
		}
		if (GLOBAL.held_keys.shift) {
			y_diff = 0;
		}
		
		// set reference incase of sub layer movement
		let selection_layer_reference = getLayerById(GLOBAL.overlay_editor.active_layer);
		
		// sub group movement
		if (selection_layer_reference.type == 'clip_path') {
			dragRecurseSubGroupMovement(selection_layer_reference.layers, GLOBAL.overlay_editor.layer_selection_drag.clip_origins.children, x_diff, y_diff);
		}

		// if custom clip path, move all points of master layer
		if (selection_layer_reference.type == 'clip_path' && selection_layer_reference.clip_path.type == 'custom' && GLOBAL.overlay_editor.layer_selection_drag.clip_origins.parent != null) {
			for (let i=0; i<selection_layer_reference.clip_path.clip_points.length; i++) {
				let origin = GLOBAL.overlay_editor.layer_selection_drag.clip_origins.parent[i];
				selection_layer_reference.clip_path.clip_points[i] = {
					x: preciseAndTrim(origin.x - x_diff),
					y: preciseAndTrim(origin.y - y_diff)
				}
			}
		}
		
		// if square group container, change reference for container movement below, making it the "moveable layer"
		if (selection_layer_reference.type == 'clip_path' && selection_layer_reference.clip_path.type == 'square') {
			selection_layer_reference = selection_layer_reference.clip_path;
		}
		
		// if a moveable layer
		if (GLOBAL.overlay_editor.layer_selection_drag.layer_origin.x != null) {
			selection_layer_reference.offset = {
				x: preciseAndTrim(GLOBAL.overlay_editor.layer_selection_drag.layer_origin.x - x_diff),
				y: preciseAndTrim(GLOBAL.overlay_editor.layer_selection_drag.layer_origin.y - y_diff)
			}
		}
		
		printCurrentCanvas();
		
	} else if (GLOBAL.overlay_editor.canvas_window.origins) {
		
		// project drag
		GLOBAL.overlay_editor.canvas_window.x = GLOBAL.overlay_editor.canvas_window.origins.x - event.clientX;
		GLOBAL.overlay_editor.canvas_window.y = GLOBAL.overlay_editor.canvas_window.origins.y - event.clientY;
		printCurrentCanvas();
		
	} else if (GLOBAL.overlay_editor.custom_clip_path.drag_point) {
		
		// translate window cursor position to canvas position
		let translate_cursor = translateWindowToCanvas(event.clientX, event.clientY);
		
		// custom clip path point drag
		let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
		layer.clip_path.clip_points[GLOBAL.overlay_editor.custom_clip_path.drag_point.index] = {
			x: GLOBAL.overlay_editor.custom_clip_path.drag_point.origin.x - (GLOBAL.overlay_editor.custom_clip_path.drag_point.cursor_origin.x - translate_cursor.x),
			y: GLOBAL.overlay_editor.custom_clip_path.drag_point.origin.y - (GLOBAL.overlay_editor.custom_clip_path.drag_point.cursor_origin.y - translate_cursor.y)
		}
		printCurrentCanvas();
		
	} else if (GLOBAL.overlay_editor.transform_action_drag) {
		
		// translate window cursor position to canvas position
		let translate_cursor = translateWindowToCanvas(event.clientX, event.clientY);
		
		// transform action drag
		transformActionDrag(translate_cursor);
		printCurrentCanvas();
		
	}
	
}

function dragRecurseSubGroupMovement(layers, origins, x_diff, y_diff) {
	
	for (let i=0; i<layers.length; i++) {
		let sub_layer = layers[i];
		let sub_origins = origins[i];
		
		// if sub clip path
		if (sub_layer.type == 'clip_path') {
			
			// if sub layer is custom clipping path, move them from origins
			if (sub_layer.clip_path.type == 'custom') {
				for (let i2=0; i2<sub_layer.clip_path.clip_points.length; i2++) {
					layers[i].clip_path.clip_points[i2] = {
						x: preciseAndTrim(sub_origins.sub_clip_origin[i2].x - x_diff),
						y: preciseAndTrim(sub_origins.sub_clip_origin[i2].y - y_diff)
					}
				}
			}
			
			// if sub layer is square clipping path, move its origins
			if (sub_layer.clip_path.type == 'square') {
				layers[i].clip_path.offset = {
					x: preciseAndTrim(sub_origins.offset_origins.x - x_diff),
					y: preciseAndTrim(sub_origins.offset_origins.y - y_diff)
				}
			}
			
			// recurse further
			dragRecurseSubGroupMovement(layers[i].layers, origins[i].children, x_diff, y_diff);
			
		} else {
			layers[i].offset = {
				x: preciseAndTrim(sub_origins.x - x_diff),
				y: preciseAndTrim(sub_origins.y - y_diff)
			}
		}
		
	}
	
}