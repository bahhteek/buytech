<?php

function analytics_file()
{
    return BUYTECH_DATA . '/analytics.json';
}

function analytics_geo_file()
{
    return BUYTECH_DATA . '/geo-cache.json';
}

function analytics_read()
{
    $data = read_json_file(analytics_file(), array('events' => array()));
    if (!isset($data['events']) || !is_array($data['events'])) {
        $data['events'] = array();
    }
    return $data;
}

function analytics_write($data)
{
    write_json_file(analytics_file(), $data);
}

function analytics_clean_id($value)
{
    $value = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $value);
    if (!is_string($value) || strlen($value) < 8 || strlen($value) > 80) {
        return '';
    }
    return $value;
}

function analytics_device($value)
{
    $value = (string) $value;
    if ($value === 'mobile' || $value === 'tablet' || $value === 'desktop') {
        return $value;
    }
    return 'desktop';
}

function analytics_source($value)
{
    $value = (string) $value;
    if (in_array($value, array('direct', 'search', 'social', 'referral'), true)) {
        return $value;
    }
    return 'direct';
}

function analytics_zone()
{
    return new DateTimeZone('Asia/Almaty');
}

function analytics_request_is_staff($body)
{
    if (!empty($body['staff'])) {
        return true;
    }
    $token = bearer_token();
    if ($token === '') {
        return false;
    }
    $tokens = read_tokens();
    return isset($tokens[$token]);
}

function analytics_client_ip()
{
    $candidates = array();
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $candidates[] = trim((string) $_SERVER['HTTP_CF_CONNECTING_IP']);
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        foreach (explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']) as $part) {
            $candidates[] = trim($part);
        }
    }
    if (!empty($_SERVER['REMOTE_ADDR'])) {
        $candidates[] = trim((string) $_SERVER['REMOTE_ADDR']);
    }
    foreach ($candidates as $ip) {
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }
    return '';
}

function analytics_ip_hash($ip)
{
    if ($ip === '') {
        return '';
    }
    return substr(hash('sha256', 'buytech-visitor-v1|' . $ip), 0, 24);
}

function analytics_http_get($url)
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_CONNECTTIMEOUT => 1,
        ));
        $body = curl_exec($ch);
        curl_close($ch);
        return is_string($body) ? $body : '';
    }
    $context = stream_context_create(array('http' => array('timeout' => 2)));
    $body = @file_get_contents($url, false, $context);
    return is_string($body) ? $body : '';
}

function analytics_place($ip)
{
    $hash = analytics_ip_hash($ip);
    $empty = array('hash' => $hash, 'country' => '', 'city' => '');
    if ($ip === '') {
        return $empty;
    }
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return array('hash' => $hash, 'country' => 'Локально', 'city' => '');
    }

    $cache = read_json_file(analytics_geo_file(), array());
    if (!is_array($cache)) {
        $cache = array();
    }
    if (isset($cache[$hash]) && is_array($cache[$hash])) {
        $savedAt = isset($cache[$hash]['at']) ? (int) $cache[$hash]['at'] : 0;
        $known = !empty($cache[$hash]['country']) || !empty($cache[$hash]['city']);
        if ($known || ($savedAt && time() - $savedAt < 86400)) {
            return array(
                'hash' => $hash,
                'country' => isset($cache[$hash]['country']) ? (string) $cache[$hash]['country'] : '',
                'city' => isset($cache[$hash]['city']) ? (string) $cache[$hash]['city'] : '',
            );
        }
    }

    $url = 'http://ip-api.com/json/' . rawurlencode($ip) . '?fields=status,country,city&lang=ru';
    $raw = analytics_http_get($url);
    $data = $raw !== '' ? json_decode($raw, true) : null;
    $country = '';
    $city = '';
    if (is_array($data) && isset($data['status']) && $data['status'] === 'success') {
        $country = isset($data['country']) ? mb_substr(trim((string) $data['country']), 0, 80) : '';
        $city = isset($data['city']) ? mb_substr(trim((string) $data['city']), 0, 80) : '';
    }
    $cache[$hash] = array('country' => $country, 'city' => $city, 'at' => time());
    if (count($cache) > 5000) {
        $cache = array_slice($cache, -4000, null, true);
    }
    write_json_file(analytics_geo_file(), $cache);
    return array('hash' => $hash, 'country' => $country, 'city' => $city);
}

