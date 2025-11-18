function createLayersUI(layers, parent_index = '') {
	if (parent_index != '') {
		parent_index += '_';
	}
	return layers.map((layer, index) => {
		let full_index = parent_index+index;
		let active_layer_index = GLOBAL.overlay_editor.active_layer ? GLOBAL.overlay_editor.active_layer.replace('layer_', '') : GLOBAL.overlay_editor.active_layer;
		return Create('div', {
			id: 'layer_'+full_index,
			className: 'editor_layer'+(full_index == active_layer_index ? ' active_editor_layer' : ''),
			innerHTML: '<span id="layer_'+full_index+'_title">'+layer.title+'</span>',
			children: (layer.type == 'clip_path'
				?	[Create('div', {
						className: 'editor_layer_group',
						children: createLayersUI(layer.layers, full_index)
					})]
				: []
			),
			onclick: () => { setActiveLayer(full_index); event.stopPropagation(); },
			oncontextmenu: function () { editLayer(this); event.stopPropagation(); }
		})
	});
}

function setupLayersUI(from_context_menu = false) {
	Select('#lower_editor', {
		innerHTML: '',
		children: createLayersUI(GLOBAL.overlay_editor.current.layers)
	});
	if (from_context_menu) {
		// scroll active selection into view if it isn't already
		setTimeout(function () {
			let active_layer = Select('.active_editor_layer');
			if (active_layer) {
				active_layer.scrollIntoView();
			}
		}, 1);
	}
}
