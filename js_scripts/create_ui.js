function createUIFromData(container, data, submit_to_application, editor = false) {
	
	// save reference to current UI object for use during editing
	GLOBAL.ui.active_data = data;
	
	// save reference to container used
	GLOBAL.ui.container = container;

	// clear source changes
	clearSourceChanges();

	Select(container, {
		innerHTML: '',
		children: [
			Create('form', {
				id: 'form_capture',
				className: editor ? 'editable_ui' : '', // if rebuilding during drag and drop, still in edit mode
				data: submit_to_application,
				children: [
					Create('label', {
						innerHTML: 'edit mode ',
						className: 'edit_mode_floating_block',
						style: {
							backgroundColor: editor ? '#f5c527' : '#39b3b5'
						},
						children: [
							Create('input', {
								type: 'checkbox',
								id: 'ui_editor_toggle',
								style: {
									display: 'inline-block',
									width: 'auto',
									padding: '0px',
									margin: '0px',
									height: '14px',
								},
								checked: editor, // if rebuilding during drag and drop, still in edit mode
								onclick: function () {
									toggleUIEditor(this.checked);
									this.parentNode.style.backgroundColor = this.checked ? '#f5c527' : '#39b3b5';
								}
							})
						]
					}),
					...data.map((upper_section, section_index) => {
						return Create('div', {
							className: 'row',
							children: upper_section.cols.map((section, col_index) => {
								return Create('div', {
									innerHTML: '<h3>'+getRealValue(section.section)+'</h3>',
									data: JSON.stringify({ section: section_index, column: col_index }),
									className: 'col block',
									style: {
										width: (Math.trunc((100/upper_section.cols.length) * 100) / 100)+'%'
									},
									children: [
										Create('div', {
											className: 'ui_field_above',
											data: JSON.stringify({ section: section_index, column: col_index, field: 0 }),
											children: [
												(section.reset
													?	Create('button', {
															type: 'button',
															className: 'small_button',
															innerHTML: 'Reset',
															onclick: () => { 
																// if not edit mode
																if (Select('.editable_ui') === null) {
																	resetUISection(section); 
																}
															}
														})
													: Create('div')
												)
											]
										}),
										...section.fields.map((field, field_index) => {
											
											if (field.type == 'text' || field.type == 'number') {
												
												return Create('div', {
													className: 'ui_field',
													data: JSON.stringify({ section: section_index, column: col_index, field: field_index }),
													children: [
														Create('label', {
															innerHTML: getRealValue(field.title),
															children: [
																Create('input', {
																	type: field.type,
																	name: field.source,
																	onkeydown: function () { logSourceChange(this); },
																	value: getRealValue(field.source)
																})
															]
														})
													]
												});
												
											} else if (field.type == 'select' || field.type == 'dataset') {
												
												// edge case for handling dataset select
												let dataset_values = null;
												
												if (field.type == 'dataset') {
													
													if (typeof GLOBAL.active_project.data.sets[field.set] === 'undefined') {
														dataset_values = [
															{
																display: '!!Removed Dataset!!',
																value: ''
															}
														];
													} else {
													
														// get associated object
														let dataset = GLOBAL.active_project.data.sets[field.set].entries;
														
														// generate select list with additional "empty" option
														dataset_values = [null, ...Object.keys(dataset)].map(key => {
															return {
																display: key == null ? '-Empty-' : dataset[key].display,
																value: key == null ? '' : '$var$$pointer$1$/pointer$sets/'+field.set+'/entries/'+key+'$/var$'
															};
														});
														
													}
												} else {
													if (field.values[0].value != '') {
														field.values.unshift({
															display: '- empty -',
															value: ''
														});
													}
												}
												
												return Create('div', {
													className: 'ui_field',
													data: JSON.stringify({ section: section_index, column: col_index, field: field_index }),
													children: [
														Create('label', {
															innerHTML: getRealValue(field.title),
															children: [
																Create('select', {
																	name: field.source,
																	onchange: function () { logSourceChange(this); },
																	children: (dataset_values == null ? field.values : dataset_values).map(option => {
																		
																		// check save source value based on 1 extra depth value than its compared option value (because source itself is a reference to the stored value)
																		let depth_value = getDepthComparisonValue(field.source, 1);
																		
																		// get value of option based on depth value
																		let option_value = getDepthComparisonValue(option.value);
																		
																		return Create('option', {
																			innerHTML: getRealValue(option.display),
																			value: option_value,
																			selected: option_value == depth_value,
																			sub_setters: JSON.stringify(option.sub_setters ?? null)
																		});
																	})
																})
															]
														})
													]
												});
												
											} else if (field.type == 'radio') {
												
												return Create('div', {
													className: 'ui_field',
													data: JSON.stringify({ section: section_index, column: col_index, field: field_index }),
													children: [
														Create('div', {
															className: 'radio_group',
															children: field.values.map(radio => {
																
																// check save source value based on 1 extra depth value than its compared radio value (because source itself is a reference to the stored value)
																let depth_value = getDepthComparisonValue(field.source, 1);
																
																// get value of radio based on depth value
																let radio_value = getDepthComparisonValue(radio.value);
																
																return Create('label', {
																	children: [
																		Create('input', {
																			type: 'radio',
																			onclick: function () { logSourceChange(this); },
																			name: field.source,
																			value: radio_value,
																			checked: radio_value == depth_value,
																			sub_setters: JSON.stringify(radio.sub_setters ?? null)
																		}),
																		Create('span', {
																			innerHTML: getRealValue(radio.display)+'&nbsp;'
																		})
																	]
																});
															})
														})
													]
												});
												
											} else if (field.type == 'checkbox') {
												
												return Create('div', {
													className: 'ui_field',
													data: JSON.stringify({ section: section_index, column: col_index, field: field_index }),
													children: [
														Create('label', {
															innerHTML: getRealValue(field.title),
															children: [
																Create('br'),
																Create('input', {
																	type: field.type,
																	name: field.source,
																	onkeydown: function () { logSourceChange(this); },
																	data: getDepthComparisonValue(field.value),
																	checked: getRealValue(field.source) != ''
																}),
																Create('br')
															]
														})
													]
												});
											} else if (field.type == 'display') {
												
												return Create('div', {
													className: 'ui_field',
													data: JSON.stringify({ section: section_index, column: col_index, field: field_index }),
													children: [
														Create('label', {
															style: {
																marginBottom: '16px',
																display: 'block'
															},
															innerHTML: getRealValue(field.title)
														})
													]
												});
												
											} else if (field.type == 'button') {
												
												// unique button is set to two elements because buttons are not captured through generic form capture methods
												// same goes for stashing sub setter data, one used for logging source change with direct element access and one used on form submission, dont @me
												let unique_button_name = 'action_button_'+(++GLOBAL.unique_id);
												let button_subsetters = JSON.stringify(field.sub_setters ?? null);
												
												return Create('div', {
													className: 'ui_field',
													data: JSON.stringify({ section: section_index, column: col_index, field: field_index }),
													children: [
														Create('input', {
															type: 'hidden',
															name: unique_button_name,
															sub_setters: button_subsetters
														}),
														Create('button', {
															type: 'button',
															style: {
																marginBottom: '16px',
																display: 'block'
															},
															name: unique_button_name,
															innerHTML: getRealValue(field.title),
															onclick: function () { 
																// if not edit mode
																if (Select('.editable_ui') === null) {
																	logSourceChange(this); 
																	updateSourceChanges(); 
																}
															},
															sub_setters: button_subsetters
														})
													]
												});
												
											}
											
										})
									]
								});
							})
						});
					})
				]
			})
		]
	});
	
}

