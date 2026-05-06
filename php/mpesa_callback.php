<?php
// ============================================================
// CompuStore HMS – M-Pesa STK Callback (php/mpesa_callback.php)
// Safaricom calls this URL after customer pays / cancels.
// Uses pending_payments table for reliable CheckoutRequestID matching.
// ============================================================
require_once __DIR__ . '/../includes/db.php';

// Log raw callback for debugging
$raw     = file_get_contents('php://input');
$logDir  = __DIR__ . '/../logs';
if (!is_dir($logDir)) @mkdir($logDir, 0775, true);
@file_put_contents($logDir . '/mpesa_callbacks.log', date('[Y-m-d H:i:s] ') . $raw . "\n", FILE_APPEND);

$data = json_decode($raw, true);
if (!$data) {
    http_response_code(200);
    echo json_encode(['ResultCode' => 0]);
    exit;
}

$body       = $data['Body']['stkCallback'] ?? [];
$resultCode = (int)($body['ResultCode'] ?? 1);
$checkoutId = $body['CheckoutRequestID'] ?? '';

$db = getDB();

if ($resultCode === 0 && $checkoutId) {
    // ── Payment successful ─────────────────────────────────
    $items = $body['CallbackMetadata']['Item'] ?? [];
    $meta  = [];
    foreach ($items as $item) {
        $meta[$item['Name']] = $item['Value'] ?? null;
    }

    $receipt = $meta['MpesaReceiptNumber'] ?? '';

    // Look up the pending payment record by CheckoutRequestID
    $stmt = $db->prepare(
        'SELECT reference_type, reference_id FROM pending_payments WHERE checkout_request_id = ? LIMIT 1'
    );
    $stmt->bind_param('s', $checkoutId);
    $stmt->execute();
    $pending = $stmt->get_result()->fetch_assoc();

    if ($pending) {
        $refType = $pending['reference_type'];
        $refId   = (int)$pending['reference_id'];

        if ($refType === 'order') {
            $us = $db->prepare(
                'UPDATE orders
                 SET payment_status = "paid",
                     payment_method = "mpesa",
                     mpesa_receipt  = ?,
                     status         = "processing"
                 WHERE order_id = ?'
            );
            $us->bind_param('si', $receipt, $refId);
            $us->execute();
        } else {
            $us = $db->prepare(
                'UPDATE service_requests
                 SET payment_status = "paid",
                     mpesa_receipt  = ?
                 WHERE service_id = ?'
            );
            $us->bind_param('si', $receipt, $refId);
            $us->execute();
        }

        // Remove the pending record - it is fulfilled
        $del = $db->prepare('DELETE FROM pending_payments WHERE checkout_request_id = ?');
        $del->bind_param('s', $checkoutId);
        $del->execute();
    }
} elseif ($resultCode !== 0 && $checkoutId) {
    // ── Payment failed / cancelled - clean up pending record ──
    $del = $db->prepare('DELETE FROM pending_payments WHERE checkout_request_id = ?');
    $del->bind_param('s', $checkoutId);
    $del->execute();
}

// Always return 200 to Safaricom
http_response_code(200);
echo json_encode(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
?>
