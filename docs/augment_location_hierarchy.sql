-- StoryArt Location Hierarchy Augmentation
-- This script adds new columns to the storyart_location_hierarchy table
-- to support advanced, context-aware prompt generation.
-- These changes are non-disruptive as the columns are nullable.

BEGIN;

-- Add a column to store a baseline visual description for a parent location.
-- This will be used to ensure all child locations share a consistent visual DNA.
ALTER TABLE storyart_location_hierarchy
ADD COLUMN IF NOT EXISTS ambient_prompt_fragment TEXT;

-- Add a column to store an array of specific, defining visual keywords for a sub-location.
-- This will be used to describe the unique character of a specific room or area.
ALTER TABLE storyart_location_hierarchy
ADD COLUMN IF NOT EXISTS defining_visual_features TEXT[];

COMMENT ON COLUMN storyart_location_hierarchy.ambient_prompt_fragment IS 'A baseline visual and atmospheric description for a parent location, used to ground all its child locations in a consistent environment.';
COMMENT ON COLUMN storyart_location_hierarchy.defining_visual_features IS 'An array of specific visual keywords that uniquely define a sub-location (e.g., ["rows of server racks", "blinking status lights"]).';

COMMIT;

\echo 'SUCCESS: The storyart_location_hierarchy table has been augmented with new columns for advanced prompt generation.'
\echo 'INFO: This is a non-disruptive change.'
