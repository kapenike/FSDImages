// get bounding rect of a layer
function getLayerOutputDimensions(layer) {
	let output = {
		x: null,
		y: null,
		width: 0,
		height: 0,
		layer_x: null,
		layer_y: null
	};
	
	if (layer.type == 'text') {
		
		output.width = layer.dimensions.width;
		output.height = parseInt(layer.style.fontSize);
		output.x = layer.offset.x;
		output.y = layer.offset.y;
		output.layer_x = layer.offset.x;
		output.layer_y = layer.offset.y;
		if (layer.style.align == 'center') {
			output.x -= output.width/2;
		} else if (layer.style.align == 'right') {
			output.x -= output.width;
		}
		
	} else if (layer.type == 'image') {
		
		output.x = layer.offset.x;
		output.y = layer.offset.y;
		output.layer_x = layer.offset.x;
		output.layer_y = layer.offset.y;
		output.width = layer.dimensions.width;
		output.height = layer.dimensions.height;
		
		// detect image output size by ratio if set
		let width_scale = layer.dimensions.width != '' && layer.dimensions.width != null;
		let height_scale = layer.dimensions.height != '' && layer.dimensions.height != null;
		
		let value = getRealValue(layer.value);
		if (value.width && value.height) {
			output.width = value.width;
			output.height = value.height;
			if (width_scale || height_scale) {
				if (width_scale && height_scale) {
					// if both scaling
					output.width = layer.dimensions.width;
					output.height = layer.dimensions.height;
				} else if (width_scale) {
					// if only scaling width
					output.width = layer.dimensions.width;
					output.height = (layer.dimensions.width / value.width) * output.height;
				} else if (height_scale) {
					// if only scaling height
					output.height = layer.dimensions.height;
					output.width = (layer.dimensions.height / value.height) * output.width;
				}
			} else {
				output.width = value.width;
				output.height = value.height;
			}
		}
		
		// change origins of position, do not change output.layer_x/y as those coordinates are used by the overlay editor drag as a true position of origin
		if (layer.origins.vertical == 'center') {
			output.y -= output.height/2;
		} else if (layer.origins.vertical == 'bottom') {
			output.y -= output.height;
		}
		if (layer.origins.horizontal == 'center') {
			output.x -= output.width/2;
		} else if (layer.origins.horizontal == 'right') {
			output.x -= output.width;
		}
		
	} else if (layer.type == 'clip_path') {
		
		// no children or clip path, exit
		if (layer.layers.length == 0 && layer.clip_path.type == 'none') {
			return null;
		} else {
			
			// if a true clipping path, use layer dimensions and positions
			if (layer.clip_path.type == 'square') {
				
				output.x = layer.clip_path.offset.x;
				output.y = layer.clip_path.offset.y;
				output.layer_x = layer.clip_path.offset.x;
				output.layer_y = layer.clip_path.offset.y;
				output.width = layer.clip_path.dimensions.width;
				output.height = layer.clip_path.dimensions.height;
				
			} else if (layer.clip_path.type == 'custom') {
				
				// if custom clip path, get bounding dimensions for the case of nested group drag
				let max_x = null;
				let max_y = null;
				
				layer.clip_path.clip_points.forEach(points => {
					
					if (output.x == null || points.x < output.x) {
						output.x = points.x;
					}
					if (output.y == null || points.y < output.y) {
						output.y = points.y;
					}
					if (max_x == null || points.x > max_x) {
						max_x = points.x;
					}
					if (max_y == null || points.y > max_y) {
						max_y = points.y;
					}
					
				});
				
				output.width = max_x - output.x;
				output.height = max_y - output.y;
				
			} else {
				
				let max_x = null;
				let max_y = null;
				
				// expand bounding rect by children if just a layer group without clip path
				layer.layers.forEach(sub_layer => {
					let sub_dim = getLayerOutputDimensions(sub_layer);
					if (sub_dim == null) {
						return;
					}
					if (output.x == null || sub_dim.x < output.x) {
						output.x = sub_dim.x;
					}
					if (output.y == null || sub_dim.y < output.y) {
						output.y = sub_dim.y;
					}
					if (max_x == null || (sub_dim.x + sub_dim.width) > max_x) {
						max_x = sub_dim.x + sub_dim.width;
					}
					if (max_y == null || (sub_dim.y + sub_dim.height) > max_y) {
						max_y = sub_dim.y + sub_dim.height;
					}
				});
				
				if (max_x == null || max_y == null) {
					return null;
				} else {
					output.width = max_x - output.x;
					output.height = max_y - output.y;
				}
				
			}
		}
		
	}
	
	return output;
}