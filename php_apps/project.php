<?php

class project {
	
	private $registry;
	
	// on load, get list of project uid | project name pair
	function __construct() {
		if (!file_exists(getBasePath().'/php_apps/app_data/project_registry.json')) {
			file_put_contents(getBasePath().'/php_apps/app_data/project_registry.json', '{}');
		}
		$this->registry = json_decode(file_get_contents(getBasePath().'/php_apps/app_data/project_registry.json'));
	}
	
	function readRegistry() {
		return $this->registry;
	}
	
	function returnRegistry() {
		app('respond')->json(true, $this->registry);
	}
	
	// save current project registry
	function saveRegistry() {
		file_put_contents(getBasePath().'/php_apps/app_data/project_registry.json', json_encode($this->registry));
	}
	
	function updateSettings($uid, $post) {
		
		// update registry with new title
		$this->registry->{$uid} = $post['project_title'];
		$this->saveRegistry();
		
		// get settings file, update, then put back
		$settings = json_decode(file_get_contents(getBasePath().'/data/'.$uid.'/container.json'));
		
		// legacy fix
		if (!is_object($settings->settings)) {
			$settings->settings = (object)[];
		}
		
		// voicemeeter api
		$settings->settings->voicemeeter_3pa_enabled = isset($post['vb3pa_enable']);
		$settings->settings->voicemeeter_api_dll = $post['voicemeeter_api_dll'];
		
		// obs api
		$settings->settings->obs_3pa_enabled = isset($post['obs3pa_enable']);
		$settings->settings->obs_websocket_location = $post['obs_websocket_location'];
		$settings->settings->obs_websocket_auth = $post['obs_websocket_auth'];

		file_put_contents(getBasePath().'/data/'.$uid.'/container.json', json_encode($settings));
		
		// all good
		app('respond')->json(true, 'project settings updated.');
	}
	
	function register($project_name) {
		
		// request new uid
		$uid = app('uid')->generate();
		
		// add to registry
		$this->registry->{$uid} = $project_name;
		
		// save registry
		$this->saveRegistry();
		
		// create project directory
		mkdir(getBasePath().'/data/'.$uid);
		
		// create project overlay output directory
		mkdir(getBasePath().'/overlay_output/'.$uid);
		
		// create project sources directory
		mkdir(getBasePath().'/data/'.$uid.'/sources');
		
		// create project data sets directory
		mkdir(getBasePath().'/data/'.$uid.'/datasets');
		
		// create skeleton data set registry file
		file_put_contents(getBasePath().'/data/'.$uid.'/datasets/registry.json', json_encode((object)[]));
		
		// create project overlay data directory
		mkdir(getBasePath().'/data/'.$uid.'/overlays');
		
		// create skeleton overlay registry file
		file_put_contents(getBasePath().'/data/'.$uid.'/overlay_registry.json', json_encode([]));
		
		// create project container json file
		file_put_contents(getBasePath().'/data/'.$uid.'/container.json', json_encode((object)[
			'uid' => $uid,
			'settings' => [
				'voicemeeter_3pa_enabled' => false,
				'voicemeeter_api_dll' => 'C:\\Program Files (x86)\\VB\\Voicemeeter\\VoicemeeterRemote64.dll',
				'obs_3pa_enabled' => false,
				'obs_websocket_location' => 'localhost:4455',
				'obs_websocket_auth' => ''
			]
		]));
		
		// create skeleton data file
		file_put_contents(getBasePath().'/data/'.$uid.'/data.json', json_encode((object)[]));
		
		// create skeleton ui file
		file_put_contents(getBasePath().'/data/'.$uid.'/ui.json', json_encode([]));
		
		// create skeleton asset registry file
		file_put_contents(getBasePath().'/data/'.$uid.'/asset_registry.json', json_encode((object)[]));
		
		// never fail ... plz
		app('respond')->json(true, 'Registered new project successfully.', [
			'uid' => $uid
		]);
		
	}
	
