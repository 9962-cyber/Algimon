<?php
/**
 * Reports API - Member B
 * Admin analytics: bookings summary, revenue, and service breakdowns
 */

// GET /reports/dashboard - Overall dashboard stats
function getDashboardStats() {
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    // Booking counts by status
    $bookingStats = $db->query("
        SELECT STATUS as status, COUNT(*) as count
        FROM appointments
        GROUP BY STATUS
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Revenue this month
    $revenue = $db->query("
        SELECT
            SUM(COALESCE(actual_amount, price_estimate, 0)) AS total_revenue,
            SUM(price_estimate) AS estimated_revenue
        FROM appointments
        WHERE STATUS = 'completed'
          AND MONTH(appointment_date) = MONTH(CURDATE())
          AND YEAR(appointment_date)  = YEAR(CURDATE())
    ")->fetch(PDO::FETCH_ASSOC);

    // Total clients
    $clients = $db->query("
        SELECT COUNT(*) AS total FROM users WHERE type = 'client'
    ")->fetch(PDO::FETCH_ASSOC);

    // Upcoming appointments (next 7 days)
    $upcoming = $db->query("
        SELECT COUNT(*) AS count
        FROM appointments
        WHERE status IN ('pending','confirmed')
          AND appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ")->fetch(PDO::FETCH_ASSOC);

    // New inquiries (unread/open)
    $inquiries = $db->query("
        SELECT COUNT(*) AS count FROM inquiries WHERE status = 'open'
    ")->fetch(PDO::FETCH_ASSOC);

    ResponseHelper::success([
        'booking_stats'      => $bookingStats,
        'revenue'            => $revenue,
        'total_clients'      => $clients['total'],
        'upcoming_this_week' => $upcoming['count'],
        'open_inquiries'     => $inquiries['count'],
    ]);
}

// GET /reports/bookings - Bookings report with date range
function getBookingsReport() {
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    $from = $_GET['from'] ?? date('Y-m-01');         // default: first day of current month
    $to   = $_GET['to']   ?? date('Y-m-t');           // default: last day of current month

    $query = "SELECT
                  DATE(appointment_date) AS date,
                  COUNT(*)               AS total,
                  SUM(CASE WHEN STATUS = 'completed'   THEN 1 ELSE 0 END) AS completed,
                  SUM(CASE WHEN STATUS = 'cancelled'   THEN 1 ELSE 0 END) AS cancelled,
                  SUM(CASE WHEN STATUS = 'approved'    THEN 1 ELSE 0 END) AS approved,
                  SUM(CASE WHEN STATUS = 'in-progress' THEN 1 ELSE 0 END) AS in_progress,
                  SUM(CASE WHEN STATUS = 'pending'     THEN 1 ELSE 0 END) AS pending,
                  SUM(actual_amount) AS revenue
              FROM appointments
              WHERE appointment_date BETWEEN :from AND :to
              GROUP BY DATE(appointment_date)
              ORDER BY date ASC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':from', $from);
    $stmt->bindParam(':to',   $to);
    $stmt->execute();

    $report = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ResponseHelper::success(['from' => $from, 'to' => $to, 'data' => $report]);
}

// GET /reports/services - Service type breakdown
function getServicesReport() {
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    $query = "SELECT
                  service_type,
                  COUNT(*)           AS total_bookings,
                  SUM(actual_amount) AS total_revenue,
                  AVG(actual_amount) AS avg_revenue
              FROM appointments
              WHERE STATUS = 'completed'
              GROUP BY service_type
              ORDER BY total_bookings DESC";

    $stmt = $db->prepare($query);
    $stmt->execute();

    $report = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ResponseHelper::success($report);
}

// GET /reports/performance?month=YYYY-MM — all data for the Performance Report page
function getPerformanceReport() {
    AuthMiddleware::requireAdmin();
    $db = (new Database())->getConnection();

    $monthParam = $_GET['month'] ?? date('Y-m');
    if (!preg_match('/^\d{4}-\d{2}$/', $monthParam)) {
        ResponseHelper::error("Invalid month format. Use YYYY-MM", 400);
        return;
    }
    [$year, $month] = explode('-', $monthParam);
    $from = "$year-$month-01";
    $to   = date('Y-m-t', strtotime($from));

    // ── 1. Key metrics ────────────────────────────────────────────────────────
    $mStmt = $db->prepare("
        SELECT
            COUNT(*)                                                                AS total,
            SUM(status = 'completed')                                               AS completed,
            SUM(status IN ('cancelled','declined'))                                 AS declined,
            SUM(status = 'pending')                                                 AS pending,
            SUM(status IN ('confirmed','approved'))                                 AS confirmed,
            SUM(status = 'in-progress')                                             AS in_progress,
            COALESCE(SUM(CASE WHEN status='completed' THEN COALESCE(actual_amount, price_estimate, 0) ELSE 0 END),0) AS revenue
        FROM appointments
        WHERE appointment_date BETWEEN :from AND :to
    ");
    $mStmt->execute([':from' => $from, ':to' => $to]);
    $m = $mStmt->fetch(PDO::FETCH_ASSOC);

    $total   = (int)$m['total'];
    $metrics = [
        'total'             => $total,
        'completed'         => (int)$m['completed'],
        'declined'          => (int)$m['declined'],
        'pending'           => (int)$m['pending'],
        'confirmed'         => (int)$m['confirmed'],
        'in_progress'       => (int)$m['in_progress'],
        'revenue'           => (float)$m['revenue'],
        'completion_rate'   => $total > 0 ? round($m['completed'] / $total * 100, 1) : 0,
        'cancellation_rate' => $total > 0 ? round($m['declined']  / $total * 100, 1) : 0,
    ];

    // ── 2. Top services for selected month ────────────────────────────────────
    $svcStmt = $db->prepare("
        SELECT service_type AS service, COUNT(*) AS count
        FROM appointments
        WHERE appointment_date BETWEEN :from AND :to
          AND service_type IS NOT NULL AND service_type != ''
        GROUP BY service_type
        ORDER BY count DESC
        LIMIT 8
    ");
    $svcStmt->execute([':from' => $from, ':to' => $to]);
    $topServices = $svcStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($topServices as &$s) $s['count'] = (int)$s['count'];
    unset($s);

    // ── 3. Six-month trend ending at selected month ───────────────────────────
    $trendStart = date('Y-m-01', strtotime("$from -5 months"));
    $tStmt = $db->prepare("
        SELECT
            YEAR(appointment_date)          AS yr,
            MONTH(appointment_date)         AS mn,
            MONTHNAME(appointment_date)     AS month_name,
            SUM(status = 'completed')       AS completed,
            SUM(status IN ('cancelled','declined')) AS cancelled
        FROM appointments
        WHERE appointment_date BETWEEN :start AND :end
        GROUP BY yr, mn, month_name
        ORDER BY yr ASC, mn ASC
    ");
    $tStmt->execute([':start' => $trendStart, ':end' => $to]);
    $trendRows = $tStmt->fetchAll(PDO::FETCH_ASSOC);

    $trendMap = [];
    foreach ($trendRows as $r) {
        $key = $r['yr'] . '-' . str_pad($r['mn'], 2, '0', STR_PAD_LEFT);
        $trendMap[$key] = ['month' => $r['month_name'], 'completed' => (int)$r['completed'], 'cancelled' => (int)$r['cancelled']];
    }
    $trend = [];
    for ($i = 5; $i >= 0; $i--) {
        $d   = date('Y-m', strtotime("$from -$i months"));
        $mn  = date('F', strtotime("$d-01"));
        $trend[] = $trendMap[$d] ?? ['month' => $mn, 'completed' => 0, 'cancelled' => 0];
    }

    // ── 4. Appointment list for selected month ────────────────────────────────
    $aStmt = $db->prepare("
        SELECT id, client_name, service_type, appointment_date,
               COALESCE(actual_amount, price_estimate, 0) AS amount,
               status
        FROM appointments
        WHERE appointment_date BETWEEN :from AND :to
        ORDER BY appointment_date DESC, id DESC
    ");
    $aStmt->execute([':from' => $from, ':to' => $to]);
    $appointments = $aStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($appointments as &$a) {
        $a['id']     = (int)$a['id'];
        $a['amount'] = (float)$a['amount'];
    }
    unset($a);

    ResponseHelper::success([
        'month'        => $monthParam,
        'metrics'      => $metrics,
        'top_services' => $topServices,
        'trend'        => $trend,
        'appointments' => $appointments,
    ]);
}

// GET /reports/revenue - Monthly revenue summary
function getRevenueReport() {
    AuthMiddleware::requireAdmin();

    $database = new Database();
    $db = $database->getConnection();

    $year = $_GET['year'] ?? date('Y');

    $query = "SELECT
                  MONTH(appointment_date)     AS month,
                  MONTHNAME(appointment_date) AS month_name,
                  COUNT(*)                    AS total_completed,
                  SUM(actual_amount)          AS total_revenue,
                  SUM(price_estimate)         AS estimated_revenue
              FROM appointments
              WHERE STATUS = 'completed'
                AND YEAR(appointment_date) = :year
              GROUP BY MONTH(appointment_date)
              ORDER BY month ASC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':year', $year);
    $stmt->execute();

    $report = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ResponseHelper::success(['year' => $year, 'data' => $report]);
}
?>
