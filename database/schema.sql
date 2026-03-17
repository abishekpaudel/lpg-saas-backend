-- ============================================================
-- LPG Gas Queue Management System - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS gas_queue_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gas_queue_system;

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20)  DEFAULT NULL,
  role          ENUM('SUPER_ADMIN','SUPPLIER','CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  avatar_url    VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SUPPLIERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id             VARCHAR(36)  NOT NULL,
  business_name       VARCHAR(191) NOT NULL,
  description         TEXT         DEFAULT NULL,
  address             VARCHAR(500) DEFAULT NULL,
  city                VARCHAR(100) DEFAULT NULL,
  state               VARCHAR(100) DEFAULT NULL,
  latitude            DECIMAL(10,7) DEFAULT NULL,
  longitude           DECIMAL(10,7) DEFAULT NULL,
  phone               VARCHAR(20)  DEFAULT NULL,
  email               VARCHAR(191) DEFAULT NULL,
  logo_url            VARCHAR(500) DEFAULT NULL,
  is_approved         TINYINT(1)   NOT NULL DEFAULT 0,
  is_open             TINYINT(1)   NOT NULL DEFAULT 1,
  opening_hours       VARCHAR(100) DEFAULT '08:00-18:00',
  avg_rating          DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_reviews       INT          NOT NULL DEFAULT 0,
  total_deliveries    INT          NOT NULL DEFAULT 0,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_suppliers_user     (user_id),
  INDEX idx_suppliers_approved (is_approved),
  INDEX idx_suppliers_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  name        VARCHAR(191)  NOT NULL,
  description TEXT          DEFAULT NULL,
  weight_kg   DECIMAL(8,2)  NOT NULL,
  category    VARCHAR(100)  DEFAULT 'LPG',
  image_url   VARCHAR(500)  DEFAULT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── STOCK ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  supplier_id       VARCHAR(36)   NOT NULL,
  product_id        VARCHAR(36)   NOT NULL,
  quantity_available INT          NOT NULL DEFAULT 0,
  quantity_reserved  INT          NOT NULL DEFAULT 0,
  price_per_unit    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  last_restocked_at DATETIME      DEFAULT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE CASCADE,
  UNIQUE KEY uq_stock_supplier_product (supplier_id, product_id),
  INDEX idx_stock_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  booking_number    VARCHAR(20)   NOT NULL UNIQUE,
  customer_id       VARCHAR(36)   NOT NULL,
  supplier_id       VARCHAR(36)   NOT NULL,
  stock_id          VARCHAR(36)   NOT NULL,
  quantity          INT           NOT NULL DEFAULT 1,
  unit_price        DECIMAL(10,2) NOT NULL,
  total_amount      DECIMAL(10,2) NOT NULL,
  status            ENUM('PENDING','QUEUED','PROCESSING','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  queue_position    INT           DEFAULT NULL,
  delivery_address  VARCHAR(500)  DEFAULT NULL,
  delivery_lat      DECIMAL(10,7) DEFAULT NULL,
  delivery_lng      DECIMAL(10,7) DEFAULT NULL,
  notes             TEXT          DEFAULT NULL,
  confirmed_at      DATETIME      DEFAULT NULL,
  delivered_at      DATETIME      DEFAULT NULL,
  cancelled_at      DATETIME      DEFAULT NULL,
  cancellation_reason TEXT        DEFAULT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)  ON DELETE CASCADE,
  FOREIGN KEY (stock_id)    REFERENCES stock(id)      ON DELETE CASCADE,
  INDEX idx_bookings_customer (customer_id),
  INDEX idx_bookings_supplier (supplier_id),
  INDEX idx_bookings_status   (status),
  INDEX idx_bookings_number   (booking_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── QUEUE ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue (
  id           VARCHAR(36) NOT NULL PRIMARY KEY,
  booking_id   VARCHAR(36) NOT NULL UNIQUE,
  supplier_id  VARCHAR(36) NOT NULL,
  customer_id  VARCHAR(36) NOT NULL,
  position     INT         NOT NULL,
  status       ENUM('WAITING','PROCESSING','DONE','CANCELLED') NOT NULL DEFAULT 'WAITING',
  entered_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME    DEFAULT NULL,
  FOREIGN KEY (booking_id)  REFERENCES bookings(id)  ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id)     ON DELETE CASCADE,
  INDEX idx_queue_supplier (supplier_id),
  INDEX idx_queue_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  booking_id       VARCHAR(36)   NOT NULL UNIQUE,
  customer_id      VARCHAR(36)   NOT NULL,
  amount           DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(3)    NOT NULL DEFAULT 'NPR',
  method           ENUM('CASH','CARD','MOBILE_BANKING','WALLET') NOT NULL DEFAULT 'CASH',
  status           ENUM('PENDING','COMPLETED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  transaction_ref  VARCHAR(191)  DEFAULT NULL,
  paid_at          DATETIME      DEFAULT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id)  REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_payments_booking  (booking_id),
  INDEX idx_payments_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REVIEWS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  booking_id  VARCHAR(36) NOT NULL UNIQUE,
  customer_id VARCHAR(36) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  rating      TINYINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT        DEFAULT NULL,
  is_visible  TINYINT(1)  NOT NULL DEFAULT 1,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id)  REFERENCES bookings(id)  ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_reviews_supplier (supplier_id),
  INDEX idx_reviews_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PLATFORM SETTINGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id          INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT        DEFAULT NULL,
  description VARCHAR(500) DEFAULT NULL,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO platform_settings (setting_key, value, description) VALUES
  ('max_queue_per_supplier', '50', 'Maximum customers in queue per supplier'),
  ('booking_cancellation_window_mins', '30', 'Minutes customer can cancel booking after joining queue'),
  ('platform_fee_percent', '2', 'Platform fee percentage on each booking'),
  ('min_rating_for_approval', '3.5', 'Minimum avg rating before warnings'),
  ('maintenance_mode', '0', 'Set to 1 to enable maintenance mode');

-- ─── BLOG POSTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  author_id    VARCHAR(36)  NOT NULL,
  title        VARCHAR(300) NOT NULL,
  slug         VARCHAR(320) NOT NULL UNIQUE,
  excerpt      TEXT         DEFAULT NULL,
  content      LONGTEXT     NOT NULL,
  cover_image  VARCHAR(500) DEFAULT NULL,
  category     VARCHAR(80)  DEFAULT 'General',
  tags         VARCHAR(500) DEFAULT NULL,
  is_published TINYINT(1)   NOT NULL DEFAULT 0,
  views        INT          NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_blog_slug      (slug),
  INDEX idx_blog_published (is_published),
  INDEX idx_blog_author    (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
