function featureEditCanvasDimensions() {
	
	return Create('div', {
		className: 'editor_tab',
		innerHTML: 'Image Dimensions',
		onclick: function () {
			
			// open new editor dialog
			setImageEditorDialog(event, {
				title: 'Image Dimensions',
				items: [
					{
						title: 'Width <input type="text" id="canvas_width" value="'+GLOBAL.overlay_editor.current.dimensions.width+'"/>',
						click: () => {}
					},
					{
						title: 'Height <input type="text" id="canvas_height" value="'+GLOBAL.overlay_editor.current.dimensions.height+'"/>',
						click: () => {}
					},
					{
						title: 'Update',
						click: function () {
							
							// set canvas dimensions
							GLOBAL.overlay_editor.current.dimensions.width = parseInt(Select('#canvas_width').value);
							GLOBAL.overlay_editor.current.dimensions.height = parseInt(Select('#canvas_height').value);
							
							// remove current dimension input dialog
							removeUIEditMenu();
							
							// re-scale based on new dimensions
							setupScalingFactor();
							
							// print new canvas
							printCurrentCanvas();
							
						},
						action: true
					}
				]
			}, true);
		}
	});
	
}