/**
 * Scene Context Service
 *
 * Provides scene-level visual context including:
 * - Time of day -> lighting mapping
 * - Scene intensity -> visual treatment
 * - Scene pacing -> framing preferences
 * - Scene role (YouTube 8-4-4-3 format) -> shot selection
 * - Arc phase -> dramatic treatment
 * - Beat count validation
 *
 * @see SKILL.md Sections 10, 11, 11A, 11B, 13, 14
 */

import {
  TimeOfDay,
  getLightingForTimeOfDay,
  IntensityArc,
  INTENSITY_VISUAL_TREATMENT,
  getIntensityTreatment,
  Pacing,
  PACING_VISUAL_TREATMENT,
  SceneRole,
  SCENE_ROLE_TREATMENT,
  ArcPhase,
  ARC_PHASE_TREATMENT,
  FLUX_SHOT_TYPES,
  FLUX_LIGHTING,
  FLUX_EXPRESSIONS,
  mapToFluxShotType,
  getAlternativeShotTypes,
} from './fluxVocabularyService';

// ============================================================================
// SCENE CONTEXT TYPES
// ============================================================================

export interface SceneVisualContext {
  sceneNumber: number;
  sceneTitle: string;

  // Time of day
  timeOfDay: TimeOfDay | null;
  recommendedLighting: string[];

  // Intensity & pacing
  intensity: number; // 1-10
  intensityArc: IntensityArc;
  pacing: Pacing;

  // Scene role (YouTube format)
  sceneRole: SceneRole;
  isAdBreakScene: boolean;
  adBreakBeatNumber: number | null;

  // Arc phase
  arcPhase: ArcPhase | null;

  // Beat count guidance
  targetBeatCount: [number, number]; // [min, max]
  actualBeatCount: number;
  beatCountWarning: string | null;

  // Visual treatment summary
  preferredShotTypes: string[];
  preferredLighting: string[];
  preferredExpressions: string[];
  framingGuidance: string;
}

export interface BeatVisualGuidance {
  beatNumber: number;
  totalBeatsInScene: number;

  // Recommended shot type (considering scene context)
  recommendedShotType: string;
  shotTypeReason: string;

  // Recommended lighting (from time of day + intensity)
  recommendedLighting: string;

  // Intensity treatment
  intensityLevel: 'low' | 'medium' | 'high';

  // Special flags
  isOpeningBeat: boolean;
  isHookBeat: boolean;
  isAdBreakBeat: boolean;
  isClimaxBeat: boolean;

  // Variety tracking
  shouldVaryFromPrevious: boolean;
  varietyReason: string | null;
}

// ============================================================================
// SCENE ROLE DETECTION (YouTube 8-4-4-3 Format)
// ============================================================================

/**
 * Detect scene role based on scene number and total scenes
 * Standard 4-scene episode follows 8-4-4-3 minute format
 */
export function detectSceneRole(sceneNumber: number, totalScenes: number = 4): SceneRole {
  if (totalScenes === 4) {
    // Standard 4-scene episode
    switch (sceneNumber) {
      case 1: return 'setup_hook';
      case 2: return 'development';
      case 3: return 'escalation';
      case 4: return 'climax'; // or resolution
      default: return 'development';
    }
  }

  // For non-standard episode structures, estimate based on position
  const position = sceneNumber / totalScenes;
  if (position <= 0.25) return 'setup_hook';
  if (position <= 0.5) return 'development';
  if (position <= 0.75) return 'escalation';
  return 'climax';
}

/**
 * Check if scene should have an ad break (near 8-minute mark)
 */
export function isAdBreakScene(sceneNumber: number, sceneRole: SceneRole): boolean {
  // Scene 1 (setup_hook) typically has the ad break at its end
  return sceneRole === 'setup_hook' && sceneNumber === 1;
}

/**
 * Estimate which beat number should be the ad break moment
 * Target: dramatic pause near 7:30-8:00 of 8-minute scene
 */
export function estimateAdBreakBeat(totalBeats: number): number {
  // Ad break should be near the end of scene 1 (setup_hook)
  // Roughly 90-95% through the scene
  return Math.floor(totalBeats * 0.9);
}

// ============================================================================
// INTENSITY DETECTION
// ============================================================================

/**
 * Map numeric intensity (1-10) to intensity arc
 */
