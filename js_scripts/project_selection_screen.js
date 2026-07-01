function generateprojectSelectionScreen() {
	
	if (GLOBAL.project_registry == null) {
		
		// get project registration
		ajax('POST', '/requestor.php', {
			application: 'load_project_registration',
		}, (status, data) => {
			if (status) {
				// stash registry then circle back around and generate UI
				GLOBAL.project_registry = data.msg;
				generateprojectSelectionScreen();
			}
		}, 'body');
		return;
		
	}
	
	// hide navigation
	Select('.navigation').style.display = 'none';
	
	Select('#main', {
		innerHTML: '',
		children: [
			Create('div', {
				className: 'project_selection_box',
				children: [
					Create('img', {
						className: 'logo',
						src: 'logo.png'
					}),
					Create('label', {
						innerHTML: 'Projects',
						children: [
							Create('select', {
								id: 'project_uid_selection',
								children: Object.keys(GLOBAL.project_registry).map(key => {
									return Create('option', {
										innerHTML: GLOBAL.project_registry[key],
										value: key
									});
								})
							})
						]
					}),
					Create('button', {
						type: 'button',
						innerHTML: '+ Create New',
						style: {
							float: 'left'
						},
						onclick: projectCreationDialog
					}),
					Create('button', {
						type: 'button',
						className: 'main_button',
						innerHTML: 'Load project',
						style: {
							float: 'right'
						},
						onclick: function () {
							let uid = Select('#project_uid_selection').value;
							if (uid) {
								ajax('POST', '/requestor.php', {
									application: 'load_project_data',
									uid: uid
								}, streamDataLoaded, 'body');
							}
						}
					}),
					Create('br', {
						style: {
							clear: 'both'
						}
					}),
					Create('div', {
						className: 'version_text',
						innerHTML: VERSION+ ' <span class="click_to_update">(check for update)</span>',
						onclick: function () {
							ajax('POST', '/php_apps/integrations/bypassCORS.php', {
								request: JSON.stringify({
									url: 'https://raw.githubusercontent.com/Kapenike/FSDImages/main/version.txt',
									method: 'get'
								})
							}, (status, msg) => {
								if (status && msg.status) {
									if (msg.msg != VERSION) {
										notify({
												text: 'A new version of FSDImages is available!<br /><strong>'+msg.msg+'</strong><br /><br /><strong>IMPORTANT!</strong> Choosing to update now will shutdown the application, update will only take a few second. You must manually re-start the application.',
												confirm: 'Update Now',
												cancel: 'Cancel'
											},
											() => {
												ajax('POST', '/requestor.php', {
													application: 'update_application',
												});
												document.body.innerHTML = 'Updating ... please re-start your application after.';
											},
											() => {}
										);
									} else {
										notify('Your current application ia already up-to-date!');
									}
								} else {
									notify('Failed to request version from FSDImages Git Repository :(')
								}
							}, 'body');
						}
					})
				]
			})
		]
	});
	
}

function projectCreationDialog() {
	Select('#main', {
		innerHTML: '',
		children: [
			Create('div', {
				className: 'project_selection_box',
				children: [
					Create('img', {
						className: 'logo',
						src: 'logo.png'
					}),
					Create('label', {
						innerHTML: 'Project Name',
						children: [
							Create('input', {
								id: 'project_uid_selection',
								type: 'text'
							})
						]
					}),
					Create('button', {
						type: 'button',
						className: 'small_button',
						innerHTML: 'Return to Project Selection',
						style: {
							float: 'left',
							backgroundColor: '#444444'
						},
						onclick: generateprojectSelectionScreen
					}),
					Create('button', {
						type: 'button',
						className: 'main_button',
						innerHTML: 'Create project',
						style: {
							float: 'right'
						},
						onclick: function () {
							let project_name = Select('#project_uid_selection').value;
							if (project_name != '') {
								ajax('POST', '/requestor.php', {
									application: 'create_project',
									project_name: project_name
								}, (status, data) => {
									if (status && data.status) {
										GLOBAL.project_registry[data.uid] = project_name;
										ajax('POST', '/requestor.php', {
											application: 'load_project_data',
											uid: data.uid
										}, streamDataLoaded, 'body');
									}
								}, 'body');
							}
						}
					}),
					Create('br', {
						style: {
							clear: 'both'
						}
					})
				]
			})
		]
	});
}