<?php

$apiDir = __DIR__ . DIRECTORY_SEPARATOR . 'api';
$bootstrap = $apiDir . DIRECTORY_SEPARATOR . 'bootstrap.php';
$spa = $apiDir . DIRECTORY_SEPARATOR . 'spa.php';

if (!is_file($bootstrap) || !is_file($spa)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'BuyTech frontend not found';
    return;
}

require $bootstrap;
require $spa;
output_spa();
