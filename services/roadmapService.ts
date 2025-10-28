// services/roadmapService.ts
import { 
  DatabaseLocationData, 
  DatabaseCharacterLocationData,
  LocationOverrideMapping 
} from '../types';
import { getLocationOverrideMapping } from './databaseContextService';

// Interface for roadmap scene data
export interface RoadmapSceneData {
  scene_id: string;
  episode_number: number;
  scene_number: number;
  location_name: string;
  location_type: string;
  tactical_override_applied: boolean;
  override_location: string;
}

// Interface for location resolution result
export interface LocationResolutionResult {
  originalLocation: string;
  resolvedLocation: string;
  tacticalOverride: string | null;
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

// Simulate roadmap scenes data for development
// In production, this would query the actual roadmap_scenes table
async function getRoadmapScenesData(storyId: string, episodeNumber: number): Promise<RoadmapSceneData[]> {
  const cacheKey = `roadmap_${storyId}_${episodeNumber}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  // Simulate roadmap data based on the default script locations
  const mockRoadmapData: RoadmapSceneData[] = [
    {
      scene_id: "scene-1",
      episode_number: episodeNumber,
      scene_number: 1,
      location_name: "NHIA Facility 7",
      location_type: "SPECIFIC",
      tactical_override_applied: true,
      override_location: "Atlanta Emergency Zone"
    },
    {
      scene_id: "scene-2", 
      episode_number: episodeNumber,
      scene_number: 2,
      location_name: "NHIA Facility 7",
      location_type: "SPECIFIC",
      tactical_override_applied: true,
      override_location: "Atlanta Emergency Zone"
    },
    {
      scene_id: "scene-3",
      episode_number: episodeNumber,
      scene_number: 3,
      location_name: "Mobile Medical Base",
      location_type: "SPECIFIC",
      tactical_override_applied: false,
      override_location: "Office Professional"
    },
    {
      scene_id: "scene-4",
      episode_number: episodeNumber,
      scene_number: 4,
      location_name: "Mobile Medical Base",
      location_type: "SPECIFIC",
      tactical_override_applied: false,
      override_location: "Office Professional"
    }
  ];

  setCachedData(cacheKey, mockRoadmapData);
  return mockRoadmapData;
}

// Resolve location for a specific scene
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
        tacticalOverride: null,
        characterAppearances: [],
        locationData: null
      };
    }

    // Get location override mapping
    const locationOverrideMapping = getLocationOverrideMapping();
    
    // Determine tactical override
    const tacticalOverride = roadmapScene.tactical_override_applied 
      ? roadmapScene.override_location 
      : locationOverrideMapping[roadmapScene.location_name] || null;

    // Find matching location data
    const locationInfo = locationData.find(loc => 
      loc.name === roadmapScene.location_name || 
      loc.name === tacticalOverride
    );

    // Find character appearances for this location
    const characterAppearances = characterLocationData.filter(charLoc => 
      charLoc.location_name === roadmapScene.location_name ||
      charLoc.location_name === tacticalOverride
    );

    return {
      originalLocation: roadmapScene.location_name,
      resolvedLocation: tacticalOverride || roadmapScene.location_name,
      tacticalOverride,
      characterAppearances,
      locationData: locationInfo || null
    };

  } catch (error) {
    console.error('Failed to resolve scene location:', error);
    throw error;
  }
}

// Get all roadmap scenes for an episode
export async function getEpisodeRoadmapScenes(
  storyId: string,
  episodeNumber: number
): Promise<RoadmapSceneData[]> {
  return await getRoadmapScenesData(storyId, episodeNumber);
}

// Apply tactical overrides to character appearances
export function applyTacticalOverrides(
  characterAppearances: DatabaseCharacterLocationData[],
  tacticalOverride: string | null
): DatabaseCharacterLocationData[] {
  if (!tacticalOverride) {
    return characterAppearances;
  }

  // Apply tactical override to character appearances
  return characterAppearances.map(appearance => ({
    ...appearance,
    location_name: tacticalOverride,
    swarmui_prompt_override: appearance.swarmui_prompt_override.replace(
      appearance.location_name,
      tacticalOverride
    )
  }));
}

// Generate location-specific prompt fragments
export function generateLocationPromptFragments(
  locationData: DatabaseLocationData | null,
  tacticalOverride: string | null
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

  // Add tactical override context
  if (tacticalOverride) {
    fragments.push(`tactical environment: ${tacticalOverride}`);
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
