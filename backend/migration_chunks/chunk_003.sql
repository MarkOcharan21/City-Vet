
INSERT INTO "catalog_products" ("id", "category", "product_name", "species", "unit", "subcategory", "price", "active", "sort_order", "created_at", "updated_at", "medicine_id") VALUES (42, 'Other Supplies', 'Gauze', 'General', NULL, 'Wound Care', '10.00', 1, 42, '2026-09-17T12:36:13.000Z', '2026-09-17T12:36:13.000Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "catalog_products" ("id", "category", "product_name", "species", "unit", "subcategory", "price", "active", "sort_order", "created_at", "updated_at", "medicine_id") VALUES (43, 'Other Supplies', 'Cotton / Cotton Balls', 'General', NULL, 'Wound Care', '10.00', 1, 43, '2026-09-17T12:36:13.000Z', '2026-09-17T12:36:13.000Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "catalog_products" ("id", "category", "product_name", "species", "unit", "subcategory", "price", "active", "sort_order", "created_at", "updated_at", "medicine_id") VALUES (44, 'Other Supplies', 'Disposable Gloves', 'General', NULL, 'Veterinary Procedure', '5.00', 1, 44, '2026-09-17T12:36:13.000Z', '2026-09-17T12:36:13.000Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "catalog_products" ("id", "category", "product_name", "species", "unit", "subcategory", "price", "active", "sort_order", "created_at", "updated_at", "medicine_id") VALUES (45, 'Other Supplies', 'Bandage', 'General', NULL, 'Wound Care', '20.00', 1, 45, '2026-09-17T12:36:13.000Z', '2026-09-17T12:36:13.000Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "catalog_products" ("id", "category", "product_name", "species", "unit", "subcategory", "price", "active", "sort_order", "created_at", "updated_at", "medicine_id") VALUES (46, 'Other Supplies', 'Alcohol / Disinfectant', 'General', NULL, 'Cleaning', '30.00', 1, 46, '2026-09-17T12:36:13.000Z', '2026-09-17T12:36:13.000Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "catalog_products" ("id", "category", "product_name", "species", "unit", "subcategory", "price", "active", "sort_order", "created_at", "updated_at", "medicine_id") VALUES (47, 'Consultation', 'Consultation Fee', 'General', NULL, 'Check-up', '250.00', 1, 47, '2026-09-17T12:36:13.000Z', '2026-09-17T12:36:13.000Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "catalog_products" ("id", "category", "product_name", "species", "unit", "subcategory", "price", "active", "sort_order", "created_at", "updated_at", "medicine_id") VALUES (48, 'Consultation', 'Repeat Consultation', 'General', NULL, 'Follow-up', '150.00', 1, 48, '2026-09-17T12:36:13.000Z', '2026-09-17T12:36:13.000Z', NULL) ON CONFLICT DO NOTHING;

-- Data for clinic_queue (1 rows)
INSERT INTO "clinic_queue" ("id", "pet_id", "batch_id", "status", "notes", "checked_in_by", "veterinarian_id", "checked_in_at", "started_at", "completed_at", "created_at", "updated_at") VALUES (4, 415, 4, 'Completed', NULL, 209, 210, '2026-09-25T16:45:57.000Z', NULL, '2026-09-25T16:49:44.000Z', '2026-09-25T16:45:57.000Z', '2026-09-25T16:49:44.000Z') ON CONFLICT DO NOTHING;

-- Data for condition_regimen_items (11 rows)
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (1, 2, 5, NULL, NULL, NULL, NULL, 0, '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (2, 3, 1, NULL, NULL, NULL, NULL, 0, '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (3, 4, 1, NULL, NULL, NULL, NULL, 0, '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (4, 5, 1, NULL, NULL, NULL, NULL, 0, '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (5, 5, 6, NULL, NULL, NULL, NULL, 1, '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (23, 3, 7, NULL, NULL, NULL, NULL, 1, '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (25, 4, 2, NULL, NULL, NULL, NULL, 1, '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (28, 26, 10, NULL, NULL, NULL, NULL, 0, '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (29, 27, 3, NULL, NULL, NULL, NULL, 0, '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (30, 27, 12, NULL, NULL, NULL, NULL, 1, '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimen_items" ("id", "regimen_id", "medicine_id", "dosage", "frequency", "duration", "instructions", "sort_order", "created_at") VALUES (31, 28, 9, NULL, NULL, NULL, NULL, 0, '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;

-- Data for condition_regimens (9 rows)
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (1, 'Anti-Rabies Vaccination', 'Owner brought the pet in for anti-rabies vaccination.', 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', 1, 1, '2026-09-27T13:10:40.000Z', '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (2, 'Deworming', 'Owner brought the pet in for routine deworming.', 'Routine deworming visit. Pet in generally good condition.', 'Administered broad-spectrum dewormer. Advise repeat deworming after 3 months.', 2, 1, '2026-09-27T13:10:40.000Z', '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (3, 'Skin Infection', 'Owner reports persistent itching and hair loss.', 'Presence of itching, redness, and hair loss on affected skin area.', 'Prescribed medicated shampoo and antihistamines as needed. Follow-up check after 2 weeks.', 3, 1, '2026-09-27T13:10:40.000Z', '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (4, 'Respiratory Infection', 'Pet has been coughing and has nasal discharge.', 'Coughing and nasal discharge observed; possible upper respiratory tract infection.', 'Prescribed antibiotics for 7 days. Isolate pet from other animals until cleared.', 4, 1, '2026-09-27T13:10:40.000Z', '2026-09-27T13:10:40.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (5, 'Wound Care', 'Owner reports an open wound on the pet''s body.', 'Open wound noted on body; cleaned and assessed during consultation.', 'Cleaned and dressed wound. Prescribed antibiotics and pain relief as needed.', 5, 1, '2026-09-27T13:10:40.000Z', '2026-09-27T13:33:36.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (26, 'Flea and Tick Infestation', 'Owner reports excessive scratching and visible fleas or ticks.', 'Flea and tick infestation observed on physical examination.', 'Applied topical flea and tick treatment. Advised owner to treat the pet''s environment and recheck after 2 weeks.', 6, 1, '2026-09-27T18:43:46.000Z', '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (27, 'Vomiting and Diarrhea', 'Pet has been experiencing vomiting and diarrhea for the past day.', 'Gastrointestinal upset; possible dietary indiscretion or infection.', 'Prescribed anti-emetic and gastrointestinal medication. Advised bland diet and recheck if symptoms persist.', 7, 1, '2026-09-27T18:43:46.000Z', '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (28, 'Ear Infection', 'Owner reports head shaking and ear discharge.', 'Otitis externa; ear canal inflammation with discharge observed.', 'Prescribed ear medication and cleaning solution. Advised owner to clean ears daily for 7 days.', 8, 1, '2026-09-27T18:43:46.000Z', '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "condition_regimens" ("id", "name", "complaint", "diagnosis", "treatment", "sort_order", "active", "created_at", "updated_at") VALUES (29, 'Vaccination (Routine)', 'Owner brought the pet in for routine vaccination.', 'Healthy pet presented for routine vaccination. No signs of illness observed.', 'Administered core vaccine. Advised owner to monitor for adverse reactions and schedule next dose.', 9, 1, '2026-09-27T18:43:46.000Z', '2026-09-27T18:43:46.000Z') ON CONFLICT DO NOTHING;

-- Data for consultation_batches (3 rows)
INSERT INTO "consultation_batches" ("id", "batch_token", "created_by", "status", "created_at", "updated_at") VALUES (4, 'batch_1790354755037_802adba26181a198884ea807', 209, 'Completed', '2026-09-25T16:45:55.000Z', '2026-09-25T16:49:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_batches" ("id", "batch_token", "created_by", "status", "created_at", "updated_at") VALUES (5, 'batch_1790354805371_a8d4b40b6cea16b4c27fc1b4', 209, 'Active', '2026-09-25T16:46:45.000Z', '2026-09-25T16:46:45.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_batches" ("id", "batch_token", "created_by", "status", "created_at", "updated_at") VALUES (6, 'batch_1790354838717_3c168b24d2dcc7190f47d967', 209, 'Active', '2026-09-25T16:47:18.000Z', '2026-09-25T16:47:18.000Z') ON CONFLICT DO NOTHING;

-- Data for consultation_charges (29 rows)
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (4, 422, 47, 'Consultation Fee', 1, '250.00', '250.00', '2026-09-25T16:49:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (5, 422, 1, 'Anti-Rabies Vaccine', 1, '100.00', '100.00', '2026-09-25T16:49:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (6, 423, 47, 'Consultation Fee', 1, '250.00', '250.00', '2026-09-26T15:00:17.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (7, 423, 22, 'Antibiotic', 1, '100.00', '100.00', '2026-09-26T15:00:17.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (8, 424, 22, 'Antibiotic', 2, '100.00', '200.00', '2026-09-26T15:20:07.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (9, 424, 24, 'Antihistamine', 2, '50.00', '100.00', '2026-09-26T15:20:07.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (10, 425, 22, 'Antibiotic', 1, '100.00', '100.00', '2026-09-26T15:43:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (11, 425, 24, 'Antihistamine', 1, '50.00', '50.00', '2026-09-26T15:43:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (12, 426, 22, 'Antibiotic', 1, '100.00', '100.00', '2026-09-26T16:04:10.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (13, 426, 24, 'Antihistamine', 1, '50.00', '50.00', '2026-09-26T16:04:10.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (14, 427, 22, 'Antibiotic', 1, '100.00', '100.00', '2026-09-26T16:16:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (15, 427, 14, 'Multivitamins', 1, '50.00', '50.00', '2026-09-26T16:16:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (16, 428, 22, 'Antibiotic', 2, '100.00', '200.00', '2026-09-26T16:44:50.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (17, 428, 14, 'Multivitamins', 1, '50.00', '50.00', '2026-09-26T16:44:50.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (18, 429, 48, 'Repeat Consultation', 1, '150.00', '150.00', '2026-09-26T16:57:39.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (19, 429, 33, 'Anti-emetic Medication', 1, '100.00', '100.00', '2026-09-26T16:57:39.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (20, 429, 32, 'Anti-diarrheal Medication', 1, '50.00', '50.00', '2026-09-26T16:57:39.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (21, 430, 22, 'Antibiotic', 1, '100.00', '100.00', '2026-09-27T06:49:43.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (22, 430, 48, 'Repeat Consultation', 1, '150.00', '150.00', '2026-09-27T06:49:43.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (23, 430, 9, 'Dewormer', 1, '50.00', '50.00', '2026-09-27T06:49:43.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (24, 430, 1, 'Anti-Rabies Vaccine', 1, '100.00', '100.00', '2026-09-27T06:49:43.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (25, 431, 22, 'Antibiotic', 1, '100.00', '100.00', '2026-09-27T08:52:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (26, 431, 28, 'Ear Medication', 1, '100.00', '100.00', '2026-09-27T08:52:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (27, 431, 47, 'Consultation Fee', 1, '250.00', '250.00', '2026-09-27T08:52:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (28, 431, 10, 'Broad-Spectrum Dewormer', 1, '100.00', '100.00', '2026-09-27T08:52:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (29, 431, 1, 'Anti-Rabies Vaccine', 1, '100.00', '100.00', '2026-09-27T08:52:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (30, 431, 14, 'Multivitamins', 1, '50.00', '50.00', '2026-09-27T08:52:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (36, 432, 47, 'Consultation Fee', 1, '250.00', '250.00', '2026-09-27T16:19:49.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_charges" ("id", "consultation_id", "catalog_product_id", "description", "quantity", "unit_price", "line_total", "created_at") VALUES (37, 433, 47, 'Consultation Fee', 1, '250.00', '250.00', '2026-09-29T14:59:55.000Z') ON CONFLICT DO NOTHING;

-- Data for consultation_records (220 rows)
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (1, 413, NULL, NULL, 'Mild allergic dermatitis with facial pruritus', 'Antihistamine + topical antihistamine; monitor for rebound itching; avoid known triggers.', '2026-08-01T16:00:00.000Z', '2026-08-15T16:00:00.000Z', 210, '2026-09-11T06:58:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (2, 413, NULL, NULL, 'Routine wellness — 5-in-1 booster vaccination', 'Administered 5-in-1 vaccine; next dose due 2027-07-15.', '2026-07-14T16:00:00.000Z', '2027-07-14T16:00:00.000Z', 210, '2026-09-11T06:58:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (3, 414, NULL, NULL, 'Healthy adult — annual physical exam', 'Stool exam requested; schedule anti-rabies booster before 2026-09-20.', '2026-09-09T16:00:00.000Z', '2026-09-19T16:00:00.000Z', 210, '2026-09-11T06:58:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (4, 415, NULL, NULL, 'Feline skin infection (bacterial) with odor', 'Antibiotic + antiprotozoal; clean affected area 2x/day.', '2025-08-09T16:00:00.000Z', '2025-08-23T16:00:00.000Z', 210, '2026-09-11T06:58:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (5, 415, NULL, NULL, 'Ear mite infestation (Otodectes cynotis)', 'Topical ear treatment; recheck in 10 days.', '2026-08-27T16:00:00.000Z', '2026-09-10T16:00:00.000Z', 210, '2026-09-11T06:58:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (6, 417, NULL, NULL, 'Healthy — annual wellness exam', 'Deworming given; schedule anti-rabies booster by 2027-09-08.', '2026-07-04T16:00:00.000Z', '2026-09-29T16:00:00.000Z', 210, '2026-09-11T06:58:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (7, 418, NULL, NULL, 'Otitis externa, left ear with mild head tilt', 'Ear cleaning + anti-inflammatory; follow-up if worsening.', '2026-05-19T16:00:00.000Z', '2026-06-02T16:00:00.000Z', 210, '2026-09-11T06:58:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (8, 412, NULL, 'Routine anti-rabies vaccination visit', 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', '2026-09-11T16:00:00.000Z', '2026-10-11T16:00:00.000Z', 17, '2026-09-12T15:10:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (222, 1071, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-09-10T16:00:00.000Z', '2026-09-24T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (223, 1072, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-02-20T16:00:00.000Z', '2026-03-09T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (224, 1077, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-08-17T16:00:00.000Z', '2026-08-30T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (225, 1078, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-09-02T16:00:00.000Z', '2026-09-11T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (226, 1082, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-08-16T16:00:00.000Z', '2026-08-28T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (227, 1083, NULL, NULL, 'Feline dermatitis with pruritus', 'Anti-itch + topical therapy; hypoallergenic diet.', '2026-04-25T16:00:00.000Z', '2026-05-05T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (228, 1084, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-02-10T16:00:00.000Z', '2026-03-02T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (229, 1087, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-06-18T16:00:00.000Z', '2026-06-28T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (230, 1089, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-06-29T16:00:00.000Z', '2026-07-15T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (231, 1096, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-04-17T16:00:00.000Z', '2026-05-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (232, 1098, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-02-01T16:00:00.000Z', '2026-02-20T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (233, 1104, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-03-11T16:00:00.000Z', '2026-03-25T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (234, 1105, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-06-15T16:00:00.000Z', '2026-06-29T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (235, 1106, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-09-04T16:00:00.000Z', '2026-09-18T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (236, 1111, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-04-01T16:00:00.000Z', '2026-04-11T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (237, 1112, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-05-04T16:00:00.000Z', '2026-05-13T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (238, 1113, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-08-13T16:00:00.000Z', '2026-08-22T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (239, 1118, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-01-17T16:00:00.000Z', '2026-01-28T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (240, 1119, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-06-21T16:00:00.000Z', '2026-07-05T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (241, 1120, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-09-09T16:00:00.000Z', '2026-09-17T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (242, 1125, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-02-09T16:00:00.000Z', '2026-02-27T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (243, 1133, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-04-15T16:00:00.000Z', '2026-05-02T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (244, 1141, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-02-16T16:00:00.000Z', '2026-02-24T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (245, 1144, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-04-02T16:00:00.000Z', '2026-04-13T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (246, 1147, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-09-02T16:00:00.000Z', '2026-09-21T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (247, 1157, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-07-31T16:00:00.000Z', '2026-08-11T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (248, 1158, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-03-03T16:00:00.000Z', '2026-03-23T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (249, 1161, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-07-21T16:00:00.000Z', '2026-08-10T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (250, 1165, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-05-25T16:00:00.000Z', '2026-06-09T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (251, 1168, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-06-27T16:00:00.000Z', '2026-07-10T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (252, 1169, NULL, NULL, 'Feline dermatitis with pruritus', 'Anti-itch + topical therapy; hypoallergenic diet.', '2026-08-30T16:00:00.000Z', '2026-09-18T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (253, 1173, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-03-23T16:00:00.000Z', '2026-04-03T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (254, 1175, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-08-24T16:00:00.000Z', '2026-09-04T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (255, 1179, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-01-26T16:00:00.000Z', '2026-02-15T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (256, 1180, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-08-31T16:00:00.000Z', '2026-09-08T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (257, 1181, NULL, NULL, 'Diarrhea of acute onset', 'Gastroprotectant + hydration; stool check.', '2026-01-26T16:00:00.000Z', '2026-02-05T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (258, 1186, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-08-05T16:00:00.000Z', '2026-08-12T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (259, 1192, NULL, NULL, 'Otitis externa with erythema', 'Ear cleaning + anti-inflammatory; recheck in 10 days.', '2026-07-01T16:00:00.000Z', '2026-07-11T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (260, 1194, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-08-20T16:00:00.000Z', '2026-09-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (261, 1195, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-02-09T16:00:00.000Z', '2026-02-27T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (262, 1198, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-01-06T16:00:00.000Z', '2026-01-16T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (263, 1199, NULL, NULL, 'Diarrhea of acute onset', 'Gastroprotectant + hydration; stool check.', '2026-02-27T16:00:00.000Z', '2026-03-15T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (264, 1200, NULL, NULL, 'Diarrhea of acute onset', 'Gastroprotectant + hydration; stool check.', '2026-05-30T16:00:00.000Z', '2026-06-19T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (265, 1201, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-06-28T16:00:00.000Z', '2026-07-11T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (266, 1202, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-03-03T16:00:00.000Z', '2026-03-16T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (267, 1203, NULL, NULL, 'Diarrhea of acute onset', 'Gastroprotectant + hydration; stool check.', '2026-01-25T16:00:00.000Z', '2026-02-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (268, 1205, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-08-23T16:00:00.000Z', '2026-09-12T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (269, 1210, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-01-21T16:00:00.000Z', '2026-02-02T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (270, 1216, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-06-14T16:00:00.000Z', '2026-06-29T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (271, 1217, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-05-01T16:00:00.000Z', '2026-05-08T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (272, 1218, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-05-01T16:00:00.000Z', '2026-05-15T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (273, 1219, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-02-25T16:00:00.000Z', '2026-03-11T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (274, 1220, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-01-04T16:00:00.000Z', '2026-01-13T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (275, 1224, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-03-09T16:00:00.000Z', '2026-03-28T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (276, 1230, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-09-05T16:00:00.000Z', '2026-09-18T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (277, 1235, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-03-23T16:00:00.000Z', '2026-04-04T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (278, 1244, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-06-01T16:00:00.000Z', '2026-06-18T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (279, 1248, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-06-24T16:00:00.000Z', '2026-07-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (280, 1249, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-05-26T16:00:00.000Z', '2026-06-09T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (281, 1250, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-01-29T16:00:00.000Z', '2026-02-17T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (282, 1253, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-03-30T16:00:00.000Z', '2026-04-11T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (283, 1255, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-09-02T16:00:00.000Z', '2026-09-20T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (284, 1261, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-01-01T16:00:00.000Z', '2026-01-14T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (285, 1262, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-08-25T16:00:00.000Z', '2026-09-08T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (286, 1263, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-05-22T16:00:00.000Z', '2026-05-30T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (287, 1265, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-05-26T16:00:00.000Z', '2026-06-12T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (288, 1267, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-02-05T16:00:00.000Z', '2026-02-16T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (289, 1269, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-01-22T16:00:00.000Z', '2026-01-29T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (290, 1272, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-02-17T16:00:00.000Z', '2026-03-04T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (291, 1280, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-02-19T16:00:00.000Z', '2026-03-08T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (292, 1282, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2025-12-31T16:00:00.000Z', '2026-01-15T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (293, 1285, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-01-07T16:00:00.000Z', '2026-01-19T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (294, 1289, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-05-26T16:00:00.000Z', '2026-06-12T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (295, 1296, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-08-05T16:00:00.000Z', '2026-08-12T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (296, 1299, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-05-09T16:00:00.000Z', '2026-05-24T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (297, 1300, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-04-01T16:00:00.000Z', '2026-04-18T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (298, 1302, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-03-06T16:00:00.000Z', '2026-03-16T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (299, 1303, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-04-08T16:00:00.000Z', '2026-04-27T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (300, 1305, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-08-08T16:00:00.000Z', '2026-08-25T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (301, 1308, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-06-08T16:00:00.000Z', '2026-06-23T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (302, 1309, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-03-22T16:00:00.000Z', '2026-03-30T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (303, 1311, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-06-08T16:00:00.000Z', '2026-06-22T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (304, 1313, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-02-19T16:00:00.000Z', '2026-03-01T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (305, 1316, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-04-27T16:00:00.000Z', '2026-05-09T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (306, 1321, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-03-19T16:00:00.000Z', '2026-04-08T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (307, 1322, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-08-08T16:00:00.000Z', '2026-08-17T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (308, 1326, NULL, NULL, 'Otitis externa with erythema', 'Ear cleaning + anti-inflammatory; recheck in 10 days.', '2026-01-17T16:00:00.000Z', '2026-02-02T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (309, 1327, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-03-02T16:00:00.000Z', '2026-03-21T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (310, 1331, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-08-26T16:00:00.000Z', '2026-09-12T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (311, 1332, NULL, NULL, 'Diarrhea of acute onset', 'Gastroprotectant + hydration; stool check.', '2026-08-08T16:00:00.000Z', '2026-08-15T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (312, 1335, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-08-05T16:00:00.000Z', '2026-08-17T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (313, 1342, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-06-13T16:00:00.000Z', '2026-07-01T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (314, 1347, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-06-01T16:00:00.000Z', '2026-06-17T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (315, 1348, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-02-09T16:00:00.000Z', '2026-02-22T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (316, 1349, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-07-05T16:00:00.000Z', '2026-07-23T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (317, 1352, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-05-30T16:00:00.000Z', '2026-06-16T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (318, 1356, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-06-10T16:00:00.000Z', '2026-06-17T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (319, 1359, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-03-22T16:00:00.000Z', '2026-04-08T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (320, 1361, NULL, NULL, 'Otitis externa with erythema', 'Ear cleaning + anti-inflammatory; recheck in 10 days.', '2026-05-30T16:00:00.000Z', '2026-06-15T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (321, 1362, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-01-30T16:00:00.000Z', '2026-02-17T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (322, 1365, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-02-14T16:00:00.000Z', '2026-03-04T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (323, 1381, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-04-15T16:00:00.000Z', '2026-04-24T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (324, 1382, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-07-21T16:00:00.000Z', '2026-08-02T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (325, 1390, NULL, NULL, 'Feline dermatitis with pruritus', 'Anti-itch + topical therapy; hypoallergenic diet.', '2026-04-10T16:00:00.000Z', '2026-04-28T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (326, 1393, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-03-05T16:00:00.000Z', '2026-03-19T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (327, 1398, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-02-27T16:00:00.000Z', '2026-03-07T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (328, 1401, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-02-08T16:00:00.000Z', '2026-02-26T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (329, 1404, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-03-27T16:00:00.000Z', '2026-04-08T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (330, 1405, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-01-26T16:00:00.000Z', '2026-02-14T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (331, 1407, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-04-15T16:00:00.000Z', '2026-04-26T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (332, 1410, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-01-02T16:00:00.000Z', '2026-01-12T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (333, 1415, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-09-12T16:00:00.000Z', '2026-09-30T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (334, 1418, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-01-08T16:00:00.000Z', '2026-01-18T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (335, 1419, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-06-21T16:00:00.000Z', '2026-07-04T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (336, 1424, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-02-03T16:00:00.000Z', '2026-02-13T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (337, 1426, NULL, NULL, 'Feline dermatitis with pruritus', 'Anti-itch + topical therapy; hypoallergenic diet.', '2026-08-02T16:00:00.000Z', '2026-08-14T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (338, 1427, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-03-27T16:00:00.000Z', '2026-04-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (339, 1428, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-05-22T16:00:00.000Z', '2026-05-31T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (340, 1431, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-02-16T16:00:00.000Z', '2026-03-08T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (341, 1434, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-07-31T16:00:00.000Z', '2026-08-09T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (342, 1440, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-08-28T16:00:00.000Z', '2026-09-06T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (343, 1444, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-09-03T16:00:00.000Z', '2026-09-16T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (344, 1445, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-04-03T16:00:00.000Z', '2026-04-13T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (345, 1451, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-05-12T16:00:00.000Z', '2026-05-25T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (346, 1452, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-07-09T16:00:00.000Z', '2026-07-16T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (347, 1458, NULL, NULL, 'Otitis externa with erythema', 'Ear cleaning + anti-inflammatory; recheck in 10 days.', '2026-01-02T16:00:00.000Z', '2026-01-09T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (348, 1462, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-01-26T16:00:00.000Z', '2026-02-09T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (349, 1463, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-07-27T16:00:00.000Z', '2026-08-11T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (350, 1480, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-03-05T16:00:00.000Z', '2026-03-20T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (351, 1481, NULL, NULL, 'Otitis externa with erythema', 'Ear cleaning + anti-inflammatory; recheck in 10 days.', '2026-02-13T16:00:00.000Z', '2026-02-24T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (352, 1482, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-03-13T16:00:00.000Z', '2026-03-25T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (353, 1483, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-03-06T16:00:00.000Z', '2026-03-24T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (354, 1484, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-07-22T16:00:00.000Z', '2026-08-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (355, 1485, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-09-02T16:00:00.000Z', '2026-09-17T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (356, 1490, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-06-07T16:00:00.000Z', '2026-06-22T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (357, 1493, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-05-26T16:00:00.000Z', '2026-06-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (358, 1496, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-06-23T16:00:00.000Z', '2026-07-08T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (359, 1515, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-09-10T16:00:00.000Z', '2026-09-17T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (360, 1516, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-08-24T16:00:00.000Z', '2026-09-04T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (361, 1522, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-04-20T16:00:00.000Z', '2026-05-09T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (362, 1523, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-06-24T16:00:00.000Z', '2026-07-01T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (363, 1528, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-09-07T16:00:00.000Z', '2026-09-20T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (364, 1530, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-04-25T16:00:00.000Z', '2026-05-02T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (365, 1531, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-04-17T16:00:00.000Z', '2026-04-30T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (366, 1534, NULL, NULL, 'Skin infection / pyoderma', 'Topical + systemic antibiotic course.', '2026-08-12T16:00:00.000Z', '2026-08-19T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (367, 1535, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-07-31T16:00:00.000Z', '2026-08-14T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (368, 1539, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-01-25T16:00:00.000Z', '2026-02-12T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (369, 1543, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-02-07T16:00:00.000Z', '2026-02-19T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (370, 1544, NULL, NULL, 'Diarrhea of acute onset', 'Gastroprotectant + hydration; stool check.', '2026-07-04T16:00:00.000Z', '2026-07-15T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (371, 1546, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-06-23T16:00:00.000Z', '2026-07-11T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (372, 1548, NULL, NULL, 'Diarrhea of acute onset', 'Gastroprotectant + hydration; stool check.', '2026-01-08T16:00:00.000Z', '2026-01-17T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (373, 1551, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-08-04T16:00:00.000Z', '2026-08-23T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (374, 1553, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-03-14T16:00:00.000Z', '2026-04-03T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (375, 1555, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-06-22T16:00:00.000Z', '2026-06-30T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (376, 1558, NULL, NULL, 'Flea infestation', 'Flea control; treat household environment.', '2026-06-13T16:00:00.000Z', '2026-06-25T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (377, 1562, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-05-12T16:00:00.000Z', '2026-05-28T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (378, 1565, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-05-08T16:00:00.000Z', '2026-05-23T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (379, 1573, NULL, NULL, 'Deworming follow-up', 'Fecalysis + broad-spectrum dewormer.', '2026-09-06T16:00:00.000Z', '2026-09-16T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (380, 1576, NULL, NULL, 'Allergic rhinitis', 'Antihistamine; avoid dust and smoke.', '2026-05-22T16:00:00.000Z', '2026-06-09T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (381, 1579, NULL, NULL, 'Otitis externa with erythema', 'Ear cleaning + anti-inflammatory; recheck in 10 days.', '2026-02-25T16:00:00.000Z', '2026-03-07T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (382, 1582, NULL, NULL, 'Routine wellness exam', 'Annual checkup; no abnormalities noted.', '2026-01-23T16:00:00.000Z', '2026-02-05T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (383, 1585, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-09-01T16:00:00.000Z', '2026-09-15T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (384, 1591, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-09-12T16:00:00.000Z', '2026-09-23T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (385, 1594, NULL, NULL, 'Feline dermatitis with pruritus', 'Anti-itch + topical therapy; hypoallergenic diet.', '2025-12-31T16:00:00.000Z', '2026-01-08T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (386, 1596, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-05-15T16:00:00.000Z', '2026-05-25T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (387, 1600, NULL, NULL, 'Feline dermatitis with pruritus', 'Anti-itch + topical therapy; hypoallergenic diet.', '2026-06-11T16:00:00.000Z', '2026-06-25T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (388, 1611, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-07-12T16:00:00.000Z', '2026-07-21T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (389, 1612, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-09-11T16:00:00.000Z', '2026-09-24T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (390, 1614, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-02-12T16:00:00.000Z', '2026-03-03T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (391, 1618, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-07-21T16:00:00.000Z', '2026-07-29T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (392, 1620, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2025-12-31T16:00:00.000Z', '2026-01-17T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (393, 1621, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-09-02T16:00:00.000Z', '2026-09-19T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (394, 1624, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-03-05T16:00:00.000Z', '2026-03-15T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (395, 1625, NULL, NULL, 'Mild gastroenteritis / diarrhea', 'Gastroprotectants + bland diet for 3 days.', '2026-01-19T16:00:00.000Z', '2026-02-05T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (396, 1636, NULL, NULL, 'Upper respiratory infection (URI)', 'Supportive care + eye/nasal cleaning.', '2026-09-11T16:00:00.000Z', '2026-09-24T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (397, 1642, NULL, NULL, 'Dental disease (gingivitis)', 'Dental cleaning; oral care plan.', '2026-08-23T16:00:00.000Z', '2026-09-05T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (398, 1644, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-02-09T16:00:00.000Z', '2026-02-17T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (399, 1645, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-08-30T16:00:00.000Z', '2026-09-06T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (400, 1646, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-07-06T16:00:00.000Z', '2026-07-21T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (401, 1650, NULL, NULL, 'Otitis externa with erythema', 'Ear cleaning + anti-inflammatory; recheck in 10 days.', '2026-08-27T16:00:00.000Z', '2026-09-06T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (402, 1656, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-01-29T16:00:00.000Z', '2026-02-10T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (403, 1657, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-04-04T16:00:00.000Z', '2026-04-11T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (404, 1658, NULL, NULL, 'Feline dermatitis with pruritus', 'Anti-itch + topical therapy; hypoallergenic diet.', '2026-04-16T16:00:00.000Z', '2026-04-25T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (405, 1659, NULL, NULL, 'Tick fever suspected', 'CBC + blood smear; doxycycline course if positive.', '2026-03-13T16:00:00.000Z', '2026-03-26T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (406, 1663, NULL, NULL, 'Flea allergic dermatitis', 'Flea control + antihistamine; environmental sanitization.', '2026-02-14T16:00:00.000Z', '2026-02-26T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (407, 1666, NULL, NULL, 'Minor wound / abrasion', 'Wound cleaning + antibiotics; prevent licking.', '2026-09-10T16:00:00.000Z', '2026-09-22T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (408, 1670, NULL, NULL, 'Ear mite infestation', 'Topical miticide; treat all in-contact pets.', '2026-06-22T16:00:00.000Z', '2026-07-04T16:00:00.000Z', 210, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (409, 1672, NULL, NULL, 'Routine wellness exam', 'Annual checkup; weight and dental check.', '2026-04-11T16:00:00.000Z', '2026-04-18T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (410, 1674, NULL, NULL, 'Dental disease (tartar)', 'Dental prophylaxis; home dental care advised.', '2026-08-29T16:00:00.000Z', '2026-09-05T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (411, 1678, NULL, NULL, 'Hairball obstruction (mild)', 'Laxative gel + increased hydration.', '2026-02-05T16:00:00.000Z', '2026-02-22T16:00:00.000Z', 1266, '2026-09-16T07:58:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (412, 24, NULL, 'Fever, lethargy and reduced appetite', 'Tick fever suspected', 'CBC and blood smear requested; oral doxycycline course; recheck after treatment.', '2026-09-04T16:00:00.000Z', '2026-09-10T16:00:00.000Z', 210, '2026-09-19T06:29:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (413, 28, NULL, 'Sneezing, nasal discharge and runny eyes', 'Upper respiratory infection (URI)', 'Supportive care, eye and nasal cleaning, and a short antibiotic course.', '2026-09-11T16:00:00.000Z', '2026-09-25T16:00:00.000Z', 1266, '2026-09-19T06:29:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (414, 411, NULL, 'Loose stools and occasional vomiting', 'Mild gastroenteritis / diarrhea', 'Gastroprotectants, bland diet for 3 days, hydration support, and stool check.', '2026-09-15T16:00:00.000Z', '2026-09-18T16:00:00.000Z', 1794, '2026-09-19T06:29:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (415, 412, NULL, 'Frequent scratching and patchy hair loss', 'Flea allergy dermatitis with pruritus', 'Flea control, antihistamine, and household environmental sanitization.', '2026-09-09T16:00:00.000Z', '2026-09-19T16:00:00.000Z', 210, '2026-09-19T06:29:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (416, 437, NULL, 'Routine newborn wellness check', 'Neonatal wellness exam', 'Newborn checkup; weigh weekly, monitor nursing, and schedule first deworming at 6 weeks.', '2026-09-15T16:00:00.000Z', '2026-10-02T16:00:00.000Z', 1266, '2026-09-19T06:29:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (417, 24, NULL, 'Itchy red skin with flaking and mild odor', 'Skin infection / pyoderma', 'Topical and systemic antibiotic course completed; follow-up at the clinic for skin check.', '2026-04-06T16:00:00.000Z', NULL, 1794, '2026-09-19T06:42:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (418, 24, NULL, 'Bad breath and yellowish tartar on teeth', 'Dental disease (tartar)', 'Dental prophylaxis performed; home dental care advised with prescribed pain relief.', '2025-12-12T16:00:00.000Z', NULL, 210, '2026-09-19T06:42:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (419, 28, NULL, 'Excessive scratching and visible fleas', 'Flea infestation', 'Flea control applied and household environment treated; monitor for recurrence.', '2026-05-31T16:00:00.000Z', NULL, 1266, '2026-09-19T06:42:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (420, 411, NULL, 'Post-deworming follow-up check', 'Deworming follow-up', 'Fecalysis done and broad-spectrum dewormer given; repeat in 6 months.', '2026-03-02T16:00:00.000Z', NULL, 1794, '2026-09-19T06:42:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (421, 412, NULL, 'Head shaking, scratching ears and dark ear debris', 'Ear mite infestation', 'Topical miticide applied; treat all in-contact pets and recheck in two weeks.', '2026-06-15T16:00:00.000Z', NULL, 210, '2026-09-19T06:42:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (422, 415, 4, 'Routine check-up', 'Healthy pet presented for routine anti-rabies vaccination.', 'None needed.', '2026-09-19T16:00:00.000Z', NULL, 210, '2026-09-25T16:49:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (423, 1686, NULL, NULL, 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', '2026-09-25T16:00:00.000Z', '2026-10-08T16:00:00.000Z', 1794, '2026-09-26T15:00:17.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (424, 1686, NULL, NULL, NULL, NULL, '2026-09-25T16:00:00.000Z', NULL, 210, '2026-09-26T15:20:07.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (425, 1686, NULL, NULL, NULL, NULL, '2026-09-25T16:00:00.000Z', NULL, 210, '2026-09-26T15:43:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (426, 1686, NULL, NULL, NULL, NULL, '2026-09-26T16:00:00.000Z', NULL, 210, '2026-09-26T16:04:10.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (427, 1686, NULL, NULL, NULL, NULL, '2026-09-26T16:00:00.000Z', NULL, 210, '2026-09-26T16:16:44.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (428, 1686, NULL, NULL, NULL, NULL, '2026-09-26T16:00:00.000Z', NULL, 210, '2026-09-26T16:44:50.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (429, 1686, NULL, NULL, 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', '2026-09-26T16:00:00.000Z', '2026-10-09T16:00:00.000Z', 1794, '2026-09-26T16:57:39.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (430, 1686, NULL, NULL, 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', '2026-09-26T16:00:00.000Z', '2026-10-09T16:00:00.000Z', 1794, '2026-09-27T06:49:43.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (431, 1686, NULL, NULL, 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', '2026-09-26T16:00:00.000Z', NULL, 1794, '2026-09-27T08:52:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (432, 1686, NULL, 'Owner brought the pet in for anti-rabies vaccination.', 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', '2026-09-27T16:00:00.000Z', '2026-10-10T16:00:00.000Z', 1794, '2026-09-27T16:19:49.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "consultation_records" ("id", "pet_id", "queue_id", "complaint", "diagnosis", "treatment_plan", "consultation_date", "follow_up_date", "vet_id", "created_at") VALUES (433, 1690, NULL, 'Owner brought the pet in for anti-rabies vaccination.', 'Healthy pet presented for routine anti-rabies vaccination. No signs of illness observed.', 'Administered anti-rabies vaccine. Advised owner to monitor injection site and keep pet indoors for the rest of the day.', '2026-09-28T16:00:00.000Z', '2026-10-11T16:00:00.000Z', 1794, '2026-09-29T14:59:55.000Z') ON CONFLICT DO NOTHING;

-- Data for draft_registrations (24 rows)
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (2, 204, '{"name":"","species_id":"","breed_id":"","breed_other":"","sex":"Male","color":"","birthdate":""}', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Sa', '{"name":"","species_id":"","breed_id":"","breed_other":"","sex":"Male","color":"","birthdate":""}', 'Draft', NULL, '2026-09-10T18:10:03.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (3, 206, '{"name":"Ginger","species_id":1,"breed_id":1,"sex":"Female","color":"Golden","birthdate":"2024-06-15","additional_notes":"Waiting for photo upload"}', 'demo-laptop-1', '{"name":"Ginger","species_id":1,"breed_id":1,"sex":"Female","color":"Golden","birthdate":"2024-06-15","additional_notes":"Waiting for photo upload"}', 'Pending Sync', '2026-09-10T23:06:27.000Z', '2026-09-11T07:06:27.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (4, 206, '{"name":"Mochi","species_id":2,"breed_id":4,"sex":"Male","color":"Gray","birthdate":"2025-01-20"}', 'demo-laptop-2', '{"name":"Mochi","species_id":2,"breed_id":4,"sex":"Male","color":"Gray","birthdate":"2025-01-20"}', 'Draft', NULL, '2026-09-11T07:06:27.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (5, 205, '{"name":"Choco","species_id":1,"breed_id":2,"sex":"Male","color":"Brown","birthdate":"2023-11-02","additional_notes":"Imported from mobile"}', 'demo-mobile-1', '{"name":"Choco","species_id":1,"breed_id":2,"sex":"Male","color":"Brown","birthdate":"2023-11-02","additional_notes":"Imported from mobile"}', 'Pending Sync', '2026-09-10T23:06:27.000Z', '2026-09-11T07:06:27.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (6, 1625, '{"name":"Bruno","species_id":1,"sex":"Male","color":"Black and White","birthdate":"2022-07-10","additional_notes":""}', 'device-9872', '{"name":"Bruno","species_id":1,"sex":"Male","color":"Black and White","birthdate":"2022-07-10","additional_notes":""}', 'Draft', '2026-09-15T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (7, 1354, '{"name":"Bogart","species_id":1,"sex":"Male","color":"Gray","birthdate":"2023-11-14","additional_notes":"Imported from phone"}', 'device-1003', '{"name":"Bogart","species_id":1,"sex":"Male","color":"Gray","birthdate":"2023-11-14","additional_notes":"Imported from phone"}', 'Synced', '2026-09-10T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (8, 1719, '{"name":"Tom","species_id":2,"sex":"Female","color":"Black","birthdate":"2022-09-19","additional_notes":""}', 'device-4384', '{"name":"Tom","species_id":2,"sex":"Female","color":"Black","birthdate":"2022-09-19","additional_notes":""}', 'Pending Sync', '2026-09-15T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (9, 1286, '{"name":"Rusty","species_id":1,"sex":"Male","color":"Gray","birthdate":"2024-03-07","additional_notes":"Imported from phone"}', 'device-9884', '{"name":"Rusty","species_id":1,"sex":"Male","color":"Gray","birthdate":"2024-03-07","additional_notes":"Imported from phone"}', 'Pending Sync', '2026-09-15T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (10, 1258, '{"name":"Toby","species_id":1,"sex":"Female","color":"Cream","birthdate":"2025-04-24","additional_notes":"Waiting for photo upload"}', 'device-1162', '{"name":"Toby","species_id":1,"sex":"Female","color":"Cream","birthdate":"2025-04-24","additional_notes":"Waiting for photo upload"}', 'Synced', '2026-09-14T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (11, 1371, '{"name":"Simba","species_id":2,"sex":"Male","color":"Black and White","birthdate":"2021-11-25","additional_notes":""}', 'device-7329', '{"name":"Simba","species_id":2,"sex":"Male","color":"Black and White","birthdate":"2021-11-25","additional_notes":""}', 'Draft', '2026-09-15T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (12, 1273, '{"name":"Thor","species_id":1,"sex":"Female","color":"Cream","birthdate":"2023-06-27","additional_notes":"Waiting for photo upload"}', 'device-2778', '{"name":"Thor","species_id":1,"sex":"Female","color":"Cream","birthdate":"2023-06-27","additional_notes":"Waiting for photo upload"}', 'Synced', '2026-09-15T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (13, 1533, '{"name":"Snowy","species_id":1,"sex":"Female","color":"Tan","birthdate":"2022-12-05","additional_notes":""}', 'device-4408', '{"name":"Snowy","species_id":1,"sex":"Female","color":"Tan","birthdate":"2022-12-05","additional_notes":""}', 'Synced', '2026-09-13T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (14, 1705, '{"name":"Thor","species_id":1,"sex":"Female","color":"Tan","birthdate":"2025-10-10","additional_notes":""}', 'device-9857', '{"name":"Thor","species_id":1,"sex":"Female","color":"Tan","birthdate":"2025-10-10","additional_notes":""}', 'Pending Sync', '2026-09-11T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (15, 1660, '{"name":"Bogart","species_id":1,"sex":"Male","color":"Brown","birthdate":"2025-11-03","additional_notes":"Waiting for photo upload"}', 'device-9000', '{"name":"Bogart","species_id":1,"sex":"Male","color":"Brown","birthdate":"2025-11-03","additional_notes":"Waiting for photo upload"}', 'Synced', '2026-09-11T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (16, 1291, '{"name":"Cooper","species_id":1,"sex":"Male","color":"Tricolor","birthdate":"2025-12-26","additional_notes":"Imported from phone"}', 'device-9952', '{"name":"Cooper","species_id":1,"sex":"Male","color":"Tricolor","birthdate":"2025-12-26","additional_notes":"Imported from phone"}', 'Synced', '2026-09-15T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (17, 1464, '{"name":"Onyok","species_id":1,"sex":"Male","color":"Tricolor","birthdate":"2023-10-23","additional_notes":"Imported from phone"}', 'device-3301', '{"name":"Onyok","species_id":1,"sex":"Male","color":"Tricolor","birthdate":"2023-10-23","additional_notes":"Imported from phone"}', 'Synced', '2026-09-11T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (18, 1596, '{"name":"Bobby","species_id":1,"sex":"Male","color":"Cream","birthdate":"2024-07-13","additional_notes":"Waiting for photo upload"}', 'device-6460', '{"name":"Bobby","species_id":1,"sex":"Male","color":"Cream","birthdate":"2024-07-13","additional_notes":"Waiting for photo upload"}', 'Draft', '2026-09-12T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (19, 1714, '{"name":"Duke","species_id":1,"sex":"Male","color":"Tricolor","birthdate":"2023-03-14","additional_notes":"Imported from phone"}', 'device-8625', '{"name":"Duke","species_id":1,"sex":"Male","color":"Tricolor","birthdate":"2023-03-14","additional_notes":"Imported from phone"}', 'Pending Sync', '2026-09-14T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (20, 1523, '{"name":"Kiko","species_id":1,"sex":"Male","color":"Brown","birthdate":"2022-02-16","additional_notes":""}', 'device-8610', '{"name":"Kiko","species_id":1,"sex":"Male","color":"Brown","birthdate":"2022-02-16","additional_notes":""}', 'Pending Sync', '2026-09-11T20:00:00.000Z', '2026-09-16T07:58:18.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (22, 16, '{"name":"Luna","species_id":"2","breed_id":"5","breed_other":"","sex":"Female","color":"Black","birthdate":"2025-12-17"}', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Sa', '{"name":"Luna","species_id":"2","breed_id":"5","breed_other":"","sex":"Female","color":"Black","birthdate":"2025-12-17"}', 'Draft', NULL, '2026-09-17T14:33:51.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (23, 16, '{"name":"Chewy","species_id":"2","breed_id":"4","breed_other":"","sex":"Male","color":"Brown","birthdate":"2025-02-12"}', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Sa', '{"name":"Chewy","species_id":"2","breed_id":"4","breed_other":"","sex":"Male","color":"Brown","birthdate":"2025-02-12"}', 'Draft', NULL, '2026-09-17T15:33:24.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (24, 16, '{"name":"Leo","species_id":"2","breed_id":"4","breed_other":"","sex":"Male","color":"Orange","birthdate":"2024-02-05"}', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Sa', '{"name":"Leo","species_id":"2","breed_id":"4","breed_other":"","sex":"Male","color":"Orange","birthdate":"2024-02-05"}', 'Draft', NULL, '2026-09-17T15:33:57.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (25, 16, '{"name":"Willow","species_id":"2","breed_id":"4","breed_other":"","sex":"Female","color":"Gray","birthdate":"2025-08-05"}', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Sa', '{"name":"Willow","species_id":"2","breed_id":"4","breed_other":"","sex":"Female","color":"Gray","birthdate":"2025-08-05"}', 'Draft', NULL, '2026-09-17T15:38:14.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "draft_registrations" ("id", "pet_owner_id", "temp_reg_info", "device_id", "payload", "sync_state", "sync_date", "created_at") VALUES (26, 16, '{"name":"Daisy","species_id":"2","breed_id":"4","breed_other":"","sex":"Female","color":"White","birthdate":"2025-03-03"}', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Sa', '{"name":"Daisy","species_id":"2","breed_id":"4","breed_other":"","sex":"Female","color":"White","birthdate":"2025-03-03"}', 'Draft', NULL, '2026-09-17T15:38:48.000Z') ON CONFLICT DO NOTHING;

-- Data for medicines (12 rows)
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (1, 'Amoxicillin', 'Antibiotic for bacterial infections', 'Antibiotic', '1 tablet', 'Twice daily', '7 days', 'Give after meals.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (2, 'Doxycycline', 'Antibiotic for tick-borne and respiratory infections', 'Antibiotic', '1 tablet', 'Once daily', '7 days', 'Give with plenty of water.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (3, 'Metronidazole', 'Treatment for diarrhea and protozoal infections', 'Antibiotic', '1 tablet', 'Twice daily', '5 days', 'Give after meals.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (4, 'Ivermectin', 'Dewormer and mange treatment', 'Dewormer', '0.2 mL', 'Once', 'Single dose', 'May be repeated after 14 days if needed.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (5, 'Pyrantel Pamoate', 'Dewormer for roundworms and hookworms', 'Dewormer', '1 mL', 'Once', 'Single dose', 'Repeat after 2 weeks for deworming completion.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (6, 'Carprofen', 'Pain and inflammation relief', 'Pain Relief', '1 tablet', 'Once daily', '5 days', 'Give with food to avoid stomach upset.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (7, 'Chlorpheniramine', 'Antihistamine for allergies', 'Antihistamine', '1 tablet', 'Twice daily', '5 days', 'May cause drowsiness.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (8, 'Vitamin B Complex', 'Nutritional supplement', 'Supplement', '1 mL', 'Once daily', '7 days', '') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (9, 'Enrofloxacin (Baytril)', 'Broad-spectrum antibiotic', 'Antibiotic', '1 tablet', 'Once daily', '7 days', 'Give with water.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (10, 'Frontline Spray', 'Flea and tick control', 'Flea & Tick', '2 sprays', 'Once', 'Monthly', 'Apply against the direction of fur growth.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (11, 'Prednisolone', 'Anti-inflammatory for skin and allergy conditions', 'Anti-inflammatory', '1 tablet', 'Once daily', '5 days', 'Taper dose as advised by the veterinarian.') ON CONFLICT DO NOTHING;
INSERT INTO "medicines" ("id", "medicine_name", "description", "category", "default_dosage", "default_frequency", "default_duration", "default_instructions") VALUES (12, 'Oral Rehydration Salts', 'Fluid replacement for dehydration', 'Supportive', '1 sachet', 'Every 8 hours', '3 days', 'Mix with clean water before giving.') ON CONFLICT DO NOTHING;

-- Data for notifications (2322 rows)
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (82, 18, 'Pet Registration', 'choco has been successfully registered.', 'Registration', 'my-pets', 0, '2026-09-03T10:53:23.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (84, 17, 'New Pet Registration', 'KB Trinidad''s pet choco is awaiting verification.', 'Registration', NULL, 0, '2026-09-03T10:53:23.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (85, 18, 'QR Generated', 'QR Code has been generated for choco.', 'QR', 'qr-records', 0, '2026-09-03T10:53:57.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (86, 18, 'Registration Verified', 'choco''s registration has been verified.', 'Registration', 'my-pets', 0, '2026-09-03T10:53:57.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (87, 18, 'Vaccination Updated', 'choco has been vaccinated.', 'Vaccination', 'vaccinations', 0, '2026-09-03T10:56:23.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (90, 17, 'New Pet Registration', 'Photo Test Owner''s pet PhotoPup is awaiting verification.', 'Registration', NULL, 0, '2026-09-04T04:24:57.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (93, 18, 'Pet Registration', 'Max has been successfully registered.', 'Registration', 'my-pets', 0, '2026-09-04T05:46:13.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (94, 18, 'QR Generated', 'QR Code has been generated for Max.', 'QR', 'qr-records', 0, '2026-09-04T05:47:23.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (95, 18, 'Registration Verified', 'Max''s registration has been verified.', 'Registration', 'my-pets', 0, '2026-09-04T05:47:23.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (102, 18, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (103, 27, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (104, 28, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (105, 29, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (106, 30, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (107, 31, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (108, 32, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (109, 33, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (110, 34, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (111, 35, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (112, 36, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (113, 37, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (114, 38, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (115, 39, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (116, 40, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (117, 41, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (118, 42, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (119, 43, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (120, 44, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (121, 45, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (122, 46, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (123, 47, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (124, 48, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (125, 49, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (126, 50, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (127, 51, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (128, 52, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (129, 53, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (130, 54, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (131, 55, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (132, 56, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (133, 57, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (134, 58, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (135, 59, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (136, 60, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (137, 61, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (138, 62, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (139, 63, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (140, 64, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (141, 65, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (142, 66, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (143, 67, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (144, 68, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (145, 69, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (146, 70, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (147, 71, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (148, 72, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (149, 73, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (150, 74, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (151, 75, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (152, 76, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (153, 77, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (154, 78, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (155, 79, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (156, 80, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (157, 81, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (158, 82, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (159, 83, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (160, 84, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (161, 85, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (162, 86, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (163, 87, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (164, 88, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (165, 89, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (166, 90, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (167, 91, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (168, 92, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (169, 93, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (170, 94, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (171, 95, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (172, 96, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (173, 97, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (174, 98, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (175, 99, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (176, 100, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (177, 101, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (178, 102, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (179, 103, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (180, 104, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (181, 105, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (182, 106, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (183, 107, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (184, 108, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (185, 109, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (186, 110, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (187, 111, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (188, 112, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (189, 113, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (190, 114, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (191, 115, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (192, 116, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (193, 117, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (194, 118, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (195, 119, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (196, 120, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (197, 121, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (198, 122, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (199, 123, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (200, 124, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (201, 125, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (202, 126, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (203, 127, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (204, 128, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (205, 129, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (206, 130, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (207, 131, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (208, 132, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (209, 133, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (210, 134, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (211, 135, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (212, 136, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (213, 137, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (214, 138, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (215, 139, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (216, 140, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (217, 141, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (218, 142, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (219, 143, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (220, 144, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (221, 145, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (222, 146, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (223, 147, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (224, 148, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (225, 149, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (226, 150, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (227, 151, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (228, 152, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (229, 153, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (230, 154, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (231, 155, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (232, 156, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (233, 157, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (234, 158, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (235, 159, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (236, 160, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (237, 161, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (238, 162, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (239, 163, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (240, 164, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (241, 165, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (242, 166, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (243, 167, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (244, 168, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (245, 169, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (246, 170, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (247, 171, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (248, 172, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (249, 173, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (250, 174, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (251, 175, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (252, 176, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (253, 177, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (254, 178, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (255, 179, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (256, 180, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (257, 181, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (258, 182, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (259, 183, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (260, 184, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (261, 185, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (262, 186, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (263, 187, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (264, 188, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (265, 189, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (266, 190, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (267, 191, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (268, 192, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (269, 193, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (270, 194, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (271, 195, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (272, 196, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (273, 197, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (274, 198, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (275, 199, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (276, 200, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (277, 201, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (278, 202, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (279, 203, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (280, 204, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (281, 205, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (282, 206, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (283, 207, 'Free Pet Vaccination', 'may magaganap po na libreng bakuna dito sa opisina', 'Announcement', 'announcement:4', 0, '2026-09-06T18:34:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (284, 18, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:10.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (285, 27, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:10.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (286, 28, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (287, 29, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (288, 30, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (289, 31, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (290, 32, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (291, 33, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (292, 34, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (293, 35, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (294, 36, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (295, 37, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (296, 38, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (297, 39, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (298, 40, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (299, 41, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (300, 42, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (301, 43, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (302, 44, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (303, 45, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (304, 46, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (305, 47, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (306, 48, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (307, 49, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (308, 50, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (309, 51, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (310, 52, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (311, 53, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (312, 54, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (313, 55, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (314, 56, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (315, 57, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (316, 58, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (317, 59, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (318, 60, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (319, 61, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (320, 62, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (321, 63, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (322, 64, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (323, 65, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (324, 66, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (325, 67, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (326, 68, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (327, 69, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (328, 70, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (329, 71, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (330, 72, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (331, 73, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (332, 74, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (333, 75, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (334, 76, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (335, 77, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (336, 78, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (337, 79, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (338, 80, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (339, 81, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (340, 82, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (341, 83, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (342, 84, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (343, 85, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (344, 86, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (345, 87, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (346, 88, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (347, 89, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (348, 90, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (349, 91, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (350, 92, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (351, 93, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (352, 94, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (353, 95, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (354, 96, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (355, 97, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (356, 98, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (357, 99, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (358, 100, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (359, 101, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (360, 102, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (361, 103, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (362, 104, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (363, 105, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (364, 106, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (365, 107, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (366, 108, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (367, 109, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (368, 110, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (369, 111, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (370, 112, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (371, 113, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (372, 114, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (373, 115, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (374, 116, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (375, 117, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (376, 118, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (377, 119, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (378, 120, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (379, 121, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (380, 122, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (381, 123, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (382, 124, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (383, 125, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (384, 126, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (385, 127, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (386, 128, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (387, 129, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (388, 130, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (389, 131, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (390, 132, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (391, 133, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (392, 134, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (393, 135, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (394, 136, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (395, 137, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (396, 138, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (397, 139, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (398, 140, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (399, 141, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (400, 142, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (401, 143, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (402, 144, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (403, 145, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (404, 146, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (405, 147, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (406, 148, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (407, 149, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (408, 150, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (409, 151, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (410, 152, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (411, 153, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (412, 154, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (413, 155, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (414, 156, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (415, 157, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (416, 158, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (417, 159, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (418, 160, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (419, 161, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (420, 162, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (421, 163, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (422, 164, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (423, 165, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (424, 166, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (425, 167, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (426, 168, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (427, 169, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (428, 170, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (429, 171, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (430, 172, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (431, 173, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (432, 174, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (433, 175, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (434, 176, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (435, 177, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (436, 178, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (437, 179, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (438, 180, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (439, 181, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (440, 182, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (441, 183, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (442, 184, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (443, 185, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (444, 186, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (445, 187, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (446, 188, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (447, 189, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (448, 190, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (449, 191, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (450, 192, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (451, 193, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (452, 194, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (453, 195, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (454, 196, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (455, 197, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (456, 198, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (457, 199, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (458, 200, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (459, 201, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (460, 202, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (461, 203, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (462, 204, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (463, 205, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (464, 206, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (465, 207, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'Please be informed that the City Veterinary Office will be conducting a Free Anti-Rabies Vaccination and Mass Deworming Drive this coming Saturday, September 12, 2026, starting at 8:00 AM at the Barangay Katapatan Covered Court.

Schedule & Services:

8:00 AM – 12:00 PM: Free Anti-Rabies Vaccination (Dogs and Cats)

1:00 PM – 4:00 PM: Free Deworming & Vitamin Administration, Free Basic Pet Health Consultations

Important Reminders for Pet Owners:

Age Requirement: Pets must be at least 3 months old and in good health (no fever, coughing, or diarrhea).

Safety First: Please bring dogs on a secure leash or harness. Cats must be placed in a sturdy pet carrier or secure breathable bag.

Documentation: Bring your pet''s vaccination card if available. First-time pets will be issued a new card on-site.

Let us work together to keep Cabuyao rabies-free and ensure our furry family members stay healthy and safe.

For inquiries, feel free to visit our office at the City Hall Annex or contact us through our official city page.

Mag-ingat po tayong lahat at kita-kits ngayong Sabado!', 'Announcement', 'announcement:7', 0, '2026-09-06T18:51:11.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (467, 17, 'ANNOUNCEMENT FROM THE CABUYAO CITY VETERINARY OFFICE', 'To All Cabuyeño Pet Owners:

We are pleased to announce our upcoming Free Low-Cost Pet Spay and Neuter (Kapon) & Registration Drive on Saturday, September 19, 2026, starting at 8:00 AM at the Cabuyao City Plaza Covered Court.

Controlling the stray population and preventing reproductive health issues starts with responsible pet ownership.

Services Offered:

Free Spay & Neuter (Kapon): Limited slots available for qualified dogs and cats.

Free City Pet Registration & Microchipping: Register your pets to help locate them if they ever get lost.

Free Anti-Rabies Booster Shots: For pets due for their annual vaccine.

Important Guidelines for Spay/Neuter:

Pre-Registration Required: Due to limited surgical slots, registration opens on Wednesday, September 16, 2026, at the City Veterinary Office (City Hall Annex). First come, first served.

Fasting Requirement: Pets scheduled for surgery must fast (strictly no food or water) for 8 hours prior to the procedure.

Health Condition: Pets must be at least 6 months old, fully vaccinated, and in good physical condition. Pregnant or lactating pets will not be accepted.

Protect your pets and help build a safer, stray-free Cabuyao!

Magkita-kita po tayo!', 'Announcement', 'announcement:8', 0, '2026-09-06T19:03:31.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (468, 18, 'Pet Registration', 'Hachikow has been successfully registered.', 'Registration', 'my-pets', 0, '2026-09-06T19:54:22.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (470, 17, 'New Pet Registration', 'KB Trinidad''s pet Hachikow is awaiting verification.', 'Registration', NULL, 0, '2026-09-06T19:54:22.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (471, 18, 'QR Generated', 'QR Code has been generated for Hachikow.', 'QR', 'qr-records', 0, '2026-09-06T19:54:42.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (472, 18, 'Registration Verified', 'Hachikow''s registration has been verified.', 'Registration', 'my-pets', 0, '2026-09-06T19:54:42.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (473, 18, 'Vaccination Updated', 'Hachikow has been vaccinated.', 'Vaccination', 'vaccinations', 1, '2026-09-06T21:59:22.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (474, 18, 'Vaccination Overdue', 'Hachikow''s vaccination is overdue. Please visit the clinic as soon as possible.', 'Vaccination', 'vaccinations', 0, '2026-09-06T21:59:22.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (475, 18, 'Pet Registration', 'Melay has been successfully registered.', 'Registration', 'my-pets', 0, '2026-09-10T13:25:21.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (477, 17, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Melay is awaiting verification.', 'Registration', NULL, 1, '2026-09-10T13:25:21.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (478, 18, 'QR Generated', 'QR Code has been generated for Melay.', 'QR', 'qr-records', 0, '2026-09-10T13:25:32.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (479, 18, 'Registration Verified', 'Melay''s registration has been verified.', 'Registration', 'my-pets', 0, '2026-09-10T13:25:32.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (480, 18, 'Vaccination Updated', 'Max has been vaccinated.', 'Vaccination', 'vaccinations', 0, '2026-09-11T05:50:36.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (481, 211, 'Medicine Record Added', 'Snow has a new medicine prescription.', 'System', 'clinical-medicine', 0, '2026-09-11T09:55:22.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (483, 211, 'Vaccination Updated', 'Minggay has been vaccinated.', 'Vaccination', 'vaccinations', 0, '2026-09-12T07:22:49.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (485, 18, 'Vaccination Updated', 'Max has been vaccinated.', 'Vaccination', 'vaccinations', 0, '2026-09-12T14:47:29.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (487, 18, 'Pet Registration', 'Molly has been successfully registered.', 'Registration', 'my-pets', 0, '2026-09-13T16:32:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (489, 17, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Molly is awaiting verification.', 'Registration', NULL, 0, '2026-09-13T16:32:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (490, 209, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Molly is awaiting verification.', 'Registration', NULL, 0, '2026-09-13T16:32:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (491, 210, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Molly is awaiting verification.', 'Registration', NULL, 0, '2026-09-13T16:32:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (492, 219, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Molly is awaiting verification.', 'Registration', NULL, 0, '2026-09-13T16:32:12.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (493, 18, 'Registration Removed', 'You removed QA Delete Test''s registration.', 'Registration', 'my-pets', 0, '2026-09-13T17:25:49.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (495, 18, 'Registration Removed', 'You removed Molly''s registration.', 'Registration', 'my-pets', 0, '2026-09-14T16:00:09.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (496, 18, 'Pet Registration', 'Muning has been successfully registered.', 'Registration', 'my-pets', 0, '2026-09-14T16:54:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (498, 17, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Muning is awaiting verification.', 'Registration', NULL, 0, '2026-09-14T16:54:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (499, 209, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Muning is awaiting verification.', 'Registration', NULL, 0, '2026-09-14T16:54:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (500, 210, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Muning is awaiting verification.', 'Registration', NULL, 0, '2026-09-14T16:54:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (501, 219, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Muning is awaiting verification.', 'Registration', NULL, 0, '2026-09-14T16:54:34.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (502, 18, 'QR Generated', 'QR Code has been generated for Molly.', 'QR', 'qr-records', 0, '2026-09-15T08:37:43.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (503, 18, 'Registration Verified', 'Molly''s registration has been verified.', 'Registration', 'my-pets', 0, '2026-09-15T08:37:43.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (504, 18, 'Pet Registration', 'Sophia has been successfully registered.', 'Registration', 'my-pets', 0, '2026-09-16T05:54:28.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (506, 17, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Sophia is awaiting verification.', 'Registration', NULL, 0, '2026-09-16T05:54:28.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (507, 209, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Sophia is awaiting verification.', 'Registration', NULL, 0, '2026-09-16T05:54:28.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (508, 210, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Sophia is awaiting verification.', 'Registration', NULL, 0, '2026-09-16T05:54:28.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (509, 219, 'New Pet Registration', 'Kaizen Brix S. Trinidad''s pet Sophia is awaiting verification.', 'Registration', NULL, 0, '2026-09-16T05:54:28.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (510, 18, 'Registration Removed', 'You removed Sophia''s registration.', 'Registration', 'my-pets', 0, '2026-09-16T06:32:23.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (511, 1269, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (512, 1270, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (513, 1270, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-06T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (514, 1270, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (515, 1271, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-02T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (516, 1271, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (517, 1271, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (518, 1272, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (519, 1272, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-11T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (520, 1272, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (521, 1273, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-02T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (522, 1273, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (523, 1274, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (524, 1274, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (525, 1274, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (526, 1275, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (527, 1276, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (528, 1276, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (529, 1277, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (530, 1277, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (531, 1278, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (532, 1279, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (533, 1279, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (534, 1280, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (535, 1281, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (536, 1281, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (537, 1282, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (538, 1282, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (539, 1283, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-06T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (540, 1284, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (541, 1284, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-11T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (542, 1285, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (543, 1285, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (544, 1286, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (545, 1286, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (546, 1286, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (547, 1287, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (548, 1288, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (549, 1288, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-06T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (550, 1288, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (551, 1289, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (552, 1289, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (553, 1290, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (554, 1291, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (555, 1291, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (556, 1292, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (557, 1292, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (558, 1292, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (559, 1293, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (560, 1293, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (561, 1294, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-26T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (562, 1294, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (563, 1295, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (564, 1296, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (565, 1297, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (566, 1297, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (567, 1298, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (568, 1298, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (569, 1299, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (570, 1299, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-02T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (571, 1299, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (572, 1300, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (573, 1301, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (574, 1302, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (575, 1302, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (576, 1303, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (577, 1304, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (578, 1305, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (579, 1305, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (580, 1305, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (581, 1306, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (582, 1306, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-06T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (583, 1307, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (584, 1307, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-15T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (585, 1308, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (586, 1308, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (587, 1309, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (588, 1309, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-06T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (589, 1310, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (590, 1310, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-15T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (591, 1311, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (592, 1311, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (593, 1311, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (594, 1312, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (595, 1312, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-15T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (596, 1313, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (597, 1313, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (598, 1314, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (599, 1315, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (600, 1316, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (601, 1317, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (602, 1317, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (603, 1318, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (604, 1319, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (605, 1319, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (606, 1320, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (607, 1320, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (608, 1321, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (609, 1321, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (610, 1321, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (611, 1322, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (612, 1322, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (613, 1323, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (614, 1323, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-15T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (615, 1324, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (616, 1324, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (617, 1324, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-15T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (618, 1325, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (619, 1325, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (620, 1326, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (621, 1326, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (622, 1327, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (623, 1327, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (624, 1328, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (625, 1328, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (626, 1329, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (627, 1330, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (628, 1331, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (629, 1331, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (630, 1332, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (631, 1332, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (632, 1333, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-15T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (633, 1334, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (634, 1334, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (635, 1335, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (636, 1335, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (637, 1336, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (638, 1336, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (639, 1337, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (640, 1337, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (641, 1338, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (642, 1338, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (643, 1339, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-15T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (644, 1340, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-26T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (645, 1340, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (646, 1341, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (647, 1342, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (648, 1343, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (649, 1344, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (650, 1344, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (651, 1344, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-02T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (652, 1345, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (653, 1345, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (654, 1346, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (655, 1347, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (656, 1347, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (657, 1348, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (658, 1348, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (659, 1349, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (660, 1349, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-02T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (661, 1350, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (662, 1350, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (663, 1351, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (664, 1351, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (665, 1352, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-26T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (666, 1352, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (667, 1353, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (668, 1354, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (669, 1355, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (670, 1355, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-02T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (671, 1355, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-03T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (672, 1356, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (673, 1356, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (674, 1357, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (675, 1357, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (676, 1358, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (677, 1359, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (678, 1359, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (679, 1360, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (680, 1360, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (681, 1360, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-14T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (682, 1361, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (683, 1361, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (684, 1362, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-11T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (685, 1362, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (686, 1363, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (687, 1364, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-06T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (688, 1364, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (689, 1364, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (690, 1365, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (691, 1366, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-07T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (692, 1366, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (693, 1366, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (694, 1367, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (695, 1367, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (696, 1368, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (697, 1368, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (698, 1369, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (699, 1369, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (700, 1370, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-11T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (701, 1370, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (702, 1370, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-13T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (703, 1371, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-26T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (704, 1372, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-08T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (705, 1372, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (706, 1372, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (707, 1373, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (708, 1374, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (709, 1374, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (710, 1375, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (711, 1376, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-04T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (712, 1376, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (713, 1377, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-10T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (714, 1377, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-09-12T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (715, 1378, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-27T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (716, 1378, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-08-28T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (717, 1378, 'New Announcement', 'Free anti-rabies vaccination drive schedules have been posted. Check the announcements tab.', 'Announcement', '/owner/announcements', 0, '2026-08-29T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (718, 1379, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-30T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (719, 1380, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-05T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (720, 1381, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-08-31T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (721, 1381, 'Vaccination Reminder', 'Your pet''s vaccination may be due soon. Please check your vaccination history.', 'Vaccination', '/owner/vaccination-history', 0, '2026-09-01T20:00:00.000Z') ON CONFLICT DO NOTHING;
INSERT INTO "notifications" ("id", "user_id", "title", "message", "type", "link", "is_read", "created_at") VALUES (722, 1382, 'Pet Registration Approved', 'Your pet registration has been verified and a QR pet ID is now available in your records.', 'Registration', '/owner/my-pets', 0, '2026-09-09T20:00:00.000Z') ON CONFLICT DO NOTHING;