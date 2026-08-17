<?php

error_reporting(E_ALL);

$apiDir = str_replace('\\', '/', __DIR__);
$root = dirname($apiDir);

if (basename($apiDir) === 'php') {
    define('BUYTECH_ROOT', $root);
    define('BUYTECH_UPLOADS', BUYTECH_ROOT . '/public/uploads');
    define('BUYTECH_DATA', BUYTECH_ROOT . '/data');
    define('BUYTECH_SEED', $apiDir . '/seed.json');
} else {
    define('BUYTECH_ROOT', $root);
    define('BUYTECH_UPLOADS', BUYTECH_ROOT . '/uploads');
    define('BUYTECH_DATA', BUYTECH_ROOT . '/data');
    define('BUYTECH_SEED', $apiDir . '/seed.json');
}

define('BUYTECH_DB', BUYTECH_DATA . '/db.json');
define('BUYTECH_TOKENS', BUYTECH_DATA . '/tokens.json');

if (!is_dir(BUYTECH_DATA)) {
    mkdir(BUYTECH_DATA, 0775, true);
}
if (!is_dir(BUYTECH_UPLOADS)) {
    mkdir(BUYTECH_UPLOADS, 0775, true);
}

loadConfigFile($apiDir . '/config.php');
loadEnvFile(BUYTECH_ROOT . '/.env');
loadEnvFile($apiDir . '/.env');

if (empty($_SERVER['HTTP_AUTHORIZATION']) && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

function loadConfigFile($path)
{
    if (!is_file($path)) {
        return;
    }
    $config = include $path;
    if (!is_array($config)) {
        return;
    }
    foreach ($config as $key => $value) {
        if ($value === null || $value === '') {
            continue;
        }
        if (getenv($key) === false || getenv($key) === '') {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

function loadEnvFile($path)
{
    if (!is_file($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        if (strpos($line, '=') === false) {
            continue;
        }
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
            $value = trim($value, $value[0]);
        }
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }
}

function env($key, $default = '')
{
    if (array_key_exists($key, $_ENV) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

function secrets_match($expected, $given)
{
    $expected = (string) $expected;
    $given = (string) $given;
    if (strlen($expected) !== strlen($given)) {
        return false;
    }
    return hash_equals($expected, $given);
}

function uuid()
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20, 12);
}

function json_body()
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return array();
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : array();
}

function json_response($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    throw new JsonResponseSent();
}

class JsonResponseSent extends Exception
{
}

function send_cors()
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-HTTP-Method-Override');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

function request_method()
{
    $method = strtoupper(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET');
    $override = '';
    if (!empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $override = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'];
    }
    if ($method === 'POST' && $override !== '') {
        return strtoupper($override);
    }
    return $method;
}

function request_path()
{
    if (!empty($_SERVER['PATH_INFO'])) {
        $path = $_SERVER['PATH_INFO'];
    } else {
        $uri = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
        $path = $uri ? $uri : '/';
        if (preg_match('#/api(?:/index\\.php)?(/.*)?$#', $path, $match)) {
            $path = isset($match[1]) && $match[1] !== '' ? $match[1] : '/';
        }
    }
    if ($path === '') {
        $path = '/';
    }
    if ($path[0] !== '/') {
        $path = '/' . $path;
    }
    return rtrim($path, '/') === '' ? '/' : rtrim($path, '/');
}

function bearer_token()
{
    $header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $header = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $header = $headers['authorization'];
        }
    }
    if (stripos($header, 'Bearer ') === 0) {
        return substr($header, 7);
    }
    return '';
}

require_once __DIR__ . '/store.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/mail.php';
