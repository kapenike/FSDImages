function setNavigationAssets() {

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
														innerHTML: 'Asset Manager'
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
														innerHTML: 'Create Asset',
														onclick: () => { setupAssetEditor(); },
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
										id: 'asset_list',
										style: {
											height: 'calc(100% - 150px)',
											overflowY: 'scroll'
										}
									})
								]
							}),
							Create('div', {
								className: 'col',
								id: 'asset_manager_form_block',
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
	
	// setup asset editor, default to create
	setupAssetEditor(null);
	
	// setup asset selection list
	generateAssetSelectionList();
		
}

function updateAssetData(use_from_quick_upload = false) {
	
	// use form style capture to easily inherit form capture methods
	let form_details = formToObj('asset_creation_form');
	
	// ensure no form errors
	if (!checkForAssetSlug(form_details.asset_slug) || !checkForAssetName(form_details.asset_name) || !checkForFile(form_details.asset_file)) {
		return false;
	}
	
	// append application
	form_details.application = 'create_update_asset';
	
	// append project uid
	form_details.project_id = GLOBAL.active_project.uid;
	
	// update server-side asset details, then call back to same scope function to save changes locally
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {
			
			// log previous source
			let previous_source = null;
			if (form_details.asset_registration_type != 'create' && GLOBAL.active_project.data.assets[form_details.asset_registration_type].source) {
				previous_source = GLOBAL.active_project.data.assets[form_details.asset_registration_type].source;
			}

			// update local asset list
			GLOBAL.active_project.data.assets[form_details.asset_slug] = data.msg;
			
			// add previous source to new object
			if (previous_source) {
				GLOBAL.active_project.data.assets[form_details.asset_slug].source = previous_source;
			}
			
			// if updated slug, remove old path
			if (form_details.asset_registration_type != 'create' && form_details.asset_registration_type != form_details.asset_slug) {
				GLOBAL.active_project.data.assets[form_details.asset_registration_type] = null;
				delete GLOBAL.active_project.data.assets[form_details.asset_registration_type];
			}

			if (use_from_quick_upload == false) {
				
				// load asset data into form
				setupAssetEditor(form_details.asset_slug);
				
				// re-create asset selection list
				generateAssetSelectionList();
				
			}
			
			// if file was included in the form submission, load file into source and update affected overlays
			if (form_details.asset_file.length > 0) {
				if (Object.keys(GLOBAL.active_project.overlays).length > 0) {
					// init loader, generateStreamOverlays will clear
					ajaxInitLoader('body');
				}
				let image = new Image();
				image.src = '/data/'+GLOBAL.active_project.uid+'/sources/'+data.msg.file;
				GLOBAL.active_project.data.assets[form_details.asset_slug].source = null;
				image.onload = () => {
					if (GLOBAL.use_vram) {
						createImageBitmap(image).then(bitmap => {
							GLOBAL.active_project.data.assets[form_details.asset_slug].source = bitmap;
						});
					} else {
						GLOBAL.active_project.data.assets[form_details.asset_slug].source = image;
					}
					
					// request sources associated with the current asset upload
					let asset_associated_sources = checkDataForPathReference('assets/'+form_details.asset_slug);
					
					// if any associated sources, proc overlay generation update
					if (asset_associated_sources.length > 0) {
						// convert sources to variable path
						asset_associated_sources = asset_associated_sources.map(x => { return '$var$'+x+'$/var$'; });
						setTimeout(() => { generateStreamOverlays(asset_associated_sources) }, 1);
					}
					
					// remove loader
					ajaxRemoveLoader('body');
					
					// if quick upload, call back to finish popup close and print actions
					if (use_from_quick_upload) {
						
						// get variable input id
						let id = Select('#popup_create_asset').var_input_uid;
						
						// get variable input primary form field (hidden)
						let form_field = Select('#variable_input_'+id)
						
						// set form value
						form_field.value = '$var$$pointer$1$/pointer$assets/'+form_details.asset_slug+'$/var$';
						
						// update UI field value
						Select('#var_set_input_'+id, { innerHTML: '', children: getPathSelectionValueFromFormValue(form_field.value) });
						
						// call variable input attached onedit function
						form_field.onedit();
						
						// close popup
						closePopup();
						
						// if overlay editor is active, re-print canvas on refresh of DOM
						if (Select('#image_editor')) {
							
							setTimeout(function () {
								printCurrentCanvas();
							}, 1);
							
						}
						
					}
				}
			}
			
		}
		
	}, 'body');
}

function checkForAssetSlug(slug, live_update = true) {
	// ensure slug is not being used (unless it is the current slug of the active asset object)
	if (slug != '' && (typeof GLOBAL.active_project.data.assets[slug] === 'undefined' || Select('[name="asset_registration_type"]').value == slug)) {
		if (live_update) {
			Select('#valid_asset_slug').innerHTML = '';
		}
		return true;
	} else {
		if (live_update) {
			Select('#valid_asset_slug').innerHTML = 'Asset slug is currently in use. Consider xXx'+slug+'xXx';
		}
		return false;
	}
}