function resetUISection(section) {
	section.fields.forEach(field => {
		// action buttons contain no source
		if (!field.source) {
			return;
		}
		let elem = Select('[name="'+field.source+'"]');
		if (field.type == 'display') {
			return;
		}
		switch (field.type) {
			case 'dataset':
			case 'select':
				Array.from(elem.children).forEach(child => {
					child.selected = false;
				});
				elem.children[0].selected = true;
				break;
			case 'radio':
				elem.checked = true;
				break;
			case 'checkbox':
				elem.checked = false;
				break;
			default:
				elem.value = '';
				break;
		}
		logSourceChange(elem);
	});
}

function logSourceChange(field, is_sub_setter_call = false) {
	
	// if sub setter with empty field name, assume 3pa command call
	if (is_sub_setter_call && !field.name && field.source) {
		GLOBAL.command_list.push(field.source);
		return;
	}
	
	// check if source is logged for overlay regen
	// only log if field name set, no name for action buttons
	if (field.name && !GLOBAL.source_changes.includes(field.name)) {
		GLOBAL.source_changes.push(field.name);
	}
	
	// if not a nested sub setter call
	if (!is_sub_setter_call) {
	
		// if type select, get selected option element to check sub setters
		if (field.tagName.toLowerCase() == 'select') {
			field = field.options[field.selectedIndex];
		}

		// check if field had sub setters associated with it then nest a new log source change call on it
		if (field.sub_setters) {
			let sub_setters = JSON.parse(field.sub_setters);
			if (sub_setters) {
				sub_setters.forEach(sub_setter => {
					// re call log source change on sub setter names, flag as sub setter call
					logSourceChange({ name: sub_setter.path, source: sub_setter.source }, true);
				});
			}
		}
	
	}
}

