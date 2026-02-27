-- Multi-Phase Character Appearance System Migration
-- Adds context_phase and phase_trigger_text columns to character_location_contexts table
-- Enables support for multiple appearance states per character within a single location
-- Version: v0.20
-- Date: 2026-02-27

-- Step 1: Add phase columns to character_location_contexts table
ALTER TABLE character_location_contexts
  ADD COLUMN context_phase VARCHAR(100) NOT NULL DEFAULT 'default',
  ADD COLUMN phase_trigger_text TEXT;

-- Step 2: Update unique constraint to allow multiple phases per (character, location_arc)
-- First, identify and drop the old constraint if it exists
ALTER TABLE character_location_contexts
  DROP CONSTRAINT IF EXISTS character_location_contexts_character_id_location_arc_id_key;

-- Step 3: Add new unique constraint that includes context_phase
ALTER TABLE character_location_contexts
  ADD CONSTRAINT character_location_contexts_unique_phase
  UNIQUE (character_id, location_arc_id, context_phase);

-- Step 4: Create index for faster phase lookups
CREATE INDEX IF NOT EXISTS idx_character_location_contexts_phase
  ON character_location_contexts(character_id, location_arc_id, context_phase);

-- Step 5: Documentation
-- Standard phase vocabulary (generic, works for any episode):
-- - 'default': Single-phase location — existing behavior, fully backward compatible
-- - 'transit': Character is traveling to/from this location (e.g., "driving", "en route")
-- - 'arrival': Character just arrived, transitioning in (e.g., "enters", "steps inside")
-- - 'settled': Character established at location, may have changed appearance (e.g., "changed", "working")
-- - 'departure': Character is leaving (rare, for scenes that end mid-travel)
-- - Custom labels are allowed — context_phase is free-text
--
-- Migration example for E3S2 "The Silo" with Cat's multi-phase appearance:
-- INSERT INTO character_location_contexts (character_id, location_arc_id, context_phase, phase_trigger_text, ...)
-- VALUES
--   (cat_id, silo_id, 'transit', 'Cat is riding as passenger on the Dingy en route to the Silo', ...),
--   (cat_id, silo_id, 'arrival', 'Cat entering and securing the Silo', ...),
--   (cat_id, silo_id, 'settled', 'Cat after changing clothing at the Silo', ...);

-- Step 6: Verify the changes
SELECT 'Migration completed successfully!' as status;
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'character_location_contexts'
  AND column_name IN ('context_phase', 'phase_trigger_text')
ORDER BY ordinal_position;

-- Show constraints
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'character_location_contexts'
  AND constraint_name LIKE '%phase%';
