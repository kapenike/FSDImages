// change action state of path editor toggle button
function toggleSelectionEditorButton(is_remove, id) {
	
	let data = Select('#variable_input_'+id).data;
	
	Select('#path_insert_button_'+id, {
		innerHTML: is_remove ? '&times;' : '&#8594;',
		className: is_remove ? 'path_insert_button close_path_selection_editor' : 'path_insert_button'+(data.path_only ? ' path_insert_button_is_reference_path' : ''),
		onclick: (
			is_remove
				? function () {
						closePathEditor(this.uid);
					}
				: function () {
						openPathEditor(this.uid);
					}
		)
	});
}