function updateSourceChanges() {
	
	// use form style capture to easily inherit form capture methods
	let full_form = formToObj('form_capture');

	// filter form object by values logged in GLOBAL.source_changes
	let form_details = {};
	Object.keys(full_form).forEach(field_name => {
		if (GLOBAL.source_changes.includes(field_name)) {
			form_details[field_name] = full_form[field_name];
		}
	});
	
	// include non-checked boxes and set value to data value rather than boolean
	Array.from(MSelect('input[type="checkbox"]')).filter(v => v.name != '').forEach(checkbox => {
		form_details[checkbox.name] = checkbox.checked ? checkbox.data : '';
	});
	
	// discover action button form entries
	let remove_action_buttons = [];
	
	// use filtered form objects to search for potential sub setters
	Object.keys(form_details).forEach(field_name => {
		
		// get list of named elements
		let named_fields = Array.from(MSelect('[name="'+field_name+'"]'));
		
		// if select, use children instead
		if (named_fields[0].tagName.toLowerCase() == 'select') {
			named_fields = Array.from(named_fields[0].children);
		}

		// itterate named fields, find active value node and check for sub setters
		for (let i=0; i<named_fields.length; i++) {
			let field = named_fields[i];
			if (field.value == form_details[field_name] && field.sub_setters) {
				let sub_setters = JSON.parse(field.sub_setters);
				if (sub_setters) {
					// set sub setters in form details
					sub_setters.forEach(sub_setter => {
						// allow depth value setting here as well
						form_details[sub_setter.path] = getDepthComparisonValue(sub_setter.source);
					});
				}
				break;
			}
		}
		
		// log action button form names
		if (field_name.slice(0, 14) == 'action_button_') {
			remove_action_buttons.push(field_name);
		}
		
	});
	
	// remove action buttons from form details
	remove_action_buttons.forEach(action_button => {
		delete form_details[action_button];
	});
	
	// append application and uid values to send object
	form_details.application = Select('#form_capture').data;
	form_details.uid = GLOBAL.active_project.uid;
	
	// update server-side project details, then call back to same scope function to save changes locally and generate affected overlays
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {
			
			// using instanced 'form_details', update local project data
			Object.keys(form_details).forEach(path => {
				if (isPathVariable(path)) {
					setRealValue(path, form_details[path]);
				}
			});

			// generate new overlays with updated sources, once complete, reset updated sources
			// strip pointers from source changes before sending to overlay generator
			generateStreamOverlays(GLOBAL.source_changes.map(v => stripPointer(v)), () => {
				GLOBAL.source_changes = [];
				
				// execute 3pa command list, 10ms delay to allow for read buffer to complete from previous p2p data and overlay send
				setTimeout(function () { 
					executeCommandList(GLOBAL.command_list);
					GLOBAL.command_list = [];
				}, 10);
				
			});
			
			// rather than attempting to rebuild portions of UI, just reprint it
			refreshUIBuild(false);
		
		}
		
	}, 'body');
	
}

// add window listeners for drag / drop / context menu editing of ui
function toggleUIEditor(flag) {
	let form = Select('#form_capture');
	if (form) {
		if (flag) {
			form.className = 'editable_ui';
			window.addEventListener('mousedown', uiEditMouseDown);
			window.addEventListener('mousemove', uiEditMouseMove);
			window.addEventListener('mouseup', uiEditMouseUp);
			window.addEventListener('contextmenu', uiEditRightMouse);
			// on save converted to updating UI instead
			GLOBAL.navigation.on_save = updateUIChange;
		} else {
			resetDrag();
			form.className = '';
			window.removeEventListener('mousedown', uiEditMouseDown);
			window.removeEventListener('mousemove', uiEditMouseMove);
			window.removeEventListener('mouseup', uiEditMouseUp);
			window.removeEventListener('contextmenu', uiEditRightMouse);
			// return to data update on save
			GLOBAL.navigation.on_save = updateSourceChanges;
		}
	}
}

// search for upper containers from target element that are cornerstones for drag and drop actions
function getUpperContainer(elem, class_name = null) {
	if (elem == null) {
		return elem;
	} else if ((class_name == null && (elem.className == 'ui_field' || elem.className == 'col block')) || (class_name != null && elem.className == class_name)) {
		return elem;
	} else if (elem.className == 'col block' && class_name == 'ui_field') {
		return Array.from(elem.children).filter(x => x.className == 'ui_field_above').pop();
	} else if (elem.id == 'form_capture') {
		return null;
	} else {
		return getUpperContainer(elem.parentNode, class_name);
	}
}

// on mouse down, define a draggable field or section and create a shadow clone to show user is dragging
function uiEditMouseDown(event) {
	if (GLOBAL.ui.drag_elem || event.buttons == '2') {
		event.preventDefault();
		return;
	}
	let parent = getUpperContainer(event.target);
	if (parent != null) {
		event.preventDefault();
		Select('#form_capture').className = 'editable_ui_dragging';
		GLOBAL.ui.drag_elem = parent;
		parent.style.backgroundColor = '#388ff980';
		parent.style.border = '2px solid #0469e2';
		Select('#body').appendChild(Create('div', {
			id: 'drag_clone',
			style: {
				width: parent.offsetWidth+'px',
				height: parent.offsetHeight+'px',
				left: event.clientX+'px',
				top: event.clientY+'px'
			}
		}));
		GLOBAL.ui.drag_clone = Select('#drag_clone');
	}
}

// set drag and drop border styles
function uiDragSetBorder(elem, side = null) {
	if (elem == null) {
		return;
	}
	elem.style.borderLeft = '';
	elem.style.borderTop = '';
	elem.style.borderBottom = '';
	elem.style.borderRight = '';
	if (side != null) {
		elem.style['border'+String(side).charAt(0).toUpperCase() + String(side).slice(1)] = '20px solid #388ff9';
	}
}

