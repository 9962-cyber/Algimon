<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/response.php';

header("Content-Type: application/json");

$user = AuthHelper::getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

if ($user['type'] === 'client') {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden"]);
    exit;
}

$body            = json_decode(file_get_contents('php://input'), true);
$currentPassword = $body['current_password'] ?? '';
$newPassword     = $body['new_password'] ?? '';

if (!$currentPassword || !$newPassword) {
    http_response_code(400);
    echo json_encode(["error" => "Both current and new password are required"]);
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(["error" => "New password must be at least 8 characters"]);
    exit;
}

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $stmt = $pdo->prepare("SELECT password_hash FROM staff WHERE id = :id");
    $stmt->execute([':id' => $user['id']]);
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$staff || !AuthHelper::verifyPassword($currentPassword, $staff['password_hash'])) {
        http_response_code(401);
        echo json_encode(["error" => "Current password is incorrect"]);
        exit;
    }

    $newHash = AuthHelper::hashPassword($newPassword);
    $update  = $pdo->prepare("UPDATE staff SET password_hash = :hash, first_login = 0 WHERE id = :id");
    $update->execute([':hash' => $newHash, ':id' => $user['id']]);

    echo json_encode(["success" => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
