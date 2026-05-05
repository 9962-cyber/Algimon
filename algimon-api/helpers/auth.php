<?php
require_once __DIR__ . '/../vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthHelper {
    private static $secret_key = "AlgimonSecureKey2024!@#$%FireProtection";
    private static $algorithm = 'HS256';
    
    public static function generateToken($user_id, $email, $user_type) {
        $issued_at = time();
        $expiration = $issued_at + (7 * 24 * 60 * 60);
        
        $payload = [
            'iat' => $issued_at,
            'exp' => $expiration,
            'user_id' => $user_id,
            'email' => $email,
            'user_type' => $user_type
        ];
        
        return JWT::encode($payload, self::$secret_key, self::$algorithm);
    }
    
    public static function validateToken() {
        $auth_header = null;

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (isset($headers['Authorization'])) {
                $auth_header = $headers['Authorization'];
            } elseif (isset($headers['authorization'])) {
                $auth_header = $headers['authorization'];
            }
        }

        if (!$auth_header && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (!$auth_header && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        if (!$auth_header) {
            return null;
        }

        $token = str_replace('Bearer ', '', $auth_header);
        
        try {
            $decoded = JWT::decode($token, new Key(self::$secret_key, self::$algorithm));
            return (array) $decoded;
        } catch(Exception $e) {
            return null;
        }
    }
    
    public static function getCurrentUser() {
        $token_data = self::validateToken();
        if (!$token_data) {
            return null;
        }
        
        $database = new Database();
        $db = $database->getConnection();
        
        if ($token_data['user_type'] == 'client') {
            $query = "SELECT id, name, email, phone, 'client' as type FROM users WHERE id = :id";
        } else {
            $query = "SELECT id, name, email, phone, role as type FROM staff WHERE id = :id";
        }
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $token_data['user_id']);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT);
    }
    
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    public static function generateTempPassword($length = 10) {
        return substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'), 0, $length);
    }
}
?>