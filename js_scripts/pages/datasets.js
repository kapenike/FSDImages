function setNavigationDatasets() {

	Select('#main', {
		innerHTML: '',
		children: [
			Create('div', {
				className: 'block',
				style: {
					height: '100%'
				},
				children: [
					Create('div', {
						className: 'row',
						children: [
							Create('div', {
								className: 'col',
								style: {
									width: '30%',
									height: '100%'
								},
								children: [
									Create('div', {
										className: 'row',
										children: [
											Create('div', {
												className: 'col',
												style: {
													width: '50%'
												},
												children: [
													Create('h3', {
														innerHTML: 'Data Set Management'
													})
												]
											}),
											Create('div', {
												className: 'col',
												style: {
													width: '50%',
													textAlign: 'right'
												},
												children: [
													Create('button', {
														innerHTML: 'Create Data Set',
														onclick: () => { setupDatasetEditor(); },
														style: {
															position: 'relative',
															top: '10px'
														}
													})
												]
											})
										]
									}),
									Create('input', {
										type: 'text',
										placeholder: 'Search...',
										onkeyup: function () {
											searchPageItemList(this.value);
										}
									}),
									Create('div', {
										id: 'dataset_list',
										style: {
											height: 'calc(100% - 150px)',
											overflowY: 'scroll'
										}
									})
								]
							}),
							Create('div', {
								className: 'col',
								id: 'dataset_management_form_block',
								style: {
									width: '70%',
									height: '100%',
									overflowY: 'scroll'
								}
							})
						]
					})
				]
			})
		]
	});
	
	// setup dataset editor, default to create
	setupDatasetEditor(null);
	
	// setup dataset selection list
	generateDatasetSelectionList();
		
}

function updateDataset() {
	
	// use form style capture to easily inherit form capture methods
	let form_details = formToObj('dataset_creation_form');
	
	// append application
	form_details.application = 'update_create_dataset';
	
	// append project uid
	form_details.project_uid = GLOBAL.active_project.uid;
	
	// update server-side dataset details, then call back to same scope function to save changes locally
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {
			
			// remove original reference if display changes
			if (Select('[name="dataset_title"]').data != data.msg.display) {
				delete GLOBAL.active_project.data.sets[Select('[name="dataset_title"]').data];
			}
			
			// update / insert new dataset locally
			GLOBAL.active_project.data.sets[data.msg.display] = data.msg;
			
			// load dataset into form
			loadDataset(data.msg);
			
			// re-create dataset selection list
			generateDatasetSelectionList();
			
			// detect dependent source changes and push to generateStreamOverlays for API and overlay updates
			generateStreamOverlays(dependentDatasetSourceChanges('sets/'+form_details.dataset_title));
			
		}
		
	}, 'body');
}

function removeDataset(uid) {
	
	let form_details = {
		project_uid: GLOBAL.active_project.uid,
		uid: uid,
		application: 'remove_dataset'
	};
	
	// remove dataset server side
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {
			
			// delete local dataset
			delete GLOBAL.active_project.data.sets[data.display];
			
			// bring up create dataset form
			loadDataset();
			
			// re-create dataset selection list
			generateDatasetSelectionList();
			
		}
		
	}, 'dataset_management_form_block');
}

function loadDataset(dataset = null) {
	setupDatasetEditor(dataset);
}