function analytics_trim(&$data)
{
    $cutoff = time() - 400 * 86400;
    $kept = array();
    foreach ($data['events'] as $event) {
        $stamp = isset($event['ts']) ? strtotime($event['ts']) : 0;
        if ($stamp && $stamp >= $cutoff) {
            $kept[] = $event;
        }
        if (count($kept) >= 40000) {
            break;
        }
    }
    $data['events'] = $kept;
}

function analytics_seen_today($events, $kind, $hash, $marker)
{
    if ($hash === '') {
        return false;
    }
    $today = (new DateTime('now', analytics_zone()))->format('Y-m-d');
    foreach ($events as $event) {
        if (!isset($event['kind'], $event['ipHash'], $event['ts']) || $event['kind'] !== $kind || $event['ipHash'] !== $hash) {
            continue;
        }
        $stamp = strtotime($event['ts']);
        if (!$stamp) {
            continue;
        }
        $local = new DateTime('@' . $stamp);
        $local->setTimezone(analytics_zone());
        if ($local->format('Y-m-d') !== $today) {
            continue;
        }
        $eventMarker = $kind === 'search'
            ? (isset($event['query']) ? mb_strtolower($event['query']) : '')
            : (isset($event['path']) ? $event['path'] : '');
        if ($eventMarker === $marker) {
            return true;
        }
    }
    return false;
}

function analytics_record_view($body)
{
    if (analytics_request_is_staff($body)) {
        return;
    }
    $path = isset($body['path']) ? trim((string) $body['path']) : '';
    if ($path === '' || $path[0] !== '/' || strpos($path, '/admin') === 0 || strlen($path) > 300) {
        return;
    }
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
    if (preg_match('/bot|spider|crawler|preview|headless/i', $ua)) {
        return;
    }
    $visitor = analytics_clean_id(isset($body['visitor']) ? $body['visitor'] : '');
    $session = analytics_clean_id(isset($body['session']) ? $body['session'] : '');
    if ($visitor === '' || $session === '') {
        return;
    }

    $ip = analytics_client_ip();
    $hash = analytics_ip_hash($ip);
    $data = analytics_read();
    if (analytics_seen_today($data['events'], 'view', $hash, $path)) {
        return;
    }
    $place = analytics_place($ip);

    array_unshift($data['events'], array(
        'id' => uuid(),
        'ts' => gmdate('c'),
        'kind' => 'view',
        'path' => $path,
        'title' => isset($body['title']) ? mb_substr(trim((string) $body['title']), 0, 180) : '',
        'visitor' => $visitor,
        'session' => $session,
        'ipHash' => $place['hash'],
        'country' => $place['country'],
        'city' => $place['city'],
        'machineId' => isset($body['machineId']) ? mb_substr(trim((string) $body['machineId']), 0, 80) : '',
        'categoryId' => isset($body['categoryId']) ? mb_substr(trim((string) $body['categoryId']), 0, 80) : '',
        'brandId' => isset($body['brandId']) ? mb_substr(trim((string) $body['brandId']), 0, 80) : '',
        'source' => analytics_source(isset($body['source']) ? $body['source'] : ''),
        'device' => analytics_device(isset($body['device']) ? $body['device'] : ''),
    ));
    analytics_trim($data);
    analytics_write($data);
}

