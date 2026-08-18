function initHotKeyListeners() {
	
	// minimal shortcut keys for just ctrl+s right now
	GLOBAL.held_keys = { 
		ctrl: false,
		shift: false,
		alt: false,
		c: false,
		v: false,
		s: false,
		d: false,
		e: false,
		reset: false
	};
	
	window.addEventListener('blur', function () {
		// reset all held keys on window exit
		Object.keys(GLOBAL.held_keys).forEach(key => {
			GLOBAL.held_keys[key] = false;
		});
		GLOBAL.held_keys.reset = false;
	});
	
	// add event listener that prevents mouse wheel document zoom
	document.addEventListener('wheel', function (event) {
		if (event.ctrlKey) {
			event.preventDefault();
		}
	}, { passive: false });
	
	window.addEventListener('keydown', function (event) {

		if (GLOBAL.held_keys.reset == true) {
			event.preventDefault();
			return;
		}
		if (event.keyCode == 16) {
			GLOBAL.held_keys.shift = true;
		} else if (event.keyCode == 17) {
			GLOBAL.held_keys.ctrl = true;
		} else if (event.keyCode == 18) {
			GLOBAL.held_keys.alt = true;
		} else if (event.keyCode == 83) {
			GLOBAL.held_keys.s = true;
		} else if (event.keyCode == 68) {
			GLOBAL.held_keys.d = true;
		} else if (event.keyCode == 69) {
			GLOBAL.held_keys.e = true;
		} else if (event.keyCode == 67) {
			GLOBAL.held_keys.c = true;
		} else if (event.keyCode == 86) {
			GLOBAL.held_keys.v = true;
		}
		
		// detect if is overlay editor and not input field
		let is_oec = Select('#image_editor') && !isInputField(event);
		
		// hotkey actions
		if (GLOBAL.held_keys.ctrl && GLOBAL.held_keys.s) {
			// save
			event.preventDefault();
			GLOBAL.held_keys.reset = true;
			onSaveAction();
		} else if (GLOBAL.held_keys.ctrl && GLOBAL.held_keys.d && is_oec) {
			// remove layer selection
			event.preventDefault();
			GLOBAL.held_keys.reset = true;
			if (GLOBAL.overlay_editor.active_layer != null) {
				setActiveLayer(null);
			}
		} else if (GLOBAL.held_keys.ctrl && GLOBAL.held_keys.e && is_oec) {
			// enabled transform tool
			event.preventDefault();
			GLOBAL.held_keys.reset = true;
			if (GLOBAL.overlay_editor.active_layer != null && getLayerById(GLOBAL.overlay_editor.active_layer).type != 'clip_path') {
				GLOBAL.overlay_editor.tools.transform = !GLOBAL.overlay_editor.tools.transform;
			}
			printCurrentCanvas();
		} else if (GLOBAL.held_keys.ctrl && GLOBAL.held_keys.c && is_oec) {
			// copy current active layer
			event.preventDefault();
			GLOBAL.held_keys.reset = true;
			if (GLOBAL.overlay_editor.active_layer != null) {
				GLOBAL.overlay_editor.copy_buffer = JSON.stringify(getLayerById(GLOBAL.overlay_editor.active_layer));
			}
			printCurrentCanvas();
		} else if (GLOBAL.held_keys.ctrl && GLOBAL.held_keys.v && is_oec && GLOBAL.overlay_editor.copy_buffer) {
			// paste 
			event.preventDefault();
			GLOBAL.held_keys.reset = true;
			addNewTypeLayer(null, GLOBAL.overlay_editor.active_layer, false, false, JSON.parse(GLOBAL.overlay_editor.copy_buffer));
			printCurrentCanvas();
		}
	});
	
	window.addEventListener('keyup', function (event) {
		if (event.keyCode == 16) {
			GLOBAL.held_keys.shift = false;
		} else if (event.keyCode == 17) {
			GLOBAL.held_keys.ctrl = false;
		} else if (event.keyCode == 18) {
			GLOBAL.held_keys.alt = false;
		} else if (event.keyCode == 83) {
			GLOBAL.held_keys.s = false;
		} else if (event.keyCode == 68) {
			GLOBAL.held_keys.d = false;
		} else if (event.keyCode == 69) {
			GLOBAL.held_keys.e = false;
		} else if (event.keyCode == 67) {
			GLOBAL.held_keys.c = false;
		} else if (event.keyCode == 86) {
			GLOBAL.held_keys.v = false;
		}
		GLOBAL.held_keys.reset = false;
	});
	
}

function isInputField(e) {
	return ['INPUT','TEXTAREA'].includes(e?.target.tagName)
		? ['text','password','date','datetime-local','email'].includes(e.target.type)
		: e?.target.isContentEditable;
}