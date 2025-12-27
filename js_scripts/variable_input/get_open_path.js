// determine whether to return an open path or not
function getOpenPath(uid) {
	
	let input_elem = Select('#variable_input_'+uid);
	
	if (input_elem.data.path_only) {
		let variable_parts = getRealVariableParts(input_elem.value);
		if (variable_parts.length > 0 && variable_parts[0].variable) {
			
			// split and pop last element of path
			variable_parts[0].variable = variable_parts[0].variable.split('/');
			variable_parts[0].variable.pop();
			
			// return open path (aka parent path)
			return variable_parts[0].variable.join('/');
		}
	}
	
	return '';
	
}