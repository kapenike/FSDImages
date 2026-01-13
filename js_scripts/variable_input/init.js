/*
	!!Important!!
	pointer / depth value selection will by default be used on setters although only used for getters. this keeps logic simple
	a method within data_pathing.js->setRealValue strips this value
	:explanation: when getting a value to be set, a pointer depth determines what value in the chain to set, the setter value when saved and then requested will result in the full path end result, thus pointer depth is useless
*/
function createPathVariableField(settings = {}) {

	// ensure defaults exists
	if (typeof settings.name === 'undefined') {
		// no run without a name
		return false;
	}
	
	// increment global unique naming id
	GLOBAL.unique_id++;
	
	// allow path only
	if (typeof settings.allow_path_only === 'undefined') {
		settings.allow_path_only = true;
	}
	
	// init a data structure if none given
	if (typeof settings.value === 'undefined') {
		settings.value = {
			path_only: false,
			value: ''
		};
	}
	
	// init placeholder for if path only logic
	settings.value.path_only = false;
	
	// force path only input, if true it by default sets value to path only
	if (typeof settings.force_path_only === 'undefined') {
		settings.force_path_only = false;
	} else if (settings.force_path_only) {
		settings.allow_path_only = false;
		settings.value.path_only = true;
	}
	
	// default allow depth value
	if (typeof settings.allow_depth_value === 'undefined') {
		settings.allow_depth_value = false;
	}
	
	// default on edit value
	if (typeof settings.on_edit === 'undefined') {
		settings.on_edit = function(){};
	}
	
	// default allow html input value
	if (typeof settings.allow_html_input === 'undefined') {
		settings.allow_html_input = false;
	}
	
	// base path of variable input directory tree
	if (typeof settings.base_path === 'undefined') {
		settings.base_path = '';
	}
	
	// determine if value contains pointer to init with path only
	if (isPointer(settings.value.value)) {
		settings.value.path_only = true;
	}
	
	// default value is content editable
	let is_content_editable = !settings.force_path_only && !settings.value.path_only;
	
	return Create('div', {
		className: 'variable_set_input',
		children: [
			Create('div', {
				children: [
					Create('input', {
						type: 'hidden',
						id: 'variable_input_'+GLOBAL.unique_id,
						name: settings.name,
						value: settings.value.value,
						onedit: settings.on_edit,
						data: {
							image_search: settings.value.image_search,
							path_only: settings.value.path_only,
							html_input: settings.allow_html_input,
							base_path: settings.base_path,
							source_setter: settings.force_path_only && typeof settings.override_source_setter === 'undefined'
						}
					}),
					Create('div', { // variable input clear field button
						className: 'variable_input_clear',
						innerHTML: '&times;',
						uid: GLOBAL.unique_id,
						onclick: function () {
							clearVariableInput(this.uid);
						}
					}),
					Create('div', { // primary field for UI entry of text and variables
						id: 'var_set_input_'+GLOBAL.unique_id,
						uid: GLOBAL.unique_id,
						className: 'variable_set_input_field has_path_insert',
						contentEditable: is_content_editable,
						caretManagement: function () {
							manageVariableInputCaretPosition(this.uid, this)
						},
						onclick: function () {
							// if not content editable, this is a force path only or path only field, open path editor onclick
							if (this.contentEditable == 'false') {
								openPathEditor(this.uid);
							}
							// manage caret position
							this.caretManagement();
						},
						onkeyup: function () {
							// manage caret position
							this.caretManagement();
						},
						oninput: function () {
							// on input, update main input value with text formatted equivalent and call the onedit() attached function
							Select('#variable_input_'+this.uid, { value: getFormValueOfPathSelection(this.uid, this.innerHTML) });
							Select('#variable_input_'+this.uid).onedit();
						},
						children: getPathSelectionValueFromFormValue(settings.value.value) // convert saved text value to HTML interpretation
					}),
					Create('div', { // open / close path editor button
						id: 'path_insert_button_'+GLOBAL.unique_id,
						uid: GLOBAL.unique_id,
						className: 'path_insert_button'+(settings.value.path_only ? ' path_insert_button_is_reference_path' : ''),
						innerHTML: '&#8594;',
						onclick: function () {
							openPathEditor(this.uid);
						}
					})
				]
			}),
			Create('br', { style: { clear: 'both' }}),
			Create('div', { // Reference Path toggle checkbox
				className: 'path_var_container'+(settings.force_path_only == true ? ' forcing_path_indicator' : ''),
				children: [
					(settings.allow_path_only || settings.value.image_search
						?	Create('div', {
								className: 'variable_input_action_item',
								id: 'quick_upload_image_action_item_'+GLOBAL.unique_id,
								style: {
									display: settings.value.image_search || (settings.allow_path_only && settings.value.path_only) ? 'block' : 'none'
								},
								innerHTML: '&#128247;',
								var_input_uid: GLOBAL.unique_id,
								onclick: function () {
									createPopUp(
										'Quick Upload New Asset',
										Create('div', { id: 'popup_create_asset', var_input_uid: this.var_input_uid }),
										() => {
											// submit form to upload asset
											updateAssetData(true);
										}
									);
									// setup asset editor within popup window
									setupAssetEditor(null, '#popup_create_asset');
								}
							})
						: Create('span')
					),
					(settings.allow_path_only == true
						? Create('label', {
								innerHTML: 'Ref. Path ',
								children: [
									Create('input', {
										type: 'checkbox',
										uid: GLOBAL.unique_id,
										checked: !is_content_editable,
										onchange: function () {
											
											let input_field = Select('#var_set_input_'+this.uid);
											let is_now_content_editable = !this.checked;
											input_field.contentEditable = is_now_content_editable;
											
											// show quick image upload when NOT content editable (becomes reference path variable)
											Select('#quick_upload_image_action_item_'+this.uid).style.display = !is_now_content_editable ? 'block' : 'none';
											
											// if depth value editing was allowed, switch because of reference path change
											if (Select('#depth_value_'+this.uid)) {
												
												// empty depth value list
												Select('#depth_value_'+this.uid, {
													innerHTML: '',
													children: [
														Create('option', {
															innerHTML: '',
															value: ''
														})
													]
												});
												
												// toggle its display
												Select('#depth_value_'+this.uid).style.display = is_now_content_editable ? 'none' : 'inline-block';
											}
											
											// clear input field
											clearVariableInput(this.uid);

											// toggle path only and re-style path insert button
											if (!is_now_content_editable) {

												Select('#variable_input_'+this.uid).data.path_only = true;
												Select('#path_insert_button_'+this.uid).className = 'path_insert_button path_insert_button_is_reference_path';
												
											} else {

												Select('#variable_input_'+this.uid).data.path_only = false;
												Select('#path_insert_button_'+this.uid).className = 'path_insert_button';
												input_field.focus();
												
											}

										}
									}),
									(settings.allow_depth_value
										? Create('select', { // when depth value selection is enabled, offer drop down for path chain selection
												id: 'depth_value_'+GLOBAL.unique_id,
												uid: GLOBAL.unique_id,
												className: 'variable_input_path_only_depth_value',
												style: {
													display: is_content_editable ? 'none' : 'inline-block',
												},
												onchange: function () {
													updateDepthValue(this.value, this.uid);
												},
												children: generateDepthValueList(settings.value.value)
											})
										: Create('div')
									)
								]
							})
						: Create('span')
					)
				]
			})
		]
	});
}