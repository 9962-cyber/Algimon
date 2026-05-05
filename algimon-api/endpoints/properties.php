<?php
/**
 * Properties API - Client Property Management
 */

// GET /properties - Get all client properties
function getProperties() {
    $user = AuthMiddleware::requireClient();
    
    $database = new Database();
    $db = $database->getConnection();
    
$query = "SELECT id, user_id, NAME as name, address, property_type, created_at FROM properties WHERE user_id = :user_id ORDER BY created_at DESC";    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->execute();
    
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ResponseHelper::success($properties);
}

// POST /properties - Create new property
function createProperty() {
    $user = AuthMiddleware::requireClient();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate
    if (!isset($data['name']) || !isset($data['address']) || !isset($data['type'])) {
        ResponseHelper::error("Name, address, and type are required", 400);
        return;
    }
    
    if (strlen($data['address']) < 10) {
        ResponseHelper::error("Please enter a complete street address", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "INSERT INTO properties (user_id, name, address, property_type) 
              VALUES (:user_id, :name, :address, :property_type)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user['id']);
    $stmt->bindParam(':name', $data['name']);
    $stmt->bindParam(':address', $data['address']);
    $stmt->bindParam(':property_type', $data['type']);
    
    if ($stmt->execute()) {
        $id = $db->lastInsertId();
        ResponseHelper::success(['id' => $id], "Property created successfully", 201);
    } else {
        ResponseHelper::error("Failed to create property", 500);
    }
}

// PUT /properties/:id - Update property
function updateProperty($id) {
    $user = AuthMiddleware::requireClient();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Verify ownership
    $check = "SELECT id FROM properties WHERE id = :id AND user_id = :user_id";
    $checkStmt = $db->prepare($check);
    $checkStmt->bindParam(':id', $id);
    $checkStmt->bindParam(':user_id', $user['id']);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() == 0) {
        ResponseHelper::error("Property not found", 404);
        return;
    }
    
    $fields = [];
    $params = [':id' => $id];
    
    if (isset($data['name'])) {
        $fields[] = "name = :name";
        $params[':name'] = $data['name'];
    }
    if (isset($data['address'])) {
        $fields[] = "address = :address";
        $params[':address'] = $data['address'];
    }
    if (isset($data['type'])) {
        $fields[] = "property_type = :type";
        $params[':type'] = $data['type'];
    }
    
    if (empty($fields)) {
        ResponseHelper::error("No fields to update", 400);
        return;
    }
    
    $query = "UPDATE properties SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute($params)) {
        ResponseHelper::success(null, "Property updated successfully");
    } else {
        ResponseHelper::error("Failed to update property", 500);
    }
}

// DELETE /properties/:id - Delete property
function deleteProperty($id) {
    $user = AuthMiddleware::requireClient();
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if property has active appointments
    $check = "SELECT id FROM appointments WHERE property_id = :id AND client_id = :user_id AND status NOT IN ('completed', 'cancelled')";
    $checkStmt = $db->prepare($check);
    $checkStmt->bindParam(':id', $id);
    $checkStmt->bindParam(':user_id', $user['id']);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() > 0) {
        ResponseHelper::error("Cannot delete property with active appointments", 400);
        return;
    }
    
    $query = "DELETE FROM properties WHERE id = :id AND user_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':user_id', $user['id']);
    
    if ($stmt->execute() && $stmt->rowCount() > 0) {
        ResponseHelper::success(null, "Property deleted successfully");
    } else {
        ResponseHelper::error("Property not found or you do not have permission to delete it", 404);
    }
}
?>