function setupDatasetEditor(data = null) {
	
	let create = false;
	if (data == null) {
		create = true;
		data = {
			display: '',
			structure: [
				'display'
			],
			entries: []
		};
	}
	
	Select('#dataset_management_form_block', {
		innerHTML: '',
		children: [
			Create('h3', {
				innerHTML: (create == true ? 'Create New Data Set' : 'Update Data Set')
			}),
			Create('form', {
				id: 'dataset_creation_form',
				children: [
					Create('input', {
						type: 'hidden',
						name: 'dataset_manager_type',
						value: create == true ? 'create' : data.uid
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
									Create('div', {
										id: 'structure_list',
										children: [
											Create('h3', {
												style: {
													marginTop: '0'
												},
												innerHTML: 'Data Set Title'
											}),
											Create('input', {
												type: 'text',
												data: data.display,
												name: 'dataset_title',
												value: data.display,
												onkeyup: function () {
													preventDuplicate('dataset_title', this);
												}
											}),
											Create('h3', {
												innerHTML: 'Structure'
											}),
											...data.structure.map((key, index) => {
												return newStructureKey(key, index);
											}),
											Create('div', {
												className: 'create_data_key',
												innerHTML: '+ New Structure Key',
												onclick: function () {
													this.insertAdjacentElement('beforebegin', newStructureKey());
												}
											})
										]
									}),
									(create != true
										?	Create('div', {
												children: [
													Create('br'),
													Create('button', {
														className: 'remove_button small_btn',
														innerHTML: 'Remove Data Set',
														type: 'button',
														onclick: () => { 
															notify(
																'Please confirm you\'d like to permanently remove this data set',
																() => { removeDataset(data.uid); }
															);
														}
													})
												]
											})
										: Create('div')
									)
								]
							}),
							Create('div', {
								className: 'col',
								style: {
									width: '60%'
								},
								children: [
									Create('div', {
										id: 'dataset_values',
										children: [
											Create('div', {
												className: 'dataset_entry',
												children: [
													Create('h3', {
														innerHTML: 'Entries'
													}),
													Create('div', {
														className: 'create_data_key',
														innerHTML: '+ create new entry',
														onclick: function () {
															this.parentNode.insertAdjacentElement('afterend', newDatasetEntry());
														}
													}),
													( create != true
														? Create('div', {
															style: {
																display: 'inline-block'
															},
															children: [
																Create('div', {
																	className: 'create_data_key',
																	innerHTML: 'sort entries',
																	style: {
																		marginLeft: '10px',
																		backgroundColor: '#f5c527'
																	},
																	onclick: function () {
																		ajax('POST', '/requestor.php', {
																			project_uid: GLOBAL.active_project.uid,
																			application: 'sort_dataset',
																			uid: data.uid
																		}, (status, data) => {
																			if (data.status) {
																				let sets = GLOBAL.active_project.data.sets;
																				let ref = sets[Object.keys(sets).filter(v => sets[v].uid == data.uid)[0]];
																				let new_entries = {};
																				let old_entries = [];
																				for (let [key, value] of Object.entries(ref.entries)) {
																					value.uid = key;
																					old_entries.push(value);
																				}
																				old_entries.sort((a,b) => {
																					if (a.display < b.display) {
																						return -1;
																					} else if (a.display > b.display) {
																						return 1;
																					} else {
																						return 0;
																					}
																				});
																				old_entries.forEach(v => {
																					let uid = v.uid;
																					delete v.uid;
																					new_entries[uid] = v;
																				});
																				ref.entries = new_entries;
																				loadDataset(ref);
																			}
																		});
																	}
																}),
																Create('div', {
																	className: 'create_data_key',
																	innerHTML: 'collapse all',
																	style: {
																		marginLeft: '10px'
																	},
																	onclick: function () {
																		collapseAll(true);
																	}
																}),
																Create('div', {
																	className: 'create_data_key',
																	innerHTML: 'expand all',
																	style: {
																		marginLeft: '10px'
																	},
																	onclick: function () {
																		collapseAll(false);
																	}
																})
															]
														})
														: Create('div')
													)
												]
											}),
											...Object.keys(data.entries).map(uid => {
												return newDatasetEntry(uid, data.entries[uid], data.structure);
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

function collapseAll(is) {
	Array.from(MSelect('.dataset_entry_title')).forEach(pelem => {
		let elem = pelem.parentNode.children[2];
		if (is) {
			elem.style.height = '0px';
			elem.style.overflow = 'hidden';
		} else {
			elem.removeAttribute('style');
		}
	});
}

function preventDuplicate(type, input) {
	let inc = 0;
	if (type == 'dataset_title') {
		let original_display = input.data;
		let running_value = input.value;
		while (Object.keys(GLOBAL.active_project.data.sets).filter(key => 
			(GLOBAL.active_project.data.sets[key].display == running_value && GLOBAL.active_project.data.sets[key].display != original_display)).length > 0
			) {
			inc++;
			running_value = input.value + '_' + inc;
		}
		input.value = running_value;
	} else if (type == 'dataset_structure_key') {
		// holy shit im so tired no one look at this method
		let running_value = input.value;
		let lazy = 1;
		while (Array.from(MSelect('.dataset_structure_keys')).filter(v => v.value == running_value).length > lazy) {
			inc++;
			running_value = input.value + '_' + inc;
			if (lazy == 1) {
				lazy = 0;
			}
		}
		input.value = running_value;
	}
}

function newStructureKey(key = null, index = 1) {
	
	if (key == null) {
		// insert new path variable field for new key block
		Array.from(MSelect('.dataset_entry_content')).forEach(content => {
			content.appendChild(
				Create('span', {
					className: 'spanlabel',
					innerHTML: 'untitled',
					children: [
						createPathVariableField({
							name: 'dataset_value_untitled[]',
							value: {
								value: ''
							},
							allow_path_only: true
						})
					]
				})
			);
		});
	}

	return Create('div', {
		className: 'row',
		children: [
			Create('div', {
				className: 'col',
				style: {
					width: '86%'
				},
				children: [
					Create('input', {
						type: 'text',
						className: 'dataset_structure_keys',
						name: 'structure[]',
						value: key == null ? '' : key,
						readOnly: key == 'display',
						updateListFields: function () {
							
							// get position of key in structure, then itterate all content and replace key data within that content sub data index
							let position = Array.from(MSelect('.dataset_structure_keys')).reduce((a,c,i) => {
								return c.value == this.value ? i : a
							}, -1);
							let assoc_content = MSelect('.dataset_entry_content');
							if (assoc_content) {
								Array.from(assoc_content).forEach(block => {
									// pos set to one to skip ignored display key 
									let pos = 1;
									Array.from(block.children).forEach(input => {
										if (input.className == 'spanlabel') {
											if (pos == position) {
												let pointer_to_data = input.children[0].children[0].children[0];
												Create(input, {
													innerHTML: this.value,
													children: [
														createPathVariableField({
															name: 'dataset_value_'+this.value+'[]',
															value: {
																path_only: pointer_to_data.data.path_only,
																value: pointer_to_data.value
															},
															allow_path_only: true
														})
													]
												}, true);
											}
											pos++;
										}
									});
								});
							}
						},
						onblur: function () {
							this.updateListFields();
						},
						onkeydown: function (event) {
							if (event.key == 'Enter') {
								this.updateListFields();
							}
						},
						onkeyup: function () {
							preventDuplicate('dataset_structure_key', this);
						}
					})
				]
			}),
			Create('div', {
				className: 'col',
				style: {
					width: '14%'
				},
				children: [
					(index > 0 
						?	Create('div', {
								className: 'remove_data_key',
								innerHTML: '&times;',
								onclick: function () {
									removeStructureKey(this);
								}
							})
						: Create('div')
					)
				]
			})
		]
	});
}

function removeStructureKey(elem) {
	let value = elem.parentNode.parentNode.children[0].children[0].value;
	let i=0;
	let list = Array.from(MSelect('.dataset_structure_keys'));
	while (list[i].value != value) {
		i++;
	}
	Array.from(MSelect('.dataset_entry_content')).forEach(content => {
		content.children[i].remove();
	});
	elem.parentNode.parentNode.remove();
}

function newDatasetEntry(uid = null, entry = null, structure_override = null) {
	
	let structure = structure_override != null ? structure_override : Array.from(MSelect('.dataset_structure_keys')).map(v => v.value);

	return Create('div', {
		className: 'dataset_entry',
		children: [
			Create('div', {
				className: 'dataset_entry_title',
				onclick: function () {
					let elem = this.parentNode.children[2];
					if (elem.style.height == '0px') {
						elem.removeAttribute('style');
					} else {
						elem.style.height = '0px';
						elem.style.overflow = 'hidden';
					}
				},
				children: [
					Create('span', {
						innerHTML: entry == null ? '' : entry.display,
					}),
					Create('div', {
						className: 'remove_data_key',
						style: {
							float: 'right'
						},
						innerHTML: '&times;',
						onclick: function () {
							this.parentNode.parentNode.remove();
							event.preventDefault();
						}
					})
				]
			}),
			(uid != null
				? Create('div', {
						children: [
							Create('label', {
								innerHTML: '<strong>UID: </strong>'+uid,
								style: {
									display: 'block',
									paddingTop: '10px'
								}
							})
						]
					})
				: Create('div')
			),
			Create('div', {
				className: 'dataset_entry_content',
				children: structure.map(key => {
					return (key == 'display'
						? Create('label', {
								innerHTML: key,
								style: {
									display: 'block',
									paddingTop: '10px'
								},
								children: [
									Create('input', {
										type: 'hidden',
										name: 'dataset_value_uid[]',
										value: entry == null ? 'create' : uid
									}),
									Create('input', {
										type: 'text',
										name: 'dataset_value_'+key+'[]',
										value: entry == null ? '' : entry[key],
										onkeyup: function () {
											this.parentNode.parentNode.parentNode.children[0].children[0].innerHTML = this.value;
										}
									})
								]
							})
						: Create('span', {
								innerHTML: key,
								className: 'spanlabel',
								children: [
									createPathVariableField({
										name: 'dataset_value_'+key+'[]',
										value: {
											path_only: false,
											value: entry == null ? '' : entry[key]
										},
										allow_path_only: true
									})
								]
							})
					);
				})
			})
		]
	});
	
}

function generateDatasetSelectionList() {
	
	Select('#dataset_list', {
		innerHTML: '',
		children: Object.keys(GLOBAL.active_project.data.sets).map(key => {
			let dataset = GLOBAL.active_project.data.sets[key];
			return Create('div', {
				innerHTML: dataset.display,
				className: 'selection_list_block',
				onclick: () => { loadDataset(dataset); }
			});
		})
	});
	
}