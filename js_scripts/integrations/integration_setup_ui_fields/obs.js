function getObsEntryUI() {
	return Create('div', {
		children: [
			Create('label', {
				innerHTML: 'Enable OBS Commands',
				children: [
					Create('input', {
						type: 'checkbox',
						name: 'enabled',
						value: 'true',
						checked: GLOBAL.active_project.settings?.integrations?.obs?.enabled
					})
				]
			}),
			Create('br'),
			Create('label', {
				innerHTML: 'OBS Websocket Host:Port',
				children: [
					Create('input', {
						type: 'text',
						name: 'location',
						value: GLOBAL.active_project.settings?.integrations?.obs?.location || ''
					})
				]
			}),
			Create('br'),
			Create('label', {
				innerHTML: 'OBS Websocket Password',
				children: [
					Create('input', {
						type: 'password',
						name: 'auth',
						onfocus: function () {
							this.type = 'text';
						},
						onblur: function () {
							this.type = 'password';
						},
						value: GLOBAL.active_project.settings?.integrations?.obs?.auth || ''
					})
				]
			})
		]
	});
}