SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
--  Xóa và tạo lại database
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
--  50 sản phẩm
-- ============================================================
INSERT INTO `products`
  (`name`, `price`, `image_url`, `gender`, `category_id`, `description`,
   `is_trending`, `discount_percent`, `sku`, `material`, `size`, `color`)
VALUES
-- QUẦN ÁO NAM & UNISEX
  ('Áo thun basic Itoshira',  99000,  'tee-basic.jpg',           'Unisex', 1, 'Áo thun cotton mềm, dễ phối đồ.',                            0,  0, 'ITO-001', 'Cotton 100%',              'S,M,L,XL,XXL',            'Trắng,Đen,Xám'),
  ('Quần jeans ống suông',    349000, 'jeans-straight.jpg',      'Nam',    1, 'Form suông, chất denim dày dặn.',                             0,  0, 'ITO-002', 'Denim cao cấp',            '28,29,30,31,32,33,34',    'Xanh đậm,Xanh nhạt,Đen'),
  ('Váy maxi mùa hè',         399000, 'dress-maxi.jpg',          'Nữ',     1, 'Váy maxi nhẹ, phù hợp đi biển.',                             0,  0, 'ITO-003', 'Vải lụa nhân tạo',         'S,M,L,XL',                'Trắng,Hồng,Vàng'),
  ('Sneaker trắng tối giản',  499000, 'sneaker-white.jpg',       'Unisex', 2, 'Sneaker basic, đi học/đi làm đều hợp.',                       1,  0, 'ITO-004', 'Da PU + đế cao su',        '36,37,38,39,40,41,42,43', 'Trắng'),
  ('Áo khoác bomber premium', 750000, 'bomber.jpg',              'Unisex', 1, 'Áo khoác bomber form đẹp, chất vải dày, giữ ấm tốt.',         1,  0, 'ITO-005', 'Polyester cao cấp',        'S,M,L,XL,XXL',            'Đen,Xanh navy,Nâu'),
  ('Giày da handcrafted',    1200000, 'giay-da.jpg',             'Nam',    2, 'Giày da thủ công, bền đẹp, phù hợp đi làm/sự kiện.',          1,  0, 'ITO-006', 'Da bò thật',               '39,40,41,42,43,44',       'Nâu,Đen'),
  ('Dép quai ngang',          129000, 'dep-quai-ngang.jpg',      'Unisex', 2, 'Êm chân, bền, dễ vệ sinh.',                                  0,  0, 'ITO-007', 'Cao su tự nhiên + vải',    '36,37,38,39,40,41,42,43', 'Đen,Nâu,Be'),
  ('Nón lưỡi trai',           159000, 'cap.jpg',                 'Unisex', 3, 'Nón form chuẩn, thêu logo nhỏ.',                             0,  0, 'ITO-008', 'Vải kaki + khung nhựa',    'One size',                'Đen,Trắng,Xanh navy,Be'),
  ('Túi tote canvas',         189000, 'tote.jpg',                'Unisex', 3, 'Tote canvas chắc chắn, chứa đồ thoải mái.',                  1,  0, 'ITO-009', 'Canvas dày',               'One size',                'Kem,Đen,Xanh'),
  ('Áo polo classic sale',    159000, 'polo-sale.jpg',           'Nam',    1, 'Áo polo cotton thoáng mát, form regular.',                    0, 30, 'ITO-010', 'Cotton pique',             'S,M,L,XL,XXL',            'Trắng,Đen,Xanh navy,Đỏ'),
  ('Quần short thể thao',      89000, 'short-sport.jpg',         'Nam',    1, 'Quần short co giãn tốt, phù hợp tập gym.',                    0, 25, 'ITO-011', 'Polyester co giãn 4 chiều','S,M,L,XL,XXL',            'Đen,Xám,Xanh dương'),
  ('Váy sơ mi kẻ caro',       199000, 'dress-check.jpg',         'Nữ',     1, 'Váy sơ mi kẻ caro nhẹ nhàng, nữ tính.',                      0, 20, 'ITO-012', 'Vải kẻ caro cotton pha',   'S,M,L,XL',                'Đỏ kẻ,Xanh kẻ,Vàng kẻ'),
  ('Áo croptop basic',        119000, 'croptop.jpg',             'Nữ',     1, 'Croptop cotton mềm, dễ phối với quần jeans.',                 0, 35, 'ITO-013', 'Cotton mềm co giãn',       'XS,S,M,L',                'Trắng,Đen,Hồng,Xanh mint'),
  ('Sneaker canvas đen',      299000, 'sneaker-black.jpg',       'Unisex', 2, 'Sneaker canvas đơn giản, bền đẹp.',                           0, 15, 'ITO-014', 'Canvas + đế cao su',        '36,37,38,39,40,41,42,43', 'Đen'),
  ('Sandal quai chéo',        149000, 'sandal.jpg',              'Nữ',     2, 'Sandal quai chéo thời trang, đi biển rất hợp.',               0, 20, 'ITO-015', 'Da PU + đế EVA',           '35,36,37,38,39,40',       'Trắng,Đen,Nâu'),
  ('Mũ bucket unisex',        109000, 'bucket-hat.jpg',          'Unisex', 3, 'Mũ bucket cotton, che nắng tốt.',                             0, 30, 'ITO-016', 'Cotton 100%',              'One size',                'Đen,Trắng,Be,Xanh lá'),
  ('Dây lưng da tổng hợp',     79000, 'belt.jpg',                'Unisex', 3, 'Dây lưng da tổng hợp, khóa kim loại chắc chắn.',             0, 40, 'ITO-017', 'Da tổng hợp PU cao cấp',  'One size',                'Đen,Nâu'),
  ('Áo sơ mi Oxford trắng',   259000, 'shirt-oxford.jpg',        'Nam',    1, 'Áo sơ mi Oxford form slim, phù hợp đi làm và đi chơi.',       1,  0, 'ITO-018', 'Cotton Oxford 100%',       'S,M,L,XL,XXL',            'Trắng,Xanh nhạt,Xanh đậm'),
  ('Áo hoodie nỉ bông',       450000, 'hoodie-fleece.jpg',       'Nam',    1, 'Hoodie nỉ bông dày, giữ ấm cực tốt mùa đông.',                1,  0, 'ITO-019', 'Nỉ bông 3 da cao cấp',    'S,M,L,XL,XXL',            'Đen,Xám,Xanh navy,Đỏ đô'),
  ('Quần tây slim fit',        399000, 'pants-slim.jpg',          'Nam',    1, 'Quần tây nam form slim, chất liệu cao cấp không nhăn.',        0,  0, 'ITO-020', 'Polyester pha Viscose',    '28,29,30,31,32,33,34',    'Đen,Xám đậm,Navy'),
  ('Áo thun in graphic',      149000, 'tee-graphic.jpg',         'Nam',    1, 'Áo thun oversize in họa tiết độc đáo.',                       1, 10, 'ITO-021', 'Cotton 100% 200GSM',       'S,M,L,XL,XXL',            'Trắng,Đen,Be'),
  ('Quần kaki slim',           299000, 'kaki-slim.jpg',           'Nam',    1, 'Quần kaki co giãn nhẹ, thoải mái cả ngày.',                   0,  0, 'ITO-022', 'Cotton kaki pha spandex',  '28,29,30,31,32,33,34',    'Be,Nâu,Xanh rêu,Đen'),
  ('Áo thun polo Pique',      199000, 'polo-pique.jpg',          'Nam',    1, 'Polo pique thoáng khí, thêu logo ngực nhỏ.',                  0,  0, 'ITO-023', 'Cotton Pique 220GSM',      'S,M,L,XL,XXL',            'Trắng,Đen,Xanh navy,Đỏ,Vàng'),
  ('Áo khoác dù 2 lớp',       650000, 'jacket-windbreaker.jpg',  'Nam',    1, 'Áo khoác dù chống gió, nhẹ gọn có thể gấp túi.',              1,  0, 'ITO-024', 'Nylon chống nước',         'S,M,L,XL,XXL',            'Đen,Xanh navy,Xám'),
  ('Quần jogger thể thao',    189000, 'jogger.jpg',              'Nam',    1, 'Jogger cotton co giãn, cổ chân bo gọn.',                      0, 15, 'ITO-025', 'Cotton terry co giãn',     'S,M,L,XL,XXL',            'Đen,Xám,Be'),
  ('Áo blouse tay bồng',      279000, 'blouse-puff.jpg',         'Nữ',     1, 'Blouse tay bồng nhẹ nhàng, thanh lịch.',                      1,  0, 'ITO-026', 'Vải tơ mềm',               'XS,S,M,L,XL',             'Trắng,Hồng,Xanh mint,Vàng kem'),
  ('Quần culottes lưng cao',  319000, 'culottes.jpg',            'Nữ',     1, 'Quần culottes ống rộng, lưng cao tôn dáng.',                  0,  0, 'ITO-027', 'Polyester dệt mịn',        'XS,S,M,L,XL',             'Đen,Trắng,Nâu caramel'),
  ('Áo len cổ lọ',            369000, 'sweater-turtleneck.jpg',  'Nữ',     1, 'Áo len cổ lọ mỏng, ôm nhẹ, mặc được cả 3 mùa.',              1,  0, 'ITO-028', 'Len pha Acrylic',          'XS,S,M,L',                'Kem,Nâu,Đen,Xanh bụi'),
  ('Váy midi chữ A',          349000, 'skirt-midi.jpg',          'Nữ',     1, 'Váy midi xòe nhẹ, dài qua gối, dễ phối đồ.',                 0,  0, 'ITO-029', 'Vải tweed pha',            'XS,S,M,L,XL',             'Đen,Kem,Hồng nhạt,Xanh bụi'),
  ('Áo tank top basic',        79000, 'tanktop.jpg',             'Nữ',     1, 'Tank top dáng suông, mặc trong hoặc phối layer.',             0,  0, 'ITO-030', 'Cotton rib co giãn',       'XS,S,M,L',                'Trắng,Đen,Hồng,Be,Xanh'),
  ('Quần jean ống đứng',      329000, 'jeans-straight-w.jpg',    'Nữ',     1, 'Jean ống đứng lưng cao, tôn vóc dáng.',                       1,  0, 'ITO-031', 'Denim co giãn',            '25,26,27,28,29,30',       'Xanh đậm,Xanh nhạt,Đen'),
  ('Áo khoác cardigan len',   429000, 'cardigan.jpg',            'Nữ',     1, 'Cardigan len dài, phong cách Hàn Quốc.',                      1, 10, 'ITO-032', 'Len mềm acrylic',          'XS,S,M,L,XL',             'Kem,Nâu,Xám,Đen'),
  ('Áo crop denim',           219000, 'crop-denim.jpg',          'Nữ',     1, 'Áo denim crop tay ngắn, phong cách vintage.',                 0, 20, 'ITO-033', 'Denim nhẹ',                'XS,S,M,L',                'Xanh nhạt,Xanh đậm'),
  ('Giày thể thao chunky',    699000, 'chunky-sneaker.jpg',      'Unisex', 2, 'Chunky sneaker đế dày, hot trend, tăng chiều cao.',           1,  0, 'ITO-034', 'Da PU + mesh thoáng khí',  '36,37,38,39,40,41,42,43', 'Trắng,Đen,Be'),
  ('Giày loafer da',          550000, 'loafer.jpg',              'Unisex', 2, 'Loafer da lộn, phong cách preppy/vintage.',                   1,  0, 'ITO-035', 'Da lộn tổng hợp',          '36,37,38,39,40,41,42,43', 'Đen,Nâu,Be'),
  ('Boot cổ thấp',            780000, 'ankle-boot.jpg',          'Nữ',     2, 'Boot cổ thấp gót thô, dễ mix đồ mùa lạnh.',                  1,  0, 'ITO-036', 'Da PU cao cấp',            '35,36,37,38,39,40',       'Đen,Nâu,Trắng'),
  ('Dép sandal xỏ ngón',       99000, 'flip-flop.jpg',           'Unisex', 2, 'Dép xỏ ngón nhẹ, chống trơn, đi biển siêu tiện.',            0, 20, 'ITO-037', 'Cao su EVA',               '36,37,38,39,40,41,42,43', 'Đen,Trắng,Xanh,Đỏ'),
  ('Giày slip-on vải',        249000, 'slip-on.jpg',             'Unisex', 2, 'Slip-on vải không dây, đi nhanh tiện lợi.',                  0,  0, 'ITO-038', 'Canvas + đế cao su',        '36,37,38,39,40,41,42,43', 'Đen,Trắng,Xám'),
  ('Giày oxford nữ',          459000, 'oxford-women.jpg',        'Nữ',     2, 'Oxford mũi vuông cổ điển, sang trọng.',                       0,  0, 'ITO-039', 'Da PU mờ',                 '35,36,37,38,39,40',       'Đen,Nâu,Trắng kem'),
  ('Giày sneaker platform nữ',499000, 'platform-sneaker.jpg',    'Nữ',     2, 'Sneaker đế platform tăng chiều cao 5cm.',                     1, 15, 'ITO-040', 'Da PU + đế PVC',           '35,36,37,38,39,40',       'Trắng,Đen,Hồng'),
  ('Túi đeo chéo mini',       299000, 'crossbody-mini.jpg',      'Nữ',     3, 'Túi đeo chéo mini nhiều ngăn, thời trang.',                   1,  0, 'ITO-041', 'Da PU chống nước',         'One size',                'Đen,Nâu,Trắng,Hồng'),
  ('Balo thời trang',         450000, 'backpack-fashion.jpg',    'Unisex', 3, 'Balo dáng đứng, chứa được laptop 13 inch.',                   1,  0, 'ITO-042', 'Canvas dày chống nước',    'One size',                'Đen,Be,Xanh navy'),
  ('Ví da nam dài',           199000, 'wallet-long.jpg',         'Nam',    3, 'Ví da dài nhiều ngăn thẻ, gấp đôi gọn.',                     0,  0, 'ITO-043', 'Da PU cao cấp',            'One size',                'Đen,Nâu'),
  ('Khăn quàng len mỏng',     129000, 'scarf-knit.jpg',          'Unisex', 3, 'Khăn quàng len mỏng, ấm nhẹ, nhiều màu.',                    0,  0, 'ITO-044', 'Len acrylic mềm',          'One size',                'Xám,Kem,Đen,Đỏ,Xanh navy'),
  ('Kính mát vuông unisex',   189000, 'sunglasses-square.jpg',   'Unisex', 3, 'Kính mát gọng vuông UV400, phong cách retro.',                1,  0, 'ITO-045', 'Nhựa PC + tròng UV400',    'One size',                'Đen,Tortoise,Trong suốt'),
  ('Vòng tay dây dệt',         49000, 'bracelet-woven.jpg',      'Unisex', 3, 'Vòng tay dây dệt thủ công, bộ 3 chiếc.',                     0,  0, 'ITO-046', 'Dây polyester dệt',        'One size',                'Đen,Trắng,Nâu,Nhiều màu'),
  ('Túi clutch buổi tối',     249000, 'clutch.jpg',              'Nữ',     3, 'Clutch nhỏ gọn, dùng đi tiệc hoặc date.',                    0, 25, 'ITO-047', 'Da PU bóng',               'One size',                'Đen,Vàng,Bạc,Hồng'),
  ('Nón mũ fedora',           179000, 'fedora.jpg',              'Unisex', 3, 'Mũ fedora nỉ cứng, phong cách vintage chic.',                0,  0, 'ITO-048', 'Nỉ polyester cứng',        'One size',                'Đen,Be,Nâu'),
  ('Túi xách tay tote da',    550000, 'tote-leather.jpg',        'Nữ',     3, 'Tote da PU cỡ lớn, đựng được laptop + đồ cá nhân.',          1,  0, 'ITO-049', 'Da PU cao cấp dày dặn',    'One size',                'Đen,Trắng kem,Nâu caramel'),
  ('Thắt lưng canvas',         89000, 'belt-canvas.jpg',         'Nam',    3, 'Thắt lưng canvas khoá kim loại, phong cách casual.',          0, 10, 'ITO-050', 'Canvas + khóa hợp kim',    'One size',                'Đen,Be,Xanh navy');

