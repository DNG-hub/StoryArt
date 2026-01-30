/**
 * FLUX Vocabulary Service
 *
 * Provides validated FLUX.1-Dev terminology for image prompt generation.
 * All terms are validated for HIGH reliability in FLUX image generation.
 *
 * @see .claude/skills/prompt-generation-rules/FLUX_VOCABULARY.md
 * @see SKILL.md Section 5
 */

// ============================================================================
// SHOT TYPES (Section 5.1 - HIGH RELIABILITY)
// ============================================================================

export const FLUX_SHOT_TYPES = {
  // Portrait/Character Framing
  EXTREME_CLOSE_UP: 'extreme close-up',
  CLOSE_UP: 'close-up shot',
  INTIMATE_CLOSE_UP: 'intimate close-up shot',
  MEDIUM_CLOSE_UP: 'medium close-up',
  MEDIUM: 'medium shot',
  UPPER_BODY_PORTRAIT: 'upper-body portrait',
  COWBOY: 'cowboy shot',
  MEDIUM_FULL: 'medium full shot',
  FULL_BODY: 'full body shot',
  COMPLETE_FIGURE: 'complete figure shot',
  STANDING_FULL_BODY: 'standing full body shot',

  // Scene Framing
  WIDE: 'wide shot',
  EXTREME_WIDE: 'extreme wide shot',
  ESTABLISHING: 'establishing shot',

  // Specialty
  MACRO: 'macro shot',
  FORENSIC: 'forensic shot',
  SILHOUETTE: 'silhouette shot',
  PORTRAIT_PHOTOGRAPH: 'portrait photograph',
} as const;

export const FLUX_SHOT_TYPE_VALUES = Object.values(FLUX_SHOT_TYPES);

// Shot type categories for scene role matching
export const SHOT_TYPE_CATEGORIES = {
  WIDE: [FLUX_SHOT_TYPES.WIDE, FLUX_SHOT_TYPES.EXTREME_WIDE, FLUX_SHOT_TYPES.ESTABLISHING],
  MEDIUM: [FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.MEDIUM_FULL, FLUX_SHOT_TYPES.COWBOY, FLUX_SHOT_TYPES.UPPER_BODY_PORTRAIT],
  CLOSE: [FLUX_SHOT_TYPES.CLOSE_UP, FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP, FLUX_SHOT_TYPES.INTIMATE_CLOSE_UP],
  EXTREME_CLOSE: [FLUX_SHOT_TYPES.EXTREME_CLOSE_UP, FLUX_SHOT_TYPES.MACRO],
  SPECIALTY: [FLUX_SHOT_TYPES.FORENSIC, FLUX_SHOT_TYPES.SILHOUETTE, FLUX_SHOT_TYPES.PORTRAIT_PHOTOGRAPH],
};

// ============================================================================
// CAMERA ANGLES (Section 5.2 - MEDIUM-HIGH RELIABILITY)
// ============================================================================

export const FLUX_CAMERA_ANGLES = {
  // Vertical Angles
  EYE_LEVEL: 'eye-level shot',
  LOW_ANGLE: 'low angle shot',
  HIGH_ANGLE: 'high angle shot',
  WORMS_EYE: 'worms-eye view',
  BIRDS_EYE: 'birds-eye view',
  OVERHEAD: 'overhead shot',
  DUTCH: 'Dutch angle',

  // Horizontal Positioning
  FRONT_VIEW: 'front view',
  SIDE_VIEW: 'side view',
  PROFILE: 'profile',
  THREE_QUARTER: 'three-quarter view',
  BACK_VIEW: 'back view',
} as const;

export const FLUX_CAMERA_ANGLE_VALUES = Object.values(FLUX_CAMERA_ANGLES);

// ============================================================================
// VIEW DIRECTIONS (HIGH RELIABILITY)
// ============================================================================

export const FLUX_VIEW_DIRECTIONS = {
  FACING_CAMERA: 'facing the camera',
  FACING_LEFT: 'facing left',
  FACING_RIGHT: 'facing right',
  FACING_AWAY: 'facing away',
  TURNED_AWAY: 'turned slightly away',
  IN_PROFILE: 'in profile',
  BACK_TO_CAMERA: 'back to camera',
} as const;

export const FLUX_VIEW_DIRECTION_VALUES = Object.values(FLUX_VIEW_DIRECTIONS);

// ============================================================================
// POSE DESCRIPTIONS (Section 5.3 - HIGH RELIABILITY)
// ============================================================================

