<?php

// although not in the same directory as app.php, this script is called only via shell_exec from requestor.php or start.php which both are located in the main directory where this application is located
require('app.php');

class websocket {
	
	private $running = false;
	private $controller_key = null;
	private $clients = [];
	private $client_details = [];
	private $client_uid = 0;
	
	public $server = null;
	
	public function __construct() {
		
		// load configuration
		$config = app('server')->requestConnectionDetails();
		
		// stash controller key
		$this->controller_key = $config->controller_key;
		
		// setup server
		$this->server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
		socket_set_option($this->server, SOL_SOCKET, SO_REUSEADDR, 1);
		socket_bind($this->server, $config->ipv4, $config->ws_port);
		socket_listen($this->server);
		
		// add server to client process list
		$this->clients[] = $this->server;
		$this->client_details[] = null;
		
		// server is running
		$this->running = true;
		
		// start server
		$this->runServer();
		
	}
	
	private function clientHandshake($handshake) {

		preg_match('#Sec-WebSocket-Key: (.*)\r\n#', $handshake, $matches);
		$headers = "HTTP/1.1 101 Switching Protocols\r\n";
		$headers .= "Upgrade: websocket\r\n";
		$headers .= "Connection: Upgrade\r\n";
		$headers .= "Sec-WebSocket-Version: 13\r\n";
		$headers .= "Sec-WebSocket-Accept: ".base64_encode(pack('H*', sha1($matches[1].'258EAFA5-E914-47DA-95CA-C5AB0DC85B11')))."\r\n\r\n";
		return $headers;
		
	}
	
	private function serverHandshake($host, $port) {
		
		$key = base64_encode(random_bytes(16));
		$header = "GET / HTTP/1.1\r\n";
		$header .= "Host: ".$host.":".$port."\r\n";
		$header .= "Upgrade: websocket\r\n";
		$header .= "Connection: Upgrade\r\n";
		$header .= "Sec-WebSocket-Key: $key\r\n";
		$header .= "Sec-WebSocket-Protocol: obswebsocket.json\r\n";
		$header .= "Sec-WebSocket-Version: 13\r\n\r\n";
		return $header;
		
	}
	
	private function removeMask($v) {
		
		$len = ord($v[1]) & 127;
		
		if ($len == 126) {
			$masks = substr($v, 4, 4);
			$data = substr($v, 8);
		} else if ($len == 127) {
			$masks = substr($v, 10, 4);
			$data = substr($v, 14);
		} else {
			$masks = substr($v, 2, 4);
			$data = substr($v, 6);
		}
		
		$v = '';
		for ($i=0; $i<strlen($data); ++$i) {
			$v .= $data[$i] ^ $masks[$i%4];
		}
		
		return $v;
	}
	
	// generate a send header and append to content
	private function package($v) {
		
		$b1 = 0x80 | (0x1 & 0x0f);
		
		$len = strlen($v);
		
		if ($len <= 125) {
			$header = pack('CC', $b1, $len);
		} else if ($len > 125 && $len < 65536) {
			$header = pack('CCn', $b1, 126, $len);
		} else if ($len >= 65536) {
			// this doesn't actually work :/ more discovery needed
			$header = pack('CCNN', $b1, 127, $len);
		}
		
		return $header.$v;
		
	}
	
	// for the condition of the websocket server acting as a client to obs websocket api
	private function packageAsClient($v) {
		
		$b1 = 0x81;
		$length = strlen($v);

		if ($length <= 125) {
			$header = pack('CC', $b1, $length | 0x80);
		} elseif ($length <= 65535) {
			$header = pack('CCn', $b1, 126 | 0x80, $length);
		} else {
			$header = pack('CCNN', $b1, 127 | 0x80, 0, $length);
		}

		// payload must be masked unlike from server to client
		$mask = random_bytes(4);
		$masked_data = '';
		for ($i = 0; $i < $length; $i++) {
			$masked_data .= $v[$i] ^ $mask[$i % 4];
		}
		
		return $header.$mask.$masked_data;
		
	}
	
