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

$body   = json_decode(file_get_contents('php://input'), true);
$status = $body['status'] ?? '';

if (!in_array($status, ['Available', 'Busy', 'Onsite'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid status"]);
    exit;
}

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $stmt = $pdo->prepare("UPDATE staff SET availability = :availability WHERE id = :id");
    $stmt->execute([
        ':availability' => json_encode(['status' => $status]),
        ':id'           => $user['id'],
    ]);

    echo json_encode(["success" => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
