/**
 * Beat State Service - Comprehensive Beat Processing
 *
 * Implements SKILL.md Sections:
 * - 4.5: Carryover State
 * - 4.7: Variety Tracking
 * - 5: FLUX Vocabulary Validation
 * - 11A: Scene Intensity & Pacing
 * - 12.2: Character-Specific Expressions
 * - 13.2: Time of Day Lighting
 *
 * Purpose:
 * - Track character action/expression state between beats
 * - Validate and map terms to FLUX vocabulary
 * - Apply scene context (intensity, pacing, time of day)
 * - Use character-specific expression defaults
 * - Prevent visual monotony through variety tracking
 * - State resets at scene boundaries
 *
 * @see .claude/skills/prompt-generation-rules/SKILL.md
 */

import type {
  BeatAnalysis,
  BeatAnalysisWithState,
  CharacterBeatState,
  SceneVarietyState,
  SceneBeatState,
  AnalyzedScene,
  AnalyzedEpisode
} from '../types';

// Import FLUX Vocabulary Service
import {
  FLUX_SHOT_TYPES,
  FLUX_CAMERA_ANGLES,
  FLUX_LIGHTING,
  FLUX_SHOT_TYPE_VALUES,
  FLUX_CAMERA_ANGLE_VALUES,
  mapToFluxShotType,
  mapToFluxCameraAngle,
  mapToFluxExpression,
  mapToFluxPose,
  getAlternativeShotTypes,
  getAlternativeCameraAngles,
  getLightingForTimeOfDay,
  getIntensityTreatment,
  PACING_VISUAL_TREATMENT,
  type TimeOfDay,
  type Pacing,
  type IntensityArc,
} from './fluxVocabularyService';

// Import Character Expression Service
import {
  getCharacterExpression,
  getCharacterDefaultExpression,
  findCharacterProfile,
  isDeceptionIndicator,
  getExpressionWithDeception,
} from './characterExpressionService';

// Import Scene Context Service
import {
  buildSceneVisualContext,
  getBeatVisualGuidance,
  getSceneProgression,
  detectSceneRole,
  type SceneVisualContext,
  type BeatVisualGuidance,
} from './sceneContextService';

// ============================================================================
// EXTENDED TYPES
// ============================================================================

/**
 * Extended scene state including visual context
 */
export interface ExtendedSceneBeatState extends SceneBeatState {
  visualContext: SceneVisualContext | null;
  sceneProgression: string[];
}

/**
 * Extended beat result with full visual guidance
 */
export interface FullyProcessedBeat extends BeatAnalysisWithState {
  // FLUX-validated terms
  fluxShotType: string;
  fluxCameraAngle: string;
  fluxExpression: string;
  fluxPose: string | null;
  fluxLighting: string[];

  // Scene context
  beatVisualGuidance: BeatVisualGuidance | null;

  // Validation status
  shotTypeValidated: boolean;
  angleValidated: boolean;
  expressionValidated: boolean;
}

// ============================================================================
// State Management
// ============================================================================

/**
 * Creates an initial empty state for a scene with extended context.
 */
export function createInitialSceneState(sceneNumber: number): SceneBeatState {
  return {
    sceneNumber,
    characterStates: {},
    varietyState: {
      recentShotTypes: [],
      recentAngles: [],
      beatCount: 0
    }
  };
}

/**
 * Creates extended scene state with visual context
 */
export function createExtendedSceneState(
  sceneNumber: number,
  sceneTitle: string,
  totalBeats: number,
  options: {
    timeOfDay?: string | null;
    intensity?: number;
    pacing?: string;
    arcPhase?: string | null;
    totalScenes?: number;
  } = {}
): ExtendedSceneBeatState {
  const visualContext = buildSceneVisualContext(sceneNumber, sceneTitle, {
    ...options,
    actualBeatCount: totalBeats,
  });

  const sceneProgression = getSceneProgression(visualContext.sceneRole, totalBeats);

  return {
    sceneNumber,
    characterStates: {},
    varietyState: {
      recentShotTypes: [],
      recentAngles: [],
      beatCount: 0
    },
    visualContext,
    sceneProgression,
  };
}

