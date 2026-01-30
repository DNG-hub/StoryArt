/**
 * Anti-Monotony Service
 *
 * Enforces visual variety to prevent repetitive shots.
 * Critical for YouTube monetization compliance (anti-slop).
 *
 * @see SKILL.md Section 14 and Section 4.7
 */

import type { ShotType, CameraAngle, LightingTerm } from './fluxVocabularyService';
import { FLUX_SHOT_TYPES, FLUX_CAMERA_ANGLES } from './fluxVocabularyService';

// ============================================================================
// VARIETY STATE TRACKING (Section 4.7)
// ============================================================================

export interface SceneVarietyState {
  recentShotTypes: ShotType[];      // Last 3 shot types used
  recentAngles: CameraAngle[];       // Last 3 angles used
  recentLighting: LightingTerm[];    // Last 3 lighting terms
  beatCount: number;
  consecutiveSameShot: number;       // Count of same shot type in a row
  consecutiveSameAngle: number;      // Count of same angle in a row
}

/**
 * Create fresh variety state for a new scene.
 */
export function createVarietyState(): SceneVarietyState {
  return {
    recentShotTypes: [],
    recentAngles: [],
    recentLighting: [],
    beatCount: 0,
    consecutiveSameShot: 0,
    consecutiveSameAngle: 0,
  };
}

/**
 * Update variety state after a beat.
 */
export function updateVarietyState(
  state: SceneVarietyState,
  shotType: ShotType,
  angle: CameraAngle,
  lighting?: LightingTerm
): SceneVarietyState {
  const newState = { ...state };

  // Update shot type tracking
  if (newState.recentShotTypes.length > 0 &&
      newState.recentShotTypes[newState.recentShotTypes.length - 1] === shotType) {
    newState.consecutiveSameShot++;
  } else {
    newState.consecutiveSameShot = 1;
  }
  newState.recentShotTypes.push(shotType);
  if (newState.recentShotTypes.length > 3) newState.recentShotTypes.shift();

  // Update angle tracking
  if (newState.recentAngles.length > 0 &&
      newState.recentAngles[newState.recentAngles.length - 1] === angle) {
    newState.consecutiveSameAngle++;
  } else {
    newState.consecutiveSameAngle = 1;
  }
  newState.recentAngles.push(angle);
  if (newState.recentAngles.length > 3) newState.recentAngles.shift();

  // Update lighting tracking
  if (lighting) {
    newState.recentLighting.push(lighting);
    if (newState.recentLighting.length > 3) newState.recentLighting.shift();
  }

  newState.beatCount++;

  return newState;
}

// ============================================================================
// ANTI-MONOTONY RULES (Section 14.4)
// ============================================================================

export interface MonotonyViolation {
  type: 'CONSECUTIVE_SHOT' | 'CONSECUTIVE_ANGLE' | 'REPEATED_PATTERN' | 'STATIC_POSE';
  severity: 'WARNING' | 'VIOLATION';
  message: string;
  suggestedAlternatives: string[];
}

/**
 * Check if proposed shot would violate anti-monotony rules.
 *
 * Rules from SKILL.md Section 14.4:
 * 1. No consecutive identical shot types (max 2 in a row)
 * 2. Expression must change if emotional tone changes
 * 3. Pose/action must change every 2-3 beats minimum
 * 4. Location elements rotate
 * 5. Vary camera angle at least every 3 beats
 */
export function checkMonotonyViolations(
  state: SceneVarietyState,
  proposedShot: ShotType,
  proposedAngle: CameraAngle
): MonotonyViolation[] {
  const violations: MonotonyViolation[] = [];

  // Rule 1: No more than 2 consecutive identical shot types
  if (state.consecutiveSameShot >= 2 &&
      state.recentShotTypes[state.recentShotTypes.length - 1] === proposedShot) {
    violations.push({
      type: 'CONSECUTIVE_SHOT',
      severity: 'VIOLATION',
      message: `Cannot use "${proposedShot}" - already used 2+ times consecutively`,
      suggestedAlternatives: getShotAlternatives(proposedShot, state.recentShotTypes),
    });
  }

  // Warning for same shot twice
  if (state.recentShotTypes.length > 0 &&
      state.recentShotTypes[state.recentShotTypes.length - 1] === proposedShot) {
    violations.push({
      type: 'CONSECUTIVE_SHOT',
      severity: 'WARNING',
      message: `Using "${proposedShot}" twice in a row - consider variety`,
      suggestedAlternatives: getShotAlternatives(proposedShot, state.recentShotTypes),
    });
  }

  // Rule 5: Vary angle at least every 3 beats
  if (state.consecutiveSameAngle >= 3 &&
      state.recentAngles[state.recentAngles.length - 1] === proposedAngle) {
    violations.push({
      type: 'CONSECUTIVE_ANGLE',
      severity: 'VIOLATION',
      message: `Must vary angle - "${proposedAngle}" used 3+ times`,
      suggestedAlternatives: getAngleAlternatives(proposedAngle, state.recentAngles),
    });
  }

  // Check for repeated pattern (A-B-A-B)
  if (state.recentShotTypes.length >= 2) {
    const pattern = detectRepeatingPattern(state.recentShotTypes, proposedShot);
    if (pattern) {
      violations.push({
        type: 'REPEATED_PATTERN',
        severity: 'WARNING',
        message: `Detected repeating pattern: ${pattern}`,
        suggestedAlternatives: getShotAlternatives(proposedShot, state.recentShotTypes),
      });
    }
  }

  return violations;
}

/**
 * Get alternative shot types avoiding recent ones.
 */
