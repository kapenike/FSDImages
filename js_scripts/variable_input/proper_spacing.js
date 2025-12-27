// ensure proper spacing around variable value HTML elements
function variableFieldProperSpacing(elem) {
	let nodes = Array.from(elem.childNodes);
	for (let i=0; i<nodes.length; i++) {
		if (nodes[i].nodeName === '#text') {
			nodes.splice(i, 1, Create('span', { className: 'path_real_entry', innerHTML: nodes[i].nodeValue }));
			continue;
		}
		if (i == 0 && nodes[0].className != 'path_real_entry') {
			nodes.unshift(Create('span', { className: 'path_real_entry', innerHTML: '&nbsp;' }));
			continue;
		}
		if (nodes[i].className != 'path_real_entry') {
			if (nodes[i-1].className != 'path_real_entry') {
				nodes.splice(i-1, 0, Create('span', { className: 'path_real_entry', innerHTML: '&nbsp;' }));
				continue;
			}
			if ((i+1) >= nodes.length || nodes[i+1].className != 'path_real_entry') {
				nodes.splice(i+1, 0, Create('span', { className: 'path_real_entry', innerHTML: '&nbsp;' }));
				if ((i+1) >= nodes.length) {
					i++;
				}
				continue;
			}
		}
	}
	Create(elem, { innerHTML: '', children: nodes }, true);
	return nodes;
}