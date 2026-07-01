function createPopUp(title, content, on_save, image_editor = false) {
	
	Select('#body').appendChild(Create('div', {
		id: 'popup',
		className: (image_editor ? 'image_editor_popup' : ''),
		children: [
			Create('div', {
				className: image_editor ? 'popup_inner_image_editor' : 'popup_inner',
				children: [
					Create('div', {
						className: 'popup_title_bar',
						children: [
							Create('div', {
								className: 'popup_title',
								innerHTML: title
							}),
							Create('div', {
								className: 'popup_close',
								innerHTML: '&times;',
								onclick: function () {
									closePopup();
								}
							}),
							Create('br', { style: { clear: 'both' }})
						]
					}),
					Create('form', {
						id: 'popup_form_data',
						onsubmit: function () {
							return false;
						},
						children: [
							content
						]
					}),
					Create('div', {
						className: 'popup_save_bar',
						children: [
							Create('button', {
								type: 'button',
								innerHTML: 'Save',
								id: 'popup_save_action',
								onclick: () => {
									on_save(formToObj('popup_form_data'))
								}
							})
						]
					})
				]
			})
		]
	}));
}

function closePopup() {
	if (Select('#popup')) {
		Select('#popup').remove();
	}
}