<?php
/**
 * Notifications API
 *
 * Notifications are auto-generated from real appointment + equipment data.
 * They are upserted (INSERT IGNORE) on every GET so they are always in sync
 * without needing any admin-side trigger.
 *
 * Routes:
 *   GET  /notifications        → getNotifications()
 *   PUT  /notifications/read   → markNotificationsRead()
 */

// ──────────────────────────────────────────────────────────────────────────────
// GET /notifications
// ──────────────────────────────────────────────────────────────────────────────
function getNotifications() {
    $user = AuthMiddleware::requireClient();
    $userId = $user['id'];

    $database = new Database();
    $db = $database->getConnection();

    // ── 1. Auto-create notifications from appointment statuses ────────────────
    _upsertAppointmentNotifications($db, $userId);

    // ── 2. Auto-create notifications from equipment expiry ────────────────────
    _upsertEquipmentNotifications($db, $userId);

    // ── 3. Fetch all notifications for this user (newest first) ───────────────
    $stmt = $db->prepare(
        "SELECT id, type, title, message, reference_id, is_read, created_at
         FROM notifications
         WHERE user_id = :user_id
         ORDER BY created_at DESC, id DESC
         LIMIT 50"
    );
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast types
    foreach ($rows as &$r) {
        $r['id']         = (int) $r['id'];
        $r['is_read']    = (bool) $r['is_read'];
        $r['reference_id'] = $r['reference_id'] ? (int) $r['reference_id'] : null;
    }
    unset($r);

    $unreadCount = count(array_filter($rows, fn($r) => !$r['is_read']));

    ResponseHelper::success([
        'notifications' => $rows,
        'unread_count'  => $unreadCount,
    ]);
}

// ──────────────────────────────────────────────────────────────────────────────
// PUT /notifications/read
// ──────────────────────────────────────────────────────────────────────────────
function markNotificationsRead() {
    $user   = AuthMiddleware::requireClient();
    $userId = $user['id'];

    $database = new Database();
    $db = $database->getConnection();

    // Optional: mark only specific IDs, or all if none supplied
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $ids  = $body['ids'] ?? null; // array of ints, or null = mark all

    if ($ids && is_array($ids) && count($ids) > 0) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $params = array_merge($ids, [$userId]);
        $stmt = $db->prepare(
            "UPDATE notifications SET is_read = 1
             WHERE id IN ($placeholders) AND user_id = ?"
        );
        $stmt->execute($params);
    } else {
        $stmt = $db->prepare(
            "UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0"
        );
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
    }

    ResponseHelper::success(['unread_count' => 0], 'Notifications marked as read');
}

// ──────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Upserts appointment-based notifications.
 * Uses INSERT IGNORE with a UNIQUE key on (user_id, type, reference_id)
 * so the same appointment status never creates duplicate rows.
 */
