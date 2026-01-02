// api server controller tool
class api_controller {
	
	connection = null;
	details = null;
	status = false;
	state = 'await_control';
	clients = [];
	project_overlay_pairs = {};
	
	constructor() {
		
		// detect if server is already running, then stash data and connect websocket
		ajax('POST', '/requestor.php', { application: 'api_is_running' }, (v, data) => {
			if (v && data) {
				this.details = data;
				this.status = true;
				this.connect();
			}
		});
		
	}
	
	// start public api and http server
	start() {
		ajax('POST', '/requestor.php', { application: 'api_start' }, (v, data) => {
			if (v && data) {
				this.details = data;
				this.status = true;
				updateServerStatus();
				setTimeout(() => this.connect(), 500);
				setTimeout(() => this.obsconnect(), 2500);
			}
		}, 'body');
	}
	
	// stop public api and http server
	stop() {
		ajax('POST', '/requestor.php', { application: 'api_kill' }, (v, data) => {
			this.connection = null;
			this.status = false;
			this.details = null;
			this.state = 'await_control';
			this.clients = [];
			generateConnectionList();
			updateServerStatus();
		}, 'body');
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

		// listen for communication from api server
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
					
				} else if (data.uid) {
					
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
const API_SERVER = new api_controller();
