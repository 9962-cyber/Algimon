<?php
/**
 * Operation Rules API - Member B
 * Admin manages business hours, policies, and operational settings
 */

// GET /operation-rules - Get all operation rules (public)
function getOperationRules() {
    $database = new Database();
    $db = $database->getConnection();

    $query = "SELECT * FROM operation_rules ORDER BY rule_key ASC";
    $stmt  = $db->prepare($query);
    $stmt->execute();

    $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Also return as a key-value map for easy frontend use
    $map = [];
    foreach ($rules as $rule) {
        $map[$rule['rule_key']] = $rule['rule_value'];
    }

    ResponseHelper::success(['list' => $rules, 'map' => $map]);
}

// GET /operation-rules/:key - Get a single rule by key
function getOperationRule($key) {
    $database = new Database();
    $db = $database->getConnection();

    $query = "SELECT * FROM operation_rules WHERE rule_key = :key";
    $stmt  = $db->prepare($query);
    $stmt->bindParam(':key', $key);
    $stmt->execute();

    $rule = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$rule) {
        ResponseHelper::error("Rule not found", 404);
        return;
    }

    ResponseHelper::success($rule);
}

// POST /operation-rules - Create a new rule (admin only)
function createOperationRule() {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['rule_key']) || !isset($data['rule_value'])) {
        ResponseHelper::error("rule_key and rule_value are required", 400);
        return;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Prevent duplicate keys
    $check = "SELECT id FROM operation_rules WHERE rule_key = :key";
    $checkStmt = $db->prepare($check);
    $checkStmt->bindParam(':key', $data['rule_key']);
    $checkStmt->execute();
    if ($checkStmt->rowCount() > 0) {
        ResponseHelper::error("Rule key already exists. Use PUT to update it.", 409);
        return;
    }

    $query = "INSERT INTO operation_rules (rule_key, rule_value, description)
              VALUES (:rule_key, :rule_value, :description)";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':rule_key',    $data['rule_key']);
    $stmt->bindParam(':rule_value',  $data['rule_value']);
    $stmt->bindParam(':description', $data['description'] ?? null);

    if ($stmt->execute()) {
        ResponseHelper::success(['id' => $db->lastInsertId()], "Operation rule created successfully", 201);
    } else {
        ResponseHelper::error("Failed to create operation rule", 500);
    }
}

// PUT /operation-rules/:id - Update a rule (admin only)
function updateOperationRule($id) {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['rule_value'])) {
        ResponseHelper::error("rule_value is required", 400);
        return;
    }

    $database = new Database();
    $db = $database->getConnection();

    $fields = ["rule_value = :rule_value"];
    $params = [':id' => $id, ':rule_value' => $data['rule_value']];

    if (isset($data['description'])) {
        $fields[]              = "description = :description";
        $params[':description'] = $data['description'];
    }

    $query = "UPDATE operation_rules SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt  = $db->prepare($query);

    if ($stmt->execute($params) && $stmt->rowCount() > 0) {
        ResponseHelper::success(null, "Operation rule updated successfully");
    } else {
        ResponseHelper::error("Rule not found", 404);
    }
}

// DELETE /operation-rules/:id - Delete a rule (admin only)
function deleteOperationRule($id) {
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    $query = "DELETE FROM operation_rules WHERE id = :id";
    $stmt  = $db->prepare($query);
    $stmt->bindParam(':id', $id);

    if ($stmt->execute() && $stmt->rowCount() > 0) {
        ResponseHelper::success(null, "Operation rule deleted successfully");
    } else {
        ResponseHelper::error("Rule not found", 404);
    }
}
?>
