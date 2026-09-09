// will need changes to nested general functions when transform feature affects clipping paths
// will also need to prevent nested log when alt+drag allows clip path to move without affecting children
class ols {
	
	pos = -1; // position within state diff
	changes = []; // state diff
	original = null; // original state
	
	layer_comparisons = {};
	
	
	// generate skeletons of layer types for general diff
	constructor() {
		this.layer_comparisons = {
			text: this.getStructure(requestNewLayer('text')),
			image: this.getStructure(requestNewLayer('image')),
			clip_path: this.getStructure(requestNewLayer('clip_path'))
		}
	}
	getStructure(obj) {
		return this.getStructureNest(obj).map(v => {
			if (v.indexOf('/') > -1) {
				return v.split('/');
			}
			return v;
		});
	}
	getStructureNest(obj) {
		return Object.keys(obj).flatMap(key => {
			if (isObject(obj[key])) {
				return this.getStructureNest(obj[key]).map(inner_keys => key+'/'+inner_keys);
			}
			return key;
		}).filter(v => v != 'layers');
	}
	
	// init for current overlay in editor
	init() {
		this.pos = -1;
		this.changes = [];
		this.original = noRef(GLOBAL.overlay_editor.current);
	}
	
	// entry point for call to state logging
	action(action = 'general', id = GLOBAL.overlay_editor.active_layer) {
		// santitize index incase called directly from html element
		if (id.indexOf('layer_') > -1) {
			id = id.replace('layer_','');
		}
		switch(action) {
			case 'general':
				this.pushState(action, ...this.generalDiff(id));
				break;
			case 'remove':
				this.pushState(action, id, null, null);
				break;
		}
	}
	
	// push state to the undo / redo states array
	pushState(action, id, diff, nest) {

		// if change after undo, clip trailing states
		if (this.pos < this.changes.length-1) {
			this.changes.length = this.pos < 0 ? 0 : this.pos+1;
		}
		
		// push new state
		this.pos++;
		this.changes.push({
			id: id,
			action: action,
			id: id,
			diff: diff,
			nest: nest
		});
		
	}
	
	undo() {
		if (this.pos < 0) {
			this.pos = -1;
			return;
		}
		// undo pullstate is predictive, decrement after (checks if current state was a removal and then compiles UP TO, but not including, the current state)
		this.pullState(-1);
		this.pos--;
	}
	
	redo() {
		this.pos++;
		if (this.pos < this.changes.length) {
			this.pullState(1);
		} else {
			this.pos = this.changes.length-1;
		}
	}
	
	pullState(dir) {
		
		// current state
		let state = this.changes[this.pos];
		
		// undo / redo on removals cannot proc the overlay info editor refresh
		if (state.action == 'remove') {
			if (dir > 0) {
				// redo, remove layer again. boolean to prevent removeLayer from logging remove state again
				removeLayer(state.id, true);
			} else {
				// undo, add layer back. state id is a direct index location, so final index insert location must be decremented unless 0
				let insert_ids = state.id.split('_');
				if (insert_ids.length > 1) {
					let insert_id = parseInt(insert_ids[insert_ids.length-1]);
					if (insert_id > 0) {
						insert_ids[insert_ids.length-1] = insert_id-1;
					}
				}
				addNewTypeLayer(null, insert_ids.join('_'), false, false, this.compile(state.id));
			}
			return;
		}
		
		if (state.action == 'general') {
			// general state update. undo will compile and assign object while redo will push state changes
			if (dir > 0) {
				this.updateLayers(state);
			} else {
				Object.assign(getLayerById(state.id), this.compile(state.id));
			}
		}
		
		// refresh layer info editor if active layer was affected
		if (GLOBAL.overlay_editor.active_layer == state.id) {
			setupLayerInfoEditor();
		}
		
	}
	
	updateLayers(obj, local_ref = null) {
		
		// update local object or overlay directly
		let layer = local_ref != null ? local_ref : getLayerById(obj.id);
		
		// apply current state diffs to layer
		obj.diff.forEach(set_diff => {
			let ref = layer;
			let i = 0;
			for (i=0; i<set_diff.path.length-1; i++) {
				ref = ref[set_diff.path[i]];
			}
			ref[set_diff.path[i]] = set_diff.value;
		});
		
		// traverse layer update on child diffs
		if (obj.nest !== null) {
			obj.nest.forEach((diff, i) => {
				this.updateLayers(diff, layer.layers[i]);
			});
		}
		
	}
	
