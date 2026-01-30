/**
 * Beat Type Detection Service
 *
 * Determines the beat type for prompt template selection.
 *
 * @see SKILL.md Section 6.1
 */

// ============================================================================
// BEAT TYPES
// ============================================================================

export type BeatType =
  | 'CHARACTER_WITH_FACE'    // Character with LoRA, face visible
  | 'CHARACTER_NO_FACE'      // Character with LoRA, face hidden (helmet down)
  | 'CHARACTER_GENERIC'      // Character without LoRA
  | 'ENVIRONMENT_ONLY'       // No character (object/environment)
  | 'DUAL_CHARACTER'         // Two characters with LoRAs
  | 'MULTI_CHARACTER';       // Three+ characters

// Characters with trained LoRAs (FLUX route)
export const LORA_CHARACTERS = new Set([
  'Cat',
  'Cat Mitchell',
  'Catherine Mitchell',
  'Daniel',
  'Daniel O\'Brien',
]);

// Characters requiring zimage route (no FLUX LoRA)
export const ZIMAGE_CHARACTERS = new Set([
  'Chen',
  'Dr. Chen',
  'Dr. Sarah Chen',
  'Sarah Chen',
  'Webb',
  'Colonel Webb',
  'Colonel Marcus Webb',
  'Marcus Webb',
  '2K',
  'Teresa',
  'Teresa Cristina',
  '2K Cristina',
]);

// ============================================================================
// BEAT TYPE DETECTION
// ============================================================================

export interface BeatTypeResult {
  beatType: BeatType;
  hasLoraCharacters: boolean;
  hasZimageCharacters: boolean;
  requiresZimageRoute: boolean;
  faceVisible: boolean;
  characterCount: number;
  loraCharacters: string[];
  genericCharacters: string[];
}

/**
 * Detect beat type from character list and context.
 *
 * @param characters - Array of character names in the beat
 * @param helmetState - Helmet state if applicable ('OFF', 'VISOR_UP', 'VISOR_DOWN')
 * @param isEnvironmentShot - True if this is an establishing/environment shot
 */
export function detectBeatType(
  characters: string[],
  helmetState: 'OFF' | 'IN_HAND' | 'ON_VEHICLE' | 'VISOR_UP' | 'VISOR_DOWN' | null = null,
  isEnvironmentShot: boolean = false
): BeatTypeResult {
  // Environment-only detection
  if (isEnvironmentShot || !characters || characters.length === 0) {
    return {
      beatType: 'ENVIRONMENT_ONLY',
      hasLoraCharacters: false,
      hasZimageCharacters: false,
      requiresZimageRoute: false,
      faceVisible: false,
      characterCount: 0,
      loraCharacters: [],
      genericCharacters: [],
    };
  }

  // Categorize characters
  const loraChars: string[] = [];
  const zimageChars: string[] = [];
  const genericChars: string[] = [];

  for (const char of characters) {
    const normalized = char.trim();
    if (isLoraCharacter(normalized)) {
      loraChars.push(normalized);
    } else if (isZimageCharacter(normalized)) {
      zimageChars.push(normalized);
    } else {
      genericChars.push(normalized);
    }
  }

  const hasLora = loraChars.length > 0;
  const hasZimage = zimageChars.length > 0;
  const requiresZimage = hasZimage;
  const totalChars = characters.length;

  // Face visibility based on helmet state
  // Face is visible unless helmet is on with visor down
  const faceVisible = helmetState !== 'VISOR_DOWN';

  // Determine beat type
  let beatType: BeatType;

  if (totalChars === 0) {
    beatType = 'ENVIRONMENT_ONLY';
  } else if (totalChars >= 3) {
    beatType = 'MULTI_CHARACTER';
  } else if (totalChars === 2 && (hasLora || hasZimage)) {
    beatType = 'DUAL_CHARACTER';
  } else if (hasLora || hasZimage) {
    // Single character with LoRA
    beatType = faceVisible ? 'CHARACTER_WITH_FACE' : 'CHARACTER_NO_FACE';
  } else {
    // All characters are generic (no LoRAs)
    beatType = 'CHARACTER_GENERIC';
  }

  return {
    beatType,
    hasLoraCharacters: hasLora,
    hasZimageCharacters: hasZimage,
    requiresZimageRoute: requiresZimage,
    faceVisible,
    characterCount: totalChars,
    loraCharacters: loraChars,
    genericCharacters: genericChars,
  };
}

/**
 * Check if character has a FLUX LoRA.
 */
export function isLoraCharacter(name: string): boolean {
  const normalized = name.toLowerCase().trim();

  for (const loraChar of LORA_CHARACTERS) {
    if (loraChar.toLowerCase() === normalized) return true;
  }

  // Partial match for common variations
  if (normalized.includes('cat') && !normalized.includes('category')) return true;
  if (normalized.includes('daniel')) return true;

  return false;
}

/**
 * Check if character requires zimage route.
 */
export function isZimageCharacter(name: string): boolean {
  const normalized = name.toLowerCase().trim();

  for (const zimageChar of ZIMAGE_CHARACTERS) {
    if (zimageChar.toLowerCase() === normalized) return true;
  }

  // Partial match
  if (normalized.includes('chen')) return true;
  if (normalized.includes('webb')) return true;
  if (normalized.includes('2k')) return true;
  if (normalized.includes('cristina')) return true;

  return false;
}

/**
 * Detect if beat description indicates environment-only shot.
 */
export function isEnvironmentShotFromDescription(description: string): boolean {
  const desc = description.toLowerCase();

  const environmentPatterns = [
    /^establishing shot/i,
    /^wide shot of (?!a |the )?(the )?(?!cat|daniel|chen|webb|2k)/i,
    /^macro shot of/i,
    /^forensic shot of/i,
    /evidence.*close/i,
    /^ext\.\s+\w+\s+-\s+(?:day|night|dawn|dusk)/i,  // EXT. LOCATION - TIME with no character mention
    /silhouette shot of/i,
  ];

  for (const pattern of environmentPatterns) {
    if (pattern.test(desc)) return true;
  }

  // Check if description mentions no characters
  const hasCharacterMention = /\b(cat|daniel|chen|webb|2k|she|he|they|him|her)\b/i.test(desc);
  if (!hasCharacterMention && /^(establishing|wide|extreme wide|aerial)/i.test(desc)) {
    return true;
  }

  return false;
}

/**
 * Detect helmet state from description.
 */
export function detectHelmetState(description: string): 'OFF' | 'IN_HAND' | 'ON_VEHICLE' | 'VISOR_UP' | 'VISOR_DOWN' | null {
  const desc = description.toLowerCase();

  if (/visor\s+down/i.test(desc) || /face\s+hidden/i.test(desc) || /helmet\s+sealed/i.test(desc)) {
    return 'VISOR_DOWN';
  }
  if (/visor\s+(up|raised|open)/i.test(desc)) {
    return 'VISOR_UP';
  }
  if (/helmet\s+(tucked|under\s+arm|carrying|in\s+hand)/i.test(desc)) {
    return 'IN_HAND';
  }
  if (/helmet\s+(attached|on\s+bike|on\s+motorcycle)/i.test(desc)) {
    return 'ON_VEHICLE';
  }
  if (/without\s+helmet/i.test(desc) || /helmet\s+off/i.test(desc) || /no\s+helmet/i.test(desc)) {
    return 'OFF';
  }

  // Default: assume no helmet mentioned means off
  return null;
}

console.log('[BeatType] Service loaded');
