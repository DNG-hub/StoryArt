/**
 * Dual Character Service
 *
 * Handles multi-character positioning, relationship keywords,
 * and face segment indexing for dual/group shots.
 *
 * @see SKILL.md Section 8
 */

// ============================================================================
// CHARACTER TRIGGERS (FLUX vs zimage)
// ============================================================================

export interface CharacterTrigger {
  name: string;
  fluxTrigger: string;
  zimageTrigger: string;
  defaultPosition: 'left' | 'right' | 'center';
}

const CHARACTER_TRIGGERS: Record<string, CharacterTrigger> = {
  cat: {
    name: 'Cat Mitchell',
    fluxTrigger: 'JRUMLV woman',
    zimageTrigger: 'JRUMLV woman',  // Same for both
    defaultPosition: 'left',
  },
  daniel: {
    name: 'Daniel O\'Brien',
    fluxTrigger: 'HSCEIA man',
    zimageTrigger: 'daveman',  // Different for zimage!
    defaultPosition: 'right',
  },
  chen: {
    name: 'Dr. Sarah Chen',
    fluxTrigger: '',  // No FLUX LoRA
    zimageTrigger: 'chen chen',
    defaultPosition: 'right',
  },
  webb: {
    name: 'Colonel Marcus Webb',
    fluxTrigger: '',  // No FLUX LoRA
    zimageTrigger: 'webbman',
    defaultPosition: 'right',
  },
  '2k': {
    name: 'Teresa "2K" Cristina',
    fluxTrigger: '',  // No FLUX LoRA
    zimageTrigger: '2kwoman',
    defaultPosition: 'right',
  },
};

/**
 * Get trigger for a character.
 */
export function getCharacterTrigger(
  characterName: string,
  route: 'flux' | 'zimage' = 'flux'
): string | null {
  const normalized = characterName.toLowerCase().trim();

  // Find matching character
  for (const [key, trigger] of Object.entries(CHARACTER_TRIGGERS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return route === 'flux' ? trigger.fluxTrigger : trigger.zimageTrigger;
    }
  }

  return null;
}

// ============================================================================
// RELATIONSHIP STAGES -> VISUAL KEYWORDS (Section 8.3)
// ============================================================================

export type RelationshipStage =
  | 'PROFESSIONAL_TENSION'
  | 'TACTICAL_PARTNERSHIP'
  | 'EMOTIONAL_MOMENT'
  | 'SILENT_UNDERSTANDING';

const RELATIONSHIP_VISUALS: Record<RelationshipStage, {
  positioning: string;
  interaction: string;
  physicalProximity: 'distant' | 'normal' | 'close';
}> = {
  PROFESSIONAL_TENSION: {
    positioning: 'standing apart, separated by debris',
    interaction: 'facing away from each other',
    physicalProximity: 'distant',
  },
  TACTICAL_PARTNERSHIP: {
    positioning: 'back to back, covering angles',
    interaction: 'coordinated positioning',
    physicalProximity: 'close',
  },
  EMOTIONAL_MOMENT: {
    positioning: 'facing each other, eye contact',
    interaction: 'intimate conversation',
    physicalProximity: 'close',
  },
  SILENT_UNDERSTANDING: {
    positioning: 'parallel positioning, working in tandem',
    interaction: 'shared focus',
    physicalProximity: 'normal',
  },
};

/**
 * Get visual keywords for relationship stage.
 */
export function getRelationshipVisuals(stage: RelationshipStage) {
  return RELATIONSHIP_VISUALS[stage];
}

/**
 * Infer relationship stage from emotional tone.
 */
export function inferRelationshipStage(
  emotionalTone?: string,
  characterPositioning?: string
): RelationshipStage {
  const tone = (emotionalTone || '').toLowerCase();
  const positioning = (characterPositioning || '').toLowerCase();

  // Check positioning first
  if (positioning.includes('back to back') || positioning.includes('covering')) {
    return 'TACTICAL_PARTNERSHIP';
  }
  if (positioning.includes('facing each other') || positioning.includes('eye contact')) {
    return 'EMOTIONAL_MOMENT';
  }
  if (positioning.includes('apart') || positioning.includes('separated')) {
    return 'PROFESSIONAL_TENSION';
  }
  if (positioning.includes('parallel') || positioning.includes('together') || positioning.includes('side by side')) {
    return 'SILENT_UNDERSTANDING';
  }

  // Fall back to emotional tone
  if (tone.includes('tense') || tone.includes('conflict') || tone.includes('argument')) {
    return 'PROFESSIONAL_TENSION';
  }
  if (tone.includes('tactical') || tone.includes('alert') || tone.includes('ready')) {
    return 'TACTICAL_PARTNERSHIP';
  }
  if (tone.includes('vulnerable') || tone.includes('intimate') || tone.includes('emotional')) {
    return 'EMOTIONAL_MOMENT';
  }

  // Default
  return 'SILENT_UNDERSTANDING';
}

// ============================================================================
// DUAL CHARACTER POSITIONING
// ============================================================================

export interface DualCharacterSetup {
  leftCharacter: {
    name: string;
    trigger: string;
    faceSegmentIndex: number;
  };
  rightCharacter: {
    name: string;
    trigger: string;
    faceSegmentIndex: number;
  };
  interaction: string;
  positioning: string;
}

