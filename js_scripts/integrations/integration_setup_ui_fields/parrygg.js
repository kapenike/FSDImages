function getParryGGEntryUI() {
	return Create('div', {
		children: [
			Create('label', {
				innerHTML: 'Parry GG Tournament Slug',
				children: [
					Create('input', {
						type: 'text',
						name: 'tournament_slug',
						value: GLOBAL.active_project.settings?.integrations?.parrygg?.tournament_slug || ''
					})
				]
			}),
			Create('br'),
			Create('label', {
				innerHTML: 'Developer Auth Token',
				children: [
					Create('input', {
						type: 'password',
						name: 'auth_token',
						onfocus: function () {
							this.type = 'text';
						},
						onblur: function () {
							this.type = 'password';
						},
						value: GLOBAL.active_project.settings?.integrations?.parrygg?.auth_token || ''
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
								selected: GLOBAL.active_project.settings?.integrations?.parrygg?.preserve_attendees == 'true'
							}),
							Create('option', {
								innerHTML: 'Remove Old Attendees',
								value: 'false',
								selected: GLOBAL.active_project.settings?.integrations?.parrygg?.preserve_attendees == 'false'
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
							let quickstart = new parrygg;
							quickstart.run(true);
						}
					});
				}
			})
		]
	});
}