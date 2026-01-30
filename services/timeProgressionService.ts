/**
 * Time Progression Service
 *
 * Handles time of day tracking across episodes and scenes.
 *
 * Features:
 * - Reads explicit time_of_day from scene metadata (database)
 * - Infers time from scene descriptions when not specified
 * - Handles time jumps ("THREE DAYS LATER", "THE NEXT MORNING")
 * - Maintains continuity for contiguous scenes
 * - Progresses time naturally when no explicit markers
 *
 * @see SKILL.md Section 13.2
 */

import type { TimeOfDay } from './fluxVocabularyService';

// ============================================================================
// TIME MARKERS - Explicit time references in scene descriptions
// ============================================================================

interface TimeMarker {
  patterns: RegExp[];
  timeOfDay: TimeOfDay;
  isJump: boolean; // True if this represents a time skip
  jumpDescription?: string;
}

const TIME_MARKERS: TimeMarker[] = [
  // Dawn/Morning markers
  {
    patterns: [/\bpre-?dawn\b/i, /\bbefore dawn\b/i, /\bearly morning\b/i, /\bfirst light\b/i],
    timeOfDay: 'pre_dawn',
    isJump: false
  },
  {
    patterns: [/\bmorning\b/i, /\bsunrise\b/i, /\bbreakfast\b/i, /\bwakes? up\b/i],
    timeOfDay: 'morning',
    isJump: false
  },
  {
    patterns: [/\bnext morning\b/i, /\bthe following morning\b/i],
    timeOfDay: 'morning',
    isJump: true,
    jumpDescription: 'Next morning'
  },

  // Day markers
  {
    patterns: [/\bmidday\b/i, /\bnoon\b/i, /\blunch\b/i, /\bmid-?afternoon\b/i],
    timeOfDay: 'midday',
    isJump: false
  },
  {
    patterns: [/\bgolden hour\b/i, /\blate afternoon\b/i, /\bsunset\b/i],
    timeOfDay: 'golden_hour',
    isJump: false
  },

  // Evening/Night markers
  {
    patterns: [/\bdusk\b/i, /\btwilight\b/i, /\bevening\b/i, /\bsun sets?\b/i],
    timeOfDay: 'dusk',
    isJump: false
  },
  {
    patterns: [/\bearly night\b/i, /\bjust after dark\b/i, /\bnight falls?\b/i],
    timeOfDay: 'early_night',
    isJump: false
  },
  {
    patterns: [/\bnight\b/i, /\bmidnight\b/i, /\bdark\b/i, /\bafter dark\b/i],
    timeOfDay: 'night_interior',
    isJump: false
  },
  {
    patterns: [/\bdeep night\b/i, /\blate night\b/i, /\bsmall hours\b/i, /\b[23] ?a\.?m\.?\b/i],
    timeOfDay: 'deep_night',
    isJump: false
  },
  {
    patterns: [/\bthat night\b/i, /\blater that night\b/i],
    timeOfDay: 'night_interior',
    isJump: true,
    jumpDescription: 'Later that night'
  },

  // Time skip markers (days)
  {
    patterns: [/\bnext day\b/i, /\bthe following day\b/i, /\bthe next day\b/i],
    timeOfDay: 'morning',
    isJump: true,
    jumpDescription: 'Next day'
  },
  {
    patterns: [/\btwo days later\b/i, /\b2 days later\b/i],
    timeOfDay: 'morning',
    isJump: true,
    jumpDescription: 'Two days later'
  },
  {
    patterns: [/\bthree days later\b/i, /\b3 days later\b/i, /\bdays later\b/i],
    timeOfDay: 'morning',
    isJump: true,
    jumpDescription: 'Days later'
  },
  {
    patterns: [/\ba week later\b/i, /\bone week later\b/i],
    timeOfDay: 'morning',
    isJump: true,
    jumpDescription: 'A week later'
  },

  // Continuity markers
  {
    patterns: [/\bmoments? later\b/i, /\bseconds? later\b/i, /\bimmediately\b/i, /\bcontinued\b/i],
    timeOfDay: 'night_interior', // Will be overridden by previous scene
    isJump: false
  },
  {
    patterns: [/\bhours? later\b/i, /\bsome time later\b/i],
    timeOfDay: 'night_interior', // Progresses from previous
    isJump: true,
    jumpDescription: 'Hours later'
  },
];

// ============================================================================
// NATURAL TIME PROGRESSION
// ============================================================================

/**
 * Natural progression order for time of day.
 * Used when scenes are contiguous and no explicit time marker.
 */
