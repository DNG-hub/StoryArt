/**
 * Arc Phase Visual Mapping Service
 *
 * Maps narrative arc phases to visual treatment recommendations.
 *
 * @see SKILL.md Section 11
 */

import type { ShotType, CameraAngle, LightingTerm } from './fluxVocabularyService';

// ============================================================================
// ARC PHASES
// ============================================================================

export type ArcPhase = 'DORMANT' | 'RISING' | 'CLIMAX' | 'FALLING' | 'RESOLVED';

export interface ArcPhaseVisualGuidance {
  phase: ArcPhase;
  visualIntensity: 'neutral' | 'building' | 'maximum' | 'consequences' | 'closure';
  preferredShotTypes: ShotType[];
  preferredAngles: CameraAngle[];
  lightingStyle: 'standard' | 'dramatic' | 'soft';
  framingTendency: string;
}

// ============================================================================
// PHASE -> VISUAL MAPPING (Section 11.1)
// ============================================================================

const ARC_PHASE_VISUALS: Record<ArcPhase, ArcPhaseVisualGuidance> = {
  DORMANT: {
    phase: 'DORMANT',
    visualIntensity: 'neutral',
    preferredShotTypes: ['medium shot', 'wide shot', 'establishing shot'],
    preferredAngles: ['eye-level shot', 'three-quarter view'],
    lightingStyle: 'standard',
    framingTendency: 'Standard shots, no drama - arc is background',
  },
  RISING: {
    phase: 'RISING',
    visualIntensity: 'building',
    preferredShotTypes: ['medium shot', 'medium close-up', 'cowboy shot'],
    preferredAngles: ['three-quarter view', 'low angle shot', 'eye-level shot'],
    lightingStyle: 'standard',
    framingTendency: 'Tighter framing, building variety, more angles',
  },
  CLIMAX: {
    phase: 'CLIMAX',
    visualIntensity: 'maximum',
    preferredShotTypes: ['close-up shot', 'intimate close-up shot', 'extreme close-up'],
    preferredAngles: ['low angle shot', 'front view', 'Dutch angle'],
    lightingStyle: 'dramatic',
    framingTendency: 'Maximum intensity - close-ups, dramatic lighting, power angles',
  },
  FALLING: {
    phase: 'FALLING',
    visualIntensity: 'consequences',
    preferredShotTypes: ['medium shot', 'medium close-up', 'wide shot'],
    preferredAngles: ['eye-level shot', 'three-quarter view', 'high angle shot'],
    lightingStyle: 'soft',
    framingTendency: 'Softer, reflective framing - showing consequences',
  },
  RESOLVED: {
    phase: 'RESOLVED',
    visualIntensity: 'closure',
    preferredShotTypes: ['wide shot', 'medium shot', 'establishing shot'],
    preferredAngles: ['eye-level shot', 'wide shot'],
    lightingStyle: 'soft',
    framingTendency: 'Wide shots, peaceful lighting - closure',
  },
};

// ============================================================================
// INTENSITY SCORE -> VISUAL TREATMENT (Section 11.3)
// ============================================================================

export interface IntensityVisualTreatment {
  intensityScore: number;
  treatment: 'standard' | 'enhanced' | 'dramatic';
  shotTypeBoost: ShotType[];
  angleBoost: CameraAngle[];
  lightingBoost: LightingTerm[];
}

/**
 * Get visual treatment based on arc intensity score.
 * High priority arcs (7+) get more dramatic treatment.
 *
 * @param intensityScore - Arc priority/intensity (typically 1-10)
 */
export function getIntensityTreatment(intensityScore: number): IntensityVisualTreatment {
  if (intensityScore >= 7) {
    return {
      intensityScore,
      treatment: 'dramatic',
      shotTypeBoost: ['close-up shot', 'intimate close-up shot', 'extreme close-up'],
      angleBoost: ['low angle shot', 'Dutch angle'],
      lightingBoost: ['dramatic lighting', 'rim lighting', 'harsh lighting'],
    };
  } else if (intensityScore >= 4) {
    return {
      intensityScore,
      treatment: 'enhanced',
      shotTypeBoost: ['medium close-up', 'cowboy shot'],
      angleBoost: ['three-quarter view', 'low angle shot'],
      lightingBoost: ['side lighting', 'volumetric lighting'],
    };
  } else {
    return {
      intensityScore,
      treatment: 'standard',
      shotTypeBoost: ['medium shot', 'wide shot'],
      angleBoost: ['eye-level shot'],
      lightingBoost: ['natural lighting', 'soft lighting'],
    };
  }
}

// ============================================================================
// PHASE-AWARE SHOT SELECTION (Section 11.2)
// ============================================================================

export interface PhaseAwareShotRecommendation {
  recommendedShotType: ShotType;
  recommendedAngle: CameraAngle;
  lightingStyle: 'standard' | 'dramatic' | 'soft';
  reason: string;
}

