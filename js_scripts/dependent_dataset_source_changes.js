function dependentDatasetSourceChanges(source) {
	
	// convert source to path string regardless of string parsed or not
	source = getRealVariableParts(source).map(v => v.real ? v.real : v.variable)[0];
	
	// output source_list
	let source_list = [];
	
	// split path
	let depth = source.split('/');
	
	// depth < 2 is not allowed
	if (depth.length < 2) {
		return [];
	}
	
	if (depth.length == 2) {
		
		// dataset page update, get all sources associated with the dataset itself
		source_list.push(...checkDataForPathReference(source));
		
	} else if (depth.length == 5) {
		
		// pinpointed dataset value update, get only associated entry dependent sources
		source_list.push(...checkDataForPathReference('sets/'+depth[1]+'/entries/'+depth[3]));
		
	}
	
	return source_list.map(x => { return '$var$'+x+'$/var$'; });
	
}