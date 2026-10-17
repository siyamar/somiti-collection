CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(11) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','collector') NOT NULL DEFAULT 'collector',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  nid VARCHAR(17) NULL,
  area VARCHAR(100) NOT NULL,
  address VARCHAR(255) NULL,
  nominee_name VARCHAR(100) NULL,
  nominee_phone VARCHAR(11) NULL,
  daily_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  photo_path VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  joined_at DATE NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_members_area (area, status),
  INDEX idx_members_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collection_days (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  collect_date DATE NOT NULL UNIQUE,
  status ENUM('draft','confirmed') NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by INT UNSIGNED NOT NULL,
  confirmed_by INT UNSIGNED NULL,
  confirmed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  day_id INT UNSIGNED NOT NULL,
  member_id INT UNSIGNED NOT NULL,
  expected_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  note VARCHAR(255) NULL,
  updated_by INT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_day_member (day_id, member_id),
  FOREIGN KEY (day_id) REFERENCES collection_days(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (updated_by) REFERENCES users(id),
  INDEX idx_coll_member (member_id),
  CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS collection_corrections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  collection_id INT UNSIGNED NOT NULL,
  old_amount DECIMAL(12,2) NOT NULL,
  new_amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  corrected_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES collections(id),
  FOREIGN KEY (corrected_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sms_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id INT UNSIGNED NULL,
  phone VARCHAR(11) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  next_try_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gateway_response TEXT NULL,
  day_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (day_id) REFERENCES collection_days(id),
  INDEX idx_sms_queue (status, next_try_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(60) PRIMARY KEY,
  `value` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`,`value`) VALUES
 ('org_name','সবুজ বাংলা সমবায় সমিতি লিঃ'),
 ('org_short','সবুজ বাংলা'),
 ('org_address',''),
 ('org_phone',''),
 ('logo_path','/logo.png'),
 ('member_code_next','1'),
 ('sms_enabled','1'),
 ('sms_api_url',''),
 ('sms_api_key',''),
 ('sms_sender_id',''),
 ('sms_template','{name}, আজ {date} ৳{amount} জমা হয়েছে। আপনার মোট জমা ৳{total}। -{org}')
ON DUPLICATE KEY UPDATE `key`=`key`;
