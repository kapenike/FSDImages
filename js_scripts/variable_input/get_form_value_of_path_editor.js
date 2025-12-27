// generate text value interpretation of fields HTML value for save
function getFormValueOfPathSelection(id, value) {
	
	// main input field element
	let input_field = Select('#var_set_input_'+id);
	
	// settings data
	let data = Select('#variable_input_'+id).data;

	// output buffer
	let output = '';
	
	// convert HTML elements to text equivalent, allowing end result HTML if enabled
	input_field.childNodes.forEach(node => {
		if (node.nodeName === '#text') {
			output += node.nodeValue.replaceAll('&nbsp;','');
		} else if (node.className == 'path_real_entry') {
			output += node.innerHTML.replaceAll('&nbsp;','');
		} else if (node.className == 'path_variable_entry') {
			
			// search for depth pointer and set for this elements text value output
			let pointer_value = 1;
			if (Select('#depth_value_'+id)) {
				pointer_value = Select('#depth_value_'+id).value;
				if (pointer_value == '') {
					pointer_value = 1;
				}
			}
			output += '$var$'+(data.path_only ? '$pointer$'+pointer_value+'$/pointer$' : '')+node.innerHTML+'$/var$';
			
		} else {
			
			// allow html input, otherwise strip and return only text value
			if (data.html_input) {
				output += node.outerHTML;
			} else {
				output += node.textContent || node.innerText || ''
			}
			
		}
	});
	
	return output;
}