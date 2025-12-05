// accepts list of data sources that have been changed to determine what overlays to regenerate, send null to generate all and set source paths
function generateStreamOverlays(sources = null, callback = () => {}) {

	// stash overlay keys for itteration use
	let overlay_keys = Object.keys(GLOBAL.active_project.overlays);
	
	// if sources is null, or an object, set GLOBAL flag to regenerate sources
	if (sources == null || isObject(sources)) {
		GLOBAL.generate_sources = true;
	}
	
	// pre-initialize ajax loader for overlay generation (useVRAM may stall the loader)
	ajaxInitLoader('body');
	
	// overlay output, prepared as ready to send form object
	let output_overlays = {
		application: 'export_overlays',
		uid: GLOBAL.active_project.uid,
		changed: []
	};
	
	// loop currents overlay keys and detect which to update based on sources change
	overlay_keys.forEach(slug => {
		
		// current overlay
		let overlay = GLOBAL.active_project.overlays[slug];

		// if overlay contains an updated source, or sources is null, or is set to generate specific overlay
		if (sources == null || (isObject(sources) && sources.slug == slug) || (overlay.sources.length > 0 && sources.length > 0 && overlay.sources.some(x => sources.includes(x)))) {
			
			// define output canvas
			let canvas = Create('canvas', {
				width: overlay.dimensions.width,
				height: overlay.dimensions.height
			});
			
			// canvas context
			let ctx = canvas.getContext('2d');
			
			// use top-down baseline for easier reference during data output from .psd
			ctx.textBaseline = 'top';
			
			// if global flag, reset overlay sources
			if (GLOBAL.generate_sources == true) {
				GLOBAL.active_project.overlays[slug].sources = requestSourceList(GLOBAL.active_project.overlays[slug]);
			}
		
			// log overlay slug for capture with PHP
			output_overlays.changed.push(overlay.slug);
			
			// generate overlay
			generateOverlay(ctx, output_overlays, overlay);
			
			// save generated overlay as base64 encoded string, referenced by its slug for lookup using $_POST[slug] and array log of changed slugs
			// !!ISSUE[1]: base 64 png is ~30% larger than a binary png ... find a way to convert and append as a file to form object to save on write time
			//		- worth problem solving if the host runs this application on a USB drive
			output_overlays[overlay.slug] = canvas.toDataURL('image/png');
			
		}
		
	});
	
	// reset generate sources global flag
	if (GLOBAL.generate_sources == true) {
		GLOBAL.generate_sources = false;
	}
	
	// if nothing to change, remove loader
	if (output_overlays.changed.length == 0) {
		
		sendP2P(output_overlays, sources);
		callback();
		ajaxRemoveLoader('body');
		
	} else {
		
		// pass output_overlays object to PHP for file write
		ajax('POST', '/requestor.php', output_overlays, () => {
			sendP2P(output_overlays, sources);
			callback();
		}, 'body');
		
	}
	
}

function sendP2P(output_overlays, sources) {
	// if any data point or overlay changes, notify P2P server
	if (P2P_SERVER.status && (output_overlays.changed.length > 0 || (Array.isArray(sources) && sources.length > 0))) {
		let send_overlays = output_overlays.changed.length > 0 ? output_overlays.changed : [];
		let send_data_points = {};
		(Array.isArray(sources) && sources.length > 0 ? sources : []).forEach(source => {
			send_data_points[getRealVariableParts(source)[0].variable] = flattenDataObject(source);
		});
		// if P2P server running, notify clients of overlay and data changes
		P2P_SERVER.connection.send(JSON.stringify({
			action: 'overlay_data_updates',
			overlays: send_overlays,
			data: send_data_points
		}));
	}
}

