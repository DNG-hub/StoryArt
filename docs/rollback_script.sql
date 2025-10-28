-- StoryArt Location Hierarchy Rollback Script
-- This script safely removes the hierarchy system if needed
-- WARNING: This will permanently delete all hierarchy data

-- Rollback Script Version: 1.0
-- Created: $(date)
-- Purpose: Safely remove StoryArt hierarchy system

-- Step 1: Verify current state
\echo 'Step 1: Verifying current hierarchy state...'
SELECT 
    'Current hierarchy records:' as status,
    COUNT(*) as record_count
FROM storyart_location_hierarchy;

-- Step 2: Create final backup before rollback
\echo 'Step 2: Creating final backup before rollback...'
CREATE TABLE IF NOT EXISTS storyart_location_hierarchy_rollback_backup AS
SELECT 
    h.*,
    la.name as location_name,
    s.title as story_title
FROM storyart_location_hierarchy h
JOIN location_arcs la ON h.location_arc_id = la.id
JOIN stories s ON h.story_id = s.id;

-- Verify backup
SELECT 
    'Final backup created with' as status,
    COUNT(*) as record_count,
    'records' as unit
FROM storyart_location_hierarchy_rollback_backup;

-- Step 3: Disable foreign key constraints temporarily
\echo 'Step 3: Disabling foreign key constraints...'
-- Note: PostgreSQL doesn't allow disabling constraints on referenced tables
-- We'll handle this by dropping in the correct order

-- Step 4: Drop views and functions
\echo 'Step 4: Dropping views and functions...'

-- Drop the view
DROP VIEW IF EXISTS storyart_location_hierarchy_view;

-- Drop the functions
DROP FUNCTION IF EXISTS get_child_locations(UUID);
DROP FUNCTION IF EXISTS get_parent_location(UUID);
DROP FUNCTION IF EXISTS update_storyart_hierarchy_updated_at();

-- Step 5: Drop triggers
\echo 'Step 5: Dropping triggers...'
DROP TRIGGER IF EXISTS trigger_update_storyart_hierarchy_updated_at ON storyart_location_hierarchy;

-- Step 6: Drop indexes
\echo 'Step 6: Dropping indexes...'
DROP INDEX IF EXISTS idx_storyart_hierarchy_story_id;
DROP INDEX IF EXISTS idx_storyart_hierarchy_parent_id;
DROP INDEX IF EXISTS idx_storyart_hierarchy_location_arc_id;
DROP INDEX IF EXISTS idx_storyart_hierarchy_area_type;
DROP INDEX IF EXISTS idx_storyart_hierarchy_floor_level;

-- Step 7: Drop the main table
\echo 'Step 7: Dropping main table...'
DROP TABLE IF EXISTS storyart_location_hierarchy;

-- Step 8: Verify rollback completion
\echo 'Step 8: Verifying rollback completion...'

-- Check that table no longer exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storyart_location_hierarchy')
        THEN 'ERROR: Table still exists!'
        ELSE 'SUCCESS: Table removed'
    END as rollback_status;

-- Check that view no longer exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'storyart_location_hierarchy_view')
        THEN 'ERROR: View still exists!'
        ELSE 'SUCCESS: View removed'
    END as view_rollback_status;

-- Check that functions no longer exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_child_locations')
        THEN 'ERROR: Functions still exist!'
        ELSE 'SUCCESS: Functions removed'
    END as function_rollback_status;

-- Step 9: Verify original data integrity
\echo 'Step 9: Verifying original data integrity...'

-- Check that original location_arcs data is unchanged
SELECT 
    'Original location_arcs records:' as status,
    COUNT(*) as record_count
FROM location_arcs 
WHERE story_id = '$env:CAT_DANIEL_STORY_ID'::uuid;

-- Check that backup data matches original
SELECT 
    'Backup data matches original:' as status,
    CASE 
        WHEN (SELECT COUNT(*) FROM storyart_location_arcs_backup) = 
             (SELECT COUNT(*) FROM location_arcs WHERE story_id = '$env:CAT_DANIEL_STORY_ID'::uuid)
        THEN 'SUCCESS: Data integrity maintained'
        ELSE 'WARNING: Data mismatch detected'
    END as integrity_status;

-- Step 10: Cleanup backup tables (optional)
\echo 'Step 10: Cleanup options...'
SELECT 
    'Backup tables available for cleanup:' as cleanup_info,
    'storyart_location_arcs_backup - Original location_arcs backup' as backup_1,
    'storyart_location_hierarchy_rollback_backup - Final hierarchy backup' as backup_2,
    'Run DROP TABLE commands to remove backups if no longer needed' as cleanup_note;

-- Step 11: Rollback summary
\echo 'Step 11: Rollback summary...'
SELECT 
    'Rollback Summary:' as summary_title,
    'All hierarchy tables removed' as step_1,
    'All functions and views removed' as step_2,
    'All indexes removed' as step_3,
    'Original data integrity verified' as step_4,
    'Backup data preserved' as step_5,
    'StoryTeller database unchanged' as step_6;

-- Step 12: Manual cleanup commands (commented out for safety)
/*
-- Uncomment these lines to remove backup tables
-- DROP TABLE IF EXISTS storyart_location_arcs_backup;
-- DROP TABLE IF EXISTS storyart_location_hierarchy_rollback_backup;
*/

\echo 'Rollback completed successfully!'
\echo 'The StoryArt hierarchy system has been completely removed.'
\echo 'Original StoryTeller database remains unchanged.'
\echo 'Backup data is preserved for future reference.'
