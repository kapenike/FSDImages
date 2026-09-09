function removeLayer(id, prevent_log = false) {
	
	ids = id.toString().split('_').filter(v => v != 'layer');
	let layer = GLOBAL.overlay_editor.current;
	let i=0;
	for (i=0; i<ids.length-1; i++) {
		layer = layer.layers[ids[i]];
	}
	layer.layers.splice(ids[i], 1);
	
	// set to no active layer
	setActiveLayer(null);
	
	// remove edit layer dialog
	removeUIEditMenu();
	
	// log removal for undo redo
	if (!prevent_log) {
		GLOBAL.overlay_editor.state.action('remove', id);
	}
}