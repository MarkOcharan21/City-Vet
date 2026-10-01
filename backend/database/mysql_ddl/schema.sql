-- ==== announcements ====
CREATE TABLE `announcements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `audience` enum('All','Owner','Staff','Veterinarian','Admin') DEFAULT 'All',
  `scheduled_at` datetime DEFAULT NULL,
  `is_sent` tinyint(1) DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_announcements_created_by` (`created_by`),
  CONSTRAINT `fk_announcements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== audit_logs ====
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `staff_name` varchar(150) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2069 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== breeds ====
CREATE TABLE `breeds` (
  `id` int(11) NOT NULL,
  `species_id` int(11) NOT NULL,
  `breed_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `species_id` (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== catalog_products ====
CREATE TABLE `catalog_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(60) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `species` enum('Dog','Cat','General') DEFAULT 'General',
  `unit` varchar(60) DEFAULT NULL,
  `subcategory` varchar(150) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `medicine_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_catalog_category` (`category`),
  KEY `idx_catalog_active` (`active`),
  KEY `medicine_id` (`medicine_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== clinic_queue ====
CREATE TABLE `clinic_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `status` enum('Waiting','In Consultation','Completed','Cancelled') NOT NULL DEFAULT 'Waiting',
  `notes` varchar(500) DEFAULT NULL,
  `checked_in_by` int(11) NOT NULL,
  `veterinarian_id` int(11) DEFAULT NULL,
  `checked_in_at` datetime NOT NULL DEFAULT current_timestamp(),
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_clinic_queue_batch_pet` (`batch_id`,`pet_id`),
  KEY `clinic_queue_pet_id` (`pet_id`),
  KEY `clinic_queue_status` (`status`),
  KEY `clinic_queue_checked_in_by` (`checked_in_by`),
  KEY `clinic_queue_veterinarian_id` (`veterinarian_id`),
  KEY `clinic_queue_batch_id` (`batch_id`),
  CONSTRAINT `fk_clinic_queue_batch` FOREIGN KEY (`batch_id`) REFERENCES `consultation_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_clinic_queue_checked_in_by` FOREIGN KEY (`checked_in_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_clinic_queue_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_clinic_queue_veterinarian` FOREIGN KEY (`veterinarian_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== condition_regimens ====
CREATE TABLE `condition_regimens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `complaint` varchar(255) DEFAULT NULL,
  `diagnosis` varchar(255) DEFAULT NULL,
  `treatment` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=246 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== condition_regimen_items ====
CREATE TABLE `condition_regimen_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `regimen_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `dosage` varchar(100) DEFAULT NULL,
  `frequency` varchar(100) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `instructions` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `regimen_medicine` (`regimen_id`,`medicine_id`),
  KEY `regimen_id` (`regimen_id`),
  KEY `medicine_id` (`medicine_id`)
) ENGINE=InnoDB AUTO_INCREMENT=296 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== consultation_batches ====
CREATE TABLE `consultation_batches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_token` varchar(100) NOT NULL,
  `created_by` int(11) NOT NULL,
  `status` enum('Active','Completed','Cancelled') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_consultation_batches_token` (`batch_token`),
  KEY `consultation_batches_created_by` (`created_by`),
  KEY `consultation_batches_status` (`status`),
  CONSTRAINT `fk_consultation_batches_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== consultation_charges ====
CREATE TABLE `consultation_charges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `consultation_id` int(11) NOT NULL,
  `catalog_product_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `consultation_charges_consultation_id` (`consultation_id`),
  KEY `consultation_charges_catalog_product_id` (`catalog_product_id`),
  CONSTRAINT `fk_consultation_charges_catalog` FOREIGN KEY (`catalog_product_id`) REFERENCES `catalog_products` (`id`),
  CONSTRAINT `fk_consultation_charges_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultation_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== consultation_records ====
CREATE TABLE `consultation_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_id` int(11) NOT NULL,
  `queue_id` int(11) DEFAULT NULL,
  `complaint` varchar(255) DEFAULT NULL,
  `diagnosis` text DEFAULT NULL,
  `treatment_plan` text DEFAULT NULL,
  `consultation_date` date DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `vet_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_consultation_queue_id` (`queue_id`),
  KEY `pet_id` (`pet_id`),
  KEY `vet_id` (`vet_id`),
  CONSTRAINT `fk_consultation_queue` FOREIGN KEY (`queue_id`) REFERENCES `clinic_queue` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=434 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== draft_registrations ====
CREATE TABLE `draft_registrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_owner_id` int(11) NOT NULL,
  `temp_reg_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`temp_reg_info`)),
  `device_id` varchar(100) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `sync_state` enum('Draft','Pending Sync','Synced') DEFAULT 'Draft',
  `sync_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `pet_owner_id` (`pet_owner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== medicines ====
