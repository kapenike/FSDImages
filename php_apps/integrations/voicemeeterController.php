<?php

class voicemeeterController {
	
	function executeCommands($puid, $json) {
		
		// definte ffi header for voicemeeter remote api dll
		$ffi = FFI::cdef("
			long VBVMR_Login(void);
			long VBVMR_Logout(void);
			long VBVMR_SetParameterFloat(char * szParamName, float Value);
			long VBVMR_GetParameterFloat(char * szParamName, float * pValue);
			long VBVMR_SetParameterStringA(char * szParamName, char * szString);
			long VBVMR_IsParametersDirty(void);
		", json_decode(file_get_contents(getBasePath().'/data/'.$puid.'/container.json'))->settings->voicemeeter_api_dll);
		
		// attempt to login
		if ($ffi->VBVMR_Login() === 0) {
			
			$ffi->VBVMR_IsParametersDirty();
			
			foreach ($json as $command) {
				
				if ($command->action == 'gain') {
					
					$ffi->VBVMR_SetParameterFloat('Strip['.$command->bus.'].Gain', $command->value);
					
				} else if ($command->action == 'fade') {
					
					$ffi->VBVMR_SetParameterStringA('Strip['.$command->bus.'].FadeTo', '('.$command->value.','.$command->param_1.')');
					
				} else if ($command->action == 'mute') {
					
					$ffi->VBVMR_SetParameterFloat('Strip['.$command->bus.'].Mute', $command->value == 'true' ? '1' : '0');
					
				}
				
				$ffi->VBVMR_IsParametersDirty();
				
			}
			
			// sleep 50ms to ensure dll has enough time to process requests
			usleep(50000);
			
			// logout
			$ffi->VBVMR_Logout();
			
			app('respond')->json(true, 'Error logging into voicemeeter remote api.');
			
		} else {
			
			app('respond')->json(false, 'Error logging into voicemeeter remote api.');
			
		}
		
	}
	
}

?>