/**
 * Set up dual character positioning with proper triggers and segments.
 *
 * @param character1 - First character name
 * @param character2 - Second character name
 * @param relationshipStage - Current relationship stage
 * @param route - Generation route ('flux' or 'zimage')
 */
export function setupDualCharacter(
  character1: string,
  character2: string,
  relationshipStage: RelationshipStage = 'SILENT_UNDERSTANDING',
  route: 'flux' | 'zimage' = 'flux'
): DualCharacterSetup {
  const trigger1 = getCharacterTrigger(character1, route) || character1;
  const trigger2 = getCharacterTrigger(character2, route) || character2;

  // Determine left/right based on character defaults
  const char1Normalized = character1.toLowerCase();
  const char2Normalized = character2.toLowerCase();

  let leftName = character1;
  let leftTrigger = trigger1;
  let rightName = character2;
  let rightTrigger = trigger2;

  // Cat defaults to left, others to right
  if (char2Normalized.includes('cat') && !char1Normalized.includes('cat')) {
    leftName = character2;
    leftTrigger = trigger2;
    rightName = character1;
    rightTrigger = trigger1;
  }

  const visuals = getRelationshipVisuals(relationshipStage);

  return {
    leftCharacter: {
      name: leftName,
      trigger: leftTrigger,
      faceSegmentIndex: 0,  // YOLO index 0 = leftmost
    },
    rightCharacter: {
      name: rightName,
      trigger: rightTrigger,
      faceSegmentIndex: 1,  // YOLO index 1 = second from left
    },
    interaction: visuals.interaction,
    positioning: visuals.positioning,
  };
}

// ============================================================================
// FACE SEGMENT GENERATION (Section 3.3)
// ============================================================================

/**
 * Default segment parameters from SKILL.md Section 3.3:
 * - CREATIVITY: 0.35
 * - THRESHOLD: 0.5
 */
const DEFAULT_CREATIVITY = 0.35;
const DEFAULT_THRESHOLD = 0.5;

/**
 * Generate face segment syntax for a character.
 *
 * @param faceIndex - YOLO face index (0 = leftmost, 1 = second from left, etc.)
 * @param creativity - Creativity parameter (default 0.35)
 * @param threshold - Threshold parameter (default 0.5)
 */
export function generateFaceSegment(
  faceIndex: number = 0,
  creativity: number = DEFAULT_CREATIVITY,
  threshold: number = DEFAULT_THRESHOLD
): string {
  return `<segment:yolo-face_yolov9c.pt-${faceIndex},${creativity},${threshold}>`;
}

/**
 * Generate clothing segment syntax.
 *
 * @param clothingType - Type of clothing (e.g., 'bodysuit', 'tactical vest')
 * @param creativity - Creativity parameter (default 0.4)
 * @param threshold - Threshold parameter (default 0.5)
 */
export function generateClothingSegment(
  clothingType: string,
  creativity: number = 0.4,
  threshold: number = 0.5
): string {
  return `<segment:${clothingType},${creativity},${threshold}>`;
}

/**
 * Generate dual character face segments.
 * Format: <segment:...-0,...>TRIGGER1 <segment:...-1,...>TRIGGER2
 */
export function generateDualFaceSegments(
  setup: DualCharacterSetup,
  creativity: number = DEFAULT_CREATIVITY,
  threshold: number = DEFAULT_THRESHOLD
): string {
  const leftSeg = generateFaceSegment(setup.leftCharacter.faceSegmentIndex, creativity, threshold);
  const rightSeg = generateFaceSegment(setup.rightCharacter.faceSegmentIndex, creativity, threshold);

  return `${leftSeg}${setup.leftCharacter.trigger} ${rightSeg}${setup.rightCharacter.trigger}`;
}

// ============================================================================
// IMAGE ROUTING (Section 15)
// ============================================================================

export type ImageRoute = 'FLUX' | 'ZIMAGE';

/**
 * Determine which generation route to use based on characters present.
 *
 * Rule: If Chen, Webb, or 2K present -> ZIMAGE (ComfyUI)
 *       Otherwise -> FLUX (SwarmUI)
 */
export function determineImageRoute(characters: string[]): ImageRoute {
  const zimageChars = ['chen', 'webb', '2k', 'cristina'];

  for (const char of characters) {
    const normalized = char.toLowerCase();
    for (const zimageChar of zimageChars) {
      if (normalized.includes(zimageChar)) {
        return 'ZIMAGE';
      }
    }
  }

  return 'FLUX';
}

/**
 * Get all triggers for characters with correct route.
 */
export function getTriggersForCharacters(
  characters: string[]
): { route: ImageRoute; triggers: Map<string, string> } {
  const route = determineImageRoute(characters);
  const triggers = new Map<string, string>();

  for (const char of characters) {
    const trigger = getCharacterTrigger(char, route === 'FLUX' ? 'flux' : 'zimage');
    if (trigger) {
      triggers.set(char, trigger);
    }
  }

  return { route, triggers };
}

console.log('[DualCharacter] Service loaded');
