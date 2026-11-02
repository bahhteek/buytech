<?php

function slug_is_uuid($value)
{
    return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $value);
}

function slug_is_pretty($value)
{
    $value = (string) $value;
    return (bool) preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $value) && !slug_is_uuid($value);
}

function slugify_title($title)
{
    $map = array(
        'самосвал' => 'dump-truck',
        'самосвалы' => 'dump-truck',
        'грузовики' => 'truck',
        'экскаватор' => 'excavator',
        'экскаваторы' => 'excavator',
        'мини-экскаваторы' => 'mini-excavator',
        'мини экскаваторы' => 'mini-excavator',
        'бульдозер' => 'bulldozer',
        'бульдозеры' => 'bulldozer',
        'погрузчик' => 'loader',
        'погрузчики' => 'loader',
        'фронтальные погрузчики' => 'wheel-loader',
        'катки' => 'roller',
        'автокраны' => 'truck-crane',
    );
    $key = function_exists('mb_strtolower') ? mb_strtolower(trim((string) $title), 'UTF-8') : strtolower(trim((string) $title));
    if (isset($map[$key])) {
        return $map[$key];
    }

    $cyr = array(
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'e',
        'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'j', 'к' => 'k', 'л' => 'l', 'м' => 'm',
        'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u',
        'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sch',
        'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
    );
    $chars = preg_split('//u', $key, -1, PREG_SPLIT_NO_EMPTY);
    $out = '';
    foreach ($chars as $char) {
        $out .= isset($cyr[$char]) ? $cyr[$char] : $char;
    }
    $out = strtolower($out);
    $out = preg_replace('/[^a-z0-9]+/', '-', $out);
    $out = trim($out, '-');
    return $out !== '' ? $out : 'category';
}

function slugify_path($text)
{
    $key = function_exists('mb_strtolower') ? mb_strtolower(trim((string) $text), 'UTF-8') : strtolower(trim((string) $text));
    $cyr = array(
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'e',
        'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'j', 'к' => 'k', 'л' => 'l', 'м' => 'm',
        'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u',
        'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sch',
        'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya',
    );
    $chars = preg_split('//u', $key, -1, PREG_SPLIT_NO_EMPTY);
    $out = '';
    foreach ($chars as $char) {
        $out .= isset($cyr[$char]) ? $cyr[$char] : $char;
    }
    $out = strtolower($out);
    $out = preg_replace('/[^a-z0-9]+/', '-', $out);
    $out = trim($out, '-');
    return $out !== '' ? $out : 'item';
}

function category_preferred_slug($category)
{
    $explicit = isset($category['slug']) ? strtolower(trim((string) $category['slug'])) : '';
    if ($explicit !== '' && slug_is_pretty($explicit)) {
        return $explicit;
    }
    $id = isset($category['id']) ? (string) $category['id'] : '';
    if (slug_is_pretty($id)) {
        return $id;
    }
    return slugify_title(isset($category['title']) ? $category['title'] : '');
}

function category_slug_map($categories)
{
    $used = array();
    $map = array();
    usort($categories, function ($a, $b) {
        $left = isset($a['id']) ? (string) $a['id'] : '';
        $right = isset($b['id']) ? (string) $b['id'] : '';
        return strcmp($left, $right);
    });
    foreach ($categories as $category) {
        if (empty($category['id'])) {
            continue;
        }
        $id = (string) $category['id'];
        $slug = category_preferred_slug($category);
        if ($slug === '' || isset($used[$slug])) {
            $slug = ($slug !== '' ? $slug : 'category') . '-' . strtolower(substr($id, 0, 8));
        }
        $used[$slug] = true;
        $map[$id] = $slug;
    }
    return $map;
}

function category_slug_aliases($slug)
{
    $aliases = array(
        'bulldozer' => array('bulldozers', 'buldozer'),
        'excavator' => array('excavators', 'ekskavatory', 'ekskavator'),
        'loader' => array('loaders', 'pogruzchiki', 'pogruzchik'),
        'dump-truck' => array('dump-trucks', 'samosvaly', 'samosval', 'trucks'),
    );
    return isset($aliases[$slug]) ? $aliases[$slug] : array();
}

function category_slug_keys($category, $map)
{
    $id = isset($category['id']) ? (string) $category['id'] : '';
    $primary = isset($map[$id]) ? $map[$id] : category_preferred_slug($category);
    $fromTitle = slugify_title(isset($category['title']) ? $category['title'] : '');
    $keys = array($primary => true, $fromTitle => true);
    foreach (array_merge(category_slug_aliases($primary), category_slug_aliases($fromTitle)) as $alias) {
        $keys[$alias] = true;
    }
    return $keys;
}

function find_category_by_slug_or_id($categories, $value)
{
    $value = rawurldecode((string) $value);
    if ($value === '') {
        return null;
    }
    foreach ($categories as $category) {
        if (isset($category['id']) && (string) $category['id'] === $value) {
            return $category;
        }
    }
    $map = category_slug_map($categories);
    foreach ($categories as $category) {
        if (empty($category['id'])) {
            continue;
        }
        $keys = category_slug_keys($category, $map);
        if (isset($keys[$value])) {
            return $category;
        }
    }
    return null;
}

