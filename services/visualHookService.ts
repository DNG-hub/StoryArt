/**
 * Visual Hook Detection Service
 *
 * Implements 3-second retention strategy for YouTube.
 * Hooks create visual curiosity WITHOUT changing the story.
 *
 * @see SKILL.md Section 11B
 */

import type { ShotType, CameraAngle } from './fluxVocabularyService';

// ============================================================================
// HOOK TYPES
// ============================================================================

export type HookType =
  | 'PROVOCATIVE_POSE'     // Character in intriguing position
  | 'INTIMATE_FRAMING'     // Close-up suggesting vulnerability
  | 'UNEXPLAINED_ELEMENT'  // Something raises questions
  | 'ACTION_FREEZE'        // Caught mid-motion
  | 'TENSION_BETWEEN'      // Two characters, unresolved positioning
  | 'ENVIRONMENTAL_DREAD'  // Location with ominous element
  | 'OBJECT_FOCUS'         // Significant item, unclear purpose
  | 'STANDARD';            // No special hook needed

// ============================================================================
// HOOK CONTEXT CONSTRAINTS (Section 11B.4)
// ============================================================================

export interface HookContext {
  gearContext: 'off_duty' | 'field_op' | 'suit_up' | null;
  characterCount: number;
  hasCharacters: boolean;
  isInterior: boolean;
  sceneIntensity: number; // 1-10
}

/**
 * Get available hook types based on context.
 * Not all hooks are available in all contexts.
 */
export function getAvailableHooks(context: HookContext): HookType[] {
  const available: HookType[] = ['STANDARD'];

  // No characters = environment hooks only
  if (!context.hasCharacters || context.characterCount === 0) {
    available.push('ENVIRONMENTAL_DREAD', 'OBJECT_FOCUS', 'UNEXPLAINED_ELEMENT');
    return available;
  }

  // Single character hooks
  if (context.characterCount === 1) {
    available.push('INTIMATE_FRAMING', 'UNEXPLAINED_ELEMENT', 'OBJECT_FOCUS');

    // Off-duty allows vulnerability/intimacy
    if (context.gearContext === 'off_duty' || context.gearContext === null) {
      available.push('PROVOCATIVE_POSE');
    }

    // Field op allows action freeze
    if (context.gearContext === 'field_op') {
      available.push('ACTION_FREEZE');
    }
  }

  // Dual+ character hooks
  if (context.characterCount >= 2) {
    available.push('TENSION_BETWEEN', 'UNEXPLAINED_ELEMENT');

    if (context.gearContext === 'field_op') {
      available.push('ACTION_FREEZE');
    }
  }

  return available;
}

// ============================================================================
// HOOK EFFORT CALCULATION (Section 11B.8)
// ============================================================================

export type HookEffort = 'HIGHER' | 'MEDIUM' | 'LOWER';

/**
 * Calculate how much hook effort is needed based on scene intensity.
 * Low intensity scenes need more visual hook effort.
 */
export function calculateHookEffort(sceneIntensity: number): HookEffort {
  // Calm (1-3): Narrative won't carry, visual must compensate
  if (sceneIntensity <= 3) return 'HIGHER';

  // Building/Falling (4-6): Enhance what's already building
  if (sceneIntensity <= 6) return 'MEDIUM';

  // Peak (7-9): Narrative drama does the work
  return 'LOWER';
}

// ============================================================================
// HOOK RECOMMENDATIONS
// ============================================================================

export interface HookRecommendation {
  hookType: HookType;
  hookEffort: HookEffort;
  suggestedShotType: ShotType;
  suggestedAngle: CameraAngle;
  framingNotes: string;
  grabElement: string;  // What creates curiosity
  notReveal: string;    // What must NOT be spoiled
}

/**
 * Generate hook recommendation for Beat 1 of a scene.
 *
 * @param context - Scene context (gear, characters, location type)
 * @param sceneIntensity - Intensity level (1-10)
 * @param hasLaterReveal - Whether scene has a reveal/twist later
 * @param hasEmotionalPeak - Whether scene has emotional moment later
 * @param hasActionSequence - Whether scene has action later
 */