function analytics_record_search($body)
{
    if (analytics_request_is_staff($body)) {
        return;
    }
    $query = isset($body['query']) ? trim(preg_replace('/\s+/u', ' ', (string) $body['query'])) : '';
    if ($query === '' || mb_strlen($query) < 2 || mb_strlen($query) > 80) {
        return;
    }
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
    if (preg_match('/bot|spider|crawler|preview|headless/i', $ua)) {
        return;
    }
    $ip = analytics_client_ip();
    $hash = analytics_ip_hash($ip);
    $data = analytics_read();
    if (analytics_seen_today($data['events'], 'search', $hash, mb_strtolower($query))) {
        return;
    }
    $place = analytics_place($ip);
    array_unshift($data['events'], array(
        'id' => uuid(),
        'ts' => gmdate('c'),
        'kind' => 'search',
        'query' => $query,
        'path' => isset($body['path']) ? mb_substr(trim((string) $body['path']), 0, 300) : '',
        'ipHash' => $place['hash'],
        'country' => $place['country'],
        'city' => $place['city'],
        'visitor' => analytics_clean_id(isset($body['visitor']) ? $body['visitor'] : ''),
    ));
    analytics_trim($data);
    analytics_write($data);
}

function analytics_lead_place($staff)
{
    if ($staff) {
        return array('excludeFromStats' => true, 'country' => '', 'city' => '');
    }
    $place = analytics_place(analytics_client_ip());
    return array(
        'excludeFromStats' => false,
        'country' => $place['country'],
        'city' => $place['city'],
        'ipHash' => $place['hash'],
    );
}

function analytics_period($range)
{
    $range = (string) $range;
    if (!in_array($range, array('day', 'week', 'month', 'year', 'all'), true)) {
        $range = 'month';
    }
    $now = new DateTime('now', analytics_zone());
    $start = new DateTime($now->format('Y-m-d') . ' 00:00:00', analytics_zone());
    if ($range === 'week') {
        $start->modify('-6 days');
    } elseif ($range === 'month') {
        $start->modify('-29 days');
    } elseif ($range === 'year') {
        $start = new DateTime($now->format('Y-m-01') . ' 00:00:00', analytics_zone());
        $start->modify('-11 months');
    } elseif ($range === 'all') {
        $start = null;
    }
    return array('range' => $range, 'start' => $start, 'now' => $now);
}

function analytics_bucket_key($dt, $range)
{
    if ($range === 'day') {
        return $dt->format('Y-m-d H');
    }
    if ($range === 'year' || $range === 'all') {
        return $dt->format('Y-m');
    }
    return $dt->format('Y-m-d');
}

function analytics_buckets($range, $start, $end)
{
    $buckets = array();
    if ($range === 'day') {
        $day = $end->format('Y-m-d');
        for ($hour = 0; $hour < 24; $hour++) {
            $key = $day . sprintf(' %02d', $hour);
            $buckets[$key] = array('date' => $key, 'label' => sprintf('%02d:00', $hour), 'views' => 0, 'visitors' => array(), 'leads' => 0);
        }
        return $buckets;
    }
    if ($range === 'year' || $range === 'all') {
        $cursor = clone $start;
        $cursor->modify('first day of this month')->setTime(0, 0, 0);
        $last = clone $end;
        $last->modify('first day of this month')->setTime(0, 0, 0);
        while ($cursor <= $last) {
            $key = $cursor->format('Y-m');
            $buckets[$key] = array('date' => $key, 'label' => $cursor->format('m.Y'), 'views' => 0, 'visitors' => array(), 'leads' => 0);
            $cursor->modify('+1 month');
        }
        return $buckets;
    }
    $cursor = clone $start;
    $cursor->setTime(0, 0, 0);
    $last = clone $end;
    $last->setTime(0, 0, 0);
    while ($cursor <= $last) {
        $key = $cursor->format('Y-m-d');
        $buckets[$key] = array('date' => $key, 'label' => $cursor->format('d.m'), 'views' => 0, 'visitors' => array(), 'leads' => 0);
        $cursor->modify('+1 day');
    }
    return $buckets;
}

function analytics_person($row)
{
    if (!empty($row['ipHash'])) {
        return (string) $row['ipHash'];
    }
    if (!empty($row['visitor'])) {
        return 'v:' . (string) $row['visitor'];
    }
    return '';
}

function analytics_place_name($row)
{
    $country = isset($row['country']) ? trim((string) $row['country']) : '';
    $city = isset($row['city']) ? trim((string) $row['city']) : '';
    if ($city !== '' && $country !== '') {
        return $city . ', ' . $country;
    }
    if ($country !== '') {
        return $country;
    }
    if ($city !== '') {
        return $city;
    }
    return '';
}