	generalDiff(id) {
		
		// general diff pulls structures from "layer_comparisons" and determines the difference of the current state from the previous
		// !!TODO: clip paths will call for a check into nested position changes ... dimension changes will follow when transform feature is built for clipping paths
		let check_for_nested_changes = false;
		let layer = noRef(getLayerById(id));
		let diff = [];
		
		// prevent layer diff check if non clipping group, this layer will never actually change only its children
		if (layer.type == 'clip_path' && layer.clip_path.type == 'none') {
			check_for_nested_changes = true;
		}
		
		if (check_for_nested_changes == false) {
			
			let prev_layer = this.compile(id);
			
			this.layer_comparisons[layer.type].forEach(path => {
				
				let ref = layer;
				let ref_prev = prev_layer;
				
				if (Array.isArray(path)) {
					path.forEach(key => {
						ref = ref[key];
						ref_prev = ref_prev[key];
					});
				} else {
					ref = ref[path];
					ref_prev = ref_prev[path];
				}
				
				let is_array = Array.isArray(ref);
				if ((is_array && !arraysAreEqual(ref, ref_prev)) || (!is_array && ref != ref_prev)) {
					diff.push({
						path: path,
						value: ref
					});
					// if difference in position changes, call for potential child traversal
					if (['x','y','clip_points'].includes(path[path.length-1])) {
						check_for_nested_changes = true;
					}
				}
				
			});
		
		}
		
		return [
			id,
			diff,
			check_for_nested_changes && layer.type == 'clip_path' && layer.layers.length > 0 ? this.nestedPositionChanges(layer.layers, id) : null
		];
		
	}
	
	compile(id) {
		// return a de-referenced object by id with up-to (non-inclusive) current state changes included
		
		// get non reference original object by layer id
		let obj = noRef(getLayerById(id, this.original));
		let i = 0;
		
		// loop changes from start to previous element and compile into finished object
		while (i < this.pos) { 

			if (this.changes[i].id == id) {
				
				// exact math, pull in all state changes
				this.updateLayers(this.changes[i], obj);
				
			} else {
				
				let is_child = id.startsWith(this.changes[i].id); // compile id is a child of this state change
				let is_parent = this.changes[i].id.startsWith(id); // compile id is a parent of this state change
			
				if (this.changes[i].action == 'remove' && this.changes[i].nest != null && is_parent) {
					
					// removal can never match exact id because it doesnt exist in the state to request it
					// however it can be a child of the current
					// find and splice
					let ref = obj;
					let id_list = this.changes[i].id.split('_');
					for (let i2=id.split('_').length; i2<id_list.length-1; i2++) {
						ref = ref.layers[id_list[i2]];
					}
					ref.layers.splice(id_list.pop(), 1);
					
				} else if (is_parent) {
					
					// if state change is a child of this compile id, pull in changes to specific child of object
					let ref = obj;
					let id_list = this.changes[i].id.split('_');
					for (let i2=id.split('_').length; i2<id_list.length; i2++) {
						ref = ref.layers[id_list[i2]];
					}
					this.updateLayers(this.changes[i], ref);
					
				} else if (is_child) {
					
					// if state change is a parent of the compile id, search for sub changes and pull them in
					let ref = this.changes[i];
					let id_list = id.split('_');
					for (let i2=this.changes[i].id.split('_').length; i2<id_list.length; i2++) {
						ref = ref.nest[id_list[i2]];
					}
					this.updateLayers(ref, obj);
					
				}
			}
			
			i++;
		}
		
		return obj;
		
	}
	
	nestedPositionChanges(layers, id) {
		
		// traverse all child layers and log current positioning as a diff
		let diff = [];
		layers.forEach((layer, i) => {
			let append_id = id+'_'+i;
			if (layer.type == 'clip_path') {
				diff.push({
					id: append_id,
					diff: (layer.clip_path.type != 'none'
						?	[
								{
									path: ['clip_path','clip_points'],
									value: layer.clip_path.clip_points
								},
								{
									path: ['clip_path','offset','x'],
									value: layer.clip_path.offset.x
								},
								{
									path: ['clip_path','offset','y'],
									value: layer.clip_path.offset.y
								}
							]
						: []
					),
					nest: layer.layers.length > 0 ? this.nestedPositionChanges(layer.layers, append_id) : null
				});
			} else {
				diff.push({
					id: append_id,
					diff: [
						{
							path: ['offset','x'],
							value: layer.offset.x
						},
						{
							path: ['offset','y'],
							value: layer.offset.y
						}
					],
					nest: null
				});
			}
		});
		return diff;
	}
		
}

// quick call for general action state logging
function olsGeneralLog() {
	GLOBAL.overlay_editor.state.action();
}