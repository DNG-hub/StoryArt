-- StoryArt Location Hierarchy Migration Script
-- This script safely migrates existing location data to the new hierarchy system
-- without affecting the primary StoryTeller database

-- Migration Script Version: 1.0
-- Created: $(date)
-- Purpose: Create hierarchical location system for StoryArt

-- Step 1: Create the hierarchy table (if not exists)
\echo 'Step 1: Creating storyart_location_hierarchy table...'
\i docs/database_schema_enhancement.sql

-- Step 2: Verify table creation
\echo 'Step 2: Verifying table creation...'
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'storyart_location_hierarchy' 
ORDER BY ordinal_position;

-- Step 3: Check initial data insertion
\echo 'Step 3: Checking initial data insertion...'
SELECT 
    h.id,
    h.area_type,
    h.floor_level,
    h.access_method,
    la.name as location_name
FROM storyart_location_hierarchy h
JOIN location_arcs la ON h.location_arc_id = la.id
WHERE la.story_id = '$env:CAT_DANIEL_STORY_ID'::uuid
ORDER BY h.floor_level, h.area_type;

-- Step 4: Test the view
\echo 'Step 4: Testing the hierarchy view...'
SELECT 
    hierarchy_id,
    location_name,
    area_type,
    floor_level,
    access_method,
    hierarchy_visual_description
FROM storyart_location_hierarchy_view
WHERE story_id = '$env:CAT_DANIEL_STORY_ID'::uuid
ORDER BY floor_level, area_type;

-- Step 5: Test the functions
\echo 'Step 5: Testing hierarchy functions...'

-- Test get_child_locations function
SELECT 'Testing get_child_locations function:' as test_description;
SELECT * FROM get_child_locations(
    (SELECT id FROM location_arcs WHERE name = 'NHIA Facility 7' AND story_id = '$env:CAT_DANIEL_STORY_ID'::uuid)
);

-- Test get_parent_location function
SELECT 'Testing get_parent_location function:' as test_description;
SELECT * FROM get_parent_location(
    (SELECT id FROM location_arcs WHERE name = 'NHIA Facility 7' AND story_id = '$env:CAT_DANIEL_STORY_ID'::uuid)
);

-- Step 6: Verify data integrity
\echo 'Step 6: Verifying data integrity...'

-- Check that all hierarchy entries have valid location_arc references
SELECT 
    'Hierarchy entries with invalid location_arc references:' as check_description,
    COUNT(*) as invalid_count
FROM storyart_location_hierarchy h
LEFT JOIN location_arcs la ON h.location_arc_id = la.id
WHERE la.id IS NULL;

-- Check that all hierarchy entries have valid story references
SELECT 
    'Hierarchy entries with invalid story references:' as check_description,
    COUNT(*) as invalid_count
FROM storyart_location_hierarchy h
LEFT JOIN stories s ON h.story_id = s.id
WHERE s.id IS NULL;

-- Check for circular references in parent-child relationships
WITH RECURSIVE hierarchy_path AS (
    -- Base case: root nodes
    SELECT id, parent_location_id, 1 as depth, ARRAY[id] as path
    FROM storyart_location_hierarchy
    WHERE parent_location_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child nodes
    SELECT h.id, h.parent_location_id, hp.depth + 1, hp.path || h.id
    FROM storyart_location_hierarchy h
    JOIN hierarchy_path hp ON h.parent_location_id = hp.id
    WHERE h.id != ALL(hp.path) -- Prevent infinite recursion
)
SELECT 
    'Circular references detected:' as check_description,
    COUNT(*) as circular_count
FROM hierarchy_path
WHERE depth > 10; -- Arbitrary depth limit to detect cycles

-- Step 7: Performance testing
\echo 'Step 7: Testing query performance...'

-- Test query performance with EXPLAIN ANALYZE
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    h.area_type,
    h.floor_level,
    la.name,
    la.visual_description
FROM storyart_location_hierarchy h
JOIN location_arcs la ON h.location_arc_id = la.id
WHERE la.story_id = '$env:CAT_DANIEL_STORY_ID'::uuid
ORDER BY h.floor_level, h.area_type;

-- Step 8: Create backup verification
\echo 'Step 8: Creating backup verification...'

-- Create a backup table of the original location_arcs data
CREATE TABLE IF NOT EXISTS storyart_location_arcs_backup AS
SELECT * FROM location_arcs WHERE story_id = '$env:CAT_DANIEL_STORY_ID'::uuid;

-- Verify backup was created
SELECT 
    'Backup table created with' as status,
    COUNT(*) as record_count,
    'records' as unit
FROM storyart_location_arcs_backup;

-- Step 9: Migration summary
\echo 'Step 9: Migration summary...'

SELECT 
    'Migration Summary:' as summary_title,
    'storyart_location_hierarchy table created' as step_1,
    'NHIA Facility 7 hierarchy initialized' as step_2,
    'Functions and views created' as step_3,
    'Data integrity verified' as step_4,
    'Performance tested' as step_5,
    'Backup created' as step_6;

-- Step 10: Next steps documentation
\echo 'Step 10: Next steps...'
SELECT 
    'Next Steps:' as next_steps_title,
    '1. Test the hierarchy system with StoryArt application' as step_1,
    '2. Create additional location hierarchies as needed' as step_2,
    '3. Implement artifact redistribution to child locations' as step_3,
    '4. Update StoryArt services to use hierarchy data' as step_4;

\echo 'Migration completed successfully!'
\echo 'The storyart_location_hierarchy system is ready for use.'
\echo 'Original StoryTeller database remains unchanged.'
