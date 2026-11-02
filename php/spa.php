<?php

function html_escape($value)
{
    $flags = ENT_QUOTES;
    if (defined('ENT_SUBSTITUTE')) {
        $flags |= ENT_SUBSTITUTE;
    }
    return htmlspecialchars((string) $value, $flags, 'UTF-8');
}

function spa_plain($value, $max = 180)
{
    $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $value)));
    if ($text === '' || $max <= 0) {
        return $text;
    }
    $len = function_exists('mb_strlen') ? mb_strlen($text, 'UTF-8') : preg_match_all('/./us', $text);
    if ($len <= $max) {
        return $text;
    }
    if (function_exists('mb_substr')) {
        return rtrim(mb_substr($text, 0, $max - 1, 'UTF-8')) . '…';
    }
    if (preg_match('/^.{0,' . ($max - 1) . '}/us', $text, $match)) {
        return rtrim($match[0]) . '…';
    }
    return $text;
}

function spa_request_path()
{
    $uri = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
    $path = $uri ? $uri : '/';
    if ($path !== '/' && substr($path, -10) === '/index.php') {
        $path = substr($path, 0, -9);
    }
    $path = '/' . ltrim($path, '/');
    $trimmed = rtrim($path, '/');
    return $trimmed === '' ? '/' : $trimmed;
}

function spa_template_path()
{
    foreach (array('spa-template.html', 'index.html') as $name) {
        $path = BUYTECH_ROOT . '/' . $name;
        if (is_file($path)) {
            return $path;
        }
    }
    return '';
}

function spa_absolute_url($path)
{
    $path = $path === '/' ? '/' : $path;
    return site_url() . ($path === '/' ? '/' : $path);
}

function spa_media_url($src)
{
    $src = trim((string) $src);
    if ($src === '') {
        return '';
    }
    if (preg_match('#^https?://#i', $src)) {
        return $src;
    }
    return site_url() . '/' . ltrim($src, '/');
}

function spa_redirect($to)
{
    return array(
        array(
            'title' => '',
            'description' => '',
            'canonical' => '',
            'image' => '',
            'body' => '',
            'jsonLd' => '',
            'redirect' => $to,
        ),
        301,
    );
}

function spa_fill_category($page, $category, $categories, $machines)
{
    $pretty = catalog_category_path($category, $categories);
    $page['canonical'] = spa_absolute_url($pretty);
    $title = isset($category['title']) ? (string) $category['title'] : 'Категория';
    $page['title'] = spa_plain($title . ' — купить в Казахстане', 70) . ' | BuyTech';
    $page['description'] = spa_plain('Купить ' . $title . ' из Китая в Казахстан: новые машины, документы и доставка на объект.', 180);
    $ids = category_descendant_ids($categories, $category['id']);
    $items = '';
    foreach ($machines as $item) {
        if (empty($item['id']) || empty($item['name']) || !machine_is_public($item) || empty($item['categoryId']) || !in_array($item['categoryId'], $ids, true)) {
            continue;
        }
        $items .= '<li><a href="' . html_escape(catalog_machine_path($item, $categories, $machines)) . '">' . html_escape($item['name']) . '</a></li>';
    }
    $page['body'] = '<h1>' . html_escape($title) . '</h1><p>' . html_escape($page['description']) . '</p><ul>' . $items . '</ul>';
    return $page;
}

