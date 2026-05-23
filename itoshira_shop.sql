SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
--  Xóa và tạo lại database (sạch hoàn toàn)
-- ============================================================
DROP DATABASE IF EXISTS `itoshira_shop`;
CREATE DATABASE `itoshira_shop`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `itoshira_shop`;

-- ============================================================
--  Bảng users
-- ============================================================
CREATE TABLE `users` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(50)     NOT NULL,
  `password`      VARCHAR(255)    NOT NULL,
  `email`         VARCHAR(255)    NOT NULL,
  `full_name`     VARCHAR(120)    NOT NULL,
  `auth_provider` VARCHAR(30)     NOT NULL DEFAULT 'local',
  `provider_id`   VARCHAR(255)    NULL,
  `total_spent`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `phone`         VARCHAR(20)     NULL,
  `address`       VARCHAR(300)    NULL,
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`),
  KEY `idx_users_provider` (`auth_provider`, `provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Bảng categories
-- ============================================================
CREATE TABLE `categories` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(80)  NOT NULL,
  `slug`       VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  UNIQUE KEY `uq_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `name`, `slug`) VALUES
  (1, 'Quần áo', 'quan-ao'),
  (2, 'Giày dép', 'giay-dep'),
  (3, 'Phụ kiện', 'phu-kien');

-- ============================================================
--  Bảng products
-- ============================================================
CREATE TABLE `products` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(180)    NOT NULL,
  `price`            INT UNSIGNED    NOT NULL,
  `image_url`        VARCHAR(255)    NOT NULL,
  `gender`           ENUM('Nam','Nữ','Unisex') NOT NULL DEFAULT 'Unisex',
  `category_id`      INT UNSIGNED    NOT NULL,
  `description`      TEXT            NULL,
  `is_active`        TINYINT         NOT NULL DEFAULT 1,
  `is_trending`      TINYINT         NOT NULL DEFAULT 0,
  `discount_percent` INT UNSIGNED    NOT NULL DEFAULT 0,
  `sku`              VARCHAR(50)     NULL UNIQUE,
  `material`         VARCHAR(100)    NULL,
  `size`             VARCHAR(100)    NULL,
  `color`            VARCHAR(200)    NULL,
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_filters` (`gender`, `category_id`, `price`),
  FULLTEXT KEY `ft_products_search` (`name`, `description`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  17 sản phẩm
-- ============================================================
INSERT INTO `products`
  (`name`, `price`, `image_url`, `gender`, `category_id`, `description`,
   `is_trending`, `discount_percent`, `sku`, `material`, `size`, `color`)
VALUES
  ('Áo thun basic Itoshira', 99000,   'tee-basic.jpg',       'Unisex', 1, 'Áo thun cotton mềm, dễ phối đồ.',                          0,  0, 'ITO-001', 'Cotton 100%',               'S,M,L,XL,XXL',            'Trắng,Đen,Xám'),
  ('Quần jeans ống suông',   349000,  'jeans-straight.jpg',  'Nam',    1, 'Form suông, chất denim dày dặn.',                           0,  0, 'ITO-002', 'Denim cao cấp',             '28,29,30,31,32,33,34',    'Xanh đậm,Xanh nhạt,Đen'),
  ('Váy maxi mùa hè',        399000,  'dress-maxi.jpg',      'Nữ',     1, 'Váy maxi nhẹ, phù hợp đi biển.',                           0,  0, 'ITO-003', 'Vải lụa nhân tạo',          'S,M,L,XL',                'Trắng,Hồng,Vàng'),
  ('Sneaker trắng tối giản', 499000,  'sneaker-white.jpg',   'Unisex', 2, 'Sneaker basic, đi học/đi làm đều hợp.',                     1,  0, 'ITO-004', 'Da PU + đế cao su',         '36,37,38,39,40,41,42,43', 'Trắng'),
  ('Áo khoác bomber premium',750000,  'bomber.jpg',          'Unisex', 1, 'Áo khoác bomber form đẹp, chất vải dày, giữ ấm tốt.',       1,  0, 'ITO-005', 'Polyester cao cấp',         'S,M,L,XL,XXL',            'Đen,Xanh navy,Nâu'),
  ('Giày da handcrafted',    1200000, 'giay-da.jpg',         'Nam',    2, 'Giày da thủ công, bền đẹp, phù hợp đi làm/sự kiện.',        1,  0, 'ITO-006', 'Da bò thật',                '39,40,41,42,43,44',       'Nâu,Đen'),
  ('Dép quai ngang',         129000,  'dep-quai-ngang.jpg',  'Unisex', 2, 'Êm chân, bền, dễ vệ sinh.',                                0,  0, 'ITO-007', 'Cao su tự nhiên + vải',     '36,37,38,39,40,41,42,43', 'Đen,Nâu,Be'),
  ('Nón lưỡi trai',          159000,  'cap.jpg',             'Unisex', 3, 'Nón form chuẩn, thêu logo nhỏ.',                           0,  0, 'ITO-008', 'Vải kaki + khung nhựa',     'One size',                'Đen,Trắng,Xanh navy,Be'),
  ('Túi tote canvas',        189000,  'tote.jpg',            'Unisex', 3, 'Tote canvas chắc chắn, chứa đồ thoải mái.',                1,  0, 'ITO-009', 'Canvas dày',                'One size',                'Kem,Đen,Xanh'),
  ('Áo polo classic sale',   159000,  'polo-sale.jpg',       'Nam',    1, 'Áo polo cotton thoáng mát, form regular.',                  0, 30, 'ITO-010', 'Cotton pique',              'S,M,L,XL,XXL',            'Trắng,Đen,Xanh navy,Đỏ'),
  ('Quần short thể thao',    89000,   'short-sport.jpg',     'Nam',    1, 'Quần short co giãn tốt, phù hợp tập gym.',                  0, 25, 'ITO-011', 'Polyester co giãn 4 chiều', 'S,M,L,XL,XXL',            'Đen,Xám,Xanh dương'),
  ('Váy sơ mi kẻ caro',      199000,  'dress-check.jpg',     'Nữ',     1, 'Váy sơ mi kẻ caro nhẹ nhàng, nữ tính.',                    0, 20, 'ITO-012', 'Vải kẻ caro cotton pha',    'S,M,L,XL',                'Đỏ kẻ,Xanh kẻ,Vàng kẻ'),
  ('Áo croptop basic',       119000,  'croptop.jpg',         'Nữ',     1, 'Croptop cotton mềm, dễ phối với quần jeans.',               0, 35, 'ITO-013', 'Cotton mềm co giãn',        'XS,S,M,L',                'Trắng,Đen,Hồng,Xanh mint'),
  ('Sneaker canvas đen',     299000,  'sneaker-black.jpg',   'Unisex', 2, 'Sneaker canvas đơn giản, bền đẹp.',                         0, 15, 'ITO-014', 'Canvas + đế cao su',         '36,37,38,39,40,41,42,43', 'Đen'),
  ('Sandal quai chéo',       149000,  'sandal.jpg',          'Nữ',     2, 'Sandal quai chéo thời trang, đi biển rất hợp.',             0, 20, 'ITO-015', 'Da PU + đế EVA',            '35,36,37,38,39,40',       'Trắng,Đen,Nâu'),
  ('Mũ bucket unisex',       109000,  'bucket-hat.jpg',      'Unisex', 3, 'Mũ bucket cotton, che nắng tốt.',                          0, 30, 'ITO-016', 'Cotton 100%',               'One size',                'Đen,Trắng,Be,Xanh lá'),
  ('Dây lưng da tổng hợp',   79000,   'belt.jpg',            'Unisex', 3, 'Dây lưng da tổng hợp, khóa kim loại chắc chắn.',           0, 40, 'ITO-017', 'Da tổng hợp PU cao cấp',   'One size',                'Đen,Nâu');

-- ============================================================
--  Bảng orders
-- ============================================================
CREATE TABLE `orders` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `status`       ENUM('pending','paid','shipped','completed','cancelled') NOT NULL DEFAULT 'pending',
  `subtotal`     INT UNSIGNED    NOT NULL DEFAULT 0,
  `shipping_fee` INT UNSIGNED    NOT NULL DEFAULT 0,
  `total`        INT UNSIGNED    NOT NULL DEFAULT 0,
  `note`         VARCHAR(500)    NULL,
  `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Bảng order_items
-- ============================================================
CREATE TABLE `order_items` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`   BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `quantity`   INT UNSIGNED    NOT NULL,
  `unit_price` INT UNSIGNED    NOT NULL,
  `line_total` INT UNSIGNED    NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_items_order_product` (`order_id`, `product_id`),
  KEY `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_id`)   REFERENCES `orders`   (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Bảng reviews
-- ============================================================
CREATE TABLE `reviews` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED  NOT NULL,
  `user_id`    BIGINT UNSIGNED  NOT NULL,
  `rating`     TINYINT UNSIGNED NULL,
  `comment`    TEXT             NULL,
  `created_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_product` (`product_id`),
  CONSTRAINT `fk_reviews_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_user`
    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Bảng ratings (vote sao – mỗi user 1 lần / sản phẩm)
-- ============================================================
CREATE TABLE IF NOT EXISTS `ratings` (
  `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED  NOT NULL,
  `user_id`    BIGINT UNSIGNED  NOT NULL,
  `rating`     TINYINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rating` (`product_id`, `user_id`),
  CONSTRAINT `fk_ratings_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_user`    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;