CREATE TABLE `medicines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `medicine_name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` varchar(60) DEFAULT NULL,
  `default_dosage` varchar(100) DEFAULT NULL,
  `default_frequency` varchar(100) DEFAULT NULL,
  `default_duration` varchar(100) DEFAULT NULL,
  `default_instructions` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== mobile_scan_sessions ====
CREATE TABLE `mobile_scan_sessions` (
  `session_id` varchar(64) NOT NULL,
  `pet_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`pet_data`)),
  `scan_mode` varchar(20) DEFAULT 'single',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== notifications ====
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `type` enum('Vaccination','Payment','QR','LostPet','System','Announcement','Record','Registration','ClinicQueue') NOT NULL DEFAULT 'System',
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2444 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== official_receipts ====
CREATE TABLE `official_receipts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_owner_id` int(11) NOT NULL,
  `or_number` varchar(100) NOT NULL,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `or_photo_path` varchar(500) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `status` enum('Pending','Partially Verified','Verified') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `ocr_text` text DEFAULT NULL,
  `ocr_confidence` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_or_number` (`or_number`),
  KEY `pet_owner_id` (`pet_owner_id`),
  CONSTRAINT `official_receipts_ibfk_1` FOREIGN KEY (`pet_owner_id`) REFERENCES `pet_owners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=142 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== outreach_programs ====
