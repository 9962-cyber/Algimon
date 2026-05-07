<?php
class AuthMiddleware {
    public static function requireAuth() {
        $user = AuthHelper::getCurrentUser();
        if (!$user) {
            ResponseHelper::error("Unauthorized access. Please login.", 401);
            exit;
        }
        return $user;
    }
    
    public static function requireClient() {
        $user = self::requireAuth();
        if ($user['type'] !== 'client') {
            ResponseHelper::error("Client access required", 403);
            exit;
        }
        return $user;
    }
    
    public static function requireStaff() {
        $user = self::requireAuth();
        $allowed_types = ['technician', 'senior_technician', 'manager', 'admin'];
        if (!in_array($user['type'], $allowed_types)) {
            ResponseHelper::error("Staff access required", 403);
            exit;
        }
        return $user;
    }
    
    public static function requireAdmin() {
        $user = self::requireAuth();
        if (!in_array($user['type'], ['manager', 'admin'])) {
            ResponseHelper::error("Admin access required", 403);
            exit;
        }
        return $user;
    }
}
?>