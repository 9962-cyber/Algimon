<?php
/**
 * Services API
 * Admin manages service pricing (name, price range, unit, renewable, renewal period).
 * Accepts and returns camelCase keys to match the frontend data model.
 */

// GET /services - list all services
function getServices() {
    $db   = (new Database())->getConnection();
    $stmt = $db->prepare(
        "SELECT id, NAME AS name,
                min_price AS minPrice, max_price AS maxPrice,
                unit, renewable,
                renewal_value AS renewalValue,
                renewal_unit  AS renewalUnit,
                created_at
         FROM services
         ORDER BY NAME ASC"
    );
    $stmt->execute();
    ResponseHelper::success(_castServices($stmt->fetchAll(PDO::FETCH_ASSOC)));
}

// GET /services/:id - single service
function getService($id) {
    $db   = (new Database())->getConnection();
    $stmt = $db->prepare(
        "SELECT id, NAME AS name,
                min_price AS minPrice, max_price AS maxPrice,
                unit, renewable,
                renewal_value AS renewalValue,
                renewal_unit  AS renewalUnit,
                created_at
         FROM services WHERE id = :id"
    );
    $stmt->bindParam(':id', $id);
    $stmt->execute();

    $service = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$service) { ResponseHelper::error("Service not found", 404); return; }
    ResponseHelper::success(_castService($service));
}

// POST /services - create service (admin only)
function createService() {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    $name = trim($data['name'] ?? '');
    if (!$name) { ResponseHelper::error("Service name is required", 400); return; }

    $minPrice = isset($data['minPrice']) ? (float)$data['minPrice'] : null;
    $maxPrice = isset($data['maxPrice']) ? (float)$data['maxPrice'] : null;

    if ($minPrice !== null && $maxPrice !== null && $minPrice > $maxPrice) {
        ResponseHelper::error("Min price cannot exceed max price", 400);
        return;
    }

    $renewable    = !empty($data['renewable']) ? 1 : 0;
    $renewalValue = ($renewable && isset($data['renewalValue'])) ? (int)$data['renewalValue'] : null;
    $renewalUnit  = ($renewable && isset($data['renewalUnit']))  ? $data['renewalUnit'] : 'months';

    $db   = (new Database())->getConnection();
    $stmt = $db->prepare(
        "INSERT INTO services
            (NAME, min_price, max_price, unit, renewable, renewal_value, renewal_unit)
         VALUES
            (:name, :min_price, :max_price, :unit, :renewable, :renewal_value, :renewal_unit)"
    );
    $unit = $data['unit'] ?? null;
    $stmt->bindParam(':name',          $name);
    $stmt->bindParam(':min_price',     $minPrice);
    $stmt->bindParam(':max_price',     $maxPrice);
    $stmt->bindParam(':unit',          $unit);
    $stmt->bindParam(':renewable',     $renewable);
    $stmt->bindParam(':renewal_value', $renewalValue);
    $stmt->bindParam(':renewal_unit',  $renewalUnit);

    if ($stmt->execute()) {
        ResponseHelper::success(['id' => (int)$db->lastInsertId()], "Service created successfully", 201);
    } else {
        ResponseHelper::error("Failed to create service", 500);
    }
}

// PUT /services/:id - update service (admin only)
function updateService($id) {
    AuthMiddleware::requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true);

    $db        = (new Database())->getConnection();
    $checkStmt = $db->prepare("SELECT id FROM services WHERE id = :id");
    $checkStmt->bindParam(':id', $id);
    $checkStmt->execute();
    if ($checkStmt->rowCount() == 0) { ResponseHelper::error("Service not found", 404); return; }

    $fields = [];
    $params = [':id' => $id];

    if (isset($data['name'])) {
        $fields[] = "NAME = :name";
        $params[':name'] = trim($data['name']);
    }
    if (array_key_exists('minPrice', $data)) {
        $fields[] = "min_price = :min_price";
        $params[':min_price'] = $data['minPrice'] !== '' ? (float)$data['minPrice'] : null;
    }
    if (array_key_exists('maxPrice', $data)) {
        $fields[] = "max_price = :max_price";
        $params[':max_price'] = $data['maxPrice'] !== '' ? (float)$data['maxPrice'] : null;
    }
    if (array_key_exists('unit', $data)) {
        $fields[] = "unit = :unit";
        $params[':unit'] = $data['unit'] ?: null;
    }
    if (array_key_exists('renewable', $data)) {
        $renewable = !empty($data['renewable']) ? 1 : 0;
        $fields[] = "renewable = :renewable";
        $params[':renewable'] = $renewable;

        $renewalValue = ($renewable && isset($data['renewalValue'])) ? (int)$data['renewalValue'] : null;
        $renewalUnit  = ($renewable && isset($data['renewalUnit']))  ? $data['renewalUnit'] : 'months';

        $fields[] = "renewal_value = :renewal_value";
        $fields[] = "renewal_unit = :renewal_unit";
        $params[':renewal_value'] = $renewalValue;
        $params[':renewal_unit']  = $renewalUnit;
    }

    if (empty($fields)) { ResponseHelper::error("No fields to update", 400); return; }

    $stmt = $db->prepare("UPDATE services SET " . implode(', ', $fields) . " WHERE id = :id");
    if ($stmt->execute($params)) {
        ResponseHelper::success(null, "Service updated successfully");
    } else {
        ResponseHelper::error("Failed to update service", 500);
    }
}

// DELETE /services/:id - delete service (admin only)
function deleteService($id) {
    AuthMiddleware::requireAdmin();
    $db   = (new Database())->getConnection();
    $stmt = $db->prepare("DELETE FROM services WHERE id = :id");
    $stmt->bindParam(':id', $id);
    if ($stmt->execute() && $stmt->rowCount() > 0) {
        ResponseHelper::success(null, "Service deleted successfully");
    } else {
        ResponseHelper::error("Service not found", 404);
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _castService(array $s): array {
    $s['renewable']    = (bool)$s['renewable'];
    $s['minPrice']     = $s['minPrice']     !== null ? (float)$s['minPrice']     : null;
    $s['maxPrice']     = $s['maxPrice']     !== null ? (float)$s['maxPrice']     : null;
    $s['renewalValue'] = $s['renewalValue'] !== null ? (int)$s['renewalValue']   : null;
    $s['renewalUnit']  = $s['renewalUnit']  ?: 'months';
    return $s;
}

function _castServices(array $rows): array {
    return array_map('_castService', $rows);
}
?>