// on drag move, highlight possible drop locations and save for use on mouse up
function uiEditMouseMove(event) {
	event.preventDefault();
	
	if (GLOBAL.ui.drag_clone) {
		
		// update drag clone coordinates
		GLOBAL.ui.drag_clone.style.left = event.clientX+'px';
		GLOBAL.ui.drag_clone.style.top = event.clientY+'px';
		
		// get relevant element being hovered over
		let hover = getUpperContainer(event.target, GLOBAL.ui.drag_elem.className);
		if (hover != null) {
			
			// get data locations of hovered and moving element
			let hover_data = JSON.parse(hover.data);
			let original_data = JSON.parse(GLOBAL.ui.drag_elem.data);
			
			// if no previous hover, log as current
			if (GLOBAL.ui.drag_hover == null) {
				GLOBAL.ui.drag_hover = hover;
			} else {
				
				// reset old hover elements borders
				uiDragSetBorder(GLOBAL.ui.drag_hover);
				
				// set new hover element
				GLOBAL.ui.drag_hover = hover;
				
			}
			
			// if hover is ui field within an empty area of section, set to bottom of hover because classification index does not change and pinpoint is at the top of the section (ui_field_above)
			if (hover.className == 'ui_field_above') {
				uiDragSetBorder(hover, 'bottom');
				GLOBAL.ui.drop_side = 'bottom';
				return;
			}
			
			if (hover_data.section != original_data.section || hover_data.column != original_data.column || hover_data.field != original_data.field) {
				let width = hover.offsetWidth;
				let height = hover.offsetHeight/2;
				let brect = hover.getBoundingClientRect();
				let left = brect.left;
				let top = brect.top;
				// only allow creating column from section drag
				if (GLOBAL.ui.drag_elem.className == 'col block' && event.clientX < left+(width*.25)) {
					uiDragSetBorder(hover, 'left');
					GLOBAL.ui.drop_side = 'left';
				} else if (GLOBAL.ui.drag_elem.className == 'col block' && event.clientX > left+(width*.75)) {
					uiDragSetBorder(hover, 'right');
					GLOBAL.ui.drop_side = 'right';
				} else if (event.clientY < (top+height)) {
					uiDragSetBorder(hover, 'top');
					GLOBAL.ui.drop_side = 'top';
				} else if (event.clientY > (top+height)) {
					uiDragSetBorder(hover, 'bottom');
					GLOBAL.ui.drop_side = 'bottom';
				}
			}
		}
	}
}

function resetDrag() {
	if (GLOBAL.ui.drag_elem != null) {
		uiDragSetBorder(GLOBAL.ui.drag_hover);
		GLOBAL.ui.drag_elem.style.backgroundColor = '';
		uiDragSetBorder(GLOBAL.ui.drag_elem);
		GLOBAL.ui.drag_elem = null;
		GLOBAL.ui.drag_clone.remove();
		GLOBAL.ui.drag_clone = null;
		GLOBAL.ui.drag_hover = null;
		GLOBAL.ui.drop_side = null;
		Select('#form_capture').className = 'editable_ui';
	}
}

function uiEditMouseUp(event) {
	event.preventDefault();

	if (GLOBAL.ui.drop_side != null) {
		let current_location = JSON.parse(GLOBAL.ui.drag_elem.data);
		let new_location = JSON.parse(GLOBAL.ui.drag_hover.data);
		let classification = (GLOBAL.ui.drag_hover.className == 'ui_field' || GLOBAL.ui.drag_hover.className == 'ui_field_above') ? 'field' : 'section';
		if (GLOBAL.ui.drop_side == 'left') {
			//new_location.column--;
		} else if (GLOBAL.ui.drop_side == 'right') {
			new_location.column++;
		} else if (GLOBAL.ui.drop_side == 'top' && classification == 'section') {
			new_location.column = null;
		} else if (GLOBAL.ui.drop_side == 'bottom') {
			new_location[classification]++;
			if (classification == 'section') {
				new_location.column = null;
			}
		}
		// if not self, save previous object and then splice into new location while removing last, if old location is further down the list, increment so the new insert increase to array size is accounted for
		if (current_location.section != new_location.section || current_location.column != new_location.column || current_location.field != new_location.field) {
			if (classification == 'field') {
				let data_insert = JSON.parse(JSON.stringify(GLOBAL.ui.active_data[current_location.section].cols[current_location.column].fields[current_location.field]));
				if (current_location.section == new_location.section && current_location.column == new_location.column && current_location.field >= new_location.field) {
					current_location.field++;
				}
				GLOBAL.ui.active_data[new_location.section].cols[new_location.column].fields.splice(new_location.field, 0, data_insert);
				GLOBAL.ui.active_data[current_location.section].cols[current_location.column].fields.splice(current_location.field, 1);
			} else {
				let data_insert = JSON.parse(JSON.stringify(GLOBAL.ui.active_data[current_location.section].cols[current_location.column]));
				if (new_location.column == null) {
					if (current_location.section >= new_location.section) {
						current_location.section++;
					}
					// moving sections rather than columns, must create new columns structure within new section
					GLOBAL.ui.active_data.splice(new_location.section, 0, { cols: [ data_insert ]});
					GLOBAL.ui.active_data[current_location.section].cols.splice(current_location.column, 1);
				} else {
					if (current_location.section == new_location.section && current_location.column >= new_location.column) {
						current_location.column++;
					}
					GLOBAL.ui.active_data[new_location.section].cols.splice(new_location.column, 0, data_insert);
					GLOBAL.ui.active_data[current_location.section].cols.splice(current_location.column, 1);
				}
				// cleanse data of any empty column sections
				for (let i=0; i<GLOBAL.ui.active_data.length; i++) {
					if (GLOBAL.ui.active_data[i].cols.length == 0) {
						GLOBAL.ui.active_data.splice(i, 1);
						i--;
					}
				}
			}
			// refresh current ui generation with new data
			refreshUIBuild();
		}
	}
	resetDrag();
}

