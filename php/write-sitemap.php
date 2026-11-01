<?php

require __DIR__ . '/bootstrap.php';

if (!write_sitemap_file()) {
    fwrite(STDERR, "Failed to write sitemap.xml\n");
    exit(1);
}

echo 'Wrote ' . sitemap_file_path() . PHP_EOL;
