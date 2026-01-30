/**
 * Character Expression Service
 *
 * Provides character-specific expression vocabulary and defaults.
 * Each character has unique expression patterns based on their personality.
 *
 * @see SKILL.md Section 12.2
 */

import {
  FLUX_EXPRESSIONS,
  FLUX_GAZE,
  mapToFluxExpression
} from './fluxVocabularyService';

// ============================================================================
// CHARACTER EXPRESSION PROFILES (Section 12.2)
// ============================================================================

export interface CharacterExpressionProfile {
  characterName: string;
  aliases: string[];
  personality: string;
  defaultExpression: string;
  stressedExpression: string;
  vulnerableExpression: string;
  deceptionTells: string[]; // Physical tells when concealing truth
  expressionVocabulary: Record<string, string>; // emotion -> FLUX expression
}

export const CHARACTER_PROFILES: Record<string, CharacterExpressionProfile> = {
  'Cat Mitchell': {
    characterName: 'Cat Mitchell',
    aliases: ['Cat', 'Catherine', 'Catherine Mitchell'],
    personality: 'Clinical/Analytical',
    defaultExpression: `${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}, ${FLUX_EXPRESSIONS.INTENSE_FOCUS}`,
    stressedExpression: `${FLUX_EXPRESSIONS.SUPPRESSED_FEAR}, clinical mask`,
    vulnerableExpression: `${FLUX_EXPRESSIONS.SOFT_EXPRESSION}, ${FLUX_EXPRESSIONS.GUARD_LOWERED}`,
    deceptionTells: [FLUX_EXPRESSIONS.NEUTRAL, FLUX_EXPRESSIONS.INTENSE_FOCUS], // Over-precise when hiding
    expressionVocabulary: {
      'neutral': `${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}`,
      'focused': `${FLUX_EXPRESSIONS.INTENSE_FOCUS}, ${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}`,
      'alert': `${FLUX_EXPRESSIONS.ALERT}, ${FLUX_GAZE.EYES_SCANNING}`,
      'tense': `${FLUX_EXPRESSIONS.TENSE}, ${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}`,
      'worried': `${FLUX_EXPRESSIONS.CONCERNED}, ${FLUX_EXPRESSIONS.FURROWED_BROW}`,
      'determined': `${FLUX_EXPRESSIONS.DETERMINED}, ${FLUX_EXPRESSIONS.JAW_SET}`,
      'vulnerable': `${FLUX_EXPRESSIONS.SOFT_EXPRESSION}, ${FLUX_EXPRESSIONS.GUARD_LOWERED}`,
      'angry': `${FLUX_EXPRESSIONS.INTENSE_FOCUS}, ${FLUX_EXPRESSIONS.JAW_SET}`,
      'contemplative': `${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}, ${FLUX_GAZE.STARING_DISTANCE}`,
      'professional': `${FLUX_EXPRESSIONS.STOIC}, ${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}`,
    }
  },

  'Daniel O\'Brien': {
    characterName: 'Daniel O\'Brien',
    aliases: ['Daniel', 'Dan', 'O\'Brien'],
    personality: 'Tactical/Guarded',
    defaultExpression: `${FLUX_EXPRESSIONS.STOIC}, ${FLUX_EXPRESSIONS.ALERT}`,
    stressedExpression: `protective stance, ${FLUX_EXPRESSIONS.WATCHFUL}`,
    vulnerableExpression: `${FLUX_GAZE.AVERTED_EYES}, suppressed emotion`,
    deceptionTells: [FLUX_GAZE.AVERTED_EYES, FLUX_EXPRESSIONS.JAW_SET], // Eyes avert, jaw clenches
    expressionVocabulary: {
      'neutral': `${FLUX_EXPRESSIONS.STOIC}, ${FLUX_EXPRESSIONS.ALERT}`,
      'focused': `${FLUX_EXPRESSIONS.INTENSE_FOCUS}, ${FLUX_EXPRESSIONS.VIGILANT}`,
      'alert': `${FLUX_EXPRESSIONS.ALERT}, ${FLUX_EXPRESSIONS.WATCHFUL}`,
      'tense': `${FLUX_EXPRESSIONS.TENSE}, ${FLUX_EXPRESSIONS.STOIC}`,
      'worried': `${FLUX_EXPRESSIONS.CONCERNED}, ${FLUX_EXPRESSIONS.STOIC}`,
      'determined': `${FLUX_EXPRESSIONS.DETERMINED}, ${FLUX_EXPRESSIONS.RESOLUTE}`,
      'vulnerable': `${FLUX_GAZE.AVERTED_EYES}, suppressed emotion`,
      'protective': `protective stance, ${FLUX_EXPRESSIONS.WATCHFUL}`,
      'haunted': `${FLUX_GAZE.AVERTED_EYES}, distant gaze`,
      'professional': `${FLUX_EXPRESSIONS.STOIC}, ${FLUX_EXPRESSIONS.NEUTRAL}`,
    }
  },

  '2K': {
    characterName: 'Teresa "2K" Cristina',
    aliases: ['2K', 'Teresa', 'Teresa Cristina'],
    personality: 'Terse/Reserved',
    defaultExpression: `guarded expression, calculating`,
    stressedExpression: `${FLUX_EXPRESSIONS.TENSE}, guarded`,
    vulnerableExpression: `subtle softening, ${FLUX_GAZE.AT_CAMERA}`,
    deceptionTells: ['controlled stillness', FLUX_EXPRESSIONS.STOIC], // Unnaturally still
    expressionVocabulary: {
      'neutral': `guarded expression, calculating`,
      'focused': `${FLUX_EXPRESSIONS.INTENSE_FOCUS}, calculating`,
      'alert': `${FLUX_EXPRESSIONS.VIGILANT}, guarded`,
      'tense': `${FLUX_EXPRESSIONS.TENSE}, guarded`,
      'suspicious': `guarded expression, ${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}`,
      'trust': `subtle softening, ${FLUX_GAZE.AT_CAMERA}`,
      'determined': `${FLUX_EXPRESSIONS.RESOLUTE}, guarded`,
      'professional': `${FLUX_EXPRESSIONS.STOIC}, calculating`,
    }
  },

  'Webb': {
    characterName: 'Colonel Marcus Webb',
    aliases: ['Webb', 'Colonel Webb', 'Marcus Webb', 'Colonel'],
    personality: 'Military Authority/Controlled',
    defaultExpression: `${FLUX_EXPRESSIONS.STOIC}, commanding presence`,
    stressedExpression: `controlled stillness, ${FLUX_EXPRESSIONS.INTENSE_FOCUS}`,
    vulnerableExpression: `${FLUX_EXPRESSIONS.CONCERNED}, weight of command`,
    deceptionTells: ['controlled stillness', 'unnaturally still'], // When concealing
    expressionVocabulary: {
      'neutral': `${FLUX_EXPRESSIONS.STOIC}, commanding presence`,
      'focused': `${FLUX_EXPRESSIONS.INTENSE_FOCUS}, commanding`,
      'alert': `${FLUX_EXPRESSIONS.ALERT}, authoritative`,
      'determined': `${FLUX_EXPRESSIONS.DETERMINED}, commanding presence`,
      'professional': `${FLUX_EXPRESSIONS.STOIC}, military bearing`,
      'concerned': `${FLUX_EXPRESSIONS.CONCERNED}, weight of command`,
    }
  },

  'Chen': {
    characterName: 'Dr. Sarah Chen',
    aliases: ['Chen', 'Dr. Chen', 'Sarah Chen', 'Sarah'],
    personality: 'Scientific/Compassionate',
    defaultExpression: `${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}, compassionate`,
    stressedExpression: `${FLUX_EXPRESSIONS.CONCERNED}, ${FLUX_EXPRESSIONS.INTENSE_FOCUS}`,
    vulnerableExpression: `${FLUX_EXPRESSIONS.SOFT_EXPRESSION}, empathetic`,
    deceptionTells: [FLUX_GAZE.LOOKING_AWAY, FLUX_EXPRESSIONS.CONCENTRATED],
    expressionVocabulary: {
      'neutral': `${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}, compassionate`,
      'focused': `${FLUX_EXPRESSIONS.CONCENTRATED}, scientific`,
      'worried': `${FLUX_EXPRESSIONS.CONCERNED}, empathetic`,
      'determined': `${FLUX_EXPRESSIONS.DETERMINED}, compassionate`,
      'vulnerable': `${FLUX_EXPRESSIONS.SOFT_EXPRESSION}, empathetic`,
      'professional': `${FLUX_EXPRESSIONS.ANALYTICAL_GAZE}, clinical`,
    }
  },

  'Ghost': {
    characterName: 'Ghost',
    aliases: [],
    personality: 'Digital Entity/Enigmatic',
    defaultExpression: `ethereal gaze, digital clarity`,
    stressedExpression: `flickering, unstable form`,
    vulnerableExpression: `reaching out, seeking connection`,
    deceptionTells: [], // Ghost doesn't deceive in traditional ways
    expressionVocabulary: {
      'neutral': `ethereal gaze, digital serenity`,
      'focused': `intense digital focus, data streams visible`,
      'communicating': `attempting connection, flickering clarity`,
      'distressed': `form unstable, digital interference`,
      'compassionate': `soft digital glow, understanding`,
    }
  },
};