export function getHookRecommendation(
  context: HookContext,
  hasLaterReveal: boolean = false,
  hasEmotionalPeak: boolean = false,
  hasActionSequence: boolean = false
): HookRecommendation {
  const effort = calculateHookEffort(context.sceneIntensity);
  const available = getAvailableHooks(context);

  let hookType: HookType = 'STANDARD';
  let shotType: ShotType = 'medium shot';
  let angle: CameraAngle = 'eye-level shot';
  let framingNotes = '';
  let grabElement = '';
  let notReveal = '';

  // HIGHER effort needed - must find strong hook
  if (effort === 'HIGHER') {
    // Environment-only with no characters
    if (!context.hasCharacters) {
      hookType = 'ENVIRONMENTAL_DREAD';
      shotType = 'establishing shot';
      angle = 'low angle shot';
      framingNotes = 'Show location with ominous element - something feels wrong';
      grabElement = 'Visual unease in the environment';
      notReveal = 'What specifically is dangerous';
    }
    // Single character, off duty
    else if (context.characterCount === 1 && context.gearContext !== 'field_op') {
      if (hasEmotionalPeak && available.includes('INTIMATE_FRAMING')) {
        hookType = 'INTIMATE_FRAMING';
        shotType = 'medium close-up';
        angle = 'three-quarter view';
        framingNotes = 'Close framing suggests vulnerability to come';
        grabElement = 'Hint of emotional depth';
        notReveal = 'The specific emotional moment';
      } else if (available.includes('PROVOCATIVE_POSE')) {
        hookType = 'PROVOCATIVE_POSE';
        shotType = 'medium shot';
        angle = 'three-quarter view';
        framingNotes = 'Intriguing pose that draws viewer in';
        grabElement = 'Character in compelling state';
        notReveal = 'Why they are in this state';
      }
    }
    // Dual characters
    else if (context.characterCount >= 2) {
      hookType = 'TENSION_BETWEEN';
      shotType = 'medium shot';
      angle = 'eye-level shot';
      framingNotes = 'Position characters to suggest unresolved tension';
      grabElement = 'Relationship dynamic visible';
      notReveal = 'How the tension resolves';
    }
    // Fallback
    else {
      hookType = 'UNEXPLAINED_ELEMENT';
      shotType = 'medium shot';
      angle = 'three-quarter view';
      framingNotes = 'Include element that raises questions';
      grabElement = 'Something unexplained in frame';
      notReveal = 'The explanation for the element';
    }
  }
  // MEDIUM effort - enhance what's building
  else if (effort === 'MEDIUM') {
    if (hasLaterReveal && available.includes('UNEXPLAINED_ELEMENT')) {
      hookType = 'UNEXPLAINED_ELEMENT';
      shotType = 'medium shot';
      angle = 'three-quarter view';
      framingNotes = 'Include subtle element that will matter later';
      grabElement = 'Something slightly off';
      notReveal = 'What the element means';
    } else if (hasActionSequence && available.includes('ACTION_FREEZE')) {
      hookType = 'ACTION_FREEZE';
      shotType = 'medium shot';
      angle = 'low angle shot';
      framingNotes = 'Suggest impending action through posture';
      grabElement = 'Character ready for something';
      notReveal = 'What action is coming';
    } else if (context.characterCount >= 2) {
      hookType = 'TENSION_BETWEEN';
      shotType = 'medium shot';
      angle = 'eye-level shot';
      framingNotes = 'Positioning hints at relationship dynamics';
      grabElement = 'Character positioning';
      notReveal = 'How interaction develops';
    } else {
      hookType = 'STANDARD';
      shotType = 'medium shot';
      angle = 'three-quarter view';
      framingNotes = 'Standard engaging framing';
      grabElement = 'Character engagement';
      notReveal = 'Scene developments';
    }
  }
  // LOWER effort - narrative carries
  else {
    hookType = 'STANDARD';
    shotType = context.hasCharacters ? 'medium close-up' : 'establishing shot';
    angle = 'eye-level shot';
    framingNotes = 'Narrative intensity carries engagement';
    grabElement = 'Story tension already high';
    notReveal = 'Let narrative speak';
  }

  return {
    hookType,
    hookEffort: effort,
    suggestedShotType: shotType,
    suggestedAngle: angle,
    framingNotes,
    grabElement,
    notReveal,
  };
}

// ============================================================================
// HOOK VALIDATION (Section 11B.11)
// ============================================================================

/**
 * Validate that a hook satisfies "Grab But Not Reveal" principle.
 *
 * Every hook must:
 * 1. GRAB - Creates enough curiosity that viewer stays past 3 seconds
 * 2. NOT REVEAL - Doesn't spoil what makes the scene worth watching
 */
export function validateHook(
  hookType: HookType,
  grabsAttention: boolean,
  revealsOutcome: boolean
): { valid: boolean; reason: string } {
  // Standard hooks don't need validation
  if (hookType === 'STANDARD') {
    return { valid: true, reason: 'Standard hook - no special validation needed' };
  }

  // Must grab attention
  if (!grabsAttention) {
    return { valid: false, reason: 'Hook fails to create curiosity (no grab)' };
  }

  // Must not reveal outcome
  if (revealsOutcome) {
    return { valid: false, reason: 'Hook reveals too much (spoils scene)' };
  }

  return { valid: true, reason: 'Hook grabs attention without revealing outcome' };
}

/**
 * Check if this is Beat 1 of a scene (where hooks apply).
 */
export function isHookBeat(beatNumber: number): boolean {
  return beatNumber === 1;
}

/**
 * Get hook description for logging/debugging.
 */
export function describeHook(recommendation: HookRecommendation): string {
  return `[${recommendation.hookType}] ${recommendation.hookEffort} effort | ` +
         `Shot: ${recommendation.suggestedShotType}, ${recommendation.suggestedAngle} | ` +
         `Grab: ${recommendation.grabElement} | Do not reveal: ${recommendation.notReveal}`;
}

console.log('[VisualHook] Service loaded');
