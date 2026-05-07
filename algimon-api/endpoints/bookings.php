<?php
/**
 * Bookings API - Appointment scheduling
 */

// GET /bookings - Get all client appointments
function getClientBookings() {
    $user = AuthMiddleware::requireClient();
    
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "SELECT a.id, a.client_id, a.staff_id, a.property_id,
          a.service_type, a.appointment_date, a.appointment_time,
          a.STATUS as status,
          a.price_estimate, a.actual_amount, a.cancel_reason,
          a.notes, a.client_name, a.client_email, a.client_phone,
          a.updated_at,
          p.name as property_name, s.name as staff_name
          FROM appointments a
          LEFT JOIN properties p ON a.property_id = p.id
          LEFT JOIN staff s ON a.staff_id = s.id
          WHERE a.client_id = :user_id
          ORDER BY a.appointment_date DESC";
          
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->execute();
    
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format for frontend
    foreach ($bookings as &$b) {
        $b['serviceName'] = $b['service_type'];
        $b['property'] = $b['property_name'];
        $b['date'] = $b['appointment_date'];
        $b['time'] = date('h:i A', strtotime($b['appointment_time']));
        $b['status'] = strtoupper($b['status']);
    }
    
    ResponseHelper::success($bookings);
}

// POST /bookings - Create new booking
function createBooking() {
    $user = AuthMiddleware::requireClient();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required = ['serviceType', 'requestedDate', 'requestedTime', 'property_id'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            ResponseHelper::error("$field is required", 400);
            return;
        }
    }
    
    // Validate date (at least 3 days from now)
    // Normalize both to midnight so time-of-day doesn't affect the diff
    $today = new DateTime();
    $today->setTime(0, 0, 0);
    $requestedDate = new DateTime($data['requestedDate']);
    $requestedDate->setTime(0, 0, 0);
    $diff = (int)$today->diff($requestedDate)->days;

    if ($requestedDate <= $today) {
        ResponseHelper::error("Cannot book appointments in the past", 400);
        return;
    }

    if ($diff < 3) {
        ResponseHelper::error("Appointments must be booked at least 3 days in advance", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Verify property ownership
    $check = "SELECT id, name, address FROM properties WHERE id = :id AND user_id = :user_id";
    $checkStmt = $db->prepare($check);
    $checkStmt->bindParam(':id', $data['property_id']);
    $checkStmt->bindParam(':user_id', $user['id']);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() == 0) {
        ResponseHelper::error("Property not found", 404);
        return;
    }
    
    $property = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    // Convert time to 24-hour format
    $time24 = date('H:i:s', strtotime($data['requestedTime']));
    
    // Insert query - FIXED: removed duplicate/syntax errors
    $query = "INSERT INTO appointments (client_id, client_name, client_email, client_phone,
          property_id, service_type, appointment_date, appointment_time, STATUS, notes) 
          VALUES (:client_id, :client_name, :client_email, :client_phone,
          :property_id, :service_type, :appointment_date, :appointment_time, 'pending', :notes)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':client_id', $user['id']);
    $stmt->bindParam(':client_name', $user['name']);
    $stmt->bindParam(':client_email', $user['email']);
    $client_phone = $user['phone'] ?? '';
    $stmt->bindParam(':client_phone', $client_phone);
    $stmt->bindParam(':property_id', $data['property_id']);
    $stmt->bindParam(':service_type', $data['serviceType']);
    $stmt->bindParam(':appointment_date', $data['requestedDate']);
    $stmt->bindParam(':appointment_time', $time24);
    $notes = $data['notes'] ?? '';
    $stmt->bindParam(':notes', $notes);
    
    if ($stmt->execute()) {
        $id = $db->lastInsertId();

        // Send confirmation email
        if (class_exists('MailerHelper')) {
            MailerHelper::sendAppointmentConfirmation(
                $user['email'],
                $user['name'],
                [
                    'appointment_id'   => $id,
                    'service_type'     => $data['serviceType'],
                    'property_name'    => $property['name'],
                    'appointment_date' => $data['requestedDate'],
                    'appointment_time' => date('h:i A', strtotime($data['requestedTime'])),
                    'submitted_date'   => date('F j, Y'),
                ]
            );
        }

        ResponseHelper::success(['id' => $id], "Booking created successfully", 201);
    } else {
        ResponseHelper::error("Failed to create booking", 500);
    }
}

