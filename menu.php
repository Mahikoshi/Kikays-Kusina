<?php
header('Content-Type: application/json');
$host = "localhost";
$dbname = "kikay's kusina"; 
$username = "root"; 
$password = ""; 

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch all menu items
    // Assumes you have a 'menu' table with columns: id, name, description, price, category, image_url
    $stmt = $pdo->query("SELECT * FROM menu");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($items);
} catch (PDOException $e) {
    echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
}


?>