CREATE TABLE `outreach_programs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `program_name` varchar(150) NOT NULL,
  `event_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('Setup','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Setup',
  `qr_token` varchar(64) DEFAULT NULL,
  `qr_image_path` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outreach_program_qr` (`qr_token`),
  KEY `status` (`status`),
  KEY `event_date` (`event_date`),
  KEY `fk_outreach_created_by` (`created_by`),
  CONSTRAINT `fk_outreach_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== outreach_program_services ====
CREATE TABLE `outreach_program_services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `outreach_id` int(11) NOT NULL,
  `service_name` varchar(150) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `outreach_id` (`outreach_id`),
  CONSTRAINT `fk_ops_outreach` FOREIGN KEY (`outreach_id`) REFERENCES `outreach_programs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== outreach_transactions ====
CREATE TABLE `outreach_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `outreach_id` int(11) NOT NULL,
  `qr_token` varchar(255) NOT NULL,
  `qr_image_path` varchar(500) DEFAULT NULL,
  `pet_owner_id` int(11) DEFAULT NULL,
  `pet_id` int(11) DEFAULT NULL,
  `owner_name` varchar(150) DEFAULT NULL,
  `owner_contact` varchar(50) DEFAULT NULL,
  `pet_name` varchar(100) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `service_date` date DEFAULT NULL,
  `service_time` time DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('Pending','Submitted','Verified','Rejected') NOT NULL DEFAULT 'Pending',
  `submitted_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outreach_qr_token` (`qr_token`),
  KEY `outreach_id` (`outreach_id`),
  KEY `pet_owner_id` (`pet_owner_id`),
  KEY `pet_id` (`pet_id`),
  KEY `status` (`status`),
  KEY `barangay` (`barangay`),
  KEY `fk_ot_verified_by` (`verified_by`),
  CONSTRAINT `fk_ot_outreach` FOREIGN KEY (`outreach_id`) REFERENCES `outreach_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ot_owner` FOREIGN KEY (`pet_owner_id`) REFERENCES `pet_owners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ot_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ot_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== outreach_transaction_items ====
CREATE TABLE `outreach_transaction_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `service_name` varchar(150) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `fk_oti_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `outreach_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=167 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== owner_locations ====
CREATE TABLE `owner_locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_owner_id` int(11) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `accuracy_meters` decimal(10,2) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_owner_locations_owner_time` (`pet_owner_id`,`recorded_at`),
  CONSTRAINT `owner_locations_owner_fk` FOREIGN KEY (`pet_owner_id`) REFERENCES `pet_owners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1812 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== password_reset_requests ====
CREATE TABLE `password_reset_requests` (
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== payments ====
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_owner_id` int(11) NOT NULL,
  `pet_id` int(11) NOT NULL,
  `payment_type_id` int(11) NOT NULL,
  `or_id` int(11) DEFAULT NULL,
  `or_number` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `payment_status` enum('Paid','Pending') DEFAULT 'Pending',
  `validation_status` enum('Pending Verification','Verified','Rejected') DEFAULT 'Pending Verification',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `rejection_reason` varchar(500) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `qr_code_path` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pet_owner_id` (`pet_owner_id`),
  KEY `pet_id` (`pet_id`),
  KEY `payment_type_id` (`payment_type_id`),
  KEY `fk_payments_or` (`or_id`),
  KEY `fk_payments_reviewed_by` (`reviewed_by`),
  CONSTRAINT `fk_payments_or` FOREIGN KEY (`or_id`) REFERENCES `official_receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=187 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== payment_monitoring ====
CREATE TABLE `payment_monitoring` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `or_number` varchar(100) DEFAULT NULL,
  `or_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `or_date` date DEFAULT NULL,
  `or_time` time DEFAULT NULL,
  `or_description` varchar(255) DEFAULT NULL,
  `payment_items` text DEFAULT NULL,
  `or_photo_path` varchar(500) DEFAULT NULL,
  `ocr_text` mediumtext DEFAULT NULL,
  `ocr_confidence` decimal(5,2) DEFAULT NULL,
  `pet_owner_id` int(11) DEFAULT NULL,
  `pet_id` int(11) DEFAULT NULL,
  `payment_type` enum('Consultation','Vaccination','Medicine','Outreach') DEFAULT NULL,
  `medicine_id` int(11) DEFAULT NULL,
  `medicine_quantity` varchar(50) DEFAULT NULL,
  `medicine_total` decimal(10,2) DEFAULT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `pm_token` varchar(64) DEFAULT NULL,
  `receipt_qr_path` varchar(500) DEFAULT NULL,
  `consultation_id` int(11) DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `payment_status` enum('Unpaid','Paid','Cancelled') NOT NULL DEFAULT 'Unpaid',
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `consultation_date` date DEFAULT NULL,
  `status_updated_by` int(11) DEFAULT NULL,
  `status_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pm_or_number` (`or_number`),
  UNIQUE KEY `uk_pm_token` (`pm_token`),
  UNIQUE KEY `uk_pm_consultation_id` (`consultation_id`),
  UNIQUE KEY `uk_pm_payment_reference` (`payment_reference`),
  KEY `pet_owner_id` (`pet_owner_id`),
  KEY `medicine_id` (`medicine_id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `idx_pm_pet` (`pet_id`),
  KEY `idx_pm_status` (`payment_status`),
  KEY `idx_pm_status_updated_by` (`status_updated_by`),
  CONSTRAINT `fk_pm_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultation_records` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pm_medicine` FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pm_owner` FOREIGN KEY (`pet_owner_id`) REFERENCES `pet_owners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pm_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pm_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_pm_status_updated_by` FOREIGN KEY (`status_updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=352 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== payment_types ====
CREATE TABLE `payment_types` (
  `id` int(11) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `default_amount` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== pets ====
CREATE TABLE `pets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_owner_id` int(11) NOT NULL,
  `pet_code` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `species_id` int(11) NOT NULL,
  `breed_id` int(11) DEFAULT NULL,
  `breed_custom` varchar(100) DEFAULT NULL,
  `sex` enum('Male','Female') NOT NULL,
  `color` varchar(100) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `registration_date` date DEFAULT curdate(),
  `status` enum('Registered','Verified') DEFAULT 'Registered',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `photo` varchar(255) DEFAULT NULL,
  `is_lost` tinyint(1) DEFAULT 0,
  `lost_date` datetime DEFAULT NULL,
  `last_seen` varchar(255) DEFAULT NULL,
  `reward` varchar(100) DEFAULT NULL,
  `allergies` varchar(255) DEFAULT NULL,
  `current_medication` varchar(255) DEFAULT NULL,
  `important_conditions` varchar(255) DEFAULT NULL,
  `special_instructions` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pet_code` (`pet_code`),
  KEY `pet_owner_id` (`pet_owner_id`),
  KEY `species_id` (`species_id`),
  KEY `breed_id` (`breed_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1692 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== pet_owners ====
CREATE TABLE `pet_owners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_payment_current` tinyint(1) DEFAULT 0,
  `emergency_contact_name` varchar(150) DEFAULT NULL,
  `emergency_contact_number` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1776 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== pet_procedures ====
CREATE TABLE `pet_procedures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_id` int(11) NOT NULL,
  `procedure_type` enum('Spay / Neuter','Surgery','Laboratory','Dental','Grooming','Other') NOT NULL,
  `procedure_name` varchar(150) DEFAULT NULL,
  `procedure_date` date NOT NULL,
  `veterinarian` varchar(150) DEFAULT NULL,
  `result_notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pp_pet` (`pet_id`),
  CONSTRAINT `fk_pp_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== prescriptions ====
CREATE TABLE `prescriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `consultation_id` int(11) NOT NULL,
  `prescribed_date` date DEFAULT curdate(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `consultation_id` (`consultation_id`)
) ENGINE=InnoDB AUTO_INCREMENT=260 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== prescription_items ====
CREATE TABLE `prescription_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `prescription_id` int(11) NOT NULL,
  `medicine_id` int(11) NOT NULL,
  `quantity` varchar(50) DEFAULT NULL,
  `dosage` varchar(100) DEFAULT NULL,
  `frequency` varchar(100) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `instructions` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `prescription_id` (`prescription_id`),
  KEY `medicine_id` (`medicine_id`)
) ENGINE=InnoDB AUTO_INCREMENT=406 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== preventive_care_records ====
CREATE TABLE `preventive_care_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_id` int(11) NOT NULL,
  `care_type` enum('Deworming','Flea / Tick Preventive','Heartworm Preventive','Other') NOT NULL,
  `product_name` varchar(150) DEFAULT NULL,
  `date_administered` date NOT NULL,
  `next_due_date` date DEFAULT NULL,
  `administered_by` varchar(150) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pc_pet` (`pet_id`),
  CONSTRAINT `fk_pc_pet` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=304 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== qr_codes ====
CREATE TABLE `qr_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_id` int(11) NOT NULL,
  `qr_token` varchar(255) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `issue_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Pending','Generated') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `pet_id` (`pet_id`),
  UNIQUE KEY `qr_token` (`qr_token`)
) ENGINE=InnoDB AUTO_INCREMENT=1651 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== record_requests ====
CREATE TABLE `record_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pet_owner_id` int(11) NOT NULL,
  `pet_id` int(11) NOT NULL,
  `request_group_id` int(11) DEFAULT NULL,
  `request_type` varchar(100) DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `format` varchar(50) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `status` enum('Pending','Issued') DEFAULT 'Pending',
  `requested_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `issued_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pet_owner_id` (`pet_owner_id`),
  KEY `pet_id` (`pet_id`),
  KEY `idx_req_group` (`request_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== roles ====
CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== species ====
CREATE TABLE `species` (
  `id` int(11) NOT NULL,
  `species_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== users ====
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT 'Owner',
  `status` enum('pending','active','inactive') DEFAULT 'active',
  `full_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reset_code` varchar(10) DEFAULT NULL,
  `reset_code_expiry` datetime DEFAULT NULL,
  `reset_code_sent_at` datetime DEFAULT NULL,
  `reset_code_attempts` int(11) NOT NULL DEFAULT 0,
  `verify_code` varchar(10) DEFAULT NULL,
  `verify_code_expiry` datetime DEFAULT NULL,
  `verify_sent_at` datetime DEFAULT NULL,
  `account_id` varchar(20) DEFAULT NULL,
  `setup_token` varchar(64) DEFAULT NULL,
  `setup_token_expiry` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uk_users_account_id` (`account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1807 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== vaccination_records ====
CREATE TABLE `vaccination_records` (
  `id` int(11) NOT NULL,
  `pet_id` int(11) NOT NULL,
  `vaccine_id` int(11) NOT NULL,
  `dose_no` int(11) DEFAULT NULL,
  `dose_label` varchar(100) DEFAULT NULL,
  `date_administered` date DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `status` enum('Updated','Due','Overdue') DEFAULT 'Due',
  `administered_by` int(11) DEFAULT NULL,
  `comments` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== vaccines ====
CREATE TABLE `vaccines` (
  `id` int(11) NOT NULL,
  `vaccine_name` varchar(150) NOT NULL,
  `species_id` int(11) DEFAULT NULL,
  `manufacturer` varchar(150) DEFAULT NULL,
  `interval_days` int(11) DEFAULT 365
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==== vaccine_schedules ====
CREATE TABLE `vaccine_schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vaccine_id` int(11) NOT NULL,
  `species_id` int(11) DEFAULT NULL,
  `dose_no` int(11) NOT NULL,
  `dose_label` varchar(120) NOT NULL,
  `interval_days` int(11) NOT NULL,
  `min_age_days` int(11) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vs_vaccine` (`vaccine_id`),
  KEY `idx_vs_vaccine_species` (`vaccine_id`,`species_id`,`dose_no`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
