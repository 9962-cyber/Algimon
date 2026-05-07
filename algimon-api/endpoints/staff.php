<?php
/**
 * Staff Management API
 * GET    /staff      — admin: list all staff + stats
 * POST   /staff      — admin: add new staff member
 * PUT    /staff/:id  — admin: update staff member
 * DELETE /staff/:id  — admin: delete staff member
 */

function getStaffList() {
    AuthMiddleware::requireAdmin();
    try {
        $db = (new Database())->getConnection();

        $rows = $db->query(
            "SELECT id, name, email, phone, role, certifications, availability_days, created_at
             FROM staff WHERE role != 'admin' ORDER BY name ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $today = date('l'); // "Monday", "Tuesday", etc.
        $availableToday  = 0;
        $totalCerts      = 0;

        foreach ($rows as &$r) {
            $r['id']                = (int)$r['id'];
            $r['certifications']    = json_decode($r['certifications']    ?? '[]', true) ?: [];
            $r['availability_days'] = json_decode($r['availability_days'] ?? '[]', true) ?: [];
            if (in_array($today, $r['availability_days'])) $availableToday++;
            $totalCerts += count($r['certifications']);
        }
        unset($r);

        $activeAssignments = (int)$db->query(
            "SELECT COUNT(DISTINCT a.staff_id) FROM appointments a
             JOIN staff s ON s.id = a.staff_id
             WHERE a.STATUS = 'in-progress' AND a.staff_id IS NOT NULL AND s.role != 'admin'"
        )->fetchColumn();

        ResponseHelper::success([
            'staff' => $rows,
            'stats' => [
                'total'              => count($rows),
                'available_today'    => $availableToday,
                'active_assignments' => $activeAssignments,
                'certifications'     => $totalCerts,
            ],
        ]);
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

function createStaff() {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    $name  = trim($data['name']  ?? '');
    $email = trim($data['email'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $role  = trim($data['role']  ?? 'technician');
    $certs = array_values((array)($data['certifications']    ?? []));
    $avail = array_values((array)($data['availability_days'] ?? []));

    if (!$name || !$email) {
        ResponseHelper::error("name and email are required", 400);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        ResponseHelper::error("Invalid email format", 400);
        return;
    }

    $validRoles = ['technician', 'senior_technician', 'manager', 'admin'];
    if (!in_array($role, $validRoles)) $role = 'technician';

    try {
        $db = (new Database())->getConnection();

        $chk = $db->prepare("SELECT id FROM staff WHERE email = :email");
        $chk->bindParam(':email', $email);
        $chk->execute();
        if ($chk->rowCount() > 0) {
            ResponseHelper::error("Email already in use", 409);
            return;
        }

        $tempPassword = AuthHelper::generateTempPassword();

        $stmt = $db->prepare(
            "INSERT INTO staff (name, email, password_hash, phone, role, certifications, availability_days, first_login)
             VALUES (:name, :email, :pw, :phone, :role, :certs, :avail, 1)"
        );
        $stmt->execute([
            ':name'  => $name,
            ':email' => $email,
            ':pw'    => AuthHelper::hashPassword($tempPassword),
            ':phone' => $phone,
            ':role'  => $role,
            ':certs' => json_encode($certs),
            ':avail' => json_encode($avail),
        ]);

        $newId = (int)$db->lastInsertId();

        MailerHelper::sendStaffWelcomeEmail($email, $name, $tempPassword);

        ResponseHelper::success(['id' => $newId], "Staff member added", 201);
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

function updateStaff($id) {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { ResponseHelper::error("Invalid request body", 400); return; }

    $sets   = [];
    $params = [':id' => $id];

    foreach (['name', 'email', 'phone', 'role'] as $f) {
        if (array_key_exists($f, $data)) {
            $sets[]        = "$f = :$f";
            $params[":$f"] = $data[$f];
        }
    }
    foreach (['certifications', 'availability_days'] as $f) {
        if (array_key_exists($f, $data)) {
            $sets[]        = "$f = :$f";
            $params[":$f"] = json_encode(array_values((array)$data[$f]));
        }
    }

    if (empty($sets)) { ResponseHelper::error("No valid fields to update", 400); return; }

    try {
        $db = (new Database())->getConnection();

        $chk = $db->prepare("SELECT id FROM staff WHERE id = :id");
        $chk->execute([':id' => $id]);
        if (!$chk->rowCount()) {
            ResponseHelper::error("Staff member not found", 404);
            return;
        }

        $stmt = $db->prepare("UPDATE staff SET " . implode(', ', $sets) . " WHERE id = :id");
        $stmt->execute($params);
        ResponseHelper::success(null, "Staff updated");
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

function resetStaffPassword($id) {
    AuthMiddleware::requireAdmin();
    try {
        $db = (new Database())->getConnection();

        $chk = $db->prepare("SELECT id, name, email FROM staff WHERE id = :id");
        $chk->execute([':id' => $id]);
        $staff = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$staff) {
            ResponseHelper::error("Staff member not found", 404);
            return;
        }

        $tempPassword = AuthHelper::generateTempPassword();
        $stmt = $db->prepare("UPDATE staff SET password_hash = :pw, first_login = 1 WHERE id = :id");
        $stmt->execute([':pw' => AuthHelper::hashPassword($tempPassword), ':id' => $id]);

        MailerHelper::sendStaffWelcomeEmail($staff['email'], $staff['name'], $tempPassword);

        ResponseHelper::success(null, "Password reset and sent to {$staff['email']}");
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

function deleteStaff($id) {
    AuthMiddleware::requireAdmin();
    try {
        $db = (new Database())->getConnection();
        $db->prepare("UPDATE appointments SET staff_id = NULL, staff_name = NULL WHERE staff_id = :id")
           ->execute([':id' => $id]);
        $stmt = $db->prepare("DELETE FROM staff WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        if ($stmt->execute() && $stmt->rowCount() > 0) {
            ResponseHelper::success(null, "Staff member deleted");
        } else {
            ResponseHelper::error("Staff member not found", 404);
        }
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}
?>
