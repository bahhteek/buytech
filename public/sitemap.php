<?php

header('Content-Type: application/xml; charset=utf-8');
header('X-Robots-Tag: index, follow');

$static = __DIR__ . DIRECTORY_SEPARATOR . 'sitemap.xml';
$apiBootstrap = __DIR__ . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'bootstrap.php';
$repoBootstrap = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'php' . DIRECTORY_SEPARATOR . 'bootstrap.php';

if (is_file($apiBootstrap)) {
    require $apiBootstrap;
} elseif (is_file($repoBootstrap)) {
    require $repoBootstrap;
} elseif (is_file($static)) {
    readfile($static);
    return;
} else {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'BuyTech sitemap not found';
    return;
}

try {
    output_sitemap();
} catch (JsonResponseSent $sent) {
} catch (Throwable $error) {
    if (is_file($static)) {
        readfile($static);
    }
}
