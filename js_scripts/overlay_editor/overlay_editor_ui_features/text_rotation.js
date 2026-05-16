function featureTextRotation(layer) {
	return Create('div', {
		className: 'editor_section_block',
		children: [
			Create('div', {
				className: 'editor_section_title',
				innerHTML: 'Text Rotation'
			}),
			Create('div', {
				children: [
					Create('label', {
						innerHTML: 'Degrees',
						children: [
							Create('input', {
								type: 'number',
								step: '0.2',
								value: layer.style.rotation ?? 0,
								onkeyup: function () {
									let rotation = precise(this.value);
									if (rotation > 360) {
										rotation = 0;
										this.value = rotation;
									}
									if (rotation < -360) {
										rotation = 0;
										this.value = rotation;
									}
									getLayerById(GLOBAL.overlay_editor.active_layer).style.rotation = rotation;
									printCurrentCanvas();
								},
								onchange: function () {
									let rotation = precise(this.value);
									if (rotation > 360) {
										rotation = 0;
										this.value = rotation;
									}
									if (rotation < -360) {
										rotation = 0;
										this.value = rotation;
									}
									getLayerById(GLOBAL.overlay_editor.active_layer).style.rotation = rotation;
									printCurrentCanvas();
								}
							})
						]
					})
				]
			})
		]
	});
}