	// $project_uid(string) - project uid
	function load($project_uid, $backend_return = false) {
		
		// check if project exists
		if (isset($this->registry->{$project_uid})) {
			
			// path to project data
			$data_path = getBasePath().'/data/'.$project_uid.'/';
			
			// ensure project directory exists
			if (is_dir($data_path)) {
				
				// get project data head
				$project_data = json_decode(file_get_contents($data_path.'container.json'));
				
				// set project title from registry
				$project_data->title = $this->registry->{$project_uid};
				
				// import project data
				$project_data->data = json_decode(file_get_contents($data_path.'data.json'));
				
				// import project assets as a subset to data
				$project_data->data->assets = app('asset')->getRegistry($project_uid);
				
				// data set structures
				$project_data->data->sets = app('dataset')->loadAll($project_uid);
				
				// import project data ui
				$project_data->ui = json_decode(file_get_contents($data_path.'ui.json'));
				
				// import project overlays
				$project_data->overlays = app('overlay')->getAll($project_uid);
				
				// append cwd
				$project_data->cwd = getcwd();
				
				// return project data
				if ($backend_return) {
					return $project_data;
				} else {
					app('respond')->json(true, $project_data);
				}
				
			}
			
		}
		
		if ($backend_return) {
			return false;
		} else {
			app('respond')->json(false, 'project UID not found.');
		}
		
	}
	
	// $project_uid(string), $section - specific data section to load
	function loadSection($project_uid, $section) {
		return json_decode(file_get_contents(getBasePath().'/data/'.$project_uid.'/'.$section.'.json'));
	}
	
	// $project_uid(string) - project uid, $section - section to write to, $save - object
	function save($project_uid, $section, $save) {
		file_put_contents(getBasePath().'/data/'.$project_uid.'/'.$section.'.json', json_encode($save));
		return true;
	}
	
	function updateprojectDetails($uid, $post) {
		
		// get original project data
		$project_data = $this->loadSection($uid, 'data');
		
		// loop post keys and attempt to update object paths within project object
		foreach ($_POST as $key => $value) {
			
			// if variable path
			if (substr($key, 0, 5) == '$var$' && substr($key, -6) == '$/var$') {

				// if containers pointer, remove
				if (str_contains($key, '$pointer$')) {
					$key = explode('$pointer$', $key)[0].explode('$/pointer$', $key)[1];
				}
				
				// create base path as reference to project data property
				$base_path = &$project_data;
				
				// explode and traverse path until empty
				$path = explode('/', substr($key, 5, -6));

				while(count($path) > 0) {
					// shift from path into reference path
					$base_path = &$base_path->{array_shift($path)};
				}
				$base_path = $value;
				
			}
		}
		
		// update data file with project data object
		$this->save($uid, 'data', $project_data);
		
		app('respond')->json(true, 'project data successfully updated.');
		
	}
	
	function updateprojectDataStructure($uid, $data_structure) {
		$this->save($uid, 'data', $data_structure);
		app('respond')->json(true, 'Project data structure successfully updated.');
	}
	
	function updateprojectUI($uid, $data) {
		file_put_contents(getBasePath().'/data/'.$uid.'/ui.json', $data);
		app('respond')->json(true, 'Project UI successfully updated.');
	}
	