/**
 * Creates an initial state for a character.
 */
function createInitialCharacterState(characterName: string): CharacterBeatState {
  return {
    characterName,
    currentAction: null,
    currentExpression: getCharacterDefaultExpression(characterName), // Use character-specific default
    lastUpdatedBeatId: null
  };
}

// ============================================================================
// FLUX Vocabulary Extraction & Validation
// ============================================================================

/**
 * Extracts and validates shot type from beat, mapping to FLUX vocabulary.
 */
export function extractAndValidateShotType(beat: BeatAnalysis): { shotType: string; validated: boolean } {
  const suggestion = beat.cameraAngleSuggestion;
  const fluxShotType = mapToFluxShotType(suggestion);
  const validated = FLUX_SHOT_TYPE_VALUES.includes(fluxShotType);

  return { shotType: fluxShotType, validated };
}

/**
 * Extracts and validates camera angle from beat, mapping to FLUX vocabulary.
 */
export function extractAndValidateCameraAngle(beat: BeatAnalysis): { angle: string; validated: boolean } {
  const suggestion = beat.cameraAngleSuggestion;
  const fluxAngle = mapToFluxCameraAngle(suggestion);
  const validated = FLUX_CAMERA_ANGLE_VALUES.includes(fluxAngle);

  return { angle: fluxAngle, validated };
}

/**
 * Extracts and validates expression from beat using character-specific vocabulary.
 */
export function extractAndValidateExpression(
  beat: BeatAnalysis,
  characterName: string
): { expression: string; validated: boolean } {
  const emotionalTone = (beat as any).emotional_tone;

  // Check for deception indicators
  const isDeceiving = emotionalTone && isDeceptionIndicator(emotionalTone);

  // Get character-specific expression
  let expression = getCharacterExpression(characterName, emotionalTone);

  // Add deception tells if applicable
  if (isDeceiving) {
    expression = getExpressionWithDeception(characterName, expression);
  }

  // Consider it validated if we got a non-default expression or have a known character
  const validated = !!findCharacterProfile(characterName) || !!emotionalTone;

  return { expression, validated };
}

/**
 * Extracts action/pose from beat, mapping to FLUX vocabulary.
 */
export function extractActionFromBeat(beat: BeatAnalysis): string | null {
  const positioning = beat.characterPositioning;
  if (!positioning || positioning.trim() === '') {
    return null;
  }

  // Try to map to FLUX pose vocabulary
  const fluxPose = mapToFluxPose(positioning);
  return fluxPose || positioning.toLowerCase().trim();
}

/**
 * Extracts expression from beat's emotional_tone (legacy compatibility).
 */
export function extractExpressionFromBeat(beat: BeatAnalysis): string | null {
  const emotionalTone = (beat as any).emotional_tone;
  if (!emotionalTone || emotionalTone.trim() === '') {
    return null;
  }

  return mapToFluxExpression(emotionalTone);
}

/**
 * Extracts shot type from beat (legacy compatibility).
 */
export function extractShotTypeFromBeat(beat: BeatAnalysis): string | null {
  const { shotType } = extractAndValidateShotType(beat);
  return shotType;
}

/**
 * Extracts camera angle from beat (legacy compatibility).
 */
export function extractAngleFromBeat(beat: BeatAnalysis): string | null {
  const { angle } = extractAndValidateCameraAngle(beat);
  return angle;
}

// ============================================================================
// Variety Tracking (SKILL.md Section 4.7)
// ============================================================================

/**
 * Checks if a shot type violates monotony rules.
 * Rule: Do not use same shot type more than 2 beats in a row.
 */
