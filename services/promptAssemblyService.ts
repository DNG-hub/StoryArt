/**
 * Prompt Assembly Service
 *
 * Assembles final SwarmUI-compatible prompts using all SKILL.md rules.
 * This is the main orchestration service that brings together:
 * - Beat type detection
 * - Arc phase visual mapping
 * - Visual hooks
 * - Anti-monotony enforcement
 * - FLUX vocabulary validation
 *
 * @see SKILL.md Section 1 (Templates), Section 3 (Assembly Rules)
 */

import type { ShotType, CameraAngle, LightingTerm, TimeOfDay } from './fluxVocabularyService';
import { validateShotType, validateCameraAngle, getLightingForTimeOfDay } from './fluxVocabularyService';
import { detectBeatType, type BeatType, type BeatTypeResult, detectHelmetState, isEnvironmentShotFromDescription } from './beatTypeService';
import { getPhaseAwareShotRecommendation, inferArcPhaseFromSceneRole, type ArcPhase } from './arcPhaseVisualService';
import { getHookRecommendation, isHookBeat, type HookRecommendation, type HookContext } from './visualHookService';
import {
  createVarietyState, updateVarietyState, enforceVariety,
  type SceneVarietyState, type VarietyAdjustedShot
} from './antiMonotonyService';

// ============================================================================
// PROMPT TEMPLATES (Section 1)
// ============================================================================

/**
 * Template 1.1: Character Beat with LoRA
 * [SHOT_TYPE] of a [TRIGGER] ([CHARACTER_DESCRIPTION]) [ACTION], [EXPRESSION],
 * in [LOCATION_SHORTHAND], [LIGHTING], [ATMOSPHERE] <clothing_segment> <face_segment>
 */
function assembleCharacterWithFacePrompt(components: PromptComponents): string {
  const parts: string[] = [];

  // Shot type
  parts.push(components.shotType);

  // Character with trigger
  if (components.trigger) {
    parts.push(`of a ${components.trigger}`);
    if (components.characterDescription) {
      parts.push(`(${components.characterDescription})`);
    }
  } else if (components.characterDescription) {
    parts.push(`of ${components.characterDescription}`);
  }

  // Action/pose
  if (components.action) {
    parts.push(components.action);
  }

  // Expression
  if (components.expression) {
    parts.push(components.expression);
  }

  // Location
  if (components.locationShorthand) {
    parts.push(`in ${components.locationShorthand}`);
  }

  // Lighting
  if (components.lighting) {
    parts.push(components.lighting);
  }

  // Atmosphere
  if (components.atmosphere) {
    parts.push(components.atmosphere);
  }

  let prompt = parts.join(', ');

  // Segments at end
  if (components.clothingSegment) {
    prompt += ` ${components.clothingSegment}`;
  }
  if (components.faceSegment) {
    prompt += ` ${components.faceSegment}`;
  }

  return prompt;
}

/**
 * Template 1.2: Environment-Only Beat
 * [SHOT_TYPE] of [SUBJECT_DESCRIPTION], in [LOCATION_SHORTHAND], [LIGHTING], [ATMOSPHERE]
 */
function assembleEnvironmentOnlyPrompt(components: PromptComponents): string {
  const parts: string[] = [];

  parts.push(components.shotType);

  if (components.subjectDescription) {
    parts.push(`of ${components.subjectDescription}`);
  }

  if (components.locationShorthand) {
    parts.push(`in ${components.locationShorthand}`);
  }

  if (components.lighting) {
    parts.push(components.lighting);
  }

  if (components.atmosphere) {
    parts.push(components.atmosphere);
  }

  return parts.join(', ');
}

/**
 * Template 1.3: Character Without LoRA
 * [SHOT_TYPE] of a [GENERIC_DESCRIPTION] [ACTION], [EXPRESSION],
 * in [LOCATION_SHORTHAND], [LIGHTING], [ATMOSPHERE]
 */
