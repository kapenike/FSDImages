<?php
class files {
	
	// filename extension conversions
	public $fix_exts = [
		"jpeg" => "jpg"
	];
	
	function fixExts($ext) {
		$ext = strtolower($ext);
		if (isset($this->fix_exts[$ext])) {
			$ext = $this->fix_exts[$ext];
		}
		return $ext;
	}
	
	function checkSettings($file, $settings) {
		if (isset($settings["type"]) && $settings["type"] == 'img' && !in_array(getimagesize($file["tmp_name"])[2], [IMAGETYPE_JPEG,IMAGETYPE_PNG,IMAGETYPE_GIF,IMAGETYPE_BMP])) {
			return ["status" => false, "msg" => "Not a supported image type. Supported image formats: jpg, png, gif, bmp"];
		}
		return true;
	}
	
	function createFileName($path, $ext) {
		$rfn = bin2hex(random_bytes(8)).$ext;
		return is_file($path.$rfn) ? $this->createFileName($path, $ext) : $rfn;
	}
	
	function remove($path, $file) {
		if ($file === null || empty($file)) {
			return ["status" => false, "msg" => "File cannot be empty."];
		}
		if (is_file($path.$file)) {
			unlink($path.$file);
			return ["status" => true, "msg" => "File removed"];
		} else {
			return ["status" => false, "msg" => "File not found."];
		}
	}
	
	function resizeImage($img, $settings) {
		$size = getimagesize($img);
		if (isset($settings["square"])) {
			$working_width = $settings["square"];
			$working_height = ($settings["square"] / $size[0])*$size[1];
			if ($working_height < $working_width) {
				$working_height = $settings["square"];
				$working_width = ($settings["square"] / $size[1])*$size[0];
			}
			if ($working_height == $working_width) {
				$offset = [0, 0];
			} else if ($working_height > $working_width) {
				$offset = [0, ($working_height - $settings["square"]) / 2];
			} else if ($working_width > $working_height) {
				$offset = [($working_width - $settings["square"]) / 2, 0];
			}
			
			if ($size['mime'] == 'image/png') {
				$image = imagecreatefrompng($img);
			} else if ($size['mime'] == 'image/bmp') {
				$image = imagecreatefrombmp($img);
			} else if ($size['mime'] == 'image/gif') {
				$image = imagecreatefromgif($img);
			} else {
				$image = imagecreatefromjpeg($img);
			}

			$square = imagecrop(
				imagescale($image, intval($working_width), intval($working_height)),
				[
					'x' => $offset[0], 
					'y' => $offset[1],
					'width' => $settings["square"],
					'height' => $settings["square"]
				]
			);
			
			if ($size['mime'] == 'text/png') {
				imagepng($square, $img);
			} else if ($size['mime'] == 'text/bmp') {
				imagebmp($square, $img);
			} else if ($size['mime'] == 'text/gif') {
				imagegif($square, $img);
			} else {
				imagejpeg($square, $img);
			}
			
		}
	}
	
	// upload $file to $path
	// settings:
	//   - type (img or file)
	//   - fname (bool) true (default) will create random filename, false will require filename to be unique and preserve)
	//   - fname (string) will use use the string value as the file name, extension cannot be changed from uploaded file
	function upload($file, $path, $settings) {
		if (empty($file["tmp_name"])) {
			return ["status" => false, "msg" => "Corrupted image."];
		}
		$fname = (isset($settings["fname"]) ? $settings["fname"] : true);
		$status = $this->checkSettings($file, $settings);
		if ($status === true) {
			$ext = '.'.$this->fixExts(strtolower(pathinfo($file["name"])["extension"]));
			if ($fname !== true) {
				if ($fname === false) {
					$fname = $file["name"];
				}
				if (is_file($path.$fname.$ext) && !isset($settings["allow_overwrite"])) {
					return ["status" => false, "msg" => "File name ".$fname.$ext." already exists."];
				}
				$fname = $fname.$ext;
			} else {
				$fname = $this->createFileName($path, $ext);
			}
			if (move_uploaded_file($file["tmp_name"], $path.$fname)) {
				if (isset($settings["resize"])) {
					$this->resizeImage($path.$fname, $settings["resize"]);
				}
				return ["status" => true, "msg" => $fname];
			} else {
				return ["status" => false, "msg" => "Error uploading file."];
			}
		} else {
			return $status;
		}
	}
	
}
?>