function spa_fill_machine($page, $machine, $categories, $machines)
{
    $pretty = catalog_machine_path($machine, $categories, $machines);
    $page['canonical'] = spa_absolute_url($pretty);
    if (!machine_is_public($machine)) {
        $page['noindex'] = true;
    }
    $name = isset($machine['name']) ? (string) $machine['name'] : 'Техника';
    $brand = isset($machine['brand']) ? (string) $machine['brand'] : '';
    $category = isset($machine['category']) ? (string) $machine['category'] : '';
    $year = isset($machine['year']) ? (string) $machine['year'] : '';
    $price = isset($machine['price']) ? (string) $machine['price'] : '';
    $condition = isset($machine['condition']) ? (string) $machine['condition'] : '';
    $description = isset($machine['description']) ? (string) $machine['description'] : '';
    $heading = trim($brand . ' ' . $name);
    $page['title'] = spa_plain(($heading !== '' ? $heading : $name) . ' — купить в Казахстане', 70) . ' | BuyTech';
    if ($description !== '') {
        $page['description'] = spa_plain($description, 180);
    } else {
        $descBits = array_filter(array($brand, $category, $year, $price, 'Купить новую спецтехнику из Китая в Казахстан.'));
        $page['description'] = spa_plain(implode('. ', $descBits), 180);
    }
    if (!empty($machine['images'][0])) {
        $page['image'] = spa_media_url($machine['images'][0]);
    }
    $body = '<article><h1>' . html_escape($heading !== '' ? $heading : $name) . '</h1>';
    $body .= '<p>' . html_escape(trim($brand . ' ' . $category)) . '</p>';
    if ($price !== '') {
        $body .= '<p>Цена: ' . html_escape($price) . '</p>';
    }
    if ($year !== '' || $condition !== '') {
        $body .= '<p>' . html_escape(trim($year . ' · ' . $condition)) . '</p>';
    }
    if ($description !== '') {
        $body .= '<p>' . html_escape($description) . '</p>';
    }
    if (!empty($machine['specs']) && is_array($machine['specs'])) {
        $body .= '<h2>Характеристики</h2><dl>';
        foreach ($machine['specs'] as $spec) {
            if (!is_array($spec) || empty($spec['label'])) {
                continue;
            }
            $body .= '<dt>' . html_escape($spec['label']) . '</dt><dd>' . html_escape(isset($spec['value']) ? $spec['value'] : '') . '</dd>';
        }
        $body .= '</dl>';
    }
    $body .= '<p>Техника новая, с завода Китая. Контракт, документы на ввоз и доставка в Казахстан.</p></article>';
    $page['body'] = $body;
    $page['jsonLd'] = spa_product_jsonld($page, $machine, $heading !== '' ? $heading : $name, $brand, $description);
    return $page;
}