// ============================================================================
// CHARACTER LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find character profile by name or alias
 */
export function findCharacterProfile(nameOrAlias: string): CharacterExpressionProfile | null {
  const normalized = nameOrAlias.toLowerCase().trim();

  for (const profile of Object.values(CHARACTER_PROFILES)) {
    if (profile.characterName.toLowerCase() === normalized) {
      return profile;
    }
    for (const alias of profile.aliases) {
      if (alias.toLowerCase() === normalized) {
        return profile;
      }
    }
  }

  return null;
}

/**
 * Get all known character names for matching
 */
export function getAllCharacterNames(): string[] {
  const names: string[] = [];
  for (const profile of Object.values(CHARACTER_PROFILES)) {
    names.push(profile.characterName);
    names.push(...profile.aliases);
  }
  return names;
}

// ============================================================================
// EXPRESSION MAPPING FUNCTIONS
// ============================================================================

/**
 * Get character-specific expression for an emotional tone
 *
 * @param characterName - The character's name
 * @param emotionalTone - The emotional tone from beat data
 * @returns FLUX-validated expression string
 */
export function getCharacterExpression(
  characterName: string,
  emotionalTone: string | null | undefined
): string {
  const profile = findCharacterProfile(characterName);

  if (!profile) {
    // Unknown character - use generic mapping
    return mapToFluxExpression(emotionalTone);
  }

  if (!emotionalTone) {
    // No tone specified - use character's default
    return profile.defaultExpression;
  }

  const normalizedTone = emotionalTone.toLowerCase().trim();

  // Check character's vocabulary first
  for (const [emotion, expression] of Object.entries(profile.expressionVocabulary)) {
    if (normalizedTone.includes(emotion)) {
      return expression;
    }
  }

  // Check for stress/vulnerable states
  if (normalizedTone.includes('stress') || normalizedTone.includes('panic') || normalizedTone.includes('fear')) {
    return profile.stressedExpression;
  }

  if (normalizedTone.includes('vulnerable') || normalizedTone.includes('open') || normalizedTone.includes('soft')) {
    return profile.vulnerableExpression;
  }

  // Fall back to generic FLUX mapping
  return mapToFluxExpression(emotionalTone);
}

