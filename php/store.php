<?php

function read_json_file($path, $default = array())
{
    if (!is_file($path)) {
        return $default;
    }
    $fp = fopen($path, 'c+');
    if (!$fp) {
        return $default;
    }
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    if ($raw === false || trim($raw) === '') {
        return $default;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function write_json_file($path, $data)
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $fp = fopen($path, 'c+');
    if (!$fp) {
        throw new RuntimeException('Cannot write ' . $path);
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function create_seed()
{
    if (is_file(BUYTECH_SEED)) {
        $seed = json_decode(file_get_contents(BUYTECH_SEED), true);
        if (is_array($seed)) {
            if (!isset($seed['leads'])) {
                $seed['leads'] = array();
            }
            return $seed;
        }
    }
    return array(
        'content' => array(),
        'brands' => array(),
        'categories' => array(),
        'machines' => array(),
        'leads' => array(),
    );
}

function ensure_db()
{
    if (is_file(BUYTECH_DB)) {
        return;
    }
    $legacy = BUYTECH_ROOT . '/server/data/db.json';
    if (is_file($legacy)) {
        copy($legacy, BUYTECH_DB);
        return;
    }
    write_json_file(BUYTECH_DB, create_seed());
}

function read_db()
{
    ensure_db();
    $db = read_json_file(BUYTECH_DB, array());
    if (!isset($db['content'])) $db['content'] = array();
    if (!isset($db['brands'])) $db['brands'] = array();
    if (!isset($db['categories'])) $db['categories'] = array();
    if (!isset($db['machines'])) $db['machines'] = array();
    if (!isset($db['leads'])) $db['leads'] = array();
    return $db;
}

function write_db($db)
{
    write_json_file(BUYTECH_DB, $db);
}

function update_db($mutator)
{
    ensure_db();
    $fp = fopen(BUYTECH_DB, 'c+');
    if (!$fp) {
        throw new RuntimeException('Cannot open database');
    }
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $db = json_decode($raw, true);
    if (!is_array($db)) {
        $db = create_seed();
    }
    if (!isset($db['leads'])) $db['leads'] = array();
    $db = call_user_func($mutator, $db);
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return $db;
}

function find_by_id($list, $id)
{
    foreach ($list as $item) {
        if (isset($item['id']) && (string) $item['id'] === (string) $id) {
            return $item;
        }
    }
    return null;
}

function normalize_specs($specs)
{
    $out = array();
    if (!is_array($specs)) {
        return $out;
    }
    foreach ($specs as $spec) {
        if (!is_array($spec)) {
            continue;
        }
        $out[] = array(
            'id' => !empty($spec['id']) ? (string) $spec['id'] : uuid(),
            'label' => isset($spec['label']) ? (string) $spec['label'] : '',
            'value' => isset($spec['value']) ? (string) $spec['value'] : '',
        );
    }
    return $out;
}

function normalize_related_ids($ids, $exclude = '')
{
    $out = array();
    if (!is_array($ids)) {
        return $out;
    }
    foreach ($ids as $id) {
        $id = (string) $id;
        if ($id === '' || $id === (string) $exclude) {
            continue;
        }
        if (!in_array($id, $out, true)) {
            $out[] = $id;
        }
    }
    return $out;
}