-- ============================================================
--  Bảng product_variants (màu + size + tồn kho)
-- ============================================================
CREATE TABLE `product_variants` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `color`      VARCHAR(60)     NOT NULL DEFAULT '',
  `size`       VARCHAR(20)     NOT NULL DEFAULT '',
  `stock`      INT UNSIGNED    NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_variant` (`product_id`, `color`, `size`),
  CONSTRAINT `fk_variant_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Seed tồn kho — viết thẳng, không dùng hàm
--  Stock mỗi variant = 20 cái (có thể sửa tuỳ ý)
-- ============================================================

-- ITO-001: Áo thun basic | Trắng/Đen/Xám × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(1,'Trắng','S',20),(1,'Trắng','M',20),(1,'Trắng','L',20),(1,'Trắng','XL',20),(1,'Trắng','XXL',15),
(1,'Đen','S',20),(1,'Đen','M',20),(1,'Đen','L',20),(1,'Đen','XL',20),(1,'Đen','XXL',15),
(1,'Xám','S',18),(1,'Xám','M',20),(1,'Xám','L',20),(1,'Xám','XL',18),(1,'Xám','XXL',10);

-- ITO-002: Quần jeans ống suông | Xanh đậm/Xanh nhạt/Đen × 28-34
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(2,'Xanh đậm','28',15),(2,'Xanh đậm','29',15),(2,'Xanh đậm','30',20),(2,'Xanh đậm','31',20),(2,'Xanh đậm','32',15),(2,'Xanh đậm','33',10),(2,'Xanh đậm','34',8),
(2,'Xanh nhạt','28',15),(2,'Xanh nhạt','29',15),(2,'Xanh nhạt','30',20),(2,'Xanh nhạt','31',20),(2,'Xanh nhạt','32',15),(2,'Xanh nhạt','33',10),(2,'Xanh nhạt','34',8),
(2,'Đen','28',12),(2,'Đen','29',15),(2,'Đen','30',20),(2,'Đen','31',20),(2,'Đen','32',15),(2,'Đen','33',10),(2,'Đen','34',8);

