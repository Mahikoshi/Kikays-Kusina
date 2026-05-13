<?php
// FIX: DB name updated to match setup.sql (removed apostrophe + space)
header('Content-Type: application/json');

$host     = "localhost";
$dbname   = "kikays_kusina";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt  = $pdo->query("SELECT id, name, description, price, category, image_url FROM menu ORDER BY category, id");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($items);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
}
?>