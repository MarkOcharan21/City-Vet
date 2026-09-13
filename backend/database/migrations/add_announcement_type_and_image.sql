-- ============================================================
-- Migration: announcement fixes
-- 1. Add 'Announcement' to notifications.type enum
-- 2. Add image column to announcements table
-- Run once against pet_vet_system
-- ============================================================

-- 1. Extend the notifications type enum
ALTER TABLE `notifications`
  MODIFY COLUMN `type`
    ENUM('Vaccination','Payment','QR','LostPet','System','Announcement','Record')
    NOT NULL DEFAULT 'System';

-- 2. Add image path column to announcements (nullable)
ALTER TABLE `announcements`
  ADD COLUMN `image` VARCHAR(255) DEFAULT NULL AFTER `message`;
