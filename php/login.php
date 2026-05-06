<?php
require_once '../includes/db.php';

requireMethod('POST');

$data  = requestJson();
$email = trim($data['email'] ?? '');
$pass  = trim($data['password'] ?? '');
$role  = trim($data['role'] ?? 'customer');

if (!$email || !$pass) {
    jsonResponse(['error' => 'Email and password are required'], 400);
}

$db = getDB();

// Choose table based on role
if ($role === 'customer') {
    $sql = "SELECT user_id AS id, full_name, email, password_hash FROM users WHERE email = ?";
    $table_name = 'users';
} elseif ($role === 'staff' || $role === 'technician') {
    $sql = "SELECT staff_id AS id, full_name, email, password_hash, role FROM staff WHERE email = ?";
    $table_name = 'staff';
} else {
    $role = 'admin';
    $sql = "SELECT admin_id AS id, full_name, email, password_hash FROM admins WHERE email = ?";
    $table_name = 'admins';
}

$stmt = $db->prepare($sql);
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$user   = $result->fetch_assoc();


if (!$user) {
    jsonResponse(['error' => 'Invalid email or password'], 401);
}

if (!password_verify($pass, $user['password_hash'])) {
    jsonResponse(['error' => 'Invalid email or password'], 401);
}

// Save session
$_SESSION['user_id']   = $user['id'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['email']     = $user['email'];
$_SESSION['role']      = isset($user['role']) ? $user['role'] : $role;

// Redirect target
$redirect = match($_SESSION['role']) {
    'admin'      => 'staff/dashboard.html',
    'staff'      => 'staff/dashboard.html',
    'manager'    => 'staff/dashboard.html',
    'technician' => 'staff/dashboard.html',
    default      => 'customer/dashboard.html',
};

jsonResponse([
    'success'  => true,
    'redirect' => $redirect,
    'user'     => [
        'id'   => $user['id'],
        'name' => $user['full_name'],
        'role' => $_SESSION['role'],
    ]
]);
?>
