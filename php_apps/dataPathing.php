<?php

// backend quickly flatten entire projects data reference strings
class dataPathing {
	
	function isPathVariable($value) {
		return is_string($value) && str_contains($value, '$var$') && str_contains($value, '$/var$');
	}
	
	function getRealValue($project, $value) {
		if ($this->isPathVariable($value)) {
			$value = explode('$var$',explode('$/var$', $value)[0])[1];
			if (str_contains($value, '$/pointer$')) {
				$value = explode('$/pointer$',$value)[1];
			}
			$ref = $project->data;
			foreach (explode('/', $value) as $path_pointer) {
				if ($this->isPathVariable($ref)) {
					$ref = $this->getRealValue($project, $ref);
				}
				if (property_exists($ref,$path_pointer)) {
					$ref = $ref->{$path_pointer};
				} else {
					$ref = null;
					break;
				}
			}
			if ($this->isPathVariable($ref)) {
				$value = $this->getRealValue($project, $ref);
			} else {
				$value = $ref;
			}
		}
		return $value;
	}
	
	function convertLayer($project, $layer) {
		foreach (array_keys(get_object_vars($layer)) as $layer_key) {
			if (is_object($layer->{$layer_key})) {
				$layer->{$layer_key} = $this->convertLayer($project, $layer->{$layer_key});
			} else {
				$layer->{$layer_key} = $this->getRealValue($project, $layer->{$layer_key});
			}
		}
		return $layer;
	}
	
	function convertAll($project) {
		$project->data = $this->convertLayer($project, $project->data);
		return $project;
	}
	
}

?>