-- ITO-003: Váy maxi | Trắng/Hồng/Vàng × S/M/L/XL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(3,'Trắng','S',15),(3,'Trắng','M',20),(3,'Trắng','L',18),(3,'Trắng','XL',12),
(3,'Hồng','S',15),(3,'Hồng','M',20),(3,'Hồng','L',18),(3,'Hồng','XL',12),
(3,'Vàng','S',12),(3,'Vàng','M',15),(3,'Vàng','L',12),(3,'Vàng','XL',8);

-- ITO-004: Sneaker trắng | Trắng × 36-43
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(4,'Trắng','36',10),(4,'Trắng','37',15),(4,'Trắng','38',20),(4,'Trắng','39',20),(4,'Trắng','40',20),(4,'Trắng','41',15),(4,'Trắng','42',10),(4,'Trắng','43',8);

-- ITO-005: Áo bomber | Đen/Xanh navy/Nâu × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(5,'Đen','S',15),(5,'Đen','M',20),(5,'Đen','L',20),(5,'Đen','XL',15),(5,'Đen','XXL',10),
(5,'Xanh navy','S',12),(5,'Xanh navy','M',18),(5,'Xanh navy','L',18),(5,'Xanh navy','XL',12),(5,'Xanh navy','XXL',8),
(5,'Nâu','S',10),(5,'Nâu','M',15),(5,'Nâu','L',15),(5,'Nâu','XL',10),(5,'Nâu','XXL',6);

