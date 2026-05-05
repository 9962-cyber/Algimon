<?php
echo "<h1>File Check</h1>";

$files = [
    'config/database.php',
    'helpers/response.php',
    'helpers/auth.php',
    'middleware/auth_middleware.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "✅ $file exists<br>";
    } else {
        echo "❌ $file MISSING!<br>";
    }
}

// Check if classes are defined
echo "<h2>Class Check</h2>";

require_once 'config/database.php';
echo "Database class: " . (class_exists('Database') ? '✅ EXISTS' : '❌ MISSING') . "<br>";

require_once 'helpers/response.php';
echo "ResponseHelper class: " . (class_exists('ResponseHelper') ? '✅ EXISTS' : '❌ MISSING') . "<br>";

require_once 'helpers/auth.php';
echo "AuthHelper class: " . (class_exists('AuthHelper') ? '✅ EXISTS' : '❌ MISSING') . "<br>";
?>