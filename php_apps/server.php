<?php

class server {
	
	private $win_php = '';
	private $host_used_ip = null;
	
	// ignore network adapters and launch on this ipv4
	private $override_ipv4 = null;
	
	public $OS = null;
	
	// launch configs
	public $local_host = 'localhost';
	public $host_port = '8000';
	public $websocket_port = '8137';
	public $client_port = '8136';

	function __construct() {
		// init OS and windows launch path
		$this->OS = (PHP_OS_FAMILY == 'Windows' ? 'Windows' : 'Superior');
		$this->win_php = $this->cleanCLIPath(getBasePath().'php\php.exe');
	}
	
	function requestIPv4() {
		
		// load server data, and then check if host is running. use that IPv4 if so under all circumstances
		$running_details = $this->getServerData();
		if ($running_details->ipv4 != null && $this->checkHostPort($running_details->ipv4, $this->host_port)) {
			return $running_details->ipv4;
		}
		
		// get local machines ipv4, prioritizes lan, wifi, then any other adapter, default to 127.0.0.1 if no network connected
		if ($this->OS == 'Windows') {
			// windows
			$lookup = shell_exec('ipconfig');
			if ($this->windowsRequestIPv4FromSection($lookup, 'Ethernet adapter Ethernet:')) {
				// check for lan adapter first
				$ipv4 = $this->windowsRequestIPv4FromSection($lookup, 'Ethernet adapter Ethernet:');
			} else if ($this->windowsRequestIPv4FromSection($lookup, 'Wireless LAN adapter Wi-Fi:')) {
				// check for wifi adapter second
				$ipv4 = $this->windowsRequestIPv4FromSection($lookup, 'Wireless LAN adapter Wi-Fi:');
			} else if (str_contains($lookup, 'IPv4 Address. . . . . . . . . . . :')) {
				// lastly check for any valid ipv4 from potential additional adapters
				$ipv4 = trim(explode("\n", explode('IPv4 Address. . . . . . . . . . . :', $lookup)[1])[0]);
			} else {
				$ipv4 = '127.0.0.1';
			}
		} else {
			// linux
			// need work to detect priority ip, i dont use linux much anymore
			$lookup = shell_exec('ip -4 addr show');
			if (str_contains($lookup, 'inet ') && str_contains($lookup, ' brd')) {
				$ipv4 = trim(explode('/', explode(' brd', explode('inet ', $lookup)[2])[0])[0]);
			} else {
				$ipv4 = '127.0.0.1';
			}
		}
		
		// if override
		if ($this->override_ipv4) {
			$ipv4 = $this->override_ipv4;
		}
		
		// stash found ipv4 then return it
		$this->updateServerData('ipv4', $ipv4);
		
		return $ipv4;
		
	}
	
	function windowsRequestIPv4FromSection($data, $section) {
		$lines = explode("\n", $data);
		$section_found = false;
		foreach ($lines as $row) {
			if ($section_found) {
				if (strlen($row) > 0 && $row[0] != ' ') {
					return false;
				} else if (str_contains($row, 'IPv4 Address. . . . . . . . . . . :')) {
					return trim(explode('IPv4 Address. . . . . . . . . . . :', $row)[1]);
				}
			} else if (str_contains($row, $section)) {
				$section_found = true;
			}
		}
		return false;
	}
	
	function cleanCLIPath($v) {
		if ($this->OS == 'Windows') {
			return str_replace('/','\\',$v);
		} else {
			return str_replace(' ','\ ',$v);
		}
	}
	
	function requestConnectionDetails() {
		// calls twice to getServerData from within requestIPv4, ohwell
		$server_details = $this->getServerData();
		return (object)[
			'api_ip' => $server_details->api_ip,
			'client_port' => $server_details->api_client_port,
			'ws_port' => $server_details->api_host_port,
			'controller_key' => $server_details->controller_key
		];
	}
	
	function checkHostPort($host, $port) {
		if ($host == null || $port == null) {
			return false;
		}
		// check if anything is currently running on host:port
		if (@fsockopen($host, $port, $errno, $errstr, 2)) {
			return true;
		}
		return false;
	}
	