export function checkShotTypeMonotony(
  varietyState: SceneVarietyState,
  proposedShotType: string
): boolean {
  const recent = varietyState.recentShotTypes;
  if (recent.length < 2) {
    return false;
  }
  return recent.slice(-2).every(shot => shot === proposedShotType);
}

/**
 * Checks if camera angle needs variation.
 * Rule: Vary camera angle at least every 3 beats.
 */
export function checkAngleMonotony(
  varietyState: SceneVarietyState,
  proposedAngle: string
): boolean {
  const recent = varietyState.recentAngles;
  if (recent.length < 3) {
    return false;
  }
  return recent.slice(-3).every(angle => angle === proposedAngle);
}

/**
 * Suggests an alternative shot type when monotony is detected.
 */
export function suggestAlternativeShotType(
  currentShotType: string,
  recentShotTypes: string[]
): string {
  const alternatives = getAlternativeShotTypes(currentShotType, recentShotTypes);
  return alternatives[0] || currentShotType;
}

/**
 * Updates variety tracking state after processing a beat.
 */
export function updateVarietyState(
  state: SceneVarietyState,
  shotType: string | null,
  angle: string | null
): SceneVarietyState {
  const newState = { ...state };

  if (shotType) {
    newState.recentShotTypes = [...state.recentShotTypes, shotType].slice(-3);
  }

  if (angle) {
    newState.recentAngles = [...state.recentAngles, angle].slice(-3);
  }

  newState.beatCount = state.beatCount + 1;

  return newState;
}

// ============================================================================
// Main Processing Functions
// ============================================================================

/**
 * Processes a single beat with full SKILL.md compliance.
 *
 * @param beat - The beat to process
 * @param sceneState - Current scene state (will be mutated)
 * @param beatIndex - Index of beat in scene (0-based)
 * @returns The beat with carryover state and visual guidance applied
 */