-- ITO-006: Giày da | Nâu/Đen × 39-44
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(6,'Nâu','39',8),(6,'Nâu','40',12),(6,'Nâu','41',15),(6,'Nâu','42',12),(6,'Nâu','43',8),(6,'Nâu','44',5),
(6,'Đen','39',8),(6,'Đen','40',12),(6,'Đen','41',15),(6,'Đen','42',12),(6,'Đen','43',8),(6,'Đen','44',5);

-- ITO-007: Dép quai ngang | Đen/Nâu/Be × 36-43
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(7,'Đen','36',15),(7,'Đen','37',15),(7,'Đen','38',20),(7,'Đen','39',20),(7,'Đen','40',20),(7,'Đen','41',15),(7,'Đen','42',10),(7,'Đen','43',8),
(7,'Nâu','36',12),(7,'Nâu','37',12),(7,'Nâu','38',15),(7,'Nâu','39',15),(7,'Nâu','40',15),(7,'Nâu','41',12),(7,'Nâu','42',8),(7,'Nâu','43',6),
(7,'Be','36',10),(7,'Be','37',10),(7,'Be','38',12),(7,'Be','39',12),(7,'Be','40',12),(7,'Be','41',10),(7,'Be','42',6),(7,'Be','43',5);

-- ITO-008: Nón lưỡi trai | Đen/Trắng/Xanh navy/Be × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(8,'Đen','One size',30),(8,'Trắng','One size',25),(8,'Xanh navy','One size',20),(8,'Be','One size',20);

-- ITO-009: Túi tote canvas | Kem/Đen/Xanh × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(9,'Kem','One size',25),(9,'Đen','One size',30),(9,'Xanh','One size',20);

-- ITO-010: Áo polo classic | Trắng/Đen/Xanh navy/Đỏ × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(10,'Trắng','S',15),(10,'Trắng','M',20),(10,'Trắng','L',20),(10,'Trắng','XL',15),(10,'Trắng','XXL',8),
(10,'Đen','S',15),(10,'Đen','M',20),(10,'Đen','L',20),(10,'Đen','XL',15),(10,'Đen','XXL',8),
(10,'Xanh navy','S',12),(10,'Xanh navy','M',15),(10,'Xanh navy','L',15),(10,'Xanh navy','XL',12),(10,'Xanh navy','XXL',6),
(10,'Đỏ','S',10),(10,'Đỏ','M',12),(10,'Đỏ','L',12),(10,'Đỏ','XL',10),(10,'Đỏ','XXL',5);

-- ITO-011: Quần short thể thao | Đen/Xám/Xanh dương × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(11,'Đen','S',20),(11,'Đen','M',25),(11,'Đen','L',25),(11,'Đen','XL',20),(11,'Đen','XXL',12),
(11,'Xám','S',18),(11,'Xám','M',20),(11,'Xám','L',20),(11,'Xám','XL',18),(11,'Xám','XXL',10),
(11,'Xanh dương','S',15),(11,'Xanh dương','M',18),(11,'Xanh dương','L',18),(11,'Xanh dương','XL',15),(11,'Xanh dương','XXL',8);