	function getServerData($reset = false) {
		
		// create server data JSON file if it doesn't exist or on reset
		if ($reset == true || !file_exists(getBasePath().'/php_apps/app_data/server_data.json')) {
			file_put_contents(getBasePath().'/php_apps/app_data/server_data.json', json_encode((object)[
				'ipv4' => null,
				'host_launch_ip' => null,
				'host_port' => null,
				'controller_key' => null,
				'api_ip' => null,
				'api_host_port' => null,
				'api_client_port' => null,
				'host_pid' => null,
				'ws_pid' => null,
				'client_pid' => null
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
	
	function launchApplication($use_ipv4 = false) {
		
		// get ipv4
		$ipv4 = $this->requestIPv4();
		
		// use localhost or ipv4
		$host_launch_ip = $use_ipv4 ? $ipv4 : $this->local_host;
		
		// stash host launch data
		$this->updateServerData('host_launch_ip', $host_launch_ip);
		$this->updateServerData('host_port', $this->host_port);
		
		// ensure something is not already running on the specified ip:port
		if (!$this->checkHostPort($host_launch_ip, $this->host_port)) {
			
			// launch application on specified IP (local or external)
			if ($this->OS == 'Windows') {
				
				// run non-returning command to start application on set IP
				pclose(popen('start /B "" "'.$this->win_php.'" -S '.$host_launch_ip.':'.$this->host_port.' -t "'.$this->cleanCLIPath(getBasePath()).'" > "'.$this->cleanCLIPath(getBasePath()).'output.log" 2>&1', 'r'));
		
			} else {
				
				// run application and stash PID for shutdown
				$host_pid = trim(shell_exec('php -S '.$host_launch_ip.':'.$this->host_port.' -t '.$this->cleanCLIPath(getBasePath().'/').' > /dev/null 2>&1 & echo $!'));
				$this->updateServerData('host_pid', $host_pid);
			
			}

		}
		
		return $host_launch_ip.':'.$this->host_port;
	}
	
	function stopApplication() {
		
		// request stashed server data
		$server_data = $this->getServerData();
		
		// ensure application is running
		if ($this->checkHostPort($server_data->host_launch_ip, $server_data->host_port)) {
			if ($this->OS == 'Windows') {
				// search based on initial declaration of application ip and port
				$host_pid = $this->windowsRequestPID($server_data->host_launch_ip.':'.$server_data->host_port.' -t ');
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
		
		// null host launch data
		$this->updateServerData('host_launch_ip', null);
		$this->updateServerData('host_port', null);
		
		return true;
	}
	
	function isApiServerRunning() {
		$server_data = $this->getServerData();
		if ($server_data->api_ip == null || $server_data->api_client_port == null) {
			return false;
		}
		return $this->checkHostPort($server_data->api_ip, $server_data->api_client_port);
	}
	
	function launchApiServer($use_adapter = false) {
		
		// ensure something is not already running on the client ip:port
		if (!$this->isApiServerRunning()) {
			
			// generate new controller key for new instance of a websocket server
			$this->updateServerData('controller_key', bin2hex(random_bytes(16)));
			
			// request ipv4, potential use in next line but guaranteed use in stashing server data within method
			$ipv4 = $this->requestIPv4();
			
			// launch on ipv4 unless windows requests separate network launch of api server
			$api_ip = $ipv4;
			if ($use_adapter !== false && $this->OS == 'Windows') {
				$adapter_ip = $this->windowsRequestIPv4FromSection(shell_exec('ipconfig'), $use_adapter);
				if ($adapter_ip) {
					$api_ip = $adapter_ip;
				}
			}
			
			// stash api host and client launch details, api server (host) needs this info immediately
			$this->updateServerData('api_ip', $api_ip);
			$this->updateServerData('api_host_port', $this->websocket_port);
			$this->updateServerData('api_client_port', $this->client_port);

			// launch websocket server and client on ipv4:port
			if ($this->OS == 'Windows') {
				
				// launch api server
				pclose(popen('start /B "" "'.$this->win_php.'" "'.$this->cleanCLIPath(getBasePath().'\api\api_server.php').'" > NUL 2>&1', 'r'));

				// launch api client, on windows allow external wifi launch
				pclose(popen('start /B "" "'.$this->win_php.'" -S '.$api_ip.':'.$this->client_port.' -t "'.$this->cleanCLIPath(getBasePath().'\api').'" > NUL 2>&1', 'r'));
		
			} else {
				
				// launch websocket server and save PID
				$this->updateServerData('ws_pid', trim(shell_exec('php '.$this->cleanCLIPath(getBasePath().'/api/api_server.php').' > /dev/null 2>&1 & echo $!')));
				
				// launch client and save PID
				$this->updateServerData('client_pid', trim(shell_exec('php -S '.$api_ip.':'.$this->client_port.' -t '.$this->cleanCLIPath(getBasePath().'/api').' > /dev/null 2>&1 & echo $!')));
			
			}
		
		}
		
		return $api_ip.':'.$this->client_port;
		
	}
	
	function stopApiServer() {
		
		// ensure websocket server is running
		if ($this->isApiServerRunning()) {
			if ($this->OS == 'Windows') {
				
				$server_data = $this->getServerData();
				
				// query for client process and kill
				$client_pid = $this->windowsRequestPID($server_data->api_ip.':'.$server_data->api_client_port.' -t');
				if ($client_pid) {
					shell_exec('taskkill /F /PID '.$client_pid);
				}
				
				// query for websocket server process and kill
				$ws_pid = $this->windowsRequestPID('api_server.php');
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
		
		// null client and host launch details
		$this->updateServerData('api_ip', null);
		$this->updateServerData('api_client_port', null);
		$this->updateServerData('api_host_port', null);
		
		return true;
		
	}
	
}

?>