// PUT /bookings/:id/cancel - Cancel booking
function cancelBooking($id) {
    $user = AuthMiddleware::requireClient();
    $data = json_decode(file_get_contents('php://input'), true);
    // Get booking details for email
    $database = new Database();
    $db = $database->getConnection();
    $getQuery = "SELECT a.appointment_date, a.appointment_time, a.service_type,
                        p.name as property_name
                 FROM appointments a
                 LEFT JOIN properties p ON a.property_id = p.id
                 WHERE a.id = :id AND a.client_id = :user_id";
    $getStmt = $db->prepare($getQuery);
    $getStmt->bindParam(':id', $id);
    $getStmt->bindParam(':user_id', $user['id']);
    $getStmt->execute();
    $booking = $getStmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        ResponseHelper::error("Booking not found", 404);
        return;
    }

    // Check if cancellation is allowed (not within 3 days)
    $today   = new DateTime(); $today->setTime(0, 0, 0);
    $aptDate = new DateTime($booking['appointment_date']); $aptDate->setTime(0, 0, 0);
    $diff    = (int)$today->diff($aptDate)->days;

    if ($aptDate > $today && $diff < 3) {
        ResponseHelper::error("Cannot cancel appointments within 3 days. Please call our office.", 400);
        return;
    }

    $reason = $data['reason'] ?? 'Cancelled by client';

    $query = "UPDATE appointments SET status = 'cancelled', cancel_reason = :reason
              WHERE id = :id AND client_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->bindParam(':reason', $reason);

    if ($stmt->execute()) {
        // Send cancellation email
        if (class_exists('MailerHelper')) {
            MailerHelper::sendAppointmentCancellation(
                $user['email'],
                $user['name'],
                [
                    'appointment_id'   => $id,
                    'service_type'     => $booking['service_type'],
                    'property_name'    => $booking['property_name'] ?? '',
                    'appointment_date' => $booking['appointment_date'],
                    'appointment_time' => date('h:i A', strtotime($booking['appointment_time'])),
                    'cancel_reason'    => $reason,
                    'cancelled_date'   => date('F j, Y'),
                ]
            );
        }
        ResponseHelper::success(null, "Booking cancelled successfully");
    } else {
        ResponseHelper::error("Failed to cancel booking", 500);
    }
}
function rescheduleBooking($id) {
    $user = AuthMiddleware::requireClient();
    $data = json_decode(file_get_contents('php://input'), true);

    $newDate = $data['newDate'] ?? null;
    $newTime = $data['newTime'] ?? null;
    if (!$newDate || !$newTime) {
        ResponseHelper::error("New date and time are required", 400);
        return;
    }

    // Enforce 3-day rule — normalize to midnight so time-of-day is irrelevant
    $today = new DateTime(); $today->setTime(0, 0, 0);
    $requested = new DateTime($newDate); $requested->setTime(0, 0, 0);
    $diff = (int)$today->diff($requested)->days;
    if ($requested <= $today) {
        ResponseHelper::error("Cannot reschedule to a past date", 400);
        return;
    }
    if ($diff < 3) {
        ResponseHelper::error("Must reschedule at least 3 days in advance", 400);
        return;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Fetch old booking details for the email
    $oldQuery = "SELECT a.appointment_date, a.appointment_time, a.service_type,
                        p.name as property_name
                 FROM appointments a
                 LEFT JOIN properties p ON a.property_id = p.id
                 WHERE a.id = :id AND a.client_id = :user_id";
    $oldStmt = $db->prepare($oldQuery);
    $oldStmt->bindParam(':id', $id);
    $oldStmt->bindParam(':user_id', $user['id']);
    $oldStmt->execute();
    $oldBooking = $oldStmt->fetch(PDO::FETCH_ASSOC);

    $time24 = date('H:i:s', strtotime($newTime));

    $query = "UPDATE appointments SET appointment_date = :date, appointment_time = :time, status = 'rescheduled'
              WHERE id = :id AND client_id = :user_id AND status NOT IN ('completed', 'cancelled')";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':date', $newDate);
    $stmt->bindParam(':time', $time24);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user['id']);

    if ($stmt->execute() && $stmt->rowCount() > 0) {
        // Send reschedule email
        if (class_exists('MailerHelper') && $oldBooking) {
            MailerHelper::sendAppointmentRescheduled(
                $user['email'],
                $user['name'],
                [
                    'appointment_id'    => $id,
                    'service_type'      => $oldBooking['service_type'],
                    'property_name'     => $oldBooking['property_name'] ?? '',
                    'old_date'          => $oldBooking['appointment_date'],
                    'new_date'          => $newDate,
                    'new_time'          => date('h:i A', strtotime($newTime)),
                    'rescheduled_date'  => date('F j, Y'),
                ]
            );
        }
        ResponseHelper::success(null, "Appointment rescheduled successfully");
    } else {
        ResponseHelper::error("Failed to reschedule or booking not found", 500);
    }
}
?>