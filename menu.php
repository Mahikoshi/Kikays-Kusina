<?php
header('Content-Type: application/json');
$host = "localhost";
$dbname = "kikay's kusina"; 
$username = "root"; 
$password = ""; 

// try {
//     $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
//     $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

//     // Fetch all menu items
//     // Assumes you have a 'menu' table with columns: id, name, description, price, category, image_url
//     $stmt = $pdo->query("SELECT * FROM menu");
//     $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

//     echo json_encode($items);
// } catch (PDOException $e) {
//     echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
// }

$menu_items = [
    // Pork Category
    [
        "id" => 1,
        "name" => "Crispy Pata",
        "description" => "Deep-fried pork knuckle served with a soy-vinegar dip.",
        "price" => 750.00,
        "category" => "pork",
        "image_url" => "https://images.pexels.com/photos/9244510/pexels-photo-9244510.jpeg"
    ],
    [
        "id" => 2,
        "name" => "Pork Adobo",
        "description" => "Classic Filipino braised pork in soy sauce, vinegar, and garlic.",
        "price" => 180.00,
        "category" => "pork",
        "image_url" => "https://images.pexels.com/photos/15217983/pexels-photo-15217983.jpeg"
    ],
    // Chicken Category
    [
        "id" => 3,
        "name" => "Chicken Inasal",
        "description" => "Grilled chicken marinated in calamansi, ginger, and lemongrass.",
        "price" => 220.00,
        "category" => "chicken",
        "image_url" => "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"
    ],
    // Seafood Category
    [
        "id" => 4,
        "name" => "Butter Garlic Shrimp",
        "description" => "Fresh shrimp sautéed in a rich garlic butter sauce.",
        "price" => 350.00,
        "category" => "seafood",
        "image_url" => "https://images.pexels.com/photos/566344/pexels-photo-566344.jpeg"
    ],
    // Dessert Category
    [
        "id" => 5,
        "name" => "Leche Flan",
        "description" => "Silky smooth caramel custard.",
        "price" => 120.00,
        "category" => "dessert",
        "image_url" => "https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg"
    ]
];

echo json_encode($menu_items);
?>