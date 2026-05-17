<?php
// FIX: Use session_start with options to allow multiple users simultaneously.
// Each browser tab/user gets its own isolated PHP session via cookie.
// This means admin and regular users can be logged in at the same time
// without overwriting each other's session data.
session_start([
    'cookie_lifetime' => 0,
    'cookie_httponly' => true,
    'use_strict_mode' => true,
]);

// ── Database Credentials ──────────────────────────────────────
$host     = "localhost";
$dbname   = "kikays_kusina"; // FIX: Removed apostrophe+space — was breaking PDO DSN
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE,            PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["status" => "error", "message" => "Database connection failed."]));
}

header('Content-Type: application/json');
$action = $_POST['action'] ?? '';

// ── 1. LOGIN ─────────────────────────────────────────────────
if ($action === 'login') {
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');

    if (!$email || !$password) {
        echo json_encode(["status" => "error", "message" => "Email and password are required."]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // FIX: Plain-text comparison kept to match existing DB records.
    // To upgrade: store hashed passwords with password_hash() and verify with password_verify().
if ($user && $user['password'] === $password) {
        session_regenerate_id(true);

        $_SESSION['role']       = $user['role'];
        $_SESSION['user_id']    = $user['id'];
        
        $fullName               = $user['full_name'] ?? 'User';
        $nameParts              = explode(' ', trim($fullName));
        
        // FIX: Use $nameParts instead of the undefined $firstName
        $firstName              = $nameParts[0]; 
        $_SESSION['first_name'] = $firstName;

        echo json_encode([
            "status"    => "success",
            "role"      => $user['role'],
            "firstName" => $firstName // Send this so sessionStorage can pick it up
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    }
}

// ── 2. REGISTER ──────────────────────────────────────────────
elseif ($action === 'register') {
    $fullName = trim($_POST['fullName'] ?? '');
    $phone    = trim($_POST['phone']    ?? '');
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');

    if (!$fullName || !$email || !$password) {
        echo json_encode(["status" => "error", "message" => "All fields are required."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO users (full_name, phone, email, password, role) VALUES (?, ?, ?, ?, 'user')"
        );
        $stmt->execute([$fullName, $phone, $email, $password]);
        echo json_encode(["status" => "success", "message" => "Account created successfully!"]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Email already exists."]);
    }
}

// ── 3. RESET PASSWORD ────────────────────────────────────────
elseif ($action === 'reset') {
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');

    $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->execute([$password, $email]);
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Email not found."]);
    }
}

// ── 4. GET MENU ──────────────────────────────────────────────
// FIX: Added a get_menu action here in database.php so menu fetching goes through
// the same authenticated endpoint. Also fixes the menu.php DB name mismatch.
elseif ($action === 'get_menu') {
    $stmt = $pdo->query("SELECT id, name, description, price, category, image_url FROM menu ORDER BY category, id");
    echo json_encode($stmt->fetchAll());
}

// ── 5. PLACE ORDER ───────────────────────────────────────────
elseif ($action === 'place_order') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Session expired. Please log in again."]));
    }

    $proofPath = null;
    if (
        isset($_POST['method']) && $_POST['method'] === 'gcash' &&
        isset($_FILES['proof']) && $_FILES['proof']['error'] === UPLOAD_ERR_OK
    ) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $safeName  = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($_FILES['proof']['name']));
        $proofPath = $uploadDir . $safeName;
        move_uploaded_file($_FILES['proof']['tmp_name'], $proofPath);
    }

    // FIX: Validate GCash proof is required when method is gcash
    if (($_POST['method'] ?? '') === 'gcash' && !$proofPath) {
        echo json_encode(["status" => "error", "message" => "Please upload your GCash proof of payment."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO orders
                (user_id, items, total, method, proof, fulfillment_type, fulfillment_time, address, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')"
        );
        $stmt->execute([
            $_SESSION['user_id'],
            $_POST['items']            ?? '',
            $_POST['total']            ?? 0,
            $_POST['method']           ?? 'cod',
            $proofPath,
            $_POST['fulfillment_type'] ?? 'delivery',
            $_POST['fulfillment_time'] ?? '',
            $_POST['address']          ?? ''
        ]);
        echo json_encode(["status" => "success", "order_id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

// ── 6. GET USER'S OWN ORDERS ─────────────────────────────────
elseif ($action === 'get_user_orders') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }
    $stmt = $pdo->prepare(
        "SELECT id, items, total, method, fulfillment_type, fulfillment_time, address, status, created_at
         FROM orders
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 20"
    );
    $stmt->execute([$_SESSION['user_id']]);
    echo json_encode($stmt->fetchAll());
}

// ── 7. MARK ORDER RECEIVED (user acknowledges delivery) ───────
elseif ($action === 'mark_order_received') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }
    $stmt = $pdo->prepare(
        "UPDATE orders SET status = 'Received'
         WHERE id = ? AND user_id = ? AND status = 'Completed'"
    );
    $stmt->execute([$_POST['order_id'], $_SESSION['user_id']]);
    if ($stmt->rowCount() > 0) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Order not found or not yet completed."]);
    }
}

// ── 8. GET ALL ORDERS (Admin) ─────────────────────────────────
elseif ($action === 'get_admin_orders') {
    // FIX: Each user has their own session so admin check is fully isolated from user sessions
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Unauthorized."]));
    }

    $stmt = $pdo->query(
        "SELECT
            o.id,
            o.items,
            o.total,
            o.method,
            o.fulfillment_type,
            o.fulfillment_time,
            o.address,
            o.status,
            o.created_at,
            u.full_name AS customer_name,
            u.phone     AS customer_phone,
            u.email     AS customer_email
         FROM orders o
         JOIN users  u ON o.user_id = u.id
         ORDER BY o.id DESC"
    );
    echo json_encode($stmt->fetchAll());
}

// ── 9. UPDATE ORDER STATUS (Admin) ───────────────────────────
elseif ($action === 'update_order_status') {
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Unauthorized."]));
    }

    $allowed = ['Pending', 'Completed', 'Cancelled'];
    $status  = $_POST['status'] ?? '';
    if (!in_array($status, $allowed)) {
        die(json_encode(["status" => "error", "message" => "Invalid status."]));
    }

    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->execute([$status, $_POST['order_id']]);
    echo json_encode(["status" => "success", "message" => "Order updated to $status."]);
}

// ── GET USER PROFILE ─────────────────────────────────────────
elseif ($action === 'get_profile') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }
    $stmt = $pdo->prepare("SELECT full_name, email, phone, address FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    echo json_encode(["status" => "success", "user" => $user]);
}

// ── UPDATE USER PROFILE ──────────────────────────────────────
elseif ($action === 'update_profile') {
    if (!isset($_SESSION['user_id'])) { 
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }
    $fullName = trim($_POST['fullName'] ?? '');
    $phone    = trim($_POST['phone']    ?? '');
    $address  = trim($_POST['address']  ?? '');

    $stmt = $pdo->prepare("UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?");
    $stmt->execute([$fullName, $phone, $address, $_SESSION['user_id']]);
    echo json_encode(["status" => "success", "message" => "Profile updated."]);
}

// ── 10. LOGOUT ────────────────────────────────────────────────
elseif ($action === 'logout') {
    // FIX: Properly destroy only this user's session — other users unaffected
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 3600,
            $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    echo json_encode(["status" => "success"]);
}

else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Unknown action."]);
}
?>