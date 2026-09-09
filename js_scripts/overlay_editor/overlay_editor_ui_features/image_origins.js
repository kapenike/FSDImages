function featureImageOrigins(layer) {
	return Create('div', {
		className: 'editor_section_block',
		children: [
			Create('div', {
				className: 'editor_section_title',
				innerHTML: 'Position Origins'
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
								innerHTML: 'Vertical',
								children: [
									Create('select', {
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).origins.vertical = this.value;
											printCurrentCanvas();
											olsGeneralLog();
										},
										children: ['top','center','bottom'].map(origin => {
											return Create('option', {
												innerHTML: origin,
												value: origin,
												selected: getLayerById(GLOBAL.overlay_editor.active_layer).origins.vertical == origin
											});
										})
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
								innerHTML: 'Horizontal',
								children: [
									Create('select', {
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).origins.horizontal = this.value;
											printCurrentCanvas();
											olsGeneralLog();
										},
										children: ['left','center','right'].map(origin => {
											return Create('option', {
												innerHTML: origin,
												value: origin,
												selected: getLayerById(GLOBAL.overlay_editor.active_layer).origins.horizontal == origin
											});
										})
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