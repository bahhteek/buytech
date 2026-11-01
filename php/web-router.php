<?php

$uri = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$path = $uri ? $uri : '/';
$file = __DIR__ . str_replace('/', DIRECTORY_SEPARATOR, $path);

if ($path === '/spa-template.html') {
    http_response_code(404);
    return true;
}

if ($path !== '/' && is_file($file)) {
    return false;
}

if ($path === '/sitemap.xml' && !is_file($file)) {
    require __DIR__ . '/sitemap.php';
    return true;
}

if (preg_match('/\.(ico|png|jpe?g|gif|svg|webp|css|js|map|txt|xml|woff2?|ttf)$/i', $path)) {
    return false;
}

require __DIR__ . '/index.php';
return true;
