function imageEditorMouseDown(event) {
	
	// ensure only left mouse down continues
	if (event.button != 0) {
		return;
	}
	
	// translate window cursor position to canvas position
	let translate_cursor = translateWindowToCanvas(event.clientX, event.clientY);
	
	// check if point drag on custom clip path layer, prevented during transform feature
	if (GLOBAL.overlay_editor.active_layer != null) {
		let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
		if (layer.type == 'clip_path' && layer.clip_path.type == 'custom' && GLOBAL.overlay_editor.tools.transform == false) {
			
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

			// layer drag master object
			GLOBAL.overlay_editor.layer_selection_drag = {
				origin: {
					x: event.clientX,
					y: event.clientY
				},
				layer_origin: {
					x: GLOBAL.overlay_editor.active_layer_selection.layer_x,
					y: GLOBAL.overlay_editor.active_layer_selection.layer_y
				},
				clip_origins: null
			}
			
			// get layer
			let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
			
			// stash group origins
			if (typeof layer.clip_path !== 'undefined') {
				GLOBAL.overlay_editor.layer_selection_drag.clip_origins = {
					parent: null,
					children: null
				};
				// stash immediate points on custom clip path
				if (layer.clip_path.type == 'custom') {
					// this is not guaranteed to have the points stashed within "active_layer_selection" because of the transform feature, grab from active layer instead
					GLOBAL.overlay_editor.layer_selection_drag.clip_origins.parent = JSON.parse(JSON.stringify(layer.clip_path.clip_points));
				}
				// stash all child origins
				GLOBAL.overlay_editor.layer_selection_drag.clip_origins.children = recurseLayerSubOrigins(layer.layers);
			}
			
			// prevent further actions if selection drag true
			return;
		}
		
		// check for transform action drags
		if (initTransformActionDrag(translate_cursor)) {
			// if init returns true, prevent further actions
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
				return_sub_origins.sub_clip_origin = JSON.parse(JSON.stringify(v.clip_path.clip_points));
			}
			// if square clip path, also stash offset origins (dereferenced)
			if (v.clip_path.type == 'square') {
				return_sub_origins.offset_origins = JSON.parse(JSON.stringify(v.clip_path.offset));
			}
			return return_sub_origins;
		}
	});
}