function updateUIChange() {
	
	// capture current UI state
	let form_details = {
		data: JSON.stringify(GLOBAL.ui.active_data)
	}
	
	// append application and uid values to send object (append "_ui_edit" to application)
	form_details.application = Select('#form_capture').data+'_ui_edit';
	form_details.uid = GLOBAL.active_project.uid;
	
	// update server-side project details, then call back to same scope function to save changes locally and generate affected overlays
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		if (status) {
			// notifications soon
		}
	}, 'body');
	
}

// edit menu
function uiEditRightMouse(event) {
	event.preventDefault();
	
	// if dragging, cancel drag
	if (GLOBAL.ui.drag_elem) {
		resetDrag();
		return;
	}
	
	// get nearest editable object
	let elem = getUpperContainer(event.target);
	if (elem != null) {
		createUIEditMenu(event.clientX, event.clientY, elem);
	} else {
		// create fake section for reference use
		createUIEditMenu(event.clientX, event.clientY, Create('div', {
			className: 'only_create',
			data: JSON.stringify({ section: 0, column: 0 })
		}));
	}
	
}

function removeUIEditMenu() {
	if (Select('#ui_edit_menu')) {
		Select('#ui_edit_menu').remove();
	}
}

function createUIEditMenu(x, y, elem) {
	
	// if menu already exists, close it
	removeUIEditMenu();
	
	let menu_items = null;
	
	// if creating from select on window rather than section or field, override with minimal menu
	if (elem.className == 'only_create') {
		
		menu_items = [
			Create('div', {
				innerHTML: 'Create New Section',
				onclick: () => { editUISection(elem, true); }
			}),
			Create('div', {
				innerHTML: 'cancel',
				className: 'ui_edit_menu_cancel',
				onclick: () => { removeUIEditMenu(); }
			})
		];
		
	} else {
	
		// top menu element must be parent if field selected
		let top_element = elem.className == 'ui_field' ? elem.parentNode : elem;
	
		// top menu items
		menu_items = [
			Create('div', {
				innerHTML: 'Create New Field',
				onclick: () => { editUIField(top_element, true); }
			}),
			Create('div', {
				innerHTML: 'Create New Section',
				onclick: () => { editUISection(top_element, true); }
			}),
			Create('div', {
				innerHTML: 'Edit Section',
				onclick: () => { editUISection(top_element); }
			}),
			Create('div', {
				innerHTML: 'Remove Section',
				className: 'ui_edit_menu_remove',
				onclick: () => { removeUISection(top_element); }
			}),
			Create('div', {
				innerHTML: 'cancel',
				className: 'ui_edit_menu_cancel',
				onclick: () => { removeUIEditMenu(); }
			})
		];
		
		// if menu element was a field, also allow field edit
		if (elem.className == 'ui_field') {
			
			// get label title
			let label_title = elem.children[0];
			if (label_title.tagName == 'LABEL') {
				label_title = label_title.childNodes[0].textContent;
			} else {
				label_title = elem.children[1].textContent;
			}
			// limit label title length
			label_title = label_title.length > 20 ? label_title.slice(0,17)+'...' : label_title;
			
			menu_items.unshift(...[
				Create('div', {
					className: 'ui_edit_menu_title',
					innerHTML: label_title
				}),
				Create('div', {
					innerHTML: 'Edit Field',
					onclick: () => { editUIField(elem); }
				}),
				Create('div', {
					innerHTML: 'Remove Field',
					onclick: () => { removeUIField(elem); },
					className: 'ui_edit_menu_remove'
				}),
				Create('div', {
					className: 'ui_edit_menu_title',
					innerHTML: ''
				})
			]);
		}

	}

	// create edit menu
	Select('#body', {
		children: [
			Create('div', {
				className: 'ui_edit_menu',
				id: 'ui_edit_menu',
				style: {
					left: x,
					top: y,
					transform: 'translate('+(x < (screen.width/2) ? '0' : '-100%')+', '+(y > (screen.height/2) ? '-100%' : '0')+')'
				},
				children: menu_items
			})
		]
	});
	
}

function removeUIField(elem) {
	// remove UI field from data and document
	let current_location = JSON.parse(elem.data);
	GLOBAL.ui.active_data[current_location.section].cols[current_location.column].fields.splice(current_location.field, 1);
	elem.remove();
	removeUIEditMenu();
}

