function createColorPicker(value, on_save) {

	let original_real_value = getRealValue(value);
	
	let instanced_id = ++GLOBAL.unique_id;

	return Create('div', {
		className: 'color_picker',
		id: 'active_color_picker_'+instanced_id,
		dataset: {
			value: original_real_value,
			path_value: value
		},
		style: {
			backgroundColor: original_real_value
		},
		onclick: () => {
			let instanced_select_id = '#active_color_picker_'+instanced_id;
			
			let color = Select(instanced_select_id).dataset.value;
			color = color.length == 9 ? color : color+'FF';
			
			// init color on a timer because some devs are lazy about script integration possibilities
			setTimeout(() => {
				var color_picker = new JSColor('#color');
				color_picker.option({
					format: 'hex',
					width: 200,
					height: 180,
					alpha: true,
					alphaChannel: true
				});
				color_picker.show();
			}, 1);
			
			createPopUp(
				'Color Picker',
				Create('div', {
					children: [
						Create('input', {
							type: 'hidden',
							name: 'instanced_select_id',
							value: instanced_select_id
						}),
						Create('span', {
							innerHTML: 'Variable Color Override',
							className: 'spanlabel',
							children: [
								createPathVariableField({
									name: 'variable_color',
									value: {
										value: isPathVariable(Select(instanced_select_id).dataset.path_value) ? Select(instanced_select_id).dataset.path_value : ''
									},
									allow_path_only: false
								})
							]
						}),
						Create('label', {
							innerHTML: 'Hex Code Color Pick',
							children: [
								Create('input', {
									type: 'text',
									id: 'color',
									name: 'color',
									value: color
								})
							]
						})
					]
				}),
				(form_data) => {
				
					// if variable input, use instead
					let use_color = '';
					let form_value = '';
					if (form_data.variable_color != '') {
						use_color = getRealValue(form_data.variable_color);
						Select(form_data.instanced_select_id).dataset.path_value = form_data.variable_color;
						form_value = form_data.variable_color;
					} else {
						use_color = form_data.color;
						Select(form_data.instanced_select_id).dataset.path_value = '';
						form_value = use_color;
					}
					
					// hide color picker
					Select('#color').jscolor.hide();

					Select(form_data.instanced_select_id).style.backgroundColor = use_color;
					Select(form_data.instanced_select_id).dataset.value = use_color;
					on_save(form_value);
					closePopup();
				}
			)
		}
	});
	
	
}