-- ITO-012: Váy sơ mi kẻ caro | Đỏ kẻ/Xanh kẻ/Vàng kẻ × S/M/L/XL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(12,'Đỏ kẻ','S',12),(12,'Đỏ kẻ','M',15),(12,'Đỏ kẻ','L',15),(12,'Đỏ kẻ','XL',10),
(12,'Xanh kẻ','S',12),(12,'Xanh kẻ','M',15),(12,'Xanh kẻ','L',15),(12,'Xanh kẻ','XL',10),
(12,'Vàng kẻ','S',10),(12,'Vàng kẻ','M',12),(12,'Vàng kẻ','L',12),(12,'Vàng kẻ','XL',8);

-- ITO-013: Áo croptop | Trắng/Đen/Hồng/Xanh mint × XS/S/M/L
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(13,'Trắng','XS',10),(13,'Trắng','S',15),(13,'Trắng','M',20),(13,'Trắng','L',15),
(13,'Đen','XS',10),(13,'Đen','S',15),(13,'Đen','M',20),(13,'Đen','L',15),
(13,'Hồng','XS',8),(13,'Hồng','S',12),(13,'Hồng','M',15),(13,'Hồng','L',12),
(13,'Xanh mint','XS',8),(13,'Xanh mint','S',10),(13,'Xanh mint','M',12),(13,'Xanh mint','L',10);

-- ITO-014: Sneaker canvas đen | Đen × 36-43
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(14,'Đen','36',12),(14,'Đen','37',15),(14,'Đen','38',20),(14,'Đen','39',20),(14,'Đen','40',20),(14,'Đen','41',15),(14,'Đen','42',10),(14,'Đen','43',8);

-- ITO-015: Sandal quai chéo | Trắng/Đen/Nâu × 35-40
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(15,'Trắng','35',10),(15,'Trắng','36',15),(15,'Trắng','37',18),(15,'Trắng','38',18),(15,'Trắng','39',12),(15,'Trắng','40',8),
(15,'Đen','35',10),(15,'Đen','36',15),(15,'Đen','37',18),(15,'Đen','38',18),(15,'Đen','39',12),(15,'Đen','40',8),
(15,'Nâu','35',8),(15,'Nâu','36',12),(15,'Nâu','37',15),(15,'Nâu','38',15),(15,'Nâu','39',10),(15,'Nâu','40',6);

-- ITO-016: Mũ bucket | Đen/Trắng/Be/Xanh lá × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(16,'Đen','One size',25),(16,'Trắng','One size',20),(16,'Be','One size',20),(16,'Xanh lá','One size',15);

-- ITO-017: Dây lưng | Đen/Nâu × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(17,'Đen','One size',30),(17,'Nâu','One size',25);

-- ITO-018: Sơ mi Oxford | Trắng/Xanh nhạt/Xanh đậm × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(18,'Trắng','S',15),(18,'Trắng','M',20),(18,'Trắng','L',20),(18,'Trắng','XL',15),(18,'Trắng','XXL',8),
(18,'Xanh nhạt','S',12),(18,'Xanh nhạt','M',15),(18,'Xanh nhạt','L',15),(18,'Xanh nhạt','XL',12),(18,'Xanh nhạt','XXL',6),
(18,'Xanh đậm','S',10),(18,'Xanh đậm','M',12),(18,'Xanh đậm','L',12),(18,'Xanh đậm','XL',10),(18,'Xanh đậm','XXL',5);

-- ITO-019: Hoodie nỉ | Đen/Xám/Xanh navy/Đỏ đô × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(19,'Đen','S',15),(19,'Đen','M',20),(19,'Đen','L',20),(19,'Đen','XL',15),(19,'Đen','XXL',8),
(19,'Xám','S',12),(19,'Xám','M',15),(19,'Xám','L',15),(19,'Xám','XL',12),(19,'Xám','XXL',6),
(19,'Xanh navy','S',10),(19,'Xanh navy','M',12),(19,'Xanh navy','L',12),(19,'Xanh navy','XL',10),(19,'Xanh navy','XXL',5),
(19,'Đỏ đô','S',8),(19,'Đỏ đô','M',10),(19,'Đỏ đô','L',10),(19,'Đỏ đô','XL',8),(19,'Đỏ đô','XXL',4);

-- ITO-020: Quần tây slim | Đen/Xám đậm/Navy × 28-34
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(20,'Đen','28',12),(20,'Đen','29',12),(20,'Đen','30',15),(20,'Đen','31',15),(20,'Đen','32',12),(20,'Đen','33',8),(20,'Đen','34',6),
(20,'Xám đậm','28',10),(20,'Xám đậm','29',10),(20,'Xám đậm','30',12),(20,'Xám đậm','31',12),(20,'Xám đậm','32',10),(20,'Xám đậm','33',6),(20,'Xám đậm','34',4),
(20,'Navy','28',10),(20,'Navy','29',10),(20,'Navy','30',12),(20,'Navy','31',12),(20,'Navy','32',10),(20,'Navy','33',6),(20,'Navy','34',4);

-- ITO-021: Áo thun graphic | Trắng/Đen/Be × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(21,'Trắng','S',15),(21,'Trắng','M',20),(21,'Trắng','L',20),(21,'Trắng','XL',15),(21,'Trắng','XXL',8),
(21,'Đen','S',15),(21,'Đen','M',20),(21,'Đen','L',20),(21,'Đen','XL',15),(21,'Đen','XXL',8),
(21,'Be','S',10),(21,'Be','M',12),(21,'Be','L',12),(21,'Be','XL',10),(21,'Be','XXL',5);

