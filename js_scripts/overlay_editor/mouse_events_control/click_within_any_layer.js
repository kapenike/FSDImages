function clickWithinAnyLayer(position) {
	
	let found = findWithinLayer(GLOBAL.overlay_editor.current.layers, '', position);

	if (found) {
		setActiveLayer(found, true);
	}
	
}

function findWithinLayer(layers, append_id, position) {
	
	if (append_id != '') {
		append_id += '_';
	}
	
	for (let i=0; i<layers.length; i++) {
		
		let layer = layers[i];
		let pass_append_id = append_id+''+i;
		
		// if layer hidden, pass
		if (!toggleTrue(layer)) {
			continue;
		}
		
		let out_dim = getLayerOutputDimensions(layer);
		let within = false;
		if (out_dim != null) {
			if (layer.type == 'text' && layer.style.rotation && layer.style.rotation != 0) {
				let alignment_offset = (
					layer.style.align == 'center' 
						? out_dim.width/2
						: (layer.style.align == 'right'
							? out_dim.width
							: 0
							)
				);
				out_dim.rotation = layer.style.rotation;
				out_dim.rotation_origin = {
					x: out_dim.x + alignment_offset,
					y: out_dim.y
				};
			}
			within = eventWithinActiveSelection(position, out_dim);
		}
		
		if (layer.type == 'clip_path' && (out_dim == null || within) && layer.layers) {
			let sub_search = findWithinLayer(layer.layers, pass_append_id, position);
			if (sub_search) {
				return sub_search;
			}
		}
		
		if (within && out_dim != null) {
			return pass_append_id;
		}
		
	}
	
	return false;
	
}