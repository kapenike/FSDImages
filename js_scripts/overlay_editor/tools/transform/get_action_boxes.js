function transformGetActionBoxes() {
	
	let box_size = 20;
	
	let dim = GLOBAL.overlay_editor.active_layer_selection;
	
	let layer_type = getLayerById(GLOBAL.overlay_editor.active_layer).type;
	
	let boxes = {};
	
	// right drag
	boxes.right = {
		x: dim.x + dim.width,
		y: dim.y,
		width: box_size,
		height: dim.height
	};

	// left drag
	boxes.left = {
		x: dim.x - box_size,
		y: dim.y,
		width: box_size,
		height: dim.height
	};
	
	// text layer does not allow any transform except on x axis
	if (layer_type != 'text') {
		
		// top left drag
		boxes.top_left = {
			x: dim.x - box_size,
			y: dim.y - box_size,
			width: box_size,
			height: box_size
		};
		
		// top drag
		boxes.top = {
			x: dim.x,
			y: dim.y - box_size,
			width: dim.width,
			height: box_size
		};
		
		// top right drag
		boxes.top_right = {
			x: dim.x + dim.width,
			y: dim.y - box_size,
			width: box_size,
			height: box_size
		};
		
		// bottom right drag
		boxes.bottom_right = {
			x: dim.x + dim.width,
			y: dim.y + dim.height,
			width: box_size,
			height: box_size
		};
		
		// bottom drag
		boxes.bottom = {
			x: dim.x,
			y: dim.y + dim.height,
			width: dim.width,
			height: box_size
		};
		
		// bottom left drag
		boxes.bottom_left = {
			x: dim.x - box_size,
			y: dim.y + dim.height,
			width: box_size,
			height: box_size
		};
		
	}
	
	return boxes;
	
}