export const FLUX_POSES = {
  // Standing
  STANDING_TALL: 'standing tall',
  STANDING_ATTENTION: 'standing at attention',
  ARMS_CROSSED: 'standing with arms crossed',
  HANDS_ON_HIPS: 'standing with hands on hips',
  HANDS_AT_SIDES: 'standing with hands at sides',
  STANDING_GUARD: 'standing guard',
  STANDING_DOORWAY: 'standing in doorway',
  LEANING_WALL: 'leaning against wall',

  // Action
  KNEELING_EXAMINE: 'kneeling to examine',
  CROUCHING: 'crouching',
  RIFLE_RAISED: 'rifle raised',
  WEAPON_DRAWN: 'weapon drawn',
  SCANNING_PERIMETER: 'scanning perimeter',
  REACHING_TOWARD: 'reaching toward',
  HOLDING_OBJECT: 'holding',
  EXAMINING_OBJECT: 'examining',

  // Seated
  SEATED_TERMINAL: 'seated at terminal',
  SITTING_LEG_BENT: 'sitting with one leg bent',
  SITTING_CROSS_LEGGED: 'sitting cross-legged',
} as const;

export const FLUX_POSE_VALUES = Object.values(FLUX_POSES);

// ============================================================================
// GAZE DIRECTIONS (HIGH RELIABILITY)
// ============================================================================

export const FLUX_GAZE = {
  AT_CAMERA: 'looking at the camera',
  DIRECT_CAMERA: 'looking directly at the camera lens',
  EYES_LOCKED: 'eyes locked on the camera',
  LOOKING_AWAY: 'looking away',
  LOOKING_LEFT: 'looking to the left',
  LOOKING_RIGHT: 'looking to the right',
  LOOKING_DOWN: 'looking down',
  LOOKING_UP: 'looking up',
  STARING_DISTANCE: 'staring into distance',
  EYES_SCANNING: 'eyes scanning',
  AVERTED_EYES: 'averted eyes',
} as const;

export const FLUX_GAZE_VALUES = Object.values(FLUX_GAZE);

// ============================================================================
// EXPRESSION KEYWORDS (Section 5.4 - HIGH RELIABILITY)
// ============================================================================

export const FLUX_EXPRESSIONS = {
  // Neutral
  NEUTRAL: 'neutral expression',
  CALM: 'calm face',
  STOIC: 'stoic expression',

  // Focused
  INTENSE_FOCUS: 'intense focus',
  ANALYTICAL_GAZE: 'analytical gaze',
  EXAMINING: 'examining closely',
  CONCENTRATED: 'concentrated',

  // Alert
  ALERT: 'alert expression',
  EYES_SCANNING: 'eyes scanning',
  WATCHFUL: 'watchful',
  VIGILANT: 'vigilant',

  // Determined
  DETERMINED: 'determined expression',
  JAW_SET: 'jaw set',
  STEELY_GAZE: 'steely gaze',
  RESOLUTE: 'resolute',

  // Worried
  CONCERNED: 'concerned expression',
  FURROWED_BROW: 'furrowed brow',
  WORRIED: 'worried look',

  // Fear
  SUPPRESSED_FEAR: 'suppressed fear',
  WIDE_EYES: 'wide eyes',
  TENSE: 'tense expression',

  // Confident
  CONFIDENT_SMILE: 'confident smile',
  SELF_ASSURED: 'self-assured expression',

  // Vulnerable
  SOFT_EXPRESSION: 'soft expression',
  GUARD_LOWERED: 'guard lowered',
  VULNERABLE: 'vulnerable moment',
} as const;

export const FLUX_EXPRESSION_VALUES = Object.values(FLUX_EXPRESSIONS);

// ============================================================================
// LIGHTING (Section 5.5 - HIGH RELIABILITY)
// ============================================================================

export const FLUX_LIGHTING = {
  // Quality
  SOFT: 'soft lighting',
  HARSH: 'harsh lighting',
  DRAMATIC: 'dramatic lighting',
  NATURAL: 'natural lighting',
  STUDIO: 'studio lighting',
  VOLUMETRIC: 'volumetric lighting',

  // Direction
  RIM: 'rim lighting',
  SIDE: 'side lighting',
  BACKLIT: 'backlit',
  FRONT: 'front lighting',
  OVERHEAD: 'overhead lighting',

  // Time of Day / Color
  GOLDEN_HOUR: 'golden hour',
  BLUE_HOUR: 'blue hour',
  HARSH_MIDDAY: 'harsh midday sun',
  OVERCAST: 'overcast lighting',
  NEON: 'neon lighting',
  CANDLELIGHT: 'candlelight',
  COLD_BLUE: 'cold blue lighting',
  WARM_AMBER: 'warm amber lighting',
  CLINICAL_WHITE: 'clinical white lighting',
  FLICKERING_EMERGENCY: 'flickering emergency lights',
} as const;

