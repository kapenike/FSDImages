function editOverlay(slug) {
	
	// stash active overlay editor slug
	GLOBAL.overlay_editor.slug = slug;
	
	// stash current active overlay data object, strip original object reference with JSON conversion
	GLOBAL.overlay_editor.current = JSON.parse(JSON.stringify(GLOBAL.active_project.overlays[slug]));
	
	// override global save and stash old
	GLOBAL.overlay_editor.old_save = GLOBAL.navigation.on_save;
	GLOBAL.navigation.on_save = saveOverlay;
	
	// setup default grid
	GLOBAL.overlay_editor.grid_settings = {
		columns: 3,
		rows: 3,
		origin: {
			x: 'center',
			y: 'top'
		}
	}
	
	// generate overlay editor ui
	generateOverlayEditorUI();
	
	// setup functions that re-init on window resize
	resizeValueInits(true);
	
	// init event listeners for editor tools
	createImageEditorListeners();
	
}

function resizeValueInits(isInit = false) {
	
	// set fixed canvas size
	let canvas = Select('#workspace');
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	
	if (isInit) {
		// stash canvas context
		GLOBAL.overlay_editor.ctx = canvas.getContext('2d');
	}
	
	// stash canvas dimensions
	GLOBAL.overlay_editor.dimensions = {
		width: canvas.width,
		height: canvas.height
	};

	// init editor drag object
	GLOBAL.overlay_editor.image_editor_drag = null;
	
	if (isInit) {
		
		// init offset for project drag window
		GLOBAL.overlay_editor.canvas_window = {
			x: 0,
			y: 0,
			origins: null
		};
	
		// init storage for custom clip path editting data
		GLOBAL.overlay_editor.custom_clip_path = {
			allow_drag_move: true,
			event_position: {
				x: null,
				y: null
			},
			insert_point: null,
			active_point: null,
			drag_point: null
		};
		
		// init active layer index
		GLOBAL.overlay_editor.active_layer = null;
	
		// init scaling factor
		GLOBAL.overlay_editor.scale = 1;
		
		// set scaling factor
		setupScalingFactor();
		
		// create layers ui from current overlay data
		setupLayersUI();
		
	}
	
	// print current project
	printCurrentCanvas();
	
}