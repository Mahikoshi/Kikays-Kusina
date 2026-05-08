<?php
include 'database.php'; // database.php already contains session_start()

// Security check: Redirect if not logged in
if (!isset($_SESSION['user_id'])) { 
    header("Location: login.html"); 
    exit(); 
}

// Fetch user data from your existing database
$stmt = $pdo->prepare("SELECT full_name, address, phone FROM users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

// Extract First Name for the "Hey, User!" greeting
$firstName = "User";
if (!empty($user['full_name'])) {
    $firstName = explode(' ', trim($user['full_name']))[0];
}

// Load the HTML structure
include 'menu.html';
?>