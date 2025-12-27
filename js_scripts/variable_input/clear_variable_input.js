// clear input field
function clearVariableInput(id) {
	Select('#var_set_input_'+id).innerHTML = '';
	Select('#variable_input_'+id).value = '';
	Select('#variable_input_'+id).onedit();
}