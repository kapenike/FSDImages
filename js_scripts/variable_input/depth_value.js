// generate drop down list of path values within a variable chain
function generateDepthValueList(value) {
	let current_depth = isPointer(value);
	if (current_depth) {
		let pointer_list = getRealValueHeadList(value);
		while (pointer_list.length < current_depth) {
			pointer_list.push('currently undefined');
		}
		return pointer_list.map((v, index) => {
			return Create('option', {
				innerHTML: (index+1)+': '+v,
				value: index+1,
				selected: (current_depth == (index+1))
			})
		});
	} else {
		return [
			Create('option', {
				innerHTML: '',
				value: ''
			})
		];
	}
}

// update pointer value within form text value
function updateDepthValue(value, uid) {
	let field = Select('#variable_input_'+uid);
	field.value = field.value.split('$pointer$')[0]+'$pointer$'+value+'$/pointer$'+field.value.split('$/pointer$')[1];
}