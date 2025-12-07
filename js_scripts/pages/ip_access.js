function alterWhitelistedIPs() {
	
	// request whitelisted ips
	ajax('POST', '/requestor.php', { application: 'request_whitelisted_ips' }, (status, data) => {
		if (status && data.status) {
			Select('#main', {
				innerHTML: '',
				children: [
					Create('div', {
						className: 'block',
						children: [
							Create('form', {
								id: 'white_listed_ips',
								children: [
									Create('h3', {
										innerHTML: 'External Application Whitelisted IPv4 Addresses'
									}),
									Create('div', {
										id: 'ipv4_list',
										children: (data.ipv4 == null ? [] : data.ipv4).map(ip => {
											return newIpNode(ip);
										})
									}),
									Create('div', {
										className: 'create_data_key',
										innerHTML: '+ Create New Whitelist IPv4 Address',
										onclick: function () {
											Select('#ipv4_list').appendChild(newIpNode());
										}
									})
								]
							})
						]
					})
				]
			});
		} else {
			notify(
				{
					text: 'Only the local machine hosting this application can whitelist IP addresses.',
					confirm: 'Ok',
					cancel: 'OkAy'
				}
			);
		}
	}, 'body');
		
}

function newIpNode(ip = '') {
	return Create('div', {
		className: 'block',
		children: [
			Create('div', {
				className: 'remove_data_key',
				style: {
					float: 'right',
					marginRight: '-27px'
				},
				innerHTML: '&times;',
				onclick: function () {
					this.parentNode.remove();
				}
			}),
			Create('input', {
				name: 'ipv4_addr[]',
				type: 'text',
				value: ip
			})
		]
	});
}

function updateWhitelistedIPs() {
	
	// use form style capture to easily inherit form capture methods
	let form_details = formToObj('white_listed_ips');
	
	// append application
	form_details.application = 'update_whitelisted_ips';
	
	// update
	ajax('POST', '/requestor.php', form_details, (status, data) => {
		
		if (status) {

			// nothin
			
		}
		
	}, 'body');
}