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

if ($action === 'register') {
    $stmt = $pdo->prepare("INSERT INTO users (full_name, phone, email, password) VALUES (?, ?, ?, ?)");
    try {
        $stmt->execute([$_POST['fullName'], $_POST['phone'], $_POST['email'], $_POST['password']]);
        echo json_encode(["status" => "success", "message" => "Account Created Successfully!"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Email already exists."]);
    }
}

if ($action === 'reset') {
    $email = $_POST['email'];
    $newPass = $_POST['password'];
    $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->execute([$newPass, $email]);
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Email not found."]);
    }
}

// --- UPDATE ADDRESS ---
if ($action === 'update_address') {
    $fullAddr = $_POST['street'] . ", " . $_POST['brgy'] . ", " . $_POST['city'];
    $stmt = $pdo->prepare("UPDATE users SET address = ?, phone = ? WHERE id = ?");
    $stmt->execute([$fullAddr, $_POST['phone'], $_SESSION['user_id']]);
    echo json_encode(["status" => "success"]);
}

// --- PLACE ORDER ---
if ($action === 'place_order') {
    $proofPath = "";
    if ($_POST['method'] === 'GCash' && isset($_FILES['proof'])) {
        $proofPath = "uploads/" . time() . "_" . $_FILES['proof']['name'];
        if (!is_dir('uploads')) mkdir('uploads');
        move_uploaded_file($_FILES['proof']['tmp_name'], $proofPath);
    }

    $stmt = $pdo->prepare("INSERT INTO orders (user_id, items, total, method, proof, status) VALUES (?, ?, ?, ?, ?, 'Pending')");
    $stmt->execute([
        $_SESSION['user_id'], 
        $_POST['items'], 
        $_POST['total'], 
        $_POST['method'], 
        $proofPath
    ]);
    echo json_encode(["status" => "success"]);
}
?>