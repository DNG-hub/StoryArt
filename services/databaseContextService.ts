// services/databaseContextService.ts
// Note: This service uses Node.js-only modules (pg, dotenv)
// In browser environments, these will be stubbed by Vite
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// In browser, these imports will be stubbed by Vite
// Only call dotenv.config() in Node.js environment
if (!isBrowser) {
  try {
    dotenv.config();
  } catch (error) {
    console.warn('Failed to load dotenv config');
  }
}
import {
  DatabaseLocationData,
  DatabaseArtifactData,
  DatabaseCharacterLocationData,
  DatabaseStoryData,
  LocationOverrideMapping,
  EnhancedEpisodeContext,
  CharacterContext,
  SceneContext,
  LocationContext,
  ArtifactContext,
  CharacterLocationContext,
  CharacterAppearance
} from '../types';
import { resolveSceneLocation, applyTacticalOverrides, generateLocationPromptFragments } from './roadmapService';

// Load environment variables before reading DATABASE_URL
dotenv.config();

// Location override mapping for tactical appearances
const locationOverrideMapping: LocationOverrideMapping = {
  // FIELD LOCATIONS - Tactical gear, tactical bun
  "Atlanta Emergency Zone": "Atlanta Emergency Zone",           // Direct match
  "NHIA Facility 7": "Atlanta Emergency Zone",                  // Tactical override
  "Underground Facility Alpha": "Atlanta Emergency Zone",       // Tactical override
  "Military Black Site": "Atlanta Emergency Zone",              // Tactical override
  "Derelict Warehouse": "Atlanta Emergency Zone",               // Tactical override
  "General Location - Dangerous Terrain": "Atlanta Emergency Zone", // Tactical override
  "General Location - Urban Ruins": "Atlanta Emergency Zone",   // Tactical override
  "General Location - Decommissioned Outpost": "Atlanta Emergency Zone", // Tactical override
  
  // OFFICE LOCATIONS - Business casual futuristic
  "OmniGen HQ": "Office Professional",                          // Corporate headquarters
  "Dr. Chen's Enhancement Facility": "Office Professional",     // Corporate lab
  "Archives Level 4": "Office Professional",                   // Corporate archive
  "Medical Lab": "Office Professional",                        // Corporate medical
  "Radiology Wing": "Office Professional",                     // Corporate medical
  "Mobile Medical Base": "Office Professional",                // Corporate mobile
  
  // SAFEHOUSE LOCATIONS - Casual, sexy, relaxed
  "Dan's Safehouse": "Safehouse Casual",                       // Direct match
  "Rumored Safe Haven": "Safehouse Casual",                    // Safe haven
  
  // SPECIAL LOCATIONS - Unique styling
  "Ghost's Digital Lair": "Ghost Digital"                      // Digital/tech environment
};

// Database connection configuration
// Support both Vite (import.meta.env) and Node.js (process.env) environments
// Convert Python-style connection string to pg format
let DATABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATABASE_URL) ||
                   process.env.VITE_DATABASE_URL ||
                   process.env.DATABASE_URL ||
                   'postgresql://username:password@localhost:5432/storyteller_dev';
DATABASE_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://');

const CAT_DANIEL_STORY_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CAT_DANIEL_STORY_ID) ||
                            process.env.VITE_CAT_DANIEL_STORY_ID ||
                            '59f64b1e-726a-439d-a6bc-0dfefcababdb';

// Database connection pool - only create in Node.js environment
// In browser, database operations should use API endpoints
let pool: any = null;
if (!isBrowser && Pool) {
  try {
    pool = new Pool({ connectionString: DATABASE_URL });
  } catch (error) {
    console.warn('Failed to create database pool:', error);
  }
}

// Cache for database queries to improve performance
const cache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

