<?php
session_start([
    'cookie_lifetime' => 0,
    'cookie_httponly' => true,
    'use_strict_mode' => true,
]);

// ── Database Credentials ──────────────────────────────────────
$host     = "localhost";
$dbname   = "kikays_kusina";
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

    if ($user && $user['password'] === $password) {
        session_regenerate_id(true);

        $_SESSION['role']       = $user['role'];
        $_SESSION['user_id']    = $user['id'];

        $fullName               = $user['full_name'] ?? 'User';
        $nameParts              = explode(' ', trim($fullName));
        $firstName              = $nameParts[0];
        $_SESSION['first_name'] = $firstName;

        echo json_encode([
            "status"    => "success",
            "role"      => $user['role'],
            "firstName" => $firstName
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
elseif ($action === 'get_menu') {
    $stmt = $pdo->query("SELECT id, name, description, price, category, image_url FROM menu ORDER BY category, id");
    echo json_encode($stmt->fetchAll());
}

// ── 5. SAVE ADDRESS ──────────────────────────────────────────
// Saves (or replaces) a delivery address for the logged-in user.
// Returns the new address id so the front-end can attach it to an order.
elseif ($action === 'save_address') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Session expired. Please log in again."]));
    }

    $fullAddress = trim($_POST['full_address'] ?? '');
    if (!$fullAddress) {
        echo json_encode(["status" => "error", "message" => "Address cannot be empty."]);
        exit;
    }

    // Upsert: delete old addresses for this user, then insert a fresh one.
    // (keeps it simple — one active address per user)
    $pdo->prepare("DELETE FROM addresses WHERE user_id = ?")->execute([$_SESSION['user_id']]);
    $stmt = $pdo->prepare("INSERT INTO addresses (user_id, full_address) VALUES (?, ?)");
    $stmt->execute([$_SESSION['user_id'], $fullAddress]);

    echo json_encode(["status" => "success", "address_id" => $pdo->lastInsertId()]);
}

// ── 6. GET SAVED ADDRESS ─────────────────────────────────────
elseif ($action === 'get_address') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }

    $stmt = $pdo->prepare("SELECT id, full_address FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();

    echo json_encode($row
        ? ["status" => "success", "address_id" => $row['id'], "full_address" => $row['full_address']]
        : ["status" => "none"]
    );
}

// ── 7. PLACE ORDER ───────────────────────────────────────────
// New schema: order row → order_details rows → payment row
elseif ($action === 'place_order') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Session expired. Please log in again."]));
    }

    $method          = $_POST['method']           ?? 'cod';
    $fulfillmentType = $_POST['fulfillment_type'] ?? 'delivery';
    $fulfillmentTime = $_POST['fulfillment_time'] ?? null;
    $addressId       = $_POST['address_id']       ?? null;   // null for pickup
    $totalAmount     = floatval($_POST['total']   ?? 0);

    // items_json: JSON array of {menu_id, quantity, line_price}
    $itemsJson = $_POST['items_json'] ?? '[]';
    $items     = json_decode($itemsJson, true);
    if (!is_array($items) || count($items) === 0) {
        echo json_encode(["status" => "error", "message" => "No items in order."]);
        exit;
    }

    // Handle GCash proof upload
    $proofPath = null;
    if (
        $method === 'gcash' &&
        isset($_FILES['proof']) && $_FILES['proof']['error'] === UPLOAD_ERR_OK
    ) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $safeName  = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($_FILES['proof']['name']));
        $proofPath = $uploadDir . $safeName;
        move_uploaded_file($_FILES['proof']['tmp_name'], $proofPath);
    }

    if ($method === 'gcash' && !$proofPath) {
        echo json_encode(["status" => "error", "message" => "Please upload your GCash proof of payment."]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Insert into orders
        $stmt = $pdo->prepare(
            "INSERT INTO orders (user_id, address_id, fulfillment_type, fulfillment_time, total_amount, status)
             VALUES (?, ?, ?, ?, ?, 'Pending')"
        );
        $stmt->execute([
            $_SESSION['user_id'],
            $fulfillmentType === 'pickup' ? null : ($addressId ?: null),
            $fulfillmentType,
            $fulfillmentTime ?: null,
            $totalAmount
        ]);
        $orderId = $pdo->lastInsertId();

        // 2. Insert order_details rows
        $detailStmt = $pdo->prepare(
            "INSERT INTO order_details (order_id, menu_id, quantity, line_price) VALUES (?, ?, ?, ?)"
        );
        foreach ($items as $item) {
            $detailStmt->execute([
                $orderId,
                intval($item['menu_id']),
                intval($item['quantity']),
                floatval($item['line_price'])
            ]);
        }

        // 3. Insert into payments
        $payStmt = $pdo->prepare(
            "INSERT INTO payments (order_id, method, status, amount, proof) VALUES (?, ?, 'pending', ?, ?)"
        );
        $payStmt->execute([$orderId, $method, $totalAmount, $proofPath]);

        $pdo->commit();
        echo json_encode(["status" => "success", "order_id" => $orderId]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}

// ── 8. GET USER'S OWN ORDERS ─────────────────────────────────
elseif ($action === 'get_user_orders') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }

    // Fetch orders with their items (concatenated) and payment method
    $stmt = $pdo->prepare(
        "SELECT
            o.id,
            o.fulfillment_type,
            o.fulfillment_time,
            o.total_amount   AS total,
            o.status,
            o.created_at,
            a.full_address   AS address,
            p.method,
            GROUP_CONCAT(CONCAT(od.quantity, 'x ', m.name) ORDER BY m.name SEPARATOR ', ') AS items
         FROM orders o
         LEFT JOIN addresses    a  ON o.address_id = a.id
         LEFT JOIN payments     p  ON p.order_id   = o.id
         LEFT JOIN order_details od ON od.order_id  = o.id
         LEFT JOIN menu          m  ON m.id         = od.menu_id
         WHERE o.user_id = ?
         GROUP BY o.id, a.full_address, p.method
         ORDER BY o.id DESC
         LIMIT 20"
    );
    $stmt->execute([$_SESSION['user_id']]);
    echo json_encode($stmt->fetchAll());
}