function spa_product_jsonld($page, $machine, $name, $brand, $description)
{
    $images = array();
    if (!empty($machine['images']) && is_array($machine['images'])) {
        foreach ($machine['images'] as $src) {
            if ($src) {
                $images[] = spa_media_url($src);
            }
        }
    }
    if (!$images && !empty($page['image'])) {
        $images[] = $page['image'];
    }

    $db = read_db();
    $contacts = isset($db['content']['contacts']) && is_array($db['content']['contacts'])
        ? $db['content']['contacts']
        : array();
    $phone = isset($contacts['phone']) ? trim((string) $contacts['phone']) : '';
    $email = isset($contacts['email']) ? trim((string) $contacts['email']) : '';
    $address = isset($contacts['address']) ? trim((string) $contacts['address']) : 'Казахстан';

    $seller = array(
        '@type' => 'Organization',
        'name' => 'BuyTech',
        'url' => site_url() . '/',
    );
    if ($phone !== '') {
        $seller['telephone'] = $phone;
    }
    if ($email !== '') {
        $seller['email'] = $email;
    }
    $seller['address'] = array(
        '@type' => 'PostalAddress',
        'streetAddress' => $address,
        'addressCountry' => 'KZ',
    );

    $condition = isset($machine['condition']) ? (string) $machine['condition'] : '';
    $used = preg_match('/б\\/?у|бу|used|б\\.у/iu', $condition);
    $amount = parse_price_amount(
        isset($machine['price']) ? $machine['price'] : '',
        isset($machine['priceFrom']) ? $machine['priceFrom'] : 0
    );

    $offer = array(
        '@type' => 'Offer',
        'url' => $page['canonical'],
        'priceCurrency' => 'KZT',
        'availability' => 'https://schema.org/InStock',
        'itemCondition' => $used ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
        'seller' => $seller,
        'shippingDetails' => array(
            '@type' => 'OfferShippingDetails',
            'shippingDestination' => array(
                '@type' => 'DefinedRegion',
                'addressCountry' => 'KZ',
            ),
            'deliveryTime' => array(
                '@type' => 'ShippingDeliveryTime',
                'handlingTime' => array(
                    '@type' => 'QuantitativeValue',
                    'minValue' => 7,
                    'maxValue' => 21,
                    'unitCode' => 'DAY',
                ),
                'transitTime' => array(
                    '@type' => 'QuantitativeValue',
                    'minValue' => 14,
                    'maxValue' => 45,
                    'unitCode' => 'DAY',
                ),
            ),
            'shippingRate' => array(
                '@type' => 'MonetaryAmount',
                'value' => 0,
                'currency' => 'KZT',
            ),
        ),
        'hasMerchantReturnPolicy' => array(
            '@type' => 'MerchantReturnPolicy',
            'applicableCountry' => 'KZ',
            'returnPolicyCategory' => 'https://schema.org/MerchantReturnNotPermitted',
            'merchantReturnLink' => site_url() . '/terms',
        ),
    );
    if ($amount > 0) {
        $offer['price'] = (string) $amount;
        $offer['priceValidUntil'] = gmdate('Y-m-d', strtotime('+1 year'));
    }

    $product = array(
        '@context' => 'https://schema.org',
        '@type' => 'Product',
        'name' => $name,
        'description' => spa_plain($description !== '' ? $description : $page['description'], 0),
        'brand' => array('@type' => 'Brand', 'name' => $brand !== '' ? $brand : 'BuyTech'),
        'image' => $images,
        'sku' => machine_preferred_slug($machine),
        'mpn' => isset($machine['name']) ? (string) $machine['name'] : $name,
        'offers' => $offer,
    );

    return json_encode($product, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG);
}

function spa_find_machine($db, $id)
{
    if (!isset($db['machines']) || !is_array($db['machines'])) {
        return null;
    }
    foreach ($db['machines'] as $machine) {
        if (isset($machine['id']) && (string) $machine['id'] === (string) $id) {
            return $machine;
        }
    }
    return null;
}