	function import($uid, $file, $use_import_uid) {
		
		// upload archive
		$zip = app('files')->upload($file, getBasePath().'/data/', ['fname' => true]);
		 
		if ($zip['status'] == true) {
			
			// uploaded file name
			$file_name = $zip['msg'];
			
			
			// extract project archive to the current project directory
			$zip = new ZipArchive;
			if ($zip->open(getBasePath().'/data/'.$file_name) === true) {
				
				// rename data directory, preserved incase of error fallback
				rename(getBasePath().'/data/'.$uid, getBasePath().'/data/fallback');
				
				// create new directory for zip extraction
				mkdir(getBasePath().'/data/'.$uid);
				
				// extract to
				$zip->extractTo(getBasePath().'/data/'.$uid);
				$zip->close();
				
				// if overriding uid with import uid
				if ($use_import_uid) {
					
					// get uid from import
					$import_uid = json_decode(file_get_contents(getBasePath().'/data/'.$uid.'/container.json'))->uid;
					
					// skip logic if uid is same as current project uid
					if ($uid != $import_uid) {

						// ensure import uid is not in use in another project, imports without uid change are already guaranteed to be unique so this check is only done here
						if (isset($this->registry->{$import_uid})) {
							
							// remove imported project data files and directories, false flag to remove directory master too
							app('directoryFileList')->delete(getBasePath().'/data/'.$uid, false);
							
							// remove uploaded archive
							unlink(getBasePath().'/data/'.$file_name);
							
							// rename fallback directory
							rename(getBasePath().'/data/fallback', getBasePath().'/data/'.$uid);
							
							app('respond')->json(false, '', (object)[
								'text' => 'The imported project UID: '.$import_uid.' is already in use in a different project. Did you mean to overwrite the existing project "'.$this->registry->{$import_uid}.'" ? If not, try unchecking the "Overwrite UID with import project UID" checkbox and import this new project with the current local uid.',
								'import_uid' => $import_uid
							]);
						}
						
						// otherwise, rename project data directory
						rename(getBasePath().'/data/'.$uid, getBasePath().'/data/'.$import_uid);
						
						// rename project overlay output directory
						rename(getBasePath().'/overlay_output/'.$uid, getBasePath().'/overlay_output/'.$import_uid);
						
						// remove old uid from registry
						unset($this->registry->{$uid});
						
						// then override uid with import uid for remaining import logic
						$uid = $import_uid;
						
					}
					
				}
				
				// register new project name
				$this->registry->{$uid} = file_get_contents(getBasePath().'/data/'.$uid.'/project_name.txt');
				
				// save registry
				$this->saveRegistry();
				
				// update imported project data container with the new project uid
				$data_container = json_decode(file_get_contents(getBasePath().'/data/'.$uid.'/container.json'));
				$data_container->uid = $uid;
				file_put_contents(getBasePath().'/data/'.$uid.'/container.json', json_encode($data_container));
				
				// remove temporary project name file
				unlink(getBasePath().'/data/'.$uid.'/project_name.txt');
				
				// clear old overlay output directory
				app('directoryFileList')->delete(getBasePath().'/overlay_output/'.$uid);
				
				// remove fallback directory
				app('directoryFileList')->delete(getBasePath().'/data/fallback', false);
				
			} else {
				
				app('respond')->json(false, 'Project archive unable to be opened. Does your PHP.ini have "extension=zip" enabled?');
				
			}
			
			// remove uploaded archive
			unlink(getBasePath().'/data/'.$file_name);
			
			// return imported project name
			app('respond')->json(true, 'Project imported successfully.', [
				'project_name' => $this->registry->{$uid}
			]);
			
			
		}	else {
			app('respond')->json(false, 'An error occurred while uploading the project archive.');
		}			
	}
	
	function export($uid) {
		
		// prevent user abort
		ignore_user_abort(true);
		
		$project_name = $this->registry->{$uid};
		
		$zip = new ZipArchive;
		if ($zip->open($project_name.'.fsdi', ZipArchive::CREATE) === true) {
			
			// log project name
			$zip->addFromString('project_name.txt', $project_name);
			
			// set a base path
			$base_path = getBasePath().'/data/'.$uid.'/';
			
			// add files to zip archive
			foreach (app('directoryFileList')->get([], $base_path) as $file_path) {
				$zip->addFile($file_path, str_replace($base_path, '', $file_path));
			}

			// save project archive
			$zip->close();
			
			// front end will now redirect to downloadAndDelete method below
			app('respond')->json(true, 'Archive successfully create.', ['project_name' => $project_name]);
			
		} else {
			app('respond')->json(false, 'Error creating archive export for project: '.$project_name);
		}
		
	}
	
	function downloadAndDeleteExport($project_name) {
		
		// prevent user abort
		ignore_user_abort(true);
		
		// open stream to download exported archive and then remove it
		header('Content-Type: application/octet-stream');
		header('Content-Transfer-Encoding: Binary'); 
		header('Content-disposition: attachment; filename="'.$project_name.'.fsdi"'); 
		readfile($project_name.'.fsdi'); 
		unlink($project_name.'.fsdi');
		
	}
	
	function deleteProject($uid) {
		
		// remove project from registry
		unset($this->registry->{$uid});
		
		// save registry
		$this->saveRegistry();
		
		// delete project data directory
		app('directoryFileList')->delete(getBasePath().'/data/'.$uid, false);
		
		// delete project overlay output directory
		app('directoryFileList')->delete(getBasePath().'/overlay_output/'.$uid, false);
		
		// respond
		app('respond')->json(true, 'Project deleted.');
		
	}
	
}

?>