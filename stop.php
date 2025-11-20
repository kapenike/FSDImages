<?php

require('app.php');

// e.g. php stop.php all (stops application and stops websocket server if ('all') included)
app('FSDImages')->stop($argv);

?>