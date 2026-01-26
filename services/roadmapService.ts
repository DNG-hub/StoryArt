// services/roadmapService.ts
// Simplified roadmap service - character appearances come from Episode Context JSON
// No phantom location mappings - the Episode Context contains all location-specific data

import {
  DatabaseLocationData,
  DatabaseCharacterLocationData
} from '../types';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Load environment variables in Node.js environment
if (!isBrowser) {
  try {
    dotenv.config();
  } catch (error) {
    console.warn('Failed to load dotenv config in roadmapService');
  }
}

// Database connection configuration (same as databaseContextService)
let DATABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATABASE_URL) ||
                   process.env.VITE_DATABASE_URL ||
                   process.env.DATABASE_URL ||
                   'postgresql://username:password@localhost:5432/storyteller_dev';
DATABASE_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://');

// Database connection pool - only create in Node.js environment
let pool: any = null;
if (!isBrowser && Pool) {
  try {
    pool = new Pool({ connectionString: DATABASE_URL });
  } catch (error) {
    console.warn('Failed to create database pool in roadmapService:', error);
  }
}

// Interface for roadmap scene data
export interface RoadmapSceneData {
  scene_id: string;
  episode_number: number;
  scene_number: number;
  location_name: string;
  location_type: string;
  // Extended fields from database
  scene_title?: string;
  scene_summary?: string;
  characters_present?: string[];
  mood?: string;
  time_of_day?: string;
  pacing?: string;
}

// Interface for location resolution result
export interface LocationResolutionResult {
  originalLocation: string;
  resolvedLocation: string;
  characterAppearances: DatabaseCharacterLocationData[];
  locationData: DatabaseLocationData | null;
}

// Cache for roadmap data
const roadmapCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: RoadmapSceneData[];
  timestamp: number;
}

function getCachedData(key: string): RoadmapSceneData[] | null {
  const entry = roadmapCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  roadmapCache.delete(key);
  return null;
}

