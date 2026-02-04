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
 * Detect helmet state from description (explicit mentions only).
 */
export function detectHelmetStateExplicit(description: string): 'OFF' | 'IN_HAND' | 'ON_VEHICLE' | 'VISOR_UP' | 'VISOR_DOWN' | null {
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

  return null;
}

/**
 * Infer helmet state from context when not explicitly mentioned.
 *
 * VISOR_DOWN patterns (face hidden, no hair, NO YOLO face segment):
 * - Riding/driving the Dingy at speed
 * - Flying/airborne scenarios
 * - Active combat/firefight
 * - HUD/display mentions (viewing through visor)
 * - Hostile environment (radiation, toxic, etc.)
 *
 * VISOR_UP patterns (face visible, no hair, INCLUDE YOLO face segment):
 * - Speaking/communicating in tactical gear
 * - Stopped/stationary assessment
 * - Just arrived at location
 * - Briefing/conversation in field gear
 *
 * @param description - Beat description text
 * @param gearContext - Optional gear context (e.g., 'field_op', 'suit_up')
 * @returns Inferred helmet state or null if no inference possible
 */
export function inferHelmetFromContext(
  description: string,
  gearContext?: string | null
): { state: 'VISOR_UP' | 'VISOR_DOWN'; reason: string } | null {
  const desc = description.toLowerCase();

  // ========================================================================
  // VISOR_DOWN PATTERNS (face hidden, no YOLO face segment)
  // ========================================================================

  // HUD/display mentions strongly imply visor down (viewing through helmet)
  if (/hud|display|readout|targeting|threat\s+indicator|biometric/i.test(desc)) {
    return { state: 'VISOR_DOWN', reason: 'HUD/display mention implies viewing through visor' };
  }

  // Riding/driving the Dingy at speed implies sealed helmet
  if (/\b(riding|drives?|aboard)\b.*\bdingy\b/i.test(desc) ||
      /\bdingy\b.*\b(speeds?|accelerates?|weaves?|races?|flies?|shoots?|roars?)\b/i.test(desc)) {
    return { state: 'VISOR_DOWN', reason: 'Riding Dingy at speed implies helmet sealed' };
  }

  // Flying/airborne scenarios imply sealed helmet
  if (/\b(flying|airborne|soaring|diving|plunging|freefalling)\b/i.test(desc) &&
      /\b(aegis|suit|tactical)\b/i.test(desc)) {
    return { state: 'VISOR_DOWN', reason: 'Airborne in suit implies helmet sealed' };
  }

  // Active combat/firefight in field context implies sealed helmet
  if (gearContext === 'field_op' &&
      /\b(firefight|combat|battle|engagement|assault|breach|tactical\s+entry|under\s+fire)\b/i.test(desc)) {
    return { state: 'VISOR_DOWN', reason: 'Active combat in field_op implies helmet sealed' };
  }

  // High-speed movement in tactical gear implies sealed helmet
  if (/\b(speeds?|races?|accelerates?|roars?)\b.*\b(street|road|highway|through|past)\b/i.test(desc) &&
      /\b(aegis|suit|tactical|dingy|bike|motorcycle)\b/i.test(desc)) {
    return { state: 'VISOR_DOWN', reason: 'High-speed tactical movement implies helmet sealed' };
  }

  // Hostile environment implies sealed helmet
  if (/\b(radiation|toxic|smoke|dust|debris|contaminated|hazard|gas|fumes)\b/i.test(desc) &&
      /\b(aegis|suit|tactical)\b/i.test(desc)) {
    return { state: 'VISOR_DOWN', reason: 'Hostile environment implies helmet sealed' };
  }

  // ========================================================================
  // VISOR_UP PATTERNS (face visible, INCLUDE YOLO face segment)
  // ========================================================================

  // Speaking/communicating in tactical context implies visor up
  if (/\b(says?|speaks?|tells?|asks?|replies?|responds?|shouts?|calls\s+out|whispers?)\b/i.test(desc) &&
      /\b(aegis|suit|tactical|dingy|helmet)\b/i.test(desc)) {
    return { state: 'VISOR_UP', reason: 'Speaking in tactical gear implies visor raised' };
  }

  // Stopped/parked Dingy with character implies visor up for visibility
  if (/\bdingy\b.*\b(stops?|parks?|idles?|waits?|stationary)\b/i.test(desc) ||
      /\b(stops?|parks?|dismounts?)\b.*\bdingy\b/i.test(desc)) {
    return { state: 'VISOR_UP', reason: 'Stopped at Dingy implies visor raised' };
  }

  // Assessment/scanning/looking scenarios in tactical gear
  if (/\b(scans?|surveys?|assesses?|observes?|watches?|looks\s+at|examines?|studies)\b/i.test(desc) &&
      /\b(aegis|suit|tactical)\b/i.test(desc) &&
      !/\bhud\b/i.test(desc)) { // But NOT if HUD is mentioned
    return { state: 'VISOR_UP', reason: 'Visual assessment implies visor raised' };
  }

  // Just arrived/approaching in tactical gear
  if (/\b(arrives?|approaches?|reaches?|enters?|steps\s+into|walks\s+into)\b/i.test(desc) &&
      /\b(aegis|suit|tactical)\b/i.test(desc)) {
    return { state: 'VISOR_UP', reason: 'Arrival in tactical gear implies visor raised' };
  }

  // Briefing/planning/discussion in field context
  if (/\b(briefs?|plans?|discusses?|confers?|coordinates?|gestures?|points|signals?)\b/i.test(desc) &&
      gearContext === 'field_op') {
    return { state: 'VISOR_UP', reason: 'Field briefing implies visor raised' };
  }

  // Pre-mission or post-mission moments in tactical gear
  if (/\b(prepares?|readies|gears\s+up|suit(s|ing)?\s+up|checks?\s+(gear|equipment))\b/i.test(desc) &&
      /\b(aegis|suit|tactical)\b/i.test(desc)) {
    return { state: 'VISOR_UP', reason: 'Pre-mission prep implies visor raised' };
  }

  // Mounting/getting on Dingy (before departure, visor still up)
  if (/\b(mounts?|straddles?|climbs?\s+on|gets?\s+on)\b.*\bdingy\b/i.test(desc)) {
    return { state: 'VISOR_UP', reason: 'Mounting Dingy implies visor still raised' };
  }

  return null;
}

/**
 * Detect helmet state from description with context-based inference.
 *
 * Priority:
 * 1. Explicit helmet state mentions (visor down, visor up, etc.)
 * 2. Context-based inference (riding Dingy, airborne, combat)
 * 3. Default: null (no helmet determination)
 *
 * @param description - Beat description text
 * @param gearContext - Optional gear context for inference
 * @returns Helmet state or null
 */
export function detectHelmetState(
  description: string,
  gearContext?: string | null
): 'OFF' | 'IN_HAND' | 'ON_VEHICLE' | 'VISOR_UP' | 'VISOR_DOWN' | null {
  // First check explicit mentions
  const explicit = detectHelmetStateExplicit(description);
  if (explicit !== null) {
    return explicit;
  }

  // Then try context-based inference
  const inferred = inferHelmetFromContext(description, gearContext);
  if (inferred !== null) {
    console.log(`[HelmetInference] Inferred ${inferred.state}: ${inferred.reason}`);
    return inferred.state;
  }

  // Default: no helmet mentioned
  return null;
}

console.log('[BeatType] Service loaded');