export function processBeatWithFullContext(
  beat: BeatAnalysis,
  sceneState: ExtendedSceneBeatState,
  beatIndex: number
): FullyProcessedBeat {
  const result: FullyProcessedBeat = {
    ...beat,
    fluxShotType: FLUX_SHOT_TYPES.MEDIUM,
    fluxCameraAngle: FLUX_CAMERA_ANGLES.EYE_LEVEL,
    fluxExpression: '',
    fluxPose: null,
    fluxLighting: [],
    beatVisualGuidance: null,
    shotTypeValidated: false,
    angleValidated: false,
    expressionValidated: false,
  };

  // Get characters present in this beat
  const characters: string[] = (beat as any).characters || [];
  const primaryCharacter = characters[0] || 'Unknown';

  // --- FLUX VOCABULARY VALIDATION ---

  // Shot type
  const { shotType, validated: shotTypeValidated } = extractAndValidateShotType(beat);
  result.fluxShotType = shotType;
  result.shotTypeValidated = shotTypeValidated;

  // Camera angle
  const { angle, validated: angleValidated } = extractAndValidateCameraAngle(beat);
  result.fluxCameraAngle = angle;
  result.angleValidated = angleValidated;

  // Expression (character-specific)
  const { expression, validated: expressionValidated } = extractAndValidateExpression(beat, primaryCharacter);
  result.fluxExpression = expression;
  result.expressionValidated = expressionValidated;

  // Pose/action
  result.fluxPose = extractActionFromBeat(beat);

  // Lighting (from scene context time of day)
  if (sceneState.visualContext?.timeOfDay) {
    result.fluxLighting = getLightingForTimeOfDay(sceneState.visualContext.timeOfDay);
  } else if (sceneState.visualContext) {
    result.fluxLighting = sceneState.visualContext.recommendedLighting;
  } else {
    result.fluxLighting = [FLUX_LIGHTING.NATURAL];
  }

  // --- SCENE CONTEXT VISUAL GUIDANCE ---

  if (sceneState.visualContext) {
    result.beatVisualGuidance = getBeatVisualGuidance(
      beatIndex + 1, // 1-based beat number
      sceneState.visualContext.actualBeatCount || sceneState.sceneProgression.length,
      sceneState.visualContext,
      sceneState.varietyState.recentShotTypes
    );

    // Use scene progression suggestion if no explicit shot type
    if (!beat.cameraAngleSuggestion && sceneState.sceneProgression[beatIndex]) {
      result.fluxShotType = sceneState.sceneProgression[beatIndex];
    }
  }

  // --- CARRYOVER STATE (Section 4.5) ---

  for (const characterName of characters) {
    if (!sceneState.characterStates[characterName]) {
      sceneState.characterStates[characterName] = createInitialCharacterState(characterName);
    }
    const charState = sceneState.characterStates[characterName];

    // Action carryover
    if (result.fluxPose) {
      charState.currentAction = result.fluxPose;
      charState.lastUpdatedBeatId = beat.beatId;
    } else if (charState.currentAction) {
      result.carryoverAction = charState.currentAction;
      result.carryoverSourceBeatId = charState.lastUpdatedBeatId || undefined;
      result.fluxPose = charState.currentAction; // Use carryover
    }

    // Expression carryover
    const beatExpression = (beat as any).emotional_tone;
    if (beatExpression) {
      charState.currentExpression = result.fluxExpression;
      charState.lastUpdatedBeatId = beat.beatId;
    } else if (charState.currentExpression) {
      result.carryoverExpression = charState.currentExpression;
      if (!result.carryoverSourceBeatId && charState.lastUpdatedBeatId) {
        result.carryoverSourceBeatId = charState.lastUpdatedBeatId;
      }
      result.fluxExpression = charState.currentExpression; // Use carryover
    }
  }

  // --- VARIETY TRACKING (Section 4.7) ---

  if (checkShotTypeMonotony(sceneState.varietyState, result.fluxShotType)) {
    result.varietyApplied = true;
    result.suggestedShotType = suggestAlternativeShotType(
      result.fluxShotType,
      sceneState.varietyState.recentShotTypes
    );
    result.fluxShotType = result.suggestedShotType; // Apply the variety adjustment
    console.log(`[BeatState] Variety applied for ${beat.beatId}: shot type -> ${result.suggestedShotType}`);
  }

  // Update variety tracking
  sceneState.varietyState = updateVarietyState(
    sceneState.varietyState,
    result.fluxShotType,
    result.fluxCameraAngle
  );

  return result;
}

/**
 * Processes a single beat (legacy compatibility).
 */
export function processBeaWithState(
  beat: BeatAnalysis,
  sceneState: SceneBeatState
): BeatAnalysisWithState {
  const result: BeatAnalysisWithState = { ...beat };
  const characters: string[] = (beat as any).characters || [];

  const beatAction = extractActionFromBeat(beat);
  const beatExpression = extractExpressionFromBeat(beat);
  const beatShotType = extractShotTypeFromBeat(beat);
  const beatAngle = extractAngleFromBeat(beat);

  for (const characterName of characters) {
    if (!sceneState.characterStates[characterName]) {
      sceneState.characterStates[characterName] = createInitialCharacterState(characterName);
    }
    const charState = sceneState.characterStates[characterName];

    if (beatAction) {
      charState.currentAction = beatAction;
      charState.lastUpdatedBeatId = beat.beatId;
    } else if (charState.currentAction) {
      result.carryoverAction = charState.currentAction;
      result.carryoverSourceBeatId = charState.lastUpdatedBeatId || undefined;
    }

    if (beatExpression) {
      charState.currentExpression = beatExpression;
      charState.lastUpdatedBeatId = beat.beatId;
    } else if (charState.currentExpression) {
      result.carryoverExpression = charState.currentExpression;
      if (!result.carryoverSourceBeatId && charState.lastUpdatedBeatId) {
        result.carryoverSourceBeatId = charState.lastUpdatedBeatId;
      }
    }
  }

  const effectiveShotType = beatShotType || FLUX_SHOT_TYPES.MEDIUM;
  const effectiveAngle = beatAngle || FLUX_CAMERA_ANGLES.EYE_LEVEL;

  if (checkShotTypeMonotony(sceneState.varietyState, effectiveShotType)) {
    result.varietyApplied = true;
    result.suggestedShotType = suggestAlternativeShotType(
      effectiveShotType,
      sceneState.varietyState.recentShotTypes
    );
    console.log(`[BeatState] Variety applied for ${beat.beatId}: ${effectiveShotType} -> ${result.suggestedShotType}`);
  }

  sceneState.varietyState = updateVarietyState(
    sceneState.varietyState,
    result.suggestedShotType || effectiveShotType,
    effectiveAngle
  );

  return result;
}

