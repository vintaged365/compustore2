<?php
require_once '../includes/db.php';
if (isset($_SESSION['user_id'])) {
    jsonResponse([
        'loggedIn' => true,
        'user' => [
            'id'   => $_SESSION['user_id'],
            'name' => $_SESSION['full_name'],
            'role' => $_SESSION['role'],
        ]
    ]);
} else {
    jsonResponse(['loggedIn' => false]);
}
?>