function setCachedData(key: string, data: RoadmapSceneData[]): void {
  roadmapCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Normalize location name by stripping common prefixes like "General Location - "
 * This allows matching roadmap locations to location_arcs entries
 */
function normalizeLocationName(locationName: string | null): string {
  if (!locationName) return 'Unknown Location';

  // Strip "General Location - " prefix if present
  const normalized = locationName.replace(/^General Location\s*-\s*/i, '');
  return normalized.trim() || 'Unknown Location';
}

/**
 * Query the actual roadmap_scenes table from the database
 */
async function getRoadmapScenesData(storyId: string, episodeNumber: number): Promise<RoadmapSceneData[]> {
  const cacheKey = `roadmap_${storyId}_${episodeNumber}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  // If in browser or no pool, return empty array with warning
  if (isBrowser || !pool) {
    console.warn('getRoadmapScenesData: Cannot query database in browser environment');
    return [];
  }

  try {
    console.log(`Querying roadmap_scenes for story ${storyId}, episode ${episodeNumber}`);

    // Query roadmap_scenes joined with roadmap_episodes and roadmaps
    const query = `
      SELECT
        rs.id as scene_id,
        re.episode_number,
        rs.scene_number,
        rs.scene_title,
        rs.scene_summary,
        rs.location_name,
        rs.locations,
        rs.characters_present,
        rs.mood,
        rs.time_of_day,
        rs.pacing
      FROM roadmap_scenes rs
      JOIN roadmap_episodes re ON rs.episode_id = re.id
      JOIN roadmaps r ON re.roadmap_id = r.id
      WHERE r.story_id = $1 AND re.episode_number = $2
      ORDER BY rs.scene_number
    `;

    const result = await pool.query(query, [storyId, episodeNumber]);

    if (result.rows.length === 0) {
      console.warn(`No roadmap scenes found for story ${storyId}, episode ${episodeNumber}`);
      return [];
    }

    // Transform database rows to RoadmapSceneData format
    const roadmapData: RoadmapSceneData[] = result.rows.map((row: any) => {
      const locationName = row.location_name || (row.locations && row.locations[0]) || 'Unknown Location';
      const normalizedLocation = normalizeLocationName(locationName);

      return {
        scene_id: row.scene_id,
        episode_number: row.episode_number,
        scene_number: row.scene_number,
        location_name: normalizedLocation,
        location_type: locationName.startsWith('General Location') ? 'GENERAL' : 'SPECIFIC',
        // Extended fields
        scene_title: row.scene_title,
        scene_summary: row.scene_summary,
        characters_present: row.characters_present || [],
        mood: row.mood,
        time_of_day: row.time_of_day,
        pacing: row.pacing
      };
    });

    console.log(`Found ${roadmapData.length} roadmap scenes for episode ${episodeNumber}`);
    roadmapData.forEach(scene => {
      console.log(`  Scene ${scene.scene_number}: ${scene.location_name}`);
    });

    setCachedData(cacheKey, roadmapData);
    return roadmapData;

  } catch (error) {
    console.error('Failed to query roadmap_scenes:', error);
    // Return empty array on error - allows graceful degradation
    return [];
  }
}

/**
 * Resolve location for a specific scene
 * Character appearances are matched by the actual location name from the database
 */
export async function resolveSceneLocation(
  storyId: string,
  episodeNumber: number,
  sceneNumber: number,
  locationData: DatabaseLocationData[],
  characterLocationData: DatabaseCharacterLocationData[]
): Promise<LocationResolutionResult> {
  try {
    // Get roadmap data for the episode
    const roadmapScenes = await getRoadmapScenesData(storyId, episodeNumber);

    // Find the specific scene in roadmap
    const roadmapScene = roadmapScenes.find(scene =>
      scene.episode_number === episodeNumber && scene.scene_number === sceneNumber
    );

    if (!roadmapScene) {
      console.warn(`No roadmap data found for episode ${episodeNumber}, scene ${sceneNumber}`);
      return {
        originalLocation: 'Unknown Location',
        resolvedLocation: 'Unknown Location',
        characterAppearances: [],
        locationData: null
      };
    }

    // Find matching location data with flexible matching
    const locationInfo = findMatchingLocation(roadmapScene.location_name, locationData);

    // Find character appearances for this location (direct match by location name)
    const characterAppearances = characterLocationData.filter(charLoc => {
      const charLocNormalized = normalizeLocationName(charLoc.location_name);
      return charLocNormalized === roadmapScene.location_name ||
             charLoc.location_name === roadmapScene.location_name;
    });

    console.log(`Scene ${sceneNumber} at "${roadmapScene.location_name}": found ${characterAppearances.length} character appearance(s)`);

    return {
      originalLocation: roadmapScene.location_name,
      resolvedLocation: roadmapScene.location_name,
      characterAppearances,
      locationData: locationInfo || null
    };

  } catch (error) {
    console.error('Failed to resolve scene location:', error);
    throw error;
  }
}

/**
 * Find matching location in location_arcs data with flexible matching
 * Handles cases where roadmap uses slightly different names than location_arcs
 */
function findMatchingLocation(
  locationName: string,
  locationData: DatabaseLocationData[]
): DatabaseLocationData | null {
  // Try exact match first
  let match = locationData.find(loc => loc.name === locationName);
  if (match) return match;

  // Try case-insensitive match
  const lowerName = locationName.toLowerCase();
  match = locationData.find(loc => loc.name.toLowerCase() === lowerName);
  if (match) return match;

  // Try partial match (location_arc name contains roadmap location name or vice versa)
  match = locationData.find(loc =>
    loc.name.toLowerCase().includes(lowerName) ||
    lowerName.includes(loc.name.toLowerCase())
  );
  if (match) {
    console.log(`Partial location match: "${locationName}" -> "${match.name}"`);
    return match;
  }

  // Try matching with common variations
  const variations = [
    locationName.replace(/\s+/g, ' '),  // Normalize spaces
    locationName.replace(/clinic/i, 'Medical Clinic'),
    locationName.replace(/Medical Clinic/i, 'Clinic'),
  ];

  for (const variation of variations) {
    match = locationData.find(loc =>
      loc.name.toLowerCase() === variation.toLowerCase()
    );
    if (match) {
      console.log(`Variation match: "${locationName}" -> "${match.name}"`);
      return match;
    }
  }

  console.warn(`No location match found for: "${locationName}"`);
  return null;
}

// Get all roadmap scenes for an episode
export async function getEpisodeRoadmapScenes(
  storyId: string,
  episodeNumber: number
): Promise<RoadmapSceneData[]> {
  return await getRoadmapScenesData(storyId, episodeNumber);
}

// Generate location-specific prompt fragments from location data
export function generateLocationPromptFragments(
  locationData: DatabaseLocationData | null
): string[] {
  if (!locationData) {
    return [];
  }

  const fragments: string[] = [];

  // Add visual description
  if (locationData.visual_description) {
    fragments.push(locationData.visual_description);
  }

  // Add atmosphere
  if (locationData.atmosphere) {
    fragments.push(locationData.atmosphere);
  }

  // Add geographical context
  if (locationData.geographical_location) {
    fragments.push(`location: ${locationData.geographical_location}`);
  }

  return fragments;
}

// Clear roadmap cache
export function clearRoadmapCache(): void {
  roadmapCache.clear();
}