	private function handleNewConnection($client) {
		
		// add new connection to clients list
		$this->clients[] = $new_client = socket_accept($client);
		
		// identify client ip
		socket_getpeername($new_client, $ip);
		
		// init client details object
		$this->client_details[] = (object)[
			'ip' => $ip,
			'uid' => str_pad(++$this->client_uid, 4, '0', STR_PAD_LEFT),
			'state' => 'accept',
			'type' => null,
			'project_uid' => null,
			'listeners' => (object) [
				'data' => [],
				'overlays' => []
			]
		];
		
		// handshake to new client
		socket_write($new_client, $this->clientHandshake(socket_read($new_client, 1024)));
		
	}
	
	private function notifyController($data) {
		
		// loop clients
		foreach ($this->client_details as $index => $details) {
			
			if ($index == 0) {
				continue;
			}
			
			// if a controller exists, notify them of the disconnect
			if ($details->type == 'controller') {
				
				// notify controller
				socket_write($this->clients[$index], $this->package(json_encode($data)));
				break;
				
			}
			
		}
		
	}
	
	private function closeClientConnection($index) {
		
		// close socket connection
		socket_shutdown($this->clients[$index]);
		
		// if client is not server or controller
		if ($index > 0 && $this->client_details[$index]->type != 'controller' && $this->client_details[$index]->type != 'obs') {
			
			// notify controller of disconnect
			$this->notifyController([
				'type' => 'disconnect',
				'ip' => $this->client_details[$index]->ip,
				'uid' => $this->client_details[$index]->uid
			]);
			
		}
		
		// remove client and client details data from server
		array_splice($this->clients, $index, 1);
		array_splice($this->client_details, $index, 1);
		
	}
	
	private function sendNewClientInitData($index) {
		
		$client_details = $this->client_details[$index];

		$init_data = [
			'identifier' => $client_details->uid,
		];
		
		// if initializing data, append to initial response
		if ($client_details->project_uid != null && (count($client_details->listeners->data) > 0 || count($client_details->listeners->overlays) > 0)) {
			
			$init_data['project_uid'] = $client_details->project_uid;
			$init_data['data'] = (object)[];
			$init_data['overlays'] = [];

			if (count($client_details->listeners->data) > 0) {
				// request master data list using project id, boolean for a non exiting return
				$project = app('project')->load($client_details->project_uid, true);
				if ($project !== false) {
					$project = app('dataPathing')->convertAll($project);
					foreach ($client_details->listeners->data as $data_point) {
						$init_data['data']->{$data_point} = app('dataPathing')->getRealValue($project, '$var$'.$data_point.'$/var$');
					}
				}
			}
			
			if (count($client_details->listeners->overlays) > 0) {
				foreach ($client_details->listeners->overlays as $overlay_slug) {
					$init_data['overlays'][] = $overlay_slug;
				}
			}
		
		}

		socket_write($this->clients[$index], $this->package(json_encode($init_data)));
	}
	
