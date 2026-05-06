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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || !isset($body['id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing appointment ID"]);
    exit;
}

$id       = (int)$body['id'];
$staff_id = $user['id'];

function mapStatusToDB($jsStatus) {
    $map = [
        'Approved'    => 'approved',
        'In Progress' => 'in-progress',
        'Completed'   => 'completed',
        'Canceled'    => 'cancelled',
    ];
    return $map[$jsStatus] ?? strtolower($jsStatus);
}

try {
    $database = new Database();
    $pdo = $database->getConnection();

    // Verify appointment belongs to this staff member
    $check = $pdo->prepare("SELECT id FROM appointments WHERE id = :id AND staff_id = :staff_id");
    $check->execute([':id' => $id, ':staff_id' => $staff_id]);
    if (!$check->fetch()) {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden"]);
        exit;
    }

    $fields = [];
    $params = [':id' => $id];

    if (isset($body['status'])) {
        $fields[] = "STATUS = :status";
        $params[':status'] = mapStatusToDB($body['status']);
    }
    if (isset($body['actual_amount'])) {
        $fields[] = "actual_amount = :actual_amount";
        $params[':actual_amount'] = (float)$body['actual_amount'];
    }
    if (isset($body['receipt_no'])) {
        $fields[] = "receipt_no = :receipt_no";
        $params[':receipt_no'] = $body['receipt_no'];
    }
    if (isset($body['cancel_reason'])) {
        $fields[] = "cancel_reason = :cancel_reason";
        $params[':cancel_reason'] = $body['cancel_reason'];
    }
    if (isset($body['date'])) {
        $fields[] = "appointment_date = :appointment_date";
        $params[':appointment_date'] = $body['date'];
    }
    if (isset($body['time'])) {
        $t = DateTime::createFromFormat('g:i A', strtoupper($body['time']));
        if (!$t) $t = DateTime::createFromFormat('H:i', $body['time']);
        $fields[] = "appointment_time = :appointment_time";
        $params[':appointment_time'] = $t ? $t->format('H:i:s') : $body['time'];
        if (!isset($body['status'])) {
            $fields[] = "STATUS = 'rescheduled'";
        }
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(["error" => "No fields to update"]);
        exit;
    }

    $sql  = "UPDATE appointments SET " . implode(", ", $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(["success" => true, "updated" => $stmt->rowCount()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Update failed: " . $e->getMessage()]);
}