/**
 * Get character's default expression (when no tone specified)
 */
export function getCharacterDefaultExpression(characterName: string): string {
  const profile = findCharacterProfile(characterName);
  return profile?.defaultExpression || FLUX_EXPRESSIONS.NEUTRAL;
}

/**
 * Get deception tells for a character (when they're concealing truth)
 */
export function getCharacterDeceptionTells(characterName: string): string[] {
  const profile = findCharacterProfile(characterName);
  return profile?.deceptionTells || [];
}

/**
 * Check if an emotional tone suggests deception
 */
export function isDeceptionIndicator(emotionalTone: string): boolean {
  const deceptionKeywords = [
    'concealing', 'hiding', 'deceptive', 'lying', 'masking',
    'pretending', 'feigning', 'false', 'not revealing'
  ];

  const normalized = emotionalTone.toLowerCase();
  return deceptionKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Get expression with deception tells applied
 */
export function getExpressionWithDeception(
  characterName: string,
  baseExpression: string
): string {
  const tells = getCharacterDeceptionTells(characterName);
  if (tells.length === 0) return baseExpression;

  // Add the first tell to the expression
  return `${baseExpression}, ${tells[0]}`;
}

// ============================================================================
// CHARACTER STATE TRACKING
// ============================================================================

export interface CharacterEmotionalState {
  characterName: string;
  currentExpression: string;
  currentTone: string | null;
  lastUpdatedBeatId: string | null;
  isDeceiving: boolean;
}

/**
 * Create initial emotional state for a character
 */
export function createCharacterEmotionalState(characterName: string): CharacterEmotionalState {
  return {
    characterName,
    currentExpression: getCharacterDefaultExpression(characterName),
    currentTone: null,
    lastUpdatedBeatId: null,
    isDeceiving: false,
  };
}

/**
 * Update character emotional state based on beat data
 */
export function updateCharacterEmotionalState(
  state: CharacterEmotionalState,
  emotionalTone: string | null | undefined,
  beatId: string
): CharacterEmotionalState {
  if (!emotionalTone) {
    // No change - keep current state (carryover)
    return state;
  }

  const isDeceiving = isDeceptionIndicator(emotionalTone);
  let expression = getCharacterExpression(state.characterName, emotionalTone);

  if (isDeceiving) {
    expression = getExpressionWithDeception(state.characterName, expression);
  }

  return {
    ...state,
    currentExpression: expression,
    currentTone: emotionalTone,
    lastUpdatedBeatId: beatId,
    isDeceiving,
  };
}

console.log('[CharacterExpression] Service loaded with', Object.keys(CHARACTER_PROFILES).length, 'character profiles');
