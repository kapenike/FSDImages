function featureTextStyle(layer) {
	return Create('div', {
		className: 'editor_section_block',
		children: [
			Create('div', {
				className: 'editor_section_title',
				innerHTML: 'Text Style'
			}),
			Create('div', {
				className: 'row',
				children: [
					Create('div', {
						className: 'col',
						style: {
							width: '44%'
						},
						children: [
							Create('label', {
								innerHTML: 'Font',
								children: [
									Create('select', {
										children: Object.keys(FONTS).sort().map(font => {
											return Create('option', {
												innerHTML: font,
												value: "'"+font+"'",
												selected: layer.style.font == "'"+font+"'"
											})
										}),
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).style.font = this.value;
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
							width: '30%'
						},
						children: [
							Create('label', {
								innerHTML: 'Size',
								children: [
									Create('input', {
										type: 'number',
										min: 1,
										step: 0.5,
										value: layer.style.fontSize,
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).style.fontSize = precise(this.value);
											this.value = preciseAndTrim(this.value);
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
							width: '26%'
						},
						children: [
							Create('label', {
								innerHTML: 'Unit',
								children: [
									Create('select', {
										children: ['px','%','pt','in','cm','mm','pc','em'].map(unit => {
											return Create('option', {
												innerHTML: unit,
												value: unit,
												selected: unit == layer.style.unitMeasure
											})
										}),
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).style.fontMeasure = this.value;
											printCurrentCanvas();
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
							width: '35%'
						},
						children: [
							Create('label', {
								innerHTML: 'Style',
								children: [
									Create('select', {
										children: ['normal','italic'].map(style => {
											return Create('option', {
												innerHTML: style,
												value: style,
												selected: style == layer.style.fontStyle
											})
										}),
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).style.fontStyle = this.value;
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
							width: '30%'
						},
						children: [
							Create('label', {
								innerHTML: 'Weight',
								children: [
									Create('select', {
										children: ['100','200','300','400','500','600','700','800'].map(weight => {
											return Create('option', {
												innerHTML: weight,
												value: weight,
												selected: weight == layer.style.fontWeight
											})
										}),
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).style.fontWeight = this.value;
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
							width: '35%'
						},
						children: [
							Create('label', {
								innerHTML: 'Color',
								children: [
									createColorPicker(layer.style.color, function (value) {
										getLayerById(GLOBAL.overlay_editor.active_layer).style.color = value;
										printCurrentCanvas();
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
							width: '40%'
						},
						children: [
							Create('label', {
								innerHTML: 'Align',
								children: [
									Create('select', {
										children: ['Left','Center','Right'].map(alignment => {
											let lower_case_align = alignment.toLowerCase();
											return Create('option', {
												innerHTML: alignment,
												value: lower_case_align,
												selected: lower_case_align == layer.style.align
											})
										}),
										onchange: function () {
											let current = getLayerById(GLOBAL.overlay_editor.active_layer);
											let current_align = current.style.align;
											if (current_align == 'left') {
												current.offset.x += this.value == 'right' ? current.dimensions.width : current.dimensions.width/2;
											} else if (current_align == 'center') {
												current.offset.x += (this.value == 'right' ? 1 : -1)*current.dimensions.width/2;
											} else if (current_align == 'right') {
												current.offset.x -= (this.value == 'left' ? current.dimensions.width : current.dimensions.width/2);
											}
											current.style.align = this.value;
											printCurrentCanvas();
											setupLayerInfoEditor();
										}
									})
								]
							})
						]
					}),
					Create('div', {
						className: 'col',
						style: {
							width: '40%'
						},
						children: [
							Create('label', {
								innerHTML: 'Spacing',
								children: [
									Create('input', {
										type: 'number',
										value: layer.style.letter_spacing,
										step: 0.1,
										onchange: function () {
											this.value = preciseAndTrim(this.value);
											getLayerById(GLOBAL.overlay_editor.active_layer).style.letter_spacing = this.value;
											printCurrentCanvas();
											setupLayerInfoEditor();
										}
									})
								]
							})
						]
					}),
					Create('div', {
						className: 'col',
						style: {
							width: '20%'
						},
						children: [
							Create('label', {
								innerHTML: 'CAPS<br />',
								children: [
									Create('input', {
										type: 'checkbox',
										checked: layer.style.caps == true,
										onchange: function () {
											getLayerById(GLOBAL.overlay_editor.active_layer).style.caps = this.checked;
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
	})
}