-- ITO-022: Quần kaki slim | Be/Nâu/Xanh rêu/Đen × 28-34
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(22,'Be','28',12),(22,'Be','29',12),(22,'Be','30',15),(22,'Be','31',15),(22,'Be','32',12),(22,'Be','33',8),(22,'Be','34',6),
(22,'Nâu','28',10),(22,'Nâu','29',10),(22,'Nâu','30',12),(22,'Nâu','31',12),(22,'Nâu','32',10),(22,'Nâu','33',6),(22,'Nâu','34',4),
(22,'Xanh rêu','28',8),(22,'Xanh rêu','29',8),(22,'Xanh rêu','30',10),(22,'Xanh rêu','31',10),(22,'Xanh rêu','32',8),(22,'Xanh rêu','33',5),(22,'Xanh rêu','34',3),
(22,'Đen','28',12),(22,'Đen','29',12),(22,'Đen','30',15),(22,'Đen','31',15),(22,'Đen','32',12),(22,'Đen','33',8),(22,'Đen','34',6);

-- ITO-023: Polo Pique | Trắng/Đen/Xanh navy/Đỏ/Vàng × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(23,'Trắng','S',12),(23,'Trắng','M',15),(23,'Trắng','L',15),(23,'Trắng','XL',12),(23,'Trắng','XXL',6),
(23,'Đen','S',12),(23,'Đen','M',15),(23,'Đen','L',15),(23,'Đen','XL',12),(23,'Đen','XXL',6),
(23,'Xanh navy','S',10),(23,'Xanh navy','M',12),(23,'Xanh navy','L',12),(23,'Xanh navy','XL',10),(23,'Xanh navy','XXL',5),
(23,'Đỏ','S',8),(23,'Đỏ','M',10),(23,'Đỏ','L',10),(23,'Đỏ','XL',8),(23,'Đỏ','XXL',4),
(23,'Vàng','S',6),(23,'Vàng','M',8),(23,'Vàng','L',8),(23,'Vàng','XL',6),(23,'Vàng','XXL',3);

-- ITO-024: Áo khoác dù | Đen/Xanh navy/Xám × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(24,'Đen','S',12),(24,'Đen','M',15),(24,'Đen','L',15),(24,'Đen','XL',12),(24,'Đen','XXL',6),
(24,'Xanh navy','S',10),(24,'Xanh navy','M',12),(24,'Xanh navy','L',12),(24,'Xanh navy','XL',10),(24,'Xanh navy','XXL',5),
(24,'Xám','S',8),(24,'Xám','M',10),(24,'Xám','L',10),(24,'Xám','XL',8),(24,'Xám','XXL',4);

-- ITO-025: Quần jogger | Đen/Xám/Be × S/M/L/XL/XXL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(25,'Đen','S',15),(25,'Đen','M',20),(25,'Đen','L',20),(25,'Đen','XL',15),(25,'Đen','XXL',8),
(25,'Xám','S',12),(25,'Xám','M',15),(25,'Xám','L',15),(25,'Xám','XL',12),(25,'Xám','XXL',6),
(25,'Be','S',10),(25,'Be','M',12),(25,'Be','L',12),(25,'Be','XL',10),(25,'Be','XXL',5);

-- ITO-026: Blouse tay bồng | Trắng/Hồng/Xanh mint/Vàng kem × XS/S/M/L/XL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(26,'Trắng','XS',8),(26,'Trắng','S',12),(26,'Trắng','M',15),(26,'Trắng','L',12),(26,'Trắng','XL',8),
(26,'Hồng','XS',8),(26,'Hồng','S',12),(26,'Hồng','M',15),(26,'Hồng','L',12),(26,'Hồng','XL',8),
(26,'Xanh mint','XS',6),(26,'Xanh mint','S',10),(26,'Xanh mint','M',12),(26,'Xanh mint','L',10),(26,'Xanh mint','XL',6),
(26,'Vàng kem','XS',6),(26,'Vàng kem','S',8),(26,'Vàng kem','M',10),(26,'Vàng kem','L',8),(26,'Vàng kem','XL',5);

-- ITO-027: Quần culottes | Đen/Trắng/Nâu caramel × XS/S/M/L/XL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(27,'Đen','XS',10),(27,'Đen','S',12),(27,'Đen','M',15),(27,'Đen','L',12),(27,'Đen','XL',8),
(27,'Trắng','XS',8),(27,'Trắng','S',10),(27,'Trắng','M',12),(27,'Trắng','L',10),(27,'Trắng','XL',6),
(27,'Nâu caramel','XS',6),(27,'Nâu caramel','S',8),(27,'Nâu caramel','M',10),(27,'Nâu caramel','L',8),(27,'Nâu caramel','XL',5);

-- ITO-028: Áo len cổ lọ | Kem/Nâu/Đen/Xanh bụi × XS/S/M/L
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(28,'Kem','XS',8),(28,'Kem','S',12),(28,'Kem','M',15),(28,'Kem','L',12),
(28,'Nâu','XS',6),(28,'Nâu','S',10),(28,'Nâu','M',12),(28,'Nâu','L',10),
(28,'Đen','XS',8),(28,'Đen','S',12),(28,'Đen','M',15),(28,'Đen','L',12),
(28,'Xanh bụi','XS',5),(28,'Xanh bụi','S',8),(28,'Xanh bụi','M',10),(28,'Xanh bụi','L',8);

-- ITO-029: Váy midi | Đen/Kem/Hồng nhạt/Xanh bụi × XS/S/M/L/XL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(29,'Đen','XS',8),(29,'Đen','S',12),(29,'Đen','M',15),(29,'Đen','L',12),(29,'Đen','XL',8),
(29,'Kem','XS',8),(29,'Kem','S',10),(29,'Kem','M',12),(29,'Kem','L',10),(29,'Kem','XL',6),
(29,'Hồng nhạt','XS',6),(29,'Hồng nhạt','S',8),(29,'Hồng nhạt','M',10),(29,'Hồng nhạt','L',8),(29,'Hồng nhạt','XL',5),
(29,'Xanh bụi','XS',5),(29,'Xanh bụi','S',8),(29,'Xanh bụi','M',10),(29,'Xanh bụi','L',8),(29,'Xanh bụi','XL',4);

