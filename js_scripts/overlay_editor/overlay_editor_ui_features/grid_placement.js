function featureCreateGridPlacement() {
	
	return Create('div', {
		className: 'editor_tab',
		innerHTML: 'Grid',
		onclick: function () {
			
			// open overlay editor dialog with options for moving active layer on grid
			setImageEditorDialog(event, {
				title: 'Move Layer on Grid',
				items: [
					{
						title: Create('div', {
							className: 'row',
							children: [
								Create('div', {
									className: 'col',
									style: {
										width: '50%'
									},
									children: [
										Create('label', {
											innerHTML: 'Columns',
											children: [
												Create('input', {
													type: 'number',
													min: 3,
													value: GLOBAL.overlay_editor.grid_settings.columns,
													onchange: function () {
														GLOBAL.overlay_editor.grid_settings.columns = parseInt(this.value);
														setupMoveOnGridContainer();
													},
													onkeyup: function () {
														GLOBAL.overlay_editor.grid_settings.columns = parseInt(this.value);
														setupMoveOnGridContainer();
													}
												})
											]
										})
									]
								}),
								Create('div', {
									className: 'col',
									style: {
										width: '50%'
									},
									children: [
										Create('label', {
											innerHTML: 'Rows',
											children: [
												Create('input', {
													type: 'number',
													min: 3,
													value: GLOBAL.overlay_editor.grid_settings.rows,
													onchange: function () {
														GLOBAL.overlay_editor.grid_settings.rows = parseInt(this.value);
														setupMoveOnGridContainer();
													},
													onkeyup: function () {
														GLOBAL.overlay_editor.grid_settings.rows = parseInt(this.value);
														setupMoveOnGridContainer();
													}
												})
											]
										})
									]
								})
							]
						}),
						click: () => {}
					},
					{
						title: Create('div', {
							className: 'row',
							children: [
								Create('div', {
									className: 'col',
									style: {
										width: '50%'
									},
									children: [
										Create('label', {
											innerHTML: 'Horizontal Origin',
											children: [
												Create('select', {
													onchange: function () {
														GLOBAL.overlay_editor.grid_settings.origin.x = this.value
													},
													children: ['left', 'center', 'right'].map(origin => {
														return Create('option', {
															innerHTML: origin,
															value: origin,
															selected: GLOBAL.overlay_editor.grid_settings.origin.x == origin
														})
													})
												})
											]
										})
									]
								}),
								Create('div', {
									className: 'col',
									style: {
										width: '50%'
									},
									children: [
										Create('label', {
											innerHTML: 'Vertical Origin',
											children: [
												Create('select', {
													onchange: function () {
														GLOBAL.overlay_editor.grid_settings.origin.y = this.value
													},
													children: ['top', 'center', 'bottom'].map(origin => {
														return Create('option', {
															innerHTML: origin,
															value: origin,
															selected: GLOBAL.overlay_editor.grid_settings.origin.y == origin
														})
													})
												})
											]
										})
									]
								})
							]
						}),
						click: () => {}
					},
					{
						title: Create('div', {
							id: 'move_on_grid_container',
						}),
						click: () => {}
					}
				]
			}, 400);
			
			setupMoveOnGridContainer();

		}
	});
	
}

function setupMoveOnGridContainer() {
	
	// create matrix of grid placement options based on col/row settings in the options created above
	Select('#move_on_grid_container', {
		innerHTML: '',
		children: new Array(GLOBAL.overlay_editor.grid_settings.rows).fill(null).map((x, row) => {
			return Create('div', {
				className: 'row',
				children: new Array(GLOBAL.overlay_editor.grid_settings.columns).fill(null).map((y, col) => {
					return Create('div', {
						className: 'col',
						style: {
							width: (Math.trunc((100/GLOBAL.overlay_editor.grid_settings.columns) * 100) / 100)+'%'
						},
						innerHTML: (col+1)+'|'+(row+1),
						onclick: () => {
							let layer = getLayerById(GLOBAL.overlay_editor.active_layer);
							let new_x = (GLOBAL.overlay_editor.current.dimensions.width/(GLOBAL.overlay_editor.grid_settings.columns-1))*col;
							let new_y = (GLOBAL.overlay_editor.current.dimensions.height/(GLOBAL.overlay_editor.grid_settings.rows-1))*row;
							
							let layer_dim = getLayerOutputDimensions(layer);
							
							// layer origins of left and top do not change
							
							if (GLOBAL.overlay_editor.grid_settings.origin.x == 'center') {
								new_x -= layer_dim.width/2;
							} else if (GLOBAL.overlay_editor.grid_settings.origin.x == 'right') {
								new_x -= layer_dim.width;
							}
						
							if (GLOBAL.overlay_editor.grid_settings.origin.y == 'center') {
								new_y -= layer_dim.height/2;
							} else if (GLOBAL.overlay_editor.grid_settings.origin.y == 'bottom') {
								new_y -= layer_dim.height;
							}
							
							// if was text layer, re-orient around left origin based on alignment
							if (layer.type == 'text') {
								if (layer.style.align == 'center') {
									new_x += layer_dim.width/2;
								} else if (layer.style.align == 'right') {
									new_x += layer_dim.width;
								}
							}
							
							if (layer.type == 'image') {
								if (layer.origins.horizontal == 'center') {
									new_x += layer_dim.width/2;
								} else if (layer.origins.horizontal == 'right') {
									new_x += layer_dim.width;
								}
								if (layer.origins.vertical == 'center') {
									new_y += layer_dim.height/2;
								} else if (layer.origins.vertical == 'bottom') {
									new_y += layer_dim.height;
								}
							}
							
							if (layer.type == 'clip_path') {
								moveGroupLayer(layer, {
									x: new_x,
									y: new_y
								});
							} else {
								layer.offset.x = new_x;
								layer.offset.y = new_y;
							}
							
							printCurrentCanvas();
						}
					})
				})
			});
		})
	});
}