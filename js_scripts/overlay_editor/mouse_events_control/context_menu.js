function imageEditorMouseCTX(event) {
	
	let output_menu = {
		position: {
			x: event.clientX,
			y: event.clientY
		},
		items: {
			create: true,
			select: true,
			select_parent: false,
			remove: false,
			deselect: false
		},
		append_items: null
	};
	
	// if within workspace
	if (event.target.id == 'workspace') {
	
	// translate window cursor position to canvas position
		let translate_cursor = translateWindowToCanvas(event.clientX, event.clientY);
		
		// precise
		translate_cursor = {
			x: preciseAndTrim(translate_cursor.x),
			y: preciseAndTrim(translate_cursor.y)
		}
		
		GLOBAL.overlay_editor.context_menu_location = translate_cursor;
	
		// context menu output changes if within an active selection
		if (GLOBAL.overlay_editor.active_layer && eventWithinActiveSelection(translate_cursor)) {
			output_menu.items.select = false;
			// if sub layer, it has a parent
			if (GLOBAL.overlay_editor.active_layer.toString().indexOf('_') > -1) {
				output_menu.items.select_parent = true;
			}
			output_menu.items.remove = true;
			output_menu.items.deselect = true;
		}
		
		output_menu.append_items = [
			{
				title: '+ New Layer',
				click: function () {
					addNewLayer(event, GLOBAL.overlay_editor.active_layer, GLOBAL.overlay_editor.context_menu_location);
				}
			},
			(output_menu.items.select
				? {
						title: 'Select Layer',
						click: function () {
							clickWithinAnyLayer(GLOBAL.overlay_editor.context_menu_location);
							removeUIEditMenu();
						}
					}
				: undefined
			),
			(output_menu.items.select_parent
				? {
						title: 'Select Parent',
						click: function () {
							setActiveLayer(GLOBAL.overlay_editor.active_layer.split('_').slice(0,-1).join('_'));
							removeUIEditMenu();
						}
					}
				: undefined
			),
			(output_menu.items.deselect
				? {
						title: 'Deselect',
						click: function () {
							setActiveLayer(null);
							removeUIEditMenu();
						}
					}
				: undefined
			),
			(output_menu.items.remove
				? {
						title: 'Remove',
						remove: 'true',
						click: function () {
							removeLayer(GLOBAL.overlay_editor.active_layer);
						}
					}
				: undefined
			)
		]
	
		
		
		
		if (GLOBAL.overlay_editor.active_layer != null) {
			
			// active layer
			let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
			
			// if active layer is a custom clip path and target is the editor window
			if (layer.type == 'clip_path' && layer.clip_path.type == 'custom') {

				// stash canvas position of mouse event
				GLOBAL.overlay_editor.custom_clip_path.event_position = translate_cursor;
				
				// nullify open between points first
				GLOBAL.overlay_editor.custom_clip_path.insert_point = null;
				
				// detect if open between points
				for (let i=0; i<layer.clip_path.clip_points.length; i++) {
					let next = (i == layer.clip_path.clip_points.length-1 ? 0 : i+1);
					if (lineSegmentIntersectsCircleOptimized(
						layer.clip_path.clip_points[i].x, layer.clip_path.clip_points[i].y,
						layer.clip_path.clip_points[next].x, layer.clip_path.clip_points[next].y,
						translate_cursor.x, translate_cursor.y,
						10
					)) {
						GLOBAL.overlay_editor.custom_clip_path.insert_point = i;
						break;
					}
				}
				
				// nullify open point
				GLOBAL.overlay_editor.custom_clip_path.active_point = null;
				
				// detect if open on point
				for (let i=0; i<layer.clip_path.clip_points.length; i++) {
					if (distance(translate_cursor.x, translate_cursor.y, layer.clip_path.clip_points[i].x, layer.clip_path.clip_points[i].y) <= 10) {
						GLOBAL.overlay_editor.custom_clip_path.active_point = i;
						break;
					}
				}
				
				// open default custom clip path editor tool
				setImageEditorDialog(event, {
					title: 'Custom Clip Path',
					items: [
						{
							title: '+ add point',
							click: function () {
								let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
								layer.clip_path.clip_points.push({
									x: GLOBAL.overlay_editor.custom_clip_path.event_position.x,
									y: GLOBAL.overlay_editor.custom_clip_path.event_position.y
								});
								removeUIEditMenu();
								printCurrentCanvas();
							}
						},
						(GLOBAL.overlay_editor.custom_clip_path.insert_point != null
							? {
									title: '+ add point on line',
									click: function () {
										let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
										layer.clip_path.clip_points.splice(GLOBAL.overlay_editor.custom_clip_path.insert_point+1, 0, {
											x: GLOBAL.overlay_editor.custom_clip_path.event_position.x,
											y: GLOBAL.overlay_editor.custom_clip_path.event_position.y
										});
										removeUIEditMenu();
										printCurrentCanvas();
									}
								}
							: undefined
						),
						(GLOBAL.overlay_editor.custom_clip_path.active_point != null
							? {
									title: 'modify point',
									click: function () {

										setImageEditorDialog(event, {
											title: 'Modify Point',
											items: [
												{
													title: Create('label', {
														innerHTML: 'x',
														children: [
															Create('input', {
																type: 'number',
																step: 0.5,
																value: getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.clip_points[GLOBAL.overlay_editor.custom_clip_path.active_point].x,
																onchange: function () {
																	getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.clip_points[GLOBAL.overlay_editor.custom_clip_path.active_point].x = precise(this.value);
																	printCurrentCanvas();
																},
																onkeyup: function () {
																	getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.clip_points[GLOBAL.overlay_editor.custom_clip_path.active_point].x = precise(this.value);
																	printCurrentCanvas();
																}
															})
														]
													}),
													click: () => {}
												},
												{
													title: Create('label', {
														innerHTML: 'y',
														children: [
															Create('input', {
																type: 'number',
																step: 0.5,
																value: getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.clip_points[GLOBAL.overlay_editor.custom_clip_path.active_point].y,
																onchange: function () {
																	getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.clip_points[GLOBAL.overlay_editor.custom_clip_path.active_point].y = precise(this.value);
																	printCurrentCanvas();
																},
																onkeyup: function () {
																	getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.clip_points[GLOBAL.overlay_editor.custom_clip_path.active_point].y = precise(this.value);
																	printCurrentCanvas();
																}
															})
														]
													}),
													click: () => {}
												},
												{
													title: 'Remove',
													remove: true,
													click: function () {
														getLayerById(GLOBAL.overlay_editor.active_layer).clip_path.clip_points.splice(GLOBAL.overlay_editor.custom_clip_path.active_point, 1);
														removeUIEditMenu();
														printCurrentCanvas();
													}
												}
											]
										});

									}
								}
							: undefined
						),
						{
							title: Create('label', {
								children: [
									Create('input', {
										type: 'checkbox',
										style: {
											width: '12px',
											height: '12px',
											display: 'inline-block',
											margin: '0'
										},
										checked: GLOBAL.overlay_editor.custom_clip_path.allow_drag_move,
										onchange: function () {
											GLOBAL.overlay_editor.custom_clip_path.allow_drag_move = !GLOBAL.overlay_editor.custom_clip_path.allow_drag_move;
											printCurrentCanvas();
										}
									}),
									Create('span', {
										innerHTML: '&nbsp; enable drag move',
										style: {
											display: 'inline-block'
										}
									})
								]
							}),
							click: () => {}
						},
						{
							title: Create('div', {
								className: 'ui_edit_menu_title',
								style: {
									margin: '-8px -12px'
								},
								innerHTML: 'Layer Manager'
							}),
							click: () => {}
						},
						...output_menu.append_items
					]
				});
				
				event.preventDefault();
				return;
			}
		}
		
		// if not appended to clip path dialog, create standalone layer manager
		setImageEditorDialog(event, {
			title: 'Layer Manager',
			items: output_menu.append_items
		});
		
	}
	
	// if not a layer element, prevent context menu click
	if (!targetIsLayerElem(event.target)) {
		event.preventDefault();
	}
	
}