const TIME_PROGRESSION_ORDER: TimeOfDay[] = [
  'pre_dawn',
  'morning',
  'midday',
  'golden_hour',
  'dusk',
  'early_night',
  'night_interior',
  'night_exterior',
  'deep_night',
  'deep_night_interior',
  'deep_night_exterior',
];

/**
 * Get the next natural time progression.
 * For interior/exterior variants, stays within the same time period.
 */
export function getNextTimeProgression(currentTime: TimeOfDay): TimeOfDay {
  // Handle interior/exterior variants
  const baseTime = currentTime.replace('_interior', '').replace('_exterior', '') as string;

  const currentIndex = TIME_PROGRESSION_ORDER.findIndex(t =>
    t === currentTime || t.startsWith(baseTime)
  );

  if (currentIndex === -1 || currentIndex >= TIME_PROGRESSION_ORDER.length - 1) {
    // At deep night - stay there or wrap to pre_dawn for new day
    return 'deep_night';
  }

  // Special progressions
  if (currentTime === 'early_night') {
    return 'night_interior'; // Can progress to regular night
  }
  if (currentTime === 'night_interior' || currentTime === 'night_exterior') {
    return 'deep_night'; // Progress to deep night
  }

  return TIME_PROGRESSION_ORDER[currentIndex + 1];
}

/**
 * Determine if scene is interior or exterior from description.
 */
export function inferInteriorExterior(sceneDescription: string): 'interior' | 'exterior' | null {
  const desc = sceneDescription.toLowerCase();

  // Explicit markers
  if (desc.includes('int.') || desc.includes('interior')) return 'interior';
  if (desc.includes('ext.') || desc.includes('exterior')) return 'exterior';

  // Location hints
  const interiorHints = ['inside', 'room', 'office', 'lab', 'building', 'facility', 'center', 'clinic interior'];
  const exteriorHints = ['outside', 'street', 'road', 'field', 'sky', 'forest', 'grounds', 'approach'];

  for (const hint of interiorHints) {
    if (desc.includes(hint)) return 'interior';
  }
  for (const hint of exteriorHints) {
    if (desc.includes(hint)) return 'exterior';
  }

  return null;
}

/**
 * Apply interior/exterior variant to a base time of day.
 */
export function applyInteriorExterior(
  baseTime: TimeOfDay,
  interiorExterior: 'interior' | 'exterior' | null
): TimeOfDay {
  if (!interiorExterior) return baseTime;

  // Only apply to night times
  if (baseTime === 'night_interior' || baseTime === 'night_exterior') {
    return `night_${interiorExterior}` as TimeOfDay;
  }
  if (baseTime === 'deep_night' || baseTime === 'deep_night_interior' || baseTime === 'deep_night_exterior') {
    return `deep_night_${interiorExterior}` as TimeOfDay;
  }

  return baseTime;
}

// ============================================================================
// MAIN TIME DETECTION
// ============================================================================