function catalog_category_path($category, $categories)
{
    $map = category_slug_map($categories);
    $id = isset($category['id']) ? (string) $category['id'] : '';
    $slug = isset($map[$id]) ? $map[$id] : category_preferred_slug($category);
    return '/' . $slug;
}

function category_root($category, $categories)
{
    $map = array();
    foreach ($categories as $item) {
        if (!empty($item['id'])) {
            $map[(string) $item['id']] = $item;
        }
    }
    $current = $category;
    $seen = array();
    while ($current && !empty($current['parentId'])) {
        $id = isset($current['id']) ? (string) $current['id'] : '';
        $parentId = (string) $current['parentId'];
        if ($id === '' || isset($seen[$id]) || !isset($map[$parentId])) {
            break;
        }
        $seen[$id] = true;
        $current = $map[$parentId];
    }
    return $current;
}

function brand_slug_map($brands)
{
    $used = array();
    $map = array();
    usort($brands, function ($a, $b) {
        $left = isset($a['id']) ? (string) $a['id'] : '';
        $right = isset($b['id']) ? (string) $b['id'] : '';
        return strcmp($left, $right);
    });
    foreach ($brands as $brand) {
        if (empty($brand['id']) || empty($brand['name'])) {
            continue;
        }
        $id = (string) $brand['id'];
        $explicit = isset($brand['slug']) ? strtolower(trim((string) $brand['slug'])) : '';
        $slug = ($explicit !== '' && slug_is_pretty($explicit)) ? $explicit : slugify_path((string) $brand['name']);
        if ($slug === '' || isset($used[$slug])) {
            $slug = ($slug !== '' ? $slug : 'brand') . '-' . strtolower(substr($id, 0, 8));
        }
        $used[$slug] = true;
        $map[$id] = $slug;
    }
    return $map;
}

function find_brand_by_slug_or_id($brands, $value)
{
    $value = rawurldecode((string) $value);
    if ($value === '') {
        return null;
    }
    foreach ($brands as $brand) {
        if (isset($brand['id']) && (string) $brand['id'] === $value) {
            return $brand;
        }
    }
    $map = brand_slug_map($brands);
    foreach ($brands as $brand) {
        if (!empty($brand['id']) && isset($map[$brand['id']]) && $map[$brand['id']] === $value) {
            return $brand;
        }
    }
    return null;
}

function machine_preferred_slug($machine)
{
    $explicit = isset($machine['slug']) ? strtolower(trim((string) $machine['slug'])) : '';
    if ($explicit !== '' && slug_is_pretty($explicit)) {
        return $explicit;
    }
    $brand = isset($machine['brand']) ? (string) $machine['brand'] : '';
    $name = isset($machine['name']) ? (string) $machine['name'] : '';
    return slugify_path(trim($brand . ' ' . $name));
}

function machine_slug_map($machines)
{
    $used = array();
    $map = array();
    usort($machines, function ($a, $b) {
        $left = isset($a['id']) ? (string) $a['id'] : '';
        $right = isset($b['id']) ? (string) $b['id'] : '';
        return strcmp($left, $right);
    });
    foreach ($machines as $machine) {
        if (empty($machine['id'])) {
            continue;
        }
        $id = (string) $machine['id'];
        $slug = machine_preferred_slug($machine);
        if ($slug === '' || isset($used[$slug])) {
            $slug = ($slug !== '' ? $slug : 'machine') . '-' . strtolower(substr($id, 0, 8));
        }
        $used[$slug] = true;
        $map[$id] = $slug;
    }
    return $map;
}

function find_machine_by_slug_or_id($machines, $value)
{
    $value = rawurldecode((string) $value);
    if ($value === '') {
        return null;
    }
    foreach ($machines as $machine) {
        if (isset($machine['id']) && (string) $machine['id'] === $value) {
            return $machine;
        }
    }
    $map = machine_slug_map($machines);
    foreach ($machines as $machine) {
        if (empty($machine['id'])) {
            continue;
        }
        if (isset($map[$machine['id']]) && $map[$machine['id']] === $value) {
            return $machine;
        }
    }
    return null;
}

function catalog_machine_path($machine, $categories, $machines)
{
    $category = null;
    if (!empty($machine['categoryId'])) {
        $category = find_category_by_slug_or_id($categories, $machine['categoryId']);
    }
    if ($category) {
        $category = category_root($category, $categories);
        $prefix = catalog_category_path($category, $categories);
    } else {
        $prefix = '/catalog';
    }
    $map = machine_slug_map($machines);
    $id = isset($machine['id']) ? (string) $machine['id'] : '';
    $slug = isset($map[$id]) ? $map[$id] : machine_preferred_slug($machine);
    return $prefix . '/' . $slug;
}