/**
 * Processes all beats in a scene with full context.
 */
export function processSceneWithFullContext(
  scene: AnalyzedScene,
  sceneOptions: {
    timeOfDay?: string | null;
    intensity?: number;
    pacing?: string;
    arcPhase?: string | null;
    totalScenes?: number;
  } = {}
): AnalyzedScene {
  const extendedState = createExtendedSceneState(
    scene.sceneNumber,
    scene.title,
    scene.beats.length,
    sceneOptions
  );

  const processedBeats = scene.beats.map((beat, index) => {
    return processBeatWithFullContext(beat, extendedState, index);
  });

  // Log scene summary
  console.log(`[BeatState] Scene ${scene.sceneNumber} "${scene.title}":`);
  console.log(`  Role: ${extendedState.visualContext?.sceneRole || 'unknown'}`);
  console.log(`  Beats: ${processedBeats.length}`);
  console.log(`  Characters: ${Object.keys(extendedState.characterStates).join(', ')}`);
  if (extendedState.visualContext?.beatCountWarning) {
    console.warn(`  WARNING: ${extendedState.visualContext.beatCountWarning}`);
  }

  return {
    ...scene,
    beats: processedBeats
  };
}

/**
 * Processes all beats in a scene (legacy compatibility).
 */
export function processSceneWithState(scene: AnalyzedScene): AnalyzedScene {
  const sceneState = createInitialSceneState(scene.sceneNumber);

  const processedBeats = scene.beats.map(beat => {
    return processBeaWithState(beat, sceneState);
  });

  console.log(`[BeatState] Scene ${scene.sceneNumber}: Processed ${processedBeats.length} beats`);
  console.log(`[BeatState] Character states:`, Object.keys(sceneState.characterStates));
  console.log(`[BeatState] Variety tracking:`, sceneState.varietyState);

  return {
    ...scene,
    beats: processedBeats
  };
}

/**
 * Processes an entire episode with full SKILL.md compliance.
 *
 * @param episode - The episode to process
 * @param episodeOptions - Options for each scene (by scene number)
 */
export function processEpisodeWithFullContext(
  episode: AnalyzedEpisode,
  episodeOptions: Record<number, {
    timeOfDay?: string | null;
    intensity?: number;
    pacing?: string;
    arcPhase?: string | null;
  }> = {}
): AnalyzedEpisode {
  console.log(`[BeatState] Processing episode ${episode.episodeNumber}: "${episode.title}" (FULL CONTEXT)`);

  const processedScenes = episode.scenes.map(scene => {
    const sceneOpts = episodeOptions[scene.sceneNumber] || {};
    return processSceneWithFullContext(scene, {
      ...sceneOpts,
      totalScenes: episode.scenes.length,
    });
  });

  // Log summary
  let totalBeats = 0;
  let carryoverApplied = 0;
  let varietyApplied = 0;
  let fluxValidated = 0;

  for (const scene of processedScenes) {
    for (const beat of scene.beats) {
      totalBeats++;
      const fullBeat = beat as FullyProcessedBeat;
      if (fullBeat.carryoverAction || fullBeat.carryoverExpression) {
        carryoverApplied++;
      }
      if (fullBeat.varietyApplied) {
        varietyApplied++;
      }
      if (fullBeat.shotTypeValidated) {
        fluxValidated++;
      }
    }
  }

  console.log(`[BeatState] Episode complete (FULL CONTEXT):`);
  console.log(`  Total beats: ${totalBeats}`);
  console.log(`  Carryover applied: ${carryoverApplied}`);
  console.log(`  Variety adjustments: ${varietyApplied}`);
  console.log(`  FLUX validated: ${fluxValidated}/${totalBeats}`);

  return {
    ...episode,
    scenes: processedScenes
  };
}

