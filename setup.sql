

-- FIX: Removed apostrophe + space from DB name (was breaking PHP PDO DSN string)
CREATE DATABASE IF NOT EXISTS `kikays_kusina`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kikays_kusina`;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `full_name`  VARCHAR(120)  DEFAULT NULL,
  `phone`      VARCHAR(30)   DEFAULT NULL,
  `email`      VARCHAR(120)  NOT NULL UNIQUE,
  `password`   VARCHAR(255)  NOT NULL,
  `role`       ENUM('user','admin') NOT NULL DEFAULT 'user',
  `address`    VARCHAR(255)  DEFAULT NULL,
  `created_at` TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default admin account (change this password in production!)
INSERT IGNORE INTO `users` (`full_name`, `email`, `password`, `role`)
VALUES ('Admin', 'admin@gmail.com', 'admin123', 'admin');

-- ── MENU ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `menu` (
  `id`          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(120)  NOT NULL,
  `description` TEXT,
  `price`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `category`    VARCHAR(60)   NOT NULL DEFAULT 'pork',
  `image_url`   VARCHAR(500)  DEFAULT NULL
) ENGINE=InnoDB;

-- Sample menu items (using explicit IDs so INSERT IGNORE works on re-runs)
INSERT IGNORE INTO `menu` (`id`, `name`, `description`, `price`, `category`, `image_url`) VALUES
(1,  'Lechon Kawali',   'Crispy deep-fried pork belly.',                        150.00, 'pork',        'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(2,  'Pork Adobo',      'Classic Filipino pork adobo in soy-vinegar sauce.',    120.00, 'pork',        'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(3,  'Crispy Pata',     'Deep-fried pork leg, golden and crunchy.',             220.00, 'pork',        'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(4,  'Chicken Adobo',   'Classic Filipino soy-vinegar braised chicken.',        120.00, 'chicken',     'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(5,  'Fried Chicken',   'Golden crispy fried chicken, Filipino-style.',         130.00, 'chicken',     'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(6,  'Grilled Bangus',  'Marinated milkfish grilled to perfection.',            130.00, 'seafood',     'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(7,  'Kare-Kare',       'Oxtail stew in peanut sauce with veggies.',            200.00, 'beef',        'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(8,  'Beef Caldereta',  'Hearty beef stew with tomatoes and bell peppers.',     180.00, 'beef',        'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(9,  'Halo-Halo',       'The ultimate Filipino summer dessert.',                  85.00, 'dessert',     'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(10, 'Leche Flan',      'Creamy caramel custard, silky smooth.',                  65.00, 'dessert',     'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(11, 'Lechon Kawali',   'Crispy deep-fried pork belly — Best Seller!',           150.00, 'best_seller', 'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(12, 'Party Package A', '5 dishes + rice good for 10 persons.',                  950.00, 'packages',    'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg'),
(13, 'Party Package B', '8 dishes + rice good for 20 persons.',                 1800.00, 'packages',    'https://images.pexels.com/photos/2092906/pexels-photo-2092906.jpeg');

-- ── ORDERS ───────────────────────────────────────────────────
-- FIX: Added 'Received' to ENUM — was missing, caused mark_order_received to silently fail
CREATE TABLE IF NOT EXISTS `orders` (
  `id`               INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id`          INT           NOT NULL,
  `items`            TEXT          NOT NULL,
  `total`            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `method`           VARCHAR(30)   NOT NULL DEFAULT 'cod',
  `proof`            VARCHAR(500)  DEFAULT NULL,
  `fulfillment_type` VARCHAR(20)   NOT NULL DEFAULT 'delivery',
  `fulfillment_time` VARCHAR(50)   DEFAULT NULL,
  `address`          VARCHAR(500)  DEFAULT NULL,
  `status`           ENUM('Pending','Completed','Cancelled','Received') NOT NULL DEFAULT 'Pending',
  `created_at`       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;