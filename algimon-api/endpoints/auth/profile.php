<?php
/**
 * Profile API - Update user profile and change password
 */

// ============================================
// UPDATE PROFILE (Name, Email, Phone)
// ============================================
function updateProfile() {
    $user = AuthMiddleware::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($data['name']) || !isset($data['email']) || !isset($data['phone'])) {
        ResponseHelper::error("Name, email, and phone are required", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $table = ($user['type'] == 'client') ? 'users' : 'staff';
    
    // Check if email already exists for another user
    $check_query = "SELECT id FROM $table WHERE email = :email AND id != :id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':email', $data['email']);
    $check_stmt->bindParam(':id', $user['id']);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        ResponseHelper::error("Email already in use by another account", 409);
        return;
    }
    
    // Update profile
    $query = "UPDATE $table SET name = :name, email = :email, phone = :phone WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':name', $data['name']);
    $stmt->bindParam(':email', $data['email']);
    $stmt->bindParam(':phone', $data['phone']);
    $stmt->bindParam(':id', $user['id']);
    
    if ($stmt->execute()) {

        // Sync contact info on all active appointments for this client
        if ($user['type'] === 'client') {
            $syncQuery = "UPDATE appointments
                          SET client_email = :email,
                              client_phone = :phone,
                              client_name  = :name
                          WHERE client_id = :id
                            AND STATUS NOT IN ('completed', 'cancelled')";
            $syncStmt = $db->prepare($syncQuery);
            $syncStmt->bindParam(':email', $data['email']);
            $syncStmt->bindParam(':phone', $data['phone']);
            $syncStmt->bindParam(':name',  $data['name']);
            $syncStmt->bindParam(':id',    $user['id']);
            $syncStmt->execute();
        }

        // Return updated user data (frontend will update localStorage)
        $updatedUser = [
            'id'    => $user['id'],
            'name'  => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'type'  => $user['type']
        ];

        ResponseHelper::success($updatedUser, "Profile updated successfully");
    } else {
        ResponseHelper::error("Failed to update profile", 500);
    }
}

// ============================================
// CHANGE PASSWORD
// ============================================
function changePassword() {
    $user = AuthMiddleware::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['current_password']) || !isset($data['new_password'])) {
        ResponseHelper::error("Current password and new password are required", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $table = ($user['type'] == 'client') ? 'users' : 'staff';
    
    // Get current password hash
    $check_query = "SELECT password_hash FROM $table WHERE id = :id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':id', $user['id']);
    $check_stmt->execute();
    $current = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$current) {
        ResponseHelper::error("User not found", 404);
        return;
    }
    
    // Verify current password
    if (!AuthHelper::verifyPassword($data['current_password'], $current['password_hash'])) {
        ResponseHelper::error("Current password is incorrect", 401);
        return;
    }
    
    // Validate new password — must match frontend policy
    if (!preg_match('/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/', $data['new_password'])) {
        ResponseHelper::error("New password must be at least 8 characters with at least 1 uppercase letter and 1 special character", 400);
        return;
    }
    
    // Hash new password
    $new_hash = AuthHelper::hashPassword($data['new_password']);
    
    // Update password — first_login column only exists on staff table, not users
    if ($user['type'] == 'client') {
        $update_query = "UPDATE users SET password_hash = :hash WHERE id = :id";
    } else {
        $update_query = "UPDATE staff SET password_hash = :hash, first_login = 0 WHERE id = :id";
    }
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':hash', $new_hash);
    $update_stmt->bindParam(':id', $user['id']);
    
    if ($update_stmt->execute()) {
        ResponseHelper::success(null, "Password changed successfully");
    } else {
        ResponseHelper::error("Failed to change password", 500);
    }
}
?>