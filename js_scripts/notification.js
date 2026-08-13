function notify(message, confirm = ()=>{}, cancel = ()=>{}) {
	
	let is_obj = isObject(message);
	let text = is_obj ? message.text : message;
	let confirm_text = is_obj ? message.confirm : 'Confirm';
	let cancel_text = is_obj ? message.cancel : 'Cancel';
	
	Select('#body').appendChild(Create('div', {
		id: 'notif_popup',
		children: [
			Create('div', {
				className: 'notification',
				children: [
					Create('div', {
						className: 'notification_message',
						innerHTML: text
					}),
					Create('div', {
						className: 'notification_actions',
						children: [
							Create('button', {
								type: 'button',
								style: {
									float: 'left'
								},
								className: 'main_button',
								innerHTML: confirm_text,
								onclick: () => {
									confirm();
									Select('#notif_popup').remove();
								}
							}),
							Create('button', {
								type: 'button',
								style: {
									float: 'right'
								},
								innerHTML: cancel_text,
								onclick: () => {
									cancel();
									Select('#notif_popup').remove();
								}
							})
						]
					})
				]
			})
		]
	}));
}