export function intensityToArc(intensity: number): IntensityArc {
  if (intensity <= 3) return 'calm';
  if (intensity <= 5) return 'building';
  if (intensity <= 7) return 'peak';
  if (intensity <= 8) return 'falling';
  return 'resolved';
}

/**
 * Get intensity level category
 */
export function getIntensityLevel(intensity: number): 'low' | 'medium' | 'high' {
  if (intensity <= 3) return 'low';
  if (intensity <= 6) return 'medium';
  return 'high';
}

// ============================================================================
// BEAT COUNT VALIDATION (Section 14.2)
// ============================================================================

/**
 * Validate beat count against scene duration expectations
 *
 * Long-form (19 min episode):
 * - Min beat duration: 15 seconds
 * - Max beat duration: 5 minutes
 * - Images per minute: 4-12
 */
export function validateBeatCount(
  sceneRole: SceneRole,
  actualBeatCount: number
): { isValid: boolean; warning: string | null } {
  const expected = SCENE_ROLE_TREATMENT[sceneRole].beatCountRange;
  const [minBeats, maxBeats] = expected;

  if (actualBeatCount < minBeats) {
    return {
      isValid: false,
      warning: `Scene has ${actualBeatCount} beats, but ${sceneRole} scenes typically need ${minBeats}-${maxBeats} beats. May result in beats that are too long.`
    };
  }

  if (actualBeatCount > maxBeats) {
    return {
      isValid: false,
      warning: `Scene has ${actualBeatCount} beats, but ${sceneRole} scenes typically have ${minBeats}-${maxBeats} beats. May result in beats that are too short (rapid slideshow feel).`
    };
  }

  return { isValid: true, warning: null };
}

// ============================================================================
// VISUAL HOOK DETECTION (Section 11B)
// ============================================================================

export interface HookGuidance {
  isHookBeat: boolean;
  hookEffort: 'low' | 'medium' | 'high';
  hookSuggestions: string[];
  reason: string;
}

/**
 * Determine if a beat should have hook treatment
 * Beat 1 of any scene is a potential hook beat
 */
export function getHookGuidance(
  beatNumber: number,
  intensity: number,
  sceneRole: SceneRole
): HookGuidance {
  // Only beat 1 is a hook beat
  if (beatNumber !== 1) {
    return {
      isHookBeat: false,
      hookEffort: 'low',
      hookSuggestions: [],
      reason: 'Not the opening beat'
    };
  }

  // Determine hook effort based on intensity (Section 11B.8)
  let hookEffort: 'low' | 'medium' | 'high';
  let reason: string;

  if (intensity <= 3) {
    hookEffort = 'high';
    reason = 'Low narrative intensity - visual must compensate';
  } else if (intensity <= 6) {
    hookEffort = 'medium';
    reason = 'Medium intensity - enhance what\'s building';
  } else {
    hookEffort = 'low';
    reason = 'High intensity - narrative drama carries the hook';
  }

  // Suggestions based on scene role
  const suggestions: string[] = [];

  switch (sceneRole) {
    case 'setup_hook':
      suggestions.push('Provocative pose or framing to grab attention');
      suggestions.push('Unexplained element that raises questions');
      suggestions.push('Character in intriguing state');
      break;
    case 'development':
      suggestions.push('Tension between characters');
      suggestions.push('Object focus on significant item');
      break;
    case 'escalation':
      suggestions.push('Action freeze mid-motion');
      suggestions.push('Tight framing suggesting danger');
      break;
    case 'climax':
      suggestions.push('Dramatic angle or lighting');
      suggestions.push('Maximum visual intensity');
      break;
    case 'resolution':
      suggestions.push('Wide shot suggesting closure');
      suggestions.push('Soft lighting, reflective mood');
      break;
  }

  return {
    isHookBeat: true,
    hookEffort,
    hookSuggestions: suggestions,
    reason
  };
}

// ============================================================================
// MAIN SCENE CONTEXT BUILDER
// ============================================================================

/**
 * Build complete visual context for a scene
 */
