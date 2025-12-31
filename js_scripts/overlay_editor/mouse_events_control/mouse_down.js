function imageEditorMouseDown(event) {
	
	// ensure only left mouse down continues
	if (event.button != 0) {
		return;
	}
	
	// translate window cursor position to canvas position
	let translate_cursor = translateWindowToCanvas(event.clientX, event.clientY);
	
	// check if point drag on custom clip path layer
	if (GLOBAL.overlay_editor.active_layer != null) {
		let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
		if (layer.type == 'clip_path' && layer.clip_path.type == 'custom') {
			
			// define selection radius
			let radius_selection = definePolygonPointSize();
			
			// check if event within point radius
			for (let i=0; i<layer.clip_path.clip_points.length; i++) {
				if (distance(translate_cursor.x, translate_cursor.y, layer.clip_path.clip_points[i].x, layer.clip_path.clip_points[i].y) <= radius_selection) {
					GLOBAL.overlay_editor.custom_clip_path.drag_point = {
						index: i,
						origin: {
							x: layer.clip_path.clip_points[i].x,
							y: layer.clip_path.clip_points[i].y
						},
						cursor_origin: {
							x: translate_cursor.x,
							y: translate_cursor.y
						}							
					};
					
					// return and exit from remaining mouse down logic
					return;
				}
			}
			
		}
	}
	
	// init layer drag
	if (GLOBAL.overlay_editor.image_editor_drag == null && targetIsLayerElem(event.target)) {
		GLOBAL.overlay_editor.image_editor_drag = {
			id: event.target.id,
			elem: event.target,
			active_hover: event.target.id,
			dragging: false
		};
		return;
	} 

	// init canvas drags
	if (event.target.id == 'workspace') {
		
		if (eventWithinActiveSelection(translate_cursor)) {
			GLOBAL.overlay_editor.layer_selection_drag = {
				origin: {
					x: event.clientX,
					y: event.clientY
				},
				layer_origin: {
					x: GLOBAL.overlay_editor.active_layer_selection.layer_x,
					y: GLOBAL.overlay_editor.active_layer_selection.layer_y
				},
				sub_layer_origins: null
			}
			
			// if custom clip path, stash point origins for master drag, sub custom clip path origins are stored within the `sub_layer_origins` method below
			if (GLOBAL.overlay_editor.active_layer_selection.custom_clip_path) {
				GLOBAL.overlay_editor.layer_selection_drag.custom_clip_path_origins = GLOBAL.overlay_editor.active_layer_selection.points;
			}
			
			// stash group layer children origins
			let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
			if (typeof layer.clip_path !== 'undefined') {
				GLOBAL.overlay_editor.layer_selection_drag.sub_layer_origins = recurseLayerSubOrigins(layer.layers);
			}
			
			// prevent canvas drag if selection drag true
			return;
		}
		
		// init project drag
		GLOBAL.overlay_editor.canvas_window.origins = {
			x: GLOBAL.overlay_editor.canvas_window.x + event.clientX,
			y: GLOBAL.overlay_editor.canvas_window.y + event.clientY
		};
	
	}
	
}

function recurseLayerSubOrigins(layers) {
	return layers.map(v => {
		// stash coordinate of non clip path
		if (v.type != 'clip_path') {
			return {
				x: v.offset.x,
				y: v.offset.y
			};
		} else {
			// return sub layer origins
			let return_sub_origins = {
				children: recurseLayerSubOrigins(v.layers)
			}
			// if custom clip path, also stash point origins (dereferenced)
			if (v.clip_path.type == 'custom') {
				return_sub_origins.custom_clip_path_origins = JSON.parse(JSON.stringify(v.clip_path.clip_points));
			}
			// if square clip path, also stash offset origins (dereferenced)
			if (v.clip_path.type == 'square') {
				return_sub_origins.offset_origins = JSON.parse(JSON.stringify(v.clip_path.offset));
			}
			return return_sub_origins;
		}
	});
}