# FSDImages
![FSD Dynamic Data Images](/logo.png)
- Automate image changes using custom data fields, datasets and asset lists
- FSDImages changes will automatically update live in an OBS scene

> [!IMPORTANT]  
> The primary directory **FSDImages** cannot be renamed. FSDImages does not use Apache and therefore has no hierarchical method to manage data paths. The directory named FSDImages is used for relative pathing.
> When the application is chosen to run on external IPv4, all incoming requests will be subject to whitelisted IP address checks. This list can be modified from the local machine application `file > Whitelisted IP Addresses`

## Windows Download
- Download and extract from: [https://firststepdesign.co/file/FSDImages.zip](https://firststepdesign.co/file/FSDImages.zip) (35.7 MB)
- Launch `FSDImages.hta`
- Select `Start Application` from the application launcher. Choose `Localhost` then click `APP: localhost:8000` to open the application in a browser!
- Websocket server can be initialized from the launcher or within the application itself!

*The windows download includes an example project by default. Check it out to learn how the application works!*


## Linux / MacOS install
*The base code does not include an example project by default, download and import it from: [https://firststepdesign.co/file/Example.fsdi](https://firststepdesign.co/file/Example.fsdi) (220.3 KB)*

- Install PHP (will vary depending on your distro)
	> sudo apt install php
	
- Update your php.ini config file to allow large image uploads and project imports.
	- Enter the following console command to locate your config file
	> php --ini
	
	- *(e.g. result): Loaded Configuration File:         /etc/php/8.3/cli/php.ini*
	- change the following configuration properties:
		- `upload_max_filesize=8M` -> `upload_max_filesize=2G`
		- `post_max_size=8M` -> `post_max_size=2G`
		- `memory_limit=128M` -> `memory_limit=2G`
		- `max_input_vars=1000` -> `max_input_vars=10000`
		- ensure the php_zip extension is enabled `extension=zip`, no `;` preceding it
		- ensure the php_sockets extension is enabled `extension=sockets`, no `;` preceding it
		
- Clone or Download and extract the repository
- Rename the primary directory to `FSDImages` NOT `FSDImages-main`
- Navigate to the **FSDImages** primary directory and launch the application using:
	> php start.php
	
	- or
	
	> php start.php external all
	
	- to start the websocket search during launch using `all` and start the application on your external ipv4 rather than localhost using `external`
	
- Close the application with
	> php stop.php
	
	- or
	
	> php stop.php all
	
	- to stop the application and websocket server
	
- Visit `localhost:8000` (or external IPv4:8000) in your web browser to start using the application!

- Websockets works for Linux and Windows ... no test case for Mac available so either donate one to me or commit a change for all files under  `/p2p/`

## To-DO

FEATURES:

- Switchboard
	- allow multiple pages
	- offer search option for select list dropdowns
		
- Dataset
	- allow sorting

- Overlay editor features
	- add border radius option to individual points on custom path, or all points for either square or custom path
	- during grid placement UI, display vertical and horizontal red lines to mimic the placement coordinates, also display menu within top editor panel
	- stash start drag point of clip path individual point as to allow x / y lock drag during move event
	- when adding a new layer during the active selection of a group layer, add new layer within the group layer rather than adjacent
	- ctrl + z, ctrl + y: undo and redo
	- allow image rotation
	- allow text to overflow when prompted and provide a new height dimension, with that allow vertical positioning, default top but allow center and bottom, update flipLayer function with new positioning possibilities
	- ctrl + t for a new UI to control rotation and dimensions of layer object

- variable input
	- needs to allow window anchor selection to change specific concatted variables rather than just appending the new variable selection
	- needs complete rewrite with new variable storage on HTMLElements using JSUI

- P2P
	- allow viewing of uncontrolled clients as well as allowing force disconnect of any client