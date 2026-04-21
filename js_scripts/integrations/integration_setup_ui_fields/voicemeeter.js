function getVoicemeeterEntryUI() {
	return Create('div', {
		children: [
			Create('label', {
				innerHTML: 'Enable Voicemeeter Commands',
				children: [
					Create('input', {
						type: 'checkbox',
						name: 'enabled',
						value: 'true',
						checked: GLOBAL.active_project.settings?.integrations?.voicemeeter?.enabled
					})
				]
			}),
			Create('br'),
			Create('label', {
				innerHTML: 'Voicemeeter Remote API DLL Location',
				children: [
					Create('input', {
						type: 'text',
						name: 'api_dll',
						value: GLOBAL.active_project.settings?.integrations?.voicemeeter?.api_dll || ''
					})
				]
			})
		]
	});
}