export interface TimeDetectionResult {
  timeOfDay: TimeOfDay;
  source: 'explicit' | 'inferred' | 'continued' | 'progressed';
  isTimeJump: boolean;
  jumpDescription?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect time of day for a scene.
 *
 * Priority:
 * 1. Explicit time_of_day from metadata (database)
 * 2. Time markers in scene description
 * 3. Continuity from previous scene
 * 4. Natural progression from previous scene
 *
 * @param sceneDescription - Scene summary or beat_script_text
 * @param explicitTimeOfDay - time_of_day from database/metadata (if available)
 * @param previousTimeOfDay - Time of day from previous scene (for continuity)
 * @param isContiguous - True if scene follows immediately from previous
 */
export function detectTimeOfDay(
  sceneDescription: string,
  explicitTimeOfDay?: string | null,
  previousTimeOfDay?: TimeOfDay | null,
  isContiguous: boolean = true
): TimeDetectionResult {
  // 1. Check explicit time from metadata
  if (explicitTimeOfDay) {
    const normalized = explicitTimeOfDay.toLowerCase().replace(/\s+/g, '_') as TimeOfDay;
    if (TIME_PROGRESSION_ORDER.includes(normalized) ||
        normalized.includes('night') || normalized.includes('dawn')) {
      return {
        timeOfDay: normalized,
        source: 'explicit',
        isTimeJump: false,
        confidence: 'high'
      };
    }
  }

  // 2. Check for explicit continuity markers FIRST (before general time markers)
  // These indicate the scene continues directly from the previous one
  if (previousTimeOfDay) {
    if (/opens?\s+(moments?|immediately|right|directly)\s+after/i.test(sceneDescription) ||
        /moments?\s+after\s+(the\s+)?last/i.test(sceneDescription) ||
        /continued?\s+from/i.test(sceneDescription) ||
        /\bcontinuous\b/i.test(sceneDescription) ||
        /picks?\s+up\s+(right\s+)?where/i.test(sceneDescription)) {
      const intExt = inferInteriorExterior(sceneDescription);
      return {
        timeOfDay: applyInteriorExterior(previousTimeOfDay, intExt),
        source: 'continued',
        isTimeJump: false,
        confidence: 'high'
      };
    }
  }

  // 3. Check for time markers in description
  // Sort markers so more specific patterns (like "deep night") are checked before general ("night")
  const sortedMarkers = [...TIME_MARKERS].sort((a, b) => {
    // Prioritize patterns with "deep" or specific time jumps
    const aHasDeep = a.patterns.some(p => p.source.includes('deep'));
    const bHasDeep = b.patterns.some(p => p.source.includes('deep'));
    if (aHasDeep && !bHasDeep) return -1;
    if (bHasDeep && !aHasDeep) return 1;
    // Prioritize time jumps
    if (a.isJump && !b.isJump) return -1;
    if (b.isJump && !a.isJump) return 1;
    return 0;
  });

  for (const marker of sortedMarkers) {
    for (const pattern of marker.patterns) {
      if (pattern.test(sceneDescription)) {
        let timeOfDay = marker.timeOfDay;

        // Apply interior/exterior based on description
        const intExt = inferInteriorExterior(sceneDescription);
        timeOfDay = applyInteriorExterior(timeOfDay, intExt);

        // For "moments later" type markers, use previous time
        if (marker.patterns.some(p => p.toString().includes('moments') || p.toString().includes('continued'))) {
          if (previousTimeOfDay) {
            timeOfDay = previousTimeOfDay;
          }
        }

        return {
          timeOfDay,
          source: 'inferred',
          isTimeJump: marker.isJump,
          jumpDescription: marker.jumpDescription,
          confidence: 'high'
        };
      }
    }
  }

  // 4. Natural progression from previous scene (no explicit markers found)
  if (previousTimeOfDay && isContiguous) {
    // Natural progression for scene transitions within same episode
    const intExt = inferInteriorExterior(sceneDescription);
    const progressedTime = getNextTimeProgression(previousTimeOfDay);
    return {
      timeOfDay: applyInteriorExterior(progressedTime, intExt),
      source: 'progressed',
      isTimeJump: false,
      confidence: 'medium'
    };
  }

  // 5. Default fallback
  const intExt = inferInteriorExterior(sceneDescription);
  return {
    timeOfDay: intExt === 'exterior' ? 'night_exterior' : 'night_interior',
    source: 'inferred',
    isTimeJump: false,
    confidence: 'low'
  };
}

// ============================================================================
// EPISODE TIME TRACKING
// ============================================================================

export interface SceneTimeContext {
  sceneNumber: number;
  sceneTitle: string;
  timeOfDay: TimeOfDay;
  source: TimeDetectionResult['source'];
  isTimeJump: boolean;
  jumpDescription?: string;
}

/**
 * Process all scenes in an episode to determine time progression.
 *
 * @param scenes - Array of scene data with descriptions
 * @param previousEpisodeEndTime - Time of day at end of previous episode (for continuity)
 */
export function processEpisodeTimeProgression(
  scenes: Array<{
    sceneNumber: number;
    title: string;
    description: string;
    explicitTimeOfDay?: string | null;
  }>,
  previousEpisodeEndTime?: TimeOfDay | null
): SceneTimeContext[] {
  const results: SceneTimeContext[] = [];
  let previousTime: TimeOfDay | null = previousEpisodeEndTime || null;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const isFirstScene = i === 0;
    const isContiguous = !isFirstScene; // Assume contiguous within episode unless jump detected

    const detection = detectTimeOfDay(
      scene.description,
      scene.explicitTimeOfDay,
      previousTime,
      isContiguous
    );

    results.push({
      sceneNumber: scene.sceneNumber,
      sceneTitle: scene.title,
      timeOfDay: detection.timeOfDay,
      source: detection.source,
      isTimeJump: detection.isTimeJump,
      jumpDescription: detection.jumpDescription,
    });

    previousTime = detection.timeOfDay;
  }

  return results;
}

/**
 * Get the ending time of an episode (for continuity to next episode).
 */
export function getEpisodeEndTime(sceneTimeContexts: SceneTimeContext[]): TimeOfDay | null {
  if (sceneTimeContexts.length === 0) return null;
  return sceneTimeContexts[sceneTimeContexts.length - 1].timeOfDay;
}

console.log('[TimeProgression] Service loaded');
