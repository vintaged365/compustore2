<?php
require_once '../includes/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDB();

function getColumnName(mysqli $db, string $table, array $candidates): string {
    foreach ($candidates as $col) {
        $stmt = $db->prepare(
            "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
        );
        $stmt->bind_param('ss', $table, $col);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result && $result->num_rows > 0) {
            return $col;
        }
    }
    return $candidates[0];
}

$orderDateCol = getColumnName($db, 'orders', ['created_at', 'order_date', 'updated_at']);
$orderStatusCol = getColumnName($db, 'orders', ['status', 'order_status']);

// GET orders
if ($method === 'GET') {
    $id     = $_GET['id'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $status = $_GET['status'] ?? '';

    // If requesting a specific user's orders, ensure they have permission
    if ($userId) {
        if (!isset($_SESSION['user_id']) || ($_SESSION['user_id'] != $userId && $_SESSION['role'] === 'customer')) {
            jsonResponse(['error' => 'Unauthorized access'], 403);
        }
        
        $stmt = $db->prepare(
            "SELECT o.*, o.$orderDateCol AS created_at, o.$orderStatusCol AS status FROM orders o WHERE user_id = ? ORDER BY o.$orderDateCol DESC"
        );
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        jsonResponse($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    // If requesting all orders or a specific order detail, require staff/admin
    requireAnyRole(['staff', 'manager', 'technician']);

    if ($id) {
        $stmt = $db->prepare(
            "SELECT o.*, o.$orderStatusCol AS status, u.full_name, u.email FROM orders o
             LEFT JOIN users u ON o.user_id = u.user_id
             WHERE o.order_id = ?"
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $order = $stmt->get_result()->fetch_assoc();

        if (!$order) jsonResponse(['error' => 'Not found'], 404);

        $stmt2 = $db->prepare(
            "SELECT oi.*, p.product_name FROM order_items oi
             JOIN products p ON oi.product_id = p.product_id
             WHERE oi.order_id = ?"
        );
        $stmt2->bind_param('i', $id);
        $stmt2->execute();
        $order['items'] = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
        jsonResponse($order);
    }

    $sql = "SELECT o.*, o.$orderDateCol AS created_at, o.$orderStatusCol AS status, u.full_name, u.email FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id WHERE 1=1";
    $params = [];
    $types = '';

    if ($status) {
        $sql .= " AND o.$orderStatusCol = ?";
        $params[] = $status;
        $types .= 's';
    }

    $sql .= " ORDER BY o.$orderDateCol DESC";
    if ($types) {
        $stmt = $db->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        jsonResponse($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    jsonResponse($db->query($sql)->fetch_all(MYSQLI_ASSOC));
}

// POST - create order
if ($method === 'POST') {
    requireLoginJson();
    $d     = requestJson();
    requireFields($d, ['user_id']);

    // Ensure user can only create orders for themselves
    if ($_SESSION['user_id'] != $d['user_id'] && $_SESSION['role'] === 'customer') {
        jsonResponse(['error' => 'Unauthorized access'], 403);
    }

    $items = $d['items'] ?? [];
    if (!$items) jsonResponse(['error' => 'No items in order'], 400);

    $total  = 0;
    $prices = [];

    try {
        $db->begin_transaction();

        foreach ($items as $item) {
            $productId = (int)($item['product_id'] ?? 0);
            $quantity = max(1, (int)($item['quantity'] ?? 0));

            if ($productId <= 0) {
                throw new RuntimeException('Invalid product in order');
            }

            $stmt = $db->prepare("SELECT unit_price, quantity_in_stock, product_name FROM products WHERE product_id = ? FOR UPDATE");
            $stmt->bind_param('i', $productId);
            $stmt->execute();
            $p = $stmt->get_result()->fetch_assoc();

            if (!$p) {
                throw new RuntimeException("Product $productId not found");
            }

            if ((int)$p['quantity_in_stock'] < $quantity) {
                throw new RuntimeException("Insufficient stock for {$p['product_name']}");
            }

            $prices[$productId] = (float)$p['unit_price'];
            $total += (float)$p['unit_price'] * $quantity;
        }

        $userId    = (int)$d['user_id'];
        $orderType = $d['order_type'] ?? 'online';
        $notes     = $d['notes'] ?? '';

        $stmt = $db->prepare(
            "INSERT INTO orders (user_id, order_type, total_amount, notes) VALUES (?, ?, ?, ?)"
        );
        $stmt->bind_param('isds', $userId, $orderType, $total, $notes);
        $stmt->execute();
        $orderId = $db->insert_id;

        foreach ($items as $item) {
            $productId = (int)$item['product_id'];
            $quantity = max(1, (int)$item['quantity']);
            $price    = $prices[$productId];
            $subtotal = $price * $quantity;
            $stmt = $db->prepare(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?,?,?,?,?)"
            );
            $stmt->bind_param('iiidd', $orderId, $productId, $quantity, $price, $subtotal);
            $stmt->execute();

            $stmt = $db->prepare(
                "UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE product_id = ?"
            );
            $stmt->bind_param('ii', $quantity, $productId);
            $stmt->execute();
        }

        $db->commit();
        jsonResponse(['success' => true, 'order_id' => $orderId, 'total' => $total]);
    } catch (Throwable $e) {
        $db->rollback();
        jsonResponse(['error' => $e->getMessage()], 400);
    }

}

// PUT - update order status
if ($method === 'PUT') {
    requireAnyRole(['staff', 'manager', 'technician']);
    $d    = requestJson();
    requireFields($d, ['order_id', 'status']);

    $id   = (int)($d['order_id'] ?? 0);
    $stat = $d['status'] ?? '';
    if ($id <= 0) jsonResponse(['error' => 'Invalid order id'], 400);

    $stmt = $db->prepare("UPDATE orders SET status = ? WHERE order_id = ?");
    $stmt->bind_param('si', $stat, $id);
    $stmt->execute();
    jsonResponse(['success' => true]);
}
?>