	private function processInput($index, $json) {
		
		// read buffer must be valid json
		if (json_validate($json)) {
			
			$json = json_decode($json);
			
			// initial connection
			if (isset($json->state) && $json->state == 'connect' && $this->client_details[$index]->state == 'accept') {

				// if controller, log and confirm
				if (isset($json->controller_key)) {
					
					// check if a controller already exists, only one is allowed
					$controller_exists = false;
					for ($i=1; $i<count($this->client_details); $i++) {
						if ($this->client_details[$i]->type == 'controller') {
							$controller_exists = true;
							break;
						}
					}
					
					if (!$controller_exists && $json->controller_key == $this->controller_key) {
						
						// controller confirmed
						$this->client_details[$index]->type = 'controller';
						$this->client_details[$index]->state = 'accepted';
						
						// inform controller of control state and give list of current clients
						socket_write($this->clients[$index], $this->package(json_encode([
							'upgrade_to_controller' => true,
							'clients' => array_slice($this->client_details, 1) // exclude server connection when sending to controller
						])));
						
					} else {
						
						// controller denied, disconnect
						$this->closeClientConnection($index);
						return;
						
					}
					
				} else {
				
					// client connect
					$this->client_details[$index]->type = 'controlled_client';
					$this->client_details[$index]->state = 'accepted';
					
					// if client defines listeners, uncontrollable
					if (isset($json->self_controlled) && $json->self_controlled == true) {
						$this->client_details[$index]->type = 'uncontrolled_client';
					}
					
					// check for initial project uid declaration
					if (isset($json->project_uid)) {
						$this->client_details[$index]->project_uid = $json->project_uid;
					
						// check for initial data and overlay listener declaration
						if (isset($json->listeners)) {
							
							if (isset($json->listeners->data)) {
								$this->client_details[$index]->listeners->data = $json->listeners->data;
							}
							
							if (isset($json->listeners->overlays)) {
								$this->client_details[$index]->listeners->overlays = $json->listeners->overlays;
							}
							
						}
					
					}
					
					// send initialized project data to new client
					$this->sendNewClientInitData($index);
					
					// notify controller of new client
					$this->notifyController($this->client_details[$index]);
				
				}
				
			} else {
			
				if ($this->client_details[$index]->type == 'controller') {
					
					// controller notifying clients of overlay and data updates
					if ($json->action == 'overlay_data_updates') {
						
						foreach ($this->clients as $sub_index => $client) {
							if ($sub_index > 0 && $sub_index != $index && $this->client_details[$sub_index]->type != 'obs') {
								
								// intersecting overlay changes
								$overlay_changes = array_intersect($json->overlays, $this->client_details[$sub_index]->listeners->overlays);
								
								// intersecting data changes on key value pair structure
								$data_changes = (object)[];
								foreach ($json->data as $source => $value) {
									if (in_array($source, $this->client_details[$sub_index]->listeners->data)) {
										$data_changes->{$source} = $value;
									}
								}
								
								if (!empty($overlay_changes) || !empty((array)$data_changes)) {
									socket_write($this->clients[$sub_index], $this->package(json_encode((object)[
										'update' => (object)[
											'overlays' => array_values($overlay_changes),
											'data' => $data_changes
										]
									])));
								}
							}
						}
						
					} else if ($json->action == 'client_reinit') {
						
						// re-init controlled client overlay
						foreach ($this->clients as $sub_index => $client) {
							if ($sub_index > 0 && $sub_index != $index && $this->client_details[$sub_index]->uid == $json->client_uid) {
								$this->client_details[$sub_index]->project_uid = $json->project_uid;
								$this->client_details[$sub_index]->listeners->overlays = [$json->overlay];
								$this->sendNewClientInitData($sub_index);
								break;
							}
						}
						
					} else if ($json->action == 'init_obs_controller') {
						
						$this->handleObsWebsocketApiConnection($json);

					} else if ($json->action == 'obs_command') {
						
						// find obs client and send command
						for ($i=1; $i<count($this->client_details); $i++) {
							if (isset($this->client_details[$i]) && $this->client_details[$i]->type == 'obs') {
								
								// setting source visibility requires a request to obs for the sceneItemId
								$request_item_ids = [];
								
								// if op 6, single command, if op 8, look through batch command list for all source toggles
								if ($json->command->op == 6 && $json->command->d->requestType == 'SetSceneItemEnabled') {
									$request_item_ids[] = (object)['source' => $json->command->d->requestData->sourceName, 'scene' => $json->command->d->requestData->sceneName, 'index' => null];
								} else if ($json->command->op == 8) {
									for ($i2=0; $i2<count($json->command->d->requests); $i2++) {
										if ($json->command->d->requests[$i2]->requestType == 'SetSceneItemEnabled') {
											$request_item_ids[] = (object)['source' => $json->command->d->requests[$i2]->requestData->sourceName, 'scene' => $json->command->d->requests[$i2]->requestData->sceneName, 'index' => $i2];
										}
									}
								}
								
								// for each source toggle, convert source name to sceneItemId, why? because why make things easy
								foreach ($request_item_ids as $index => $item) {
									
									// request sceneItemId
									socket_write($this->clients[$i], $this->packageAsClient(json_encode((object)[
										'op' => 6,
										'd' => [
											'requestId' => $index+1,
											'requestType' => 'GetSceneItemId',
											'requestData' => [
												'sceneName' => $item->scene,
												'sourceName' => $item->source
											]
										]
									])));
									
									// get sceneItemId
									$response = json_decode(substr(socket_read($this->clients[$i], 2048), 4));
									$item_id = $response->d->responseData->sceneItemId;
									
									// inject sceneItemId
									if ($item->index === null) {
										$json->command->d->requestData->sceneItemId = $item_id;
										unset($json->command->d->requestData->sourceName);
									} else {
										$json->command->d->requests[$item->index]->requestData->sceneItemId = $item_id;
										unset($json->command->d->requests[$item->index]->requestData->sourceName);
									}
									
								}
								
								// write final command
								socket_write($this->clients[$i], $this->packageAsClient(json_encode($json->command)));
								
								// read response so read buffer is clear for normal operations
								socket_read($this->clients[$i], 2048);
								
								break;
							}
						}
						
					}

				}
			
			}
			
		}
		
	}
	
