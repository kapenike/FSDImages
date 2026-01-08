function precise(v) {
	return parseFloat(Math.trunc(v * 100) / 100);
}

function preciseAndTrim(v) {
	return parseFloat(String(Math.trunc(v * 100) / 100).trim('0'));
}

function degToRad(v) {
	return (Math.PI/180)*v;
}

function rotate(x, y, cx, cy, angle) {
	let rad = degToRad(angle);
	let cos = Math.cos(rad);
	let sin = Math.sin(rad);
	let nx = (cos * (x - cx)) + (sin * (y-cy)) + cx;
	let ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
	return { x: precise(nx), y: precise(ny) };
}

function spaceTrim(v) {
	return v.toString().trim().replaceAll('&nbsp;', '');
}

function searchPageItemList(value) {
	value = value.toLowerCase();
	Array.from(MSelect('.selection_list_block')).forEach(elem => {
		elem.style.display = ((value == '' || elem.innerHTML.toLowerCase().indexOf(value) > -1) ? 'block' : 'none');
	});
}

function distance(x1, y1, x2, y2) {
	return Math.hypot(x2 - x1, y2 - y1);
}

// i got this method from stackoverflow probably 5 years ago, so... gets interception point of two lines
function intercepts(x1,y1,x2,y2,x3,y3,x4,y4) {
	let s1_x = x2 - x1;
	let s1_y = y2 - y1;
	let s2_x = x4 - x3;
	let s2_y = y4 - y3;
	let s = (-s1_y * (x1 - x3) + s1_x * (y1 - y3)) / (-s2_x * s1_y + s1_x * s2_y);
	let t = ( s2_x * (y1 - y3) - s2_y * (x1 - x3)) / (-s2_x * s1_y + s1_x * s2_y);
	if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
		return {
			x: precise(x1 + (t * s1_x)),
			y: precise(y1 + (t * s1_y))
		};
	}
	return false;
}

function eventWithinPolygon(event, points) {
	
	// loop through all points and determine max distance possible from one point to any other, or use big a$$ number
	let ray_length = 9999;
	
	// loop to ray cast in 4 directions of the point
	for (let i=0; i<4; i++) {
		
		let ray = {
			x: event.x + (i == 0 ? ray_length : (i == 2 ? 0-ray_length : 0)),
			y: event.y + (i == 1 ? 0-ray_length : (i == 3 ? ray_length : 0))
		};
		
		// count number of intercepts, even is false, odd is true
		let ray_count = 0;
		
		for (let i2=0; i2<points.length; i2++) {
			
			let next = i2+1;
			
			if (next == points.length) {
				next = 0;
			}
			
			if (intercepts(
					event.x, event.y,
					ray.x, ray.y,
					points[i2].x, points[i2].y,
					points[next].x, points[next].y
				)) {
				ray_count++;
			}
			
		}
		
		// if ray count is even, false
		if (ray_count%2 == 0) {
			return false;
		}
		
	}
	
	return true;
}

/*
https://stackoverflow.com/questions/67116296/is-this-code-for-determining-if-a-circle-and-line-segment-intersects-correct
solution by: David Eisenstat
https://stackoverflow.com/users/2144669/david-eisenstat
*/
function lineSegmentIntersectsCircleOptimized(x1, y1, x2, y2, cx, cy, r) {
  let x_linear = x2 - x1;
  let x_constant = x1 - cx;
  let y_linear = y2 - y1;
  let y_constant = y1 - cy;
  let a = x_linear * x_linear + y_linear * y_linear;
  let half_b = x_linear * x_constant + y_linear * y_constant;
  let c = x_constant * x_constant + y_constant * y_constant - r * r;
  return (
    half_b * half_b >= a * c &&
    (-half_b <= a || c + half_b + half_b + a <= 0) &&
    (half_b <= 0 || c <= 0)
  );
}