<?php
// ============================================================
// CompuStore HMS – M-Pesa STK Callback (php/mpesa_callback.php)
// Safaricom calls this URL after customer pays / cancels.
// Uses pending_payments table for reliable CheckoutRequestID matching.
// ============================================================
require_once __DIR__ . '/../includes/db.php';

$raw     = file_get_contents('php://input');
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
        $amount  = (float)($meta['Amount'] ?? $pending['amount']);
        $phone   = $meta['PhoneNumber'] ?? $pending['phone'];
        $trDate  = (string)($meta['TransactionDate'] ?? date('YmdHis'));

        // 1. Record in detailed payments log
        $payStmt = $db->prepare(
            'INSERT INTO payments (checkout_request_id, mpesa_receipt, amount, phone_number, transaction_date, reference_type, reference_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $payStmt->bind_param('ssdsssi', $checkoutId, $receipt, $amount, $phone, $trDate, $refType, $refId);
        $payStmt->execute();

        // 2. Update order/service main record
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

        // 3. Remove the pending record - it is fulfilled
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
