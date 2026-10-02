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
			return [v];
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
	
	// which actions do not cause id changes
	isNonIdEffectAction(v) {
		return v == 'text' || v == 'general';
	}
	
	// entry point for call to state logging
	action(action = 'general', id = GLOBAL.overlay_editor.active_layer, new_id = null) {
		// santitize index incase called directly from html element
		id = sanitizeLayerId(id);
		new_id = new_id == null ? new_id : sanitizeLayerId(new_id);
		switch(action) {
			case 'text':
				if (this.pos > -1 && id == this.changes[this.pos].id && this.changes[this.pos].action == 'text') {
					this.changes[this.pos].diff = this.generalDiff(id)[1];
				} else {
					this.pushState(action, ...this.generalDiff(id));
				}
				break;
			case 'general':
				this.pushState(action, ...this.generalDiff(id));
				break;
			case 'text':
				this.pushState(action, ...this.generalDiff(id));
				break;
			case 'remove':
				this.pushState(action, id, null, null);
				break;
			case 'create':
				this.pushState(action, id, noRef(getLayerById(id)), null);
				break;
			case 'move':
				this.pushState(action, id, {
					id: id,
					new_id: new_id
				}, null);
				break;
		}
	}
	
	// log id changes of other layers affected by an insert or removal
	logIdBatchMap(id, insert = false) {
		let id_split = id.split('_');
		let end_id = parseInt(id_split.slice(-1));
		let parent_id = id_split.slice(0,-1).join('_');
		let layer_length = parent_id == '' ? GLOBAL.overlay_editor.current : getLayerById(parent_id);
		parent_id = (parent_id == '' ? '' : parent_id+'_');
		let return_map = [];
		for (let i=end_id+(insert ? 1 : 0); i<layer_length.layers.length; i++) {
			return_map.push({
				id: parent_id+(i + (insert ? -1 : 1)),
				new_id: parent_id+i
			});
		}
		return return_map;
	}
	
	// attach list of changed ids to change state
	detectIdDiff(action, id, diff) {
		
		if (this.isNonIdEffectAction(action)) {
			return null;
		}
		
		// map.f is a temporary forward looking reference
		let map = {
			f: {},
			b: {}
		};
		
		if (action == 'move') {
			
			let id_split = diff.id.split('_');
			let new_id_split = diff.new_id.split('_');
			let end_id = parseInt(id_split.pop());
			let end_new_id = parseInt(new_id_split.pop());
			
			// if same parent, changes of affected siblings but not itself
			if (arraysAreEqual(id_split, new_id_split)) {
				let dir = end_new_id > end_id ? 1 : -1;
				let start = (dir > 0 ? end_id : end_new_id)+(dir > 0 ? 1 : 0);
				let end = dir > 0 ? end_new_id : end_id;
				for (; start < end; start++) {
					let mapped_id = [...id_split, start].join('_');
					let mapped_new_id = [...id_split, start-dir].join('_');
					map.b[mapped_new_id] = mapped_id;
				}
			} else {
				
				// moved between groups
				
				// get new insert group affected siblings
				this.logIdBatchMap(diff.new_id, true).forEach(v => {
					map.f[v.id] = v.new_id;
					map.b[v.new_id] = v.id;
				});
				
				// determine if parent of old group was affected
				let parent_affected = this.isParentTo(diff.id, map.f);
				if (parent_affected !== null) {
					
					// get changes of old group by new parent reference, then convert back to old parent id before logging
					let original_parent = id_split.join('_');
					this.logIdBatchMap(parent_affected).forEach(v => {
						v.id = original_parent+v.id.slice(original_parent.length);
						map.b[v.new_id] = v.id;
					});
					
				} else {
					
					// get standard changes of old group siblings from removal
					this.logIdBatchMap(diff.id).forEach(v => {
						map.b[v.new_id] = v.id;
					});
					
				}
				
			}
			
			
		} else {
			
			// create action sends truthy boolean to predict id changes based on an insert
			this.logIdBatchMap(id, action == 'create').forEach(v => {
				map.b[v.new_id] = v.id;
			});
			
		}
		
		return map.b;
		
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
			diff: diff,
			nest: nest,
			id_diff: this.detectIdDiff(action, id, diff)
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
		
		if (this.isNonIdEffectAction(state.action)) {
			
			// general state update. undo will compile and assign object while redo will push state changes
			if (dir > 0) {
				this.updateLayers(state);
			} else {
				Object.assign(getLayerById(state.id), this.compile(state.id));
			}
			
				// refresh layer info editor if active layer was affected
			if (GLOBAL.overlay_editor.active_layer == state.id) {
				setupLayerInfoEditor();
			}
			
			return;
		}
		
		
		// undo / redo on removals or create cannot proc the overlay info editor refresh
		if (state.action == 'remove') {
			if (dir > 0) {
				// redo, remove layer again. boolean to prevent removeLayer from logging remove state again
				removeLayer(state.id, true);
			} else {
				// undo, add layer back
				addNewTypeLayer(null, state.id, false, false, this.compile(state.id, true), true);
			}
		} else if (state.action == 'create') {
			if (dir > 0) {
				addNewTypeLayer(null, state.id, false, false, noRef(state.diff), true);
			} else {
				removeLayer(state.id, true);
			}
		} else if (state.action == 'move') {
			
			// adjust layer location within overlay structure
			let id_layers = null; 
			let new_id_layers = null;
			if (dir > 0) {
				id_layers = getLayerParentById(state.diff.id).layers;
				let move = id_layers.splice(state.diff.id.split('_').pop(), 1);
				new_id_layers = getLayerParentById(state.diff.new_id).layers;
				new_id_layers.splice(state.diff.new_id.split('_').pop(), 0, ...move);
			} else {
				new_id_layers = getLayerParentById(state.diff.new_id).layers;
				let move = new_id_layers.splice(state.diff.new_id.split('_').pop(), 1);
				id_layers = getLayerParentById(state.diff.id).layers;
				id_layers.splice(state.diff.id.split('_').pop(), 0, ...move);
			}
			
		}
		
		// conditions to determine if active layer id needs to update from move / remove / create state change
		if (GLOBAL.overlay_editor.active_layer != null) {
			if (state.action == 'move') {
				if (GLOBAL.overlay_editor.active_layer == state.diff.id) {
					GLOBAL.overlay_editor.active_layer = state.diff.new_id;
				} else if (GLOBAL.overlay_editor.active_layer == state.diff.new_id) {
					GLOBAL.overlay_editor.active_layer = state.diff.id;
				} else {
					GLOBAL.overlay_editor.active_layer = this.conversionAffectsActive(state.diff.id, state.diff.new_id, GLOBAL.overlay_editor.active_layer, dir);
				}
			} else if (state.action == 'remove') {
				if (dir > 0 && GLOBAL.overlay_editor.active_layer == state.id) {
					setActiveLayer(null);
				} else {
					GLOBAL.overlay_editor.active_layer = this.conversionAffectsActive(state.id, null, GLOBAL.overlay_editor.active_layer, dir);
				}
			} else if (state.action == 'create') {
				if (GLOBAL.overlay_editor.active_layer == state.id && dir < 0) {
					setActiveLayer(null);
				} else {
					GLOBAL.overlay_editor.active_layer = this.conversionAffectsActive(null, state.id, GLOBAL.overlay_editor.active_layer, dir);
				}
			}
		}
		
		setupLayersUI();
		return;
	}
	
	// detect if layer move will affect active layer id
	conversionAffectsActive(id, new_id, active_id, dir) {
		
		let is_move = new_id != null && id != null;
		
		// if undo on move action, swap ids
		if (is_move && dir < 0) {
			[id, new_id] = [new_id, id];
		}
		
		let active_split = active_id.split('_').map(v => parseInt(v));
		let id_split = id == null ? [] : id.split('_').map(v => parseInt(v));
		let new_id_split = new_id == null ? [] : new_id.split('_').map(v => parseInt(v));
		
		// nested beyond the depth of active layer cannot affect it, empty the array
		if (id_split.length > active_split.length) {
			id_split = [];
		}
		if (new_id_split.length > active_split.length) {
			new_id_split = [];
		}
		
		// edge case: if move of parent of active layer, update explicitly to new location
		if (is_move && id_split.length < active_split.length && arraysAreEqual(id_split, active_split.slice(0, id_split.length))) {
			new_id_split.forEach((v,i) => {
				active_split[i] = v;
			});
			return active_split.join('_');
		}
		
		// determine if id endpoint affects active layer
		for (let i=0; i<id_split.length; i++) {
			if (i == id_split.length-1 && id_split[i] <= active_split[i]) {
				active_split[i] -= dir;
			}
			if (id_split[i] != active_split[i]) {
				break;
			}
		}
		
		// determine if new id endpoint affects active layer
		for (let i=0; i<new_id_split.length; i++) {
			if (i == new_id_split.length-1 && new_id_split[i] <= active_split[i]) {
				active_split[i] += dir;
			}
			if (new_id_split[i] != active_split[i]) {
				break;
			}
		}
		
		return active_split.join('_');
		
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
			// ternary for speed, remove reference on position point array, objects will be traveresed so never set here, direct values hold no reference when set
			ref[set_diff.path[i]] = Array.isArray(set_diff.value) ? noRef(set_diff.value) : set_diff.value;
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
	
	// if id change is a parent to the active id, convert the parent portion of the id change
	isParentTo(id, diff) {
		let keys = Object.keys(diff);
		for (let i=0; i<keys.length; i++) {
			if (id != keys[i] && id.startsWith(keys[i])) {
				return diff[keys[i]]+id.slice(keys[i].length);
			}
		}
		return null;
	}
	
	getOrigins(id, exclusive) {
		
		// inverse id change (per position index) for forward return within compile
		let pos_id_map = {};
		
		for (let i=this.pos; i>-1; i--) {
			
			// if create action initialized this layer, return as starting point
			// increment index to skip object creation state change
			if (this.changes[i].action == 'create') {
			
				if (this.changes[i].id == id) {
					
					// if exact match, start found
					return [id, noRef(this.changes[i].diff), i+1, pos_id_map];
					
				} else if (id.startsWith(this.changes[i].id)) {
					
					// starting object is child of parent creation
					let ref = noRef(this.changes[i].diff);
					// cut off starting portion of already-found object depth and keep remainder to traverse layers and return
					id.slice(this.changes[i].id.length+1).split('_').forEach(nest_id => {
						ref = ref.layers[parseInt(nest_id)];
					});
					return [id, ref, i+1, pos_id_map];
				
				}
				
			} else if (this.changes[i].action == 'move' && this.changes[i].diff.new_id == id) {
				
				// direct move conversion, log and then continue to prevent id diff change on this layer
				pos_id_map[i] = id;
				id = this.changes[i].diff.id;
				continue;
				
			}
			
			// check for id changes on action
			if (this.changes[i].id_diff != null) {
				
				if (typeof this.changes[i].id_diff[id] !== 'undefined') {
					
					// direct id conversion
					pos_id_map[i] = id;
					id = this.changes[i].id_diff[id];
					
				} else {
					
					// parent change to id
					let parent_change = this.isParentTo(id, this.changes[i].id_diff);
					if (parent_change !== null) {
						pos_id_map[i] = id;
						id = parent_change;
					}
					
				}
				
			}
			
		}
		
		// object pulls ref from original object
		return [id, noRef(getLayerById(id, this.original)), 0, pos_id_map];
		
	}
	
	
	// return a de-referenced object by id with up-to (non-inclusive) current state changes included
	compile(id, exclusive = false) {

		let obj = null;
		let i = null;
		let pos_id_map = null;
		[id, obj, i, pos_id_map] = this.getOrigins(id, exclusive);
		
		// loop changes from start to previous element and compile into finished object
		while (i < this.pos) {
			
			// convert forward id before state change if not a removal
			// REMOVE action functions differently in that it could allow the removed layer id to fall into the current id conversion if it is the next sibling, so it must be converted after the state change
			// MOVE or CREATE could bump UP into the active layer id, meaning that id must be converted before the state change to prevent collision
			if (this.changes[i].action != 'remove' && pos_id_map != null && typeof pos_id_map[i] !== 'undefined') {
				id = pos_id_map[i];
			}

			if (this.changes[i].action == 'move') {
				// move action just changes layer id in trailing method below, no change actions made
			} else if (this.changes[i].id == id) {
				
				// exact match, pull in all state changes
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
					
					// if creating child, insert rather than assuming update
					if (this.changes[i].action == 'create') {
						ref.splice(parseInt(id_list.pop()), 0, this.changes[i].diff);
					} else {
						this.updateLayers(this.changes[i], ref);
					}
					
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
			
			// convert forward after state change if it is a removal
			if (this.changes[i].action == 'remove' && pos_id_map != null && typeof pos_id_map[i] !== 'undefined') {
				id = pos_id_map[i];
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