function printLayers(ctx, layers) {
	
	// loop layers from back to front
	for (let i=layers.length-1; i>-1; i--) {
	
		// active layer
		let layer = layers[i];
		
		if (layer.type == 'image') {
			printImage(ctx, layer);
		} else if (layer.type == 'text') {
			printText(ctx, layer);
		} else if (layer.type == 'clip_path') {
			
			if (toggleTrue(layer)) {
				
				// square clipping path
				if (layer.clip_path.type == 'square') {
					ctx.beginPath();
					ctx.moveTo(layer.clip_path.offset.x, layer.clip_path.offset.y);
					ctx.lineTo(layer.clip_path.offset.x, layer.clip_path.offset.y + layer.clip_path.dimensions.height);
					ctx.lineTo(layer.clip_path.offset.x + layer.clip_path.dimensions.width, layer.clip_path.offset.y + layer.clip_path.dimensions.height);
					ctx.lineTo(layer.clip_path.offset.x + layer.clip_path.dimensions.width, layer.clip_path.offset.y);
					ctx.lineTo(layer.clip_path.offset.x, layer.clip_path.offset.y);
					ctx.closePath();
				} else if (layer.clip_path.type == 'custom') {
					// custom clipping path

					// if empty clip points, dont print layer
					if (layer.clip_path.clip_points.length == 0) {
						continue;
					}
					
					ctx.beginPath();
					ctx.moveTo(layer.clip_path.clip_points[0].x, layer.clip_path.clip_points[0].y);
					for (let i2=0; i2<layer.clip_path.clip_points.length; i2++) {
						ctx.lineTo(layer.clip_path.clip_points[i2].x, layer.clip_path.clip_points[i2].y);
					}
					ctx.lineTo(layer.clip_path.clip_points[0].x, layer.clip_path.clip_points[0].y);
					ctx.closePath();
					
				}
				
				// if a clip path, allow fill
				if (layer.clip_path.type != 'none') {
					if (layer.clip_path.color) {
						let clip_color = getRealValue(layer.clip_path.color).replaceAll(' ', '');
						// test if valid color before using
						let test_color = new Option().style;
						test_color.color = clip_color;
						if (test_color.color !== '') {
							ctx.fillStyle = clip_color;
							ctx.fill();
						}
					}
					ctx.save();
					ctx.clip();
				}
				
				// print sub layers
				printLayers(ctx, layer.layers);
				
				// if clipping path, restore
				if (layer.clip_path.type != 'none') {
					
					ctx.restore();
					
					// if border in use
					if (layer.clip_path.border.use) {
						
						let border_color = getRealValue(layer.clip_path.border.color).replaceAll(' ', '');
						// test if valid color before using
						let test_border_color = new Option().style;
						test_border_color.color = border_color;
						
						if (test_border_color.color !== '') {

							// re-set path incase a sub layer was a clip path as well
							if (layer.clip_path.type == 'square') {
								ctx.beginPath();
								ctx.moveTo(layer.clip_path.offset.x, layer.clip_path.offset.y);
								ctx.lineTo(layer.clip_path.offset.x, layer.clip_path.offset.y + layer.clip_path.dimensions.height);
								ctx.lineTo(layer.clip_path.offset.x + layer.clip_path.dimensions.width, layer.clip_path.offset.y + layer.clip_path.dimensions.height);
								ctx.lineTo(layer.clip_path.offset.x + layer.clip_path.dimensions.width, layer.clip_path.offset.y);
								ctx.lineTo(layer.clip_path.offset.x, layer.clip_path.offset.y);
								ctx.closePath();
							} else if (layer.clip_path.type == 'custom') {
								ctx.beginPath();
								ctx.moveTo(layer.clip_path.clip_points[0].x, layer.clip_path.clip_points[0].y);
								for (let i2=0; i2<layer.clip_path.clip_points.length; i2++) {
									ctx.lineTo(layer.clip_path.clip_points[i2].x, layer.clip_path.clip_points[i2].y);
								}
								ctx.lineTo(layer.clip_path.clip_points[0].x, layer.clip_path.clip_points[0].y);
								ctx.closePath();
							}
							
							// clip and restore so border is only on the inside of the polygon
							ctx.save();
							ctx.clip();
							
							// print border
							ctx.setLineDash([]);
							ctx.strokeStyle = border_color;
							ctx.lineWidth = layer.clip_path.border.width;
							ctx.stroke();
							
							ctx.restore();
							
						}
						
					}
					
				}
				
			}
			
		} else if (layer.type == 'rect') {
			printRect(ctx, layer);
		}
	
	}
	
}