export function buildSceneVisualContext(
  sceneNumber: number,
  sceneTitle: string,
  options: {
    timeOfDay?: string | null;
    intensity?: number;
    pacing?: string;
    arcPhase?: string | null;
    totalScenes?: number;
    actualBeatCount?: number;
  } = {}
): SceneVisualContext {
  const {
    timeOfDay = null,
    intensity = 5,
    pacing = 'measured',
    arcPhase = null,
    totalScenes = 4,
    actualBeatCount = 0,
  } = options;

  // Detect scene role
  const sceneRole = detectSceneRole(sceneNumber, totalScenes);

  // Get treatments
  const intensityArc = intensityToArc(intensity);
  const intensityTreatment = getIntensityTreatment(intensity);
  const pacingTreatment = PACING_VISUAL_TREATMENT[pacing as Pacing] || PACING_VISUAL_TREATMENT.measured;
  const roleTreatment = SCENE_ROLE_TREATMENT[sceneRole];

  // Time of day lighting
  const normalizedTimeOfDay = timeOfDay?.toLowerCase().replace(/\s+/g, '_') as TimeOfDay | null;
  const recommendedLighting = normalizedTimeOfDay
    ? getLightingForTimeOfDay(normalizedTimeOfDay)
    : intensityTreatment.preferredLighting;

  // Arc phase treatment
  const normalizedArcPhase = arcPhase?.toUpperCase() as ArcPhase | null;
  const arcTreatment = normalizedArcPhase ? ARC_PHASE_TREATMENT[normalizedArcPhase] : null;

  // Beat count validation
  const beatValidation = validateBeatCount(sceneRole, actualBeatCount);

  // Combine preferred shot types from intensity, pacing, and arc phase
  const preferredShotTypes = [
    ...intensityTreatment.preferredShotTypes,
    ...pacingTreatment.shotTypeAdjustment,
  ];
  if (arcTreatment) {
    // Arc phase can suggest tighter or wider framing
    if (arcTreatment.visualIntensity === 'maximum') {
      preferredShotTypes.unshift(FLUX_SHOT_TYPES.CLOSE_UP, FLUX_SHOT_TYPES.INTIMATE_CLOSE_UP);
    } else if (arcTreatment.visualIntensity === 'closure') {
      preferredShotTypes.unshift(FLUX_SHOT_TYPES.WIDE, FLUX_SHOT_TYPES.ESTABLISHING);
    }
  }

  // Build framing guidance string
  let framingGuidance = `${sceneRole}: ${roleTreatment.shotPreference}`;
  if (arcTreatment) {
    framingGuidance += ` | Arc ${arcPhase}: ${arcTreatment.framingTendency}`;
  }

  return {
    sceneNumber,
    sceneTitle,

    timeOfDay: normalizedTimeOfDay,
    recommendedLighting,

    intensity,
    intensityArc,
    pacing: pacing as Pacing,

    sceneRole,
    isAdBreakScene: isAdBreakScene(sceneNumber, sceneRole),
    adBreakBeatNumber: isAdBreakScene(sceneNumber, sceneRole)
      ? estimateAdBreakBeat(actualBeatCount)
      : null,

    arcPhase: normalizedArcPhase,

    targetBeatCount: roleTreatment.beatCountRange,
    actualBeatCount,
    beatCountWarning: beatValidation.warning,

    preferredShotTypes: [...new Set(preferredShotTypes)], // Deduplicate
    preferredLighting: recommendedLighting,
    preferredExpressions: intensityTreatment.preferredExpressions,
    framingGuidance,
  };
}

// ============================================================================
// BEAT-LEVEL VISUAL GUIDANCE
// ============================================================================

/**
 * Get visual guidance for a specific beat within a scene
 */
