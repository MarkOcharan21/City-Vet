-- Migration: Add breed_custom column to pets table if it doesn't exist
-- This allows storing custom breed names when users select "Other"
ALTER TABLE pets ADD COLUMN breed_custom VARCHAR(100) AFTER breed_id;
