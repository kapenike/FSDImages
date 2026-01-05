NOTICE: files created under /api/ext or /api/auth/ext and sent over the API http server that only interact with the api server, rather than the application directly, are not consider system files.
	- non system files (like project data files) do not fall under the AGPLv3 license of FSDImages and can be shared freely without commiting to the repository.
	
### Standard API ###
See "example.html" for a working reference to the Example project

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