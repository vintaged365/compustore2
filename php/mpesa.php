<?php
// ============================================================
// CompuStore HMS – M-Pesa Daraja API Integration (php/mpesa.php)
// Implements: STK Push (Lipa Na M-Pesa), Callback, Status Query
//
// SANDBOX CREDENTIALS – replace with live for production
// ============================================================
require_once __DIR__ . '/../includes/db.php';

// ── Daraja Sandbox Config ──────────────────────────────────
define('MPESA_ENV',           'sandbox');   // 'sandbox' or 'production'
define('MPESA_BASE_URL',      'https://sandbox.safaricom.co.ke');
define('MPESA_CONSUMER_KEY',  getenv('MPESA_CONSUMER_KEY')  ?: 'C9A7eeQwVyvmVzWSkbd5sdMTiwWQcG1z5J5DoLOYbaBAvVl0');
define('MPESA_CONSUMER_SECRET', getenv('MPESA_CONSUMER_SECRET') ?: 'uMNrS4rWE3bUqGoE690mD5uiq0XAhr95TsptAKQoOY5CgwMLABNtVIburG4gbeYN');
define('MPESA_SHORTCODE',     174379);   // Sandbox till number
define('MPESA_PASSKEY',       'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919');  // Sandbox passkey
define('MPESA_CALLBACK_URL',  'https://keenly-husked-snowboard.ngrok-free.dev/php/mpesa_callback.php');  // UPDATE THIS

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

match ($action) {
    'stk_push' => handleStkPush(),
    'status'   => checkTransactionStatus(),
    'token'    => jsonResponse(['token' => getAccessToken()]),
    default    => jsonResponse(['error' => 'Unknown action'], 400),
};

// ── Get OAuth Token ─────────────────────────────────────────
function getAccessToken(): string
{
    $credentials = base64_encode(MPESA_CONSUMER_KEY . ':' . MPESA_CONSUMER_SECRET);
    $ch = curl_init(MPESA_BASE_URL . '/oauth/v1/generate?grant_type=client_credentials');
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER    => ["Authorization: Basic $credentials"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    return $data['access_token'] ?? '';
}

// ── STK Push (Lipa Na M-Pesa Online) ───────────────────────
function handleStkPush(): void
{
    $user = requireLogin();
    $data = requestJson();
    requireFields($data, ['phone', 'amount', 'reference_id', 'reference_type']);

    $phone  = formatPhone($data['phone']);
    $amount = (int)ceil((float)$data['amount']);
    $refId  = (int)$data['reference_id'];
    $refType = in_array($data['reference_type'], ['order','service']) ? $data['reference_type'] : 'order';

    if ($amount < 1) jsonResponse(['error' => 'Amount must be at least KES 1'], 400);

    $token    = getAccessToken();
    $timestamp = date('YmdHis');
    $password  = base64_encode(MPESA_SHORTCODE . MPESA_PASSKEY . $timestamp);

    $payload = [
        'BusinessShortCode' => MPESA_SHORTCODE,
        'Password'          => $password,
        'Timestamp'         => $timestamp,
        'TransactionType'   => 'CustomerPayBillOnline',
        'Amount'            => $amount,
        'PartyA'            => $phone,
        'PartyB'            => MPESA_SHORTCODE,
        'PhoneNumber'       => $phone,
        'CallBackURL'       => MPESA_CALLBACK_URL,
        'AccountReference'  => "CompuStore-$refType-$refId",
        'TransactionDesc'   => ucfirst($refType) . " Payment #$refId",
    ];

    $ch = curl_init(MPESA_BASE_URL . '/mpesa/stkpush/v1/processrequest');
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => ["Authorization: Bearer $token", "Content-Type: application/json"],
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode === 200 && isset($result['CheckoutRequestID'])) {
        $checkoutId = $result['CheckoutRequestID'];
        $db         = getDB();

        // Store CheckoutRequestID → reference mapping for reliable callback matching
        $ins = $db->prepare(
            'INSERT INTO pending_payments (checkout_request_id, reference_type, reference_id, amount, phone)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP'
        );
        $ins->bind_param('ssids', $checkoutId, $refType, $refId, $amount, $phone);
        $ins->execute();

        // Mark order/service as payment initiated (payment_status stays pending until callback)
        if ($refType === 'order') {
            $s = $db->prepare('UPDATE orders SET payment_method = "mpesa" WHERE order_id = ?');
            $s->bind_param('i', $refId);
            $s->execute();
        }

        jsonResponse([
            'success'             => true,
            'CheckoutRequestID'   => $checkoutId,
            'message'             => 'STK push sent. Check your phone.',
            'ResponseDescription' => $result['ResponseDescription'] ?? '',
        ]);
    } else {
        jsonResponse(['error' => $result['errorMessage'] ?? $result['ResponseDescription'] ?? 'STK push failed', 'raw' => $result], 400);
    }
}

// ── Transaction Status Query ────────────────────────────────
function checkTransactionStatus(): void
{
    requireLogin();
    $checkoutId = $_GET['checkout_id'] ?? '';
    if (!$checkoutId) jsonResponse(['error' => 'checkout_id required'], 400);

    // First check our DB — if callback already fired, return immediately
    $db = getDB();
    $stmt = $db->prepare(
        'SELECT reference_type, reference_id FROM pending_payments WHERE checkout_request_id = ? LIMIT 1'
    );
    $stmt->bind_param('s', $checkoutId);
    $stmt->execute();
    $pending = $stmt->get_result()->fetch_assoc();

    if (!$pending) {
        // Pending record was deleted by callback = payment confirmed
        jsonResponse(['ResultCode' => 0, 'ResultDesc' => 'Payment confirmed']);
        return;
    }

    // Still pending — query Safaricom for live status
    $token     = getAccessToken();
    $timestamp = date('YmdHis');
    $password  = base64_encode(MPESA_SHORTCODE . MPESA_PASSKEY . $timestamp);

    $payload = [
        'BusinessShortCode' => MPESA_SHORTCODE,
        'Password'          => $password,
        'Timestamp'         => $timestamp,
        'CheckoutRequestID' => $checkoutId,
    ];

    $ch = curl_init(MPESA_BASE_URL . '/mpesa/stkpushquery/v1/query');
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => ["Authorization: Bearer $token", "Content-Type: application/json"],
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $response = curl_exec($ch);
    curl_close($ch);

    jsonResponse(json_decode($response, true) ?: ['error' => 'No response']);
}

// ── Format Phone to 254XXXXXXXXX ───────────────────────────
function formatPhone(string $phone): string
{
    $phone = preg_replace('/\D/', '', $phone);
    if (str_starts_with($phone, '0')) $phone = '254' . substr($phone, 1);
    if (str_starts_with($phone, '+')) $phone = ltrim($phone, '+');
    return $phone;
}
?>