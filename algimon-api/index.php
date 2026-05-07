<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config/database.php';
require_once 'helpers/response.php';
require_once 'helpers/auth.php';
require_once 'helpers/mailer.php';
require_once 'middleware/auth_middleware.php';

// Get the request path
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/algimon-api';
if (strpos($request_uri, $base_path) === 0) {
    $request_uri = substr($request_uri, strlen($base_path));
}

// Remove query string
$request_uri = strtok($request_uri, '?');
$path = trim($request_uri, '/');
$parts = explode('/', $path);

$resource = $parts[0] ?? '';
$sub_resource = $parts[1] ?? '';
$id = $parts[2] ?? null;

// Handle CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    exit(0);
}

// ============================================
// ROUTING
// ============================================

// ============ AUTH ROUTES ============
if ($resource === 'auth') {
    require_once 'endpoints/auth/login.php';
    require_once 'endpoints/auth/register.php';
    require_once 'endpoints/auth/forgot_password.php';
    
    if ($sub_resource === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        register();
    } elseif ($sub_resource === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        login();
    } elseif ($sub_resource === 'forgot-password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        forgotPassword();
    } elseif ($sub_resource === 'reset-password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $resetFile = __DIR__ . '/endpoints/auth/reset-password.php';
        if (file_exists($resetFile)) {
            require_once $resetFile;
            resetPassword();
        } else {
            ResponseHelper::error("Reset password endpoint file not found", 500);
        }
    } else {
        ResponseHelper::error("Auth endpoint not found", 404);
    }
}

// ============ PROFILE ROUTES ============
elseif ($resource === 'profile') {
    require_once 'endpoints/auth/profile.php';
    
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        updateProfile();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $sub_resource === 'change-password') {
        changePassword();
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ PROPERTIES ROUTES (Member 3) ============
elseif ($resource === 'properties') {
    require_once 'endpoints/properties.php';
    
    $id = $parts[1] ?? null;  // ← properties/3 → parts[1] = 3
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        getProperties();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createProperty();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $id) {
        updateProperty($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteProperty($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ EQUIPMENT ROUTES (Member 3) ============
elseif ($resource === 'equipment') {
    require_once 'endpoints/equipment.php';
    
    $id = $parts[1] ?? null;  // ← equipment/5 → parts[1] = 5
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        getEquipment();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createEquipment();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $id) {
        updateEquipment($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteEquipment($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

elseif ($resource === 'bookings') {
    require_once 'endpoints/bookings.php';
    
    // $parts[0] = 'bookings', $parts[1] = id, $parts[2] = action
    $id     = $parts[1] ?? null;
    $action = $parts[2] ?? null;
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        getClientBookings();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createBooking();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action === 'reschedule') {
        rescheduleBooking($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action === 'cancel') {
        cancelBooking($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ NOTIFICATIONS ROUTES ============
elseif ($resource === 'notifications') {
    require_once 'endpoints/notifications.php';

    $action = $parts[1] ?? null; // e.g. 'read'

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        getNotifications();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action === 'read') {
        markNotificationsRead();
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ PRODUCTS ROUTES (Member B) ============
elseif ($resource === 'products') {
    require_once 'endpoints/products.php';

    $id = $parts[1] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $id === 'stats') {
        getProductStats();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && !$id) {
        getProducts();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $id) {
        getProduct($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createProduct();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $id) {
        updateProduct($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteProduct($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ SERVICES ROUTES (Member B) ============
elseif ($resource === 'services') {
    require_once 'endpoints/services.php';

    $id = $parts[1] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !$id) {
        getServices();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $id) {
        getService($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createService();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $id) {
        updateService($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteService($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ OPERATION RULES ROUTES (Member B) ============
elseif ($resource === 'operation-rules') {
    require_once 'endpoints/operation-rules.php';

    $id = $parts[1] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !$id) {
        getOperationRules();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $id) {
        getOperationRule($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createOperationRule();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $id) {
        updateOperationRule($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteOperationRule($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ REPORTS ROUTES (Member B) ============
elseif ($resource === 'reports') {
    require_once 'endpoints/reports.php';

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $sub_resource === 'dashboard') {
        getDashboardStats();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $sub_resource === 'bookings') {
        getBookingsReport();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $sub_resource === 'services') {
        getServicesReport();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $sub_resource === 'revenue') {
        getRevenueReport();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $sub_resource === 'performance') {
        getPerformanceReport();
    } else {
        ResponseHelper::error("Report type not found", 404);
    }
}

// ============ INQUIRIES ROUTES ============
elseif ($resource === 'inquiries') {
    require_once 'endpoints/inquiries.php';

    $id = $parts[1] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !$id) {
        getInquiries();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $id) {
        getInquiry($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $id) {
        updateInquiry($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteInquiry($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ TIME SLOTS ROUTES ============
elseif ($resource === 'time-slots') {
    require_once 'endpoints/time-slots.php';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        getTimeSlots();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        saveTimeSlots();
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ BLOCKED DATES ROUTES ============
elseif ($resource === 'blocked-dates') {
    require_once 'endpoints/blocked-dates.php';

    $id = $parts[1] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        getBlockedDates();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createBlockedDate();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteBlockedDate($id);
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ AUDIT LOGS ROUTES ============
elseif ($resource === 'audit-logs') {
    require_once 'endpoints/audit-logs.php';

    $id = $parts[1] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        getAuditLogs();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        createAuditLog();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id) {
        deleteAuditLog($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && !$id) {
        clearAuditLogs();
    } else {
        ResponseHelper::error("Method not allowed", 405);
    }
}

// ============ STAFF ROUTES ============
elseif ($resource === 'staff') {
    require_once 'endpoints/staff.php';
    $id = $parts[1] ?? null;
    $action = $parts[2] ?? null;
    if ($_SERVER['REQUEST_METHOD'] === 'GET')                                                    { getStaffList(); }
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST'   && !$id)                                     { createStaff(); }
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST'   && $id && $action === 'reset-password')      { resetStaffPassword($id); }
    elseif ($_SERVER['REQUEST_METHOD'] === 'PUT'    && $id)                                      { updateStaff($id); }
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $id)                                      { deleteStaff($id); }
    else { ResponseHelper::error("Method not allowed", 405); }
}

// ============ ATTENDANCE ROUTES ============
elseif ($resource === 'attendance') {
    require_once 'endpoints/attendance.php';
    $sub = $parts[1] ?? null;
    if ($_SERVER['REQUEST_METHOD'] === 'GET'    && $sub === 'export') { exportAttendance(); }
    elseif ($_SERVER['REQUEST_METHOD'] === 'GET')                     { getAttendance(); }
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST'   && $sub === 'mark') { markAttendance(); }
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $sub)            { clearAttendance($sub); }
    else { ResponseHelper::error("Method not allowed", 405); }
}

// ============ DEFAULT - NOT FOUND ============
else {
    ResponseHelper::error("API endpoint not found: /$resource", 404);
}
?>