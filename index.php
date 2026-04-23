<?php
require 'app.php';
?>

<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php
// import all scripts from "ui_scripts"
forEach(app('directoryFileList')->get([], './js_scripts') as $file) {
	echo '<script src="'.$file.'" type="text/javascript"></script>'."\r\n";
}
?>

<?php app('fonts')->generateFontCSS(); ?>

<script>
// global font object
var FONTS = null;

document.addEventListener('DOMContentLoaded', function() {
	// on document ready, import custom fonts into document.fonts, then run initStreamOverlay()
	FONTS = JSON.parse('<?php echo app('fonts')->getFontList(); ?>');
	let loaded_fonts = 0;
	let to_load_fonts = 0;
	Object.keys(FONTS).forEach(fontfacekey => {
		let fontface = FONTS[fontfacekey];
		if (typeof fontface.is_default === 'undefined') {
			fontface.fonts.forEach(font => {
				to_load_fonts++;
				new FontFace(fontfacekey, 'url("/fonts/'+font.filename+'")', {
					style: font.style,
					weight: font.weight
				}).load().then(loaded_font => {
					document.fonts.add(loaded_font);
					loaded_fonts++;
					if (loaded_fonts == to_load_fonts) {
						// (./js_scripts/main.js)
						initStreamOverlay();
					}
				});
			});
		}
	});
	if (to_load_fonts == 0) {
		// (./js_scripts/main.js)
		initStreamOverlay();
	}
});
</script>

<!-- main css -->
<link rel="stylesheet" href="main.css">

</head>
<body id="body">
<div class="navigation" style="display: none;"></div>
<div id="main"></div>
</body>
</html>