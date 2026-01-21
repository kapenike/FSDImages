// drop down path selection list generator
function createPathListForEditor(path = null, base_path = null) {
	
	// data from master input element
	let data = Select('#variable_input_'+GLOBAL.ui.active_path_field_id).data;
	
	// start path
	let curr_path = GLOBAL.active_project.data;

	// if search list accesses a dataset
	let is_data_set = false;
	
	// if search list accesses an asset object
	let is_asset = false;
	
	// path default declarations
	if (path == '') {
		path = null;
	}
	let is_base_path = (path == base_path);
	
	// if not an empty path, check for access types within current path (datasets / assets) also allow path continuation
	if (path != null) {
		let nest = path.split('/');
		for (let i=0; i<nest.length; i++) {
			if (i == 0) {
				if (nest[i] == 'sets') {
					is_data_set = true;
				} else if (nest[i] == 'assets') {
					is_asset = true;
				}
			}
			// if path result points to new path, continue path lookup for image search (edge case value determined within list), normal traversal
			// or the edge case of source setter on dataset entry
			if (typeof curr_path[nest[i]] === 'string' && (data.image_search || (
				!data.path_only ||
				data.source_setter && isPathNestedDataset('$var$'+path+'$/var$')
			))) {
				curr_path = getRealValue(curr_path[nest[i]]);
				continue;
			}
			curr_path = curr_path[nest[i]];
		}
	}
	
	// sort output list
	let list = Object.keys(curr_path).sort((a,b) => {
		let a_string = typeof curr_path[a] === 'string';
		let b_string = typeof curr_path[b] === 'string';
		if (a_string && b_string) {
			return a > b;
		} else if (!a_string && !b_string) {
			return a > b;
		} else if (a_string && !b_string) {
			return 1;
		} else if (b_string && !a_string) {
			return -1;
		}
	});
	
	// if at root and input is a source setter rather than a value, filter ignored paths
	if (path == null && data.source_setter) {
		// source setting now allows direct save to dataset sub values
		let actual_ignored = GLOBAL.data_structure.ignored.filter(v => v != 'sets');
		list = list.filter(x => !actual_ignored.includes(x));
	}
	
	// filter out any direct image elements
	list.filter(x => {
		return (x instanceof ImageBitmap || x instanceof HTMLImageElement ? false : true);
	});
	
	// generate path list UI
	return [
		(!is_base_path
			? Create('div', {
					className: 'go_back_path_selection_editor',
					innerHTML: '&larr; <span style="font-weight:600;">return to parent</span>',
					onclick: () => {
						let path_split = path.split('/');
						path_split.pop();
						updatePathEditor(path_split.join('/'), base_path);
					}
				})
			: Create('div')
		),
		(
			list.length > 10
				?	Create('div', {
					children: [
						Create('input', {
							type: 'text',
							style: {
								padding: '6px 16px',
								margin: '0'
							},
							placeholder: 'Search...',
							onkeyup: function () {
								MSelect('.path_selection_element_search').forEach(search_elem => {
									search_elem.style.display = search_elem.innerHTML.toLowerCase().indexOf(this.value.toLowerCase()) > -1 ? 'block' : 'none'
								});
							}
						})
					]
				})
				: Create('div')
		),
		...list.map(key => {
			// therefore is an edge case that allows setting of value as a whole and traversing within to set all values. Mostly just for dataset handling
			let therefore = false;
			let is_value = typeof curr_path[key] === 'string';
			let print_key = key;
			if ((is_data_set || is_asset) && curr_path[key] && typeof curr_path[key].display !== 'undefined') {
				print_key = curr_path[key].display;
			}
			// edge case, if is_asset, check if active path selection input is path only, if so, set as `is_value`
			if (is_asset && data.path_only) {
				is_value = true;
			} else if (is_value && !data.path_only && typeof getRealValue('$var$'+(path == null ? key : path+'/'+key)+'$/var$') !== 'string') {
				// edge case, if value and not a path only selection, and value is a path variable that points towards an object rather than string, set as a path value
				is_value = false;
			} else if (is_value == true && data.path_only && data.image_search) {
				// override default logic of preventing dataset expansion for path only if looking for an image object
				let upcoming_dir = getRealValue(curr_path[key]);
				if (isObject(upcoming_dir)) {
					// if object allow expansion
					is_value = false;
					// unless the object contains a direct image reference
					if (Object.keys(upcoming_dir).find(x => {
						let ref = upcoming_dir[x];
						return ref instanceof ImageBitmap || ref instanceof HTMLImageElement;
					})) {
						is_value = true;
					}
				}
			} else if (data.source_setter && is_value) {
				// source setter can set entire value with therefore or can traverse into dataset reference and save specific values
				// if sub path is specific dataset entry, allow therefore
				if (isPathNestedDataset('$var$'+(path == null ? key : path+'/'+key)+'$/var$')) {
					therefore = true;
					is_value = false;
				}
			} else if (!is_value && is_data_set && path.slice(-8) == '/entries' && data.path_only && !data.source_setter) {
				// if not a value, is dataset and at dataset entry level depth, is reference path and not a source setter, force value
				is_value = true;
			}

			return Create('div', {
				className: 'path_selection_element_search path_selection_element_'+(is_value ? 'set' : 'extend'),
				children: [
					( 
						therefore
							? Create('span', { 
									className: 'therefore_cutoff',
									innerHTML: '&there4;',
									onclick: () => {
										event.stopPropagation();
										setPathEditorValue(path == null ? key : path+'/'+key)
									}
								})
							: Create('span')
					),
					Create('span', {
						innerHTML: (is_value ? '&nbsp;&nbsp;&#9900;' : '&#8594; ')+print_key
					})
				],
				onclick: (
					is_value
						? () => {
								setPathEditorValue(path == null ? key : path+'/'+key)
							}
						:	() => {
								updatePathEditor(path == null ? key : path+'/'+key, base_path);
							}
				)
			});
			
		})
	];
}

function updatePathEditor(path, base_path) {
	Select('#path_selection_dialog', {
		innerHTML: '',
		children: createPathListForEditor(path, base_path)
	})
}