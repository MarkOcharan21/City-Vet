-- Booklet records: preventive care, procedures, and owner emergency info.
-- Run: mysql -u root pet_vet_system < backend/database/migrations/add_booklet_records.sql

CREATE TABLE IF NOT EXISTS preventive_care_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pet_id INT NOT NULL,
  care_type ENUM('Deworming','Flea / Tick Preventive','Heartworm Preventive','Other') NOT NULL,
  product_name VARCHAR(150) DEFAULT NULL,
  date_administered DATE NOT NULL,
  next_due_date DATE DEFAULT NULL,
  administered_by VARCHAR(150) DEFAULT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pc_pet (pet_id),
  CONSTRAINT fk_pc_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS pet_procedures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pet_id INT NOT NULL,
  procedure_type ENUM('Spay / Neuter','Surgery','Laboratory','Dental','Grooming','Other') NOT NULL,
  procedure_name VARCHAR(150) DEFAULT NULL,
  procedure_date DATE NOT NULL,
  veterinarian VARCHAR(150) DEFAULT NULL,
  result_notes VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pp_pet (pet_id),
  CONSTRAINT fk_pp_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Owner emergency information lives on pet_owners (per-owner, applies to their pets).
ALTER TABLE pet_owners
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(30) DEFAULT NULL;

-- Pet-level medical flags for the booklet's emergency card.
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS allergies VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_medication VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS important_conditions VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS special_instructions VARCHAR(255) DEFAULT NULL;
