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

$serviceDateCol = getColumnName($db, 'service_requests', ['created_at', 'updated_at', 'service_date']);
$serviceStatusCol = getColumnName($db, 'service_requests', ['status', 'service_status']);

function genRef($db) {
    do {
        $ref = 'SRV-' . strtoupper(bin2hex(random_bytes(3)));
        $stmt = $db->prepare("SELECT service_id FROM service_requests WHERE service_ref = ?");
        $stmt->bind_param('s', $ref);
        $stmt->execute();
        $r = $stmt->get_result();
    } while ($r->num_rows > 0);
    return $ref;
}

// GET
if ($method === 'GET') {
    $id     = $_GET['id'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $status = $_GET['status'] ?? '';
    $assigned = $_GET['assigned_to'] ?? '';

    if ($id) {
        $stmt = $db->prepare(
            "SELECT sr.*, sr.$serviceDateCol AS created_at, u.full_name AS customer_name, u.phone AS customer_phone,
             s.full_name AS technician_name
             FROM service_requests sr
             LEFT JOIN users u ON sr.user_id = u.user_id
             LEFT JOIN staff s ON sr.assigned_to = s.staff_id
             WHERE sr.service_id = ?"
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!$row) jsonResponse(['error' => 'Not found'], 404);

        $stmt2 = $db->prepare(
            "SELECT sh.*, s.full_name AS by_name FROM service_history sh
             LEFT JOIN staff s ON sh.updated_by_id = s.staff_id
             WHERE sh.service_id = ? ORDER BY sh.created_at DESC"
        );
        $stmt2->bind_param('i', $id);
        $stmt2->execute();
        $row['history'] = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
        jsonResponse($row);
    }

    if ($userId) {
        $stmt = $db->prepare(
            "SELECT sr.*, sr.$serviceDateCol AS created_at FROM service_requests sr WHERE user_id = ? ORDER BY sr.$serviceDateCol DESC"
        );
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        jsonResponse($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    $sql = "SELECT sr.*, u.full_name AS customer_name, s.full_name AS technician_name
            FROM service_requests sr
            LEFT JOIN users u ON sr.user_id = u.user_id
            LEFT JOIN staff s ON sr.assigned_to = s.staff_id
            WHERE 1=1";
    $params = [];
    $types = '';

    if ($status) {
        $sql .= " AND sr.$serviceStatusCol = ?";
        $params[] = $status;
        $types .= 's';
    }
    if ($assigned) {
        $sql .= " AND sr.assigned_to = ?";
        $params[] = (int)$assigned;
        $types .= 'i';
    }

    $sql .= " ORDER BY sr.$serviceDateCol DESC";

    if ($types) {
        $stmt = $db->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        jsonResponse($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    jsonResponse($db->query($sql)->fetch_all(MYSQLI_ASSOC));
}

// POST - new service request
if ($method === 'POST') {
    $d = requestJson();
    $action = $d['action'] ?? 'create';

    if ($action === 'note') {
        requireFields($d, ['service_id', 'note']);

        $serviceId = (int)$d['service_id'];
        $byId = (int)($d['by_id'] ?? 0);
        $stmt = $db->prepare(
            "INSERT INTO service_history (service_id, action, notes, updated_by_id)
             VALUES (?, 'note', ?, ?)"
        );
        $stmt->bind_param('isi', $serviceId, $d['note'], $byId);
        $stmt->execute();
        return jsonResponse(['success' => true]);
    }

    requireFields($d, ['user_id', 'device_type', 'issue_description']);

    $ref      = genRef($db);
    $priority = $d['priority'] ?? 'medium';
    $estCost  = isset($d['estimated_cost']) ? (float)$d['estimated_cost'] : null;
    $userId   = (int)$d['user_id'];
    $brand    = trim($d['device_brand'] ?? '');

    $stmt = $db->prepare(
        "INSERT INTO service_requests (service_ref, user_id, device_type, device_brand, issue_description, priority, estimated_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param('sissssd', $ref, $userId, $d['device_type'], $brand,
                       $d['issue_description'], $priority, $estCost);
    $stmt->execute();
    $sid = $db->insert_id;

    // Log creation
    $stmt = $db->prepare("INSERT INTO service_history (service_id, action, notes) VALUES (?, 'created', 'Request submitted by customer')");
    $stmt->bind_param('i', $sid);
    $stmt->execute();
    jsonResponse(['success' => true, 'service_id' => $sid, 'service_ref' => $ref]);
}

// PUT - update status, assign, complete
if ($method === 'PUT') {
    $d      = requestJson();
    $sid    = (int)($d['service_id'] ?? 0);
    $action = $d['action'] ?? 'status';
    if ($sid <= 0) jsonResponse(['error' => 'Invalid service id'], 400);

    if ($action === 'status') {
        requireFields($d, ['status']);
        $stat = $d['status'];
        $stmt = $db->prepare("UPDATE service_requests SET $serviceStatusCol = ?, updated_at = NOW() WHERE service_id = ?");
        $stmt->bind_param('si', $stat, $sid);
        $stmt->execute();

        $notes = $d['notes'] ?? "Status changed to $stat";
        $byId  = (int)($d['by_id'] ?? 0);
        $stmt  = $db->prepare(
            "INSERT INTO service_history (service_id, action, notes, updated_by_id)
             VALUES (?, ?, ?, ?)"
        );
        $act = "status_$stat";
        $stmt->bind_param('issi', $sid, $act, $notes, $byId);
        $stmt->execute();
    }

    if ($action === 'assign') {
        requireFields($d, ['assigned_to']);
        $tech = (int)$d['assigned_to'];
        $stmt = $db->prepare("UPDATE service_requests SET assigned_to = ?, $serviceStatusCol = 'in_progress', updated_at = NOW() WHERE service_id = ?");
        $stmt->bind_param('ii', $tech, $sid);
        $stmt->execute();

        $byId = (int)($d['by_id'] ?? 0);
        $stmt = $db->prepare(
            "INSERT INTO service_history (service_id, action, notes, updated_by_id) VALUES (?, 'assigned', ?, ?)"
        );
        $rStmt = $db->prepare("SELECT full_name FROM staff WHERE staff_id = ?");
        $rStmt->bind_param('i', $tech);
        $rStmt->execute();
        $r = $rStmt->get_result();
        $tName = $r->fetch_assoc()['full_name'] ?? 'technician';
        $note  = "Assigned to $tName";
        $stmt->bind_param('isi', $sid, $note, $byId);
        $stmt->execute();
    }

    if ($action === 'complete') {
        $finalCost = (float)($d['final_cost'] ?? 0);
        $stmt = $db->prepare("UPDATE service_requests SET $serviceStatusCol = 'completed', final_cost = ?, updated_at = NOW() WHERE service_id = ?");
        $stmt->bind_param('di', $finalCost, $sid);
        $stmt->execute();

        $byId = (int)($d['by_id'] ?? 0);
        $stmt = $db->prepare(
            "INSERT INTO service_history (service_id, action, notes, updated_by_id) VALUES (?, 'completed', ?, ?)"
        );
        $note = $d['notes'] ?? 'Service completed';
        $stmt->bind_param('isi', $sid, $note, $byId);
        $stmt->execute();
    }

    jsonResponse(['success' => true]);
}
?>
