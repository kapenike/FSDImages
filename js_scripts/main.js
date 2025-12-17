// global variable for overlay and project data
var GLOBAL = {};

function initGlobal() {
	GLOBAL = {
		project_registry: null,
		use_vram: true, // generate Bitmaps for faster overlay creation at the cost of the GPU
		generate_sources: false, // flag used by generateStreamOverlays(null) when passed null to update overlay sources (defines what UI value updates will proc a stream overlay image export)
		source_changes: [], // where to store source changes before an update
		command_list: [], // when 3pa commands are enabled, this stores a list of the current ones to execute in a state change
		track_sources: { // track text fields and update on source change
			inc: 0,
			pairs: []
		},
		navigation: {}, // data location for navigation
		data_structure: {
			ignored: ['assets', 'sets'], // data paths to ignore during structure editor generation,
			removed: [], // data keys removed during structure editing
			new_key_inc: 0 // incrementor used to make new key name values unique
		},
		ui: {
			active_data: null, // data used during UI creation
			drag_elem: null, // element being dragged during UI editing
			drag_clone: null, // shadow clone to animate drag
			drag_hover: null, // current hovered element while dragging
			drop_side: null,
			container: null,
			active_path_field_id: null
		},
		overlay_editor: {},
		unique_id: 0
	}
}

function initStreamOverlay() {
	
	// init global var
	initGlobal();
	
	// listen for hotkey commands (./js_scripts/hotkeys.js)
	initHotKeyListeners();
	
	// link out to project selection screen, this will call back to `streamDataLoaded` on load or creation of new project
	generateprojectSelectionScreen();
	
	// async path ends with call to initNavigation() to kick off application start (./js_scripts/navigation.js)
}

function streamDataLoaded(status, data) {
	
	if (status && data.status) {
		
		// save initial project data in GLOBAL
		GLOBAL.active_project = data.msg;
		
		// ensure project overlay layers are updated to the current version of the editor
		// this is so all projects will continue to work no matter the new layer changes in the future supporting multiple new features
		legacyLayerCheck();

		// load dependent image sources into GLOBAL
		loadOverlayDependencies();
		
	} else {
		alert(data.msg);
	}
	
}

function loadOverlayDependencies() {
	
	// dependency sources
	let sources = [];
	
	// store dependency asset keys
	Object.keys(GLOBAL.active_project.data.assets).forEach(asset_key => {
		sources.push(asset_key);
	});
	
	// replace those sources with image objects by using the parent reference to source (sources.source)
	let loaded = 0;
	let to_load = sources.length;
	if (to_load > 0) {
		sources.forEach(source => {
			let image = new Image();
			image.src = '/data/'+GLOBAL.active_project.uid+'/sources/'+GLOBAL.active_project.data.assets[source].file;
			image.onload = () => {
				
				// on image load, convert to bitmap for loading assets into VRAM
				// !! - this could potentially cause issues to low spec computers if the user has too many assets/layers and need those specs for gaming... offer base RAM loaded image option
				// !! - bitmaps generate overlays significantly faster
				
				if (GLOBAL.use_vram) {
					
					// replace source with bitmap (additional async action): VRAM
					createImageBitmap(image).then(bitmap => {
						loaded++;
						GLOBAL.active_project.data.assets[source].source = bitmap;
						if (loaded == to_load) {
						
							// once all assets are loaded, callback to initial overlay generation
							// (./js_scripts/generate_overlays.js)
							generateStreamOverlays(null, dependenciesLoaded);
							
						}
					});
				} else {
					
					// replace source with image object: RAM
					loaded++;
					GLOBAL.active_project.data.assets[source].source = image;
					if (loaded == to_load) {
						
						// once all assets are loaded, callback to initial overlay generation
						// (./js_scripts/generate_overlays.js)
						generateStreamOverlays(null, dependenciesLoaded);
						
					}
				}
			}
		});
	}
	
	// if no sources, continue
	if (sources.length == 0) {
		generateStreamOverlays(null, dependenciesLoaded);
	}
	
}

function dependenciesLoaded(status, data) {
	// (./js_scripts/navigation.js)
	initNavigation();
}