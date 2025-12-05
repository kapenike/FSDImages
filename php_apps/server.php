<?php

class server {
	
	private $win_php = '';
	private $host_used_ip = null;
	
	public $OS = null;
	public $ipv4 = null;
	public $websocket_port = '8137';
	public $client_port = '8136';
	
	function __construct() {
		$this->OS = (PHP_OS_FAMILY == 'Windows' ? 'Windows' : 'Superior');
		$this->win_php = $this->cleanCLIPath(getBasePath().'\php\php.exe');
		// get local machines ipv4, default to 127.0.0.1 if no network connected
		if ($this->OS == 'Windows') {
			$lookup = shell_exec('ipconfig');
			if (str_contains($lookup, 'IPv4 Address. . . . . . . . . . . :')) {
				$this->ipv4 = trim(explode("\n", explode('IPv4 Address. . . . . . . . . . . :', $lookup)[1])[0]);
			} else {
				$this->ipv4 = '127.0.0.1';
			}
		} else {
			$lookup = shell_exec('ip -4 addr show');
			if (str_contains($lookup, 'inet ') && str_contains($lookup, ' brd')) {
				$this->ipv4 = trim(explode('/', explode(' brd', explode('inet ', $lookup)[2])[0])[0]);
			} else {
				$this->ipv4 = '127.0.0.1';
			}
		}
	}
	
	function cleanCLIPath($v) {
		if ($this->OS == 'Windows') {
			return str_replace(' ','^ ',str_replace('/','\\',$v));
		} else {
			return str_replace(' ','\ ',$v);
		}
	}
	
	function requestConnectionDetails() {
		return (object)[
			'ipv4' => $this->ipv4,
			'ws_port' => $this->websocket_port,
			'client_port' => $this->client_port,
			'controller_key' => $this->getServerData()->controller_key
		];
	}
	
	function checkHostPort($host, $port) {
		// check if anything is currently running on host:port
		if (@fsockopen($host, $port, $errno, $errstr, 5)) {
			return true;
		}
		return false;
	}
	
	function getServerData($reset = false) {
		// create server data JSON file if it doesn't exist or on reset
		if ($reset == true || !file_exists(getBasePath().'/php_apps/app_data/server_data.json')) {
			file_put_contents(getBasePath().'/php_apps/app_data/server_data.json', json_encode((object)[
				'host_launch_ip' => null,
				'host_pid' => null,
				'ws_pid' => null,
				'client_pid' => null,
				'controller_key' => null,
				'host_running_on' => null,
				'client_running_on' => null
			]));
		}
		// return server data
		return json_decode(file_get_contents(getBasePath().'/php_apps/app_data/server_data.json'));
	}
	
	function updateServerData($key, $value) {
		// request server data
		$server_data = $this->getServerData();
		// update server data by key
		$server_data->{$key} = $value;
		// save server data
		file_put_contents(getBasePath().'/php_apps/app_data/server_data.json', json_encode($server_data));
		return true;
	}
	
	function windowsRequestPID($command) {
		// search for php launched process with initial commandLine similar to $command
		$pids = array_filter(explode("\n", shell_exec('powershell.exe -Command "Get-CimInstance Win32_Process -Filter \'Name=\\"php.exe\\"\' | Where-Object {$_.CommandLine -like \'*'.$command.'*\'} | Select-Object ProcessId"')));
		// pop and trim last for kill
		$pid = array_pop($pids);
		// if not null and is numeric, return
		if ($pid != null && trim(is_numeric($pid))) {
			return trim($pid);
		}
		return false;
	}
	
	function launchApplication($host_launch_ip) {
		
		// stash host launch ip for later kill
		$this->updateServerData('host_launch_ip', $host_launch_ip);
		
		// ensure something is not already running on the specified ip:port
		if (!$this->checkHostPort(app('FSDImages')->application_ip, app('FSDImages')->application_port)) {
			
			// launch application on specified IP (local or external)
			if ($this->OS == 'Windows') {
				
				// run non-returning command to start application on set IP
				pclose(popen('start /B '.$this->win_php.' -S '.app('FSDImages')->application_ip.':'.app('FSDImages')->application_port.' -t '.$this->cleanCLIPath(getBasePath().'/').' > '.getBasePath().'output.log 2>&1', 'r'));
		
			} else {
				
				// run application and stash PID for shutdown
				$host_pid = trim(shell_exec('php -S '.app('FSDImages')->application_ip.':'.app('FSDImages')->application_port.' -t '.$this->cleanCLIPath(getBasePath().'/').' > /dev/null 2>&1 & echo $!'));
				$this->updateServerData('host_pid', $host_pid);
			
			}
			
			// stash ip:port application is running on
			$this->updateServerData('host_running_on', app('FSDImages')->application_ip.':'.app('FSDImages')->application_port);
			
		
		}
		
		return app('FSDImages')->application_ip.':'.app('FSDImages')->application_port;
	}
	
