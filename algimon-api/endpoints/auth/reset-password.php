<?php
function resetPassword() {
    // Get input data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    if (!isset($data['token']) || !isset($data['password'])) {
        ResponseHelper::error("Token and password required", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $token = $data['token'];
    $newPassword = $data['password'];
    
    // Check users table
    $query = "SELECT id, reset_expires FROM users WHERE reset_token = :token";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':token', $token);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    $table = 'users';
    
    if (!$user) {
        // Check staff table
        $query = "SELECT id, reset_expires FROM staff WHERE reset_token = :token";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $table = 'staff';
    }
    
    if (!$user) {
        ResponseHelper::error("Invalid or expired reset token", 400);
        return;
    }
    
    // Check expiration
    $expires = strtotime($user['reset_expires']);
    if ($expires < time()) {
        ResponseHelper::error("Reset token has expired. Please request a new one.", 400);
        return;
    }
    
    // Validate password — must match frontend policy
    if (!preg_match('/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/', $newPassword)) {
        ResponseHelper::error("Password must be at least 8 characters with at least 1 uppercase letter and 1 special character", 400);
        return;
    }
    
    // Hash new password
    $password_hash = AuthHelper::hashPassword($newPassword);
    
    // Update database
    $update_query = "UPDATE $table SET password_hash = :hash, reset_token = NULL, reset_expires = NULL WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':hash', $password_hash);
    $update_stmt->bindParam(':id', $user['id']);
    
    if ($update_stmt->execute()) {
        ResponseHelper::success(null, "Password reset successful");
    } else {
        ResponseHelper::error("Failed to reset password", 500);
    }
}
?>