function generateOverlay(ctx, output_overlays, overlay) {
	
	// reset canvas
	ctx.clearRect(0, 0, 1920, 1080);
	
	// print layers recursively
	printLayers(ctx, overlay.layers);
	
}

function toggleTrue(layer) {
	
	// if toggle undefined, toggle is true
	if (typeof layer.toggle === 'undefined') {
		return true;
	} else {
		
		// check for comparison toggle
		if (isComparator(layer.toggle)) {
			
			return toggleOnComparison(layer.toggle);
			
		} else {
			
			let value = getRealValue(layer.toggle);
			// check truthfulness of toggle value
			if (value || value === '0' || value === 0 || layer.toggle == '') {
				return true;
			}
			
		}
		
	}
	
	return false;
	
}

function printImage(ctx, layer) {

	// get real source
	let value = getRealValue(layer.value);
	
	// if layer toggle and value not falsey and is an actual image, draw image
	if (toggleTrue(layer) && value && value.source && (value.source instanceof ImageBitmap || value.source instanceof HTMLImageElement)) {
		
		let output_width = value.width;
		let output_height = value.height;
		
		// determine if scaling of original image based on layer is needed
		let width_scale = layer.dimensions.width != '' && layer.dimensions.width != null;
		let height_scale = layer.dimensions.height != '' && layer.dimensions.height != null;
		if (width_scale || height_scale) {
			if (width_scale && height_scale) {
				// if both scaling
				output_width = layer.dimensions.width;
				output_height = layer.dimensions.height;
			} else if (width_scale) {
				// if only scaling width
				output_width = layer.dimensions.width;
				output_height = (layer.dimensions.width / value.width) * output_height;
			} else if (height_scale) {
				// if only scaling height
				output_height = layer.dimensions.height;
				output_width = (layer.dimensions.height / value.height) * output_width;
			}
		}
		
		// origins position offset
		let origins_offset_x = 0;
		let origins_offset_y = 0;
		if (layer.origins.vertical == 'center') {
			origins_offset_y -= output_height/2;
		} else if (layer.origins.vertical == 'bottom') {
			origins_offset_y -= output_height;
		}
		if (layer.origins.horizontal == 'center') {
			origins_offset_x -= output_width/2;
		} else if (layer.origins.horizontal == 'right') {
			origins_offset_x -= output_width;
		}
		
		// image effects
		if (layer.effects.grayscale) {
			ctx.filter = 'grayscale(100%)';
		}
		
		ctx.drawImage(
			value.source,
			layer.offset.x + parseInt(value.offset_x) + origins_offset_x,
			layer.offset.y + parseInt(value.offset_y) + origins_offset_y,
			output_width,
			output_height
		);
		
		ctx.filter = 'none';
		
	}
}

function printText(ctx, layer) {
	ctx.font = layer.style.fontStyle+' '+layer.style.fontWeight+' '+layer.style.fontSize+layer.style.fontMeasure+' '+layer.style.font;
	ctx.fillStyle = getRealValue(layer.style.color);
	
	// default align left
	let align_type = layer.style.align ?? 'left';
	ctx.textAlign = align_type;
	
	// get real value
	let value = getRealValue(layer.value);
	
	// if not a string, exit
	if (typeof value !== 'string') {
		return;
	}
	
	// caps
	if (layer.style.caps) {
		value = value.toUpperCase();
	}

	// if value not falsey (exluding 0), draw text
	if (toggleTrue(layer) && (value || value === 0 || value === '0')) {
		
		// text rotation
		if (layer.style.rotation && layer.style.rotation != 0) {
			ctx.save();
			
			// translate to text position origin
			ctx.translate(layer.offset.x, layer.offset.y);
			
			// rotate canvas
			ctx.rotate(degToRad(layer.style.rotation));
			
			// print text at translated location
			ctx.fillText(value, 0, 0, layer.dimensions.width);
			
			// restore pre rotation
			ctx.restore();
		
		} else {
			ctx.fillText(
				value,
				layer.offset.x,
				layer.offset.y,
				layer.dimensions.width
			);
		}

	}
	
}