function spa_page($path)
{
    $db = read_db();
    $content = isset($db['content']) && is_array($db['content']) ? $db['content'] : array();
    $home = isset($content['home']) && is_array($content['home']) ? $content['home'] : array();
    $catalog = isset($content['catalog']) && is_array($content['catalog']) ? $content['catalog'] : array();
    $about = isset($content['about']) && is_array($content['about']) ? $content['about'] : array();
    $contacts = isset($content['contacts']) && is_array($content['contacts']) ? $content['contacts'] : array();
    $status = 200;
    $noindex = false;

    $page = array(
        'title' => 'BuyTech — спецтехника под задачу',
        'description' => 'BuyTech — новая спецтехника из Китая в Казахстан: HOWO, Hengte, SOVOL, Shantui, SHANMON. Документы и доставка.',
        'canonical' => spa_absolute_url($path),
        'image' => spa_media_url('/apple-touch-icon.png'),
        'body' => '',
        'jsonLd' => '',
    );

    if (strpos($path, '/admin') === 0) {
        $noindex = true;
        $page['title'] = 'Админка BuyTech';
        $page['description'] = 'Служебный раздел сайта BuyTech.';
        $page['noindex'] = true;
        return array($page, 200);
    }

    $categories = isset($db['categories']) && is_array($db['categories']) ? $db['categories'] : array();
    $machines = isset($db['machines']) && is_array($db['machines']) ? $db['machines'] : array();

    if ($path === '/') {
        $title = isset($home['heroTitle']) ? $home['heroTitle'] : 'Купить спецтехнику из Китая в Казахстан';
        $lead = isset($home['heroLead']) ? $home['heroLead'] : $page['description'];
        $page['title'] = spa_plain($title, 70) . ' | BuyTech';
        $page['description'] = spa_plain($lead, 180);
        $body = '<h1>' . html_escape($title) . '</h1><p>' . html_escape($lead) . '</p>';
        $body .= '<h2>Категории</h2><ul>';
        foreach ($categories as $category) {
            if (empty($category['id']) || empty($category['title']) || !empty($category['parentId'])) {
                continue;
            }
            $body .= '<li><a href="' . html_escape(catalog_category_path($category, $categories)) . '">' . html_escape($category['title']) . '</a></li>';
        }
        $body .= '</ul><h2>Техника</h2><ul>';
        $shown = 0;
        foreach ($machines as $machine) {
            if (empty($machine['id']) || empty($machine['name']) || !machine_is_public($machine)) {
                continue;
            }
            $body .= '<li><a href="' . html_escape(catalog_machine_path($machine, $categories, $machines)) . '">' . html_escape($machine['name']) . '</a></li>';
            $shown++;
            if ($shown >= 24) {
                break;
            }
        }
        $body .= '</ul><p><a href="/catalog">Весь каталог</a></p>';
        $page['body'] = $body;
        return array($page, $status);
    }

    if ($path === '/catalog') {
        $title = 'Купить спецтехнику из Китая';
        $lead = isset($catalog['lead']) ? $catalog['lead'] : 'Новая техника из Китая с поставкой в Казахстан.';
        $page['title'] = $title . ' | BuyTech';
        $page['description'] = spa_plain($lead, 180);
        $items = '';
        foreach ($categories as $category) {
            if (empty($category['id']) || empty($category['title']) || !empty($category['parentId'])) {
                continue;
            }
            $items .= '<li><a href="' . html_escape(catalog_category_path($category, $categories)) . '">' . html_escape($category['title']) . '</a></li>';
        }
        foreach ($machines as $machine) {
            if (empty($machine['id']) || empty($machine['name']) || !machine_is_public($machine)) {
                continue;
            }
            $href = catalog_machine_path($machine, $categories, $machines);
            $items .= '<li><a href="' . html_escape($href) . '">' . html_escape($machine['name']) . '</a>';
            if (!empty($machine['brand'])) {
                $items .= ' — ' . html_escape($machine['brand']);
            }
            if (!empty($machine['price'])) {
                $items .= ', ' . html_escape($machine['price']);
            }
            $items .= "</li>\n";
        }
        $page['body'] = '<h1>' . html_escape($title) . '</h1><p>' . html_escape($lead) . '</p><ul>' . $items . '</ul>';
        return array($page, $status);
    }

    if (preg_match('#^/catalog/([^/]+)$#', $path, $match)) {
        $segment = rawurldecode($match[1]);
        $machine = find_machine_by_slug_or_id($machines, $segment);
        if ($machine) {
            return spa_redirect(catalog_machine_path($machine, $categories, $machines));
        }
        $category = find_category_by_slug_or_id($categories, $segment);
        if ($category) {
            return spa_redirect(catalog_category_path($category, $categories));
        }
        $page['title'] = 'Страница не найдена | BuyTech';
        $page['description'] = 'Такой страницы нет на BuyTech.';
        $page['body'] = '<h1>Страница не найдена</h1><p>Такой позиции нет в каталоге или ссылка устарела.</p>';
        $page['noindex'] = true;
        return array($page, 404);
    }

    if ($path === '/about') {
        $title = isset($about['title']) ? $about['title'] : 'О компании';
        $lead = isset($about['lead']) ? $about['lead'] : 'BuyTech поставляет новую спецтехнику из Китая в Казахстан.';
        $page['title'] = spa_plain($title, 70) . ' | BuyTech';
        $page['description'] = spa_plain($lead, 180);
        $page['body'] = '<h1>' . html_escape($title) . '</h1><p>' . html_escape($lead) . '</p>';
        return array($page, $status);
    }

    if ($path === '/contacts') {
        $title = isset($contacts['title']) ? $contacts['title'] : 'Контакты';
        $lead = isset($contacts['lead']) ? $contacts['lead'] : 'Свяжитесь с BuyTech по вопросам поставки спецтехники.';
        $page['title'] = spa_plain($title, 70) . ' | BuyTech';
        $page['description'] = spa_plain($lead, 180);
        $page['body'] = '<h1>' . html_escape($title) . '</h1><p>' . html_escape($lead) . '</p>';
        if (!empty($contacts['phone'])) {
            $page['body'] .= '<p>Телефон: ' . html_escape($contacts['phone']) . '</p>';
        }
        if (!empty($contacts['phone2'])) {
            $page['body'] .= '<p>Телефон: ' . html_escape($contacts['phone2']) . '</p>';
        }
        return array($page, $status);
    }

    if ($path === '/faq') {
        $page['title'] = 'Вопросы и ответы | BuyTech';
        $page['description'] = 'Ответы на частые вопросы о поставке новой спецтехники из Китая в Казахстан.';
        $faq = isset($content['faq']) && is_array($content['faq']) ? $content['faq'] : array();
        $body = '<h1>Вопросы и ответы</h1>';
        foreach ($faq as $item) {
            if (!is_array($item) || empty($item['question'])) {
                continue;
            }
            $body .= '<h2>' . html_escape($item['question']) . '</h2><p>' . html_escape(isset($item['answer']) ? $item['answer'] : '') . '</p>';
        }
        $page['body'] = $body;
        return array($page, $status);
    }

    if ($path === '/privacy') {
        $page['title'] = 'Политика конфиденциальности | BuyTech';
        $page['description'] = 'Как BuyTech обрабатывает персональные данные, полученные через сайт.';
        $page['body'] = '<h1>Политика конфиденциальности</h1><p>Оператор персональных данных — BuyTech.</p>';
        return array($page, $status);
    }

    if ($path === '/terms') {
        $page['title'] = 'Пользовательское соглашение | BuyTech';
        $page['description'] = 'Условия использования сайта BuyTech.';
        $page['body'] = '<h1>Пользовательское соглашение</h1><p>Используя сайт BuyTech, вы принимаете условия соглашения.</p>';
        return array($page, $status);
    }

    if (preg_match('#^/brand/([^/]+)$#', $path, $match)) {
        $brands = isset($db['brands']) && is_array($db['brands']) ? $db['brands'] : array();
        $brand = find_brand_by_slug_or_id($brands, rawurldecode($match[1]));
        if ($brand) {
            $name = (string) $brand['name'];
            $page['title'] = spa_plain($name . ' — спецтехника из Китая', 70) . ' | BuyTech';
            $lead = !empty($brand['shortText'])
                ? (string) $brand['shortText']
                : ('Новая техника ' . $name . ' с завода в Китае: поставка в Казахстан.');
            $page['description'] = spa_plain($lead, 180);
            $page['canonical'] = spa_absolute_url('/brand/' . brand_slug_map($brands)[$brand['id']]);
            $page['body'] = '<h1>' . html_escape($name) . '</h1><p>' . html_escape($lead) . '</p>';
            return array($page, 200);
        }
    }

    if (preg_match('#^/([^/]+)/([^/]+)$#', $path, $match)) {
        $category = find_category_by_slug_or_id($categories, rawurldecode($match[1]));
        $machine = find_machine_by_slug_or_id($machines, rawurldecode($match[2]));
        if ($machine) {
            $pretty = catalog_machine_path($machine, $categories, $machines);
            if ($pretty !== $path) {
                return spa_redirect($pretty);
            }
            return array(spa_fill_machine($page, $machine, $categories, $machines), 200);
        }
        if ($category) {
            return spa_redirect(catalog_category_path($category, $categories));
        }
    }

    if (preg_match('#^/([^/]+)$#', $path, $match)) {
        $category = find_category_by_slug_or_id($categories, rawurldecode($match[1]));
        if ($category) {
            $pretty = catalog_category_path($category, $categories);
            if ($pretty !== $path) {
                return spa_redirect($pretty);
            }
            return array(spa_fill_category($page, $category, $categories, $machines), 200);
        }
    }

    $page['title'] = 'Страница не найдена | BuyTech';
    $page['description'] = 'Такой страницы нет на BuyTech.';
    $page['body'] = '<h1>Страница не найдена</h1>';
    $page['noindex'] = true;
    return array($page, 404);
}

