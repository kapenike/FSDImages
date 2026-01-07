function manageVariableInputCaretPosition(uid, elem) {
	
	// get window caret position
	let selection = window.getSelection();
	
	// if content editable variable input and valid range
	if (elem.contentEditable && selection.rangeCount > 0) {
		
		let range = selection.getRangeAt(0);
		
		// set range end and capture
		let range_end = range.cloneRange();
		range_end.selectNodeContents(elem);
		range_end.setEnd(range.endContainer, range.endOffset);
		
		// stash for when inserting
		GLOBAL.ui.variable_input_caret = {
			uid: uid,
			position: range_end.toString().length
		};
		
	} else {

		// reset global state if not available
		GLOBAL.ui.variable_input_caret = {
			uid: null,
			position: null
		};
		
	}
	
}

function variableInputCaretInsert(parent, child) {
	
	let offset = 0;
	let children = parent.childNodes;
	
	if (children.length == 0) {
		parent.appendChild(child);
		return;
	}
	
	for (let i=0; i<children.length; i++) {
		let text_node = children[i].childNodes[0];
		offset += text_node.length;
		if (offset >= GLOBAL.ui.variable_input_caret.position) {
			let pos = text_node.length - (offset - GLOBAL.ui.variable_input_caret.position);
			if (pos == 0) {
				children[i].insertAdjacentElement('beforebegin', child);
			} else {
				let tail = text_node.splitText(pos);
				children[i].insertAdjacentElement('afterend', createPathRealEntry(tail.nodeValue));
				children[i].insertAdjacentElement('afterend', child);
				tail.remove();
			}
			break;
		}
	}

	
}