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
        'actual_amount'  => 'actual_amount',
        'staff_id'       => 'staff_id',
        // NOTE: staff_name is NOT a column in appointments — it is derived via JOIN on staff table.
        // To assign staff, update staff_id only.
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

        // ── Send email if status changed ────────────────────────────────────
        $newStatus = isset($data['status']) ? strtolower(trim($data['status'])) : null;
        $emailStatuses = ['confirmed', 'in-progress', 'in_progress', 'completed', 'cancelled'];

        if ($newStatus && in_array($newStatus, $emailStatuses) && class_exists('MailerHelper')) {
            // Fetch the full appointment row for email data
            $detailQuery = "SELECT a.id, a.client_name, a.client_email, a.service_type,
                                   a.appointment_date, a.appointment_time, a.price_estimate,
                                   p.name as property_name, p.address as property_address,
                                   s.name as staff_name
                            FROM appointments a
                            LEFT JOIN properties p ON a.property_id = p.id
                            LEFT JOIN staff s ON a.staff_id = s.id
                            WHERE a.id = :id";
            $detailStmt = $db->prepare($detailQuery);
            $detailStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $detailStmt->execute();
            $appt = $detailStmt->fetch(PDO::FETCH_ASSOC);

            if ($appt && !empty($appt['client_email'])) {
                $priceLabel = $appt['price_estimate']
                    ? '&#8369;' . number_format((float)$appt['price_estimate'], 2)
                    : 'To be confirmed';

                $emailData = [
                    'appointment_id'   => $appt['id'],
                    'service_type'     => $appt['service_type'],
                    'property_name'    => $appt['property_name'] ?? 'N/A',
                    'appointment_date' => $appt['appointment_date'],
                    'appointment_time' => $appt['appointment_time']
                        ? date('h:i A', strtotime($appt['appointment_time']))
                        : 'TBD',
                    'staff_name'       => $appt['staff_name'] ?? '',
                    'price_estimate'   => $priceLabel,
                ];

                MailerHelper::sendAppointmentStatusUpdate(
                    $appt['client_email'],
                    $appt['client_name'],
                    $emailData,
                    '',          // oldStatus (not tracked here)
                    $newStatus
                );
            }
        }
        // ───────────────────────────────────────────────────────────────────

        // ── Auto-update equipment renewal when appointment is completed ─────
        if ($newStatus === 'completed') {
            // Find equipment linked to this appointment (matched by property + service type)
            $eqQuery = "SELECT e.id, s.renewal_value, s.renewal_unit
                        FROM equipment e
                        JOIN appointments a ON a.property_id = e.property_id
                        JOIN services     s ON s.NAME = a.service_type
                        WHERE a.id = :appt_id
                          AND e.service_type = a.service_type
                          AND s.renewable = 1
                        LIMIT 1";
            $eqStmt = $db->prepare($eqQuery);
            $eqStmt->bindParam(':appt_id', $id, PDO::PARAM_INT);
            $eqStmt->execute();
            $eq = $eqStmt->fetch(PDO::FETCH_ASSOC);

            if ($eq) {
                $today       = new DateTime();
                $renewalValue = (int)($eq['renewal_value'] ?? 12);
                $renewalUnit  = $eq['renewal_unit'] ?? 'months';

                $nextRenewal = clone $today;
                if ($renewalUnit === 'years') {
                    $nextRenewal->modify("+{$renewalValue} year");
                } else {
                    $nextRenewal->modify("+{$renewalValue} month");
                }

                $updateEqStmt = $db->prepare(
                    "UPDATE equipment
                     SET last_serviced = :today, next_renewal = :next
                     WHERE id = :eq_id"
                );
                $todayStr   = $today->format('Y-m-d');
                $nextStr    = $nextRenewal->format('Y-m-d');
                $updateEqStmt->bindParam(':today',  $todayStr);
                $updateEqStmt->bindParam(':next',   $nextStr);
                $updateEqStmt->bindParam(':eq_id',  $eq['id'], PDO::PARAM_INT);
                $updateEqStmt->execute();
            }
        }
        // ───────────────────────────────────────────────────────────────────

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
