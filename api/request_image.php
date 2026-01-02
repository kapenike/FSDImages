<?php

function sanitize($v) {
	return str_replace(['/','\\','..'],'',$v);
}

if (isset($_GET['uid'])) {
	if (isset($_GET['overlay_slug'])) {
		
		// request overlay by slug
		$path = '../overlay_output/'.sanitize($_GET['uid']).'/'.sanitize($_GET['overlay_slug']).'.png';
		
	} else if (isset($_GET['asset_slug'])) {
		
		// request asset by slug
		if (file_exists('../data/'.sanitize($_GET['uid']).'/asset_registry.json')) {
			$asset_registry = json_decode(file_get_contents('../data/'.sanitize($_GET['uid']).'/asset_registry.json'));
			if (isset($asset_registry->{sanitize($_GET['asset_slug'])})) {
				$path = '../data/'.sanitize($_GET['uid']).'/sources/'.$asset_registry->{sanitize($_GET['asset_slug'])}->file;
			}
		}
		
	} else if (isset($_GET['asset_filename'])) {
		
		// request asset by direct filename
		$path = '../data/'.sanitize($_GET['uid']).'/sources/'.sanitize($_GET['asset_filename']);
		
	} else {
		http_response_code(404);
		exit;
	}
	if (file_exists($path)) {
		session_cache_limiter('nocache');
		header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
		header('Cache-Control: post-check=0, pre-check=0', false);
		header('Expires: '. gmdate('D, d M Y H:i:s \G\M\T', time()));
		header('Content-Type: image/png');
		readfile($path);
	} else {
		http_response_code(404);
	}
} else {
	http_response_code(404);
}

?>