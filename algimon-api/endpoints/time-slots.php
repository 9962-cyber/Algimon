<?php
/**
 * Time Slots API
 * GET  /time-slots       — public (needed by booking form to validate availability)
 * PUT  /time-slots       — admin: bulk-save all 7 day configs
 */

// GET /time-slots — returns a keyed object { monday: {...}, tuesday: {...}, ... }
function getTimeSlots() {
    $db   = (new Database())->getConnection();
    $rows = $db->query(
        "SELECT LOWER(day_of_week) AS day, is_active, start_time, end_time, max_slots
         FROM time_slots_config
         ORDER BY FIELD(LOWER(day_of_week),
             'monday','tuesday','wednesday','thursday','friday','saturday','sunday')"
    )->fetchAll(PDO::FETCH_ASSOC);

    $defaults = _defaultSlots();
    $result   = $defaults;

    foreach ($rows as $row) {
        $day = $row['day'];
        if (!isset($result[$day])) continue;
        $result[$day] = [
            'active'   => (bool)$row['is_active'],
            'start'    => substr($row['start_time'], 0, 5),   // "08:00:00" → "08:00"
            'end'      => substr($row['end_time'],   0, 5),
            'maxSlots' => (int)$row['max_slots'],
        ];
    }

    ResponseHelper::success($result);
}

// PUT /time-slots — saves all days at once (admin only)
function saveTimeSlots() {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        ResponseHelper::error("Expected a JSON object with day configs", 400);
        return;
    }

    $days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    $db   = (new Database())->getConnection();

    $stmt = $db->prepare(
        "INSERT INTO time_slots_config (day_of_week, is_active, start_time, end_time, max_slots)
         VALUES (:day, :active, :start, :end, :max_slots)
         ON DUPLICATE KEY UPDATE
             is_active  = VALUES(is_active),
             start_time = VALUES(start_time),
             end_time   = VALUES(end_time),
             max_slots  = VALUES(max_slots)"
    );

    $defaults = _defaultSlots();

    foreach ($days as $day) {
        $cfg      = $data[$day] ?? $defaults[$day];
        $active   = !empty($cfg['active']) ? 1 : 0;
        $start    = $cfg['start']    ?? $defaults[$day]['start'];
        $end      = $cfg['end']      ?? $defaults[$day]['end'];
        $maxSlots = isset($cfg['maxSlots']) ? (int)$cfg['maxSlots'] : $defaults[$day]['maxSlots'];

        // Basic validation: start must be before end
        if ($active && strtotime($start) >= strtotime($end)) {
            ResponseHelper::error("Start time must be before end time for $day", 400);
            return;
        }

        $dayDb = ucfirst($day);   // "monday" → "Monday" (matches existing DB values)
        $stmt->execute([
            ':day'       => $dayDb,
            ':active'    => $active,
            ':start'     => $start . ':00',
            ':end'       => $end   . ':00',
            ':max_slots' => $maxSlots,
        ]);
    }

    ResponseHelper::success(null, "Time slots saved successfully");
}

// ── helpers ───────────────────────────────────────────────────────────────────
function _defaultSlots(): array {
    return [
        'monday'    => ['active' => false, 'start' => '08:00', 'end' => '17:00', 'maxSlots' => 8],
        'tuesday'   => ['active' => false, 'start' => '08:00', 'end' => '17:00', 'maxSlots' => 8],
        'wednesday' => ['active' => false, 'start' => '08:00', 'end' => '17:00', 'maxSlots' => 8],
        'thursday'  => ['active' => false, 'start' => '08:00', 'end' => '17:00', 'maxSlots' => 8],
        'friday'    => ['active' => false, 'start' => '08:00', 'end' => '17:00', 'maxSlots' => 8],
        'saturday'  => ['active' => false, 'start' => '09:00', 'end' => '15:00', 'maxSlots' => 6],
        'sunday'    => ['active' => false, 'start' => '10:00', 'end' => '14:00', 'maxSlots' => 4],
    ];
}
?>
