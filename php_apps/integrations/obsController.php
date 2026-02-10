<?php

class obsController {
	
	public function handleObsWebsocketApiConnection($API_SERVER, $json) {
		
		// obtain connection details from project settings
		$obs_connection_details = json_decode(file_get_contents(getBasePath().'/data/'.$json->project_uid.'/container.json'))->settings;
		
		// split host and port
		$split_host_port = explode(':', $obs_connection_details->obs_websocket_location);

		// check if obs connection exists
		$found_obs_client = false;
		for ($i=1; $i<count($API_SERVER->client_details); $i++) {
			if ($API_SERVER->client_details[$i]->type == 'obs') {
				// if obs found and new connection is the same, will return
				if ($API_SERVER->client_details[$i]->host == $split_host_port[0] && $API_SERVER->client_details[$i]->host == $split_host_port[1]) {
					$found_obs_client = true;
				} else {
					// if not the same, close old in preparation of new connection
					$API_SERVER->closeClientConnection($i);
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
		
		// during initialization, obs socket connection must be in blocking mode so that the server hangs waiting on the handshake and authentication to complete
		// not ideal ... but nothing crazy for a locally ran application like this
		socket_set_block($socket);
		
		
		// save obs connection as a client and inject client details
		$API_SERVER->clients[] = $socket;
		$API_SERVER->client_details[] = (object)[
			'uid' => str_pad(++$API_SERVER->client_uid, 4, '0', STR_PAD_LEFT),
			'type' => 'obs',
			'ip' => $obs_connection_details->obs_websocket_location,
			'host' => $split_host_port[0],
			'port' => $split_host_port[1]
		];
		
		// handshake declaration as a "client"
		$header = $API_SERVER->serverHandshake($split_host_port[0], $split_host_port[1]);
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
		socket_write($socket, $API_SERVER->packageAsClient(json_encode((object)[
			'op' => 1,
			'd' => [
				'rpcVersion' => 1,
				'authentication' => $auth
			]
		])));
		
		// retrieve response to prevent blocking, can be ignored
		socket_read($socket, 2048);
		
		// obs socket connection can now be set as non blocking for standard operation
		socket_set_nonblock($socket);
		
		// notify controller of obs client
		$API_SERVER->notifyController($API_SERVER->client_details[count($API_SERVER->client_details)-1]);

	}
	
	public function sendObsCommand($API_SERVER, $json) {
	
		// find obs client and send command
		for ($i=1; $i<count($API_SERVER->client_details); $i++) {
			if (isset($API_SERVER->client_details[$i]) && $API_SERVER->client_details[$i]->type == 'obs') {
				
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
					socket_write($API_SERVER->clients[$i], $API_SERVER->packageAsClient(json_encode((object)[
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
					// socket must be (temporarily) put back into blocking mode to await response from OBS
					socket_set_block($API_SERVER->clients[$i]);
					$response = json_decode(substr(socket_read($API_SERVER->clients[$i], 2048), 4));
					$item_id = $response->d->responseData->sceneItemId;
					socket_set_nonblock($API_SERVER->clients[$i]);
					
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
				socket_write($API_SERVER->clients[$i], $API_SERVER->packageAsClient(json_encode($json->command)));
				
				break;
			}
		}
	}
	
}

?>