// ── 9. MARK ORDER RECEIVED (user acknowledges delivery) ───────
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
    echo json_encode($stmt->rowCount() > 0
        ? ["status" => "success"]
        : ["status" => "error", "message" => "Order not found or not yet completed."]
    );
}

// ── 10. GET ALL ORDERS (Admin) ────────────────────────────────
elseif ($action === 'get_admin_orders') {
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        http_response_code(403);
        die(json_encode(["status" => "error", "message" => "Unauthorized."]));
    }

    $stmt = $pdo->query(
        "SELECT
            o.id,
            o.fulfillment_type,
            o.fulfillment_time,
            o.total_amount   AS total,
            o.status,
            o.created_at,
            a.full_address   AS address,
            p.method,
            u.full_name      AS customer_name,
            u.phone          AS customer_phone,
            u.email          AS customer_email,
            GROUP_CONCAT(CONCAT(od.quantity, 'x ', m.name) ORDER BY m.name SEPARATOR ', ') AS items
         FROM orders o
         JOIN  users          u  ON u.id          = o.user_id
         LEFT JOIN addresses  a  ON a.id          = o.address_id
         LEFT JOIN payments   p  ON p.order_id    = o.id
         LEFT JOIN order_details od ON od.order_id = o.id
         LEFT JOIN menu        m  ON m.id          = od.menu_id
         GROUP BY o.id, a.full_address, p.method,
                  u.full_name, u.phone, u.email
         ORDER BY o.id DESC"
    );
    echo json_encode($stmt->fetchAll());
}

// ── 11. UPDATE ORDER STATUS (Admin) ──────────────────────────
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

    $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?")->execute([$status, $_POST['order_id']]);

    // Also update the linked payment row status to mirror order status
    if ($status === 'Completed') {
        $pdo->prepare("UPDATE payments SET status = 'completed' WHERE order_id = ?")->execute([$_POST['order_id']]);
    } elseif ($status === 'Cancelled') {
        $pdo->prepare("UPDATE payments SET status = 'cancelled' WHERE order_id = ?")->execute([$_POST['order_id']]);
    }

    echo json_encode(["status" => "success", "message" => "Order updated to $status."]);
}

// ── 12. GET USER PROFILE ──────────────────────────────────────
elseif ($action === 'get_profile') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }

    $stmt = $pdo->prepare(
        "SELECT u.full_name, u.email, u.phone, u.address, a.full_address, a.id AS address_id
         FROM users u
         LEFT JOIN addresses a ON a.user_id = u.id
         WHERE u.id = ?
         ORDER BY a.id DESC
         LIMIT 1"
    );
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();

    // Merge: prefer addresses table value, fall back to users.address column
    $address = $row['full_address'] ?? $row['address'] ?? '';
    echo json_encode(["status" => "success", "user" => [
        "full_name"  => $row['full_name'],
        "email"      => $row['email'],
        "phone"      => $row['phone'],
        "address"    => $address,
        "address_id" => $row['address_id'] ?? null,
    ]]);
}

// ── 13. UPDATE USER PROFILE ───────────────────────────────────
elseif ($action === 'update_profile') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(["status" => "error", "message" => "Not logged in."]));
    }

    $fullName = trim($_POST['fullName'] ?? '');
    $phone    = trim($_POST['phone']    ?? '');
    $address  = trim($_POST['address']  ?? '');

    // Update users table (name, phone, address fallback column)
    $pdo->prepare("UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?")
        ->execute([$fullName, $phone, $address, $_SESSION['user_id']]);

    // Also upsert the addresses table so the cart can reference it
    if ($address) {
        $check = $pdo->prepare("SELECT id FROM addresses WHERE user_id = ?");
        $check->execute([$_SESSION['user_id']]);
        if ($check->fetch()) {
            $pdo->prepare("UPDATE addresses SET full_address = ? WHERE user_id = ?")
                ->execute([$address, $_SESSION['user_id']]);
        } else {
            $pdo->prepare("INSERT INTO addresses (user_id, full_address) VALUES (?, ?)")
                ->execute([$_SESSION['user_id'], $address]);
        }
    }

    echo json_encode(["status" => "success", "message" => "Profile updated."]);
}

// ── 14. LOGOUT ────────────────────────────────────────────────
elseif ($action === 'logout') {
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