function editUISection(elem, is_create = false) {
	
	removeUIEditMenu();
	
	// locate and grab section data (if is create, dont use data as new data will be pushed as an adjacent column section)
	let current_location = JSON.parse(elem.data);
	let current_data = is_create ? null : GLOBAL.ui.active_data[current_location.section].cols[current_location.column];
	
	createPopUp(
		(is_create ? 'Create New Section' : 'Edit Section'),
		Create('div', {
			children: [
				Create('input', {
					type: 'hidden',
					name: 'is_create',
					value: is_create ? 'true' : 'false'
				}),
				Create('input', {
					type: 'hidden',
					name: 'current_location',
					value: elem.data
				}),
				Create('span', {
					innerHTML: 'Section Title',
					className: 'spanlabel',
					children: [
						createPathVariableField({
							name: 'section_title',
							value: {
								value: is_create ? '' : current_data.section
							},
							allow_path_only: false
						})
					]
				}),
				Create('label', {
					innerHTML: 'Contains Reset Button<br />',
					children: [
						Create('input', {
							type: 'checkbox',
							name: 'section_has_reset',
							checked: is_create ? false : current_data.reset
						})
					]
				})
			]
		}),
		function (form_data) {
			// set new section data or create a new section adjacent to the one created from
			let current_location = JSON.parse(form_data.current_location);
			if (form_data.is_create == 'true') {
				let new_section = {
					section: form_data.section_title,
					reset: form_data.section_has_reset ? true : false,
					fields: []
				};
				// if UI is empty, push new rather than splice
				if (GLOBAL.ui.active_data.length == 0) {
					GLOBAL.ui.active_data.push({
						cols: [new_section]
					});
				} else {
					GLOBAL.ui.active_data[current_location.section].cols.splice(current_location.column, 0, new_section);
				}
			} else {
				let current_data = GLOBAL.ui.active_data[current_location.section].cols[current_location.column];
				current_data.section = form_data.section_title;
				current_data.reset = form_data.section_has_reset ? true : false;
			}
			// refresh current ui generation with new data
			refreshUIBuild();
			// close popup
			closePopup();
		}
	);
}

function refreshUIBuild(is_editor = true) {
	createUIFromData(GLOBAL.ui.container, GLOBAL.ui.active_data, Select('#form_capture').data, is_editor);
}

function removeUISection(elem) {
	// remove UI section from data and document
	let current_location = JSON.parse(elem.data);
	GLOBAL.ui.active_data[current_location.section].cols.splice(current_location.column, 1);
	elem.remove();
	removeUIEditMenu();
	refreshUIBuild();
}

function editUIField(elem, is_create = false) {
	
	removeUIEditMenu();
	
	// locate and grab field data (if is create, dont use data as new data will be pushed as a child to the current section)
	let current_location = JSON.parse(elem.data);
	let current_data = !is_create ? GLOBAL.ui.active_data[current_location.section].cols[current_location.column].fields[current_location.field] : null;
	
	createPopUp(
		(is_create ? 'Create New Field' : 'Edit Field'),
		Create('div', {
			children: [
				Create('input', {
					type: 'hidden',
					name: 'is_create',
					value: is_create ? 'true' : 'false'
				}),
				Create('input', {
					type: 'hidden',
					name: 'current_location',
					value: elem.data
				}),
				Create('label', {
					innerHTML: 'Input Type',
					children: [
						Create('select', {
							name: 'input_type',
							onchange: function () {
								modifyFieldBuilderOptions(this.value.toLowerCase());
							},
							children: ['Text', 'Select', 'Radio', 'Checkbox', 'Dataset', 'Display', 'Button'].map(input_type => {
								return Create('option', {
									innerHTML: input_type,
									value: input_type.toLowerCase(),
									selected: (is_create ? false : current_data.type == input_type.toLowerCase())
								});
							})
						})
					]
				}),
				Create('span', {
					innerHTML: 'Save To Path',
					className: 'spanlabel',
					id: 'save_to_path_input',
					children: [
						createPathVariableField({
							name: 'source_path',
							value: {
								value: is_create ? '' : current_data.source ?? ''
							},
							force_path_only: true
						})
					]
				}),
				Create('span', {
					innerHTML: 'Input Label',
					className: 'spanlabel',
					children: [
						createPathVariableField({
							name: 'input_label',
							value: {
								value: is_create ? '' : current_data.title
							},
							allow_html_input: true,
							allow_path_only: false
						})
					]
				}),
				Create('div', {
					id: 'input_edit_options'
				})
			]
		}),
		function (form_data) {
			
			// if source path exists (display field it will not) and the path is empty, return error
			if (form_data.source_path && form_data.source_path == '') {
				console.error('Save To Path cannot be empty!');
				return;
			}
			
			let new_field_data = null;
			if (form_data.input_type == 'text') {
				new_field_data = {
					type: 'text',
					title: form_data.input_label,
					source: form_data.source_path
				}
			} else if (form_data.input_type == 'checkbox') {
				new_field_data = {
					type: 'checkbox',
					title: form_data.input_label,
					source: form_data.source_path,
					value: form_data.checked_value_output
				}
			} else if (form_data.input_type == 'radio' || form_data.input_type == 'select') {
				new_field_data = {
					type: form_data.input_type,
					title: form_data.input_label,
					source: form_data.source_path,
					values: form_data['pair_value_display[]'].map((display, index) => {
						let key_value = {
							display: display,
							value: form_data['pair_value_value[]'][index]
						};
						// set sub setters
						let sub_setter_id = form_data['stash_pair_sub_setter_id_ref[]'][index];
						if (form_data['sub_pair_value_display_'+sub_setter_id+'[]']) {
							let sub_setters = [];
							form_data['sub_pair_value_display_'+sub_setter_id+'[]'].forEach((source, sub_index) => {
								sub_setters.push({
									path: source,
									source: form_data['sub_pair_value_value_'+sub_setter_id+'[]'][sub_index]
								});
							});
							key_value.sub_setters = sub_setters;
						}
						return key_value;
					})
				}
			} else if (form_data.input_type == 'dataset') {
				new_field_data = {
					type: 'dataset',
					title: form_data.input_label,
					source: form_data.source_path,
					set: form_data.input_dataset
				}
			} else if (form_data.input_type == 'display') {
				new_field_data = {
					type: 'display',
					title: form_data.input_label
				}
			} else if (form_data.input_type == 'button') {
				let sub_setter_id = form_data['stash_pair_sub_setter_id_ref'];
				new_field_data = {
					type: form_data.input_type,
					title: form_data.input_label,
					sub_setters: form_data['sub_pair_value_display_'+sub_setter_id+'[]'].map((source, sub_index) => {
						return {
							path: source,
							source: form_data['sub_pair_value_value_'+sub_setter_id+'[]'][sub_index]
						};
					})
				}
			}
			
			// set new field data or create a new field as the first child of the container section
			let current_location = JSON.parse(form_data.current_location);
			if (form_data.is_create == 'true') {
				GLOBAL.ui.active_data[current_location.section].cols[current_location.column].fields.unshift(new_field_data);
			} else {
				GLOBAL.ui.active_data[current_location.section].cols[current_location.column].fields[current_location.field] = new_field_data;
			}
			// refresh current ui generation with new data
			refreshUIBuild();
			// close popup
			closePopup();
		}
	);
	
	// init input options
	modifyFieldBuilderOptions(is_create ? 'text' : current_data.type);
}

