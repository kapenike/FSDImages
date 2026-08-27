function getLayerById(id, source = GLOBAL.overlay_editor.current) {
	
	// strip layer pre-text from id and split by depth on _ char
	ids = id.toString().split('_').filter(v => v != 'layer');
	let layer = source;
	ids.forEach(id => {
		layer = layer.layers[id];
	});
	return layer;
}
