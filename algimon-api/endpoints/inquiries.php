<?php

function formatInquiry($row) {
    return [
        '_id'           => (string)$row['id'],
        'clientName'    => $row['client_name'],
        'company'       => $row['property_name'] ?? '',
        'clientEmail'   => $row['client_email'],
        'phone'         => $row['client_phone'] ?? '',
        'address'       => $row['property_address'] ?? '',
        'propertyType'  => $row['property_type'] ?? '',
        'serviceType'   => $row['service_type'],
        'requestedDate' => $row['appointment_date'],
        'requestedTime' => $row['appointment_time'] ? date('h:i A', strtotime($row['appointment_time'])) : '',
        'message'       => $row['notes'] ?? '',
        'status'        => strtolower($row['STATUS'] ?? ''),
        'cancel_reason' => $row['cancel_reason'] ?? '',
        'price_estimate'=> $row['price_estimate'] ?? '',
        'staff_id'      => $row['staff_id'] ? (int)$row['staff_id'] : null,
        'staff_name'    => $row['staff_name'] ?? '',
        'createdAt'     => $row['created_at'],
        'updatedAt'     => $row['updated_at'],
    ];
}

$appointmentsQuery = "SELECT a.id, a.client_id, a.client_name, a.client_email, a.client_phone,
        a.service_type, a.appointment_date, a.appointment_time, a.STATUS,
        a.price_estimate, a.actual_amount, a.cancel_reason, a.notes,
        a.staff_id, a.created_at, a.updated_at,
        p.name as property_name, p.address as property_address, p.property_type,
        s.name as staff_name
    FROM appointments a
    LEFT JOIN properties p ON a.property_id = p.id
    LEFT JOIN staff s ON a.staff_id = s.id";

// GET /inquiries - Get all appointments (admin only)
function getInquiries() {
    global $appointmentsQuery;
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->query($appointmentsQuery . " ORDER BY a.created_at DESC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ResponseHelper::success(array_map('formatInquiry', $rows));
}

// GET /inquiries/:id - Get single appointment (admin only)
function getInquiry($id) {
    global $appointmentsQuery;
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare($appointmentsQuery . " WHERE a.id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        ResponseHelper::error("Inquiry not found", 404);
        return;
    }

    ResponseHelper::success(formatInquiry($row));
}

// PUT /inquiries/:id - Update appointment status/details (admin only)
function updateInquiry($id) {
    AuthMiddleware::requireAdmin();

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) {
        ResponseHelper::error("Invalid request body", 400);
        return;
    }

    $fieldMap = [
        'clientName'    => 'client_name',
        'clientEmail'   => 'client_email',
        'phone'         => 'client_phone',
        'serviceType'   => 'service_type',
        'requestedDate' => 'appointment_date',
        'requestedTime' => 'appointment_time',
        'message'        => 'notes',
        'status'         => 'STATUS',
        'cancel_reason'  => 'cancel_reason',
        'price_estimate' => 'price_estimate',
        'staff_id'       => 'staff_id',
        'staff_name'     => 'staff_name',
    ];

    $sets = [];
    $params = [':id' => $id];

    foreach ($fieldMap as $jsKey => $dbCol) {
        if (array_key_exists($jsKey, $data)) {
            $sets[] = "$dbCol = :$dbCol";
            $params[":$dbCol"] = $data[$jsKey];
        }
    }

    if (empty($sets)) {
        ResponseHelper::error("No valid fields to update", 400);
        return;
    }

    $database = new Database();
    $db = $database->getConnection();

    $sql = "UPDATE appointments SET " . implode(', ', $sets) . " WHERE id = :id";
    $stmt = $db->prepare($sql);

    if ($stmt->execute($params)) {
        ResponseHelper::success(null, "Inquiry updated successfully");
    } else {
        ResponseHelper::error("Failed to update inquiry", 500);
    }
}

// DELETE /inquiries/:id - Delete appointment (admin only)
function deleteInquiry($id) {
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare("DELETE FROM appointments WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);

    if ($stmt->execute() && $stmt->rowCount() > 0) {
        ResponseHelper::success(null, "Inquiry deleted successfully");
    } else {
        ResponseHelper::error("Inquiry not found", 404);
    }
}
