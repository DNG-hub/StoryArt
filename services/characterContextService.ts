/**
 * Character Context Service
 *
 * Retrieves character-specific appearance overrides from the database for prompt enhancement.
 * Provides location-specific character appearance details.
 *
 * Phase A - Episode Context Enhancement
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL,
});

// Types
export interface CharacterLocationOverride {
  character_name: string;
  location_name: string;
  temporal_context: string;
  age_at_context: number;
  physical_description: string;
  clothing_description: string;
  hair_description: string;
  demeanor_description: string;
  swarmui_prompt_override: string;
  lora_weight_adjustment: number;
  found: boolean;
}

export interface CharacterContext {
  character_name: string;
  overrides: CharacterLocationOverride[];
  found: boolean; // Whether character was found in database
}

/**
 * Get character appearance override for specific location
 *
 * @param storyId - The story UUID
 * @param characterName - The name of the character
 * @param locationName - The name of the location
 * @returns CharacterLocationOverride object with appearance details
 */
export async function getCharacterLocationOverride(
  storyId: string,
  characterName: string,
  locationName: string
): Promise<CharacterLocationOverride> {
  try {
    // Query character location context
    const result = await pool.query(`
      SELECT
        c.name as character_name,
        loc.name as location_name,
        clc.temporal_context,
        clc.age_at_context,
        clc.physical_description,
        clc.clothing_description,
        clc.hair_description,
        clc.demeanor_description,
        clc.swarmui_prompt_override,
        clc.lora_weight_adjustment
      FROM character_location_contexts clc
      JOIN characters c ON clc.character_id = c.id
      JOIN location_arcs loc ON clc.location_arc_id = loc.id
      WHERE c.story_id = $1
        AND c.name = $2
        AND loc.name = $3
      LIMIT 1
    `, [storyId, characterName, locationName]);

    // Override not found - return empty context
    if (result.rows.length === 0) {
      console.warn(`Character location override not found: "${characterName}" at "${locationName}"`);
      return {
        character_name: characterName,
        location_name: locationName,
        temporal_context: '',
        age_at_context: 0,
        physical_description: '',
        clothing_description: '',
        hair_description: '',
        demeanor_description: '',
        swarmui_prompt_override: '',
        lora_weight_adjustment: 1.0,
        found: false
      };
    }

    const override = result.rows[0];

    return {
      character_name: override.character_name,
      location_name: override.location_name,
      temporal_context: override.temporal_context || '',
      age_at_context: override.age_at_context || 0,
      physical_description: override.physical_description || '',
      clothing_description: override.clothing_description || '',
      hair_description: override.hair_description || '',
      demeanor_description: override.demeanor_description || '',
      swarmui_prompt_override: override.swarmui_prompt_override || '',
      lora_weight_adjustment: override.lora_weight_adjustment || 1.0,
      found: true
    };

  } catch (error) {
    console.error(`Error fetching character override for "${characterName}" at "${locationName}":`, error);

    // Return empty context on error (graceful degradation)
    return {
      character_name: characterName,
      location_name: locationName,
      temporal_context: '',
      age_at_context: 0,
      physical_description: '',
      clothing_description: '',
      hair_description: '',
      demeanor_description: '',
      swarmui_prompt_override: '',
      lora_weight_adjustment: 1.0,
      found: false
    };
  }
}

/**
 * Get all character overrides for a specific location
 *
 * @param storyId - The story UUID
 * @param locationName - The name of the location
 * @returns Array of CharacterLocationOverride objects
 */
export async function getCharacterOverridesForLocation(
  storyId: string,
  locationName: string
): Promise<CharacterLocationOverride[]> {
  try {
    const result = await pool.query(`
      SELECT
        c.name as character_name,
        loc.name as location_name,
        clc.temporal_context,
        clc.age_at_context,
        clc.physical_description,
        clc.clothing_description,
        clc.hair_description,
        clc.demeanor_description,
        clc.swarmui_prompt_override,
        clc.lora_weight_adjustment
      FROM character_location_contexts clc
      JOIN characters c ON clc.character_id = c.id
      JOIN location_arcs loc ON clc.location_arc_id = loc.id
      WHERE c.story_id = $1 AND loc.name = $2
      ORDER BY c.name
    `, [storyId, locationName]);

    return result.rows.map(row => ({
      character_name: row.character_name,
      location_name: row.location_name,
      temporal_context: row.temporal_context || '',
      age_at_context: row.age_at_context || 0,
      physical_description: row.physical_description || '',
      clothing_description: row.clothing_description || '',
      hair_description: row.hair_description || '',
      demeanor_description: row.demeanor_description || '',
      swarmui_prompt_override: row.swarmui_prompt_override || '',
      lora_weight_adjustment: row.lora_weight_adjustment || 1.0,
      found: true
    }));

  } catch (error) {
    console.error(`Error fetching character overrides for location "${locationName}":`, error);
    return [];
  }
}

/**
 * Generate character appearance fragment for prompt
 *
 * Uses swarmui_prompt_override if available, otherwise builds from individual fields.
 *
 * @param override - The character location override
 * @param options - Optional configuration
 * @returns Formatted character appearance string
 */
export function generateCharacterAppearanceFragment(
  override: CharacterLocationOverride,
  options: {
    useOverride?: boolean; // Use swarmui_prompt_override if available
    includePhysical?: boolean;
    includeClothing?: boolean;
    includeHair?: boolean;
    includeDemeanor?: boolean;
  } = {}
): string {
  const {
    useOverride = true,
    includePhysical = true,
    includeClothing = true,
    includeHair = true,
    includeDemeanor = true
  } = options;

  // Use swarmui_prompt_override if available and requested
  if (useOverride && override.swarmui_prompt_override && override.swarmui_prompt_override.trim().length > 0) {
    return override.swarmui_prompt_override;
  }

  // Build from individual fields
  const fragments: string[] = [];

  if (includePhysical && override.physical_description) {
    fragments.push(override.physical_description);
  }

  if (includeClothing && override.clothing_description) {
    fragments.push(override.clothing_description);
  }

  if (includeHair && override.hair_description) {
    fragments.push(override.hair_description);
  }

  if (includeDemeanor && override.demeanor_description) {
    fragments.push(override.demeanor_description);
  }

  return fragments.join(', ');
}

/**
 * Check if character override has sufficient data for enhancement
 *
 * @param override - The character override to check
 * @returns true if override has useful data for prompts
 */
export function hasCharacterOverrideData(override: CharacterLocationOverride): boolean {
  return (
    override.found &&
    (
      (override.swarmui_prompt_override && override.swarmui_prompt_override.length >= 50) ||
      (override.physical_description && override.physical_description.length > 0) ||
      (override.clothing_description && override.clothing_description.length > 0)
    )
  );
}

/**
 * Close database connection pool
 * Should be called when shutting down the application
 */
export async function closeCharacterContextPool(): Promise<void> {
  await pool.end();
}