/**
 * Processes an entire episode (legacy compatibility).
 */
export function processEpisodeWithState(episode: AnalyzedEpisode): AnalyzedEpisode {
  console.log(`[BeatState] Processing episode ${episode.episodeNumber}: "${episode.title}"`);

  const processedScenes = episode.scenes.map(scene => {
    return processSceneWithState(scene);
  });

  let totalBeats = 0;
  let carryoverApplied = 0;
  let varietyApplied = 0;

  for (const scene of processedScenes) {
    for (const beat of scene.beats) {
      totalBeats++;
      const beatWithState = beat as BeatAnalysisWithState;
      if (beatWithState.carryoverAction || beatWithState.carryoverExpression) {
        carryoverApplied++;
      }
      if (beatWithState.varietyApplied) {
        varietyApplied++;
      }
    }
  }

  console.log(`[BeatState] Episode complete:`);
  console.log(`  Total beats: ${totalBeats}`);
  console.log(`  Carryover applied: ${carryoverApplied}`);
  console.log(`  Variety adjustments: ${varietyApplied}`);

  return {
    ...episode,
    scenes: processedScenes
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats carryover state for logging/debugging.
 */
export function formatCarryoverState(beat: BeatAnalysisWithState): string {
  const parts: string[] = [];

  if (beat.carryoverAction) {
    parts.push(`Action: "${beat.carryoverAction}" (from ${beat.carryoverSourceBeatId})`);
  }

  if (beat.carryoverExpression) {
    parts.push(`Expression: "${beat.carryoverExpression}" (from ${beat.carryoverSourceBeatId})`);
  }

  if (beat.varietyApplied) {
    parts.push(`Shot type adjusted to: ${beat.suggestedShotType}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No carryover applied';
}

/**
 * Checks if a beat has any carryover state applied.
 */
export function hasCarryoverState(beat: BeatAnalysisWithState): boolean {
  return !!(beat.carryoverAction || beat.carryoverExpression || beat.varietyApplied);
}

/**
 * Formats fully processed beat for debugging.
 */
export function formatFullBeat(beat: FullyProcessedBeat): string {
  const parts: string[] = [
    `Shot: ${beat.fluxShotType}${beat.shotTypeValidated ? ' (validated)' : ''}`,
    `Angle: ${beat.fluxCameraAngle}`,
    `Expression: ${beat.fluxExpression}`,
  ];

  if (beat.fluxPose) {
    parts.push(`Pose: ${beat.fluxPose}`);
  }

  if (beat.fluxLighting.length > 0) {
    parts.push(`Lighting: ${beat.fluxLighting[0]}`);
  }

  if (beat.beatVisualGuidance?.isHookBeat) {
    parts.push('(HOOK BEAT)');
  }

  if (beat.beatVisualGuidance?.isAdBreakBeat) {
    parts.push('(AD BREAK)');
  }

  if (beat.varietyApplied) {
    parts.push(`(variety adjusted)`);
  }

  if (beat.carryoverAction || beat.carryoverExpression) {
    parts.push(`(carryover from ${beat.carryoverSourceBeatId})`);
  }

  return parts.join(' | ');
}