export function getBeatVisualGuidance(
  beatNumber: number,
  totalBeatsInScene: number,
  sceneContext: SceneVisualContext,
  recentShotTypes: string[] = []
): BeatVisualGuidance {
  const isOpeningBeat = beatNumber === 1;
  const isClimaxBeat = beatNumber === totalBeatsInScene && sceneContext.sceneRole === 'climax';
  const isAdBreakBeat = sceneContext.isAdBreakScene && beatNumber === sceneContext.adBreakBeatNumber;

  // Get hook guidance
  const hookGuidance = getHookGuidance(beatNumber, sceneContext.intensity, sceneContext.sceneRole);

  // Determine recommended shot type
  let recommendedShotType: string;
  let shotTypeReason: string;

  if (isOpeningBeat && sceneContext.sceneRole === 'setup_hook') {
    // Scene 1, Beat 1: Start with establishing or wide
    recommendedShotType = FLUX_SHOT_TYPES.ESTABLISHING;
    shotTypeReason = 'Opening beat of setup_hook scene - establishing shot';
  } else if (isClimaxBeat) {
    // Climax beat: Close-up for maximum impact
    recommendedShotType = FLUX_SHOT_TYPES.CLOSE_UP;
    shotTypeReason = 'Climax beat - close framing for impact';
  } else if (isAdBreakBeat) {
    // Ad break: Medium, not too dramatic
    recommendedShotType = FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP;
    shotTypeReason = 'Ad break moment - medium framing, breath moment';
  } else {
    // Use scene preferences with variety
    recommendedShotType = sceneContext.preferredShotTypes[0] || FLUX_SHOT_TYPES.MEDIUM;
    shotTypeReason = `Scene ${sceneContext.sceneRole} preference`;

    // Check for monotony
    if (recentShotTypes.length >= 2 && recentShotTypes.slice(-2).every(s => s === recommendedShotType)) {
      const alternatives = getAlternativeShotTypes(recommendedShotType, recentShotTypes);
      if (alternatives.length > 0) {
        recommendedShotType = alternatives[0];
        shotTypeReason = 'Variety adjustment - avoiding monotony';
      }
    }
  }

  // Determine lighting
  const recommendedLighting = sceneContext.recommendedLighting[0] || FLUX_LIGHTING.NATURAL;

  // Determine if variety is needed
  const shouldVaryFromPrevious = recentShotTypes.length >= 2 &&
    recentShotTypes.slice(-2).every(s => s === recommendedShotType);

  return {
    beatNumber,
    totalBeatsInScene,

    recommendedShotType,
    shotTypeReason,

    recommendedLighting,

    intensityLevel: getIntensityLevel(sceneContext.intensity),

    isOpeningBeat,
    isHookBeat: hookGuidance.isHookBeat,
    isAdBreakBeat,
    isClimaxBeat,

    shouldVaryFromPrevious,
    varietyReason: shouldVaryFromPrevious ? 'Same shot type used 2+ times in a row' : null,
  };
}

// ============================================================================
// SCENE PROGRESSION TRACKING
// ============================================================================

/**
 * Get shot type progression for a scene based on its role
 * Returns recommended shot types for each beat position
 */
export function getSceneProgression(
  sceneRole: SceneRole,
  totalBeats: number
): string[] {
  const progression: string[] = [];

  switch (sceneRole) {
    case 'setup_hook':
      // Wide -> medium -> variety -> close at dramatic moments
      for (let i = 1; i <= totalBeats; i++) {
        const position = i / totalBeats;
        if (position <= 0.2) {
          progression.push(FLUX_SHOT_TYPES.ESTABLISHING);
        } else if (position <= 0.5) {
          progression.push(FLUX_SHOT_TYPES.MEDIUM);
        } else if (position <= 0.8) {
          progression.push(i % 2 === 0 ? FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP : FLUX_SHOT_TYPES.COWBOY);
        } else {
          progression.push(FLUX_SHOT_TYPES.CLOSE_UP);
        }
      }
      break;

    case 'escalation':
      // Medium -> progressively tighter
      for (let i = 1; i <= totalBeats; i++) {
        const position = i / totalBeats;
        if (position <= 0.3) {
          progression.push(FLUX_SHOT_TYPES.MEDIUM);
        } else if (position <= 0.6) {
          progression.push(FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP);
        } else if (position <= 0.85) {
          progression.push(FLUX_SHOT_TYPES.COWBOY);
        } else {
          progression.push(FLUX_SHOT_TYPES.CLOSE_UP);
        }
      }
      break;

    case 'climax':
      // Tight throughout with variety
      for (let i = 1; i <= totalBeats; i++) {
        const options = [FLUX_SHOT_TYPES.CLOSE_UP, FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP, FLUX_SHOT_TYPES.INTIMATE_CLOSE_UP];
        progression.push(options[i % options.length]);
      }
      break;

    case 'resolution':
      // Close -> gradually wider
      for (let i = 1; i <= totalBeats; i++) {
        const position = i / totalBeats;
        if (position <= 0.3) {
          progression.push(FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP);
        } else if (position <= 0.6) {
          progression.push(FLUX_SHOT_TYPES.MEDIUM);
        } else {
          progression.push(FLUX_SHOT_TYPES.WIDE);
        }
      }
      break;

    default: // development
      // Balanced variety
      for (let i = 1; i <= totalBeats; i++) {
        const options = [FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP, FLUX_SHOT_TYPES.COWBOY];
        progression.push(options[i % options.length]);
      }
  }

  return progression;
}

console.log('[SceneContext] Service loaded');