function modifyFieldBuilderOptions(type) {
	let is_create = Select('[name="is_create"]').value == "true";
	let data = is_create ? null : true;
	
	// if initial edit data available and of the same type, prepare for import along with builder options
	if (data != null) {
		let current_location = JSON.parse(Select('[name="current_location"]').value);
		let current_data = GLOBAL.ui.active_data[current_location.section].cols[current_location.column].fields[current_location.field];
		if (current_data.type == type) {
			data = current_data;
		} else {
			data = null;
		}
	}
	
	// show source path, hidden only for action button
	Select('#save_to_path_input').style.display = 'block';
	
	if (type == 'text') {
		fieldBuilderForText();
	} else if (type == 'checkbox') {
		fieldBuilderForCheckbox(data);
	} else if (type == 'radio') {
		fieldBuilderForRadio(data);
	} else if (type == 'select') {
		fieldBuilderForSelect(data);
	} else if (type == 'dataset') {
		fieldBuilderForDataset(data);
	} else if (type == 'display') {
		fieldBuilderForDisplay(data);
	} else if (type == 'button') {
		Select('#save_to_path_input').style.display = 'none';
		fieldBuilderForButton(data);
	}
}

function fieldBuilderForText() {
	Select('#input_edit_options', {
		innerHTML: ''
	});
}

function fieldBuilderForCheckbox(data) {
	// value to set into source when box is checked
	Select('#input_edit_options', {
		innerHTML: '',
		children: [
			Create('span', {
				innerHTML: 'On Checked Value',
				className: 'spanlabel',
				children: [
					createPathVariableField({
						name: 'checked_value_output',
						value: {
							value: data == null ? '' : data.value,
						},
						allow_depth_value: true,
						allow_path_only: true
					})
				]
			})
		]
	});
}

function fieldBuilderForRadio(data) {
	
	let key_value = data == null ? [{ display: '', value: '' }] : data.values;
	
	Select('#input_edit_options', {
		innerHTML: '',
		children: [
			Create('div', {
				id: 'key_value_inputs',
				innerHTML: '<h4>Radio Values</h4>'
			}),
			Create('div', {
				style: {
					textAlign: 'right'
				},
				children: [
					Create('button', {
						type: 'button',
						style: {
							marginTop: '10px'
						},
						className: 'small_button_green',
						innerHTML: 'Create New Value Set',
						onclick: function () {
							appendNewKeyValuePairInput({ display: '', value: '' });
						}
					})
				]
			})
		]
	});
	
	key_value.forEach(pair => {
		appendNewKeyValuePairInput(pair);
	});
}

function fieldBuilderForSelect(data) {
	let key_value = data == null ? [{ display: '', value: '' }] : data.values;
	
	Select('#input_edit_options', {
		innerHTML: '',
		children: [
			Create('div', {
				id: 'key_value_inputs',
				innerHTML: '<h4>Select Values</h4>'
			}),
			Create('div', {
				style: {
					textAlign: 'right'
				},
				children: [
					Create('button', {
						type: 'button',
						style: {
							marginTop: '10px'
						},
						className: 'small_button_green',
						innerHTML: 'Create New Value Set',
						onclick: function () {
							appendNewKeyValuePairInput({ display: '', value: '' });
						}
					})
				]
			})
		]
	});
	
	key_value.forEach(pair => {
		appendNewKeyValuePairInput(pair);
	});
}

function fieldBuilderForDataset(data) {
	Select('#input_edit_options', {
		innerHTML: '',
		children: [
			Create('label', {
				innerHTML: 'Data Set',
				children: [
					Create('select', {
						name: 'input_dataset',
						children: Object.keys(GLOBAL.active_project.data.sets).map(set => {
							return Create('option', {
								innerHTML: set,
								value: set,
								selected: (data != null && data.set == set)
							});
						})
					})
				]
			})
		]
	});
}

function fieldBuilderForDisplay(data) {
	Select('#save_to_path_input').remove();
	Select('#input_edit_options', {
		innerHTML: ''
	});
}

