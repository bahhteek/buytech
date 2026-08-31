<?php

$repoApi = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'php' . DIRECTORY_SEPARATOR . 'index.php';
if (is_file($repoApi)) {
    require $repoApi;
    return;
}

header('Content-Type: application/json; charset=utf-8');
http_response_code(500);
echo json_encode(array('error' => 'PHP API not found'), JSON_UNESCAPED_UNICODE);
