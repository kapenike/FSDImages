<?php
require 'app.php';

// edge case (right now) for $_GET variable during download archive
if (isset($_GET['download_export'])) {
	$export_name = urldecode($_GET['download_export']);
	if (file_exists($export_name.'.fsdi')) {
		app('project')->downloadAndDeleteExport($export_name);
	}
	exit;
}

// application switch, defined by string value in $_POST['application']
switch($_POST['application']) {
	
	case 'request_whitelisted_ips':
		if (app('security')->isLocalMachine()) {
			app('respond')->json(true, 'Whitelisted IPv4 Addresses', (object)['ipv4' => app('security')->requestAcceptsIPs()]);
		}
		app('respond')->json(false, 'Unauthorized.');
		break;
		
	case 'update_whitelisted_ips':
		if (app('security')->isLocalMachine()) {
			app('security')->updateIPs((isset($_POST['ipv4_addr']) ? $_POST['ipv4_addr'] : []));
			app('respond')->json(true, 'IPv4 whitelist updated.');
		}
		app('respond')->json(false, 'Unauthorized.');
		break;
	
	case 'api_is_running':
		if (app('server')->isApiServerRunning()) {
			app('respond')->json(true, '', app('server')->requestConnectionDetails());
		}
		break;
		
	case 'api_start':
		if (app('server')->launchApiServer()) {
			app('respond')->json(true, '', app('server')->requestConnectionDetails());
		} else {
			app('respond')->json(false, 'Unable to start web socket server :/');
		}
		break;
		
	case 'api_kill':
		app('server')->stopApiServer();
		break;
	
	case 'request_project_overlay_pairs':
		$projects = app('project')->readRegistry();
		foreach ($projects as $key => $value) {
			$projects->{$key} = (object)[
				'title' => $value,
				'overlays' => json_decode(file_get_contents(getBasePath().'/data/'.$key.'/overlay_registry.json'))
			];
		}
		app('respond')->json(true, $projects);
		break;
	
	case 'update_font_face':
		app('fonts')->update($_POST, $_FILES);
		break;
		
	case 'remove_font':
		app('fonts')->remove($_POST['font_face']);
		break;

	case 'import_project':
		app('project')->import($_POST['uid'], $_FILES['file_0'], isset($_POST['use_import_uid']));
		break;

	case 'export_project':
		app('project')->export($_POST['uid']);
		break;
		
	case 'delete_project':
		app('project')->deleteProject($_POST['uid']);
		break;
	
	case 'create_project':
		app('project')->register($_POST['project_name']);
		break;
		
	case 'update_project_settings':
		app('project')->updateSettings($_POST['uid'], $_POST);
		break;
	
	case 'load_project_registration':
		// return project registry
		app('project')->returnRegistry();
		break;
	
	case 'load_project_data':
		// returns entire data set of project for initial load
		app('project')->load($_POST['uid']);
		break;
	
	case 'export_overlays':
		// takes list of base64 images and exports them as pngs
		app('overlay')->export($_POST, $_POST['uid']);
		break;
		
	case 'create_update_overlay':
		app('overlay')->createUpdate($_POST);
		break;
		
	case 'update_overlay_layers':
		app('overlay')->updateLayers($_POST);
		break;
		
	case 'remove_overlay':
		app('overlay')->remove($_POST['project_uid'], $_POST['overlay_slug']);
		break;
		
	case 'update_project_details':
		app('project')->updateprojectDetails($_POST['uid'], $_POST);
		break;
		
	case 'update_project_details_ui_edit':
		// write project ui structure data
		app('project')->updateprojectUI($_POST['uid'], $_POST['data']);
		break;
		
	case 'update_project_data_structure':
		// update data file with new data structure object
		// this functions just like `update_project_details` but with potential structural changes and no variable path fetching
		app('project')->updateprojectDataStructure($_POST['uid'], json_decode($_POST['data_structure']));
		break;
		
	case 'update_create_dataset':
		// update or create dataset
		app('dataset')->update($_POST);
		break;
		
	case 'remove_dataset':
		// remove dataset
		app('dataset')->remove($_POST['project_uid'], $_POST['uid']);
		break;
		
	case 'create_update_asset':
		// create or update an asset
		app('asset')->createUpdateAsset($_POST);
		break;
		
	case 'remove_asset':
		// remove an asset
		app('asset')->removeAsset($_POST['project_uid'], $_POST['asset_slug']);
		break;
		
	case 'voicemeeter_command':
		app('integrations/voicemeeterController')->executeCommands($_POST['project_uid'], json_decode($_POST['commands']));
		break;
	
	default:
		app('respond')->json(false, 'No application request defined.');
		break;
}

?>