function assembleGenericCharacterPrompt(components: PromptComponents): string {
  const parts: string[] = [];

  parts.push(components.shotType);

  if (components.genericDescription) {
    parts.push(`of a ${components.genericDescription}`);
  }

  if (components.action) {
    parts.push(components.action);
  }

  if (components.expression) {
    parts.push(components.expression);
  }

  if (components.locationShorthand) {
    parts.push(`in ${components.locationShorthand}`);
  }

  if (components.lighting) {
    parts.push(components.lighting);
  }

  if (components.atmosphere) {
    parts.push(components.atmosphere);
  }

  return parts.join(', ');
}

/**
 * Template: Dual Character Beat
 * [SHOT_TYPE] of a [TRIGGER1] ([desc1]) on left and a [TRIGGER2] ([desc2]) on right,
 * [INTERACTION], in [LOCATION], [LIGHTING], [ATMOSPHERE] <face_segments>
 */
function assembleDualCharacterPrompt(components: PromptComponents): string {
  const parts: string[] = [];

  parts.push(components.shotType);

  // Left character
  if (components.trigger) {
    parts.push(`of a ${components.trigger}`);
    if (components.characterDescription) {
      parts.push(`(${components.characterDescription}) on left`);
    }
  }

  // Right character
  if (components.secondTrigger) {
    parts.push(`and a ${components.secondTrigger}`);
    if (components.secondCharacterDescription) {
      parts.push(`(${components.secondCharacterDescription}) on right`);
    }
  }

  // Interaction
  if (components.interaction) {
    parts.push(components.interaction);
  }

  if (components.locationShorthand) {
    parts.push(`in ${components.locationShorthand}`);
  }

  if (components.lighting) {
    parts.push(components.lighting);
  }

  if (components.atmosphere) {
    parts.push(components.atmosphere);
  }

  let prompt = parts.join(', ');

  // Dual face segments
  if (components.faceSegment) {
    prompt += ` ${components.faceSegment}`;
  }
  if (components.secondFaceSegment) {
    prompt += ` ${components.secondFaceSegment}`;
  }

  return prompt;
}

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface PromptComponents {
  // Shot/framing
  shotType: ShotType;
  cameraAngle: CameraAngle;

  // Character (primary)
  trigger?: string;
  characterDescription?: string;
  genericDescription?: string;
  action?: string;
  expression?: string;

  // Character (secondary for dual)
  secondTrigger?: string;
  secondCharacterDescription?: string;
  interaction?: string;

  // Environment
  subjectDescription?: string;
  locationShorthand?: string;
  lighting?: string;
  atmosphere?: string;

  // Segments
  clothingSegment?: string;
  faceSegment?: string;
  secondFaceSegment?: string;
}

export interface BeatInput {
  beatId: string;
  beatScriptText: string;
  characters: string[];
  characterPositioning?: string;
  emotionalTone?: string;
  locationAttributes?: string[];
  visualSignificance?: string;
  imageDecision?: { type: string; reason?: string };
  cameraAngleSuggestion?: string;

  // From database (optional)
  trigger?: string;
  characterDescription?: string;
  locationShorthand?: string;
  clothingSegment?: string;
  faceSegment?: string;

  // Context
  gearContext?: 'off_duty' | 'field_op' | 'suit_up' | null;
  timeOfDay?: TimeOfDay;
}

export interface SceneContext {
  sceneNumber: number;
  sceneRole: string;
  totalBeats: number;
  intensity?: number;
  pacing?: string;
  arcPhase?: ArcPhase;
  isAdBreakScene?: boolean;
}

export interface AssembledPrompt {
  beatId: string;
  prompt: string;
  beatType: BeatTypeResult;
  shotType: ShotType;
  cameraAngle: CameraAngle;
  varietyAdjustment: VarietyAdjustedShot;
  hookRecommendation?: HookRecommendation;
  arcPhaseGuidance?: string;
  warnings: string[];
}

// ============================================================================
// MAIN ASSEMBLY FUNCTION
// ============================================================================

/**
 * Assemble prompts for all beats in a scene.
 */
export function assembleScenePrompts(
  beats: BeatInput[],
  sceneContext: SceneContext
): AssembledPrompt[] {
  const results: AssembledPrompt[] = [];
  let varietyState = createVarietyState();

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const beatNumber = i + 1;

    const assembled = assembleBeatPrompt(
      beat,
      sceneContext,
      beatNumber,
      varietyState
    );

    results.push(assembled);

    // Update variety state for next beat
    varietyState = updateVarietyState(
      varietyState,
      assembled.shotType,
      assembled.cameraAngle
    );
  }

  return results;
}