export const FLUX_LIGHTING_VALUES = Object.values(FLUX_LIGHTING);

// ============================================================================
// DEPTH & COMPOSITION (MEDIUM RELIABILITY)
// ============================================================================

export const FLUX_COMPOSITION = {
  SHALLOW_DOF: 'shallow depth of field',
  DEEP_DOF: 'deep depth of field',
  BOKEH: 'bokeh background',
  CENTERED: 'centered composition',
  SYMMETRICAL: 'symmetrical composition',
  FOREGROUND: 'foreground elements',
  FRAMED_DOORWAY: 'framed by doorway',
} as const;

// ============================================================================
// QUALITY MODIFIERS
// ============================================================================

export const FLUX_QUALITY = {
  CINEMATIC: 'cinematic shot',
  PHOTOREALISTIC: 'photorealistic',
  ULTRA_DETAILED: 'ultra-detailed',
  HYPER_REALISTIC: 'hyper-realistic',
} as const;

// ============================================================================
// TIME OF DAY -> LIGHTING MAPPING (Section 13.2)
// ============================================================================

export type TimeOfDay =
  | 'pre_dawn'
  | 'morning'
  | 'midday'
  | 'golden_hour'
  | 'dusk'
  | 'early_night'      // Just after dusk, some ambient sky glow remains
  | 'night_interior'
  | 'night_exterior'
  | 'deep_night'       // Darkest part of night, minimal ambient light
  | 'deep_night_interior'
  | 'deep_night_exterior';

export const TIME_OF_DAY_LIGHTING: Record<TimeOfDay, string[]> = {
  pre_dawn: ['blue hour', 'cold light', 'cold blue lighting'],
  morning: ['soft natural lighting', 'warm', 'natural lighting'],
  midday: ['harsh overhead', 'high contrast', 'harsh midday sun'],
  golden_hour: ['golden hour', 'warm amber', 'warm amber lighting'],
  dusk: ['blue hour', 'fading light', 'warm to cool transition'],
  early_night: ['twilight remnants', 'emerging stars', 'deep blue ambient'],
  night_interior: ['artificial lighting', 'screen glow', 'cold blue lighting'],
  night_exterior: ['moonlight', 'deep shadows', 'cool blue tones'],
  deep_night: ['minimal ambient light', 'deep shadows', 'isolated light sources'],
  deep_night_interior: ['harsh artificial contrast', 'deep shadows', 'isolated pools of light'],
  deep_night_exterior: ['faint moonlight', 'near-darkness', 'silhouette lighting'],
};

/**
 * Get recommended lighting for a time of day
 */
export function getLightingForTimeOfDay(timeOfDay: string | null | undefined): string[] {
  if (!timeOfDay) return [FLUX_LIGHTING.NATURAL];

  const normalized = timeOfDay.toLowerCase().replace(/\s+/g, '_');

  // Direct match
  if (TIME_OF_DAY_LIGHTING[normalized as TimeOfDay]) {
    return TIME_OF_DAY_LIGHTING[normalized as TimeOfDay];
  }

  // Partial matches for common shorthand (order matters - check specific before general)

  // Night progression (check specific variants first)
  if (normalized.includes('deep') && normalized.includes('night')) {
    if (normalized.includes('exterior') || normalized.includes('outside')) {
      return TIME_OF_DAY_LIGHTING.deep_night_exterior;
    }
    if (normalized.includes('interior') || normalized.includes('inside')) {
      return TIME_OF_DAY_LIGHTING.deep_night_interior;
    }
    return TIME_OF_DAY_LIGHTING.deep_night;
  }
  if (normalized.includes('early') && normalized.includes('night')) {
    return TIME_OF_DAY_LIGHTING.early_night;
  }
  if (normalized.includes('night')) {
    if (normalized.includes('exterior') || normalized.includes('outside')) {
      return TIME_OF_DAY_LIGHTING.night_exterior;
    }
    // Default to interior for just "night"
    return TIME_OF_DAY_LIGHTING.night_interior;
  }

  // Twilight transitions
  if (normalized.includes('twilight')) {
    return TIME_OF_DAY_LIGHTING.dusk;
  }
  if (normalized.includes('dusk') || normalized.includes('evening')) {
    return TIME_OF_DAY_LIGHTING.dusk;
  }
  if (normalized.includes('dawn') || normalized.includes('pre-dawn')) {
    return TIME_OF_DAY_LIGHTING.pre_dawn;
  }

  // Day times
  if (normalized.includes('golden')) {
    return TIME_OF_DAY_LIGHTING.golden_hour;
  }
  if (normalized.includes('morning')) {
    return TIME_OF_DAY_LIGHTING.morning;
  }
  if (normalized.includes('midday') || normalized.includes('noon')) {
    return TIME_OF_DAY_LIGHTING.midday;
  }

  return [FLUX_LIGHTING.NATURAL];
}

