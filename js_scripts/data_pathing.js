function isPathVariable(value) {
	return typeof value === 'string' && getRealVariableParts(value).filter(x => typeof x.variable !== 'undefined').length > 0;
}

function isPathOnlyVariable(value) {
	return typeof value === 'string' && getRealVariableParts(value).filter(x => typeof x.variable !== 'undefined').length == 1;
}

function isComparator(v) {
	v = spaceTrim(v);
	if (v.indexOf('$comp$') > -1 && v.indexOf('$/comp$') > -1) {
		return v.split('$comp$')[1].split('$/comp$')[0];
	}
	return false;
}

function isPointer(v) {
	if (typeof v === 'string' && v.indexOf('$pointer$') > -1 && v.indexOf('$/pointer$') > -1) {
		return parseInt(v.split('$pointer$')[1].split('$/pointer$')[0]);
	}
	return null;
}

function stripPointer(v) {
	let is_pointer = isPointer(v);
	if (is_pointer) {
		v = v.replace('$pointer$'+is_pointer+'$/pointer$', '');
	}
	return v;
}

function toggleOnComparison(value) {
	let comparator = isComparator(value);
	if (comparator) {
		let parts = value.split('$comp$'+comparator+'$/comp$');
		let left = spaceTrim(getRealValue(parts[0]));
		let right = spaceTrim(getRealValue(parts[1]));
		if (
			comparator == 'equal' && left == right ||
			comparator == 'not equal' && left != right ||
			comparator == 'less than' && parseFloat(left) < parseFloat(right) ||
			comparator == 'more than' && parseFloat(left) > parseFloat(right) ||
			comparator == 'less than or equal' && parseFloat(left) <= parseFloat(right) ||
			comparator == 'more than or equal' && parseFloat(left) >= parseFloat(right)
		) {
			return true;
		}
	}
	return false;
}

// not all comparisons are similar, allow ui setup to determine value depth to compare
// edge case to add to depth if available
function getDepthComparisonValue(value, inc = null) {
	let is_pointer = isPointer(value);
	if (is_pointer && inc) {
		is_pointer += inc
	}
	return getRealValue(value, is_pointer);
}

function getRealVariableParts(value) {
	let return_data = [];
	let split = value.replaceAll('$var$','$delimiter$').replaceAll('$/var$','$delimiter$').split('$delimiter$');	
	for (let i=0; i<split.length; i++) {
		if (i%2 == 0) {
			// real part
			if (split[i] != '') {
				return_data.push({ real: split[i] });
			}
		} else {
			// determine if pointer and set as depth value
			let is_pointer = false;
			if (split[i].indexOf('$pointer$') > -1) {
				is_pointer = split[i].split('$pointer$')[1].split('$/pointer$')[0];
				split[i] = split[i].split('$/pointer$')[1];
			}
			// variable part
			return_data.push({ variable: split[i], depth_value: is_pointer });
		}
	}
	return return_data.filter(x => {
		return (x.variable ? true : x.real != '')
	});
}

function clearSourceChanges() {
	GLOBAL.source_changes = [];
}

// assumes value is path only reference
// just like getRealValue, traversal ends if a split path is found
function getRealValueHeadList(value, base_path = GLOBAL.active_project.data, head = []) {
	let path = getRealVariableParts(value);
	if (path.length == 1 && path[0].variable) {
		head.push(path[0].variable);
		let upcoming_value = getRealValue('$var$'+path[0].variable+'$/var$', 2);
		if (!isObject(upcoming_value)) {
			head = getRealValueHeadList(upcoming_value, base_path, head);
		}
	}
	return head;
}

// recurse data structure looking for any save path reference that contains the current path lookup and return the matching setter paths as an array
function checkDataForPathReference(path, data = GLOBAL.active_project.data, app_path = '', source_list = []) {
	let keys = Object.keys(data);
	for (let i=0; i<keys.length; i++) {
		let current = data[keys[i]];
		let temp_app_path = (app_path == '' ? keys[i] : app_path+'/'+keys[i]);
		if (isObject(current)) {
			source_list.push(...checkDataForPathReference(path, current, temp_app_path));
		} else if (typeof current === 'string' && current.indexOf(path) > -1) {
			source_list.push(temp_app_path);
		} else if (typeof current === 'string' && isPathOnlyVariable(current)) {
			source_list.push(...checkDataForPathReference(path, getRealValue(current), temp_app_path));
		}
	}
	return source_list;
}

// completely flatten an object by pulling in all real values from variable paths
function flattenDataObject(value) {
	let real_value = JSON.parse(JSON.stringify(getRealValue(value)));
	if (isObject(real_value)) {
		Object.keys(real_value).forEach(key => {
			real_value[key] = flattenDataObject(real_value[key]);
		});
	}
	return real_value;
}

