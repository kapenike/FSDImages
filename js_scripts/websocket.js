// web socker controller tool
class wsct {
	
	connection = null;
	details = null;
	status = false;
	state = 'await_control';
	clients = [];
	project_overlay_pairs = {};
	obs_connection = null;
	
	constructor() {
		
		// detect if server is already running, then stash data and connect websocket
		ajax('POST', '/requestor.php', { application: 'P2P_is_running' }, (v, data) => {
			if (v && data) {
				this.details = data;
				this.status = true;
				this.connect();
			}
		});
		
	}
	
	// start public web socket and http server
	start() {
		ajax('POST', '/requestor.php', { application: 'P2P_start' }, (v, data) => {
			if (v && data) {
				this.details = data;
				this.status = true;
				updateServerStatus();
				setTimeout(() => this.connect(), 500);
			}
		});
	}
	
	// stop public web socket and http server
	stop() {
		ajax('POST', '/requestor.php', { application: 'P2P_kill' }, (v, data) => {
			this.connection = null;
			this.status = false;
			this.details = null;
			this.state = 'await_control';
			this.clients = [];
			generateConnectionList();
			updateServerStatus();
		}, 'main');
	}
	
	connect() {
		
		// controller connection init
		this.connection = new WebSocket('ws://'+this.details.ipv4+':'+this.details.ws_port);
		
		// validate controller status
		this.connection.addEventListener('open', (event) => {
			this.connection.send(JSON.stringify({
				state: 'connect',
				controller_key: this.details.controller_key
			}));
		});

		// listen for communication from web socket server
		this.connection.addEventListener('message', (event) => {
			
			let data = JSON.parse(event.data);

			// if awaiting control status
			if (this.state == 'await_control') {
				if (data.upgrade_to_controller) {
					this.state = 'control';
					this.clients = data.clients;
					generateConnectionList();
				}
			} else if (this.state == 'control') {

				if (data.type && data.type == 'disconnect') {
					
					// remove disconnected client from clients list
					this.clients.splice(this.clients.findIndex(x => x.uid == data.uid), 1);
					generateConnectionList();
					
				} else if (data.ip) {
					
					// new connection
					this.clients.push(data);
					generateConnectionList();
					
				}
			}
			
		});
		
		
	}
	
	obsconnect() {
		if (this.status == true && this.state == 'control' && GLOBAL.active_project.settings.obs_3pa_enabled) {
			this.connection.send(JSON.stringify({
				action: 'init_obs_controller',
				project_uid: GLOBAL.active_project.uid
			}));
		}
	}
	
}
const P2P_SERVER = new wsct();