// ============================================================================
// SCENE INTENSITY -> VISUAL TREATMENT (Section 11A.3)
// ============================================================================

export type IntensityArc = 'calm' | 'building' | 'peak' | 'falling' | 'resolved';

export interface IntensityVisualTreatment {
  preferredShotTypes: string[];
  preferredLighting: string[];
  preferredExpressions: string[];
  intensityRange: [number, number];
}

export const INTENSITY_VISUAL_TREATMENT: Record<IntensityArc, IntensityVisualTreatment> = {
  calm: {
    preferredShotTypes: [FLUX_SHOT_TYPES.WIDE, FLUX_SHOT_TYPES.MEDIUM],
    preferredLighting: [FLUX_LIGHTING.SOFT, FLUX_LIGHTING.NATURAL],
    preferredExpressions: [FLUX_EXPRESSIONS.NEUTRAL, FLUX_EXPRESSIONS.CALM],
    intensityRange: [1, 3],
  },
  building: {
    preferredShotTypes: [FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.COWBOY],
    preferredLighting: [FLUX_LIGHTING.NATURAL, FLUX_LIGHTING.SIDE],
    preferredExpressions: [FLUX_EXPRESSIONS.ALERT, FLUX_EXPRESSIONS.INTENSE_FOCUS],
    intensityRange: [4, 6],
  },
  peak: {
    preferredShotTypes: [FLUX_SHOT_TYPES.CLOSE_UP, FLUX_SHOT_TYPES.INTIMATE_CLOSE_UP],
    preferredLighting: [FLUX_LIGHTING.DRAMATIC, FLUX_LIGHTING.RIM],
    preferredExpressions: [FLUX_EXPRESSIONS.INTENSE_FOCUS, FLUX_EXPRESSIONS.DETERMINED],
    intensityRange: [7, 9],
  },
  falling: {
    preferredShotTypes: [FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.WIDE],
    preferredLighting: [FLUX_LIGHTING.SOFT, FLUX_LIGHTING.WARM_AMBER],
    preferredExpressions: [FLUX_EXPRESSIONS.SOFT_EXPRESSION, FLUX_EXPRESSIONS.CONCERNED],
    intensityRange: [4, 6],
  },
  resolved: {
    preferredShotTypes: [FLUX_SHOT_TYPES.WIDE, FLUX_SHOT_TYPES.ESTABLISHING],
    preferredLighting: [FLUX_LIGHTING.SOFT, FLUX_LIGHTING.GOLDEN_HOUR],
    preferredExpressions: [FLUX_EXPRESSIONS.SOFT_EXPRESSION, FLUX_EXPRESSIONS.CALM],
    intensityRange: [1, 3],
  },
};

/**
 * Get visual treatment for an intensity level (1-10)
 */
export function getIntensityTreatment(intensity: number): IntensityVisualTreatment {
  if (intensity <= 3) return INTENSITY_VISUAL_TREATMENT.calm;
  if (intensity <= 6) return INTENSITY_VISUAL_TREATMENT.building;
  if (intensity <= 9) return INTENSITY_VISUAL_TREATMENT.peak;
  return INTENSITY_VISUAL_TREATMENT.peak; // 10 is still peak
}

// ============================================================================
// SCENE PACING -> VISUAL TREATMENT (Section 11A.6)
// ============================================================================

export type Pacing = 'slow' | 'measured' | 'brisk' | 'frenetic';

export interface PacingVisualTreatment {
  framingPreference: 'wide' | 'balanced' | 'tight' | 'extreme';
  shotTypeAdjustment: string[];
  posePreference: string[];
}