function getRealValue(value, depth = null, base_path = GLOBAL.active_project.data, head = null) {
	
	// create head that tracks sources and prevents infinite loop
	if (head == null) {
		head = [];
	}
	
	// detect if value contains a path variable
	if (isPathVariable(value)) {
		
		// identify real and variable path parts
		let var_real_parts = getRealVariableParts(value);
		
		// temporary buffer of head variable sources to allow duplicate sources inline rather than nested (does not create infinite loop)
		let temp_head = [];
		
		// loop variable parts
		var_real_parts.forEach(split_part => {
			if (split_part.variable) {
				
				// if source is already in head, return to prevent infinite loop
				if (head.includes(split_part.variable)) {
					return '';
				} else {
					// otherwise, log current source
					temp_head.push(split_part.variable);
				}
				
			}
		});
		
		// push temp head into head
		head.push(...temp_head);
		
		let return_value = '';
		
		// log change to current depth
		if (depth != null) {
			depth -= 1;
			
			// if depth value counter meets a diverging path, it must end here logically
			if (var_real_parts.length > 1) {
				depth = 0;
			}
			
		}
		
		// if depth reached, return now
		if (depth == 0) {
			return value;
		}
		
		// loop variable parts and nest continue their chaining if depth allows, then append for final return
		for (let i=0; i<var_real_parts.length; i++) {
			let split_part = var_real_parts[i];
			
			if (split_part.variable) {
				
				let path = split_part.variable.split('/');
				let reference_path = base_path;
				
				// pull from use path
				while (path.length > 0) {
					
					let path_part = path.shift();
					
					// pathing protection
					if (typeof reference_path[path_part] === 'undefined') {
						// allow logging in case of attempt to fix large chaining logical errors in a project
						// console.info('Attempting to access undefined object from variable path: '+value+', Undefined key path starting at: '+[path_part, ...path].join('/'));
						return '';
					}
					
					// path forwarding allowed only when depth value search is not enabled
					if (depth == null && typeof reference_path[path_part] === 'string') {
						reference_path = getRealValue(reference_path[path_part]);
					} else {
						// shift from use path into reference path
						reference_path = reference_path[path_part];
					}
					
				}
				
				// edge case .. if depth allows access to a non string value, concatting string method not allowed, return object
				// (e.g.): getRealValue on dataset to return object structure or on image object for use on overlay print
				// 		should only be used to combine string values from data input or a string value + new path variable
				if (typeof reference_path !== 'string') {
					return_value = reference_path;
					break;
				}
				
				return_value += getRealValue(reference_path, depth, base_path, head);
				
			} else {
				// append real part
				return_value += split_part.real;
			}
		}
		
		return return_value;
	}
	
	// if not a variable, return value
	return value;
}

function sourcesFromValue(value) {
	let sources = [];
	getRealVariableParts(value).forEach(v => {
		if (v.variable) {
			sources.push('$var$'+v.variable+'$/var$');
		}
	});
	return sources;
}

function sourcesFromLayer(layer) {
	let sources = [];
	
	// push values stashed within toggle
	sources.push(...sourcesFromValue(layer.toggle));
	
	if (layer.type == 'clip_path') {
		
		// clip path border and background color
		sources.push(...sourcesFromValue(layer.clip_path.color));
		sources.push(...sourcesFromValue(layer.clip_path.border.color));
		
	} else {
		
		// image and text value
		sources.push(...sourcesFromValue(layer.value));
		
		if (layer.type == 'text') {
			
			// text layer color
			sources.push(...sourcesFromValue(layer.style.color));
			
		}
		
	}
	
	// if sub layers
	if (layer.layers) {
		layer.layers.forEach(sub_layer => {
			sources.push(...sourcesFromLayer(sub_layer));
		});
	}
	
	return sources;
}

function requestSourceList(overlay) {
	let sources = [];
	
	overlay.layers.forEach(layer => {
		sources.push(...sourcesFromLayer(layer));
	});
	
	// due to the variable nature of the application and not being able to 100% determine if a source will be or become a dataset, a crude method must be used here
	// if a field element saves a dataset path and the editor uses a property of that dataset, the sources will mismatch and not generate the associated overlay
	// fix by also logging sub path
	let sub_sources = [];
	sources.forEach(source => {
		let split = source.replaceAll('$var$','').replaceAll('$/var$','').split('/');
		if (split.length > 1) {
			split.pop();
			sub_sources.push('$var$'+split.join('/')+'$/var$');
		}
	});
	sources.push(...sub_sources);
	
	// remove duplicate sources
	for (let i=0; i<sources.length; i++) {
		let source = sources[i];
		for (let i2=i+1; i2<sources.length; i2++) {
			if (source == sources[i2]) {
				sources.splice(i2, 1);
				i2--;
			}
		}
	}
	
	return sources;
}

function setRealValue(string_path, value) {
	
	// remove path delimiters
	let path = string_path.slice(5, -6);
	
	// if path contains pointer, remove
	path = stripPointer(path);
	
	// split path
	path = path.split('/');
	
	// path base reference
	let reference_path = GLOBAL.active_project.data;
	
	// pull from use path until only one path directory is left
	while (path.length > 1) {
		
		// shift from use path into reference path
		reference_path = reference_path[path.shift()];
		
	}

	// set passed value as reference path value using last available parent (js reference things)
	reference_path[path.shift()] = value;

}