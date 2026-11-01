<?php

function sitemap_file_path()
{
    return BUYTECH_SITEMAP;
}

function sitemap_urls()
{
    $base = site_url();
    $db = read_db();
    $lastmod = gmdate('Y-m-d');
    if (is_file(BUYTECH_DB)) {
        $mtime = @filemtime(BUYTECH_DB);
        if ($mtime) {
            $lastmod = gmdate('Y-m-d', $mtime);
        }
    }

    $urls = array(
        array('loc' => $base . '/', 'changefreq' => 'daily', 'priority' => '1.0'),
        array('loc' => $base . '/catalog', 'changefreq' => 'daily', 'priority' => '0.9'),
        array('loc' => $base . '/about', 'changefreq' => 'monthly', 'priority' => '0.6'),
        array('loc' => $base . '/contacts', 'changefreq' => 'monthly', 'priority' => '0.6'),
        array('loc' => $base . '/faq', 'changefreq' => 'monthly', 'priority' => '0.5'),
        array('loc' => $base . '/privacy', 'changefreq' => 'yearly', 'priority' => '0.3'),
        array('loc' => $base . '/terms', 'changefreq' => 'yearly', 'priority' => '0.3'),
    );

    $categories = isset($db['categories']) && is_array($db['categories']) ? $db['categories'] : array();
    foreach ($categories as $category) {
        if (empty($category['id']) || empty($category['title'])) {
            continue;
        }
        $urls[] = array(
            'loc' => $base . catalog_category_path($category, $categories),
            'changefreq' => 'weekly',
            'priority' => '0.85',
        );
    }

    $machines = isset($db['machines']) && is_array($db['machines']) ? $db['machines'] : array();
    foreach ($machines as $machine) {
        if (empty($machine['id'])) {
            continue;
        }
        $urls[] = array(
            'loc' => $base . catalog_machine_path($machine, $categories, $machines),
            'changefreq' => 'weekly',
            'priority' => '0.8',
        );
    }

    return array($urls, $lastmod);
}

function build_sitemap_xml()
{
    list($urls, $lastmod) = sitemap_urls();
    $xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($urls as $url) {
        $xml .= "  <url>\n";
        $xml .= '    <loc>' . xml_escape($url['loc']) . "</loc>\n";
        $xml .= '    <lastmod>' . $lastmod . "</lastmod>\n";
        $xml .= '    <changefreq>' . $url['changefreq'] . "</changefreq>\n";
        $xml .= '    <priority>' . $url['priority'] . "</priority>\n";
        $xml .= "  </url>\n";
    }
    $xml .= '</urlset>';
    return $xml;
}

function build_sitemap_txt()
{
    list($urls) = sitemap_urls();
    $lines = array();
    foreach ($urls as $url) {
        $lines[] = $url['loc'];
    }
    return implode("\n", $lines) . "\n";
}

function write_sitemap_file($path = null)
{
    if ($path === null || $path === '') {
        $path = sitemap_file_path();
    }
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $ok = @file_put_contents($path, build_sitemap_xml());
    $txt = preg_replace('/\.xml$/i', '.txt', $path);
    @file_put_contents($txt, build_sitemap_txt());
    return $ok !== false;
}

function output_sitemap()
{
    $xml = build_sitemap_xml();
    write_sitemap_file();
    header('Content-Type: application/xml; charset=utf-8');
    header('X-Robots-Tag: index, follow');
    header('Cache-Control: public, max-age=600');
    echo $xml;
    throw new JsonResponseSent();
}
