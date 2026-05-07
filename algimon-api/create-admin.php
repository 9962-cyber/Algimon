<?php
/**
 * One-time admin account setup.
 * Visit: http://localhost/algimon-api/create-admin.php
 * DELETE this file after use.
 */
require_once 'config/database.php';

$name     = 'Admin User';
<<<<<<< HEAD
$email    = 'algimonfireprotectionservices@gmail.com';
$password = 'Webtools26!';
=======
$email    = 'admin@algimon.com';
$password = 'password';
>>>>>>> ba480c3877aa6c9ada883ba61e008d131871ea95
$role     = 'admin';
$hash     = password_hash($password, PASSWORD_BCRYPT);

try {
    $db = (new Database())->getConnection();

    // Check if already exists
    $chk = $db->prepare("SELECT id FROM staff WHERE email = :email");
    $chk->bindParam(':email', $email);
    $chk->execute();

    if ($chk->rowCount() > 0) {
        // Update password instead
        $upd = $db->prepare("UPDATE staff SET password_hash = :pw, role = :role WHERE email = :email");
        $upd->execute([':pw' => $hash, ':role' => $role, ':email' => $email]);
        echo "<h2 style='font-family:sans-serif;color:green;'>✅ Password reset for <b>$email</b></h2>";
    } else {
        $ins = $db->prepare(
            "INSERT INTO staff (name, email, password_hash, role, first_login) VALUES (:name, :email, :pw, :role, 0)"
        );
        $ins->execute([':name' => $name, ':email' => $email, ':pw' => $hash, ':role' => $role]);
        echo "<h2 style='font-family:sans-serif;color:green;'>✅ Admin account created!</h2>";
    }

    echo "<p style='font-family:sans-serif;'>
        <b>Email:</b> $email<br>
        <b>Password:</b> $password<br><br>
        <a href='http://localhost/algimon-frontend/login.html'>→ Go to Login</a><br><br>
        <span style='color:red;'><b>⚠ Delete this file after logging in!</b></span>
    </p>";

} catch (Exception $e) {
    echo "<p style='color:red;font-family:sans-serif;'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
