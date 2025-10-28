-- StoryArt - Populate Visual Features for NHIA Facility 7
-- This script populates the ambient_prompt_fragment and defining_visual_features
-- for the existing NHIA Facility 7 location hierarchy.

BEGIN;

-- Step 1: Update the PARENT location (NHIA Facility 7) with its
-- ambient prompt fragment. This provides the visual DNA for all its children.
UPDATE storyart_location_hierarchy
SET ambient_prompt_fragment = 'interior of a ruined CDC facility, brutalist concrete architecture, eerie silence, dust motes in shafts of light, sense of decay and abandonment, flickering emergency lights'
WHERE
    parent_location_id IS NULL AND
    location_arc_id = (SELECT id FROM location_arcs WHERE name = 'NHIA Facility 7');

-- Step 2: Update the CHILD locations with their specific, defining visual features.

-- For the Reception Area
UPDATE storyart_location_hierarchy
SET defining_visual_features = ARRAY['destroyed reception desk', 'scattered and abandoned visitor logs', 'broken security checkpoint', 'shattered glass partitions']
WHERE
    location_arc_id = (SELECT id FROM location_arcs WHERE name = 'NHIA Facility 7 - Reception Area');

-- For the Corridors
UPDATE storyart_location_hierarchy
SET defining_visual_features = ARRAY['long sterile corridors', 'abandoned computer terminals', 'overturned gurneys', 'shredded files on the floor']
WHERE
    location_arc_id = (SELECT id FROM location_arcs WHERE name = 'NHIA Facility 7 - Corridors');

-- For the Data Vault
UPDATE storyart_location_hierarchy
SET defining_visual_features = ARRAY['underground vault with reinforced concrete walls', 'accessed through a heavy reinforced door', 'rows of shattered containment pods', 'abandoned lab equipment']
WHERE
    location_arc_id = (SELECT id FROM location_arcs WHERE name = 'NHIA Facility 7 - Data Vault');

-- For the Server Room
UPDATE storyart_location_hierarchy
SET defining_visual_features = ARRAY['hardened server room', 'rows of server racks with blinking status lights', 'thick bundles of cables on the floor', 'biohazard warnings on walls']
WHERE
    location_arc_id = (SELECT id FROM location_arcs WHERE name = 'NHIA Facility 7 - Server Room');

COMMIT;

\echo 'SUCCESS: Populated visual feature data for the NHIA Facility 7 hierarchy.'
\echo 'INFO: This script has updated 5 rows in the storyart_location_hierarchy table.'
