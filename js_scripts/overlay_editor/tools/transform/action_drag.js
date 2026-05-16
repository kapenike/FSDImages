function initTransformActionDrag(cursor) {
	
	// loop transform action rect areas to check if cursor is within, then init global
	let found = false;
	
	// get action box dimensions / position
	let boxes = transformGetActionBoxes();
	
	// print
	Object.keys(boxes).forEach(box_key => {
		if (!found && eventWithinActiveSelection(cursor, boxes[box_key])) {
			found = true;
			GLOBAL.overlay_editor.transform_action_drag = {
				cursor: cursor,
				action: box_key,
				layer: JSON.parse(JSON.stringify(getLayerById(GLOBAL.overlay_editor.active_layer)))
			};
		}
	});
	
	return found;
	
}

function transformActionDrag(cursor) {
	
	let state = GLOBAL.overlay_editor.transform_action_drag;
	let x_diff = state.cursor.x - cursor.x;
	let y_diff = state.cursor.y - cursor.y;
	
	loopTransformActionDrag(state.layer, getLayerById(GLOBAL.overlay_editor.active_layer), state.action, x_diff, y_diff);
	
}

// all layer type transform conditions
function loopTransformActionDrag(ref, layer, action, x_diff, y_diff) {
	
	// text transform
	if (layer.type == 'text') {
		let double_scale = GLOBAL.held_keys.shift ? 2 : 1;
		if (action == 'left') {
			layer.dimensions.width = ref.dimensions.width + (x_diff * double_scale);
			if (layer.style.align == 'left') {
				layer.offset.x = ref.offset.x - x_diff;
			} else if (layer.style.align == 'center') {
				layer.offset.x = ref.offset.x - (x_diff*(double_scale == 2 ? 0 : .5));
			}	else if (layer.style.align == 'right') {
				layer.offset.x = ref.offset.x + (double_scale == 2 ? x_diff : 0);
			}
		} else if (action == 'right') {
			layer.dimensions.width = ref.dimensions.width - (x_diff * double_scale);
			if (layer.style.align == 'left') {
				layer.offset.x = ref.offset.x + (double_scale == 2 ? x_diff : 0);
			} else if (layer.style.align == 'center') {
				layer.offset.x = ref.offset.x - (x_diff*(double_scale == 2 ? 0 : .5));
			}	else if (layer.style.align == 'right') {
				layer.offset.x = ref.offset.x - x_diff;
			}
		}
		return;
	}
	
	if (layer.type == 'image') {

		// specific actions deny access to axis diffs
		if (action == 'top' || action == 'bottom') {
			x_diff = 0;
		}
		if (action == 'left' || action == 'right') {
			y_diff = 0;
		}
		
		// movement
		let is_left = (action.indexOf('left') > -1 ? -1 : 1);
		let is_top = (action.indexOf('top') > -1 ? -1 : 1);
		
		// ensure ref dimensions exist, stashed for faster access in remaining drag movements
		if (ref.dimensions.width == '' || ref.dimensions.height == '') {
			let image_default_size = getRealValue(ref.value);
			// get initial image ratio
			ref.hot_ratio = image_default_size.width / image_default_size.height;
			if (ref.dimensions.width == '' && ref.dimensions.height == '') {
				ref.dimensions.width = image_default_size.width;
				ref.dimensions.height = image_default_size.height;
			}
			if (ref.dimensions.width == '') {
				ref.dimensions.width = ref.dimensions.height * ref.hot_ratio;
			} else if (ref.dimensions.height == '') {
				ref.dimensions.height = ref.dimensions.width / ref.hot_ratio;
			}
		} else if (ref.dimensions.width != '' && ref.dimensions.height != '') {
			// init non standard ratio
			ref.hot_ratio = ref.dimensions.width / ref.dimensions.height
		}
			
		// if alt hotkey active, allow direct size change mapping
		if (GLOBAL.held_keys.alt) {
			
			layer.dimensions.width = ref.dimensions.width - (is_left * x_diff);
			layer.dimensions.height = ref.dimensions.height - (is_top * y_diff);
			ref.hot_ratio = layer.dimensions.width / layer.dimensions.height;
			
			// vector diffs after size
			x_diff = x_diff * is_left;
			y_diff = y_diff * is_top;
			
		} else {
		

			// standard ratio positioning change and vector BEFORE size change mapping
			if (Math.abs(x_diff) > Math.abs(y_diff)) {
				y_diff = (x_diff / ref.hot_ratio) * is_left;
				x_diff = x_diff * is_left;
			} else {
				x_diff = (y_diff * ref.hot_ratio) * is_top;
				y_diff = y_diff * is_top;
			}


			// scale using width
			if (layer.dimensions.width != '' || layer.dimensions.width == '' && layer.dimensions.height == '') {
				layer.dimensions.width = ref.dimensions.width - x_diff;
				// if non standard aspect ratio
				if (layer.dimensions.height != '') {
					layer.dimensions.height = layer.dimensions.width / ref.hot_ratio;
				}
			} else if (layer.dimensions.height != '') {
				layer.dimensions.height = ref.dimensions.height - y_diff;
				// if non standard aspect ratio
				if (layer.dimensions.width != '') {
					layer.dimensions.width = layer.dimensions.height * ref.hot_ratio;
				}
			}
			
		}
		
		layer.offset.x = layer.origins.horizontal == 'center'
			? ref.offset.x - ((x_diff/2) * is_left)
			: layer.origins.horizontal == 'right'
				? (is_left == -1 ? ref.offset.x : ref.offset.x - x_diff)
				: (is_left == 1 ? ref.offset.x : ref.offset.x + x_diff);
		layer.offset.y = layer.origins.vertical == 'center'
			? ref.offset.y - ((y_diff/2) * is_top)
			: layer.origins.vertical == 'top'
				? (is_top == 1 ? ref.offset.y : ref.offset.y + y_diff)
				: (is_top == -1 ? ref.offset.y : ref.offset.y - y_diff);
		
	}
	
}