> [!IMPORTANT]
> Files created under /api/ext and sent over the API http server that only interact with the api server, rather than the application directly, are not consider system files. non system files (like project data files) do not fall under the AGPLv3 license of FSDImages and can be shared freely without committing to the repository.
	
# Understanding the API #

> [!NOTE]
> The API is meant to directly interface with the CONTROLLER. The controller is the primary application launched on localhost:8000. This application handles overlay generation and data saving, without it running and connected, API scripts can only receive the current requested data and overlays or request new data. Without an active controller, the API scripts cannot write data to storage, receive live updates from the controller on updated fields or overlays, and cannot send data that will call for an overlay update.

**The API server runs under `/api/`, meaning that access to scripts through a browser will be at `yourlocalipv4:8136/ext/`**

The API server was created to allow custom scripts to manage importing 3pa API data. It was also created to manage user input from unauthorized clients. For this reason the API clients function in two specific ways: a Client or a Worker:
	- Clients can request any data, any overlay, listen to a specific pipe, and write to a Worker only over their declared pipe. A Client cannot directly communicate with the controller. A Client also cannot write to any other clients directly.
	- Workers can also request all data and overlays, as well as listen to a pipe. However, the Worker can also write to the controller to live update fields, command actions, command integrations like OBS, write to all clients connected to the defined pipe, and request new data that was not previously listened to at any point. This can be done because the Worker API script must have their local IP authenticated in order to connect successfully.


## Client API ##

The client API example can be found at `/api/ext/example.html`

To listen to specific system variables and overlay changes, include the "/api_connection_library.js.php" in your html page
(e.g.)
```
<script src="/api_connection_library.js.php"></script>
```

To insert custom fonts css stylesheet, include the "/fonts" path as a stylesheet hyperlink
(e.g.)
```
<link rel="stylesheet" type="text/css" href="/fonts">
```

You can interact with this API by creating a new API connection AFTER the DOM has loaded

API declaration example:
```
const apiserver = new api_server(
	'project_uid', // project_uid (string)
	{
		overlays: [ // listen for changes to a specific overlay
			'list_of_overlay_slugs'
		],
		data: [ // receive initial data for the listed paths, and receive updates when they change
			'list_of_data_paths'
		],
		pipe: 'example_pipe' // communicate with an API worker over this specific channel
	},
	{ // event function calls (called when the connection is opened, message is sent, connection closes, or an error occurs)
		open: function(event){},
		message: function(event){},
		error: function(event){},
		close: function(event){}
	}
);
```
		
Overlays and data paths will send initial data under the "message" functions "event" parameter as a json object. `let data = JSON.parse(event.data);`
(e.g.)
	`data.data['team_2/series_score']`
	or
	`data.overlays['face_off_screen']`

**Overlay listeners only specify when an overlay is updated!**

Overlays and assets urls must be requested using:
	- `requestOverlay('project_uid', 'overlay_slug');`
	- `requestAsset('project_uid', 'asset_slug')` // using the assets slug
	- `requestAsset('project_uid', 'asset_filename', true)` // using the asset filename, which is included within any asset data path requested or listened to
	
> [!NOTE]
> In your `message` event listener, the best way to determine if the message is from the initial message declaration, is to check if `data.identifier` is defined.
	
On update, any updated values will be contained within the `data.update.data` and `data.update.overlays` object

Similarly, messages from an API worker that writes to your declared pipe will appear under `data.update.pipe`

Client API scripts can write only to API workers over their pipe, not directly to other clients, as the API worker is authenticated.
(e.g.)
// write directly to a worker script
```
apiserver.writePipe({
	response: 'Pipe client here o/',
	someotherkey: 'its not restrictive, you define the structure'
});
```
	
## Worker API ##

The worker API example can be found at `/api/ext/example_worker.html`

> [!NOTE]
> A worker API script must have their local IP authenticated in order to achieve their elevated commands. Any client can get their local IP by visiting `yourlocalipv4:8136/get_auth.php`. If the screen does not show unauthorized, they are authenticated.

A worker declares their connection to the API server the same way as a client with only two differences:
	- The worker must include the worker auth token script `<script src="/worker_auth_connection_key.js.php?pipe=example_pipe"></script>` with a pipe declared.
	- Declare their pipe with a key (the pipe name), and a token (defined by the worker auth token script) (e.g.) `pipe: { key: 'example_pipe', token: API_WORKER_AUTH_TOKEN }`
	
A worker can now:
	- write to clients on a pipe -> `apiserver.writePipe({})`
	- write to the controller with a list of sources and values -> `apiserver.writeController([{ source: 'team_1/series_score', value: 0 }]);`
	- request new data with a list of paths -> `dataRequest(['series_type'])`, this data will be returned as a message event under `data.requested_data`