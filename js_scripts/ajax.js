/*
	method: 'POST' / 'GET' / etc?2025
	url: 'url'
	obj: object data to send, likely formToObj('form id')
	callback: function to return data to
	loader_id: overlay a loader on this id, removed on response
	 ! - this should probably be removed after a settimeout to ensure logic completes first ... as well as allowing multiple loaders per page so actions can be done asyn ... as long as data changes to files are processed in a queue ... come back to this maybe
*/

AJAX_QUEUE = [];

function ajax(method, url, obj, callback, loader_id = null) {
	AJAX_QUEUE.push([method, url, obj, callback, loader_id]);
	if (AJAX_QUEUE.length == 1) {
		runAjaxQueue();
	}
}

function runAjaxQueue() {
	if (AJAX_QUEUE.length > 0) {
		runAjax(...AJAX_QUEUE.shift());
	}
}

function runAjax(method, url, obj, callback, loader_id) {
	
	// form object to send
	let form_data = new FormData();
	
	// loop form data and insert into form_data
	let obj_keys = Object.keys(obj);
	for (let i=0; i<obj_keys.length; i++) {
		// append file
		if (obj[obj_keys[i]].constructor === FileList) {
			for (let i2=0; i2<obj[obj_keys[i]].length; i2++) {
				form_data.append(obj_keys[i]+'_'+i2, obj[obj_keys[i]][i2]);
			}
		} else {
			// if array, append all values separately to the same "name[]"
			if (Array.isArray(obj[obj_keys[i]])) {
				obj[obj_keys[i]].forEach(v => {
					// ternary appends PHP expected [] to object name for arrays if not present
					form_data.append(obj_keys[i].slice(-2) == '[]' ? obj_keys[i] : obj_keys[i]+'[]', v);
				});
			} else {
				// simple append
				form_data.append(obj_keys[i], obj[obj_keys[i]]);
			}
		}
	}
	
	// old skool ajax
	let xhttp = new XMLHttpRequest();
	xhttp.open(method, url);
	
	// used too often in my life not to include, separates ajax request from normal post
	xhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	xhttp.onload = function() {
		
		// if contained a loader, remove loading state
		if (loader_id !== null) {
			ajaxRemoveLoader(loader_id);
		}

		// callback with: status(bool), response(object)
		callback((this.readyState == 4 && this.status == 200), (this.responseText != '' ? JSON.parse(this.responseText) : null));
		
		// run next ajax command in queue
		runAjaxQueue();
	}
	
	// if loader id identified, add class and insert loader
	if (loader_id !== null) {
		ajaxInitLoader(loader_id);
	}
	
	// ship
	xhttp.send(form_data);
}

// allow ajax loader to init before form post (incase of preprocessing)
function ajaxInitLoader(id) {

	// ensure id exists as an element, then append the required class name
	let to_elem = Select('#'+id);
	if (to_elem) {
		if (to_elem && to_elem.className.indexOf('contains_loader') === -1) {
			to_elem.className += ' contains_loader';
			
			// insert loader
			to_elem.appendChild(
				Create('div', {
					id: 'ajax_loader',
					children: [
						Create('img', {
							src: '/loader.php'
						})
					]
				})
			);
		}
	}

}

// remove loader from id
function ajaxRemoveLoader(id) {
	document.getElementById(id).className = document.getElementById(id).className.replace(' contains_loader', '');
	if (Select('#ajax_loader')) {
		Select('#ajax_loader').remove();
	}
}

// grab form input elements and convert their name->data pair to an object
function formToObj(id) {
	// prevent form submission through standard method
	event.preventDefault();
	
	let form = Select('#'+id);
	let form_obj = new FormData(form);
	let data = Object.fromEntries(form_obj.entries());
	
	Object.keys(data).forEach(x => {
		// edge cases:
		if ('File' in window && data[x] instanceof File) {
			// if file, it must be set directly from the element
			data[x] = form.elements[x].files;
		} else if (x.slice(-2) == '[]') {
			// if array name field, must getAll
			data[x] = form_obj.getAll(x);
		}
	});
	
	return data;
}