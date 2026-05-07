<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/response.php';

header("Content-Type: application/json");

$user = AuthHelper::getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

if ($user['type'] === 'client') {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden"]);
    exit;
}

$staff_id = $user['id'];

function mapStatus($dbStatus) {
    $map = [
        'pending'     => 'Pending',
        'confirmed'   => 'Approved',
        'approved'    => 'Approved',
        'in-progress' => 'In Progress',
        'completed'   => 'Completed',
        'cancelled'   => 'Canceled',
        'rescheduled' => 'Approved',
    ];
    return $map[$dbStatus] ?? ucfirst($dbStatus);
}

function formatTime($timeStr) {
    if (!$timeStr) return '';
    $t = DateTime::createFromFormat('H:i:s', $timeStr);
    if (!$t) $t = DateTime::createFromFormat('H:i', $timeStr);
    return $t ? $t->format('g:i A') : $timeStr;
}

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $stmt = $pdo->prepare("
        SELECT 
            a.id,
            a.client_name        AS name,
            a.client_email       AS email,
            a.client_phone       AS phone,
            a.service_type       AS service,
            a.appointment_date   AS date,
            a.appointment_time   AS time,
            a.STATUS             AS status,
            a.price_estimate,
            a.actual_amount,
            a.receipt_no,
            a.cancel_reason,
            a.notes,
            p.name               AS property_name,
            p.address            AS address,
            p.property_type      AS category
        FROM appointments a
        LEFT JOIN properties p ON a.property_id = p.id
        WHERE a.staff_id = :staff_id
        ORDER BY a.appointment_date ASC, a.appointment_time ASC
    ");
    $stmt->execute([':staff_id' => $staff_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = array_map(function($row) {
        return [
            'id'             => (int)$row['id'],
            'name'           => $row['name'] ?? 'Unknown',
            'email'          => $row['email'] ?? '',
            'phone'          => $row['phone'] ?? '',
            'service'        => $row['service'] ?? '',
            'date'           => $row['date'] ?? '',
            'time'           => formatTime($row['time']),
            'status'         => mapStatus($row['status']),
            'price_estimate' => $row['price_estimate'] ? '₱' . number_format($row['price_estimate'], 2) : null,
            'actual_amount'  => $row['actual_amount'] ?? null,
            'receipt_no'     => $row['receipt_no'] ?? null,
            'cancel_reason'  => $row['cancel_reason'] ?? null,
            'address'        => $row['address'] ?? '',
            'category'       => $row['category'] ?? 'Residential',
            'property_name'  => $row['property_name'] ?? '',
        ];
    }, $rows);

    echo json_encode($result);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Query failed: " . $e->getMessage()]);
}
