-- StoryArt Location Hierarchy Enhancement
-- This script creates a separate table for hierarchical location data
-- without modifying the primary StoryTeller database structure

-- Create the storyart_location_hierarchy table
CREATE TABLE IF NOT EXISTS storyart_location_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_location_id UUID REFERENCES storyart_location_hierarchy(id),
    location_arc_id UUID NOT NULL REFERENCES location_arcs(id),
    story_id UUID NOT NULL REFERENCES stories(id),
    
    -- Hierarchy-specific fields
    floor_level INTEGER,
    area_type VARCHAR(50), -- 'reception', 'server_room', 'vault', 'corridor', 'office', 'lab', etc.
    access_method VARCHAR(100), -- 'stairs', 'elevator', 'door', 'corridor', etc.
    
    -- Enhanced visual context
    visual_description TEXT,
    atmosphere_description TEXT,
    lighting_description TEXT,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_location_hierarchy UNIQUE (location_arc_id, parent_location_id, area_type),
    CONSTRAINT valid_floor_level CHECK (floor_level IS NULL OR floor_level >= -10 AND floor_level <= 50)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storyart_hierarchy_story_id ON storyart_location_hierarchy(story_id);
CREATE INDEX IF NOT EXISTS idx_storyart_hierarchy_parent_id ON storyart_location_hierarchy(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_storyart_hierarchy_location_arc_id ON storyart_location_hierarchy(location_arc_id);
CREATE INDEX IF NOT EXISTS idx_storyart_hierarchy_area_type ON storyart_location_hierarchy(area_type);
CREATE INDEX IF NOT EXISTS idx_storyart_hierarchy_floor_level ON storyart_location_hierarchy(floor_level);

-- Create a view for easy querying with location_arcs data
CREATE OR REPLACE VIEW storyart_location_hierarchy_view AS
SELECT 
    h.id as hierarchy_id,
    h.parent_location_id,
    h.location_arc_id,
    h.story_id,
    h.floor_level,
    h.area_type,
    h.access_method,
    h.visual_description as hierarchy_visual_description,
    h.atmosphere_description,
    h.lighting_description,
    h.is_active,
    h.created_at,
    h.updated_at,
    
    -- Location arcs data
    la.name as location_name,
    la.description as location_description,
    la.location_type,
    la.atmosphere_category,
    la.geographical_location,
    la.time_period,
    la.cultural_context,
    la.atmosphere,
    la.visual_description as location_visual_description,
    la.key_features,
    la.visual_reference_url,
    la.significance_level,
    la.notes
    
FROM storyart_location_hierarchy h
JOIN location_arcs la ON h.location_arc_id = la.id
WHERE h.is_active = true;

-- Create a function to get child locations
CREATE OR REPLACE FUNCTION get_child_locations(parent_location_arc_id UUID)
RETURNS TABLE (
    child_id UUID,
    child_name VARCHAR(255),
    area_type VARCHAR(50),
    floor_level INTEGER,
    visual_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        la.name,
        h.area_type,
        h.floor_level,
        COALESCE(h.visual_description, la.visual_description) as visual_description
    FROM storyart_location_hierarchy h
    JOIN location_arcs la ON h.location_arc_id = la.id
    WHERE h.parent_location_id = (
        SELECT id FROM storyart_location_hierarchy 
        WHERE location_arc_id = parent_location_arc_id
    )
    AND h.is_active = true
    ORDER BY h.floor_level, h.area_type;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get parent location
CREATE OR REPLACE FUNCTION get_parent_location(child_location_arc_id UUID)
RETURNS TABLE (
    parent_id UUID,
    parent_name VARCHAR(255),
    parent_area_type VARCHAR(50),
    parent_floor_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        la.name,
        h.area_type,
        h.floor_level
    FROM storyart_location_hierarchy h
    JOIN location_arcs la ON h.location_arc_id = la.id
    WHERE h.id = (
        SELECT parent_location_id FROM storyart_location_hierarchy 
        WHERE location_arc_id = child_location_arc_id
    )
    AND h.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_storyart_hierarchy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_storyart_hierarchy_updated_at
    BEFORE UPDATE ON storyart_location_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION update_storyart_hierarchy_updated_at();

-- Insert initial data for NHIA Facility 7 hierarchy
-- First, get the NHIA Facility 7 location_arc_id
DO $$
DECLARE
    nhia_facility_id UUID;
    nhia_hierarchy_id UUID;
BEGIN
    -- Get NHIA Facility 7 location_arc_id
    SELECT id INTO nhia_facility_id 
    FROM location_arcs 
    WHERE name = 'NHIA Facility 7' 
    AND story_id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'::uuid;
    
    IF nhia_facility_id IS NOT NULL THEN
        -- Insert root NHIA Facility 7 hierarchy entry
        INSERT INTO storyart_location_hierarchy (
            location_arc_id, 
            story_id, 
            floor_level, 
            area_type, 
            access_method,
            visual_description,
            atmosphere_description,
            lighting_description
        ) VALUES (
            nhia_facility_id,
            '59f64b1e-726a-439d-a6bc-0dfefcababdb'::uuid,
            0,
            'building',
            'main entrance',
            'CDC archive and data center, post-downfall destruction',
            'Eerie silence, dust-filled air, emergency lighting creating long shadows',
            'Flickering emergency lights, harsh fluorescent glow'
        ) RETURNING id INTO nhia_hierarchy_id;
        
        -- Insert child locations
        INSERT INTO storyart_location_hierarchy (
            parent_location_id,
            location_arc_id, 
            story_id, 
            floor_level, 
            area_type, 
            access_method,
            visual_description,
            atmosphere_description,
            lighting_description
        ) VALUES 
        -- Reception Area
        (
            nhia_hierarchy_id,
            nhia_facility_id,
            '59f64b1e-726a-439d-a6bc-0dfefcababdb'::uuid,
            0,
            'reception',
            'main entrance',
            'Destroyed reception area with scattered debris, broken security checkpoint, emergency lighting casting shadows across abandoned visitor logs and shattered glass partitions',
            'Chaos of destruction, abandoned administrative area',
            'Emergency lighting, harsh shadows'
        ),
        -- Corridors
        (
            nhia_hierarchy_id,
            nhia_facility_id,
            '59f64b1e-726a-439d-a6bc-0dfefcababdb'::uuid,
            0,
            'corridor',
            'from reception',
            'Long sterile corridors with emergency lights casting dancing shadows, abandoned computer terminals, scattered debris from the explosion',
            'Sterile, clinical atmosphere mixed with destruction',
            'Emergency lighting creating dancing shadows'
        ),
        -- Data Vault
        (
            nhia_hierarchy_id,
            nhia_facility_id,
            '59f64b1e-726a-439d-a6bc-0dfefcababdb'::uuid,
            -1,
            'vault',
            'reinforced door (go deeper)',
            'Underground data vault accessed through reinforced door, containing rows of shattered containment pods, abandoned lab equipment, reinforced concrete walls, emergency lighting creating long shadows',
            'Secure, clinical environment with destruction overlay',
            'Emergency lighting creating long shadows'
        );
        
        -- Get the vault hierarchy ID for the server room
        DECLARE
            vault_hierarchy_id UUID;
        BEGIN
            SELECT id INTO vault_hierarchy_id 
            FROM storyart_location_hierarchy 
            WHERE parent_location_id = nhia_hierarchy_id 
            AND area_type = 'vault';
            
            -- Insert Server Room as child of vault
            INSERT INTO storyart_location_hierarchy (
                parent_location_id,
                location_arc_id, 
                story_id, 
                floor_level, 
                area_type, 
                access_method,
                visual_description,
                atmosphere_description,
                lighting_description
            ) VALUES (
                vault_hierarchy_id,
                nhia_facility_id,
                '59f64b1e-726a-439d-a6bc-0dfefcababdb'::uuid,
                -1,
                'server_room',
                'inside vault',
                'Server room revealed within vault, rows of server racks with blinking status lights, emergency backup systems, clinical white walls with biohazard warnings',
                'High-tech, secure environment with clinical precision',
                'Server status lights, emergency backup lighting'
            );
        END;
        
        RAISE NOTICE 'Successfully created NHIA Facility 7 hierarchy with ID: %', nhia_hierarchy_id;
    ELSE
        RAISE NOTICE 'NHIA Facility 7 not found in location_arcs';
    END IF;
END $$;

-- Create a rollback script (commented out for safety)
/*
-- ROLLBACK SCRIPT - Uncomment to rollback changes
DROP VIEW IF EXISTS storyart_location_hierarchy_view;
DROP FUNCTION IF EXISTS get_child_locations(UUID);
DROP FUNCTION IF EXISTS get_parent_location(UUID);
DROP FUNCTION IF EXISTS update_storyart_hierarchy_updated_at();
DROP TRIGGER IF EXISTS trigger_update_storyart_hierarchy_updated_at ON storyart_location_hierarchy;
DROP TABLE IF EXISTS storyart_location_hierarchy;
*/
