function setNavigationIntegrations() {

	Select('#main', {
		innerHTML: '',
		children: [
			Create('div', {
				className: 'block',
				style: {
					height: '100%'
				},
				children: [
					Create('div', {
						className: 'row',
						children: [
							Create('div', {
								className: 'col',
								style: {
									width: '30%',
									height: '100%'
								},
								children: [
									Create('div', {
										children: [
											Create('h3', {
												innerHTML: 'Integrations'
											})
										]
									}),
									Create('input', {
										type: 'text',
										placeholder: 'Search...',
										onkeyup: function () {
											searchPageItemList(this.value);
										}
									}),
									Create('div', {
										id: 'integration_list',
										style: {
											height: 'calc(100% - 150px)',
											overflowY: 'scroll'
										},
										children: Object.keys(INTEGRATIONS).map(key => {
											if (INTEGRATIONS[key].ui !== null) {
												return Create('div', {
													innerHTML: INTEGRATIONS[key].display,
													className: 'selection_list_block',
													onclick: () => { setupIntegrationsInput(key); }
												});
											} else {
												return Create('div');
											}
										})
									})
								]
							}),
							Create('div', {
								className: 'col',
								id: 'integration_manager_form_block',
								style: {
									width: '70%',
									height: '100%',
									overflowY: 'scroll',
									paddingTop: '88px'
								}
							})
						]
					})
				]
			})
		]
	});
		
}

function setupIntegrationsInput(key) {
	Select('#integration_manager_form_block', {
		innerHTML: '',
		children: [
			Create('form', {
				id: 'integration_creation_form',
				children: [
					Create('input', {
						type: 'hidden',
						name: 'integration_id',
						value: key
					}),
					INTEGRATIONS[key].ui()
				]
			})
		]
	})
}

function updateIntegrationData() {
	
	// use form style capture to easily inherit form capture methods
	let form_details = formToObj('integration_creation_form');
	
	// append application
	form_details.application = 'update_integration_data';
	
	// append project uid
	form_details.uid = GLOBAL.active_project.uid;
	
	// update server-side asset details, then call back to same scope function to save changes locally
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status && data.status) {
			GLOBAL.active_project.settings.integrations[data.integration_id] = data.complete_return;
		} else {
			notify(data.msg)
		}
		
	}, 'body');
}