function _upsertAppointmentNotifications(PDO $db, int $userId): void {
    // Pull all non-pending appointments for this user that deserve a notification
    $stmt = $db->prepare(
        "SELECT a.id, a.service_type, a.appointment_date, a.appointment_time,
                a.STATUS, a.actual_amount, a.cancel_reason,
                p.name AS property_name,
                s.name AS staff_name,
                a.updated_at
         FROM appointments a
         LEFT JOIN properties p ON a.property_id = p.id
         LEFT JOIN staff      s ON a.staff_id     = s.id
         WHERE a.client_id = :user_id
           AND a.STATUS IN ('pending','approved','in_progress','completed','cancelled')
         ORDER BY a.updated_at DESC"
    );
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $insertStmt = $db->prepare(
        "INSERT IGNORE INTO notifications
             (user_id, type, title, message, reference_id, is_read, created_at)
         VALUES
             (:user_id, :type, :title, :message, :ref_id, 0, :created_at)"
    );

    foreach ($appointments as $apt) {
        $aptId      = (int) $apt['id'];
        $service    = $apt['service_type'];
        $property   = $apt['property_name'] ?? 'your property';
        $date       = date('F j, Y', strtotime($apt['appointment_date']));
        $time       = $apt['appointment_time']
                        ? date('h:i A', strtotime($apt['appointment_time']))
                        : '';
        $amount     = $apt['actual_amount']
                        ? '₱' . number_format((float)$apt['actual_amount'], 2)
                        : '';
        $staffName  = $apt['staff_name']  ?? '';
        $cancelReason = $apt['cancel_reason'] ?? '';
        $createdAt  = $apt['updated_at'] ?? date('Y-m-d H:i:s');

        $status = strtolower($apt['STATUS']);

        switch ($status) {
            case 'pending':
                $type    = 'appointment_pending';
                $title   = 'Appointment Submitted';
                $msg     = "Your {$service} at {$property} on {$date}"
                         . ($time ? " at {$time}" : '')
                         . " has been submitted and is awaiting review.";
                break;

            case 'approved':
                $type    = 'appointment_approved';
                $title   = 'Appointment Approved';
                $msg     = "Your {$service} at {$property} on {$date}"
                         . ($time ? " at {$time}" : '')
                         . " has been approved."
                         . ($amount ? " Assessed price: {$amount}." : '');
                break;

            case 'in_progress':
                $type    = 'appointment_in_progress';
                $title   = 'Service In Progress';
                $msg     = "Your {$service} at {$property} is currently underway."
                         . ($staffName ? " Technician on site: {$staffName}." : '');
                break;

            case 'completed':
                $type    = 'appointment_completed';
                $title   = 'Service Completed';
                $msg     = "Your {$service} at {$property} has been completed successfully."
                         . ($amount ? " Amount collected: {$amount}." : '');
                break;

            case 'cancelled':
                $type    = 'appointment_cancelled';
                $title   = 'Appointment Cancelled';
                $msg     = "Your {$service} scheduled for {$date} has been cancelled."
                         . ($cancelReason ? " Reason: {$cancelReason}." : '');
                break;

            default:
                continue 2; // skip pending / unknown
        }

        $insertStmt->execute([
            ':user_id'    => $userId,
            ':type'       => $type,
            ':title'      => $title,
            ':message'    => $msg,
            ':ref_id'     => $aptId,
            ':created_at' => $createdAt,
        ]);
    }
}

/**
 * Upserts equipment-expiry notifications.
 * One notification per equipment item:
 *   - expired      → type = equipment_expired
 *   - ≤ 60 days    → type = equipment_expiring
 *
 * If an expired item was previously marked as expiring, we insert a new
 * expired row (different type) and the old expiring row stays in history.
 */
function _upsertEquipmentNotifications(PDO $db, int $userId): void {
    // Fetch all equipment belonging to this user's properties
    $stmt = $db->prepare(
        "SELECT e.id, e.name, e.next_renewal,
                p.name AS property_name
         FROM equipment e
         JOIN properties p ON e.property_id = p.id
         WHERE p.user_id = :user_id
           AND e.next_renewal IS NOT NULL"
    );
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();
    $equipment = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $insertStmt = $db->prepare(
        "INSERT IGNORE INTO notifications
             (user_id, type, title, message, reference_id, is_read, created_at)
         VALUES
             (:user_id, :type, :title, :message, :ref_id, 0, :created_at)"
    );

    $today = new DateTime();
    $today->setTime(0, 0, 0);

    foreach ($equipment as $eq) {
        $eqId       = (int) $eq['id'];
        $name       = $eq['name'];
        $property   = $eq['property_name'];
        $renewal    = new DateTime($eq['next_renewal']);
        $diff       = (int) $today->diff($renewal)->format('%r%a'); // negative = expired
        $renewalStr = $renewal->format('F j, Y');

        if ($diff <= 0) {
            $type    = 'equipment_expired';
            $title   = 'Equipment Expired';
            $msg     = "{$name} at {$property} expired on {$renewalStr}. Please schedule a renewal immediately.";
            $createdAt = $eq['next_renewal'] . ' 00:00:00';
        } elseif ($diff <= 60) {
            $type    = 'equipment_expiring';
            $title   = 'Equipment Expiring Soon';
            $msg     = "{$name} at {$property} expires on {$renewalStr} ({$diff} days left). Schedule a renewal soon.";
            $createdAt = date('Y-m-d H:i:s');
        } else {
            continue; // still compliant — no notification needed
        }

        $insertStmt->execute([
            ':user_id'    => $userId,
            ':type'       => $type,
            ':title'      => $title,
            ':message'    => $msg,
            ':ref_id'     => $eqId,
            ':created_at' => $createdAt,
        ]);
    }
}
?>
