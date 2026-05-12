<?php
session_start();

// Database Credentials
$host = "localhost";
$dbname = "kikay's kusina"; 
$username = "root"; 
$password = ""; 

// Centralized PDO Connection
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die(json_encode(["status" => "error", "message" => "Database Connection Failed"]));
}

$action = $_POST['action'] ?? '';

// --- 1. USER AUTHENTICATION ---
if ($action === 'login') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    $stmt->execute([$_POST['email'], $_POST['password']]);
    $user = $stmt->fetch();

    if ($user) {
        $_SESSION['role'] = $user['role'];
        $_SESSION['user_id'] = $user['id'];
        $fullName = $user['full_name'] ?? 'User';
        $nameParts = explode(' ', trim($fullName));
        $_SESSION['first_name'] = $nameParts[0]; 
        
        echo json_encode([
            "status" => "success", 
            "role" => $user['role'], 
            "firstName" => $_SESSION['first_name']
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid Email or Password"]);
    }
}

// --- 2. REGISTRATION & RESET ---
elseif ($action === 'register') {
    $stmt = $pdo->prepare("INSERT INTO users (full_name, phone, email, password, role) VALUES (?, ?, ?, ?, 'user')");
    try {
        $stmt->execute([$_POST['fullName'], $_POST['phone'], $_POST['email'], $_POST['password']]);
        echo json_encode(["status" => "success", "message" => "Account Created Successfully!"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Email already exists."]);
    }
}

elseif ($action === 'reset') {
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

// --- 3. ORDERING SYSTEM ACTIONS ---
elseif ($action === 'place_order') {
    if (!isset($_SESSION['user_id'])) {
        die(json_encode(["status" => "error", "message" => "Session expired. Please login again."]));
    }

    $proofPath = "";
    if ($_POST['method'] === 'gcash' && isset($_FILES['proof'])) {
        $proofPath = "uploads/" . time() . "_" . $_FILES['proof']['name'];
        if (!is_dir('uploads')) mkdir('uploads', 0777, true);
        move_uploaded_file($_FILES['proof']['tmp_name'], $proofPath);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO orders (user_id, items, total, method, proof, fulfillment_type, fulfillment_time, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')");
        $stmt->execute([
            $_SESSION['user_id'], 
            $_POST['items'], 
            $_POST['total'], 
            $_POST['method'], 
            $proofPath,
            $_POST['fulfillment_type'],
            $_POST['fulfillment_time'],
            $_POST['address'] 
        ]);
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

// --- 4. ADMIN PANEL ACTIONS ---
elseif ($action === 'get_admin_orders') {
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        die(json_encode(["status" => "error", "message" => "Unauthorized access."]));
    }
    $stmt = $pdo->query("SELECT o.*, u.full_name as customer_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id DESC");
    echo json_encode($stmt->fetchAll());
}

elseif ($action === 'update_order_status') {
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        die(json_encode(["status" => "error", "message" => "Unauthorized access."]));
    }
    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->execute([$_POST['status'], $_POST['order_id']]);
    echo json_encode(["status" => "success", "message" => "Status updated to " . $_POST['status']]);
}

// --- 5. LOGOUT ---
elseif ($action === 'logout') {
    $_SESSION = array();
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
    }
    session_destroy();
    echo json_encode(["status" => "success"]);
}
?>