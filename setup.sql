-- ============================================================
--  Kikay's Kusina — Database Setup (new schema)
--  Run this in phpMyAdmin or via: mysql -u root < setup.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `kikays_kusina`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `kikays_kusina`;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
    `id`         INT          NOT NULL AUTO_INCREMENT,
    `full_name`  VARCHAR(120) NOT NULL,
    `phone`      VARCHAR(30)  DEFAULT NULL,
    `email`      VARCHAR(120) NOT NULL UNIQUE,
    `password`   VARCHAR(255) NOT NULL,
    `role`       ENUM('user','admin') NOT NULL DEFAULT 'user',
    `address`    VARCHAR(255) DEFAULT NULL,   -- legacy fallback column
    `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- Default admin account (password: admin123)
INSERT IGNORE INTO `users` (`id`, `full_name`, `email`, `password`, `role`)
VALUES (1, 'Admin', 'admin@gmail.com', 'admin123', 'admin');

-- ── menu ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `menu` (
    `id`          INT            NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(120)   NOT NULL,
    `description` TEXT           DEFAULT NULL,
    `price`       DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    `category`    VARCHAR(60)    NOT NULL DEFAULT 'pork',
    `image_url`   VARCHAR(500)   DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- Sample menu items (skip if already inserted)
INSERT IGNORE INTO `menu` (`id`, `name`, `description`, `price`, `category`, `image_url`) VALUES
(1,  'Lechon Kawali',   'Crispy deep-fried pork belly.',                          150.00, 'pork',        'https://www.allrecipes.com/thmb/PFfi1nM5cx4AsOfgu2.../'),
(2,  'Pork Adobo',      'Classic Filipino pork adobo in soy-vinegar sauce.',      120.00, 'pork',        'https://salu-salo.com/wp-content/uploads/2015/04/P...'),
(3,  'Crispy Pata',     'Deep-fried pork leg, golden and crunchy.',               220.00, 'pork',        'https://www.recipesbynora.com/wp-content/uploads/2...'),
(4,  'Chicken Adobo',   'Classic Filipino soy-vinegar braised chicken.',           120.00, 'chicken',     'https://panlasangpinoy.com/wp-content/uploads/2026...'),
(5,  'Fried Chicken',   'Golden crispy fried chicken, Filipino-style.',            130.00, 'chicken',     'https://static.toiimg.com/thumb/61589069.cms?imgsi...'),
(6,  'Grilled Bangus',  'Marinated milkfish grilled to perfection.',              130.00, 'seafood',     'https://images.yummy.ph/yummy/uploads/2009/11/Gril...'),
(7,  'Kare-Kare',       'Oxtail stew in peanut sauce with veggies.',              200.00, 'beef',        'https://cdn.apartmenttherapy.info/image/upload/f_j...'),
(8,  'Beef Caldereta',  'Hearty beef stew with tomatoes and bell peppers.',       180.00, 'beef',        'https://cdn.sanity.io/images/f3knbc2s/production/f...'),
(9,  'Halo-Halo',       'The ultimate Filipino summer dessert.',                   85.00, 'dessert',     'https://assets.bonappetit.com/photos/60e46c6701084...'),
(10, 'Leche Flan',      'Creamy caramel custard, silky smooth.',                   65.00, 'dessert',     'https://www.kawalingpinoy.com/wp-content/uploads/2...'),
(11, 'Lechon Kawali',   'Crispy deep-fried pork belly — Best Seller!',            150.00, 'best_seller', 'https://www.allrecipes.com/thmb/PFfi1nM5cx4AsOfgu2.../'),
(12, 'Party Package A', '5 dishes + rice good for 10 persons.',                   950.00, 'packages',    'https://images.pexels.com/photos/2092906/pexels-ph...'),
(13, 'Party Package B', '8 dishes + rice good for 20 persons.',                 1800.00, 'packages',    'https://images.pexels.com/photos/2092906/pexels-ph...');

-- ── addresses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `addresses` (
    `id`           INT          NOT NULL AUTO_INCREMENT,
    `user_id`      INT          NOT NULL,
    `full_address` VARCHAR(500) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `fk_addr_user` (`user_id`),
    CONSTRAINT `fk_addr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
    `id`               INT           NOT NULL AUTO_INCREMENT,
    `user_id`          INT           NOT NULL,
    `address_id`       INT           DEFAULT NULL,        -- NULL for pickup orders
    `fulfillment_type` ENUM('delivery','pickup') NOT NULL DEFAULT 'delivery',
    `fulfillment_time` DATETIME      DEFAULT NULL,
    `total_amount`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status`           ENUM('Pending','Completed','Cancelled','Received') NOT NULL DEFAULT 'Pending',
    `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_order_user`    (`user_id`),
    KEY `fk_order_address` (`address_id`),
    CONSTRAINT `fk_order_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`     (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_order_address` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── order_details ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `order_details` (
    `order_id`   INT           NOT NULL,
    `menu_id`    INT           NOT NULL,
    `quantity`   INT           NOT NULL DEFAULT 1,
    `line_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`order_id`, `menu_id`),
    KEY `fk_od_menu` (`menu_id`),
    CONSTRAINT `fk_od_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_od_menu`  FOREIGN KEY (`menu_id`)  REFERENCES `menu`   (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payments` (
    `id`       INT           NOT NULL AUTO_INCREMENT,
    `order_id` INT           NOT NULL,
    `method`   ENUM('gcash','cod') NOT NULL DEFAULT 'cod',
    `status`   ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
    `amount`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `proof`    VARCHAR(500)  DEFAULT NULL,               -- file path for GCash screenshot
    PRIMARY KEY (`id`),
    KEY `fk_pay_order` (`order_id`),
    CONSTRAINT `fk_pay_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;