<?php

require('app.php');

// e.g. php start.php external all (launches on external ipv4 ('external') and launches websocket server ('all'))
app('FSDImages')->start($argv);

?>