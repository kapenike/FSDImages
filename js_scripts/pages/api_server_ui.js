function setNavigationApiServer() {

	// request project overlay pairs before showing application
	ajax('POST', '/requestor.php', {
		application: 'request_project_overlay_pairs'
	}, (status, data) => {
		if (status) {
			
			API_SERVER.project_overlay_pairs = data.msg;
			
			Select('#main', {
				innerHTML: '',
				children: [
					Create('div', {
						className: 'block',
						children: [
							Create('div', {
								id: 'server_status',
								className: 'row',
								style: {
									textAlign: 'center'
								},
								innerHTML: ''
							})
						]
					}),
					Create('div', {
						id: 'connection_list'
					})
				]
			});
			
			updateServerStatus();
			generateConnectionList();
	
		}
	}, 'body');
	
	
		
}

function generateConnectionList() {
	// create list from non server, non controller clients
	if (Select('#connection_list')) {
		Select('#connection_list', {
			innerHTML: '',
			children: API_SERVER.clients.map((client, index) => {
				if (client == null || client.type != 'controlled_client') {
					return Create('div');
				}
				return Create('div', {
					className: 'row block',
					children: [
						Create('div', {
							className: 'col',
							style: {
								width: '10%',
							},
							innerHTML: client.uid
						}),
						Create('div', {
							className: 'col',
							style: {
								width: '24%',
							},
							innerHTML: client.ip
						}),
						Create('div', {
							className: 'col',
							style: {
								width: '33%'
							},
							children: [
								Create('select', {
									data: index,
									onchange: function () {
										API_SERVER.clients[this.data].project_uid = this.value;
										Select('#project_overlay_server_pair_list_'+this.data, {
											innerHTML: '',
											children: [null, ...API_SERVER.project_overlay_pairs[this.value].overlays].map(v => {
												return Create('option', {
													innerHTML: v == null ? ' ------ ' : v,
													value: v == null ? '' : v
												});
											})
										});
									},
									children: [null, ...Object.keys(API_SERVER.project_overlay_pairs)].map(v => {
										return Create('option', {
											innerHTML: v == null ? ' ------ ' : API_SERVER.project_overlay_pairs[v].title,
											value: v == null ? '' : v,
											selected: client.project_uid == v
										});
									})
								})
							]
						}),
						Create('div', {
							className: 'col',
							style: {
								width: '33%'
							},
							children: [
								Create('select', {
									id: 'project_overlay_server_pair_list_'+index,
									data: index,
									onchange: function () {
										if (API_SERVER.clients[this.data].listeners.overlays.length == 0) {
											API_SERVER.clients[this.data].listeners.overlays.push(this.value);
										}
										API_SERVER.clients[this.data].listeners.overlays[0] = this.value;
										if (this.value != '') {
											API_SERVER.connection.send(JSON.stringify({
												action: 'client_reinit',
												client_uid: API_SERVER.clients[this.data].uid,
												project_uid: API_SERVER.clients[this.data].project_uid,
												overlay: API_SERVER.clients[this.data].listeners.overlays[0]
											}));
										}
									},
									children: (client.project_uid == null ? [] : [null, ...API_SERVER.project_overlay_pairs[client.project_uid].overlays]).map(v => {
										return Create('option', {
											innerHTML: v == null ? ' ------ ' : v,
											value: v == null ? '' : v,
											selected: client.listeners.overlays.includes(v)
										});
									})
								})
							]
						})
					]
				});
			})
		});
	}
}

function commandServer() {
	if (API_SERVER.status) {
		API_SERVER.stop();
	} else {
		API_SERVER.start();
	}
}

function updateServerStatus() {
	if (Select('#server_status')) {
		Select('#server_status', {
			innerHTML: '',
			children: [
				Create('div', {
					className: 'col',
					style: {
						width: '20%',
						height: '100px',
						backgroundColor: (API_SERVER.status ? '#B22222' : '#5bb450'),
						color: '#ffffff',
						textAlign: 'center',
						cursor: 'pointer',
					},
					onclick: commandServer,
					innerHTML: '<br /><span style="font-size:22px; font-weight: bold">'+(API_SERVER.status ? 'STOP' : 'START')+'</span><br />server'
				}),
				(API_SERVER.status
					?	Create('div', {
							children: [
								Create('div', {
									className: 'col',
									style: {
										width: '40%',
										height: '100px'
									},
									children: [
										Create('label', {
											innerHTML: 'Client URL',
											children: [
												Create('input', {
													type: 'text',
													readOnly: 'true',
													onclick: function () { this.focus(); this.select() },
													type: 'text',
													value: 'http://'+API_SERVER.details.ipv4+':'+API_SERVER.details.client_port
												})
											]
										})
									]
								}),
								Create('div', {
									className: 'col',
									style: {
										width: '40%',
										height: '100px'
									},
									children: [
										Create('label', {
											innerHTML: '<div>Generate Auto-Overlay Connect URL</div>',
											children: [
												Create('select', {
													style: {
														width: '50%',
														float: 'left',
														marginBottom: '0'
													},
													id: 'generate_auto_connect_overlay_project_id',
													onchange: function () {
														Select('#generate_auto_connect_overlay_slug', {
															innerHTML: '',
															children: [null, ...API_SERVER.project_overlay_pairs[this.value].overlays].map(v => {
																return Create('option', {
																	innerHTML: v == null ? '- Overlay -' : v,
																	value: v == null ? '' : v
																});
															})
														});
													},
													children: [null, ...Object.keys(API_SERVER.project_overlay_pairs)].map(v => {
														return Create('option', {
															innerHTML: v == null ? '- Project -' : API_SERVER.project_overlay_pairs[v].title,
															value: v == null ? '' : v
														});
													})
												}),
												Create('select', {
													style: {
														width: '50%',
														float: 'left',
														marginBottom: '0'
													},
													id: 'generate_auto_connect_overlay_slug',
													onchange: function () {
														Select('#generate_auto_connect_overlay_output').value = 'http://'+API_SERVER.details.ipv4+':'+API_SERVER.details.client_port+'?uid='+Select('#generate_auto_connect_overlay_project_id').value+'&overlay='+this.value
													}
												}),
												Create('input', {
													id: 'generate_auto_connect_overlay_output',
													type: 'text',
													readOnly: 'true',
													onclick: function () { this.focus(); this.select() },
													type: 'text',
													value: ''
												})
											]
										})
									]
								})
							]
						})
					: Create('div')
				)
			]
		});
	}
}