function getShotAlternatives(current: ShotType, recent: ShotType[]): string[] {
  const alternatives: ShotType[] = [];

  // Similar shot categories for natural alternatives
  const categoryMap: Record<string, ShotType[]> = {
    close: ['close-up shot', 'medium close-up', 'intimate close-up shot', 'extreme close-up'],
    medium: ['medium shot', 'medium close-up', 'cowboy shot', 'medium full shot'],
    wide: ['wide shot', 'full body shot', 'establishing shot', 'extreme wide shot'],
  };

  // Find current's category
  let currentCategory = 'medium';
  for (const [cat, shots] of Object.entries(categoryMap)) {
    if (shots.includes(current)) {
      currentCategory = cat;
      break;
    }
  }

  // Get alternatives from same category first, then other categories
  const sameCategoryAlts = categoryMap[currentCategory]?.filter(
    s => s !== current && !recent.includes(s)
  ) || [];

  // Add from other categories
  const otherAlts = Object.entries(categoryMap)
    .filter(([cat]) => cat !== currentCategory)
    .flatMap(([, shots]) => shots)
    .filter(s => !recent.includes(s));

  return [...sameCategoryAlts.slice(0, 2), ...otherAlts.slice(0, 2)];
}

/**
 * Get alternative angles avoiding recent ones.
 */
function getAngleAlternatives(current: CameraAngle, recent: CameraAngle[]): string[] {
  const allAngles: CameraAngle[] = [
    'eye-level shot', 'three-quarter view', 'low angle shot',
    'high angle shot', 'front view', 'side view', 'profile'
  ];

  return allAngles.filter(a => a !== current && !recent.includes(a)).slice(0, 3);
}

/**
 * Detect repeating patterns like A-B-A-B.
 */
function detectRepeatingPattern(recent: ShotType[], proposed: ShotType): string | null {
  if (recent.length < 2) return null;

  // Check for A-B-A pattern
  if (recent.length >= 2 &&
      recent[recent.length - 2] === proposed &&
      recent[recent.length - 1] !== proposed) {
    return `${proposed} → ${recent[recent.length - 1]} → ${proposed} (A-B-A)`;
  }

  return null;
}

// ============================================================================
// VARIETY ENFORCEMENT
// ============================================================================

export interface VarietyAdjustedShot {
  originalShot: ShotType;
  adjustedShot: ShotType;
  originalAngle: CameraAngle;
  adjustedAngle: CameraAngle;
  wasAdjusted: boolean;
  adjustmentReason: string | null;
  violations: MonotonyViolation[];
}

/**
 * Enforce variety by adjusting shot if needed.
 * Returns adjusted shot that doesn't violate monotony rules.
 */
export function enforceVariety(
  state: SceneVarietyState,
  proposedShot: ShotType,
  proposedAngle: CameraAngle
): VarietyAdjustedShot {
  const violations = checkMonotonyViolations(state, proposedShot, proposedAngle);

  // Filter to only VIOLATION severity (not warnings)
  const hardViolations = violations.filter(v => v.severity === 'VIOLATION');

  if (hardViolations.length === 0) {
    return {
      originalShot: proposedShot,
      adjustedShot: proposedShot,
      originalAngle: proposedAngle,
      adjustedAngle: proposedAngle,
      wasAdjusted: false,
      adjustmentReason: null,
      violations,
    };
  }

  // Need to adjust - find alternatives
  let adjustedShot = proposedShot;
  let adjustedAngle = proposedAngle;
  let reason = '';

  for (const violation of hardViolations) {
    if (violation.type === 'CONSECUTIVE_SHOT' && violation.suggestedAlternatives.length > 0) {
      adjustedShot = violation.suggestedAlternatives[0] as ShotType;
      reason += `Shot adjusted from "${proposedShot}" to "${adjustedShot}" (anti-monotony). `;
    }
    if (violation.type === 'CONSECUTIVE_ANGLE' && violation.suggestedAlternatives.length > 0) {
      adjustedAngle = violation.suggestedAlternatives[0] as CameraAngle;
      reason += `Angle adjusted from "${proposedAngle}" to "${adjustedAngle}" (anti-monotony). `;
    }
  }

  return {
    originalShot: proposedShot,
    adjustedShot,
    originalAngle: proposedAngle,
    adjustedAngle,
    wasAdjusted: true,
    adjustmentReason: reason.trim(),
    violations,
  };
}

// ============================================================================
// IMAGE DECISION TRACKING (Section 14.5)
// ============================================================================

export type ImageDecisionType = 'NEW_IMAGE' | 'REUSE_IMAGE' | 'VARIANT';

export interface ImageDecisionState {
  consecutiveReuse: number;
  lastDecision: ImageDecisionType | null;
}

/**
 * Check if REUSE_IMAGE is allowed (max 2 consecutive).
 */
export function canReuseImage(state: ImageDecisionState): boolean {
  return state.consecutiveReuse < 2;
}

/**
 * Update image decision state.
 */
export function updateImageDecisionState(
  state: ImageDecisionState,
  decision: ImageDecisionType
): ImageDecisionState {
  if (decision === 'REUSE_IMAGE') {
    return {
      consecutiveReuse: state.consecutiveReuse + 1,
      lastDecision: decision,
    };
  }
  return {
    consecutiveReuse: 0,
    lastDecision: decision,
  };
}

/**
 * Create initial image decision state.
 */
export function createImageDecisionState(): ImageDecisionState {
  return {
    consecutiveReuse: 0,
    lastDecision: null,
  };
}

console.log('[AntiMonotony] Service loaded');
