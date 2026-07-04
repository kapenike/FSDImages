<?php

class directoryFileList {
	
	// $list(array) - array to append file path list to, $dir(string) - starting directory
	function get($list, $dir, $ignored = []) {
		$files = scandir($dir);
		forEach($files as $file) {
			if ($file != '.' && $file != '..') {
				if (in_array($dir.'/'.$file, $ignored)) {
					continue;
				}
				if (is_dir($dir.'/'.$file)) {
					$list = array_merge($this->get($list, $dir.'/'.$file, $ignored));
				} else {
					$list[] = $dir.'/'.$file;
				}
			}
		}
		return $list;
	}

	// recursively delete all contents of directory, if preserve_master is false, delete the containing directory too
	function delete($dir, $preserve_master = true) {
		$files = scandir($dir);
		forEach($files as $file) {
			if ($file != '.' && $file != '..') {
				if (is_dir($dir.'/'.$file)) {
					$this->delete($dir.'/'.$file, true);
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
					$this->copyDir($source_file, $dest_file);
				} else {
					copy($source_file, $dest_file);
				}
			}
		}
	}
	
}

?>