/**
 * Assemble a single beat prompt with all SKILL.md rules applied.
 */
export function assembleBeatPrompt(
  beat: BeatInput,
  sceneContext: SceneContext,
  beatNumber: number,
  varietyState: SceneVarietyState
): AssembledPrompt {
  const warnings: string[] = [];

  // 1. Detect beat type
  const isEnvShot = isEnvironmentShotFromDescription(beat.beatScriptText);
  const helmetState = detectHelmetState(beat.beatScriptText);
  const beatTypeResult = detectBeatType(beat.characters, helmetState, isEnvShot);

  // 2. Determine arc phase
  const arcPhase = sceneContext.arcPhase ||
    inferArcPhaseFromSceneRole(sceneContext.sceneRole, beatNumber, sceneContext.totalBeats);

  // 3. Get phase-aware shot recommendation
  const phaseRec = getPhaseAwareShotRecommendation(
    arcPhase,
    beat.visualSignificance || 'Medium',
    sceneContext.intensity || 5,
    beatNumber,
    sceneContext.totalBeats
  );

  // 4. Check for visual hook (Beat 1 only)
  let hookRec: HookRecommendation | undefined;
  if (isHookBeat(beatNumber)) {
    const hookContext: HookContext = {
      gearContext: beat.gearContext || null,
      characterCount: beat.characters.length,
      hasCharacters: beat.characters.length > 0,
      isInterior: /\bint\./i.test(beat.beatScriptText),
      sceneIntensity: sceneContext.intensity || 5,
    };
    hookRec = getHookRecommendation(hookContext);
  }

  // 5. Determine shot type (from hook, phase rec, or beat suggestion)
  let proposedShot: ShotType = 'medium shot';
  let proposedAngle: CameraAngle = 'eye-level shot';

  if (hookRec && hookRec.hookType !== 'STANDARD') {
    // Hook beat - use hook recommendations
    proposedShot = hookRec.suggestedShotType;
    proposedAngle = hookRec.suggestedAngle;
  } else {
    // Use phase-aware recommendation as base
    proposedShot = phaseRec.recommendedShotType;
    proposedAngle = phaseRec.recommendedAngle;
  }

  // Override with beat-specific suggestion if provided
  if (beat.cameraAngleSuggestion) {
    const extracted = extractShotFromSuggestion(beat.cameraAngleSuggestion);
    if (extracted.shot) proposedShot = extracted.shot;
    if (extracted.angle) proposedAngle = extracted.angle;
  }

  // 6. Enforce anti-monotony
  const varietyAdjustment = enforceVariety(varietyState, proposedShot, proposedAngle);
  const finalShot = varietyAdjustment.adjustedShot;
  const finalAngle = varietyAdjustment.adjustedAngle;

  if (varietyAdjustment.wasAdjusted) {
    warnings.push(varietyAdjustment.adjustmentReason || 'Shot adjusted for variety');
  }

  // 7. Get lighting for time of day
  let lighting = 'natural lighting';
  if (beat.timeOfDay) {
    const timeOfDayLighting = getLightingForTimeOfDay(beat.timeOfDay);
    if (timeOfDayLighting.length > 0) {
      lighting = timeOfDayLighting.join(', ');
    }
  }

  // 8. Build prompt components
  const components: PromptComponents = {
    shotType: finalShot,
    cameraAngle: finalAngle,
    trigger: beat.trigger,
    characterDescription: beat.characterDescription,
    action: beat.characterPositioning,
    expression: beat.emotionalTone,
    locationShorthand: beat.locationShorthand ||
      (beat.locationAttributes ? beat.locationAttributes.slice(0, 3).join(', ') : undefined),
    lighting,
    atmosphere: extractAtmosphere(beat.beatScriptText),
    clothingSegment: beat.clothingSegment,
    faceSegment: beatTypeResult.faceVisible ? beat.faceSegment : undefined,
  };

  // 9. Assemble prompt based on beat type
  let prompt: string;

  switch (beatTypeResult.beatType) {
    case 'ENVIRONMENT_ONLY':
      components.subjectDescription = extractSubjectFromScript(beat.beatScriptText);
      prompt = assembleEnvironmentOnlyPrompt(components);
      break;

    case 'CHARACTER_GENERIC':
      components.genericDescription = beat.characters[0] || 'a figure';
      prompt = assembleGenericCharacterPrompt(components);
      break;

    case 'DUAL_CHARACTER':
      prompt = assembleDualCharacterPrompt(components);
      break;

    case 'CHARACTER_NO_FACE':
      // No face segment
      components.faceSegment = undefined;
      prompt = assembleCharacterWithFacePrompt(components);
      break;

    case 'CHARACTER_WITH_FACE':
    default:
      prompt = assembleCharacterWithFacePrompt(components);
      break;
  }

  // 10. Validate final prompt
  if (prompt.length > 500) {
    warnings.push(`Prompt length (${prompt.length} chars) may exceed token limit`);
  }

  return {
    beatId: beat.beatId,
    prompt,
    beatType: beatTypeResult,
    shotType: finalShot,
    cameraAngle: finalAngle,
    varietyAdjustment,
    hookRecommendation: hookRec,
    arcPhaseGuidance: phaseRec.reason,
    warnings,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract shot type and angle from camera suggestion text.
 */
function extractShotFromSuggestion(suggestion: string): { shot?: ShotType; angle?: CameraAngle } {
  const lower = suggestion.toLowerCase();

  let shot: ShotType | undefined;
  let angle: CameraAngle | undefined;

  // Shot type extraction
  if (lower.includes('extreme close')) shot = 'extreme close-up';
  else if (lower.includes('close-up') || lower.includes('closeup')) shot = 'close-up shot';
  else if (lower.includes('medium close')) shot = 'medium close-up';
  else if (lower.includes('cowboy')) shot = 'cowboy shot';
  else if (lower.includes('medium shot') || lower.includes('medium on')) shot = 'medium shot';
  else if (lower.includes('wide shot') || lower.includes('wide angle')) shot = 'wide shot';
  else if (lower.includes('establishing')) shot = 'establishing shot';
  else if (lower.includes('full body')) shot = 'full body shot';
  else if (lower.includes('macro')) shot = 'macro shot';

  // Angle extraction
  if (lower.includes('low angle')) angle = 'low angle shot';
  else if (lower.includes('high angle')) angle = 'high angle shot';
  else if (lower.includes('dutch') || lower.includes('tilted')) angle = 'Dutch angle';
  else if (lower.includes('overhead') || lower.includes("bird's eye")) angle = 'overhead shot';
  else if (lower.includes('profile')) angle = 'profile';
  else if (lower.includes('three-quarter') || lower.includes('3/4')) angle = 'three-quarter view';
  else if (lower.includes('front')) angle = 'front view';

  return { shot, angle };
}

/**
 * Extract subject description for environment shots.
 */
function extractSubjectFromScript(script: string): string {
  // Look for specific objects/elements mentioned
  const patterns = [
    /(?:shot of|close-up of|macro of)\s+([^,.]+)/i,
    /(?:showing|reveals?|displays?)\s+([^,.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = script.match(pattern);
    if (match) return match[1].trim();
  }

  // Fallback: extract first descriptive noun phrase
  const nounMatch = script.match(/(?:a|the|an)\s+([^,.]{3,30})/i);
  if (nounMatch) return nounMatch[1].trim();

  return 'the scene';
}

/**
 * Extract atmosphere keyword from script.
 */
function extractAtmosphere(script: string): string {
  const atmosphereKeywords = [
    'tense', 'clinical', 'haunted', 'eerie', 'calm', 'chaotic',
    'mysterious', 'peaceful', 'ominous', 'sterile', 'abandoned',
    'desolate', 'oppressive', 'serene', 'volatile'
  ];

  const lower = script.toLowerCase();
  for (const keyword of atmosphereKeywords) {
    if (lower.includes(keyword)) {
      return keyword;
    }
  }

  return 'atmospheric';
}

console.log('[PromptAssembly] Service loaded');
