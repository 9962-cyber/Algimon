<?php
/**
 * Audit Logs API
 * GET    /audit-logs        — admin: list logs with optional search/entity/action filters
 * POST   /audit-logs        — any staff: record a new log entry
 * DELETE /audit-logs/:id    — admin: delete a single entry
 * DELETE /audit-logs        — admin: clear all entries
 */

// GET /audit-logs
function getAuditLogs() {
    AuthMiddleware::requireAdmin();

    try {
        $db = (new Database())->getConnection();

        $search = trim($_GET['search'] ?? '');
        $entity = trim($_GET['entity'] ?? '');
        $action = trim($_GET['action'] ?? '');
        $limit  = min((int)($_GET['limit'] ?? 500), 1000);

        $where  = [];
        $params = [];

        if ($search !== '') {
            $where[]       = "(user_name LIKE :s1 OR action LIKE :s2 OR details LIKE :s3 OR entity LIKE :s4)";
            $like          = "%$search%";
            $params[':s1'] = $like;
            $params[':s2'] = $like;
            $params[':s3'] = $like;
            $params[':s4'] = $like;
        }
        if ($entity !== '') {
            $where[]           = "entity = :entity";
            $params[':entity'] = $entity;
        }
        if ($action !== '') {
            $where[]           = "action = :action";
            $params[':action'] = $action;
        }

        $sql = "SELECT id, user_name AS user, action, entity, details, created_at
                FROM audit_logs"
             . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
             . ' ORDER BY created_at DESC LIMIT :lim';

        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($logs as &$l) $l['id'] = (int)$l['id'];
        unset($l);

        // Distinct actions for filter dropdown
        $actions = $db->query("SELECT DISTINCT action FROM audit_logs ORDER BY action ASC")
                      ->fetchAll(PDO::FETCH_COLUMN);

        // Global stats (always unfiltered)
        $s = $db->query("
            SELECT
                COUNT(*)                                               AS total,
                SUM(DATE(created_at) = CURDATE())                     AS today,
                SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))    AS this_week,
                COUNT(DISTINCT user_name)                              AS active_users
            FROM audit_logs
        ")->fetch(PDO::FETCH_ASSOC);

        ResponseHelper::success([
            'logs'    => $logs,
            'actions' => $actions,
            'stats'   => [
                'total'        => (int)$s['total'],
                'today'        => (int)$s['today'],
                'this_week'    => (int)$s['this_week'],
                'active_users' => (int)$s['active_users'],
            ],
        ]);

    } catch (PDOException $e) {
        // Table likely doesn't exist yet — return empty state instead of crashing
        if (strpos($e->getMessage(), "doesn't exist") !== false ||
            strpos($e->getMessage(), "Table")          !== false) {
            ResponseHelper::success([
                'logs'    => [],
                'actions' => [],
                'stats'   => ['total' => 0, 'today' => 0, 'this_week' => 0, 'active_users' => 0],
            ], 'audit_logs table not found. Please run the migration SQL.');
        } else {
            ResponseHelper::error("Database error: " . $e->getMessage(), 500);
        }
    }
}

// POST /audit-logs — any logged-in staff member can write a log
function createAuditLog() {
    $user = AuthMiddleware::requireStaff();
    $data = json_decode(file_get_contents('php://input'), true);

    $action   = trim($data['action']    ?? '');
    $entity   = trim($data['entity']    ?? 'System');
    $details  = trim($data['details']   ?? '');
    $userName = $user['name'] ?? trim($data['user_name'] ?? 'Admin User');

    if (!$action) {
        ResponseHelper::error("action is required", 400);
        return;
    }

    try {
        $db   = (new Database())->getConnection();
        $stmt = $db->prepare(
            "INSERT INTO audit_logs (user_name, action, entity, details)
             VALUES (:u, :a, :e, :d)"
        );
        $stmt->execute([':u' => $userName, ':a' => $action, ':e' => $entity, ':d' => $details]);
        ResponseHelper::success(['id' => (int)$db->lastInsertId()], "Log recorded", 201);
    } catch (PDOException $e) {
        // Silently succeed even if the table is missing — logging must never break the main workflow
        ResponseHelper::success(['id' => 0], "Log skipped (table not ready)", 201);
    }
}

// DELETE /audit-logs/:id — remove a single entry
function deleteAuditLog($id) {
    AuthMiddleware::requireAdmin();
    try {
        $db   = (new Database())->getConnection();
        $stmt = $db->prepare("DELETE FROM audit_logs WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        if ($stmt->execute() && $stmt->rowCount() > 0) {
            ResponseHelper::success(null, "Log entry deleted");
        } else {
            ResponseHelper::error("Log entry not found", 404);
        }
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}

// DELETE /audit-logs (no id) — wipe the whole table
function clearAuditLogs() {
    AuthMiddleware::requireAdmin();
    try {
        (new Database())->getConnection()->exec("DELETE FROM audit_logs");
        ResponseHelper::success(null, "All audit logs cleared");
    } catch (PDOException $e) {
        ResponseHelper::error("Database error: " . $e->getMessage(), 500);
    }
}
?>
