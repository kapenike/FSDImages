function getChallongeEntryUI() {
	return Create('div', {
		children: [
			Create('label', {
				innerHTML: 'Subdomain-Tournament ID',
				children: [
					Create('div', {
						style: {
							fontSize: '10px'
						},
						innerHTML: '(e.g.) worldbeyblade-iq6a6f11',
					}),
					Create('input', {
						type: 'text',
						name: 'tournament_id',
						value: GLOBAL.active_project.settings?.integrations?.challonge?.tournament_id || ''
					})
				]
			}),
			Create('br'),
			Create('label', {
				innerHTML: 'Developer Auth Token',
				children: [
					Create('div', {
						style: {
							fontSize: '10px'
						},
						innerHTML: 'Having issues finding your API key? Challonge has attempted to hide it for no reason, scroll to the very bottom of your API application page, well past the client ID and client secret fields. You\'ll see a button to generate an API v1 Key.',
					}),
					Create('input', {
						type: 'password',
						name: 'auth_token',
						onfocus: function () {
							this.type = 'text';
						},
						onblur: function () {
							this.type = 'password';
						},
						value: GLOBAL.active_project.settings?.integrations?.challonge?.auth_token || ''
					})
				]
			}),
			Create('br'),
			Create('label', {
				innerHTML: 'Preserve Attendee Info',
				children: [
					Create('select', {
						name: 'preserve_attendees',
						children: [
							Create('option', {
								innerHTML: 'Keep All Attendees and Update On Import Change',
								value: 'true',
								selected: GLOBAL.active_project.settings?.integrations?.challonge?.preserve_attendees == 'true'
							}),
							Create('option', {
								innerHTML: 'Remove Old Attendees',
								value: 'false',
								selected: GLOBAL.active_project.settings?.integrations?.challonge?.preserve_attendees == 'false'
							})
						]
					})
				]
			}),
			Create('br'),
			Create('button', {
				type: 'button',
				innerHTML: 'Quick Import Tournament',
				onclick: function () {
					updateIntegrationData((status) => {
						if (status) {
							let quickstart = new challonge;
							quickstart.run(true);
						}
					});
				}
			})
		]
	});
}