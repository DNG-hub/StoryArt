/**
 * Beat Narrative Processing Service
 * 
 * This service handles the extraction of lighting and other elements from beat narratives
 * based on the LATEST PRODUCTION-STANDARD prompt construction techniques from Episode 1.
 */

export interface LightingKeywords {
  sources: string[];
  qualities: string[];
  colors: string[];
  effects: string[];
  time: string[];
  intensity: string[];
}

export interface BeatNarrativeProcessor {
  extractLightingKeywords(narrativeText: string): LightingKeywords;
  buildFaceLightingFromKeywords(keywords: LightingKeywords): string;
  buildFaceLightingFromBeat(narrativeText: string): string;
  hasLightingDetails(narrativeText: string): boolean;
}

/**
 * Extracts lighting keywords from a beat narrative text using the principle-based approach.
 */
export const extractLightingKeywords = (narrativeText: string): LightingKeywords => {
  const keywords: LightingKeywords = {
    sources: [],
    qualities: [],
    colors: [],
    effects: [],
    time: [],
    intensity: []
  };

  // Define search patterns (expand as needed)
  const patterns = {
    sources: ['generator', 'flash', 'explosion', 'fire', 'searchlight', 'emergency light', 'muzzle flash', 'backup generator'],
    qualities: ['bright', 'subdued', 'dim', 'harsh', 'soft', 'flickering', 'strobing', 'pulsing', 'diffused'],
    colors: ['green', 'orange', 'red', 'blue', 'golden', 'white', 'amber', 'sickly', 'eerie', 'gray', 'grayish'],
    effects: ['gunsmoke', 'smoke', 'dust', 'fog', 'rain', 'haze', 'mist', 'debris', 'particulate', 'atmospheric'],
    time: ['dawn', 'dusk', 'night', 'midday', 'twilight', 'sunset', 'sunrise', 'daylight', 'darkness'],
    intensity: ['barely visible', 'blinding', 'faint', 'intense', 'overwhelming', 'intermittent', 'sudden', 'gradual']
  };

  const textLower = narrativeText.toLowerCase();

  // Extract keywords that appear in narrative
  for (const [category, terms] of Object.entries(patterns)) {
    for (const term of terms) {
      if (textLower.includes(term.toLowerCase()) && !keywords[category as keyof LightingKeywords].includes(term)) {
        (keywords[category as keyof LightingKeywords] as string[]).push(term);
      }
    }
  }

  return keywords;
};

/**
 * Builds face lighting string from extracted keywords
 */
export const buildFaceLightingFromKeywords = (keywords: LightingKeywords): string => {
  if (!hasAnyKeywords(keywords)) {
    return ''; // Return empty string to indicate no lighting details extracted
  }

  const parts = [];

  // Add lighting sources and their effects on face
  if (keywords.sources.length > 0) {
    for (const source of keywords.sources) {
      if (source.includes('flash')) {
        parts.push(`intermittent ${source} on face`);
      } else if (source.includes('explosion')) {
        parts.push(`explosive ${source} illumination on face`);
      } else {
        parts.push(`${source} on face`);
      }
    }
  }

  // Add lighting qualities
  if (keywords.qualities.length > 0) {
    for (const quality of keywords.qualities) {
      if (quality.includes('flicker') || quality.includes('strob')) {
        parts.push(`${quality} lighting effect on features`);
      } else {
        parts.push(`${quality} illumination on features`);
      }
    }
  }

  // Add lighting colors
  if (keywords.colors.length > 0) {
    for (const color of keywords.colors) {
      parts.push(`${color} ${color === 'eerie' ? 'ambient' : 'light'} on face`);
    }
  }

  // Add environmental effects
  if (keywords.effects.length > 0) {
    for (const effect of keywords.effects) {
      if (effect.includes('smoke') || effect.includes('dust') || effect.includes('haze')) {
        parts.push(`subdued by ${effect}`);
      } else {
        parts.push(`${effect} affecting illumination`);
      }
    }
  }

  // Add time-related lighting
  if (keywords.time.length > 0) {
    for (const time of keywords.time) {
      if (time === 'dawn' || time === 'sunrise') {
        parts.push(`soft ${time} glow on features`);
      } else if (time === 'dusk' || time === 'sunset') {
        parts.push(`warm ${time} illumination on face`);
      } else if (time === 'night') {
        parts.push(`low light conditions on face`);
      } else {
        parts.push(`${time} lighting on features`);
      }
    }
  }

  // Add intensity modifiers
  if (keywords.intensity.length > 0) {
    for (const intensity of keywords.intensity) {
      if (intensity.includes('barely')) {
        parts.push(`barely visible illumination`);
      } else if (intensity.includes('blinding')) {
        parts.push(`high contrast lighting`);
      } else {
        parts.push(`${intensity} lighting effect`);
      }
    }
  }

  return parts.join(', ');
};

/**
 * Checks if any lighting keywords were found
 */
export const hasAnyKeywords = (keywords: LightingKeywords): boolean => {
  return Object.values(keywords).some(category => category.length > 0);
};

/**
 * Checks if the beat narrative has any lighting details
 */
export const hasLightingDetails = (narrativeText: string): boolean => {
  const keywords = extractLightingKeywords(narrativeText);
  return hasAnyKeywords(keywords);
};

/**
 * Main export: builds face lighting from the beat narrative, extracting lighting details first
 */
export const buildFaceLightingFromBeat = (narrativeText: string, fallbackLighting?: string): string => {
  const keywords = extractLightingKeywords(narrativeText);
  
  if (hasAnyKeywords(keywords)) {
    return buildFaceLightingFromKeywords(keywords);
  }
  
  // Return fallback if provided, otherwise return empty string
  return fallbackLighting || '';
};

/**
 * Complete processing function that takes beat narrative and returns the appropriate face lighting
 */
export const processBeatNarrativeForLighting = (
  narrativeText: string, 
  locationBasedFallback?: string
): string => {
  // First check if the narrative contains any lighting-related details
  if (hasLightingDetails(narrativeText)) {
    // Extract and build lighting from the beat narrative
    return buildFaceLightingFromBeat(narrativeText);
  } else {
    // Use location-based fallback lighting if provided
    return locationBasedFallback || '';
  }
};

// Example usage:
/*
const beatNarrative = "Daniel advances through heavy gunsmoke, bright muzzle flashes illuminating the haze";
const faceLighting = processBeatNarrativeForLighting(beatNarrative, "dramatic tactical lighting on face");
console.log(faceLighting); // Would extract lighting details from the narrative
*/