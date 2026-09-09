function featureDimensionsAndPosition(layer) {
	return Create('div', {
		className: 'editor_section_block',
		children: [
			Create('div', {
				className: 'editor_section_title',
				innerHTML: 'Dimensions and Position'
			}),
			Create('div', {
				className: 'row',
				children: [
					Create('div', {
						className: 'col',
						style: {
							width: '50%'
						},
						children: [
							Create('label', {
								innerHTML: 'x',
								children: [
									Create('input', {
										type: 'number',
										value: layer.offset.x,
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).offset.x = precise(this.value);
											this.value = preciseAndTrim(this.value);
											printCurrentCanvas();
											olsGeneralLog();
										}
									})
								]
							})
						]
					}),
					Create('div', {
						className: 'col',
						style: {
							width: '50%'
						},
						children: [
							Create('label', {
								innerHTML: 'y',
								children: [
									Create('input', {
										type: 'number',
										value: layer.offset.y,
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).offset.y = precise(this.value);
											this.value = preciseAndTrim(this.value);
											printCurrentCanvas();
											olsGeneralLog();
										}
									})
								]
							})
						]
					})
				]
			}),
			Create('div', {
				className: 'row',
				children: [
					Create('div', {
						className: 'col',
						style: {
							width: '50%'
						},
						children: [
							Create('label', {
								innerHTML: 'Width',
								children: [
									Create('input', {
										id: 'layer_width',
										type: 'number',
										value: layer.dimensions.width,
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).dimensions.width = precise(this.value);
											this.value = preciseAndTrim(this.value);
											printCurrentCanvas();
											olsGeneralLog();
										}
									})
								]
							})
						]
					}),
					(layer.type != 'text'
						? Create('div', {
								className: 'col',
								style: {
									width: '50%'
								},
								children: [
									Create('label', {
										innerHTML: 'Height',
										children: [
											Create('input', {
												type: 'number',
												id: 'layer_height',
												value: layer.dimensions.height,
												onchange: function () {
													getLayerById(GLOBAL.overlay_editor.active_layer).dimensions.height = precise(this.value);
													this.value = preciseAndTrim(this.value);
													printCurrentCanvas();
													olsGeneralLog();
												}
											})
										]
									})
								]
							})
						: Create('div')
					)
				]
			})
		]
	});
}