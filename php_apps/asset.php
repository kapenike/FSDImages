<?php

class asset {
	
	function getRegistry($project_uid) {
		return json_decode(file_get_contents(getBasePath().'/data/'.$project_uid.'/asset_registry.json'));
	}
	
	function saveRegistry($project_uid, $data) {
		file_put_contents(getBasePath().'/data/'.$project_uid.'/asset_registry.json', json_encode($data));
	}
	
	function createUpdateAsset($post) {
		
		// define structured object for cleaner code
		$project_uid = $_POST['project_id'];
		$data = (object)[
			'type' => $_POST['asset_registration_type'],
			'display' => $_POST['asset_name'],
			'slug' => $_POST['asset_slug'],
			'file' => (isset($_FILES['asset_file_0']) ? $_FILES['asset_file_0'] : null),
			'offset_x' => $_POST['asset_offset_x'],
			'offset_y' => $_POST['asset_offset_y']
		];
		
		if ($data->type == 'create') {
			// create asset
			
			// get registry
			$registry = $this->getRegistry($project_uid);
			
			$registry->{$data->slug} = (object)[];
			$registry->{$data->slug}->display = $data->display;
			$registry->{$data->slug}->offset_x = $data->offset_x;
			$registry->{$data->slug}->offset_y = $data->offset_y;
			
			$new_file = app('files')->upload($data->file, getBasePath().'/data/'.$project_uid.'/sources/', ['fname' => true]);
			$registry->{$data->slug}->file = $new_file['msg'];
			$img_data = getimagesize(getBasePath().'/data/'.$project_uid.'/sources/'.$new_file['msg']);
			$registry->{$data->slug}->is_not_image = $img_data === false ? true : !in_array($img_data[2], [IMAGETYPE_JPEG,IMAGETYPE_PNG,IMAGETYPE_GIF,IMAGETYPE_BMP]);
			$registry->{$data->slug}->width = $img_data === false ? 0 : $img_data[0];
			$registry->{$data->slug}->height = $img_data === false ? 0 : $img_data[1];
			
			// update registry data
			$this->saveRegistry($project_uid, $registry);
			
			// return current data object
			app('respond')->json(true, $registry->{$data->slug});
			
			
		} else 	{
			// update
			
			// get registry
			$registry = $this->getRegistry($project_uid);
			
			// asset slug original is saved in data->type
			if (isset($registry->{$data->type})) {
				$registry->{$data->type}->display = $data->display;
				$registry->{$data->type}->offset_x = $data->offset_x;
				$registry->{$data->type}->offset_y = $data->offset_y;
				
				// handle asset new file upload
				if ($data->file != null) {
					// remove old source file
					app('files')->remove(getBasePath().'/data/'.$project_uid.'/sources/', $registry->{$data->type}->file);
					$new_file = app('files')->upload($data->file, getBasePath().'/data/'.$project_uid.'/sources/', ['type' => 'img', 'fname' => true]);
					$registry->{$data->type}->file = $new_file['msg'];
					$img_data = getimagesize(getBasePath().'/data/'.$project_uid.'/sources/'.$new_file['msg']);
					$registry->{$data->type}->is_not_image = $img_data === false ? true : !in_array($img_data[2], [IMAGETYPE_JPEG,IMAGETYPE_PNG,IMAGETYPE_GIF,IMAGETYPE_BMP]);
					$registry->{$data->type}->width = $img_data === false ? 0 : $img_data[0];
					$registry->{$data->type}->height = $img_data === false ? 0 : $img_data[1];
				}
				
				// if slug change, set new and remove old
				if ($data->type != $data->slug) {
					$registry->{$data->slug} = json_decode(json_encode($registry->{$data->type}));
					unset($registry->{$data->type});
				}
				
				// update registry data
				$this->saveRegistry($project_uid, $registry);
				
				// return current data object
				app('respond')->json(true, $registry->{$data->slug});
				
			} else {
				app('respond')->json(false, 'Update on asset failed because the asset slug could not be referenced.');
			}
		}
		
		app('respond')->json(false, 'Unexpected error on asset '.($data->type == 'create' ? 'creation' : 'update').'.');
		
	}
	
	function removeAsset($project_uid, $asset_slug) {
		
		// get registry
		$registry = $this->getRegistry($project_uid);
		
		// remove asset image file
		app('files')->remove(getBasePath().'/data/'.$project_uid.'/sources/', $registry->{$asset_slug}->file);
		
		// delete asset
		unset($registry->{$asset_slug});
		
		// update registry data
		$this->saveRegistry($project_uid, $registry);
		
		// success
		app('respond')->json(true, 'Asset successfully removed.');

	}
	
}

?>