/**
 * Get phase-aware shot recommendation.
 *
 * @param arcPhase - Current arc phase
 * @param visualSignificance - Beat visual significance ('Low', 'Medium', 'High', 'Critical')
 * @param intensityScore - Arc intensity/priority score
 * @param beatPosition - Position in scene (1-indexed)
 * @param totalBeats - Total beats in scene
 */
export function getPhaseAwareShotRecommendation(
  arcPhase: ArcPhase,
  visualSignificance: string,
  intensityScore: number = 5,
  beatPosition: number = 1,
  totalBeats: number = 4
): PhaseAwareShotRecommendation {
  const phaseVisuals = ARC_PHASE_VISUALS[arcPhase];
  const intensityTreatment = getIntensityTreatment(intensityScore);

  // High significance + CLIMAX phase = dramatic treatment
  const isHighSignificance = visualSignificance === 'High' || visualSignificance === 'Critical';
  const isClimaxPhase = arcPhase === 'CLIMAX';
  const isRisingPhase = arcPhase === 'RISING';
  const isFallingPhase = arcPhase === 'FALLING' || arcPhase === 'RESOLVED';

  // Position-based adjustments
  const isOpeningBeat = beatPosition === 1;
  const isClosingBeat = beatPosition === totalBeats;
  const isMidScene = !isOpeningBeat && !isClosingBeat;

  let recommendedShot: ShotType;
  let recommendedAngle: CameraAngle;
  let reason: string;

  // CLIMAX + High significance = maximum drama
  if (isClimaxPhase && isHighSignificance) {
    recommendedShot = 'close-up shot';
    recommendedAngle = intensityScore >= 7 ? 'low angle shot' : 'front view';
    reason = 'CLIMAX phase with high significance - maximum dramatic impact';
  }
  // RISING phase - build tension over beats
  else if (isRisingPhase) {
    if (isOpeningBeat) {
      recommendedShot = 'medium shot';
      recommendedAngle = 'three-quarter view';
      reason = 'RISING phase opening - establish before building';
    } else if (isClosingBeat) {
      recommendedShot = isHighSignificance ? 'close-up shot' : 'medium close-up';
      recommendedAngle = 'low angle shot';
      reason = 'RISING phase closing - peak tension before next scene';
    } else {
      recommendedShot = 'medium close-up';
      recommendedAngle = 'three-quarter view';
      reason = 'RISING phase mid-scene - building tension';
    }
  }
  // FALLING/RESOLVED - softer, more breathing room
  else if (isFallingPhase) {
    recommendedShot = isClosingBeat ? 'wide shot' : 'medium shot';
    recommendedAngle = 'eye-level shot';
    reason = `${arcPhase} phase - softer framing, reflective mood`;
  }
  // DORMANT - standard treatment
  else {
    recommendedShot = phaseVisuals.preferredShotTypes[0];
    recommendedAngle = phaseVisuals.preferredAngles[0];
    reason = 'DORMANT phase - standard visual treatment';
  }

  // Apply intensity boost if high
  if (intensityTreatment.treatment === 'dramatic' && !isFallingPhase) {
    if (intensityTreatment.shotTypeBoost.length > 0) {
      recommendedShot = intensityTreatment.shotTypeBoost[0];
    }
    reason += ` (intensity ${intensityScore}/10 - dramatic boost)`;
  }

  return {
    recommendedShotType: recommendedShot,
    recommendedAngle: recommendedAngle,
    lightingStyle: phaseVisuals.lightingStyle,
    reason,
  };
}

/**
 * Get visual guidance for an arc phase.
 */
export function getArcPhaseGuidance(phase: ArcPhase): ArcPhaseVisualGuidance {
  return ARC_PHASE_VISUALS[phase];
}

/**
 * Determine arc phase from scene role and beat position.
 * This is a fallback when arc phase isn't explicitly provided.
 */
export function inferArcPhaseFromSceneRole(
  sceneRole: string,
  beatPosition: number,
  totalBeats: number
): ArcPhase {
  const role = sceneRole.toLowerCase();

  // Scene role -> likely arc phase
  if (role.includes('setup') || role.includes('hook')) {
    return beatPosition <= Math.ceil(totalBeats / 2) ? 'RISING' : 'RISING';
  }
  if (role.includes('development')) {
    return 'RISING';
  }
  if (role.includes('escalation')) {
    return beatPosition >= totalBeats - 1 ? 'CLIMAX' : 'RISING';
  }
  if (role.includes('climax')) {
    return 'CLIMAX';
  }
  if (role.includes('resolution') || role.includes('falling')) {
    return 'FALLING';
  }

  // Default based on position
  const progressRatio = beatPosition / totalBeats;
  if (progressRatio <= 0.25) return 'DORMANT';
  if (progressRatio <= 0.5) return 'RISING';
  if (progressRatio <= 0.75) return 'CLIMAX';
  return 'FALLING';
}

console.log('[ArcPhaseVisual] Service loaded');
