-- Migration: add reset_code and reset_code_expiry columns to users table
-- Run this once in phpMyAdmin or via MySQL CLI

ALTER TABLE `users`
  ADD COLUMN `reset_code` varchar(6) DEFAULT NULL,
  ADD COLUMN `reset_code_expiry` datetime DEFAULT NULL;
 K