function getLayerById(id, source = GLOBAL.overlay_editor.current) {
	// strip layer pre-text from id and split by depth on _ char
	ids = id.toString().split('_').filter(v => v != 'layer');
	let layer = source;
	ids.forEach(id => {
		layer = layer?.layers?.[id];
	});
	return layer;
}

function getLayerParentById(id, source = GLOBAL.overlay_editor.current) {
	// strip layer pre-text from id and split by depth on _ char
	ids = id.toString().split('_').filter(v => v != 'layer');
	ids.pop();
	let layer = source;
	ids.forEach(id => {
		layer = layer?.layers?.[id];
	});
	return layer;
}

function sanitizeLayerId(id) {
	id = id.toString();
	if (id.indexOf('layer_') > -1) {
		id = id.replace('layer_','');
	}
	return id;
}
