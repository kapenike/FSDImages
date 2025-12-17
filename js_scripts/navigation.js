function initNavigation() {
	
	// on project initialization, send attempt to connect to obs websocket controller
	P2P_SERVER.obsconnect();
	
	// show naviation
	Select('.navigation').style.display = 'block';
	
	GLOBAL_NAVIGATION = [
		{
			name: 'File',
			app_init: openFileDropdown
		},
		{
			name: 'Switchboard',
			default: true,
			on_save: updateSourceChanges,
			app_init: function () {
				createUIFromData('#main', GLOBAL.active_project.ui, 'update_project_details')
			},
			close_app: function () { 
				toggleUIEditor(false);
				clearSourceChanges();
			}
		},
		{ name: '' },
		{
			name: 'Data Structure',
			on_save: updateDataStructure,
			app_init: function () {
				manageDataStructure('#main', GLOBAL.active_project.data, 'update_project_data_structure')
			}
		},
		{
			name: 'Assets',
			on_save: updateAssetData,
			app_init: setNavigationAssets,
		},
		{
			name: 'Data Sets',
			on_save: updateDataset,
			app_init: setNavigationDatasets,
		},
		{
			name: 'Overlays',
			on_save: updateOverlayData,
			app_init: setNavigationOverlays
		}
	];
	
	// generate navigation and application init
	generateUI();
}

function generateUI(navigation = null) {
	
	// if file, prevent all and just run init
	if (navigation == 'File') {
		openFileDropdown();
		if (Select('.active_navigation')) {
			Select('.active_navigation').className = 'navigation_element';
		}
		return;
	}
	
	// prevent navigation of already-active page
	if (navigation != null) {
		let active_navigation = Select('.active_navigation');
		if (active_navigation) {
			active_navigation = active_navigation.innerHTML;
			if (active_navigation == navigation) {
				return;
			} else {
				
				// if new navigation, run close app on active page
				closeApp(true, active_navigation);
				
			}
		}
	}
	
	Select('.navigation', {
		innerHTML: '',
		children: [
			Create('div', {
				className: 'project_title',
				innerHTML: '<span style="cursor: pointer; font-weight:bold" onclick="generateprojectSelectionScreen();">&larr;</span> project &#x2772; <span id="project_title">'+GLOBAL.active_project.title+'</span> &#x2773; <span style="font-style:italic; font-size:12px">'+GLOBAL.active_project.uid+'</span>'
			}),
			Create('div', {
				className: 'navigation_logo',
				children: [
					Create('img', {
						src: '/logo.png'
					})
				]
			}),
			Create('div', {
				className: 'navigation_offset_block'
			}),
			...GLOBAL_NAVIGATION.map((nav_elem, index) => {
				
				// nav break
				if (nav_elem.name == '') {
					return Create('div', {
						className: 'nav_break'
					});
				}
				
				// if current tab is active
				let nav_is_active = navigation == nav_elem.name || navigation == null && nav_elem.default;
				if (nav_is_active) {
					
					// init on save and application startup methods
					initNavigationApp(nav_elem);

				}
				
				// generate main navigation element
				let nav_element = Create('div', {
					className: 'navigation_element'+(nav_is_active ? ' active_navigation' : ''),
					innerHTML: nav_elem.name,
					onclick: () => { generateUI(nav_elem.name) }
				});
				
				// if style, apply
				if (nav_elem.style) {
					Create(nav_element, { style: nav_elem.style }, true);
				}
				
				if (index == 0) {
					nav_element.style.marginLeft = 0;
				}
				
				// return main navigation element
				return nav_element;
			})
		]
	});
	
}

function initNavigationApp(nav) {
	GLOBAL.navigation.on_save = (nav.on_save ? nav.on_save : () => {});
	if (nav.app_init) {
		nav.app_init();
	}
}

function closeApp(master, navigation = null) {
	
	// loop global navigation
	GLOBAL_NAVIGATION.forEach(nav_elem => {
		
		// if master tier, close app for old navigation
		if (master && nav_elem.close_app && nav_elem.name == navigation) {
			nav_elem.close_app();
		}
		
		// run on sub navigation if it exists
		if (nav_elem.sub_navigation) {
			
			// query for active sub navigation
			let active_sub_navigation = Select('.active_sub_navigation');
			if (active_sub_navigation) {
				active_sub_navigation = active_sub_navigation.innerHTML;
				
				// loop sub navigation
				nav_elem.sub_navigation.forEach(sub_nav_elem => {
					
					// close app for old navigation
					if (sub_nav_elem.close_app && sub_nav_elem.name == active_sub_navigation) {
						sub_nav_elem.close_app();
					}
					
				});
			}
		}
	});
}

function onSaveAction() {
	// edge case, if popup available, click popup save button
	if (Select('#popup_save_action')) {
		Select('#popup_save_action').click();
	} else {
		// else, run current app save if loader is not present within the app
		if (!Select('#ajax_loader')) {
			GLOBAL.navigation.on_save();
		}
	}
}

function openFileDropdown() {
	Select('#body', {
		children: [
			Create('div', {
				id: 'popup',
				onclick: function () {
					Select('#popup').remove();
				},
				children: [
					Create('div', {
						className: 'file_dropdown',
						children: [
							Create('div', {
								className: 'dropdown_action dropdown_save',
								innerHTML: 'Save',
								onclick: onSaveAction
							}),
							Create('div', {
								className: 'dropdown_action',
								innerHTML: 'Settings',
								onclick: function () {
									GLOBAL.navigation.on_save = updateProjectSettings,
									setNavigationSettings();
								}
							}),
							Create('div', {
								className: 'dropdown_action',
								innerHTML: 'Font Manager',
								onclick: function () {
									GLOBAL.navigation.on_save = updateFonts,
									setNavigationFontManager();
								}
							}),
							Create('div', {
								className: 'dropdown_action',
								innerHTML: 'P2P Server',
								onclick: function () {
									GLOBAL.navigation.on_save = ()=>{},
									setNavigationP2PServer();
								}
							}),
							Create('div', {
								className: 'dropdown_action',
								innerHTML: 'Whitelisted IP Addresses',
								onclick: function () {
									GLOBAL.navigation.on_save = updateWhitelistedIPs,
									alterWhitelistedIPs();
								}
							})
						]
					})
				]
			})
		]
	})
}