	function stopApplication() {
		
		// request stashed host ip and pid
		$server_data = $this->getServerData();
		
		// ensure application is running
		if ($this->checkHostPort($server_data->host_launch_ip, app('FSDImages')->application_port)) {
			if ($this->OS == 'Windows') {
				// search based on initial declaration of application ip and port
				$host_pid = $this->windowsRequestPID($server_data->host_launch_ip.':'.app('FSDImages')->application_port.' -t ');
				if ($host_pid) {
					shell_exec('taskkill /F /PID '.$host_pid);
				} else {
					return false;
				}
			} else {
				// request host process PID and kill
				shell_exec('kill '.$server_data->host_pid);
				// nullify host pid
				$this->updateServerData('host_pid', null);
			}
		}
		
		// null application running on
		$this->updateServerData('host_running_on', null);
		// null host launch on
		$this->updateServerData('host_launch_ip', null);
		
		return true;
	}
	
	function isWebsocketServerRunning() {
		return $this->checkHostPort($this->ipv4, $this->client_port);
	}
	
	function launchWebsocketServer() {
		
		// ensure something is not already running on the client ip:port
		if (!$this->isWebsocketServerRunning()) {
			
			// generate new controller key for new instance of a websocket server
			$this->updateServerData('controller_key', bin2hex(random_bytes(16)));
			
			// launch websocket server and client on ipv4:port
			if ($this->OS == 'Windows') {
				
				// launch websocket server
				pclose(popen('start /B '.$this->win_php.' '.$this->cleanCLIPath(getBasePath().'\p2p\web_socket_server.php').' > NUL 2>&1', 'r'));
				
				// launch client
				pclose(popen('start /B '.$this->win_php.' -S '.$this->ipv4.':'.$this->client_port.' -t '.$this->cleanCLIPath(getBasePath().'\p2p\client').' > NUL 2>&1', 'r'));
		
			} else {
				
				// launch websocket server and save PID
				$this->updateServerData('ws_pid', trim(shell_exec('php '.$this->cleanCLIPath(getBasePath().'/p2p/web_socket_server.php').' > /dev/null 2>&1 & echo $!')));
				
				// launch client and save PID
				$this->updateServerData('client_pid', trim(shell_exec('php -S '.$this->ipv4.':'.$this->client_port.' -t '.$this->cleanCLIPath(getBasePath().'/p2p/client').' > /dev/null 2>&1 & echo $!')));
			
			}
			
			// stash ip:port client is running on
			$this->updateServerData('client_running_on', $this->ipv4.':'.$this->client_port);
		
		}
		
		return $this->ipv4.':'.$this->client_port;
		
	}
	
	function stopWebsocketServer() {
		
		// ensure websocket server is running
		if ($this->checkHostPort($this->ipv4, $this->client_port)) {
			if ($this->OS == 'Windows') {
				
				// query for client process and kill
				$client_pid = $this->windowsRequestPID($this->ipv4.':'.$this->client_port.' -t');
				if ($client_pid) {
					shell_exec('taskkill /F /PID '.$client_pid);
				}
				
				// query for websocket server process and kill
				$ws_pid = $this->windowsRequestPID('web_socket_server.php');
				if ($ws_pid) {
					shell_exec('taskkill /F /PID '.$ws_pid);
				}
				
			} else {
				
				// request client and websocket server PIDS
				$server_data = $this->getServerData();
				
				// kill client
				shell_exec('kill '.$server_data->client_pid);
				
				// kill websocket server
				shell_exec('kill '.$server_data->ws_pid);
				
				// nullify both pids
				$this->updateServerData('ws_pid', null);
				$this->updateServerData('client_pid', null);
				
			}
		}
		
		// null client running on
		$this->updateServerData('client_running_on', null);
		
		return true;
		
	}
	
}

?>