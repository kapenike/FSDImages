/*
*!#NOTE: values are loosely typed, it defaults to a string but will convert to a boolean if verbatim "true" or "false". Valid integers and floats will be correctly typed as well

- HTTP: http::ACTION(url, values) 
	get - http::get(www.example.com, key=value, callBackFunctionName)
	post - http::post(www.example.com, key=value&second_key=second_value&int=30&float=30.9&boolean=true)
*/

class http extends integration {
	
	// (REQUIRED) inform execute script that this integration is active
	active = true;
	
	// (REQUIRED) inform execute script of this class unique action identifier
	identifier = 'http';
	
	// values structure (excluding delay and priority)
	structure = ['url', 'values', 'callback'];
	
	// enables priority check
	priority_check_enabled = false;
	
	// priority likeness comparison (&&) automatically includes "action" and "delay"
	priority_comparison = [];
	
	// priority likeness action equality (action ||), handles what actions are conflicting even if they are labelled separately
	priority_action_equality = [];
	
	constructor() {
		
		// lowkeylame
		super();
		
	}
	
	// (REQUIRED) integration parsing
	parse(parsed_command) {
		
		// create object from structure that include action, delay and priority
		let data = this.initStructure(parsed_command);
		
		// convert parsed command to structure command
		
		// url
		data.url = parsed_command.values[0].trim();
		
		// callback
		if (parsed_command.values[2]) {
			data.callback = parsed_command.values[2].trim();
		}
		
		// convert values
		data.values = Object.fromEntries(new URLSearchParams(parsed_command.values[1].trim()));
		
		// type cast values
		let keys = Object.keys(data.values);
		for (let i=0; i<keys.length; i++) {
			let v = data.values[keys[i]];
			if (v == 'true') {
				data.values[keys[i]] = true;
			} else if (v == 'false') {
				data.values[keys[i]] = false;
			} else {
				let num = Number(v);
				if (!Number.isFinite(num)) {
					data.values[keys[i]] = v;
				} else if (Number.isInteger(num)) {
					data.values[keys[i]] = parseInt(v);
				} else {
					data.values[keys[i]] = parseFloat(v);
				}
			}
		}

		// push to final command list
		this.command_list.push(data);
		
	}
	
	// (REQUIRED) run commands
	run() {
		
		// run immediate command batch
		let request_list = this.command_list.filter(x => x.delay == -1);
		if (request_list.length > 0) {
			// send immediate http requests
			request_list.forEach(data => {
				ajax(
					(data.action == 'post' ? 'POST' : 'GET'),
					data.url,
					data.values,
					(data.callback ? data.callback : ()=>{})
				);
			});
		}

		// created delayed container
		request_list = {};
		
		// group by delay to send as batch
		this.command_list.filter(x => x.delay != -1).forEach(v => {
			if (request_list[v.delay]) {
				request_list[v.delay].push(v);
			} else {
				request_list[v.delay] = [v];
			}
		});
		
		// delayed batches within their own closures
		Object.keys(request_list).forEach(delay => {
			(function () {
				let requests = request_list[delay];
				setTimeout(function () {
					requests.forEach(data => {
						ajax(
							(data.action == 'post' ? 'POST' : 'GET'),
							data.url,
							data.values,
							(data.callback ? data.callback : ()=>{})
						);
					});
				}, delay);
			})();
		});
	
	}
	
	
	
}