export const PACING_VISUAL_TREATMENT: Record<Pacing, PacingVisualTreatment> = {
  slow: {
    framingPreference: 'wide',
    shotTypeAdjustment: [FLUX_SHOT_TYPES.WIDE, FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.ESTABLISHING],
    posePreference: [FLUX_POSES.STANDING_TALL, FLUX_POSES.LEANING_WALL, FLUX_POSES.SEATED_TERMINAL],
  },
  measured: {
    framingPreference: 'balanced',
    shotTypeAdjustment: [FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP, FLUX_SHOT_TYPES.COWBOY],
    posePreference: [FLUX_POSES.STANDING_TALL, FLUX_POSES.EXAMINING_OBJECT, FLUX_POSES.HANDS_AT_SIDES],
  },
  brisk: {
    framingPreference: 'tight',
    shotTypeAdjustment: [FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP, FLUX_SHOT_TYPES.CLOSE_UP, FLUX_SHOT_TYPES.COWBOY],
    posePreference: [FLUX_POSES.SCANNING_PERIMETER, FLUX_POSES.STANDING_GUARD, FLUX_POSES.REACHING_TOWARD],
  },
  frenetic: {
    framingPreference: 'extreme',
    shotTypeAdjustment: [FLUX_SHOT_TYPES.CLOSE_UP, FLUX_SHOT_TYPES.EXTREME_CLOSE_UP, FLUX_SHOT_TYPES.INTIMATE_CLOSE_UP],
    posePreference: [FLUX_POSES.RIFLE_RAISED, FLUX_POSES.WEAPON_DRAWN, FLUX_POSES.CROUCHING],
  },
};

// ============================================================================
// SCENE ROLE -> VISUAL TREATMENT (Section 11A.2 - YouTube 8-4-4-3)
// ============================================================================

export type SceneRole = 'setup_hook' | 'development' | 'escalation' | 'climax' | 'resolution';

export interface SceneRoleVisualTreatment {
  shotPreference: string;
  lightingPreference: string;
  pacing: Pacing;
  beatCountRange: [number, number]; // min, max beats for scene
}

export const SCENE_ROLE_TREATMENT: Record<SceneRole, SceneRoleVisualTreatment> = {
  setup_hook: {
    shotPreference: 'Wide/establishing -> medium',
    lightingPreference: 'Natural, setting mood',
    pacing: 'measured',
    beatCountRange: [12, 20], // 8 min scene, ~20-40 sec per beat
  },
  development: {
    shotPreference: 'Mixed variety',
    lightingPreference: 'Standard',
    pacing: 'measured',
    beatCountRange: [6, 12], // 4 min scene
  },
  escalation: {
    shotPreference: 'Tightening over scene',
    lightingPreference: 'Building contrast',
    pacing: 'brisk',
    beatCountRange: [6, 12], // 4 min scene
  },
  climax: {
    shotPreference: 'Close-ups, dramatic angles',
    lightingPreference: 'High contrast, dramatic',
    pacing: 'frenetic',
    beatCountRange: [4, 10], // 3 min scene
  },
  resolution: {
    shotPreference: 'Widening out',
    lightingPreference: 'Softer, calming',
    pacing: 'slow',
    beatCountRange: [4, 8], // 3 min scene (if separate from climax)
  },
};

// ============================================================================
// ARC PHASE VISUAL MAPPING (Section 11.1-11.3)
// ============================================================================

export type ArcPhase = 'DORMANT' | 'RISING' | 'CLIMAX' | 'FALLING' | 'RESOLVED';

export interface ArcPhaseVisualTreatment {
  visualIntensity: 'neutral' | 'building' | 'maximum' | 'consequences' | 'closure';
  framingTendency: string;
  preferredAngles: string[];
}

