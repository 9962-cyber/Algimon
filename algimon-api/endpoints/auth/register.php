<?php
function register() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required_fields = ['name', 'email', 'password', 'phone'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            ResponseHelper::error("$field is required", 400);
            return;
        }
    }
    
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        ResponseHelper::error("Invalid email format", 400);
        return;
    }
    
    if (strlen($data['password']) < 6) {
        ResponseHelper::error("Password must be at least 6 characters", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $check_query = "SELECT id FROM users WHERE email = :email";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':email', $data['email']);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        ResponseHelper::error("Email already registered", 409);
        return;
    }
    
    $password_hash = AuthHelper::hashPassword($data['password']);
    
    $query = "INSERT INTO users (name, email, password_hash, phone) 
              VALUES (:name, :email, :password_hash, :phone)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':name', $data['name']);
    $stmt->bindParam(':email', $data['email']);
    $stmt->bindParam(':password_hash', $password_hash);
    $stmt->bindParam(':phone', $data['phone']);
    
    if ($stmt->execute()) {
        $user_id = $db->lastInsertId();
        $token = AuthHelper::generateToken($user_id, $data['email'], 'client');
        
        $nameParts = explode(' ', trim($data['name']), 2);

        ResponseHelper::success([
            'token' => $token,
            'user'  => [
                'id'        => $user_id,
                'name'      => $data['name'],
                'firstName' => $nameParts[0] ?? '',
                'lastName'  => $nameParts[1] ?? '',
                'email'     => $data['email'],
                'phone'     => $data['phone'],
                'type'      => 'client',
            ]
        ], "Registration successful", 201);

        // Send welcome email (non-blocking — failure does not affect registration)
        if (class_exists('MailerHelper')) {
            MailerHelper::sendClientWelcomeEmail($data['email'], $data['name']);
        }
    } else {
        ResponseHelper::error("Registration failed", 500);
    }
}
?>