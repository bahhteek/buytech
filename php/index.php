<?php

require_once __DIR__ . '/bootstrap.php';

send_cors();

if (strtoupper(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '') === 'OPTIONS') {
    http_response_code(204);
    return true;
}

try {
    $method = request_method();
    $path = request_path();
    route($method, $path);
} catch (JsonResponseSent $sent) {
    return true;
} catch (Throwable $error) {
    try {
        json_response(array('error' => $error->getMessage() ?: 'Server error'), 500);
    } catch (JsonResponseSent $sent) {
        return true;
    }
}

function route($method, $path)
{
    if ($method === 'GET' && $path === '/health') {
        json_response(array('ok' => true));
    }

    if ($method === 'GET' && $path === '/public') {
        $db = read_db();
        json_response(array(
            'content' => $db['content'],
            'brands' => $db['brands'],
            'categories' => $db['categories'],
            'machines' => $db['machines'],
        ));
    }

    if ($method === 'POST' && $path === '/leads') {
        $body = json_body();
        $name = isset($body['name']) ? trim((string) $body['name']) : '';
        $phone = isset($body['phone']) ? trim((string) $body['phone']) : '';
        if ($name === '' || $phone === '') {
            json_response(array('error' => 'name and phone are required'), 400);
        }
        $lead = array(
            'id' => uuid(),
            'name' => $name,
            'phone' => $phone,
            'email' => isset($body['email']) ? trim((string) $body['email']) : '',
            'need' => isset($body['need']) ? trim((string) $body['need']) : '',
            'createdAt' => gmdate('c'),
            'status' => 'new',
        );
        update_db(function ($db) use ($lead) {
            array_unshift($db['leads'], $lead);
            return $db;
        });
        $mail = array('sent' => false);
        try {
            $mail = send_lead_email($lead);
        } catch (Throwable $error) {
            $mail = array('sent' => false, 'reason' => 'send_failed');
        }
        json_response(array('lead' => $lead, 'mail' => $mail), 201);
    }

    if ($method === 'POST' && $path === '/admin/login') {
        $body = json_body();
        $username = isset($body['username']) ? (string) $body['username'] : '';
        $password = isset($body['password']) ? (string) $body['password'] : '';
        $okUser = secrets_match(env('ADMIN_USER', 'admin'), $username);
        $okPass = secrets_match(env('ADMIN_PASSWORD', 'buytech-admin'), $password);
        if (!$okUser || !$okPass) {
            json_response(array('error' => 'Неверный логин или пароль'), 401);
        }
        $token = uuid();
        save_token($token);
        json_response(array('token' => $token));
    }

    if ($method === 'POST' && $path === '/admin/logout') {
        require_auth();
        delete_token(bearer_token());
        json_response(array('ok' => true));
    }

    if ($method === 'GET' && $path === '/admin/leads') {
        require_auth();
        json_response(read_db()['leads']);
    }

    if (preg_match('#^/admin/leads/([^/]+)$#', $path, $match)) {
        require_auth();
        $id = $match[1];
        if ($method === 'PATCH') {
            $body = json_body();
            $updated = null;
            update_db(function ($db) use ($id, $body, &$updated) {
                foreach ($db['leads'] as $index => $lead) {
                    if ((string) $lead['id'] === (string) $id) {
                        if (!empty($body['status'])) {
                            $db['leads'][$index]['status'] = (string) $body['status'];
                        }
                        $updated = $db['leads'][$index];
                        break;
                    }
                }
                return $db;
            });
            if (!$updated) {
                json_response(array('error' => 'Not found'), 404);
            }
            json_response($updated);
        }
        if ($method === 'DELETE') {
            update_db(function ($db) use ($id) {
                $next = array();
                foreach ($db['leads'] as $lead) {
                    if ((string) $lead['id'] !== (string) $id) {
                        $next[] = $lead;
                    }
                }
                $db['leads'] = $next;
                return $db;
            });
            json_response(array('ok' => true));
        }
    }

    if ($method === 'PUT' && $path === '/admin/content') {
        require_auth();
        $content = json_body();
        if (!$content) {
            json_response(array('error' => 'Invalid content'), 400);
        }
        update_db(function ($db) use ($content) {
            $db['content'] = $content;
            return $db;
        });
        json_response($content);
    }

    if ($method === 'GET' && $path === '/admin/brands') {
        require_auth();
        json_response(read_db()['brands']);
    }

    if ($method === 'POST' && $path === '/admin/brands') {
        require_auth();
        $body = json_body();
        $name = isset($body['name']) ? trim((string) $body['name']) : '';
        if ($name === '') {
            json_response(array('error' => 'name required'), 400);
        }
        $brand = array('id' => uuid(), 'name' => $name);
        update_db(function ($db) use ($brand) {
            $db['brands'][] = $brand;
            return $db;
        });
        json_response($brand, 201);
    }

    if (preg_match('#^/admin/brands/([^/]+)$#', $path, $match)) {
        require_auth();
        $id = $match[1];
        if ($method === 'PUT') {
            $body = json_body();
            $name = isset($body['name']) ? trim((string) $body['name']) : '';
            $updated = null;
            update_db(function ($db) use ($id, $name, &$updated) {
                foreach ($db['brands'] as $index => $brand) {
                    if ((string) $brand['id'] === (string) $id) {
                        if ($name !== '') {
                            $db['brands'][$index]['name'] = $name;
                        }
                        $updated = $db['brands'][$index];
                        foreach ($db['machines'] as $mIndex => $machine) {
                            if (isset($machine['brandId']) && (string) $machine['brandId'] === (string) $id) {
                                $db['machines'][$mIndex]['brand'] = $db['brands'][$index]['name'];
                            }
                        }
                        break;
                    }
                }
                return $db;
            });
            if (!$updated) {
                json_response(array('error' => 'Not found'), 404);
            }
            json_response($updated);
        }
        if ($method === 'DELETE') {
            update_db(function ($db) use ($id) {
                $next = array();
                foreach ($db['brands'] as $brand) {
                    if ((string) $brand['id'] !== (string) $id) {
                        $next[] = $brand;
                    }
                }
                $db['brands'] = $next;
                return $db;
            });
            json_response(array('ok' => true));
        }
    }

    if ($method === 'POST' && $path === '/admin/categories') {
        require_auth();
        $body = json_body();
        $title = isset($body['title']) ? trim((string) $body['title']) : '';
        if ($title === '') {
            json_response(array('error' => 'title required'), 400);
        }
        $category = array(
            'id' => !empty($body['id']) ? (string) $body['id'] : uuid(),
            'title' => $title,
            'hint' => isset($body['hint']) ? trim((string) $body['hint']) : '',
            'image' => isset($body['image']) && $body['image'] !== '' ? (string) $body['image'] : '/images/excavator.jpg',
        );
        update_db(function ($db) use ($category) {
            $db['categories'][] = $category;
            return $db;
        });
        json_response($category, 201);
    }

    if (preg_match('#^/admin/categories/([^/]+)$#', $path, $match)) {
        require_auth();
        $id = $match[1];
        if ($method === 'PUT') {
            $body = json_body();
            $updated = null;
            update_db(function ($db) use ($id, $body, &$updated) {
                foreach ($db['categories'] as $index => $category) {
                    if ((string) $category['id'] === (string) $id) {
                        if (isset($body['title'])) $db['categories'][$index]['title'] = (string) $body['title'];
                        if (isset($body['hint'])) $db['categories'][$index]['hint'] = (string) $body['hint'];
                        if (isset($body['image'])) $db['categories'][$index]['image'] = (string) $body['image'];
                        $updated = $db['categories'][$index];
                        break;
                    }
                }
                return $db;
            });
            if (!$updated) {
                json_response(array('error' => 'Not found'), 404);
            }
            json_response($updated);
        }
        if ($method === 'DELETE') {
            update_db(function ($db) use ($id) {
                $next = array();
                foreach ($db['categories'] as $category) {
                    if ((string) $category['id'] !== (string) $id) {
                        $next[] = $category;
                    }
                }
                $db['categories'] = $next;
                return $db;
            });
            json_response(array('ok' => true));
        }
    }

    if ($method === 'POST' && $path === '/admin/machines') {
        require_auth();
        $body = json_body();
        $db = read_db();
        $brand = isset($body['brandId']) ? find_by_id($db['brands'], $body['brandId']) : null;
        $category = isset($body['categoryId']) ? find_by_id($db['categories'], $body['categoryId']) : null;
        if (empty($body['name']) || !$brand || !$category) {
            json_response(array('error' => 'name, brandId, categoryId required'), 400);
        }
        $images = (isset($body['images']) && is_array($body['images']) && count($body['images']))
            ? $body['images']
            : array('/images/excavator.jpg');
        $machine = array(
            'id' => uuid(),
            'name' => (string) $body['name'],
            'brandId' => $brand['id'],
            'brand' => $brand['name'],
            'category' => isset($body['category']) && $body['category'] !== '' ? (string) $body['category'] : $category['title'],
            'categoryId' => $category['id'],
            'year' => isset($body['year']) ? (int) $body['year'] : (int) date('Y'),
            'condition' => isset($body['condition']) && $body['condition'] !== '' ? (string) $body['condition'] : 'Новый',
            'price' => isset($body['price']) ? (string) $body['price'] : '',
            'priceFrom' => isset($body['priceFrom']) ? (int) $body['priceFrom'] : 0,
            'images' => $images,
            'videoUrl' => isset($body['videoUrl']) ? (string) $body['videoUrl'] : '',
            'description' => isset($body['description']) ? (string) $body['description'] : '',
            'specs' => normalize_specs(isset($body['specs']) ? $body['specs'] : array()),
            'relatedIds' => normalize_related_ids(isset($body['relatedIds']) ? $body['relatedIds'] : array()),
        );
        update_db(function ($store) use ($machine) {
            array_unshift($store['machines'], $machine);
            return $store;
        });
        json_response($machine, 201);
    }

    if (preg_match('#^/admin/machines/([^/]+)$#', $path, $match)) {
        require_auth();
        $id = $match[1];
        if ($method === 'PUT') {
            $body = json_body();
            $updated = null;
            update_db(function ($db) use ($id, $body, &$updated) {
                foreach ($db['machines'] as $index => $current) {
                    if ((string) $current['id'] !== (string) $id) {
                        continue;
                    }
                    $brand = isset($body['brandId'])
                        ? find_by_id($db['brands'], $body['brandId'])
                        : find_by_id($db['brands'], $current['brandId']);
                    $category = isset($body['categoryId'])
                        ? find_by_id($db['categories'], $body['categoryId'])
                        : find_by_id($db['categories'], $current['categoryId']);
                    $updated = $current;
                    foreach ($body as $key => $value) {
                        if ($key === 'id') {
                            continue;
                        }
                        $updated[$key] = $value;
                    }
                    $updated['id'] = $current['id'];
                    $updated['brandId'] = $brand ? $brand['id'] : $current['brandId'];
                    $updated['brand'] = $brand ? $brand['name'] : $current['brand'];
                    $updated['categoryId'] = $category ? $category['id'] : $current['categoryId'];
                    $updated['category'] = !empty($body['category'])
                        ? (string) $body['category']
                        : ($category ? $category['title'] : $current['category']);
                    $updated['year'] = isset($body['year']) ? (int) $body['year'] : (int) $current['year'];
                    $updated['priceFrom'] = isset($body['priceFrom']) ? (int) $body['priceFrom'] : (int) $current['priceFrom'];
                    $updated['images'] = (isset($body['images']) && is_array($body['images']) && count($body['images']))
                        ? $body['images']
                        : $current['images'];
                    $updated['specs'] = isset($body['specs']) && is_array($body['specs'])
                        ? normalize_specs($body['specs'])
                        : $current['specs'];
                    $updated['relatedIds'] = isset($body['relatedIds']) && is_array($body['relatedIds'])
                        ? normalize_related_ids($body['relatedIds'], $current['id'])
                        : (isset($current['relatedIds']) ? $current['relatedIds'] : array());
                    $db['machines'][$index] = $updated;
                    break;
                }
                return $db;
            });
            if (!$updated) {
                json_response(array('error' => 'Not found'), 404);
            }
            json_response($updated);
        }
        if ($method === 'DELETE') {
            update_db(function ($db) use ($id) {
                $next = array();
                foreach ($db['machines'] as $machine) {
                    if ((string) $machine['id'] !== (string) $id) {
                        $next[] = $machine;
                    }
                }
                $db['machines'] = $next;
                return $db;
            });
            json_response(array('ok' => true));
        }
    }

    if ($method === 'POST' && $path === '/admin/upload') {
        require_auth();
        if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
            json_response(array('error' => 'file required'), 400);
        }
        $file = $_FILES['file'];
        if (!empty($file['error'])) {
            json_response(array('error' => 'Upload error'), 400);
        }
        if ($file['size'] > 12 * 1024 * 1024) {
            json_response(array('error' => 'File too large'), 400);
        }
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? finfo_file($finfo, $file['tmp_name']) : '';
        if ($finfo) {
            finfo_close($finfo);
        }
        if (strpos($mime, 'image/') !== 0 && strpos($mime, 'video/') !== 0) {
            json_response(array('error' => 'Only images and videos allowed'), 400);
        }
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'mp4', 'webm', 'mov', 'mkv');
        if (!in_array($ext, $allowed, true)) {
            $ext = strpos($mime, 'video/') === 0 ? 'mp4' : 'jpg';
        }
        $name = time() . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
        $dest = BUYTECH_UPLOADS . '/' . $name;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            json_response(array('error' => 'Cannot save file'), 500);
        }
        json_response(array('url' => '/uploads/' . $name), 201);
    }

    json_response(array('error' => 'Not found'), 404);
}
