// params: layer object, new position object
// moves sub layers of a clip path
function moveGroupLayer(layer, obj) {
	if (layer.type == 'clip_path') {
		let x_diff = 0;
		let y_diff = 0;
		if (layer.clip_path.type != 'none') {
			x_diff = typeof obj.x !== 'undefined' ? obj.x - layer.clip_path.offset.x : 0;
			y_diff = typeof obj.y !== 'undefined' ? obj.y - layer.clip_path.offset.y : 0;
		} else {
			let layer_dim = getLayerOutputDimensions(layer);
			x_diff = typeof obj.x !== 'undefined' ? obj.x - layer_dim.x : 0;
			y_diff = typeof obj.y !== 'undefined' ? obj.y - layer_dim.y : 0;
		}
		recurseMoveAllGroup(layer.layers, x_diff, y_diff);
		if (layer.clip_path.type == 'custom') {
			layer.clip_path.clip_points = layer.clip_path.clip_points.map(points => {
				return {
					x: points.x + x_diff,
					y: points.y + y_diff
				};
			});
		}
		// if contains clip path, move clip path origin coords too
		if (layer.clip_path.type != 'none') {
			layer.clip_path.offset.x = preciseAndTrim(layer.clip_path.offset.x + x_diff);
			layer.clip_path.offset.y = preciseAndTrim(layer.clip_path.offset.y + y_diff);
		}
		
	}
}

function recurseMoveAllGroup(layers, x_diff, y_diff) {
	layers.forEach(sub_layer => {
		if (sub_layer.clip_path) {
			if (sub_layer.clip_path.type == 'custom') {
				sub_layer.clip_path.clip_points = sub_layer.clip_path.clip_points.map(points => {
					return {
						x: points.x + x_diff,
						y: points.y + y_diff
					};
				});
			}
			recurseMoveAllGroup(sub_layer.layers, x_diff, y_diff);
			if (sub_layer.clip_path.type != 'none') {
				sub_layer.clip_path.offset.x = preciseAndTrim(sub_layer.clip_path.offset.x + x_diff);
				sub_layer.clip_path.offset.y = preciseAndTrim(sub_layer.clip_path.offset.y + y_diff);
			}
		} else {
			sub_layer.offset.x = preciseAndTrim(sub_layer.offset.x + x_diff);
			sub_layer.offset.y = preciseAndTrim(sub_layer.offset.y + y_diff);
		}
	});
}