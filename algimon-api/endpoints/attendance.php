<?php
/**
 * Attendance API — Daily Attendance Sheet
 * GET    /attendance          — all staff with their status for ?date=
 * GET    /attendance/export   — CSV download for ?date=
 * POST   /attendance/mark     — { staff_id, date, status, remarks } upsert
 * DELETE /attendance/:id      — clear a mark (back to unmarked)
 */

function getAttendance() {
    AuthMiddleware::requireAdmin();
    try {
        $db   = (new Database())->getConnection();
        $date = isset($_GET['date']) && $_GET['date'] ? $_GET['date'] : date('Y-m-d');

        // All staff except admins
        $allStaff = $db->query(
            "SELECT id, name, role FROM staff WHERE role != 'admin' ORDER BY name ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        // Attendance records for this date
        $stmt = $db->prepare(
            "SELECT id, staff_id, attendance_status, remarks
             FROM attendance WHERE date = :date"
        );
        $stmt->execute([':date' => $date]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $recMap = [];
        foreach ($records as $r) {
            $recMap[(int)$r['staff_id']] = [
                'attendance_id'     => (int)$r['id'],
                'attendance_status' => $r['attendance_status'],
                'remarks'           => $r['remarks'] ?? '',
            ];
        }

        $staffList = [];
        $counts    = ['present' => 0, 'absent' => 0, 'late' => 0, 'on_leave' => 0, 'unmarked' => 0];

        foreach ($allStaff as $s) {
            $sid    = (int)$s['id'];
            $rec    = $recMap[$sid] ?? null;
            $status = $rec ? ($rec['attendance_status'] ?? null) : null;
            $key    = $status ?: 'unmarked';
            if (array_key_exists($key, $counts)) $counts[$key]++;

            $staffList[] = [
                'id'                => $sid,
                'name'              => $s['name'],
                'role'              => $s['role'],
                'attendance_id'     => $rec ? $rec['attendance_id']     : null,
                'attendance_status' => $rec ? $rec['attendance_status'] : null,
                'remarks'           => $rec ? ($rec['remarks'] ?? '')   : '',
            ];
        }

        ResponseHelper::success([
            'staff' => $staffList,
            'stats' => array_merge($counts, ['total' => count($allStaff)]),
            'date'  => $date,
        ]);
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

function markAttendance() {
    AuthMiddleware::requireAdmin();
    $data    = json_decode(file_get_contents('php://input'), true) ?? [];
    $staffId = (int)($data['staff_id'] ?? 0);
    $date    = $data['date']    ?? date('Y-m-d');
    $status  = $data['status']  ?? null;
    $remarks = $data['remarks'] ?? '';

    $allowed = ['present', 'absent', 'late', 'on_leave'];
    if (!$staffId) {
        ResponseHelper::error("staff_id is required", 400);
        return;
    }
    if ($status && !in_array($status, $allowed)) {
        ResponseHelper::error("Invalid status. Allowed: " . implode(', ', $allowed), 400);
        return;
    }

    try {
        $db = (new Database())->getConnection();

        $row = $db->prepare("SELECT name FROM staff WHERE id = :sid");
        $row->execute([':sid' => $staffId]);
        $staff = $row->fetch(PDO::FETCH_ASSOC);
        if (!$staff) {
            ResponseHelper::error("Staff member not found", 404);
            return;
        }

        // Upsert: update if record exists for this staff+date, else insert
        $existing = $db->prepare("SELECT id FROM attendance WHERE staff_id = :sid AND date = :date");
        $existing->execute([':sid' => $staffId, ':date' => $date]);
        $rec = $existing->fetch(PDO::FETCH_ASSOC);

        if ($rec) {
            $upd = $db->prepare(
                "UPDATE attendance SET attendance_status = :status, remarks = :remarks WHERE id = :id"
            );
            $upd->execute([':status' => $status, ':remarks' => $remarks, ':id' => $rec['id']]);
            ResponseHelper::success(['attendance_id' => (int)$rec['id']], "Attendance updated");
        } else {
            $ins = $db->prepare(
                "INSERT INTO attendance (staff_id, staff_name, attendance_status, remarks, date)
                 VALUES (:sid, :name, :status, :remarks, :date)"
            );
            $ins->execute([
                ':sid'     => $staffId,
                ':name'    => $staff['name'],
                ':status'  => $status,
                ':remarks' => $remarks,
                ':date'    => $date,
            ]);
            ResponseHelper::success(['attendance_id' => (int)$db->lastInsertId()], "Attendance marked", 201);
        }
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

function clearAttendance($id) {
    AuthMiddleware::requireAdmin();
    try {
        $db   = (new Database())->getConnection();
        $stmt = $db->prepare("DELETE FROM attendance WHERE id = :id");
        $stmt->execute([':id' => (int)$id]);
        if ($stmt->rowCount() > 0) {
            ResponseHelper::success(null, "Attendance cleared");
        } else {
            ResponseHelper::error("Record not found", 404);
        }
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

function exportAttendance() {
    AuthMiddleware::requireAdmin();
    try {
        $db   = (new Database())->getConnection();
        $date = isset($_GET['date']) && $_GET['date'] ? $_GET['date'] : date('Y-m-d');

        $stmt = $db->prepare(
            "SELECT s.name, s.role,
                    COALESCE(a.attendance_status, 'unmarked') AS status,
                    COALESCE(a.remarks, '') AS remarks
             FROM staff s
             LEFT JOIN attendance a ON a.staff_id = s.id AND a.date = :date
             WHERE s.role != 'admin'
             ORDER BY s.name ASC"
        );
        $stmt->execute([':date' => $date]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: text/csv; charset=utf-8', true);
        header('Content-Disposition: attachment; filename="attendance_' . $date . '.csv"');

        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
        fputcsv($out, ['Staff Name', 'Role', 'Date', 'Status', 'Remarks']);
        foreach ($rows as $r) {
            fputcsv($out, [
                $r['name'],
                ucfirst(str_replace('_', ' ', $r['role'])),
                $date,
                ucfirst(str_replace('_', ' ', $r['status'])),
                $r['remarks'],
            ]);
        }
        fclose($out);
        exit;
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}
?>
