<?php
function login() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        ResponseHelper::error("Email and password required", 400);
        return;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
<<<<<<< HEAD
    // Check staff first so a shared email always resolves to the staff account
    $stmt = $db->prepare("SELECT id, name, email, NULL as phone, password_hash, role as type, first_login FROM staff WHERE email = :email");
    $stmt->bindParam(':email', $data['email']);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Fall back to client accounts
    if (!$user) {
        $stmt = $db->prepare("SELECT id, name, email, phone, password_hash, 'client' as type, NULL as first_login FROM users WHERE email = :email");
        $stmt->bindParam(':email', $data['email']);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if ($user) {
=======
    $query = "SELECT id, name, email, phone, password_hash, 'client' as type, NULL as first_login FROM users WHERE email = :email
              UNION
              SELECT id, name, email, NULL as phone, password_hash, role as type, first_login FROM staff WHERE email = :email";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':email', $data['email']);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
>>>>>>> ba480c3877aa6c9ada883ba61e008d131871ea95
        
        if (AuthHelper::verifyPassword($data['password'], $user['password_hash'])) {
            $token = AuthHelper::generateToken($user['id'], $user['email'], $user['type']);

            // Split name into first/last for frontend convenience
            $nameParts = explode(' ', trim($user['name']), 2);
            
            $response_data = [
                'token' => $token,
                'user'  => [
                    'id'        => $user['id'],
                    'name'      => $user['name'],
                    'firstName' => $nameParts[0] ?? '',
                    'lastName'  => $nameParts[1] ?? '',
                    'email'     => $user['email'],
                    'phone'     => $user['phone'] ?? '',
                    'type'      => $user['type'],
                ]
            ];
            
            if ($user['type'] != 'client' && isset($user['first_login'])) {
                $response_data['user']['needs_password_change'] = ($user['first_login'] == 1);
            }
            
            ResponseHelper::success($response_data, "Login successful");
            return;
        }
    }
    
    ResponseHelper::error("Invalid email or password", 401);
}
?>