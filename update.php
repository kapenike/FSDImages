<?php
function delete($dir, $preserve_master = true) {
	$files = scandir($dir);
	forEach($files as $file) {
		if ($file != '.' && $file != '..') {
			if (is_dir($dir.'/'.$file)) {
				delete($dir.'/'.$file, true);
				rmdir($dir.'/'.$file);
			} else {
				unlink($dir.'/'.$file);
			}
		}
	}
	if ($preserve_master == false) {
		rmdir($dir);
	}
	return true;
}

function copyDir($source, $destination) {
	if (!is_dir($destination)) {
		mkdir($destination, 0755, true);
	}
	$files = scandir($source);
	foreach ($files as $file) {
		if ($file != '.' && $file != '..') {
			$source_file = $source.'/'.$file;
			$dest_file = $destination.'/'.$file;
			if (is_dir($source_file)) {
				copyDir($source_file, $dest_file);
			} else {
				copy($source_file, $dest_file);
			}
		}
	}
}

function getList($list, $dir, $ignored) {
	$files = scandir($dir);
	forEach($files as $file) {
		if ($file != '.' && $file != '..') {
			if (in_array($dir.'/'.$file, $ignored)) {
				continue;
			}
			if (is_dir($dir.'/'.$file)) {
				$list = array_merge(getList($list, $dir.'/'.$file, $ignored));
			} else {
				$list[] = $dir.'/'.$file;
			}
		}
	}
	return $list;
}

require('app.php');

// NEVER change this url from what is set in the public repository!
const PROJECT = 'https://github.com/kapenike/FSDImages/archive/main.zip';

// ignored files and directory paths
const IGNORE = [
	'./FSDImages.hta',
	'./loader.gif',
	'./output.log',
	'./.git',
	'./php_apps/app_data',
	'./php',
	'./overlay_output',
	'./data',
	'./fonts',
	'./api/ext'
];

// #
echo "
____________________________  .___                                      
\_   _____/   _____/\______ \ |   | _____ _____     ____   ____   ______
 |    __) \_____  \  |    |  \|   |/     \\__  \   / ___\_/ __ \ /  ___/
 |     \  /        \ |    `   \   |  Y Y  \/ __ \_/ /_/  >  ___/ \___ \ 
 \___  / /_______  //_______  /___|__|_|  (____  /\___  / \___  >____  >
     \/          \/         \/          \/     \//_____/      \/     \/ 
                                         #".file_get_contents('./version.txt')."

Shutting down servers...
";

// shutdown all services
app('FSDImages')->stop(['all']);

// #
echo "Initializing install...";

// stash current files
$current_files = getList([], '.', IGNORE);

// if existing project import or temp directory exists remove it
if (file_exists('FSDImages.zip')) {
	unlink('FSDImages.zip');
}
if (is_dir('./temp')) {
	delete('./temp', false);
}

// #
echo "Downloading Git Repository...";

// download new project zip
file_put_contents('FSDImages.zip', file_get_contents(PROJECT));

// create temp extract to dir
mkdir('./temp');

// extract project archive to a temporary directory
$zip = new ZipArchive;
if ($zip->open('./FSDImages.zip') === true) {
	$zip->extractTo('./temp');
	$zip->close();
} else {
	echo "Failed to extract project archive. \n";
	exit;
}

// #
echo "Installing * ".file_get_contents('./temp/FSDImages-main/version.txt')."\n";

// get update file list and strip parent directory paths
$update_files = array_map(function ($n) {
	return './'.substr($n, 22);
}, getList([], './temp', IGNORE));

// copy new files into current project
copyDir('./temp/FSDImages-main','./');

// remove archive
unlink('FSDImages.zip');

// remove temp directory
delete('./temp', false);

// look for any files that have been removed from the project since last update and remove
foreach (array_diff($current_files, $update_files) as $diff) {
	unlink($diff);
}

// remove server config
if (file_exists('./php_apps/app_data/server_data.json')) {
	unlink('./php_apps/app_data/server_data.json');
}

// #
echo "Installation complete! You may close this window and re-start your application.\n\n"

?>