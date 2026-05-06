<?php
require_once '../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

// GET - list or single product
if ($method === 'GET') {
    $id       = $_GET['id'] ?? null;
    $search   = $_GET['search'] ?? '';
    $category = $_GET['category'] ?? '';
    $status   = $_GET['status'] ?? '';

    if ($id) {
        $stmt = $db->prepare("SELECT * FROM products WHERE product_id = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        jsonResponse($row ?: ['error' => 'Not found'], $row ? 200 : 404);
    }

    $sql    = "SELECT * FROM products WHERE 1=1";
    $params = [];
    $types  = '';

    if ($search) {
        $sql    .= " AND (product_name LIKE ? OR sku LIKE ?)";
        $like    = "%$search%";
        $params[] = $like;
        $params[] = $like;
        $types   .= 'ss';
    }
    if ($category) {
        $sql     .= " AND category = ?";
        $params[] = $category;
        $types   .= 's';
    }
    if ($status === 'low') {
        $sql .= " AND quantity_in_stock > 0 AND quantity_in_stock <= reorder_level";
    } elseif ($status === 'out') {
        $sql .= " AND quantity_in_stock = 0";
    }

    $sql .= " ORDER BY product_name ASC";

    if ($types) {
        $stmt = $db->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } else {
        $rows = $db->query($sql)->fetch_all(MYSQLI_ASSOC);
    }

    jsonResponse($rows);
}

// POST - add product
if ($method === 'POST') {
    $d = requestJson();
    requireFields($d, ['product_name', 'sku', 'category', 'unit_price']);

    $stmt = $db->prepare(
        "INSERT INTO products (product_name, sku, category, description, unit_price, quantity_in_stock, reorder_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $description = trim($d['description'] ?? '');
    $qty = max(0, (int)($d['quantity_in_stock'] ?? 0));
    $rl  = max(0, (int)($d['reorder_level'] ?? 5));
    $price = (float)($d['unit_price'] ?? 0);
    $stmt->bind_param('ssssdii', $d['product_name'], $d['sku'], $d['category'],
                       $description, $price, $qty, $rl);
    $stmt->execute();
    jsonResponse(['success' => true, 'id' => $db->insert_id]);
}

// PUT - update product
if ($method === 'PUT') {
    $d  = requestJson();
    requireFields($d, ['product_id', 'product_name', 'category', 'unit_price']);

    $id = (int)($d['product_id'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'Invalid product id'], 400);

    $stmt = $db->prepare(
        "UPDATE products SET product_name=?, category=?, description=?, unit_price=?,
         quantity_in_stock=?, reorder_level=? WHERE product_id=?"
    );
    $description = trim($d['description'] ?? '');
    $qty   = max(0, (int)($d['quantity_in_stock'] ?? 0));
    $rl    = max(0, (int)($d['reorder_level'] ?? 5));
    $price = (float)$d['unit_price'];
    $stmt->bind_param('sssdiii', $d['product_name'], $d['category'], $description,
                       $price, $qty, $rl, $id);
    $stmt->execute();
    jsonResponse(['success' => true]);
}

// DELETE - remove product
if ($method === 'DELETE') {
    $id   = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(['error' => 'Invalid product id'], 400);

    $stmt = $db->prepare("DELETE FROM products WHERE product_id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    jsonResponse(['success' => true]);
}
?>