function analytics_report($range, $machineId = '')
{
    $period = analytics_period($range);
    $range = $period['range'];
    $machineId = trim((string) $machineId);
    $events = analytics_read()['events'];
    $db = read_db();
    $leads = isset($db['leads']) && is_array($db['leads']) ? $db['leads'] : array();
    $startStamp = $period['start'] instanceof DateTime ? $period['start']->getTimestamp() : 0;

    $views = array();
    $searches = array();
    $leadRows = array();
    $seenViews = array();
    $minStamp = 0;

    foreach ($events as $event) {
        if (!isset($event['ts'], $event['kind'])) {
            continue;
        }
        $stamp = strtotime($event['ts']);
        if (!$stamp || ($startStamp && $stamp < $startStamp)) {
            continue;
        }
        if ($event['kind'] === 'search') {
            if ($machineId !== '') {
                continue;
            }
            $query = isset($event['query']) ? trim((string) $event['query']) : '';
            if ($query === '') {
                continue;
            }
            $searches[] = $event;
            if (!$minStamp || $stamp < $minStamp) {
                $minStamp = $stamp;
            }
            continue;
        }
        if ($event['kind'] !== 'view') {
            continue;
        }
        if ($machineId !== '' && (!isset($event['machineId']) || $event['machineId'] !== $machineId)) {
            continue;
        }
        $local = new DateTime('@' . $stamp);
        $local->setTimezone(analytics_zone());
        $person = analytics_person($event);
        $path = isset($event['path']) ? (string) $event['path'] : '/';
        $dedupe = $person . '|' . $path . '|' . $local->format('Y-m-d');
        if ($person !== '' && isset($seenViews[$dedupe])) {
            continue;
        }
        if ($person !== '') {
            $seenViews[$dedupe] = true;
        }
        $views[] = $event;
        if (!$minStamp || $stamp < $minStamp) {
            $minStamp = $stamp;
        }
    }

    foreach ($leads as $lead) {
        if (!isset($lead['createdAt']) || (isset($lead['status']) && $lead['status'] === 'deleted') || !empty($lead['excludeFromStats'])) {
            continue;
        }
        $stamp = strtotime($lead['createdAt']);
        if (!$stamp || ($startStamp && $stamp < $startStamp)) {
            continue;
        }
        $leadMachine = isset($lead['machineId']) ? (string) $lead['machineId'] : '';
        if ($machineId !== '' && $leadMachine !== $machineId) {
            continue;
        }
        $leadRows[] = $lead;
        if (!$minStamp || $stamp < $minStamp) {
            $minStamp = $stamp;
        }
    }

    $start = $period['start'];
    if (!$start instanceof DateTime) {
        $start = new DateTime('now', analytics_zone());
        if ($minStamp) {
            $start->setTimestamp($minStamp);
        }
        $start->modify('first day of this month')->setTime(0, 0, 0);
    }
    $buckets = analytics_buckets($range, $start, $period['now']);

    $visitors = array();
    $sessions = array();
    $pages = array();
    $machines = array();
    $sources = array();
    $devices = array();
    $places = array();

    foreach ($views as $event) {
        $stamp = strtotime($event['ts']);
        $local = new DateTime('@' . $stamp);
        $local->setTimezone(analytics_zone());
        $person = analytics_person($event);
        $session = isset($event['session']) ? (string) $event['session'] : '';
        if ($person !== '') {
            $visitors[$person] = true;
        }
        if ($session !== '') {
            $sessions[$session] = true;
        }
        $bucket = analytics_bucket_key($local, $range);
        if (isset($buckets[$bucket])) {
            $buckets[$bucket]['views']++;
            if ($person !== '') {
                $buckets[$bucket]['visitors'][$person] = true;
            }
        }
        $path = isset($event['path']) ? $event['path'] : '/';
        if (!isset($pages[$path])) {
            $pages[$path] = array(
                'path' => $path,
                'title' => isset($event['title']) ? $event['title'] : $path,
                'views' => 0,
                'visitors' => array(),
                'leads' => 0,
            );
        }
        $pages[$path]['views']++;
        if ($person !== '') {
            $pages[$path]['visitors'][$person] = true;
        }
        if (!empty($event['title'])) {
            $pages[$path]['title'] = $event['title'];
        }
        $mid = isset($event['machineId']) ? $event['machineId'] : '';
        if ($mid !== '') {
            if (!isset($machines[$mid])) {
                $machines[$mid] = array('id' => $mid, 'views' => 0, 'visitors' => array(), 'leads' => 0);
            }
            $machines[$mid]['views']++;
            if ($person !== '') {
                $machines[$mid]['visitors'][$person] = true;
            }
        }
        $source = analytics_source(isset($event['source']) ? $event['source'] : '');
        if (!isset($sources[$source])) {
            $sources[$source] = array('source' => $source, 'views' => 0, 'leads' => 0);
        }
        $sources[$source]['views']++;
        $device = analytics_device(isset($event['device']) ? $event['device'] : '');
        if (!isset($devices[$device])) {
            $devices[$device] = array('device' => $device, 'views' => 0);
        }
        $devices[$device]['views']++;
        analytics_add_place($places, $event, 'view', $person);
    }

    foreach ($leadRows as $lead) {
        $stamp = strtotime($lead['createdAt']);
        $local = new DateTime('@' . $stamp);
        $local->setTimezone(analytics_zone());
        $bucket = analytics_bucket_key($local, $range);
        if (isset($buckets[$bucket])) {
            $buckets[$bucket]['leads']++;
        }
        $page = isset($lead['page']) ? (string) $lead['page'] : '';
        if ($page !== '' && isset($pages[$page])) {
            $pages[$page]['leads']++;
        } elseif ($page !== '' && $machineId === '') {
            if (!isset($pages[$page])) {
                $pages[$page] = array('path' => $page, 'title' => $page, 'views' => 0, 'visitors' => array(), 'leads' => 0);
            }
            $pages[$page]['leads']++;
        }
        $leadMachine = isset($lead['machineId']) ? (string) $lead['machineId'] : '';
        if ($leadMachine !== '') {
            if (!isset($machines[$leadMachine])) {
                $machines[$leadMachine] = array('id' => $leadMachine, 'views' => 0, 'visitors' => array(), 'leads' => 0);
            }
            $machines[$leadMachine]['leads']++;
        }
        $source = analytics_source(isset($lead['source']) ? $lead['source'] : 'direct');
        if (!isset($sources[$source])) {
            $sources[$source] = array('source' => $source, 'views' => 0, 'leads' => 0);
        }
        $sources[$source]['leads']++;
        analytics_add_place($places, $lead, 'lead', analytics_person($lead));
    }

    $searchRows = array();
    foreach ($searches as $event) {
        $query = trim((string) $event['query']);
        $key = mb_strtolower($query);
        if (!isset($searchRows[$key])) {
            $searchRows[$key] = array('query' => $query, 'count' => 0);
        }
        $searchRows[$key]['count']++;
    }
    $searchRows = array_values($searchRows);
    usort($searchRows, function ($a, $b) {
        return $b['count'] - $a['count'];
    });

    $series = array();
    foreach ($buckets as $row) {
        $series[] = array(
            'date' => $row['date'],
            'label' => $row['label'],
            'views' => $row['views'],
            'visitors' => count($row['visitors']),
            'leads' => $row['leads'],
        );
    }

    $pageRows = array();
    foreach ($pages as $row) {
        $unique = count($row['visitors']);
        $pageRows[] = array(
            'path' => $row['path'],
            'title' => $row['title'],
            'views' => $row['views'],
            'visitors' => $unique,
            'leads' => $row['leads'],
            'conversion' => $row['views'] ? round($row['leads'] / $row['views'] * 100, 1) : 0,
        );
    }
    usort($pageRows, function ($a, $b) {
        return $b['views'] - $a['views'];
    });

    $machineRows = array();
    foreach ($machines as $row) {
        $unique = count($row['visitors']);
        $machineRows[] = array(
            'id' => $row['id'],
            'views' => $row['views'],
            'visitors' => $unique,
            'leads' => $row['leads'],
            'conversion' => $row['views'] ? round($row['leads'] / $row['views'] * 100, 1) : 0,
        );
    }
    usort($machineRows, function ($a, $b) {
        return $b['views'] - $a['views'];
    });

    $placeRows = array();
    foreach ($places as $row) {
        $placeRows[] = array(
            'label' => $row['label'],
            'views' => $row['views'],
            'visitors' => count($row['visitors']),
            'leads' => $row['leads'],
        );
    }
    usort($placeRows, function ($a, $b) {
        $score = ($b['views'] + $b['leads'] * 3) - ($a['views'] + $a['leads'] * 3);
        return $score;
    });

    $viewCount = count($views);
    return array(
        'range' => $range,
        'summary' => array(
            'views' => $viewCount,
            'visitors' => count($visitors),
            'sessions' => count($sessions),
            'leads' => count($leadRows),
            'conversion' => $viewCount ? round(count($leadRows) / $viewCount * 100, 1) : 0,
        ),
        'series' => $series,
        'pages' => array_slice($pageRows, 0, 12),
        'machines' => array_slice($machineRows, 0, 12),
        'sources' => array_values($sources),
        'devices' => array_values($devices),
        'places' => array_slice($placeRows, 0, 12),
        'searches' => array_slice($searchRows, 0, 20),
        'telegram' => array('configured' => telegram_configured()),
    );
}

