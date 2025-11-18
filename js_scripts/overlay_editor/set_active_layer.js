function setActiveLayer(index, from_context_menu = false) {
	
	// if null, also nullify active layer selection
	if (index == null) {
		GLOBAL.overlay_editor.active_layer_selection = null;
	}
	
	// set active layer index
	GLOBAL.overlay_editor.active_layer = index == null ? null : index.toString().split('_').filter(x => x != 'layer').join('_');
	
	// print new canvas to use selection region on the new active layer
	printCurrentCanvas();
	
	// setup new layer info UI for active layer (edit layer details)
	setupLayerInfoEditor();
	
	// generate new layers UI with active layer selected
	setupLayersUI(from_context_menu);
	
}