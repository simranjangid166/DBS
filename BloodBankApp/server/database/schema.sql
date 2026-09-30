-- =====================================================================
--  Blood Bank & Donor Locator - MySQL Schema
--  Target: MySQL 8.x / MariaDB 10.5+
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS donation_history;
DROP TABLE IF EXISTS donor_requests;
DROP TABLE IF EXISTS blood_requests;
DROP TABLE IF EXISTS recipients;
DROP TABLE IF EXISTS donors;
DROP TABLE IF EXISTS blood_banks;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL UNIQUE,
    phone         VARCHAR(32)   NULL,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('donor','recipient','admin') NOT NULL,
    status        ENUM('active','inactive','pending') NOT NULL DEFAULT 'active',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- donors
-- ---------------------------------------------------------------------
CREATE TABLE donors (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE,
    blood_group         ENUM('O-','O+','A-','A+','B-','B+','AB-','AB+') NOT NULL,
    age                 INT NOT NULL,
    gender              ENUM('Male','Female','Other') NOT NULL DEFAULT 'Male',
    address             VARCHAR(255)  NULL,
    city                VARCHAR(120)  NULL,
    latitude            DECIMAL(10,7) NULL,
    longitude           DECIMAL(10,7) NULL,
    availability_status TINYINT(1)    NOT NULL DEFAULT 1,
    last_donation_date  DATE          NULL,
    verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
    total_donations     INT           NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_donor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_donor_bg (blood_group),
    INDEX idx_donor_avail (availability_status),
    INDEX idx_donor_verif (verification_status),
    INDEX idx_donor_geo (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- recipients
-- ---------------------------------------------------------------------
CREATE TABLE recipients (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    blood_group ENUM('O-','O+','A-','A+','B-','B+','AB-','AB+') NOT NULL,
    address     VARCHAR(255)  NULL,
    city        VARCHAR(120)  NULL,
    latitude    DECIMAL(10,7) NULL,
    longitude   DECIMAL(10,7) NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_recipient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_recipient_bg (blood_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- blood_banks
-- ---------------------------------------------------------------------
CREATE TABLE blood_banks (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    name                   VARCHAR(160) NOT NULL,
    address                VARCHAR(255) NULL,
    city                   VARCHAR(120) NULL,
    phone                  VARCHAR(32)  NULL,
    email                  VARCHAR(160) NULL,
    latitude               DECIMAL(10,7) NULL,
    longitude              DECIMAL(10,7) NULL,
    available_blood_groups VARCHAR(120) NULL,  -- CSV of blood groups
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bb_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- blood_requests
-- ---------------------------------------------------------------------
CREATE TABLE blood_requests (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id       INT NOT NULL,
    blood_group        ENUM('O-','O+','A-','A+','B-','B+','AB-','AB+') NOT NULL,
    units_required     INT NOT NULL DEFAULT 1,
    hospital_name      VARCHAR(160) NOT NULL,
    hospital_address   VARCHAR(255) NULL,
    latitude           DECIMAL(10,7) NULL,
    longitude          DECIMAL(10,7) NULL,
    urgency            ENUM('normal','urgent','critical') NOT NULL DEFAULT 'urgent',
    additional_message TEXT NULL,
    status             ENUM('pending','matched','accepted','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_request_recipient FOREIGN KEY (recipient_id) REFERENCES recipients(id) ON DELETE CASCADE,
    INDEX idx_req_status (status),
    INDEX idx_req_bg (blood_group),
    INDEX idx_req_urgency (urgency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- donor_requests (donor <-> blood_request response)
-- ---------------------------------------------------------------------
CREATE TABLE donor_requests (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    donor_id         INT NOT NULL,
    blood_request_id INT NOT NULL,
    response_status  ENUM('pending','accepted','rejected','completed') NOT NULL DEFAULT 'pending',
    responded_at     TIMESTAMP NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dr_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    CONSTRAINT fk_dr_req   FOREIGN KEY (blood_request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_donor_request (donor_id, blood_request_id),
    INDEX idx_dr_status (response_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- donation_history
-- ---------------------------------------------------------------------
CREATE TABLE donation_history (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    donor_id         INT NOT NULL,
    blood_request_id INT NULL,
    donation_date    DATE NOT NULL,
    units_donated    INT NOT NULL DEFAULT 1,
    hospital_name    VARCHAR(160) NULL,
    notes            TEXT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dh_donor FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    CONSTRAINT fk_dh_req   FOREIGN KEY (blood_request_id) REFERENCES blood_requests(id) ON DELETE SET NULL,
    INDEX idx_dh_date (donation_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        VARCHAR(60) NOT NULL,   -- e.g. new_request, donor_response, request_status
    title       VARCHAR(160) NOT NULL,
    message     TEXT NULL,
    payload     JSON NULL,
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user (user_id),
    INDEX idx_notif_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
