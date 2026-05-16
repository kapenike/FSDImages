function transformToolPrintSizingBoxes() {
	
	// this function should ALWAYS immediately follow active layer selection print, so line dash and color are pre-set at the bottom of printCurrentCanvas
	
	let ctx = GLOBAL.overlay_editor.ctx;
	
	// get action box dimensions / position
	let boxes = transformGetActionBoxes();
	
	// print
	Object.keys(boxes).forEach(box_key => {
		let box = boxes[box_key];
		ctx.beginPath();
		ctx.rect(box.x, box.y, box.width, box.height);
		ctx.stroke();
	});
	
}