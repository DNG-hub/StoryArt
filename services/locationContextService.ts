/**
 * Location Context Service
 *
 * Retrieves location-specific context from the database for prompt enhancement.
 * Provides visual descriptions and artifacts for locations.
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
export interface LocationArtifact {
  artifact_name: string;
  artifact_type: string;
  description: string;
  swarmui_prompt_fragment: string;
  always_present: boolean;
  scene_specific: boolean;
}

export interface LocationContext {
  location_name: string;
  location_type: string;
  visual_description: string;
  atmosphere: string;
  key_features: string[];
  artifacts: LocationArtifact[];
  found: boolean; // Whether location was found in database
}

/**
 * Get location context from database
 *
 * @param storyId - The story UUID
 * @param locationName - The name of the location to fetch
 * @returns LocationContext object with visual description and artifacts
 */
export async function getLocationContext(
  storyId: string,
  locationName: string
): Promise<LocationContext> {
  try {
    // Query location data
    const locationResult = await pool.query(`
      SELECT
        id,
        name,
        location_type,
        visual_description,
        atmosphere,
        key_features
      FROM location_arcs
      WHERE story_id = $1 AND name = $2
      LIMIT 1
    `, [storyId, locationName]);

    // Location not found - return empty context
    if (locationResult.rows.length === 0) {
      console.warn(`Location not found in database: "${locationName}"`);
      return {
        location_name: locationName,
        location_type: '',
        visual_description: '',
        atmosphere: '',
        key_features: [],
        artifacts: [],
        found: false
      };
    }

    const location = locationResult.rows[0];

    // Query artifacts for this location
    const artifactsResult = await pool.query(`
      SELECT
        artifact_name,
        artifact_type,
        description,
        swarmui_prompt_fragment,
        always_present,
        scene_specific
      FROM location_artifacts
      WHERE location_arc_id = $1
      ORDER BY always_present DESC, created_at ASC
    `, [location.id]);

    // Build context object
    const context: LocationContext = {
      location_name: location.name,
      location_type: location.location_type || '',
      visual_description: location.visual_description || '',
      atmosphere: location.atmosphere || '',
      key_features: location.key_features || [],
      artifacts: artifactsResult.rows.map(artifact => ({
        artifact_name: artifact.artifact_name,
        artifact_type: artifact.artifact_type,
        description: artifact.description || '',
        swarmui_prompt_fragment: artifact.swarmui_prompt_fragment || '',
        always_present: artifact.always_present || false,
        scene_specific: artifact.scene_specific || false
      })),
      found: true
    };

    return context;

  } catch (error) {
    console.error(`Error fetching location context for "${locationName}":`, error);

    // Return empty context on error (graceful degradation)
    return {
      location_name: locationName,
      location_type: '',
      visual_description: '',
      atmosphere: '',
      key_features: [],
      artifacts: [],
      found: false
    };
  }
}

/**
 * Generate location prompt fragment
 *
 * Combines visual description and artifact details into a prompt fragment
 * suitable for injection into SwarmUI prompts.
 *
 * @param context - The location context from database
 * @param options - Optional configuration
 * @returns Formatted prompt fragment string
 */
export function generateLocationPromptFragment(
  context: LocationContext,
  options: {
    includeArtifacts?: boolean;
    maxArtifacts?: number;
  } = {}
): string {
  const { includeArtifacts = true, maxArtifacts = 3 } = options;

  const fragments: string[] = [];

  // Add visual description if available
  if (context.visual_description && context.visual_description.trim().length > 0) {
    fragments.push(context.visual_description);
  }

  // Add atmosphere if available
  if (context.atmosphere && context.atmosphere.trim().length > 0) {
    fragments.push(`Atmosphere: ${context.atmosphere}`);
  }

  // Add artifacts if requested
  if (includeArtifacts && context.artifacts.length > 0) {
    // Filter artifacts with prompt fragments
    const artifactsWithFragments = context.artifacts
      .filter(a => a.swarmui_prompt_fragment && a.swarmui_prompt_fragment.trim().length > 0)
      .slice(0, maxArtifacts);

    if (artifactsWithFragments.length > 0) {
      const artifactFragments = artifactsWithFragments
        .map(a => a.swarmui_prompt_fragment)
        .join(', ');
      fragments.push(`Notable elements: ${artifactFragments}`);
    }
  }

  // Return combined fragment or empty string
  return fragments.join('. ');
}

/**
 * Check if location has sufficient data for enhancement
 *
 * @param context - The location context to check
 * @returns true if location has useful data for prompts
 */
export function hasLocationData(context: LocationContext): boolean {
  return (
    context.found &&
    (
      (context.visual_description && context.visual_description.length >= 100) ||
      context.artifacts.some(a => a.swarmui_prompt_fragment && a.swarmui_prompt_fragment.length > 0)
    )
  );
}

/**
 * Close database connection pool
 * Should be called when shutting down the application
 */
export async function closeLocationContextPool(): Promise<void> {
  await pool.end();
}
