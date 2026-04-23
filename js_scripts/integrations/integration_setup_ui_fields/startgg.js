function getStartGGEntryUI() {
	return Create('div', {
		children: [
			Create('label', {
				innerHTML: 'Start GG Tournament Slug (e.g. www.start.gg/tournament/<strong>elite-smash-fridays</strong>/details)',
				children: [
					Create('input', {
						type: 'text',
						name: 'tournament_slug',
						value: GLOBAL.active_project.settings?.integrations?.startgg?.tournament_slug || ''
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
						value: GLOBAL.active_project.settings?.integrations?.startgg?.auth_token || ''
					})
				]
			}),
			Create('br'),
			Create('button', {
				type: 'button',
				innerHTML: 'Quick Import',
				onclick: function () {
					let quickstart = new startgg;
					quickstart.run(true);
				}
			})
		]
	});
}