-- ITO-030: Tank top | Trắng/Đen/Hồng/Be/Xanh × XS/S/M/L
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(30,'Trắng','XS',10),(30,'Trắng','S',15),(30,'Trắng','M',18),(30,'Trắng','L',15),
(30,'Đen','XS',10),(30,'Đen','S',15),(30,'Đen','M',18),(30,'Đen','L',15),
(30,'Hồng','XS',8),(30,'Hồng','S',12),(30,'Hồng','M',15),(30,'Hồng','L',12),
(30,'Be','XS',6),(30,'Be','S',10),(30,'Be','M',12),(30,'Be','L',10),
(30,'Xanh','XS',6),(30,'Xanh','S',8),(30,'Xanh','M',10),(30,'Xanh','L',8);

-- ITO-031: Quần jean nữ | Xanh đậm/Xanh nhạt/Đen × 25-30
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(31,'Xanh đậm','25',10),(31,'Xanh đậm','26',12),(31,'Xanh đậm','27',15),(31,'Xanh đậm','28',15),(31,'Xanh đậm','29',12),(31,'Xanh đậm','30',8),
(31,'Xanh nhạt','25',10),(31,'Xanh nhạt','26',12),(31,'Xanh nhạt','27',15),(31,'Xanh nhạt','28',15),(31,'Xanh nhạt','29',12),(31,'Xanh nhạt','30',8),
(31,'Đen','25',8),(31,'Đen','26',10),(31,'Đen','27',12),(31,'Đen','28',12),(31,'Đen','29',10),(31,'Đen','30',6);

-- ITO-032: Cardigan | Kem/Nâu/Xám/Đen × XS/S/M/L/XL
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(32,'Kem','XS',8),(32,'Kem','S',12),(32,'Kem','M',15),(32,'Kem','L',12),(32,'Kem','XL',6),
(32,'Nâu','XS',6),(32,'Nâu','S',10),(32,'Nâu','M',12),(32,'Nâu','L',10),(32,'Nâu','XL',5),
(32,'Xám','XS',6),(32,'Xám','S',10),(32,'Xám','M',12),(32,'Xám','L',10),(32,'Xám','XL',5),
(32,'Đen','XS',8),(32,'Đen','S',12),(32,'Đen','M',15),(32,'Đen','L',12),(32,'Đen','XL',6);

-- ITO-033: Crop denim | Xanh nhạt/Xanh đậm × XS/S/M/L
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(33,'Xanh nhạt','XS',8),(33,'Xanh nhạt','S',12),(33,'Xanh nhạt','M',15),(33,'Xanh nhạt','L',12),
(33,'Xanh đậm','XS',8),(33,'Xanh đậm','S',12),(33,'Xanh đậm','M',15),(33,'Xanh đậm','L',12);

-- ITO-034: Chunky sneaker | Trắng/Đen/Be × 36-43
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(34,'Trắng','36',10),(34,'Trắng','37',12),(34,'Trắng','38',15),(34,'Trắng','39',15),(34,'Trắng','40',15),(34,'Trắng','41',12),(34,'Trắng','42',8),(34,'Trắng','43',5),
(34,'Đen','36',10),(34,'Đen','37',12),(34,'Đen','38',15),(34,'Đen','39',15),(34,'Đen','40',15),(34,'Đen','41',12),(34,'Đen','42',8),(34,'Đen','43',5),
(34,'Be','36',8),(34,'Be','37',10),(34,'Be','38',12),(34,'Be','39',12),(34,'Be','40',12),(34,'Be','41',10),(34,'Be','42',6),(34,'Be','43',4);

-- ITO-035: Loafer | Đen/Nâu/Be × 36-43
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(35,'Đen','36',8),(35,'Đen','37',10),(35,'Đen','38',12),(35,'Đen','39',12),(35,'Đen','40',12),(35,'Đen','41',10),(35,'Đen','42',6),(35,'Đen','43',4),
(35,'Nâu','36',8),(35,'Nâu','37',10),(35,'Nâu','38',12),(35,'Nâu','39',12),(35,'Nâu','40',12),(35,'Nâu','41',10),(35,'Nâu','42',6),(35,'Nâu','43',4),
(35,'Be','36',6),(35,'Be','37',8),(35,'Be','38',10),(35,'Be','39',10),(35,'Be','40',10),(35,'Be','41',8),(35,'Be','42',5),(35,'Be','43',3);

-- ITO-036: Boot cổ thấp | Đen/Nâu/Trắng × 35-40
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(36,'Đen','35',8),(36,'Đen','36',10),(36,'Đen','37',12),(36,'Đen','38',12),(36,'Đen','39',8),(36,'Đen','40',5),
(36,'Nâu','35',6),(36,'Nâu','36',8),(36,'Nâu','37',10),(36,'Nâu','38',10),(36,'Nâu','39',6),(36,'Nâu','40',4),
(36,'Trắng','35',5),(36,'Trắng','36',8),(36,'Trắng','37',10),(36,'Trắng','38',10),(36,'Trắng','39',6),(36,'Trắng','40',3);

-- ITO-037: Dép xỏ ngón | Đen/Trắng/Xanh/Đỏ × 36-43
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(37,'Đen','36',15),(37,'Đen','37',15),(37,'Đen','38',20),(37,'Đen','39',20),(37,'Đen','40',20),(37,'Đen','41',15),(37,'Đen','42',10),(37,'Đen','43',8),
(37,'Trắng','36',12),(37,'Trắng','37',12),(37,'Trắng','38',15),(37,'Trắng','39',15),(37,'Trắng','40',15),(37,'Trắng','41',12),(37,'Trắng','42',8),(37,'Trắng','43',6),
(37,'Xanh','36',10),(37,'Xanh','37',10),(37,'Xanh','38',12),(37,'Xanh','39',12),(37,'Xanh','40',12),(37,'Xanh','41',10),(37,'Xanh','42',6),(37,'Xanh','43',5),
(37,'Đỏ','36',10),(37,'Đỏ','37',10),(37,'Đỏ','38',12),(37,'Đỏ','39',12),(37,'Đỏ','40',12),(37,'Đỏ','41',10),(37,'Đỏ','42',6),(37,'Đỏ','43',5);

