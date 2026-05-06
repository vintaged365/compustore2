<?php
require_once '../includes/db.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

$db   = getDB();
$type = $_GET['type'] ?? 'dashboard';

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
$serviceDateCol = getColumnName($db, 'service_requests', ['created_at', 'updated_at', 'service_date']);
$serviceStatusCol = getColumnName($db, 'service_requests', ['status', 'service_status']);

if ($type === 'dashboard') {
    $sales = $db->query(
        "SELECT IFNULL(SUM(total_amount),0) AS total FROM orders
         WHERE MONTH($orderDateCol)=MONTH(NOW()) AND YEAR($orderDateCol)=YEAR(NOW()) AND $orderStatusCol='completed'"
    )->fetch_assoc()['total'];

    $products = $db->query("SELECT COUNT(*) AS c FROM products")->fetch_assoc()['c'];
    $lowStock = $db->query("SELECT COUNT(*) AS c FROM products WHERE quantity_in_stock <= reorder_level AND quantity_in_stock > 0")->fetch_assoc()['c'];
    $outStock = $db->query("SELECT COUNT(*) AS c FROM products WHERE quantity_in_stock = 0")->fetch_assoc()['c'];
    $pendSvc  = $db->query("SELECT COUNT(*) AS c FROM service_requests WHERE $serviceStatusCol IN('pending','in_progress')")->fetch_assoc()['c'];
    $customers = $db->query("SELECT COUNT(*) AS c FROM users")->fetch_assoc()['c'];
    $orders   = $db->query("SELECT COUNT(*) AS c FROM orders WHERE MONTH($orderDateCol)=MONTH(NOW())")->fetch_assoc()['c'];

    $recentSvc = $db->query(
        "SELECT sr.*, sr.$serviceDateCol AS created_at, u.full_name
         FROM service_requests sr
         LEFT JOIN users u ON sr.user_id = u.user_id
         ORDER BY sr.$serviceDateCol DESC LIMIT 5"
    )->fetch_all(MYSQLI_ASSOC);

    $recentOrders = $db->query(
        "SELECT o.order_id, o.total_amount, o.$orderStatusCol AS status, o.$orderDateCol AS created_at, u.full_name
         FROM orders o LEFT JOIN users u ON o.user_id = u.user_id
         ORDER BY o.$orderDateCol DESC LIMIT 5"
    )->fetch_all(MYSQLI_ASSOC);

    jsonResponse([
        'totalSales'   => (float)$sales,
        'totalProducts'=> (int)$products,
        'lowStock'     => (int)$lowStock,
        'outOfStock'   => (int)$outStock,
        'pendingServices'=> (int)$pendSvc,
        'totalCustomers' => (int)$customers,
        'monthlyOrders'  => (int)$orders,
        'recentServices' => $recentSvc,
        'recentOrders'   => $recentOrders,
    ]);
}

if ($type === 'revenue') {
    $rows = $db->query(
        "SELECT DATE_FORMAT($orderDateCol, '%b') AS month,
                MONTH($orderDateCol) AS m,
                IFNULL(SUM(total_amount),0) AS revenue,
                COUNT(*) AS orders
         FROM orders
         WHERE $orderDateCol >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND $orderStatusCol='completed'
         GROUP BY YEAR($orderDateCol), MONTH($orderDateCol)
         ORDER BY YEAR($orderDateCol), MONTH($orderDateCol)"
    )->fetch_all(MYSQLI_ASSOC);
    jsonResponse($rows);
}

if ($type === 'low_stock') {
    $rows = $db->query(
        "SELECT product_name, sku, category, quantity_in_stock, reorder_level
         FROM products WHERE quantity_in_stock <= reorder_level ORDER BY quantity_in_stock ASC LIMIT 20"
    )->fetch_all(MYSQLI_ASSOC);
    jsonResponse($rows);
}

if ($type === 'staff') {
    $rows = $db->query("SELECT staff_id, full_name, role, email, phone FROM staff ORDER BY full_name")->fetch_all(MYSQLI_ASSOC);
    jsonResponse($rows);
}

if ($type === 'categories') {
    $rows = $db->query("SELECT DISTINCT category FROM products ORDER BY category")->fetch_all(MYSQLI_ASSOC);
    jsonResponse(array_column($rows, 'category'));
}

if ($type === 'customers') {
    $rows = $db->query(
        "SELECT user_id, full_name, email, phone, address, created_at FROM users ORDER BY full_name"
    )->fetch_all(MYSQLI_ASSOC);
    jsonResponse($rows);
}

jsonResponse(['error' => 'Unknown report type'], 400);
?>
