<?php
function forgotPassword() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email'])) {
        ResponseHelper::error("Email required", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $reset_token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Check users table
    $check_user = "SELECT id, name, email FROM users WHERE email = :email";
    $stmt_user = $db->prepare($check_user);
    $stmt_user->bindParam(':email', $data['email']);
    $stmt_user->execute();
    
    if ($stmt_user->rowCount() > 0) {
        $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
        $update_query = "UPDATE users SET reset_token = :token, reset_expires = :expires WHERE id = :id";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(':token', $reset_token);
        $update_stmt->bindParam(':expires', $expires);
        $update_stmt->bindParam(':id', $user['id']);
        $update_stmt->execute();
        
        MailerHelper::sendPasswordReset($user['email'], $user['name'], $reset_token, 'client');
        ResponseHelper::success(null, "Password reset link sent to your email");
        return;
    }
    
    // Check staff table
    $check_staff = "SELECT id, name, email FROM staff WHERE email = :email";
    $stmt_staff = $db->prepare($check_staff);
    $stmt_staff->bindParam(':email', $data['email']);
    $stmt_staff->execute();
    
    if ($stmt_staff->rowCount() > 0) {
        $staff = $stmt_staff->fetch(PDO::FETCH_ASSOC);
        $update_query = "UPDATE staff SET reset_token = :token, reset_expires = :expires WHERE id = :id";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(':token', $reset_token);
        $update_stmt->bindParam(':expires', $expires);
        $update_stmt->bindParam(':id', $staff['id']);
        $update_stmt->execute();
        
        MailerHelper::sendPasswordReset($staff['email'], $staff['name'], $reset_token, 'staff');
        ResponseHelper::success(null, "Password reset link sent to your email");
        return;
    }
    
    ResponseHelper::success(null, "If the email exists, a reset link has been sent");
}
?>