-- ITO-038: Slip-on | Đen/Trắng/Xám × 36-43
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(38,'Đen','36',12),(38,'Đen','37',15),(38,'Đen','38',18),(38,'Đen','39',18),(38,'Đen','40',18),(38,'Đen','41',15),(38,'Đen','42',10),(38,'Đen','43',8),
(38,'Trắng','36',12),(38,'Trắng','37',15),(38,'Trắng','38',18),(38,'Trắng','39',18),(38,'Trắng','40',18),(38,'Trắng','41',15),(38,'Trắng','42',10),(38,'Trắng','43',8),
(38,'Xám','36',10),(38,'Xám','37',12),(38,'Xám','38',15),(38,'Xám','39',15),(38,'Xám','40',15),(38,'Xám','41',12),(38,'Xám','42',8),(38,'Xám','43',6);

-- ITO-039: Oxford nữ | Đen/Nâu/Trắng kem × 35-40
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(39,'Đen','35',8),(39,'Đen','36',10),(39,'Đen','37',12),(39,'Đen','38',12),(39,'Đen','39',8),(39,'Đen','40',5),
(39,'Nâu','35',6),(39,'Nâu','36',8),(39,'Nâu','37',10),(39,'Nâu','38',10),(39,'Nâu','39',6),(39,'Nâu','40',4),
(39,'Trắng kem','35',6),(39,'Trắng kem','36',8),(39,'Trắng kem','37',10),(39,'Trắng kem','38',10),(39,'Trắng kem','39',6),(39,'Trắng kem','40',4);

-- ITO-040: Platform sneaker nữ | Trắng/Đen/Hồng × 35-40
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(40,'Trắng','35',10),(40,'Trắng','36',12),(40,'Trắng','37',15),(40,'Trắng','38',15),(40,'Trắng','39',10),(40,'Trắng','40',6),
(40,'Đen','35',10),(40,'Đen','36',12),(40,'Đen','37',15),(40,'Đen','38',15),(40,'Đen','39',10),(40,'Đen','40',6),
(40,'Hồng','35',8),(40,'Hồng','36',10),(40,'Hồng','37',12),(40,'Hồng','38',12),(40,'Hồng','39',8),(40,'Hồng','40',5);

-- ITO-041: Túi đeo chéo | Đen/Nâu/Trắng/Hồng × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(41,'Đen','One size',20),(41,'Nâu','One size',15),(41,'Trắng','One size',15),(41,'Hồng','One size',12);

-- ITO-042: Balo | Đen/Be/Xanh navy × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(42,'Đen','One size',20),(42,'Be','One size',15),(42,'Xanh navy','One size',15);

-- ITO-043: Ví da nam | Đen/Nâu × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(43,'Đen','One size',25),(43,'Nâu','One size',20);

-- ITO-044: Khăn quàng | Xám/Kem/Đen/Đỏ/Xanh navy × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(44,'Xám','One size',15),(44,'Kem','One size',15),(44,'Đen','One size',20),(44,'Đỏ','One size',12),(44,'Xanh navy','One size',12);

-- ITO-045: Kính mát | Đen/Tortoise/Trong suốt × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(45,'Đen','One size',25),(45,'Tortoise','One size',15),(45,'Trong suốt','One size',15);

-- ITO-046: Vòng tay | Đen/Trắng/Nâu/Nhiều màu × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(46,'Đen','One size',30),(46,'Trắng','One size',25),(46,'Nâu','One size',25),(46,'Nhiều màu','One size',20);

-- ITO-047: Túi clutch | Đen/Vàng/Bạc/Hồng × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(47,'Đen','One size',15),(47,'Vàng','One size',10),(47,'Bạc','One size',10),(47,'Hồng','One size',12);

-- ITO-048: Mũ fedora | Đen/Be/Nâu × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(48,'Đen','One size',20),(48,'Be','One size',15),(48,'Nâu','One size',15);

-- ITO-049: Tote da | Đen/Trắng kem/Nâu caramel × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(49,'Đen','One size',15),(49,'Trắng kem','One size',12),(49,'Nâu caramel','One size',12);

-- ITO-050: Thắt lưng canvas | Đen/Be/Xanh navy × One size
INSERT INTO `product_variants` (`product_id`,`color`,`size`,`stock`) VALUES
(50,'Đen','One size',25),(50,'Be','One size',20),(50,'Xanh navy','One size',18);

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
  `color`      VARCHAR(60)     NOT NULL DEFAULT '',
  `size`       VARCHAR(20)     NOT NULL DEFAULT '',
  `quantity`   INT UNSIGNED    NOT NULL,
  `unit_price` INT UNSIGNED    NOT NULL,
  `line_total` INT UNSIGNED    NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order`   (`order_id`),
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
--  Bảng ratings
-- ============================================================
CREATE TABLE `ratings` (
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

-- ============================================================
--  Bảng otp_tokens
-- ============================================================
CREATE TABLE `otp_tokens` (
  `email`  VARCHAR(255) NOT NULL,
  `otp`    VARCHAR(6)   NOT NULL,
  `expiry` BIGINT       NOT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Kiểm tra kết quả
-- ============================================================
SELECT 'products'         AS bang, COUNT(*) AS so_luong FROM products         UNION ALL
SELECT 'product_variants' AS bang, COUNT(*) AS so_luong FROM product_variants  UNION ALL
SELECT 'categories'       AS bang, COUNT(*) AS so_luong FROM categories;