<?php
/**
 * Blocked Dates API
 * GET    /blocked-dates       — public (booking form needs to know which dates are off)
 * POST   /blocked-dates       — admin: add a blocked date
 * DELETE /blocked-dates/:id   — admin: remove a blocked date
 */

// GET /blocked-dates — list all blocked dates, sorted ascending
function getBlockedDates() {
    $db   = (new Database())->getConnection();
    $rows = $db->query(
        "SELECT id, blocked_date AS date, reason, created_at
         FROM blocked_dates
         ORDER BY blocked_date ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    ResponseHelper::success($rows);
}

// POST /blocked-dates — add a new blocked date (admin only)
function createBlockedDate() {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    $date   = trim($data['date']   ?? '');
    $reason = trim($data['reason'] ?? 'Blocked');

    if (!$date) {
        ResponseHelper::error("Date is required", 400);
        return;
    }

    // Validate date format (YYYY-MM-DD)
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !strtotime($date)) {
        ResponseHelper::error("Invalid date format. Use YYYY-MM-DD", 400);
        return;
    }

    $db   = (new Database())->getConnection();
    $stmt = $db->prepare(
        "INSERT INTO blocked_dates (blocked_date, reason)
         VALUES (:date, :reason)"
    );
    $stmt->bindParam(':date',   $date);
    $stmt->bindParam(':reason', $reason);

    try {
        $stmt->execute();
        ResponseHelper::success(
            ['id' => (int)$db->lastInsertId(), 'date' => $date, 'reason' => $reason],
            "Date blocked successfully",
            201
        );
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            ResponseHelper::error("This date is already blocked", 409);
        } else {
            ResponseHelper::error("Failed to block date", 500);
        }
    }
}

// DELETE /blocked-dates/:id — remove a blocked date (admin only)
function deleteBlockedDate($id) {
    AuthMiddleware::requireAdmin();
    $db   = (new Database())->getConnection();
    $stmt = $db->prepare("DELETE FROM blocked_dates WHERE id = :id");
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);

    if ($stmt->execute() && $stmt->rowCount() > 0) {
        ResponseHelper::success(null, "Blocked date removed successfully");
    } else {
        ResponseHelper::error("Blocked date not found", 404);
    }
}
?>