function getCachedData(key: string): any | null {
  const entry = cache.get(key) as CacheEntry;
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Database query functions - now using real PostgreSQL
async function queryDatabase(query: string, params: any[] = []): Promise<any[]> {
  if (isBrowser || !pool) {
    throw new Error('Database queries cannot be executed in browser. Use API endpoints instead.');
  }
  
  try {
    console.log('Database query:', query, params);

    // Execute real PostgreSQL query
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Main database context service functions
export async function getStoryData(storyId: string): Promise<DatabaseStoryData | null> {
  const cacheKey = `story_${storyId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const query = `
    SELECT id, title, story_context, narrative_tone, core_themes 
    FROM stories 
    WHERE id = $1
  `;
  
  const results = await queryDatabase(query, [storyId]);
  const storyData = results.length > 0 ? results[0] : null;
  
  if (storyData) {
    setCachedData(cacheKey, storyData);
  }
  
  return storyData;
}

export async function getLocationData(storyId: string): Promise<DatabaseLocationData[]> {
  const cacheKey = `locations_${storyId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const query = `
    SELECT id, name, description, location_type, atmosphere_category, 
           geographical_location, time_period, cultural_context, atmosphere, 
           visual_description, key_features, visual_reference_url, 
           significance_level, notes
    FROM location_arcs 
    WHERE story_id = $1
    ORDER BY created_at
  `;
  
  const results = await queryDatabase(query, [storyId]);
  setCachedData(cacheKey, results);
  
  return results;
}

export async function getArtifactData(storyId: string): Promise<DatabaseArtifactData[]> {
  const cacheKey = `artifacts_${storyId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const query = `
    SELECT la.id, la.artifact_name, la.artifact_type, la.description, 
           la.always_present, la.scene_specific, la.swarmui_prompt_fragment, 
           la.location_arc_id
    FROM location_artifacts la
    JOIN location_arcs loc ON la.location_arc_id = loc.id
    WHERE loc.story_id = $1
    ORDER BY la.created_at
  `;
  
  const results = await queryDatabase(query, [storyId]);
  setCachedData(cacheKey, results);
  
  return results;
}

export async function getCharacterLocationData(storyId: string): Promise<DatabaseCharacterLocationData[]> {
  const cacheKey = `character_locations_${storyId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;
  
  const query = `
    SELECT clc.id, clc.character_id, c.name as character_name, 
           clc.location_arc_id, loc.name as location_name,
           clc.temporal_context, clc.age_at_context, clc.physical_description, 
           clc.clothing_description, clc.hair_description, clc.demeanor_description, 
           clc.swarmui_prompt_override, clc.lora_weight_adjustment
    FROM character_location_contexts clc
    JOIN characters c ON clc.character_id = c.id
    JOIN location_arcs loc ON clc.location_arc_id = loc.id
    WHERE c.story_id = $1
    ORDER BY clc.created_at
  `;
  
  const results = await queryDatabase(query, [storyId]);
  setCachedData(cacheKey, results);
  
  return results;
}

// Enhanced episode context generation
export async function generateEnhancedEpisodeContext(
  storyId: string, 
  episodeNumber: number,
  episodeTitle: string,
  episodeSummary: string,
  scenes: any[]
): Promise<EnhancedEpisodeContext> {
  // Browser environment check - database operations not available
  if (isBrowser || !pool) {
    console.warn('generateEnhancedEpisodeContext: Running in browser - returning minimal fallback context');
    // Return minimal fallback context for browser environments
    return {
      episode: {
        episode_number: episodeNumber,
        episode_title: episodeTitle,
        episode_summary: episodeSummary,
        story_context: '',
        narrative_tone: '',
        core_themes: '',
        characters: [],
        scenes: scenes.map(scene => ({
          scene_number: scene.scene_number || 1,
          scene_title: scene.scene_title || 'Scene',
          scene_summary: scene.scene_summary || '',
          roadmap_location: '',
          location: scene.location || {
            id: 'unknown',
            name: 'Unknown Location',
            description: '',
            visual_description: '',
            atmosphere: '',
            atmosphere_category: 'neutral',
            geographical_location: '',
            time_period: '',
            cultural_context: '',
            key_features: '[]',
            visual_reference_url: '',
            significance_level: 'medium',
            artifacts: [],
            tactical_override_location: ''
          },
          character_appearances: []
        }))
      }
    };
  }

  try {
    // Fetch all database data
    const [storyData, locationData, artifactData, characterLocationData] = await Promise.all([
      getStoryData(storyId),
      getLocationData(storyId),
      getArtifactData(storyId),
      getCharacterLocationData(storyId)
    ]);

    if (!storyData) {
      throw new Error(`Story with ID ${storyId} not found`);
    }

    // Group artifacts by location
    const artifactsByLocation = artifactData.reduce((acc, artifact) => {
      if (!acc[artifact.location_arc_id]) {
        acc[artifact.location_arc_id] = [];
      }
      acc[artifact.location_arc_id].push(artifact);
      return acc;
    }, {} as Record<string, DatabaseArtifactData[]>);

    // Group character contexts by location
    const characterContextsByLocation = characterLocationData.reduce((acc, context) => {
      if (!acc[context.location_arc_id]) {
        acc[context.location_arc_id] = [];
      }
      acc[context.location_arc_id].push(context);
      return acc;
    }, {} as Record<string, DatabaseCharacterLocationData[]>);

    // Create enhanced characters with location contexts
    const characters: CharacterContext[] = [];
    const characterMap = new Map<string, CharacterContext>();

    characterLocationData.forEach(context => {
      if (context.character_name && !characterMap.has(context.character_name)) {
        characterMap.set(context.character_name, {
          character_name: context.character_name,
          aliases: context.character_name ? [context.character_name.split(' ')[0]] : [], // Safe alias extraction
          base_trigger: context.character_name && context.character_name.includes('Cat') ? 'JRUMLV woman' : 'HSCEIA man',
          visual_description: context.physical_description,
          location_contexts: []
        });
      }

      if (context.character_name) {
        const character = characterMap.get(context.character_name)!;
        character.location_contexts.push({
          location_name: context.location_name,
          physical_description: context.physical_description,
          clothing_description: context.clothing_description,
          demeanor_description: context.demeanor_description,
          swarmui_prompt_override: context.swarmui_prompt_override,
          temporal_context: context.temporal_context,
          lora_weight_adjustment: context.lora_weight_adjustment
        });
      }
    });

    characters.push(...characterMap.values());

    // Create enhanced scenes with database context and roadmap-driven location resolution
    const enhancedScenes: SceneContext[] = await Promise.all(scenes.map(async (scene, index) => {
      try {
        // Use roadmap service to resolve location
        const locationResolution = await resolveSceneLocation(
          storyId,
          episodeNumber,
          scene.scene_number,
          locationData,
          characterLocationData
        );

        const location = locationResolution.locationData;
        const tacticalOverride = locationResolution.tacticalOverride;

        if (!location) {
          console.warn(`No database location found for scene ${scene.scene_number}`);
          return {
            scene_number: scene.scene_number,
            scene_title: scene.scene_title,
            scene_summary: scene.scene_summary,
            roadmap_location: locationResolution.originalLocation,
            location: {
              id: scene.location?.id || 'unknown',
              name: locationResolution.resolvedLocation,
              description: scene.location?.description || '',
              visual_description: scene.location?.visual_description || '',
              atmosphere: scene.location?.atmosphere || '',
              atmosphere_category: scene.location?.atmosphere_category || '',
              geographical_location: scene.location?.geographical_location || '',
              time_period: scene.location?.time_period || '',
              cultural_context: scene.location?.cultural_context || '',
              key_features: scene.location?.key_features || '',
              visual_reference_url: scene.location?.visual_reference_url || '',
              significance_level: scene.location?.significance_level || '',
              artifacts: scene.location?.artifacts || [],
              tactical_override_location: tacticalOverride || ''
            },
            character_appearances: []
          };
        }

        // Get artifacts for this location
        const locationArtifacts = artifactsByLocation[location.id] || [];
        const artifacts: ArtifactContext[] = locationArtifacts.map(artifact => ({
          artifact_name: artifact.artifact_name,
          artifact_type: artifact.artifact_type,
          description: artifact.description,
          swarmui_prompt_fragment: artifact.swarmui_prompt_fragment,
          always_present: artifact.always_present,
          scene_specific: artifact.scene_specific
        }));

        // Apply tactical overrides to character appearances
        const tacticalCharacterAppearances = applyTacticalOverrides(
          locationResolution.characterAppearances,
          tacticalOverride
        );

        const characterAppearances: CharacterAppearance[] = tacticalCharacterAppearances.map(context => ({
          character_name: context.character_name,
          location_context: {
            location_name: context.location_name,
            physical_description: context.physical_description,
            clothing_description: context.clothing_description,
            demeanor_description: context.demeanor_description,
            swarmui_prompt_override: context.swarmui_prompt_override,
            temporal_context: context.temporal_context,
            lora_weight_adjustment: context.lora_weight_adjustment
          },
          tactical_override_applied: !!tacticalOverride
        }));

        // Generate location-specific prompt fragments
        const locationPromptFragments = generateLocationPromptFragments(location, tacticalOverride);

        return {
          scene_number: scene.scene_number,
          scene_title: scene.scene_title,
          scene_summary: scene.scene_summary,
          roadmap_location: locationResolution.originalLocation,
          location: {
            id: location.id,
            name: locationResolution.resolvedLocation,
            description: location.description,
            visual_description: location.visual_description,
            atmosphere: location.atmosphere,
            atmosphere_category: location.atmosphere_category,
            geographical_location: location.geographical_location,
            time_period: location.time_period,
            cultural_context: location.cultural_context,
            key_features: location.key_features,
            visual_reference_url: location.visual_reference_url,
            significance_level: location.significance_level,
            artifacts,
            tactical_override_location: tacticalOverride || ''
          },
          character_appearances: characterAppearances
        };

      } catch (error) {
        console.error(`Failed to process scene ${scene.scene_number}:`, error);
        // Return fallback scene data
        return {
          scene_number: scene.scene_number,
          scene_title: scene.scene_title,
          scene_summary: scene.scene_summary,
          roadmap_location: scene.location?.name || 'Unknown',
          location: {
            id: scene.location?.id || 'unknown',
            name: scene.location?.name || 'Unknown Location',
            description: scene.location?.description || '',
            visual_description: scene.location?.visual_description || '',
            atmosphere: scene.location?.atmosphere || '',
            atmosphere_category: scene.location?.atmosphere_category || '',
            geographical_location: scene.location?.geographical_location || '',
            time_period: scene.location?.time_period || '',
            cultural_context: scene.location?.cultural_context || '',
            key_features: scene.location?.key_features || '',
            visual_reference_url: scene.location?.visual_reference_url || '',
            significance_level: scene.location?.significance_level || '',
            artifacts: scene.location?.artifacts || [],
            tactical_override_location: ''
          },
          character_appearances: []
        };
      }
    }));

    return {
      episode: {
        episode_number: episodeNumber,
        episode_title: episodeTitle,
        episode_summary: episodeSummary,
        story_context: storyData.story_context,
        narrative_tone: storyData.narrative_tone,
        core_themes: storyData.core_themes,
        characters,
        scenes: enhancedScenes
      }
    };

  } catch (error) {
    console.error('Failed to generate enhanced episode context:', error);
    throw error;
  }
}

// Utility function to get location override mapping
export function getLocationOverrideMapping(): LocationOverrideMapping {
  return locationOverrideMapping;
}

// Utility function to clear cache
export function clearDatabaseCache(): void {
  cache.clear();
}

// Export the story ID constant for use in other services
export { CAT_DANIEL_STORY_ID };

// --- NEW HIERARCHICAL LOCATION CONTEXT SERVICE ---

/**
 * Defines the structure for the hierarchical location data,
 * including the specific features of the location itself and the
 * ambient description from its parent.
 */
export interface HierarchicalLocationInfo {
  ambient_prompt_fragment: string | null;
  defining_visual_features: string[] | null;
}

/**
 * Fetches the hierarchical location context for a given location arc ID.
 * It retrieves the specific defining features for the location and the
 * ambient visual description from its parent location.
 * @param locationArcId The UUID of the location arc to fetch context for.
 * @returns A promise that resolves to a HierarchicalLocationInfo object or null if not found.
 */
export async function getHierarchicalLocationContext(locationArcId: string): Promise<HierarchicalLocationInfo | null> {
  // Browser environment check - database operations not available
  if (isBrowser || !pool) {
    console.warn('getHierarchicalLocationContext: Running in browser - returning null');
    return null;
  }

  const cacheKey = `hierarchical_location_${locationArcId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const query = `
    WITH current_location AS (
      SELECT
        id,
        parent_location_id,
        defining_visual_features
      FROM storyart_location_hierarchy
      WHERE location_arc_id = $1
    )
    SELECT
      parent.ambient_prompt_fragment,
      current.defining_visual_features
    FROM current_location current
    LEFT JOIN storyart_location_hierarchy parent
      ON current.parent_location_id = parent.id;
  `;

  try {
    const results = await queryDatabase(query, [locationArcId]);
    if (results.length === 0) {
      return null;
    }
    
    const data: HierarchicalLocationInfo = {
      ambient_prompt_fragment: results[0].ambient_prompt_fragment,
      defining_visual_features: results[0].defining_visual_features,
    };

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Failed to get hierarchical location context for arc ID ${locationArcId}:`, error);
    return null;
  }
}
