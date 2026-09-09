// will need changes to nested general functions when transform feature affects clipping paths
class ols {
	
	pos = -1;
	changes = [];
	original = null;
	
	layer_comparisons = {};
	
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
	
	init() {
		this.pos = -1;
		this.changes = [];
		this.original = noRef(GLOBAL.overlay_editor.current);
	}
	
	pushState(action, id, diff, nest) {

		if (this.pos < this.changes.length-1) {
			this.changes.length = this.pos < 0 ? 0 : this.pos+1;
		}
		
		this.pos++;
		this.changes.push({
			id: id,
			forward: {
				action: action,
				id: id,
				diff: diff,
				nest: nest
			},
			back: this.prevLookup(id)
		});
		
	}
	
	prevLookup(id) {
		
		let i = this.pos-1;
		while (i > -1) {
			if (
				this.changes[i].id == id || 
				(
					this.changes[i].forward.nest != null &&
					id.startsWith(this.changes[i].id)
				)
			) {
				break;
			}
			i--;
		}
		
		if (i < 0) {
			return {
				id: id,
				original: true
			}
		} else {
			return i;
		}
		
	}
	
	undo() {
		if (this.pos < 0) {
			this.pos = -1;
			return;
		}
		this.pullState(-1);
		// reduce position after undo, since the current state has lookup for previous position
		this.pos--;
	}
	
	redo() {
		// next state then redo
		this.pos++;
		if (this.pos < this.changes.length) {
			this.pullState(1);
		} else {
			this.pos = this.changes.length-1;
		}
	}
	
	pullState(dir) {
		let state = this.changes[this.pos];
		let use_state = dir > 0 ? state.forward : (Number.isInteger(state.back) ? this.changes[state.back].forward : state.back);
		
		if (dir > 0 && use_state.action == 'remove') {
			removeLayer(use_state.id, true);
		} else if (dir < 0 && state.forward.action == 'remove') {
			addNewTypeLayer(null, state.id, false, false, this.compile(state.id));
		} else {
			this.updateLayers(use_state);
		}
		
		if (GLOBAL.overlay_editor.active_layer == use_state.id) {
			setupLayerInfoEditor();
		}
	}
	
	updateLayers(obj, local_ref = null) {
		let layer = local_ref != null ? local_ref : getLayerById(obj.id);
		if (typeof obj.original !== 'undefined') {
			Object.assign(layer, noRef(getLayerById(obj.id, this.original)));
		} else {
			obj.diff.forEach(set_diff => {
				let ref = layer;
				let i = 0;
				for (i=0; i<set_diff.path.length-1; i++) {
					ref = ref[set_diff.path[i]];
				}
				ref[set_diff.path[i]] = set_diff.value;
			});
			if (obj.nest !== null) {
				obj.nest.forEach((diff, i) => {
					this.updateLayers(diff, layer.layers[i]);
				});
			}
		}
	}
	
	action(action = 'general', id = GLOBAL.overlay_editor.active_layer) {
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
	
	generalDiff(id) {
		
		let check_for_nested_changes = false;
		let layer = noRef(getLayerById(id));
		let diff = [];
		
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
		
		let obj = noRef(getLayerById(id, this.original));
		let i = 0;
		
		while (i < this.pos) {
			
			if (this.changes[i].forward.action == 'remove' && this.changes[i].id.startsWith(id)) {
				
				let ref = obj;
				let id_list = this.changes[i].id.split('_');
				for (let i2=id.split('_').length; i2<id_list.length-1; i2++) {
					ref = ref.layers[id_list[i2]];
				}
				ref.layers.splice(id_list.pop(), 1);
				
			} else if (this.changes[i].id == id) {
				
				this.updateLayers(this.changes[i].forward, obj);
				
			} else if (this.changes[i].forward.nest != null && id.startsWith(this.changes[i].id)) {

				let ref = this.changes[i].forward;
				let id_diff = this.changes[i].id.split('_').length;
				id.split('_').forEach((layer_id, i) => {
					if (i >= id_diff) {
						ref = ref.nest[layer_id];
					}
				});
				if (ref != null) {
					this.updateLayers(ref, obj);
				}
				
			}
			
			i++;
			
		}
		
		return obj;
		
	}
	
	nestedPositionChanges(layers, id) {
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

function olsGeneralLog() {
	GLOBAL.overlay_editor.state.action();
}