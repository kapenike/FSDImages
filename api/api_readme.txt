NOTICE: files created under /api/ext or /api/auth/ext and sent over the API http server that only interact with the api server, rather than the application directly, are not consider system files.
	- non system files (like project data files) do not fall under the AGPLv3 license of FSDImages and can be shared freely without commiting to the repository.
	
### Standard API ###

*Example: /ext/example.html

To listen to specific system variables and overlay changes, include the "/api_connection_library.js.php" in your html page
(e.g.)
	-> <script src="/api_connection_library.js.php"></script>

To insert custom fonts css stylesheet, include the "/fonts" path as a stylesheet hyperlink
(e.g.)
	-> <link rel="stylesheet" type="text/css" href="/fonts">
	
You can interact with this API by creating a new API connection AFTER the DOM has loaded
API declaration example:
	-> const apiserver = new api_server(
			'project_uid', // project_uid (string)
			{ // overlay and data listener arrays (object of arrays)
				overlays: [
					'list_of_overlay_slugs'
				],
				data: [
					'list_of_data_paths'
				]
			},
			{ // event function calls (called when the connection is opened, message is sent, connection closes, or an error occurs)
				open: function(event){},
				message: function(event){},
				error: function(event){},
				close: function(event){}
			}
		);
		
Overlays and data paths will send initial data under the "message" functions "event" parameter
(e.g.)
	-> data.data['team_2/series_score']
	or
	-> data.overlays['face_off_screen']
	
On update, any updated values will be contained within the "data.update.data" and "data.update.overlays" object



### API Pipe Worker and Clients ###

External scripts can choose to communicate over the API server connection by using pipes

RESTRICTIONS:
	- Only a pipe worker can send messages to all clients
	- Pipe workers must be authenticated when connecting to a pipe by including the "worker_auth_connection_key.js.php" script
		- This auth script is restricted to only the local machine or whitelisted IP addresses despite being under the API directory and accessible by the public
			- This prevents action within the API server without direct authorization
			
*Example: /ext/example_worker.html

To declare a worker, include the worker_auth_connection_key.js.php?pipe=example_pipe JS script, where the pipe name under $_GET['pipe'] is required

In your API listener declaration, include the pipe object with the pipe name and declared auth token
{
	overlays: [],
	data: [],
	pipe: { // 
		key: 'example_pipe',
		token: API_WORKER_AUTH_TOKEN
	}
}


For any public scripts, you can listen to this pipe by adding the pipe name directly as the listener
{
	overlays: [],
	data: [],
	pipe: 'example_pipe'
}


Workers can communicate with all clients, and clients can message the worker by calling the writePipe() method within the API connection class
api_server.writePipe({
	test: 'Send this data to clients if a worker, or send to worker if a client'
});