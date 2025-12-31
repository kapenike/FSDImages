function featureImageSource(layer) {
	return Create('span', {
		innerHTML: 'Source',
		className: 'editor_spanlabel',
		children: [
			createPathVariableField({
				name: 'editor_value',
				override_source_setter: true,
				value: {
					value: layer.value,
					image_search: true
				},
				force_path_only: true,
				on_edit: function () {
					getLayerById(GLOBAL.overlay_editor.active_layer).value = this.value;
					printCurrentCanvas();
				}
			})
		]
	});
}