	private function handleObsWebsocketApiConnection($json) {
		
		// obtain connection details from project settings
		$obs_connection_details = json_decode(file_get_contents(getBasePath().'/data/'.$json->project_uid.'/container.json'))->settings;
		
		// split host and port
		$split_host_port = explode(':', $obs_connection_details->obs_websocket_location);

		// check if obs connection exists
		$found_obs_client = false;
		for ($i=1; $i<count($this->client_details); $i++) {
			if ($this->client_details[$i]->type == 'obs') {
				// if obs found and new connection is the same, will return
				if ($this->client_details[$i]->host == $split_host_port[0] && $this->client_details[$i]->host == $split_host_port[1]) {
					$found_obs_client = true;
				} else {
					// if not the same, close old in preparation of new connection
					$this->closeClientConnection($i);
				}
			}
		}
		if ($found_obs_client) {
			return;
		}
		
		// init socket connection to obs websocket api
		$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
		socket_connect($socket, $split_host_port[0], $split_host_port[1]);
		if ($socket == false) {
			// error connecting to obs, return
			// socket_strerror(socket_last_error($socket));
			return;
		}
		
		// save obs connection as a client and inject client details
		$this->clients[] = $socket;
		$this->client_details[] = (object)[
			'uid' => str_pad(++$this->client_uid, 4, '0', STR_PAD_LEFT),
			'type' => 'obs',
			'host' => $split_host_port[0],
			'port' => $split_host_port[1]
		];
		
		// handshake declaration as a "client"
		$header = $this->serverHandshake($split_host_port[0], $split_host_port[1]);
		socket_write($socket, $header, strlen($header));
		
		// get handshake back, can be ignored
		socket_read($socket, 2048);
		
		// retriev auth message
		$response = socket_read($socket, 2048);
		
		// if obs masks initial data
		if (!json_validate($response)) {
			$response = substr($response, 4);
		}

		// get json object
		$response = json_decode($response);
		
		// auth process
		$salt = $response->d->authentication->salt;
		$challenge = $response->d->authentication->challenge;
		$secret = base64_encode(hash('sha256', $obs_connection_details->obs_websocket_auth.$salt, true));
		$auth = base64_encode(hash('sha256', $secret.$challenge, true));
		
		// send back auth challenge
		socket_write($socket, $this->packageAsClient(json_encode((object)[
			'op' => 1,
			'd' => [
				'rpcVersion' => 1,
				'authentication' => $auth
			]
		])));
		
		// notify controller of obs client
		$this->notifyController($this->client_details[count($this->client_details)-1]);

	}

	private function runServer() {
		
		while ($this->running) {
			
			$read = $this->clients;
			$write = [];
			$except = [];
			
			// if no actions, continue
			if (socket_select($read, $write, $except, 1) < 1) {
				continue;
			}
			
			// handle client actions
			foreach ($this->clients as $index => $client) {
				
				// if no action on client, skip
				if (!in_array($client, $read)) {
					continue;
				}
				
				// if client is server, handle new connection
				if ($client == $this->server) {
					$this->handleNewConnection($client);
					continue;
				}
				
				// handle client sent data in blocks to prevent blocking
				$data = socket_read($client, 16384);
				
				// if socket_select passed empty read data, close connection identified
				if ($data === false || strlen($data) == 0) {
					
					$this->closeClientConnection($index);
					$index--;
					
				} else {
					
					// if obs, ignore
					if ($this->client_details[$index]->type == 'obs') {
						continue;
					}

					// process data
					$this->processInput($index, $this->removeMask($data));
					
					
				}
				
			}
			
		}
		
	}
	
}

// init websocket class
new websocket();