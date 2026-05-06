<?php
require_once '../includes/db.php';

// Ensure only POST requests are allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Set JSON response header
header('Content-Type: application/json');

// Get raw input and decode JSON
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Extract and sanitize input
$name     = trim($data['fullName'] ?? '');
$email    = trim($data['email'] ?? '');
$pass     = trim($data['password'] ?? '');
$phone    = trim($data['phone'] ?? '');
$address  = trim($data['address'] ?? '');

// Validate required fields
if (!$name || !$email || !$pass) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Full name, email, and password are required'
    ]);
    exit;
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}

// Validate password length
if (strlen($pass) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters']);
    exit;
}

try {
    $db = getDB();
    
    // Check for duplicate email
    $stmt = $db->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already registered']);
        exit;
    }
    
    // Hash password
    $hash = password_hash($pass, PASSWORD_BCRYPT);
    
    // Set default role as 'customer' for new registrations
    $role = 'customer';
    
    // Insert new user
    $stmt = $db->prepare("INSERT INTO users (full_name, email, phone, password_hash, address, role) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('ssssss', $name, $email, $phone, $hash, $address, $role);
    
    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode([
            'success' => true, 
            'message' => 'Account created successfully! You can now log in.'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed. Please try again.']);
    }
    
    $stmt->close();
    $db->close();
    
} catch (Exception $e) {
    error_log("Registration error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred during registration']);
}
?>