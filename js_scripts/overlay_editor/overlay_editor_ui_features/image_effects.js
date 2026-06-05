function featureImageEffects(layer) {
	return Create('div', {
		className: 'editor_section_block',
		children: [
			Create('div', {
				className: 'editor_section_title',
				innerHTML: 'Image Effects'
			}),
			Create('div', {
				className: 'row',
				children: [
					Create('div', {
						className: 'col',
						style: {
							width: '25%'
						},
						children: [
							Create('label', {
								innerHTML: 'Grayscale',
								children: [
									Create('br'),
									Create('input', {
										type: 'checkbox',
										checked: layer.effects.grayscale ? true : false,
										value: true,
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).effects.grayscale = this.checked;
											printCurrentCanvas();
										}
									})
								]
							})
						]
					}),
					Create('div', {
						className: 'col',
						style: {
							width: '25%'
						},
						children: [
							Create('label', {
								innerHTML: 'Mirror',
								children: [
									Create('br'),
									Create('input', {
										type: 'checkbox',
										checked: layer.effects.mirror ? true : false,
										value: true,
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).effects.mirror = this.checked;
											printCurrentCanvas();
										}
									})
								]
							})
						]
					})
				]
			})
		]
	});
}