<?php
/**
 * Products API
 * Admin manages physical inventory items (name, category, location, quantity, expiry).
 * Expiry statistics (Expired / Expiring Soon ≤30d / Warning 30-90d) are computed in DB.
 */

// GET /products - list all products (admin)
function getProducts() {
    AuthMiddleware::requireAdmin();
    $db = (new Database())->getConnection();

    $stmt = $db->prepare(
        "SELECT id, NAME AS name, category, location, quantity,
                expiry_date AS expiry, created_at
         FROM products
         ORDER BY category ASC, NAME ASC"
    );
    $stmt->execute();
    ResponseHelper::success($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// GET /products/stats - expiry statistics for the stat cards
function getProductStats() {
    AuthMiddleware::requireAdmin();
    $db = (new Database())->getConnection();

    $row = $db->query(
        "SELECT
            COUNT(*)                                                   AS total,
            SUM(expiry_date IS NOT NULL AND expiry_date < CURDATE())   AS expired,
            SUM(expiry_date >= CURDATE()
                AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)) AS expiring_soon,
            SUM(expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)) AS warning
         FROM products"
    )->fetch(PDO::FETCH_ASSOC);

    ResponseHelper::success([
        'total'         => (int)$row['total'],
        'expired'       => (int)$row['expired'],
        'expiring_soon' => (int)$row['expiring_soon'],
        'warning'       => (int)$row['warning'],
    ]);
}

// GET /products/:id - single product
function getProduct($id) {
    AuthMiddleware::requireAdmin();
    $db = (new Database())->getConnection();

    $stmt = $db->prepare(
        "SELECT id, NAME AS name, category, location, quantity,
                expiry_date AS expiry, created_at
         FROM products WHERE id = :id"
    );
    $stmt->bindParam(':id', $id);
    $stmt->execute();

    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$product) { ResponseHelper::error("Product not found", 404); return; }
    ResponseHelper::success($product);
}

// POST /products - create product (admin only)
function createProduct() {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    $name     = trim($data['name']     ?? '');
    $category = trim($data['category'] ?? '');
    $location = trim($data['location'] ?? '');

    if (!$name || !$category || !$location) {
        ResponseHelper::error("Name, category, and location are required", 400);
        return;
    }

    $db       = (new Database())->getConnection();
    $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;
    $expiry   = $data['expiry'] ?: null;

    $stmt = $db->prepare(
        "INSERT INTO products (NAME, category, location, quantity, expiry_date)
         VALUES (:name, :category, :location, :quantity, :expiry_date)"
    );
    $stmt->bindParam(':name',        $name);
    $stmt->bindParam(':category',    $category);
    $stmt->bindParam(':location',    $location);
    $stmt->bindParam(':quantity',    $quantity);
    $stmt->bindParam(':expiry_date', $expiry);

    if ($stmt->execute()) {
        ResponseHelper::success(['id' => (int)$db->lastInsertId()], "Product created successfully", 201);
    } else {
        ResponseHelper::error("Failed to create product", 500);
    }
}

// PUT /products/:id - update product (admin only)
function updateProduct($id) {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    $db        = (new Database())->getConnection();
    $checkStmt = $db->prepare("SELECT id FROM products WHERE id = :id");
    $checkStmt->bindParam(':id', $id);
    $checkStmt->execute();
    if ($checkStmt->rowCount() == 0) { ResponseHelper::error("Product not found", 404); return; }

    // Map camelCase / frontend keys → DB columns
    $map = [
        'name'     => 'NAME',
        'category' => 'category',
        'location' => 'location',
        'quantity' => 'quantity',
        'expiry'   => 'expiry_date',
    ];

    $fields = [];
    $params = [':id' => $id];
    foreach ($map as $input => $col) {
        if (array_key_exists($input, $data)) {
            $fields[]          = "$col = :$input";
            $params[":$input"] = ($data[$input] === '') ? null : $data[$input];
        }
    }

    if (empty($fields)) { ResponseHelper::error("No fields to update", 400); return; }

    $stmt = $db->prepare("UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id");
    if ($stmt->execute($params)) {
        ResponseHelper::success(null, "Product updated successfully");
    } else {
        ResponseHelper::error("Failed to update product", 500);
    }
}

// DELETE /products/:id - delete product (admin only)
function deleteProduct($id) {
    AuthMiddleware::requireAdmin();
    $db   = (new Database())->getConnection();
    $stmt = $db->prepare("DELETE FROM products WHERE id = :id");
    $stmt->bindParam(':id', $id);
    if ($stmt->execute() && $stmt->rowCount() > 0) {
        ResponseHelper::success(null, "Product deleted successfully");
    } else {
        ResponseHelper::error("Product not found", 404);
    }
}
?>
