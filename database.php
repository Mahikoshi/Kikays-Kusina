<?php
session_start();

$host = "localhost";
$dbname = "kikay's kusina";
$username = "root"; 
$password = ""; 

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["status" => "error", "message" => "Database Connection Failed"]));
}

$action = $_POST['action'] ?? '';

// --- LOGIN LOGIC ---
if ($action === 'login') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    $stmt->execute([$_POST['email'], $_POST['password']]);
    $user = $stmt->fetch();

    if ($user) {
        $_SESSION['role'] = $user['role'];
        echo json_encode(["status" => "success", "role" => $user['role']]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid Email or Password"]);
    }
}

// --- REGISTER LOGIC ---
if ($action === 'register') {
    $stmt = $pdo->prepare("INSERT INTO users (full_name, phone, email, password) VALUES (?, ?, ?, ?)");
    try {
        $stmt->execute([$_POST['fullName'], $_POST['phone'], $_POST['email'], $_POST['password']]);
        echo json_encode(["status" => "success", "message" => "Account Created Successfully!"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Email already exists."]);
    }
}

// --- RESET PASSWORD ---
if ($action === 'reset') {
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
    $stmt->execute([$_POST['password'], $_POST['email']]);
    if ($stmt->rowCount() > 0) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Email not found."]);
    }
}
?>