export const ARC_PHASE_TREATMENT: Record<ArcPhase, ArcPhaseVisualTreatment> = {
  DORMANT: {
    visualIntensity: 'neutral',
    framingTendency: 'Standard shots, no drama',
    preferredAngles: [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.THREE_QUARTER],
  },
  RISING: {
    visualIntensity: 'building',
    framingTendency: 'Tighter framing, more angles',
    preferredAngles: [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.LOW_ANGLE, FLUX_CAMERA_ANGLES.THREE_QUARTER],
  },
  CLIMAX: {
    visualIntensity: 'maximum',
    framingTendency: 'Close-ups, dramatic lighting',
    preferredAngles: [FLUX_CAMERA_ANGLES.LOW_ANGLE, FLUX_CAMERA_ANGLES.DUTCH, FLUX_CAMERA_ANGLES.FRONT_VIEW],
  },
  FALLING: {
    visualIntensity: 'consequences',
    framingTendency: 'Softer, reflective framing',
    preferredAngles: [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.HIGH_ANGLE, FLUX_CAMERA_ANGLES.THREE_QUARTER],
  },
  RESOLVED: {
    visualIntensity: 'closure',
    framingTendency: 'Wide shots, peaceful lighting',
    preferredAngles: [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.BACK_VIEW],
  },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a shot type is in the FLUX vocabulary
 */
export function isValidShotType(shotType: string): boolean {
  return FLUX_SHOT_TYPE_VALUES.some(
    valid => shotType.toLowerCase().includes(valid.toLowerCase())
  );
}

/**
 * Validates if a camera angle is in the FLUX vocabulary
 */
export function isValidCameraAngle(angle: string): boolean {
  return FLUX_CAMERA_ANGLE_VALUES.some(
    valid => angle.toLowerCase().includes(valid.toLowerCase())
  );
}

/**
 * Validates if an expression is in the FLUX vocabulary
 */
export function isValidExpression(expression: string): boolean {
  return FLUX_EXPRESSION_VALUES.some(
    valid => expression.toLowerCase().includes(valid.toLowerCase())
  );
}

/**
 * Validates if lighting is in the FLUX vocabulary
 */
export function isValidLighting(lighting: string): boolean {
  return FLUX_LIGHTING_VALUES.some(
    valid => lighting.toLowerCase().includes(valid.toLowerCase())
  );
}

// ============================================================================
// MAPPING FUNCTIONS (Input -> FLUX Term)
// ============================================================================

/**
 * Maps a camera suggestion to the closest FLUX shot type
 */
export function mapToFluxShotType(suggestion: string | null | undefined): string {
  if (!suggestion) return FLUX_SHOT_TYPES.MEDIUM;

  const normalized = suggestion.toLowerCase();

  // Direct matches
  for (const shotType of FLUX_SHOT_TYPE_VALUES) {
    if (normalized.includes(shotType.replace('-', ' '))) {
      return shotType;
    }
  }

  // Common variations
  if (normalized.includes('extreme close') || normalized.includes('ecu')) {
    return FLUX_SHOT_TYPES.EXTREME_CLOSE_UP;
  }
  if (normalized.includes('close-up') || normalized.includes('closeup') || normalized.includes('close up')) {
    return FLUX_SHOT_TYPES.CLOSE_UP;
  }
  if (normalized.includes('medium close')) {
    return FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP;
  }
  if (normalized.includes('cowboy') || normalized.includes('american')) {
    return FLUX_SHOT_TYPES.COWBOY;
  }
  if (normalized.includes('full body') || normalized.includes('full-body')) {
    return FLUX_SHOT_TYPES.FULL_BODY;
  }
  if (normalized.includes('wide') || normalized.includes('long shot')) {
    return FLUX_SHOT_TYPES.WIDE;
  }
  if (normalized.includes('establishing') || normalized.includes('est.')) {
    return FLUX_SHOT_TYPES.ESTABLISHING;
  }
  if (normalized.includes('macro') || normalized.includes('detail')) {
    return FLUX_SHOT_TYPES.MACRO;
  }
  if (normalized.includes('two-shot') || normalized.includes('two shot')) {
    return FLUX_SHOT_TYPES.MEDIUM; // Two-shot becomes medium with dual character template
  }

  return FLUX_SHOT_TYPES.MEDIUM; // Default
}

/**
 * Maps a camera angle suggestion to FLUX angle
 */
export function mapToFluxCameraAngle(suggestion: string | null | undefined): string {
  if (!suggestion) return FLUX_CAMERA_ANGLES.EYE_LEVEL;

  const normalized = suggestion.toLowerCase();

  // Direct matches
  for (const angle of FLUX_CAMERA_ANGLE_VALUES) {
    if (normalized.includes(angle.replace('-', ' '))) {
      return angle;
    }
  }

  // Common variations
  if (normalized.includes('low angle') || normalized.includes('low-angle')) {
    return FLUX_CAMERA_ANGLES.LOW_ANGLE;
  }
  if (normalized.includes('high angle') || normalized.includes('high-angle')) {
    return FLUX_CAMERA_ANGLES.HIGH_ANGLE;
  }
  if (normalized.includes('over the shoulder') || normalized.includes('ots')) {
    return FLUX_CAMERA_ANGLES.THREE_QUARTER;
  }
  if (normalized.includes('dutch') || normalized.includes('tilted')) {
    return FLUX_CAMERA_ANGLES.DUTCH;
  }
  if (normalized.includes('overhead') || normalized.includes('top-down')) {
    return FLUX_CAMERA_ANGLES.OVERHEAD;
  }
  if (normalized.includes('profile') || normalized.includes('side')) {
    return FLUX_CAMERA_ANGLES.PROFILE;
  }

  return FLUX_CAMERA_ANGLES.EYE_LEVEL; // Default
}

/**
 * Maps emotional tone to FLUX expression
 */
export function mapToFluxExpression(emotionalTone: string | null | undefined): string {
  if (!emotionalTone) return FLUX_EXPRESSIONS.NEUTRAL;

  const normalized = emotionalTone.toLowerCase();

  // Explicit mapping from SKILL.md Section 4.4
  const toneMapping: Record<string, string> = {
    'tense anticipation': FLUX_EXPRESSIONS.ALERT + ', ' + FLUX_GAZE.EYES_SCANNING,
    'clinical focus': FLUX_EXPRESSIONS.INTENSE_FOCUS + ', ' + FLUX_EXPRESSIONS.ANALYTICAL_GAZE,
    'suppressed fear': FLUX_EXPRESSIONS.SUPPRESSED_FEAR + ', ' + FLUX_EXPRESSIONS.TENSE,
    'professional calm': FLUX_EXPRESSIONS.STOIC + ', ' + FLUX_EXPRESSIONS.NEUTRAL,
    'vulnerable moment': FLUX_EXPRESSIONS.SOFT_EXPRESSION + ', ' + FLUX_EXPRESSIONS.GUARD_LOWERED,
    'determination': FLUX_EXPRESSIONS.DETERMINED + ', ' + FLUX_EXPRESSIONS.JAW_SET,
    'tense': FLUX_EXPRESSIONS.TENSE + ', ' + FLUX_EXPRESSIONS.ALERT,
    'contemplative': FLUX_EXPRESSIONS.SOFT_EXPRESSION + ', ' + FLUX_GAZE.STARING_DISTANCE,
    'shock': FLUX_EXPRESSIONS.WIDE_EYES + ', ' + FLUX_EXPRESSIONS.TENSE,
    'angry': FLUX_EXPRESSIONS.INTENSE_FOCUS + ', ' + FLUX_EXPRESSIONS.JAW_SET,
    'relieved': FLUX_EXPRESSIONS.SOFT_EXPRESSION,
    'hopeful': FLUX_EXPRESSIONS.SOFT_EXPRESSION + ', ' + FLUX_GAZE.LOOKING_UP,
    'suspicious': FLUX_EXPRESSIONS.WATCHFUL + ', ' + FLUX_EXPRESSIONS.ANALYTICAL_GAZE,
    'worried': FLUX_EXPRESSIONS.CONCERNED + ', ' + FLUX_EXPRESSIONS.FURROWED_BROW,
  };

  // Check for exact match
  if (toneMapping[normalized]) {
    return toneMapping[normalized];
  }

  // Check for partial match
  for (const [tone, expression] of Object.entries(toneMapping)) {
    if (normalized.includes(tone)) {
      return expression;
    }
  }

  // Try to find any matching expression keywords
  for (const expression of FLUX_EXPRESSION_VALUES) {
    if (normalized.includes(expression.split(' ')[0])) {
      return expression;
    }
  }

  return FLUX_EXPRESSIONS.NEUTRAL; // Default
}

/**
 * Maps pose/action description to FLUX pose
 */
export function mapToFluxPose(positioning: string | null | undefined): string | null {
  if (!positioning) return null;

  const normalized = positioning.toLowerCase();

  // Check for FLUX pose keywords
  for (const pose of FLUX_POSE_VALUES) {
    if (normalized.includes(pose)) {
      return pose;
    }
  }

  // Common variations
  if (normalized.includes('stand') && normalized.includes('tall')) {
    return FLUX_POSES.STANDING_TALL;
  }
  if (normalized.includes('kneel') || normalized.includes('crouch')) {
    return normalized.includes('examin') ? FLUX_POSES.KNEELING_EXAMINE : FLUX_POSES.CROUCHING;
  }
  if (normalized.includes('arms cross')) {
    return FLUX_POSES.ARMS_CROSSED;
  }
  if (normalized.includes('seat') || normalized.includes('sit')) {
    return FLUX_POSES.SEATED_TERMINAL;
  }
  if (normalized.includes('lean')) {
    return FLUX_POSES.LEANING_WALL;
  }
  if (normalized.includes('guard') || normalized.includes('watch')) {
    return FLUX_POSES.STANDING_GUARD;
  }
  if (normalized.includes('rifle') || normalized.includes('weapon') || normalized.includes('gun')) {
    return normalized.includes('raised') ? FLUX_POSES.RIFLE_RAISED : FLUX_POSES.WEAPON_DRAWN;
  }
  if (normalized.includes('examin') || normalized.includes('inspect') || normalized.includes('look at')) {
    return FLUX_POSES.EXAMINING_OBJECT;
  }
  if (normalized.includes('reach')) {
    return FLUX_POSES.REACHING_TOWARD;
  }
  if (normalized.includes('hold')) {
    return FLUX_POSES.HOLDING_OBJECT;
  }

  // Return the original if it seems descriptive enough
  if (positioning.length > 10) {
    return positioning.toLowerCase();
  }

  return null;
}

// ============================================================================
// VARIETY ALTERNATIVES
// ============================================================================

/**
 * Get alternative shot types to avoid monotony
 */
export function getAlternativeShotTypes(currentShotType: string, recentShotTypes: string[]): string[] {
  const alternatives: Record<string, string[]> = {
    [FLUX_SHOT_TYPES.MEDIUM]: [FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP, FLUX_SHOT_TYPES.COWBOY, FLUX_SHOT_TYPES.UPPER_BODY_PORTRAIT],
    [FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP]: [FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.CLOSE_UP, FLUX_SHOT_TYPES.COWBOY],
    [FLUX_SHOT_TYPES.CLOSE_UP]: [FLUX_SHOT_TYPES.MEDIUM_CLOSE_UP, FLUX_SHOT_TYPES.INTIMATE_CLOSE_UP, FLUX_SHOT_TYPES.EXTREME_CLOSE_UP],
    [FLUX_SHOT_TYPES.COWBOY]: [FLUX_SHOT_TYPES.MEDIUM, FLUX_SHOT_TYPES.MEDIUM_FULL, FLUX_SHOT_TYPES.FULL_BODY],
    [FLUX_SHOT_TYPES.WIDE]: [FLUX_SHOT_TYPES.ESTABLISHING, FLUX_SHOT_TYPES.MEDIUM_FULL, FLUX_SHOT_TYPES.FULL_BODY],
    [FLUX_SHOT_TYPES.ESTABLISHING]: [FLUX_SHOT_TYPES.WIDE, FLUX_SHOT_TYPES.EXTREME_WIDE],
  };

  const possibleAlternatives = alternatives[currentShotType] || SHOT_TYPE_CATEGORIES.MEDIUM;

  // Filter out recently used shots
  return possibleAlternatives.filter(alt => !recentShotTypes.slice(-2).includes(alt));
}

/**
 * Get alternative camera angles to avoid monotony
 */
export function getAlternativeCameraAngles(currentAngle: string, recentAngles: string[]): string[] {
  const alternatives: Record<string, string[]> = {
    [FLUX_CAMERA_ANGLES.EYE_LEVEL]: [FLUX_CAMERA_ANGLES.THREE_QUARTER, FLUX_CAMERA_ANGLES.LOW_ANGLE],
    [FLUX_CAMERA_ANGLES.THREE_QUARTER]: [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.PROFILE, FLUX_CAMERA_ANGLES.FRONT_VIEW],
    [FLUX_CAMERA_ANGLES.LOW_ANGLE]: [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.HIGH_ANGLE],
    [FLUX_CAMERA_ANGLES.HIGH_ANGLE]: [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.LOW_ANGLE],
  };

  const possibleAlternatives = alternatives[currentAngle] || [FLUX_CAMERA_ANGLES.EYE_LEVEL, FLUX_CAMERA_ANGLES.THREE_QUARTER];

  return possibleAlternatives.filter(alt => !recentAngles.slice(-3).includes(alt));
}

console.log('[FluxVocabulary] Service loaded with', FLUX_SHOT_TYPE_VALUES.length, 'shot types,',
  FLUX_CAMERA_ANGLE_VALUES.length, 'angles,', FLUX_EXPRESSION_VALUES.length, 'expressions');
