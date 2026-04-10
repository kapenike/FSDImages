# FSDImages
![FSD Dynamic Data Images](/logo.png)
- Automate image changes using custom data fields, datasets and asset lists
- Control 3rd party applications like OBS and Voicemeeter!
- Available websocket API is simple and allows for creating custom apps that manage your applications data and actions

> [!IMPORTANT]  
> The primary directory **FSDImages** cannot be renamed. FSDImages does not use Apache and therefore has no hierarchical method to manage data paths. The directory named FSDImages is used for relative pathing.

> [!NOTE]
> Launching the FSDImages application on your local ipv4 (`php start.php external`) does allow remote access to the application, but only supports a single "controller" at the API level. This will be the first client connected. There is currently no shared data between the two devices, so please control from one device at a time, although multi device controller support will be a future feature. Custom API apps allow many different devices to control separate or shared portions of the application that work in tandem with an active controller. External connections must have their IP whitelisted from the FILE menu's `Whitelisted IP Addresses` tab. This includes any API application with write permissions to the active controller. Please open the [API README.md](api/README.md) for more information. 

## Windows Download
- Download and extract from: [https://firststepdesign.co/file/FSDImages.zip](https://firststepdesign.co/file/FSDImages.zip) (28.6 MB)
- Launch `FSDImages.hta`
- Select `Start Application` from the application launcher. Choose `Localhost` then click `APP: localhost:8000` to open the application in a browser!
	- If the application fails to launch, please check the `output.log` file. The most likely culprit is an outdated C++ windows library for running PHP [Windows Latest C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170#latest-supported-redistributable-version).
- Websocket server can be initialized from the launcher or within the application itself

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
    - ensure the php_fileinfo extension is enabled `extension=file_info`, no `;` preceding it
		
- Clone or Download and extract the repository
- Rename the primary directory to `FSDImages` NOT `FSDImages-main`
- Navigate to the **FSDImages** primary directory and launch the application using:
	> php start.php
	
	- or
	
	> php start.php external all
	
	- to start the websocket API server during launch: `all` and start the application on your external ipv4 rather than localhost using: `external`
	
- Close the application with
	> php stop.php
	
	- or
	
	> php stop.php all
	
	- to stop the application and websocket server
	
- Visit `localhost:8000` (or external IPv4:8000) in your web browser to start using the application!


## To-DO
- Upgrade windows package to use FrankenPHP
- Overlay editor overhaul
	- launch with window for open / edit / quick overlay duplicate
	- fix all drag states to allow x / y lock
	- right click select layer improvements
	- allow global copy and paste of layers between overlays
	- round all movements to the nearest 100th dec
	- ctrl + t transform feature
	- ctral + z / ctrl + y
- Video Tutorial