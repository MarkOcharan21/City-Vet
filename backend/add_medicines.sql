-- Add more medicines to the PostgreSQL database so prescription items won't fail FK constraints
-- These match categories for auto-stamp-color assignment

INSERT INTO medicines (medicine_name, category, default_dosage, default_frequency, default_duration, default_instructions, stamp_color) VALUES
('Amoxicillin', 'antibiotic', '1 capsule', '2x daily', '5 days', 'With food', 'DC2626'),
('Ampicillin', 'antibiotic', '1 capsule', '2x daily', '5 days', 'On empty stomach', 'DC2626'),
('Cefalexin', 'antibiotic', '1 tablet', '1x daily', '7 days', 'With meals', 'DC2626'),
('Azithromycin', 'antibiotic', '1 tablet', '1x daily', '3 days', 'Once daily', 'DC2626'),
('Cephalexin', 'antibiotic', '1 tablet', '1x daily', '7 days', 'With food', 'DC2626'),
('Doxycycline', 'antibiotic', '1 tablet', '1x daily', '7 days', 'With water', 'DC2626'),
('Metronidazole', 'antibiotic', '1 tablet (250mg)', '2x daily', '5 days', 'With food', 'DC2626'),
('Ciprofloxacin', 'antibiotic', '1 tablet (500mg)', '2x daily', '7 days', 'With water', 'DC2626'),
('Levofloxacin', 'antibiotic', '1 tablet (500mg)', '1x daily', '5 days', 'With water', 'DC2626'),
('Amoxicillin-Clavulanate', 'antibiotic', '1 tablet', '2x daily', '7 days', 'With meals', 'DC2626');

INSERT INTO medicines (medicine_name, category, default_dosage, default_frequency, default_duration, default_instructions, stamp_color) VALUES
('Ivermectin', 'antiparasitic', '1 tablet', '1x daily', '3 days', 'After meals', '059669'),
('Milbemycin Oxime', 'antiparasitic', '1 tablet', '1x monthly', '1 month', 'Monthly prevention', '059669'),
('Pyrantel Pamoate', 'antiparasitic', '1 tablet', '1x daily', '3 days', 'After meals', '059669'),
('Fenbendazole', 'antiparasitic', '1 tablet', '1x daily', '3 days', 'For 3 consecutive days', '059669'),
('Praziquantel', 'antiparasitic', '1 tablet', '1x daily', '1-3 days', 'Single dose', '059669'),
('Diethylcarbamazine', 'antiparasitic', '1 tablet', '1x daily', '21 days', 'For filariasis', '059669');

INSERT INTO medicines (medicine_name, category, default_dosage, default_frequency, default_duration, default_instructions, stamp_color) VALUES
('Carprofen', 'pain', '1 tablet (25mg)', '1x / 12 hours', '3 days', 'With food to avoid GI upset', '7C3AED'),
('Meloxicam', 'pain', '1 tablet (7.5mg)', '1x daily', '5 days', 'With food', '7C3AED'),
('Deracoxib', 'pain', '1 tablet (50mg)', '1x daily', '5 days', 'With food', '7C3AED'),
('Firocoxib', 'pain', '1 chewable tablet', '1x daily', '3 days', 'With food', '7C3AED'),
('Gabapentin', 'pain', '1 capsule (100mg)', '1x daily', '14 days', 'With or without food', '7C3AED'),
('Amantadine', 'pain', '1 capsule (100mg)', '1x daily', '30 days', 'For chronic pain', '7C3AED');

INSERT INTO medicines (medicine_name, category, default_dosage, default_frequency, default_duration, default_instructions, stamp_color) VALUES
('Chlorpheniramine', 'antihistamine', '1 tablet', '2x daily', '5 days', 'With food', '6B7280'),
('Diphenhydramine', 'antihistamine', '1 tablet', '2-3x daily', '5 days', 'With meals', '6B7280'),
('Cetirizine', 'antihistamine', '1 tablet', '1x daily', '7 days', 'With water', '6B7280'),
('Hydroxyzine', 'antihistamine', '1 tablet', '2x daily', '7 days', 'With food', '6B7280'),
('Prednisolone', 'anti-inflammatory', '1 tablet (5mg)', '1x daily', '5 days', 'With food', 'D97706'),
('Prednisone', 'anti-inflammatory', '1 tablet (5mg)', '1x daily', '5 days', 'With food', 'D97706'),
('Dexamethasone', 'anti-inflammatory', '1 tablet (0.5mg)', '1x daily', '3 days', 'With food', 'D97706'),
('Triamcinolone', 'anti-inflammatory', '1 tablet (4mg)', '1x daily', '5 days', 'With food', 'D97706');

INSERT INTO medicines (medicine_name, category, default_dosage, default_frequency, default_duration, default_instructions, stamp_color) VALUES
('Vitamin B Complex', 'supplement', '1 tablet', '1x daily', '30 days', 'Daily vitamin support', '6B7280'),
('Vitamin C', 'supplement', '1 tablet', '1x daily', '30 days', 'Immune support', '6B7280'),
('Vitamin E', 'supplement', '1 softgel', '1x daily', '30 days', 'Antioxidant support', '6B7280'),
('Probiotics', 'supplement', '1 capsule', '1x daily', '30 days', 'Gut health support', '6B7280'),
('Fish Oil', 'supplement', '1 softgel', '1x daily', '60 days', 'Skin & coat support', '6B7280');

-- Add more general medicines
INSERT INTO medicines (medicine_name, category, default_dosage, default_frequency, default_duration, default_instructions, stamp_color) VALUES
('Oral Rehydration Salts', 'general', '1 packet', '1x daily', 'until recovered', 'Mix with water', '6B7280'),
('Electrolyte Solution', 'general', '1 liter', '1x daily', '2-3 days', 'Mix with water', '6B7280'),
('Famotidine', 'general', '1 tablet (20mg)', '1x daily', '14 days', 'With or without food', '6B7280'),
('Ranitidine', 'general', '1 tablet (150mg)', '1x or 2x daily', '2 weeks', 'With or without food', '6B7280'),
('Simethicone', 'general', '1 tablet (40mg)', '1-3x daily', 'As needed', 'For gas relief', '6B7280');