function spa_apply($html, $page)
{
    $html = preg_replace('/<title>.*?<\/title>/is', '<title>' . html_escape($page['title']) . '</title>', $html, 1);
    $descTag = '<meta name="description" content="' . html_escape($page['description']) . '" />';
    if (preg_match('/<meta[^>]*name=["\']description["\'][^>]*>/is', $html)) {
        $html = preg_replace('/<meta[^>]*name=["\']description["\'][^>]*>/is', $descTag, $html, 1);
    } else {
        $html = preg_replace('/<title>.*?<\/title>/is', '$0' . "\n    " . $descTag, $html, 1);
    }

    $robots = !empty($page['noindex']) ? 'noindex, nofollow' : 'index, follow';
    if (preg_match('/<meta[^>]*name=["\']robots["\'][^>]*>/is', $html)) {
        $html = preg_replace(
            '/<meta[^>]*name=["\']robots["\'][^>]*>/is',
            '<meta name="robots" content="' . $robots . '" />',
            $html,
            1
        );
    }

    $canonical = '<link rel="canonical" href="' . html_escape($page['canonical']) . '" />';
    $hadCanonical = preg_match('/<link[^>]*rel=["\']canonical["\'][^>]*>/is', $html);
    if ($hadCanonical) {
        $html = preg_replace('/<link[^>]*rel=["\']canonical["\'][^>]*>/is', $canonical, $html, 1);
    }

    $head = array();
    if (!$hadCanonical) {
        $head[] = $canonical;
    }
    $head[] = '<meta property="og:type" content="website" />';
    $head[] = '<meta property="og:title" content="' . html_escape($page['title']) . '" />';
    $head[] = '<meta property="og:description" content="' . html_escape($page['description']) . '" />';
    $head[] = '<meta property="og:url" content="' . html_escape($page['canonical']) . '" />';
    $head[] = '<meta property="og:image" content="' . html_escape($page['image']) . '" />';
    if (!empty($page['jsonLd'])) {
        $head[] = '<script type="application/ld+json">' . $page['jsonLd'] . '</script>';
    }
    $html = preg_replace('/<\/head>/i', implode("\n    ", $head) . "\n  </head>", $html, 1);

    if (!empty($page['body'])) {
        $block = '<div id="seo-prerender">' . $page['body'] . '</div>';
        if (strpos($html, '<div id="root">') !== false) {
            $html = str_replace('<div id="root"></div>', $block . "\n    <div id=\"root\"></div>", $html);
        } else {
            $html = preg_replace('/<body[^>]*>/i', '$0' . $block, $html, 1);
        }
    }

    return $html;
}

function output_spa()
{
    $template = spa_template_path();
    if ($template === '') {
        header('Content-Type: text/plain; charset=utf-8');
        echo 'index.html not found';
        return;
    }
    $html = file_get_contents($template);
    if ($html === false) {
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Cannot read index.html';
        return;
    }
    $path = spa_request_path();
    list($page, $status) = spa_page($path);
    if ($status === 301 && !empty($page['redirect'])) {
        header('Location: ' . $page['redirect'], true, 301);
        return;
    }
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    echo spa_apply($html, $page);
}
