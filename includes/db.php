<?php
// ============================================================
// CompuStore HMS - Shared backend bootstrap
// ============================================================

// Simple .env loader
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        
        list($name, $value) = explode('=', $line, 2);
        $name  = trim($name);
        $value = trim($value);
        
        // Remove quotes if present
        if (preg_match('/^["\'](.*)["\']$/', $value, $matches)) {
            $value = $matches[1];
        }
        
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: 3306);
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_NAME', getenv('DB_NAME') ?: 'compustore_hms');

if (!extension_loaded('mysqli')) {
    jsonResponse([
        'error' => 'MySQLi extension is not enabled. Please enable mysqli in php.ini or install/enable the mysqli extension.'
    ], 500);
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (function_exists('mysqli_report')) {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
}

set_exception_handler(function (Throwable $e): void {
    jsonResponse(['error' => 'Server error: ' . $e->getMessage()], 500);
});

function getDB()
{
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
        $conn->set_charset('utf8mb4');
        return $conn;
    } catch (Throwable $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function jsonResponse(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function requestJson(): array
{
    $payload = json_decode(file_get_contents('php://input'), true);

    if (!is_array($payload)) {
        jsonResponse(['error' => 'Invalid JSON request'], 400);
    }

    return $payload;
}

function requireMethod(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
}

function requireFields(array $data, array $fields): void
{
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
            jsonResponse(['error' => "$field is required"], 400);
        }
    }
}

function requireLogin(?string $role = null): void
{
    if (!isset($_SESSION['user_id'])) {
        header('Location: ../index.html');
        exit;
    }

    if ($role && ($_SESSION['role'] ?? '') !== $role && ($_SESSION['role'] ?? '') !== 'admin') {
        header('Location: ../index.html');
        exit;
    }
}

function requireLoginJson(?string $role = null): void
{
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }

    if ($role && ($_SESSION['role'] ?? '') !== $role && ($_SESSION['role'] ?? '') !== 'admin') {
        jsonResponse(['error' => 'Unauthorized access'], 403);
    }
}

function requireAnyRole(array $roles): void
{
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }

    if (!in_array($_SESSION['role'] ?? '', $roles) && ($_SESSION['role'] ?? '') !== 'admin') {
        jsonResponse(['error' => 'Unauthorized access'], 403);
    }
}
?>
