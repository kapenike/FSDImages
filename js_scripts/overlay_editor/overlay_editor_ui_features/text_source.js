function featureTextSource(layer) {
	return Create('span', {
		innerHTML: 'Value',
		className: 'editor_spanlabel',
		children: [
			createPathVariableField({
				name: 'editor_value',
				value: {
					value: layer.value
				},
				allow_path_only: false,
				on_edit: function () {
					getLayerById(GLOBAL.overlay_editor.active_layer).value = this.value;
					printCurrentCanvas();
					olsGeneralLog();
				}
			})
		]
	});
}