function checkForAssetName(name) {
	if (name != '') {
		Select('#valid_asset_name').innerHTML = '';
		return true;
	} else {
		Select('#valid_asset_name').innerHTML = 'Asset name cannot be empty';
		return false;
	}
}

function checkForFile(file) {
	if (file.length > 0 || Select('[name="asset_registration_type"]').value != 'create') {
		Select('#valid_asset_file').innerHTML = '';
		return true;
	} else {
		Select('#valid_asset_file').innerHTML = 'Asset image required for creation';
		return false;
	}
}

function autoGenerateAssetSlug(v) {
	v = v.toLowerCase().replaceAll(' ', '_');
	let add = 1;
	while (!checkForAssetSlug(v+(add == 1 ? '' : '_'+add), true)) {
		add++;
	}
	if (add > 1) {
		v = v+'_'+add;
	}
	Select('[name="asset_slug"]').value = v;
}

function setupAssetEditor(slug = null, override_location_write = false) {
	
	let asset_data = (slug == null ? null : GLOBAL.active_project.data.assets[slug]);
	
	Select((override_location_write ? override_location_write : '#asset_manager_form_block'), {
		innerHTML: '',
		children: [
			Create('h3', {
				innerHTML: (asset_data == null ? 'Create New Asset' : 'Update Asset')
			}),
			Create('form', {
				id: 'asset_creation_form',
				children: [
					Create('input', {
						type: 'hidden',
						name: 'asset_registration_type',
						value: asset_data == null ? 'create' : slug
					}),
					Create('div', {
						id: 'valid_asset_name',
						style: {
							fontSize: '12px',
							color: 'red'
						}
					}),
					Create('label', {
						innerHTML: 'Asset Name',
						children: [
							Create('input', {
								type: 'text',
								name: 'asset_name',
								value: asset_data == null ? '' : asset_data.display,
								onkeyup: function () {
									autoGenerateAssetSlug(this.value)
								}
							})
						]
					}),
					Create('div', {
						id: 'valid_asset_slug',
						style: {
							fontSize: '12px',
							color: 'red'
						}
					}),
					Create('label', {
						innerHTML: 'Asset Slug',
						children: [
							Create('input', {
								type: 'text',
								name: 'asset_slug',
								onkeyup: function () { checkForAssetSlug(this.value); },
								value: asset_data == null ? '' : slug
							})
						]
					}),
					Create('div', {
						id: 'valid_asset_file',
						style: {
							fontSize: '12px',
							color: 'red'
						}
					}),
					Create('label', {
						innerHTML: 'Asset Image',
						children: [
							Create('input', {
								type: 'file',
								accept: 'image/*',
								name: 'asset_file'
							})
						]
					}),
					Create('label', {
						innerHTML: 'Image Offset X',
						children: [
							Create('input', {
								type: 'text',
								name: 'asset_offset_x',
								value: asset_data == null ? '0' : asset_data.offset_x
							})
						]
					}),
					Create('label', {
						innerHTML: 'Image Offset Y',
						children: [
							Create('input', {
								type: 'text',
								name: 'asset_offset_y',
								value: asset_data == null ? '0' : asset_data.offset_y
							})
						]
					}),
					(asset_data != null
						?	Create('div', {
								style: {
									textAlign: 'right'
								},
								children: [
									Create('button', {
										type: 'button',
										className: 'remove_button',
										innerHTML: 'Delete Asset',
										onclick: () => { 
											notify(
												'Please confirm you\'d like to permanently remove this asset',
												() => { removeAsset(slug) }
											);
										}
									})
								]
							})
						: Create('div')
					),
					(asset_data == null
						? Create('div')
						:	Create('div', {
								className: 'asset_preview',
								children: [
									Create('img', {
										src: '/data/'+GLOBAL.active_project.uid+'/sources/'+asset_data.file
									})
								]
							})
					)
				]
			})
		]
	});
}

function generateAssetSelectionList() {
	
	Select('#asset_list', {
		innerHTML: '',
		children: Object.keys(GLOBAL.active_project.data.assets).map(slug => {
			return Create('div', {
				innerHTML: GLOBAL.active_project.data.assets[slug].display,
				className: 'selection_list_block',
				onclick: () => { setupAssetEditor(slug); }
			});
		})
	});
	
}

function removeAsset(slug) {
	
	let form_details = {
		project_uid: GLOBAL.active_project.uid,
		asset_slug: slug,
		application: 'remove_asset'
	};

	// remove asset server side
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {
			
			// delete local asset
			delete GLOBAL.active_project.data.assets[slug];
			
			// bring up create asset form
			setupAssetEditor(null);
			
			// re-create asset selection list
			generateAssetSelectionList();
			
		}
		
	}, 'asset_manager_form_block');
}
