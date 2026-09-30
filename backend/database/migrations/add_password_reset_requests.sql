-- ============================================================
-- Migration: Staff password reset request approval workflow
-- 1. password_reset_requests table (staff-initiated, admin-gated)
-- 2. users.reset_code_attempts (OTP brute-force lockout counter)
-- Run once against pet_vet_system
-- ============================================================

-- 1. Reset request queue. Staff/Veterinarian create a 'pending' row via the
--    forgot-password endpoint; the Admin approves/declines it; approval
--    auto-emails the 6-digit reset code to the requester.
CREATE TABLE IF NOT EXISTS `password_reset_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `denied_by` int(11) DEFAULT NULL,
  `denied_at` datetime DEFAULT NULL,
  `decline_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Timestamp of the last reset code email (30s resend cooldown for the
--    Owner/Admin self-service OTP path) and the count of wrong OTP guesses in
--    the reset-password step (max 5 before the code is invalidated) — prevents
--    OTP flooding and brute-forcing the 6-digit code.
ALTER TABLE `users`
  ADD COLUMN `reset_code_sent_at` DATETIME NULL AFTER `reset_code_expiry`,
  ADD COLUMN `reset_code_attempts` INT NOT NULL DEFAULT 0 AFTER `reset_code_sent_at`;