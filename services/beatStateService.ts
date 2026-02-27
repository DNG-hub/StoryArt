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
  ScenePersistentState,
  SceneTypeTemplate,
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

// Import Time Progression Service
import {
  processEpisodeTimeProgression,
  getEpisodeEndTime,
  type SceneTimeContext,
} from './timeProgressionService';

// ============================================================================
// EXTENDED TYPES
// ============================================================================

/**
 * Extended scene state including visual context
 */
export interface ExtendedSceneBeatState extends SceneBeatState {
  visualContext: SceneVisualContext | null;
  sceneProgression: string[];
  /** Persistent elements that carry forward between beats (Architect Memo Section 2) */
  persistentState: ScenePersistentState;
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

  // Scene persistent state (Architect Memo: continuity carry-forward)
  scenePersistentState?: ScenePersistentState;
  sceneTemplate?: SceneTypeTemplate;
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
    persistentState: {
      vehicle: null,
      vehicleState: null,
      charactersPresent: [],
      characterPositions: {},
      gearState: null,
      location: null,
      lighting: null,
      characterPhases: {}, // Multi-phase character appearance support (v0.20)
    },
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
// Scene Persistent State (Architect Memo: Continuity Carry-Forward)
// ============================================================================

/**
 * Initializes persistent state from scene metadata.
 * Scans scene beats for vehicle mentions, character names, and location info.
 *
 * RULE: All persistent elements carry forward until narrative EXPLICITLY changes them.
 * A beat about one character's dialogue does NOT clear other characters.
 */
function initializePersistentState(scene: AnalyzedScene): ScenePersistentState {
  const state: ScenePersistentState = {
    vehicle: null,
    vehicleState: null,
    charactersPresent: [],
    characterPositions: {},
    gearState: null,
    location: scene.title || null,
    lighting: null,
    // Multi-phase character appearance support (v0.20): initialize all characters to 'default' phase
    characterPhases: {},
  };

  // Extract unique characters from all beats in scene
  const allCharacters = new Set<string>();
  for (const beat of scene.beats) {
    const chars: string[] = (beat as any).characters || [];
    chars.forEach(c => allCharacters.add(c));
  }
  state.charactersPresent = Array.from(allCharacters);

  // Initialize character phases to 'default' (v0.20: multi-phase support)
  state.charactersPresent.forEach(char => {
    state.characterPhases[char] = 'default';
  });

  // Scan early beats for vehicle references (Dingy/motorcycle)
  const earlyBeatsText = scene.beats.slice(0, 5)
    .map(b => b.beat_script_text || '').join(' ').toLowerCase();
  const fullSceneText = scene.beats
    .map(b => b.beat_script_text || '').join(' ').toLowerCase();

  if (fullSceneText.match(/\bdingy\b|\bdinghy\b|\bmotorcycle\b|\bbike\b/)) {
    state.vehicle = 'matte-black armored motorcycle (The Dinghy)';
    // Determine motion state from first mention context
    if (earlyBeatsText.match(/riding|speeding|accelerat|tearing|racing|roaring|weaving|mph/)) {
      state.vehicleState = 'in_motion';
    } else if (earlyBeatsText.match(/parked|stopped|dismount|stationary|leaning against/)) {
      state.vehicleState = 'parked';
    }
  }

  // Set default motorcycle positions when both Cat and Daniel present
  if (state.vehicle && state.charactersPresent.length >= 2) {
    const hasDaniel = state.charactersPresent.some(c => c.toLowerCase().includes('daniel'));
    const hasCat = state.charactersPresent.some(c => c.toLowerCase().includes('cat'));
    if (hasDaniel && hasCat && state.vehicleState === 'in_motion') {
      state.characterPositions['Daniel'] = 'front/driving';
      state.characterPositions['Cat'] = 'behind/passenger';
    }
  }

  // Detect gear context from early beats
  if (fullSceneText.match(/\baegis\b|\bbodysuit\b|\btactical suit\b|\bhelmet\b|\bwraith\b/)) {
    if (fullSceneText.match(/visor down|sealed|helmet sealed|riding at speed/)) {
      state.gearState = 'HELMET_DOWN';
    } else if (fullSceneText.match(/visor up|visor raised|raises visor/)) {
      state.gearState = 'HELMET_VISOR_UP';
    } else if (fullSceneText.match(/helmet off|removes helmet|no helmet/)) {
      state.gearState = 'HELMET_OFF';
    }
  }

  console.log(`[PersistentState] Scene ${scene.sceneNumber} initialized:`,
    `chars=[${state.charactersPresent.join(', ')}]`,
    state.vehicle ? `vehicle=${state.vehicleState}` : 'no vehicle',
    state.gearState ? `gear=${state.gearState}` : '');

  return state;
}

/**
 * Updates persistent state based on beat narrative.
 * Only modifies elements that are EXPLICITLY changed in the beat text.
 * Conservative matching prevents false positives.
 */
function updatePersistentState(
  state: ScenePersistentState,
  beat: BeatAnalysis
): ScenePersistentState {
  const updated = { ...state, characterPositions: { ...state.characterPositions } };
  const text = (beat.beat_script_text || '').toLowerCase();

  // Check for explicit character departures
  if (text.match(/\b(leaves|departs|exits|walks away|runs off|disappears|stays behind)\b/)) {
    const beatChars: string[] = (beat as any).characters || [];
    for (const char of beatChars) {
      if (text.includes(char.toLowerCase()) &&
          text.match(new RegExp(`${char.toLowerCase()}\\s+(leaves|departs|exits|walks away|runs off|stays behind)`, 'i'))) {
        updated.charactersPresent = updated.charactersPresent.filter(c => c !== char);
        delete updated.characterPositions[char];
        console.log(`[PersistentState] ${beat.beatId}: ${char} departed scene`);
      }
    }
  }

  // Check for character arrivals
  if (text.match(/\b(arrives|enters|approaches|joins|appears|steps into)\b/)) {
    const beatChars: string[] = (beat as any).characters || [];
    for (const char of beatChars) {
      if (!updated.charactersPresent.includes(char)) {
        updated.charactersPresent.push(char);
        console.log(`[PersistentState] ${beat.beatId}: ${char} arrived in scene`);
      }
    }
  }

  // Vehicle state transitions
  if (updated.vehicle) {
    if (text.match(/\b(dismount|stop|park|pull over|brake|come to a halt|idle|kills the engine)\b/)) {
      if (updated.vehicleState === 'in_motion') {
        updated.vehicleState = 'parked';
        console.log(`[PersistentState] ${beat.beatId}: vehicle now parked`);
      }
    }
    if (text.match(/\b(mount|ride|accelerat|depart|take off|speed|kick.?start|roar|gun)\b/)) {
      if (updated.vehicleState === 'parked' || updated.vehicleState === null) {
        updated.vehicleState = 'in_motion';
        console.log(`[PersistentState] ${beat.beatId}: vehicle now in motion`);
      }
    }
  }

  // Gear state changes (explicit only)
  if (text.match(/\b(seal|visor down|visor seals|helmet sealed|lowers? visor)\b/)) {
    updated.gearState = 'HELMET_DOWN';
  } else if (text.match(/\b(visor up|raises? visor|lifts? visor|flips? visor)\b/)) {
    updated.gearState = 'HELMET_VISOR_UP';
  } else if (text.match(/\b(removes? helmet|takes? off helmet|helmet off|pulls? off helmet)\b/)) {
    updated.gearState = 'HELMET_OFF';
  }

  return updated;
}

/**
 * Detects scene type template for prompt skeleton selection.
 * Implements Architect Memo Section 15 decision tree.
 */
function detectSceneTemplate(
  beat: BeatAnalysis,
  persistentState: ScenePersistentState
): SceneTypeTemplate {
  const text = (beat.beat_script_text || '').toLowerCase();

  // Vehicle in motion?
  if (persistentState.vehicle && persistentState.vehicleState === 'in_motion') {
    return { templateType: 'vehicle', templateReason: 'vehicle in motion during scene' };
  }
  if (text.match(/\b(riding|motorcycle|bike|driving|speeding)\b/) && persistentState.vehicle) {
    return { templateType: 'vehicle', templateReason: 'beat references vehicle in motion' };
  }

  // Active combat or breach?
  if (text.match(/\b(breach|firing|firefight|combat|gunfire|weapon|shoots?|muzzle flash|tactical engage)\b/)) {
    return { templateType: 'combat', templateReason: 'active combat or breach detected' };
  }

  // Covert movement?
  if (text.match(/\b(stealth|sneak|covert|infiltrat|creep|crouch|low profile|quietly)\b/)) {
    return { templateType: 'stealth', templateReason: 'stealth or covert movement' };
  }

  // Donning or calibrating gear?
  if (text.match(/\b(suit up|suiting up|calibrat|diagnostic|seal.{0,5}suit|don.{0,5}(aegis|suit|gear))\b/)) {
    return { templateType: 'suit_up', templateReason: 'gear donning or calibration' };
  }

  // Ghost communication or digital anomaly?
  if (text.match(/\b(ghost|hud rewrite|i am everyone|bioluminescent|fungal|glitch|digital anomaly|cyan text)\b/)) {
    return { templateType: 'ghost', templateReason: 'Ghost manifestation or digital anomaly' };
  }

  // New location reveal or scene transition?
  const beatChars: string[] = (beat as any).characters || [];
  if (beatChars.length === 0 || text.match(/\b(establishing|reveal|transition|the silence|panoramic)\b/)) {
    return { templateType: 'establishing', templateReason: 'environment-only or location reveal' };
  }

  // Interior with dialogue/planning?
  if (text.match(/\b(said|says|spoke|speaking|asked|replied|argued|planning|briefing|discuss)\b/)) {
    return { templateType: 'indoor_dialogue', templateReason: 'dialogue or planning scene' };
  }

  // Default: generic (use Three-Question Framework)
  return { templateType: 'generic', templateReason: 'no specific template match - use Three-Question Framework' };
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

  // --- MULTI-PHASE CHARACTER APPEARANCE (v0.20) ---

  // Process phase transitions from Gemini beat analysis
  if ((beat as any).phaseTransitions && Array.isArray((beat as any).phaseTransitions)) {
    for (const transition of (beat as any).phaseTransitions) {
      if (transition.character && transition.toPhase) {
        const oldPhase = sceneState.persistentState.characterPhases[transition.character] || 'default';
        sceneState.persistentState.characterPhases[transition.character] = transition.toPhase;
        console.log(`[BeatState] Phase transition for ${transition.character}: ${oldPhase} -> ${transition.toPhase} (beat ${beat.beatId})`);
      }
    }
  }

  // --- SCENE PERSISTENT STATE & TEMPLATE (Architect Memo) ---

  // Update persistent state based on this beat's narrative
  sceneState.persistentState = updatePersistentState(sceneState.persistentState, beat);

  // Attach snapshot of current persistent state to this beat
  result.scenePersistentState = { ...sceneState.persistentState };

  // Detect scene type template for this beat
  result.sceneTemplate = detectSceneTemplate(beat, sceneState.persistentState);

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

  // Initialize persistent state from scene metadata (Architect Memo Section 2)
  extendedState.persistentState = initializePersistentState(scene);

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
 * Result of processing an episode with full context.
 * Includes the ending time for cross-episode continuity.
 */
export interface ProcessedEpisodeResult {
  episode: AnalyzedEpisode;
  timeProgression: SceneTimeContext[];
  endingTimeOfDay: TimeOfDay | null;
  stats: {
    totalBeats: number;
    carryoverApplied: number;
    varietyApplied: number;
    fluxValidated: number;
    timeJumps: number;
  };
}

/**
 * Processes an entire episode with full SKILL.md compliance.
 *
 * @param episode - The episode to process
 * @param options - Processing options
 * @param options.previousEpisodeEndTime - Time of day at end of previous episode (for continuity)
 * @param options.sceneOverrides - Manual overrides for scene options (by scene number)
 */
export function processEpisodeWithFullContext(
  episode: AnalyzedEpisode,
  options: {
    previousEpisodeEndTime?: TimeOfDay | null;
    sceneOverrides?: Record<number, {
      timeOfDay?: string | null;
      intensity?: number;
      pacing?: string;
      arcPhase?: string | null;
    }>;
  } = {}
): ProcessedEpisodeResult {
  const { previousEpisodeEndTime = null, sceneOverrides = {} } = options;

  console.log(`[BeatState] Processing episode ${episode.episodeNumber}: "${episode.title}" (FULL CONTEXT)`);
  if (previousEpisodeEndTime) {
    console.log(`[BeatState] Continuing from previous episode ending: ${previousEpisodeEndTime}`);
  }

  // Step 1: Determine time progression for all scenes
  const scenesForTimeProgression = episode.scenes.map(scene => ({
    sceneNumber: scene.sceneNumber,
    title: scene.title,
    description: scene.beats[0]?.beat_script_text || scene.title,
    explicitTimeOfDay: sceneOverrides[scene.sceneNumber]?.timeOfDay,
  }));

  const timeProgression = processEpisodeTimeProgression(
    scenesForTimeProgression,
    previousEpisodeEndTime
  );

  // Log time progression
  console.log(`[BeatState] Time progression:`);
  for (const tc of timeProgression) {
    const jumpInfo = tc.isTimeJump ? ` [JUMP: ${tc.jumpDescription}]` : '';
    console.log(`  Scene ${tc.sceneNumber}: ${tc.timeOfDay} (${tc.source})${jumpInfo}`);
  }

  // Step 2: Process each scene with its determined time of day
  const processedScenes = episode.scenes.map((scene, index) => {
    const timeContext = timeProgression[index];
    const sceneOpts = sceneOverrides[scene.sceneNumber] || {};

    return processSceneWithFullContext(scene, {
      ...sceneOpts,
      // Use time from progression (unless explicitly overridden)
      timeOfDay: sceneOpts.timeOfDay || timeContext?.timeOfDay || null,
      totalScenes: episode.scenes.length,
    });
  });

  // Step 3: Collect stats
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

  const timeJumps = timeProgression.filter(tc => tc.isTimeJump).length;
  const endingTimeOfDay = getEpisodeEndTime(timeProgression);

  console.log(`[BeatState] Episode complete (FULL CONTEXT):`);
  console.log(`  Total beats: ${totalBeats}`);
  console.log(`  Carryover applied: ${carryoverApplied}`);
  console.log(`  Variety adjustments: ${varietyApplied}`);
  console.log(`  FLUX validated: ${fluxValidated}/${totalBeats}`);
  console.log(`  Time jumps: ${timeJumps}`);
  console.log(`  Episode ends at: ${endingTimeOfDay}`);

  return {
    episode: {
      ...episode,
      scenes: processedScenes
    },
    timeProgression,
    endingTimeOfDay,
    stats: {
      totalBeats,
      carryoverApplied,
      varietyApplied,
      fluxValidated,
      timeJumps,
    }
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