function fieldBuilderForButton(data) {
	let sub_setter_key_value = data == null ? [{ path: '', source: '' }] : data.sub_setters;
	
	GLOBAL.unique_id++
	let sub_setter_parent_id = GLOBAL.unique_id;
	
	Select('#input_edit_options', {
		innerHTML: '',
		children: [
			Create('div', {
				id: 'key_value_inputs',
				innerHTML: '<h4>Action Button Setters</h4>'
			}),
			Create('input', {
				type: 'hidden',
				name: 'stash_pair_sub_setter_id_ref',
				value: sub_setter_parent_id
			}),
			Create('div', {
				style: {
					textAlign: 'right'
				},
				children: [
					Create('div', {
						className: 'create_data_key',
						innerHTML: '+ create sub setter',
						data: sub_setter_parent_id,
						onclick: function () {
							Select('#sub_setter_pairs_'+this.data).appendChild(createNewSubSetterField({ path: '', source: ''}, this.data));
						}
					})
				]
			}),	
			Create('div', {
				id: 'sub_setter_pairs_'+sub_setter_parent_id,
				children: (sub_setter_key_value).map(sub_key_value => {
					return createNewSubSetterField(sub_key_value, sub_setter_parent_id);
				})
			})
		]
	});

}

function appendNewKeyValuePairInput(key_value) {
	
	GLOBAL.unique_id++;
	let sub_setter_parent_id = GLOBAL.unique_id;
	
	Select('#key_value_inputs').appendChild(
		Create('div', {
			className: 'key_value_input_pair',
			children: [
				Create('input', {
					type: 'hidden',
					name: 'stash_pair_sub_setter_id_ref[]',
					value: sub_setter_parent_id
				}),
				Create('div', {
					className: 'remove_data_key',
					innerHTML: '&times',
					style: {
						float: 'right'
					},
					onclick: function () {
						this.parentNode.remove();
					}
				}),
				Create('span', {
					innerHTML: 'Display',
					className: 'spanlabel',
					children: [
						createPathVariableField({
							name: 'pair_value_display[]',
							value: {
								value: key_value.display
							},
							allow_path_only: false
						})
					]
				}),
				Create('span', {
					innerHTML: 'Value',
					className: 'spanlabel',
					children: [
						createPathVariableField({
							name: 'pair_value_value[]',
							value: {
								value: key_value.value
							},
							allow_path_only: true
						})
					]
				}),
				Create('div', {
					style: {
						textAlign: 'right'
					},
					children: [
						Create('div', {
							className: 'create_data_key',
							innerHTML: '+ create sub setter',
							data: sub_setter_parent_id,
							onclick: function () {
								Select('#sub_setter_pairs_'+this.data).appendChild(createNewSubSetterField({ path: '', source: ''}, this.data));
							}
						})
					]
				}),	
				Create('div', {
					id: 'sub_setter_pairs_'+sub_setter_parent_id,
					children: (typeof key_value.sub_setters === 'undefined' ? [] : key_value.sub_setters).map(sub_key_value => {
						return createNewSubSetterField(sub_key_value, sub_setter_parent_id);
					})
				})
			]
		})
	);
}

function createNewSubSetterField(key_value, id) {
	return Create('div', {
		className: 'key_value_input_pair',
		children: [
			Create('div', {
				className: 'remove_data_key',
				innerHTML: '&times',
				style: {
					float: 'right'
				},
				onclick: function () {
					this.parentNode.remove();
				}
			}),
			Create('span', {
				innerHTML: '[Sub Setter] Save To Path',
				className: 'spanlabel',
				children: [
					createPathVariableField({
						name: 'sub_pair_value_display_'+id+'[]',
						value: {
							value: key_value.path
						},
						force_path_only: true
					})
				]
			}),
			Create('span', {
				innerHTML: '[Sub Setter] Value',
				className: 'spanlabel',
				children: [
					createPathVariableField({
						name: 'sub_pair_value_value_'+id+'[]',
						value: {
							value: key_value.source
						},
						allow_depth_value: true,
						allow_path_only: true
					})
				]
			})
		]
	});
}

function closePopup() {
	if (Select('#popup')) {
		// enabled editor
		toggleUIEditor(true);
		
		Select('#popup').remove();
	}
}

function createPopUp(title, content, on_save) {
	// disable editor while popup is active
	toggleUIEditor(false);
	
	Select('#body').appendChild(Create('div', {
		id: 'popup',
		children: [
			Create('div', {
				className: 'popup_inner',
				children: [
					Create('div', {
						className: 'popup_title_bar',
						children: [
							Create('div', {
								className: 'popup_title',
								innerHTML: title
							}),
							Create('div', {
								className: 'popup_close',
								innerHTML: '&times;',
								onclick: function () {
									closePopup();
								}
							}),
							Create('br', { style: { clear: 'both' }})
						]
					}),
					Create('form', {
						id: 'popup_form_data',
						onsubmit: function () {
							return false;
						},
						children: [
							content
						]
					}),
					Create('div', {
						className: 'popup_save_bar',
						children: [
							Create('button', {
								type: 'button',
								innerHTML: 'Save',
								id: 'popup_save_action',
								onclick: () => {
									on_save(formToObj('popup_form_data'))
								}
							})
						]
					})
				]
			})
		]
	}));
}