function analytics_matches_clear($row, $scope, $startStamp, $machineId, $isLead)
{
    if ($scope === 'all') {
        return true;
    }
    $rowMachine = isset($row['machineId']) ? (string) $row['machineId'] : '';
    if ($scope === 'machine') {
        return $machineId !== '' && $rowMachine === $machineId;
    }
    $stamp = 0;
    if ($isLead) {
        $stamp = isset($row['createdAt']) ? strtotime($row['createdAt']) : 0;
    } else {
        $stamp = isset($row['ts']) ? strtotime($row['ts']) : 0;
    }
    if ($startStamp && (!$stamp || $stamp < $startStamp)) {
        return false;
    }
    if ($machineId !== '' && $rowMachine !== $machineId) {
        return false;
    }
    return true;
}

function analytics_clear($scope, $range, $machineId)
{
    $scope = (string) $scope;
    if (!in_array($scope, array('all', 'period', 'machine'), true)) {
        return;
    }
    $machineId = trim((string) $machineId);
    if ($scope === 'machine' && $machineId === '') {
        return;
    }
    $startStamp = 0;
    if ($scope === 'period') {
        $period = analytics_period($range);
        if ($period['start'] instanceof DateTime) {
            $startStamp = $period['start']->getTimestamp();
        }
    }

    $data = analytics_read();
    $kept = array();
    foreach ($data['events'] as $event) {
        if (!analytics_matches_clear($event, $scope, $startStamp, $machineId, false)) {
            $kept[] = $event;
        }
    }
    $data['events'] = $kept;
    analytics_write($data);

    update_db(function ($db) use ($scope, $startStamp, $machineId) {
        if (!isset($db['leads']) || !is_array($db['leads'])) {
            return $db;
        }
        foreach ($db['leads'] as $index => $lead) {
            if (analytics_matches_clear($lead, $scope, $startStamp, $machineId, true)) {
                $db['leads'][$index]['excludeFromStats'] = true;
            }
        }
        return $db;
    });
}

function analytics_add_place(&$places, $row, $kind, $person)
{
    $label = analytics_place_name($row);
    if ($label === '') {
        return;
    }
    if (!isset($places[$label])) {
        $places[$label] = array('label' => $label, 'views' => 0, 'leads' => 0, 'visitors' => array());
    }
    if ($kind === 'lead') {
        $places[$label]['leads']++;
    } else {
        $places[$label]['views']++;
    }
    if ($person !== '') {
        $places[$label]['visitors'][$person] = true;
    }
}
