function featureGroupLayerClipPath(layer) {
	return Create('div', {
		children: [
			Create('div', {
				className: 'editor_section_block',
				children: [
					Create('div', {
						className: 'editor_section_title',
						innerHTML: 'Clipping Path Type'
					}),
					Create('select', {
						children: [
							Create('option', {
								innerHTML: '- None -',
								value: 'none',
								selected: layer.clip_path.type == 'none'
							}),
							Create('option', {
								innerHTML: 'Square',
								value: 'square',
								selected: layer.clip_path.type == 'square'
							}),
							Create('option', {
								innerHTML: 'Custom',
								value: 'custom',
								selected: layer.clip_path.type == 'custom'
							}),
						],
						onchange: function () {
							getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.type = this.value;
							Select('#square_clip_editor_section').style.display = (this.value == 'none' || this.value == 'custom' ? 'none' : 'block');
							Select('#custom_clip_editor_section').style.display = (this.value == 'custom' ? 'block' : 'none');
							Select('#clip_editor_background_color').style.display = (this.value == 'none' ? 'none' : 'block');
							printCurrentCanvas();
						}
					})
				]
			}),
			Create('div', {
				className: 'editor_section_block',
				id: 'clip_editor_background_color',
				style: {
					display: (layer.clip_path.type == 'none' ? 'none' : 'block')
				},
				children: [
					Create('div', {
						className: 'editor_section_title',
						innerHTML: 'Background and Border Color'
					}),
					Create('label', {
						innerHTML: 'Background Color',
						children: [
							createColorPicker(layer.clip_path.color || '#ffffff00', function (value) {
								getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.color = value;
								printCurrentCanvas();
							})
						]
					}),
					Create('label', {
						children: [
							Create('input', {
								type: 'checkbox',
								checked: layer.clip_path.border.use == true,
								onchange: function () {
									Select('#clip_path_border_use').style.display = this.checked ? 'block' : 'none';
									getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.border.use = this.checked;
									printCurrentCanvas();
								}
							}),
							Create('span', { innerHTML: 'Use Border' })
						]
					}),
					Create('div', {
						className: 'row',
						id: 'clip_path_border_use',
						style: {
							display: layer.clip_path.border.use ? 'block' : 'none'
						},
						children: [
							Create('div', {
								className: 'col',
								style: {
									width: '50%'
								},
								children: [
									Create('label', {
										innerHTML: 'Color',
										children: [
											createColorPicker(layer.clip_path.border.color || '#ffffff00', function (value) {
												getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.border.color = value;
												printCurrentCanvas();
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
										innerHTML: 'Width',
										children: [
											Create('input', {
												type: 'number',
												min: 1,
												value: layer.clip_path.border.width,
												onchange: function () {
													getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.border.width = this.value;
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
			}),
			Create('div', {
				className: 'editor_section_block',
				id: 'custom_clip_editor_section',
				style: {
					display: (layer.clip_path.type == 'custom' ? 'block' : 'none')
				},
				children: [
					Create('div', {
						className: 'editor_section_title',
						innerHTML: 'Custom Clip Path'
					}),
					Create('div', {
						style: {
							fontStyle: 'italic',
							fontSize: '12px'
						},
						innerHTML: 'Use right click on the image window to use the custom clip path editor tool.',
					})
				]
			}),
			Create('div', {
				className: 'editor_section_block',
				id: 'square_clip_editor_section',
				style: {
					display: (layer.clip_path.type == 'square' ? 'block' : 'none')
				},
				children: [
					Create('div', {
						className: 'editor_section_title',
						innerHTML: 'Square Clip Dimensions'
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
												value: layer.clip_path.offset.x,
												onchange: function () {
													moveGroupLayer(getLayerById(GLOBAL.overlay_editor.active_layer), {
														x: precise(this.value)
													});
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
									width: '50%'
								},
								children: [
									Create('label', {
										innerHTML: 'y',
										children: [
											Create('input', {
												type: 'number',
												value: layer.clip_path.offset.y,
												onchange: function () {
													moveGroupLayer(getLayerById(GLOBAL.overlay_editor.active_layer), {
														y: precise(this.value)
													});
													this.value = preciseAndTrim(this.value);
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
									width: '50%'
								},
								children: [
									Create('label', {
										innerHTML: 'Width',
										children: [
											Create('input', {
												type: 'number',
												value: layer.clip_path.dimensions.width,
												onchange: function () {
													getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.dimensions.width = precise(this.value);
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
									width: '50%'
								},
								children: [
									Create('label', {
										innerHTML: 'Height',
										children: [
											Create('input', {
												type: 'number',
												value: layer.clip_path.dimensions.height,
												onchange: function () {
													getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.dimensions.height = precise(this.value);
													this.value = preciseAndTrim(this.value);
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
		]
	});
}