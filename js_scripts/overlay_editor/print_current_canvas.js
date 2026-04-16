function printCurrentCanvas() {
	
	let ctx = GLOBAL.overlay_editor.ctx;
	let overlay = GLOBAL.overlay_editor.current;
	ctx.textBaseline = 'top';
	
	// reset canvas
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, GLOBAL.overlay_editor.dimensions.width, GLOBAL.overlay_editor.dimensions.height);
	
	// set print from location to scaled down area start
	ctx.translate(
		(GLOBAL.overlay_editor.dimensions.width/2) - ((GLOBAL.overlay_editor.current.dimensions.width/2)*GLOBAL.overlay_editor.scale) - GLOBAL.overlay_editor.canvas_window.x,
		(GLOBAL.overlay_editor.dimensions.height/2) - ((GLOBAL.overlay_editor.current.dimensions.height/2)*GLOBAL.overlay_editor.scale) - GLOBAL.overlay_editor.canvas_window.y
	);
	
	// scale canvas
	ctx.scale(GLOBAL.overlay_editor.scale, GLOBAL.overlay_editor.scale);
	
	// print backdrop over current overlay size
	ctx.fillStyle = '#555555';
	ctx.fillRect(0, 0, GLOBAL.overlay_editor.current.dimensions.width, GLOBAL.overlay_editor.current.dimensions.height);
	
	// print layers recursively
	printLayers(ctx, overlay.layers, true);
	
	// define radius draw size for custom clip path points
	let clip_path_point_radius = definePolygonPointSize();
	
	// active layer indicator
	if (GLOBAL.overlay_editor.active_layer != null) {
		
		let selection_layer = getLayerById(GLOBAL.overlay_editor.active_layer);
		
		ctx.lineWidth = 2/GLOBAL.overlay_editor.scale;
		ctx.setLineDash([1, 2]);
		ctx.strokeStyle = '#0051ff';
		
		if (selection_layer.type == 'clip_path' && selection_layer.clip_path.type == 'custom') {
			
			GLOBAL.overlay_editor.active_layer_selection = {
				custom_clip_path: true,
				points: JSON.parse(JSON.stringify(selection_layer.clip_path.clip_points)),
				x: 0,
				y: 0,
				width: 0,
				height: 0
			};
			
			if (selection_layer.clip_path.clip_points.length > 0) {
			
				// draw selection path
				ctx.beginPath();
				ctx.moveTo(selection_layer.clip_path.clip_points[0].x, selection_layer.clip_path.clip_points[0].y);
				for (let i2=0; i2<selection_layer.clip_path.clip_points.length; i2++) {
					ctx.lineTo(selection_layer.clip_path.clip_points[i2].x, selection_layer.clip_path.clip_points[i2].y);
				}
				ctx.lineTo(selection_layer.clip_path.clip_points[0].x, selection_layer.clip_path.clip_points[0].y);
				ctx.closePath();
				ctx.stroke();
				
				// if drag point enabled, draw drag circles
				if (GLOBAL.overlay_editor.custom_clip_path.allow_drag_move) {
					ctx.setLineDash([]);
					selection_layer.clip_path.clip_points.forEach(point => {
						ctx.beginPath();
						ctx.arc(point.x, point.y, clip_path_point_radius, 0, 2 * Math.PI);
						ctx.stroke();
					});
				}
			
			}
			
		} else {
		
			let out_dim = getLayerOutputDimensions(selection_layer);

			if (out_dim != null) {
				
				if (selection_layer.type == 'text' && selection_layer.style.rotation && selection_layer.style.rotation != 0) {
					ctx.save();
					let alignment_offset = (
						selection_layer.style.align == 'center' 
							? out_dim.width/2
							: (selection_layer.style.align == 'right'
								? out_dim.width
								: 0
								)
					);
					ctx.translate(out_dim.x + alignment_offset, out_dim.y);
					ctx.rotate(degToRad(selection_layer.style.rotation));
					ctx.strokeRect(0 - alignment_offset, 0, out_dim.width, out_dim.height);
					ctx.restore();
					out_dim.rotation = selection_layer.style.rotation;
					out_dim.rotation_origin = {
						x: out_dim.x + alignment_offset,
						y: out_dim.y
					};
				} else {
					ctx.strokeRect(out_dim.x, out_dim.y, out_dim.width, out_dim.height);
				}
				
				// save selection area for dragging logic
				GLOBAL.overlay_editor.active_layer_selection = out_dim;
			} else {
				GLOBAL.overlay_editor.active_layer_selection = null;
			}
		
		}
	}
	
}