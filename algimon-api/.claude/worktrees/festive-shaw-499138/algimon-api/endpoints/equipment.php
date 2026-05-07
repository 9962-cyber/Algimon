<?php
/**
 * Equipment API - Track fire protection equipment
 */

// GET /equipment - Get all equipment for client's properties
function getEquipment() {
    $user = AuthMiddleware::requireClient();
    
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "SELECT e.*, p.name as property_name 
              FROM equipment e
              JOIN properties p ON e.property_id = p.id
              WHERE p.user_id = :user_id
              ORDER BY e.next_renewal ASC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->execute();
    
    $equipment = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate status based on renewal date
    $today = new DateTime();
    foreach ($equipment as &$item) {
        if ($item['next_renewal']) {
            $renewal = new DateTime($item['next_renewal']);
            $diff = $today->diff($renewal)->days;
            if ($renewal < $today) {
                $item['status'] = 'expired';
            } elseif ($diff <= 30) {
                $item['status'] = 'expiring';
            } else {
                $item['status'] = 'ok';
            }
        } else {
            $item['status'] = 'no-expiry';
        }
    }
    
    ResponseHelper::success($equipment);
}

// POST /equipment - Add equipment to property
function createEquipment() {
    $user = AuthMiddleware::requireClient();
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['property_id']) || !isset($data['name']) || !isset($data['service_type'])) {
        ResponseHelper::error("Property ID, name, and service type are required", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Verify property ownership
    $check = "SELECT id FROM properties WHERE id = :id AND user_id = :user_id";
    $checkStmt = $db->prepare($check);
    $checkStmt->bindParam(':id', $data['property_id']);
    $checkStmt->bindParam(':user_id', $user['id']);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() == 0) {
        ResponseHelper::error("Property not found", 404);
        return;
    }
    
    $lastServiced = $data['last_serviced'] ?? date('Y-m-d');
    $nextRenewal = $data['next_renewal'] ?? date('Y-m-d', strtotime('+1 year'));
    
    $query = "INSERT INTO equipment (property_id, name, service_type, last_serviced, next_renewal) 
              VALUES (:property_id, :name, :service_type, :last_serviced, :next_renewal)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':property_id', $data['property_id']);
    $stmt->bindParam(':name', $data['name']);
    $stmt->bindParam(':service_type', $data['service_type']);
    $stmt->bindParam(':last_serviced', $lastServiced);
    $stmt->bindParam(':next_renewal', $nextRenewal);
    
    if ($stmt->execute()) {
        ResponseHelper::success(['id' => $db->lastInsertId()], "Equipment added successfully", 201);
    } else {
        ResponseHelper::error("Failed to add equipment", 500);
    }
}

// PUT /equipment/:id - Update equipment
function updateEquipment($id) {
    $user = AuthMiddleware::requireClient();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Verify ownership through property
    $check = "SELECT e.id FROM equipment e
              JOIN properties p ON e.property_id = p.id
              WHERE e.id = :id AND p.user_id = :user_id";
    $checkStmt = $db->prepare($check);
    $checkStmt->bindParam(':id', $id);
    $checkStmt->bindParam(':user_id', $user['id']);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() == 0) {
        ResponseHelper::error("Equipment not found", 404);
        return;
    }
    
    $fields = [];
    $params = [':id' => $id];
    
    $allowed = ['name', 'service_type', 'last_serviced', 'next_renewal'];
    foreach ($allowed as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = :$field";
            $params[":$field"] = $data[$field];
        }
    }
    
    if (empty($fields)) {
        ResponseHelper::error("No fields to update", 400);
        return;
    }
    
    $query = "UPDATE equipment SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute($params)) {
        ResponseHelper::success(null, "Equipment updated successfully");
    } else {
        ResponseHelper::error("Failed to update equipment", 500);
    }
}

// DELETE /equipment/:id - Delete equipment
function deleteEquipment($id) {
    $user = AuthMiddleware::requireClient();
    
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "DELETE e FROM equipment e
              JOIN properties p ON e.property_id = p.id
              WHERE e.id = :id AND p.user_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user['id']);
    
    if ($stmt->execute()) {
        ResponseHelper::success(null, "Equipment deleted successfully");
    } else {
        ResponseHelper::error("Failed to delete equipment", 500);
    }
}
?>