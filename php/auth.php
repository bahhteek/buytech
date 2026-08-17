<?php

function read_tokens()
{
    $tokens = read_json_file(BUYTECH_TOKENS, array());
    $now = time();
    $fresh = array();
    foreach ($tokens as $token => $meta) {
        $exp = is_array($meta) && isset($meta['exp']) ? (int) $meta['exp'] : 0;
        if ($exp > $now) {
            $fresh[$token] = $meta;
        }
    }
    if (count($fresh) !== count($tokens)) {
        write_json_file(BUYTECH_TOKENS, $fresh);
    }
    return $fresh;
}

function save_token($token)
{
    $tokens = read_tokens();
    $tokens[$token] = array('exp' => time() + 60 * 60 * 24 * 7);
    write_json_file(BUYTECH_TOKENS, $tokens);
}

function delete_token($token)
{
    $tokens = read_tokens();
    unset($tokens[$token]);
    write_json_file(BUYTECH_TOKENS, $tokens);
}

function require_auth()
{
    $token = bearer_token();
    $tokens = read_tokens();
    if ($token === '' || !isset($tokens[$token])) {
        json_response(array('error' => 'Unauthorized'), 401);
    }
}
