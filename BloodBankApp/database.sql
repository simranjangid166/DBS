-- Convenience wrapper: create DB, user, then load schema.
-- Run as: sudo mysql < /app/database.sql
CREATE DATABASE IF NOT EXISTS bloodbank
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'bloodbank'@'localhost' IDENTIFIED BY 'bloodbank_pass_2026';
GRANT ALL PRIVILEGES ON bloodbank.* TO 'bloodbank'@'localhost';
FLUSH PRIVILEGES;

USE bloodbank;
SOURCE /app/server/database/schema.sql;
-- Seed data is inserted programmatically by /app/server/database/init.js
-- so passwords are always bcrypt-hashed. Run:
--   cd /app/server && node database/init.js --force
