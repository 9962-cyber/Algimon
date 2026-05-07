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

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $stmt = $pdo->prepare("SELECT id, name, email, phone, role, availability FROM staff WHERE id = :id");
    $stmt->execute([':id' => $user['id']]);
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        http_response_code(404);
        echo json_encode(["error" => "Staff not found"]);
        exit;
    }

    echo json_encode([
        "id"           => $staff['id'],
        "name"         => $staff['name'],
        "email"        => $staff['email'],
        "phone"        => $staff['phone'],
        "role"         => $staff['role'],
        "availability" => $staff['availability'] ? json_decode($staff['availability'], true) : null,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
