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

function write_json_file($path, $data, $forceObject = false)
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $fp = fopen($path, 'c+');
    if (!$fp) {
        throw new RuntimeException('Cannot write ' . $path);
    }
    $flags = JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT;
    if ($forceObject) {
        $flags |= JSON_FORCE_OBJECT;
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, $flags));
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
    write_sitemap_file();
    return $db;
}

/** Число из «105 000 000» / «от 24 700 000 ₸». «Цена по запросу» → 0. */
function parse_price_amount($price, $priceFrom = 0)
{
    $digits = preg_replace('/\D+/', '', (string) $price);
    if ($digits !== '' && $digits !== '0') {
        $value = (int) $digits;
        if ($value > 0) {
            return $value;
        }
    }
    $priceFrom = (int) $priceFrom;
    return $priceFrom > 0 ? $priceFrom : 0;
}

function machine_is_public($machine)
{
    return empty($machine['draft']);
}

function normalize_url_list($value)
{
    if (!is_array($value)) {
        return array();
    }
    $next = array();
    foreach ($value as $item) {
        $url = trim((string) $item);
        if ($url !== '') {
            $next[] = $url;
        }
    }
    return array_values($next);
}

function machine_videos_from($body, $current = null)
{
    if (isset($body['videos']) && is_array($body['videos'])) {
        return normalize_url_list($body['videos']);
    }
    if (isset($body['videoUrl']) && trim((string) $body['videoUrl']) !== '') {
        return array(trim((string) $body['videoUrl']));
    }
    if (is_array($current) && isset($current['videos']) && is_array($current['videos'])) {
        return normalize_url_list($current['videos']);
    }
    if (is_array($current) && !empty($current['videoUrl'])) {
        return array(trim((string) $current['videoUrl']));
    }
    return array();
}

function machines_with_parsed_price($machines)
{
    if (!is_array($machines)) {
        return array();
    }
    foreach ($machines as $index => $machine) {
        if (!is_array($machine)) {
            continue;
        }
        $price = isset($machine['price']) ? $machine['price'] : '';
        $from = isset($machine['priceFrom']) ? $machine['priceFrom'] : 0;
        $machines[$index]['priceFrom'] = parse_price_amount($price, $from);
    }
    return $machines;
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

function category_parent_id($category)
{
    return isset($category['parentId']) ? trim((string) $category['parentId']) : '';
}

function category_descendant_ids($categories, $id)
{
    $ids = array((string) $id);
    $added = true;
    while ($added) {
        $added = false;
        foreach ($categories as $category) {
            $parent = category_parent_id($category);
            $cid = (string) $category['id'];
            if ($parent !== '' && in_array($parent, $ids, true) && !in_array($cid, $ids, true)) {
                $ids[] = $cid;
                $added = true;
            }
        }
    }
    return $ids;
}

function sanitize_parent_id($parentId, $categories, $selfId = '')
{
    $parentId = trim((string) $parentId);
    if ($parentId === '') {
        return '';
    }
    if ($selfId !== '' && $parentId === (string) $selfId) {
        return '';
    }
    if (!find_by_id($categories, $parentId)) {
        return '';
    }
    if ($selfId !== '' && in_array($parentId, category_descendant_ids($categories, $selfId), true)) {
        return '';
    }
    return $parentId;
}
