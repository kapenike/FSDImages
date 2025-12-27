// create HTML representation of form text value
function getPathSelectionValueFromFormValue(value) {
	let output = Create('div');
	getRealVariableParts(value).forEach(entry => {
		output.appendChild(entry.variable ? createPathVariableEntry(entry.variable)	: createPathRealEntry(entry.real));
	});
	return variableFieldProperSpacing(output);
}

function createPathRealEntry(entry) {
	return Create('span', {
		className: 'path_real_entry',
		innerHTML: entry
	});
}

function createPathVariableEntry(path) {
	return Create('span', {
		className: 'path_variable_entry',
		contentEditable: false,
		innerHTML: path
	});
}