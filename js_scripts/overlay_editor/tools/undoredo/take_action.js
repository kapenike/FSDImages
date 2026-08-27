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
		return Object.keys(obj).flatMap(key => {
			if (isObject(obj[key])) {
				return this.getStructure(obj[key]).map(inner_keys => key+'/'+inner_keys);
			}
			return key;
		}).filter(v => v != 'layers').map(v => {
			if (v.indexOf('/') > -1) {
				return v.split('/');
			}
			return v;
		});
	}
	
	init() {
		this.pos = -1;
		this.changes = [];
		this.original = JSON.parse(JSON.stringify(GLOBAL.overlay_editor.current));
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
			if (this.changes[i].id == id) {
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
		this.pos--;
	}
	
	redo() {
		if (this.pos < this.changes.length-1) {
			this.pos++;
			this.pullState(1);
		}
	}
	
	pullState(dir) {
		let state = this.changes[this.pos];
		this.updateLayers(dir > 0 ? state.forward : (Number.isInteger(state.back) ? this.changes[state.back].forward : state.back));
	}
	
	updateLayers(obj, local_ref = null) {
		let layer = local_ref != null ? local_ref : getLayerById(obj.id);
		if (typeof obj.original !== 'undefined') {
			Object.assign(layer, JSON.parse(JSON.stringify(getLayerById(obj.id, this.original))));
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
				obj.nest.forEach(diff => {
					this.updateLayers(diff);
				});
			}
		}
	}
	
	action(action = 'general', id = GLOBAL.overlay_editor.active_layer) {
		switch(action) {
			case 'general':
				this.pushState(action, ...this.generalDiff(id));
				break;
		}
	}
	
	generalDiff(id) {
		
		let check_for_nested_changes = false;
		
		let layer = JSON.parse(JSON.stringify(getLayerById(id)));
		let prev_layer = this.compile(id);
		
		let diff = [];
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
			
			if ((Array.isArray(ref) && arraysAreEqual(ref, ref_prev)) || ref != ref_prev) {
				diff.push({
					path: path,
					value: ref
				});
				if (['x','y','clip_points'].includes(path[path.length-1])) {
					check_for_nested_changes = true;
				}
			}
			
		});
		
		return [
			id,
			diff,
			check_for_nested_changes && layer.type == 'clip_path' && layer.layers.length > 0 ? this.nestedPositionChanges(layer.layers) : null
		];
		
	}
	
	compile(id) {
		let obj = JSON.parse(JSON.stringify(getLayerById(id, this.original)));
		let i = 0;
		while (i <= this.pos) {
			if (this.changes[i].id == id) {
				this.updateLayers(this.changes[i].forward, obj);
			}
			i++;
		}
		return obj;
	}
	
	nestedPositionChanges(layers) {
		let diff = [];
		layers.forEach(layer => {
			if (layer.type == 'clip_path') {
				diff.push({
					id: layer.id,
					diff: [
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
							value: layer.clip_path.offset.x
						}
					],
					nest: layer.layers.length > 0 ? this.nestedPositionChanges(layer.layers) : null
				});
			} else {
				diff.push({
					id: layer.id,
					diff: [
						{
							path: ['offset','x'],
							value: layer.offset.x
						},
						{
							path: ['offset','y'],
							value: layer.offset.x
						}
					],
					nest: null
				});
			}
		});
		return diff;
	}
		
}