// FIX: Corrected import path for Google GenAI SDK.
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedEpisode, BeatPrompts, EpisodeStyleConfig, RetrievalMode, EnhancedEpisodeContext, LLMProvider, SwarmUIPrompt, ImageConfig, BeatAnalysisWithState, ScenePersistentState, PromptValidationResult, SceneTypeTemplate, TokenBudget } from '../types';
import { processEpisodeWithFullContext, type FullyProcessedBeat } from './beatStateService';
import { generateEnhancedEpisodeContext } from './databaseContextService';
import { getStoryContext } from './storyContextService';
import { applyLoraTriggerSubstitution } from '../utils';
import { getGeminiModel, getGeminiTemperature } from './geminiService';
import { detectHelmetState } from './beatTypeService';
import { selectHairFragment, type HairFragmentResult } from './hairFragmentService';

// ============================================================================
// FLUX Prompt Engine Architect Memo: Validation Constants & Functions
// Belt-and-suspenders enforcement layer: logs warnings, does NOT block generation.
// ============================================================================

/**
 * Fabricated terms that are NOT in the canonical Aegis description.
 * The prompt generator must NEVER use these.
 * Source: Architect Memo Section 3 - Canonical Descriptions Only.
 */
const FORBIDDEN_FABRICATION_TERMS = [
  'tactical sensor arrays',
  'integrated weapon mounting points',
  'combat webbing',
  'ammunition pouches',
  'angular aggressive design',
  'subtle geometric sensor patterns',
  'integrated biometric monitors',
  'reinforced joints at knees and elbows',
  'side-mounted sensors',
  'cargo pockets',
  'loose fitting',
  'fatigues',
];

/**
 * Canonical Aegis terms (approved for use in prompts).
 * Source: Architect Memo Section 3.
 */
const CANONICAL_AEGIS_TERMS = [
  'skin-tight matte charcoal-black Aegis suit',
  'hexagonal weave pattern',
  'vacuum-sealed second-skin fit',
  'smooth latex-like surface',
  'molded armored bust panels',
  'molded chest armor plates',
  'LED underglow',
  'Wraith helmet',
  'dark opaque visor',
  'matte charcoal angular faceplate',
  'ribbed reinforcement panels',
];

/**
 * Forbidden-to-canonical replacement map for prompt sanitization.
 * Replaces fabricated military terms with canonical Aegis vocabulary.
 * Empty string means "delete without replacement" (term adds no visual value).
 */
const FABRICATION_REPLACEMENTS: [RegExp, string][] = [
  [/,?\s*tactical sensor arrays/gi, ''],
  [/,?\s*integrated weapon mounting points on thighs and back/gi, ''],
  [/,?\s*integrated weapon mounting points/gi, ''],
  [/,?\s*combat webbing with ammunition pouches/gi, ''],
  [/,?\s*combat webbing/gi, ''],
  [/,?\s*ammunition pouches/gi, ''],
  [/angular aggressive design with side-mounted sensors/gi, 'angular matte black shell'],
  [/angular aggressive design/gi, 'angular matte black shell'],
  [/,?\s*side-mounted sensors/gi, ''],
  [/,?\s*subtle geometric sensor patterns/gi, ', non-reflective hexagonal weave'],
  [/,?\s*integrated biometric monitors on forearms/gi, ', forearm gauntlets with LEDs'],
  [/,?\s*integrated biometric monitors/gi, ''],
  [/,?\s*reinforced joints at knees and elbows/gi, ''],
  [/,?\s*reinforced joints/gi, ''],
  [/,?\s*cargo pockets/gi, ''],
  [/loose fitting/gi, 'skin-tight'],
  [/\bfatigues\b/gi, 'Aegis adaptive biosuit'],
];

/**
 * Detect whether the current episode uses Aegis suits by checking all characters'
 * clothing_description and swarmui_prompt_override fields for "aegis" references.
 * Returns true if any character in any scene references Aegis gear.
 */
function detectAegisEpisode(parsedEpisodeContext: any): boolean {
  try {
    const scenes = parsedEpisodeContext?.episode?.scenes;
    if (!Array.isArray(scenes)) return false;
    for (const scene of scenes) {
      const allChars = [...(scene.characters || []), ...(scene.character_appearances || [])];
      for (const char of allChars) {
        const loc = char.location_context;
        if (loc?.clothing_description && /aegis/i.test(loc.clothing_description)) return true;
        if (loc?.swarmui_prompt_override && /aegis/i.test(loc.swarmui_prompt_override)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Sanitize a prompt override or generated prompt by replacing forbidden
 * fabrication terms with canonical Aegis vocabulary.
 * Acts as a safety net for stale cached data or Gemini non-compliance.
 * @param isAegisContext - When false, skip Aegis-specific replacements (e.g. fatigues → Aegis biosuit)
 */
function sanitizePromptOverride(text: string, isAegisContext: boolean = true): string {
  let sanitized = text;
  for (const [pattern, replacement] of FABRICATION_REPLACEMENTS) {
    // Skip Aegis-specific replacements when not in an Aegis context
    if (!isAegisContext && replacement.toLowerCase().includes('aegis')) continue;
    sanitized = sanitized.replace(pattern, replacement);
  }
  // Clean up double commas/spaces from removals
  sanitized = sanitized.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();
  return sanitized;
}

/**
 * Estimate T5 token count for a prompt.
 * T5 tokenizer averages ~4 characters per token for English text.
 * RULE: Total prompt MUST stay under 200 tokens (Architect Memo Section 3/12B).
 */
function estimatePromptTokens(prompt: string): number {
  // Strip segment tags from count (processed separately by SwarmUI)
  const withoutSegments = prompt.replace(/<segment:[^>]+>/g, '').trim();
  return Math.ceil(withoutSegments.length / 4);
}

/**
 * Calculate adaptive token budget based on shot type, character count, helmet states, and vehicle presence.
 * Replaces the fixed 200-token hard limit with per-beat allocations.
 *
 * Budget logic:
 * - Close-ups need more tokens per character (face/expression detail)
 * - Wide/establishing shots need fewer character tokens (figures are small)
 * - Helmets free ~30 tokens (no hair, face, eye color) reinvested into suit detail
 * - Vehicle scenes get +20 tokens for motorcycle description
 *
 * v0.19: Adaptive Token Budgets
 */
function calculateAdaptiveTokenBudget(
  shotType: string,
  characterCount: number,
  helmetStates: Array<'sealed' | 'visor_up' | 'off' | null>,
  hasVehicle: boolean
): TokenBudget {
  // Base totals by shot type and character count (from production analysis)
  const BASE_BUDGETS: Record<string, { one: number; two: number }> = {
    'close-up shot':    { one: 250, two: 280 },
    'close-up':         { one: 250, two: 280 },
    'medium close-up':  { one: 235, two: 270 },
    'medium shot':      { one: 220, two: 260 },
    'medium wide shot': { one: 200, two: 230 },
    'wide shot':        { one: 180, two: 200 },
    'extreme wide shot':{ one: 150, two: 170 },
    'establishing shot':{ one: 150, two: 150 },
  };

  // Normalize shot type to lookup key
  const normalizedShot = shotType.toLowerCase().trim();
  const baseBudget = BASE_BUDGETS[normalizedShot] || BASE_BUDGETS['medium shot'];
  const effectiveCharCount = Math.min(characterCount, 2);
  let total = effectiveCharCount >= 2 ? baseBudget.two : baseBudget.one;

  // Helmet savings: each sealed helmet frees ~30 tokens (no hair ~15, no face ~10, no eye color ~5)
  // Reinvest 25 tokens per helmeted character into suit detail
  let helmetSavings = 0;
  for (const state of helmetStates) {
    if (state === 'sealed') {
      helmetSavings += 30;
      total -= 30; // Remove hair/face budget
      total += 25; // Reinvest into suit detail
    }
  }

  // Vehicle scenes: +20 tokens for motorcycle description + spatial arrangement
  if (hasVehicle) {
    total += 20;
  }

  // Allocate budget across sections
  const isCloseUp = normalizedShot.includes('close');
  const isWide = normalizedShot.includes('wide') || normalizedShot.includes('establishing');

  const composition = 30; // Always 30 — first tokens, highest T5 attention
  const segments = 15;    // Segment tags are roughly constant
  const remaining = total - composition - segments;

  let character1: number;
  let character2: number;
  let environment: number;
  let atmosphere: number;

  if (effectiveCharCount >= 2) {
    if (isCloseUp) {
      character1 = Math.round(remaining * 0.30);
      character2 = Math.round(remaining * 0.28);
      environment = Math.round(remaining * 0.22);
      atmosphere = remaining - character1 - character2 - environment;
    } else if (isWide) {
      character1 = Math.round(remaining * 0.18);
      character2 = Math.round(remaining * 0.16);
      environment = Math.round(remaining * 0.36);
      atmosphere = remaining - character1 - character2 - environment;
    } else {
      // Medium shots
      character1 = Math.round(remaining * 0.25);
      character2 = Math.round(remaining * 0.23);
      environment = Math.round(remaining * 0.28);
      atmosphere = remaining - character1 - character2 - environment;
    }
  } else {
    character2 = 0;
    if (isCloseUp) {
      character1 = Math.round(remaining * 0.45);
      environment = Math.round(remaining * 0.28);
      atmosphere = remaining - character1 - environment;
    } else if (isWide) {
      character1 = Math.round(remaining * 0.22);
      environment = Math.round(remaining * 0.45);
      atmosphere = remaining - character1 - environment;
    } else {
      character1 = Math.round(remaining * 0.35);
      environment = Math.round(remaining * 0.35);
      atmosphere = remaining - character1 - environment;
    }
  }

  return {
    total,
    composition,
    character1,
    character2,
    environment,
    atmosphere,
    segments,
  };
}

/**
 * Check prompt against forbidden fabrication terms.
 * RULE: Character/gear descriptions must come VERBATIM from canonical reference.
 */
function validateCanonicalDescriptions(prompt: string, beatId: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const violations: string[] = [];

  for (const term of FORBIDDEN_FABRICATION_TERMS) {
    if (lowerPrompt.includes(term.toLowerCase())) {
      violations.push(term);
    }
  }

  if (violations.length > 0) {
    console.warn(`[CanonicalValidation] ${beatId}: Found ${violations.length} fabricated term(s): ${violations.join(', ')}`);
  }

  return violations;
}

/**
 * Validate that persistent scene elements appear in the generated prompt.
 * RULE: All persistent elements carry forward until narrative EXPLICITLY changes them.
 * Validation check: "What would a camera literally see right now?"
 */
function validatePromptContinuity(
  prompt: string,
  beatId: string,
  persistentState: ScenePersistentState | undefined,
  characterTriggers: Map<string, string>
): { missingCharacters: string[]; missingVehicle: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const missingCharacters: string[] = [];
  let missingVehicle = false;

  if (!persistentState) {
    return { missingCharacters, missingVehicle, warnings };
  }

  const lowerPrompt = prompt.toLowerCase();

  // Check all present characters appear (by trigger word)
  // Skip Ghost - non-physical entity that cannot be rendered in most beats
  for (const charName of persistentState.charactersPresent) {
    if (charName.toLowerCase() === 'ghost') continue;
    const trigger = characterTriggers.get(charName);
    if (trigger && !lowerPrompt.includes(trigger.toLowerCase())) {
      missingCharacters.push(charName);
      warnings.push(`Missing character: ${charName} (trigger: ${trigger}) should be in scene`);
    }
  }

  // Check vehicle presence when in_motion
  if (persistentState.vehicle && persistentState.vehicleState === 'in_motion') {
    if (!lowerPrompt.includes('motorcycle') && !lowerPrompt.includes('bike') && !lowerPrompt.includes('dinghy')) {
      missingVehicle = true;
      warnings.push(`Missing vehicle: Dinghy is in_motion but not in prompt`);
    }
  }

  if (warnings.length > 0) {
    console.warn(`[ContinuityValidation] ${beatId}: ${warnings.length} issue(s):`);
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  return { missingCharacters, missingVehicle, warnings };
}

/**
 * Determine if FLUX or ALTERNATE model should be used.
 * RULE: If ALL characters have visors DOWN (no faces visible),
 * flag for ALTERNATE model rendering (Architect Memo Section 9).
 */
function determineModelRecommendation(
  prompt: string,
  beatId: string
): { model: 'FLUX' | 'ALTERNATE'; reason: string } {
  const lowerPrompt = prompt.toLowerCase();

  const hasFaceSegments = lowerPrompt.includes('<segment:yolo-face');

  const hasVisorDown = lowerPrompt.includes('visor down') ||
    lowerPrompt.includes('sealed wraith helmet') ||
    lowerPrompt.includes('dark visor') ||
    lowerPrompt.includes('dark opaque visor');

  const hasFaceVisible = lowerPrompt.includes('face visible') ||
    lowerPrompt.includes('visor raised') ||
    lowerPrompt.includes('visor up');

  if (!hasFaceSegments && hasVisorDown && !hasFaceVisible) {
    console.log(`[ModelRec] ${beatId}: ALTERNATE recommended (no faces, complex composition likely)`);
    return { model: 'ALTERNATE', reason: 'no_faces_complex_composition' };
  }

  return { model: 'FLUX', reason: 'faces_visible' };
}

/**
 * Condense a full swarmui_prompt_override based on shot type and helmet state.
 * Full overrides are 70-164 tokens — too large for wide/extreme wide shots.
 * This function extracts the most visually important parts for the given shot type.
 *
 * v0.19: Override-Aware Character Injection
 *
 * @param override - Full swarmui_prompt_override from database
 * @param shotType - FLUX shot type (close-up, medium, wide, extreme wide)
 * @param helmetState - 'sealed' | 'visor_up' | 'off' | null
 * @returns Condensed override string suitable for injection
 */
function condenseOverrideForShot(
  override: string,
  shotType: string,
  helmetState: 'sealed' | 'visor_up' | 'off' | null
): string {
  const normalizedShot = shotType.toLowerCase().trim();

  // Strip existing segment tags — they're handled separately by applyDatabaseSegments
  const textOnly = override.replace(/<segment:[^>]+>/g, '').trim();

  // Parse override into semantic sections by splitting on commas
  const parts = textOnly.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return override;

  // Identify trigger (first part, contains the LoRA trigger word)
  const trigger = parts[0];

  // Categorize remaining parts
  const physicalTraits: string[] = [];   // age, eye color, skin, face shape
  const hairParts: string[] = [];        // hair descriptions
  const suitParts: string[] = [];        // suit/clothing/armor
  const helmetParts: string[] = [];      // helmet/visor
  const accessoryParts: string[] = [];   // gauntlets, LEDs, secondary gear

  for (let i = 1; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (lower.includes('hair') || lower.includes('ponytail') || lower.includes('updo') || lower.includes('tousled')) {
      hairParts.push(parts[i]);
    } else if (lower.includes('helmet') || lower.includes('visor')) {
      helmetParts.push(parts[i]);
    } else if (lower.includes('suit') || lower.includes('bodysuit') || lower.includes('aegis') ||
               lower.includes('armor') || lower.includes('mesh') || lower.includes('bust panel') ||
               lower.includes('chest plate') || lower.includes('collar') || lower.includes('zipper') ||
               lower.includes('hexagonal') || lower.includes('compression') || lower.includes('matte')) {
      suitParts.push(parts[i]);
    } else if (lower.includes('gauntlet') || lower.includes('led') || lower.includes('forearm') ||
               lower.includes('underglow') || lower.includes('indicator')) {
      accessoryParts.push(parts[i]);
    } else if (lower.includes('age') || lower.includes('eyes') || lower.includes('skin') ||
               lower.includes('face') || lower.includes('jawline') || lower.includes('brow') ||
               lower.includes('old') || lower.includes('young') || lower.includes('woman') ||
               lower.includes('man ') || /^\d+/.test(lower)) {
      physicalTraits.push(parts[i]);
    } else {
      // Default: treat as accessory/secondary
      accessoryParts.push(parts[i]);
    }
  }

  // Apply helmet state: if sealed, strip hair and face, add helmet description
  const effectiveHair = (helmetState === 'sealed' || helmetState === 'visor_up') ? [] : hairParts;
  const effectiveFace = helmetState === 'sealed' ? [] : physicalTraits;
  const helmetFragment = helmetState === 'sealed'
    ? ['sealed Wraith helmet with dark opaque visor']
    : helmetState === 'visor_up'
      ? ['Wraith helmet visor raised']
      : helmetParts;

  // Build condensed override based on shot type
  let condensed: string[];

  if (normalizedShot.includes('close')) {
    // Close-up: full detail — all sections
    condensed = [trigger, ...effectiveFace, ...effectiveHair, ...suitParts, ...helmetFragment, ...accessoryParts];
  } else if (normalizedShot.includes('extreme wide') || normalizedShot.includes('establishing')) {
    // Extreme wide: trigger + minimal suit reference
    const suitSummary = suitParts.length > 0 ? suitParts[0] : 'matte-black tactical suit';
    condensed = [trigger, suitSummary];
    if (helmetState === 'sealed') {
      condensed.push('sealed helmet');
    }
  } else if (normalizedShot.includes('wide')) {
    // Wide: trigger + core suit + helmet state
    condensed = [trigger, ...suitParts.slice(0, 2), ...helmetFragment.slice(0, 1)];
  } else {
    // Medium shot: trigger + face + suit core, drop trailing accessories
    condensed = [trigger, ...effectiveFace.slice(0, 2), ...effectiveHair.slice(0, 1), ...suitParts.slice(0, 2), ...helmetFragment.slice(0, 1)];
  }

  return condensed.filter(Boolean).join(', ');
}

/**
 * Override-aware character injection. When a character is missing from Gemini's output,
 * pulls their condensed swarmui_prompt_override from Episode Context and injects it
 * at the attention-optimal position (token 31-80 zone, after first character description).
 *
 * Replaces injectMissingContinuityElements() from v0.18 which only appended
 * weak phrases like "JRUMLV woman nearby" at the end of the prompt.
 *
 * v0.19: Override-Aware Character Injection
 */
function injectMissingCharacterOverrides(
  prompt: string,
  beatId: string,
  persistentState: ScenePersistentState | undefined,
  characterTriggers: Map<string, string>,
  characterContexts: Array<{ character_name: string; aliases: string[]; base_trigger: string }>,
  parsedEpisodeContext: any,
  sceneNumber: number,
  shotType: string,
  helmetState: string | null | undefined,
  isAegisContext: boolean = true
): { prompt: string; injectedCharacters: string[]; vehicleInjected: boolean } {
  if (!persistentState) {
    return { prompt, injectedCharacters: [], vehicleInjected: false };
  }

  let lowerPrompt = prompt.toLowerCase();
  const injectedCharacters: string[] = [];
  let vehicleInjected = false;

  // --- Vehicle injection (same as v0.18 — insert after first comma) ---
  if (persistentState.vehicle && persistentState.vehicleState === 'in_motion') {
    const hasVehicleRef = lowerPrompt.includes('motorcycle') ||
                          lowerPrompt.includes('bike') ||
                          lowerPrompt.includes('dinghy');
    if (!hasVehicleRef) {
      const firstComma = prompt.indexOf(',');
      if (firstComma > 0) {
        prompt = prompt.slice(0, firstComma + 1) +
          ' matte-black armored motorcycle speeding on cracked asphalt,' +
          prompt.slice(firstComma + 1);
      } else {
        prompt = 'matte-black armored motorcycle speeding on cracked asphalt, ' + prompt;
      }
      vehicleInjected = true;
      lowerPrompt = prompt.toLowerCase();
      console.log(`[VehicleInjection] ${beatId}: Injected motorcycle reference (vehicleState: in_motion)`);
    }
  }

  // --- Override-aware character injection ---
  for (const charName of persistentState.charactersPresent) {
    if (charName.toLowerCase() === 'ghost') continue;

    const trigger = characterTriggers.get(charName);
    if (!trigger) continue;

    if (lowerPrompt.includes(trigger.toLowerCase())) continue;

    // This character is missing — get their override for condensed injection
    const normalizedHelmet = helmetState === 'VISOR_DOWN' ? 'sealed'
      : helmetState === 'VISOR_UP' ? 'visor_up'
      : helmetState === 'HELMET_OFF' || helmetState === 'IN_HAND' || helmetState === 'ON_VEHICLE' ? 'off'
      : null;

    let injection = '';

    // Try to get full override from Episode Context (multi-phase support v0.20)
    const characterPhase = persistentState.characterPhases[charName] || 'default';
    const fullOverride = parsedEpisodeContext && sceneNumber
      ? getCharacterOverrideForScene(parsedEpisodeContext, sceneNumber, trigger, isAegisContext, characterPhase)
      : null;

    if (fullOverride) {
      // Condense override based on shot type and helmet state
      injection = condenseOverrideForShot(fullOverride, shotType, normalizedHelmet);
      console.log(`[OverrideInjection] ${beatId}: Condensed override for ${charName} (${shotType}): "${injection.substring(0, 80)}..."`);
    } else {
      // Fallback: build contextual phrase (same logic as v0.18 but with position context)
      const isCat = charName.toLowerCase().includes('cat');
      const genderDesc = isCat ? 'woman' : 'man';
      const triggerHasGender = trigger.toLowerCase().includes('man') || trigger.toLowerCase().includes('woman');
      const subjectPrefix = triggerHasGender ? trigger : `${trigger} ${genderDesc}`;
      const position = persistentState.characterPositions[charName];
      const isVehicleScene = persistentState.vehicleState === 'in_motion';
      const isHelmetDown = normalizedHelmet === 'sealed';

      // Try clothing_description as secondary fallback before hardcoded default
      const clothingDesc = parsedEpisodeContext && sceneNumber
        ? getCharacterClothingForScene(parsedEpisodeContext, sceneNumber, trigger)
        : null;

      if (clothingDesc) {
        injection = `${subjectPrefix} wearing ${clothingDesc}`;
      } else if (isVehicleScene && position) {
        if (position.includes('driving') || position.includes('front')) {
          injection = `${subjectPrefix} driving`;
        } else if (position.includes('passenger') || position.includes('behind')) {
          injection = `${subjectPrefix} seated behind`;
        } else {
          injection = `${subjectPrefix} on motorcycle`;
        }
        if (isHelmetDown) injection += ' in sealed Wraith helmet';
      } else if (isHelmetDown) {
        injection = `${subjectPrefix} in sealed Wraith helmet`;
      } else if (isAegisContext) {
        injection = `${subjectPrefix} in skin-tight matte charcoal-black Aegis suit`;
      } else {
        // Generic fallback — just trigger + gender, no clothing assumption
        injection = subjectPrefix;
      }
      console.log(`[TriggerInjection] ${beatId}: Fallback injection for ${charName} -> "${injection}"`);
    }

    // INSERT at attention-optimal position (after first character description, token 31-80 zone)
    // Find the second comma (first comma is after shot type, second is after first character desc)
    const firstComma = prompt.indexOf(',');
    const secondComma = firstComma >= 0 ? prompt.indexOf(',', firstComma + 1) : -1;

    if (secondComma > 0) {
      // Insert after second comma — places injection in token 31-80 zone
      prompt = prompt.slice(0, secondComma + 1) +
        ` ${injection},` +
        prompt.slice(secondComma + 1);
    } else if (firstComma > 0) {
      // Only one comma found — insert after it
      prompt = prompt.slice(0, firstComma + 1) +
        ` ${injection},` +
        prompt.slice(firstComma + 1);
    } else {
      // No commas — append
      prompt = `${prompt}, ${injection}`;
    }

    injectedCharacters.push(charName);
    lowerPrompt = prompt.toLowerCase();
  }

  if (injectedCharacters.length > 0 || vehicleInjected) {
    prompt = prompt.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();
  }

  return { prompt, injectedCharacters, vehicleInjected };
}

/**
 * Run all post-generation validation checks on a prompt.
 * Belt-and-suspenders enforcement: logs warnings, does NOT block generation.
 */
function runPostGenerationValidation(
  prompt: string,
  beatId: string,
  persistentState: ScenePersistentState | undefined,
  characterTriggers: Map<string, string>,
  sceneTemplate?: SceneTypeTemplate,
  injectedCharacters: string[] = [],
  vehicleInjected: boolean = false,
  adaptiveBudget?: TokenBudget
): PromptValidationResult {
  // 1. Token budget (v0.19: use adaptive budget, fallback to 300 max)
  const tokenCount = estimatePromptTokens(prompt);
  const budgetLimit = adaptiveBudget?.total || 300;
  const tokenBudgetExceeded = tokenCount > budgetLimit;
  if (tokenBudgetExceeded) {
    console.warn(`[TokenBudget] ${beatId}: ${tokenCount} tokens (exceeds ${budgetLimit} adaptive limit)`);
  }

  // 2. Continuity
  const continuity = validatePromptContinuity(prompt, beatId, persistentState, characterTriggers);

  // 3. Canonical descriptions
  const forbiddenTermsFound = validateCanonicalDescriptions(prompt, beatId);

  // 4. Visor violation check
  const lowerPrompt = prompt.toLowerCase();
  const hasVisorDown = lowerPrompt.includes('visor down') || lowerPrompt.includes('sealed wraith helmet');
  const hasHairOrFace = !!lowerPrompt.match(/\bhair\b.*\b(color|style|ponytail|flowing|brown|white|dark)\b|\bexposing face\b|\bshowing face\b/);
  const visorViolation = hasVisorDown && hasHairOrFace;
  if (visorViolation) {
    console.warn(`[VisorViolation] ${beatId}: Hair/face description found with visor-down helmet`);
  }

  // 5. Model recommendation
  const modelRec = determineModelRecommendation(prompt, beatId);

  // Collect all warnings
  const warnings: string[] = [];
  if (tokenBudgetExceeded) warnings.push(`Token budget exceeded: ${tokenCount}/${budgetLimit}`);
  warnings.push(...continuity.warnings);
  if (forbiddenTermsFound.length > 0) warnings.push(`Fabricated terms: ${forbiddenTermsFound.join(', ')}`);
  if (visorViolation) warnings.push('Visor-down but hair/face descriptions present');

  return {
    beatId,
    tokenCount,
    tokenBudgetExceeded,
    missingCharacters: continuity.missingCharacters,
    missingVehicle: continuity.missingVehicle,
    forbiddenTermsFound,
    visorViolation,
    modelRecommendation: modelRec.model,
    modelRecommendationReason: modelRec.reason,
    sceneTemplate,
    injectedCharacters,
    vehicleInjected,
    adaptiveTokenBudget: adaptiveBudget?.total,
    warnings,
  };
}

// ============================================================================
// JSON Repair Utilities
// ============================================================================

/**
 * Attempt to repair truncated or malformed JSON from LLM response.
 * Common issues:
 * - Truncated at the end (missing closing brackets)
 * - Extra trailing content after valid JSON
 * - Incomplete last array element
 *
 * @param jsonString The potentially malformed JSON string
 * @returns Repaired JSON string or original if repair fails
 */
function attemptJsonRepair(jsonString: string): { repaired: string; wasRepaired: boolean; droppedItems: number } {
    let repaired = jsonString.trim();
    let wasRepaired = false;
    let droppedItems = 0;

    // Remove any markdown code fences that might be present
    if (repaired.startsWith('```json')) {
        repaired = repaired.slice(7);
        wasRepaired = true;
    }
    if (repaired.startsWith('```')) {
        repaired = repaired.slice(3);
        wasRepaired = true;
    }
    if (repaired.endsWith('```')) {
        repaired = repaired.slice(0, -3);
        wasRepaired = true;
    }
    repaired = repaired.trim();

    // Try to parse as-is first
    try {
        JSON.parse(repaired);
        return { repaired, wasRepaired, droppedItems: 0 };
    } catch (e) {
        // Continue with repair attempts
    }

    // Check if it's a truncated array - look for pattern like ], followed by incomplete object
    // Strategy: Find the last complete object and close the array there
    const arrayStart = repaired.indexOf('[');
    if (arrayStart >= 0) {
        // Find all complete objects by looking for "},\n{" or "}\n]" patterns
        const objectEndPattern = /\}(\s*,?\s*(?=\{|\]))/g;
        let lastValidEnd = -1;
        let match;

        while ((match = objectEndPattern.exec(repaired)) !== null) {
            // Try to parse up to this point
            const testStr = repaired.substring(0, match.index + 1) + ']';
            try {
                JSON.parse(testStr);
                lastValidEnd = match.index + 1;
            } catch (e) {
                // Not valid yet, continue
            }
        }

        if (lastValidEnd > 0) {
            repaired = repaired.substring(0, lastValidEnd) + ']';
            wasRepaired = true;

            // Count how many objects we kept vs expected
            try {
                const parsed = JSON.parse(repaired);
                if (Array.isArray(parsed)) {
                    // Estimate dropped items by comparing array depth
                    droppedItems = 0; // We don't know how many were expected
                }
            } catch (e) {
                // Still failed
            }
        }
    }

    // If still failing, try closing brackets progressively
    if (repaired.includes('{') || repaired.includes('[')) {
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escapeNext = false;

        for (const char of repaired) {
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{') openBraces++;
                if (char === '}') openBraces--;
                if (char === '[') openBrackets++;
                if (char === ']') openBrackets--;
            }
        }

        // Add missing closing brackets
        if (openBraces > 0 || openBrackets > 0) {
            // If we're in the middle of an incomplete object, remove it
            const lastComma = repaired.lastIndexOf(',');
            if (lastComma > repaired.lastIndexOf('}')) {
                repaired = repaired.substring(0, lastComma);
                droppedItems++;
            }

            // Add closing brackets
            for (let i = 0; i < openBraces; i++) repaired += '}';
            for (let i = 0; i < openBrackets; i++) repaired += ']';
            wasRepaired = true;
        }
    }

    return { repaired, wasRepaired, droppedItems };
}

const swarmUIPromptSchema = {
    type: Type.OBJECT,
    properties: {
        prompt: { type: Type.STRING },
        model: { type: Type.STRING },
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
        steps: { type: Type.NUMBER },
        cfgscale: { type: Type.NUMBER },
        seed: { type: Type.NUMBER },
    },
    required: ['prompt', 'model', 'width', 'height', 'steps', 'cfgscale', 'seed'],
};

/**
 * Extract image_config from Episode Context JSON.
 * Returns config from database if available, otherwise returns default values.
 */
function extractImageConfig(episodeContextJson: string): ImageConfig | null {
    try {
        const context = JSON.parse(episodeContextJson);
        if (context.episode?.image_config) {
            console.log('[ImageConfig] Using image_config from Episode Context');
            return context.episode.image_config;
        }
    } catch (e) {
        console.warn('[ImageConfig] Failed to parse Episode Context for image_config:', e);
    }
    return null;
}

/**
 * Extract scene overrides from Episode Context JSON.
 * Extracts time_of_day, intensity, pacing, and arc_phase per scene.
 *
 * @param episodeContextJson - The Episode Context JSON string
 * @returns Record of scene number -> scene options for processEpisodeWithFullContext
 */
function extractSceneOverrides(episodeContextJson: string): Record<number, {
    timeOfDay?: string | null;
    intensity?: number;
    pacing?: string;
    arcPhase?: string | null;
}> {
    const overrides: Record<number, { timeOfDay?: string | null; intensity?: number; pacing?: string; arcPhase?: string | null }> = {};

    try {
        const context = JSON.parse(episodeContextJson);
        const scenes = context.episode?.scenes || [];

        for (const scene of scenes) {
            const sceneNumber = scene.scene_number;
            if (sceneNumber) {
                overrides[sceneNumber] = {
                    timeOfDay: scene.time_of_day || null,
                    intensity: scene.intensity || undefined,
                    pacing: scene.pacing || undefined,
                    arcPhase: scene.arc_phase || null,
                };

                if (scene.time_of_day) {
                    console.log(`[SceneContext] Scene ${sceneNumber}: time_of_day="${scene.time_of_day}"`);
                }
            }
        }

        if (Object.keys(overrides).length > 0) {
            console.log(`[SceneContext] Extracted time_of_day for ${Object.keys(overrides).length} scenes from Episode Context`);
        }
    } catch (e) {
        console.warn('[SceneContext] Failed to parse Episode Context for scene overrides:', e);
    }

    return overrides;
}

/**
 * Get generation parameters from image_config or environment variables.
 * Priority: Episode Context image_config > Environment variables > Hardcoded defaults
 */
function getGenerationParams(imageConfig: ImageConfig | null, preset: 'cinematic' | 'vertical' = 'cinematic') {
    // Environment variable helper
    const getEnvVar = (key: string): string | undefined => {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
        if (typeof import.meta !== 'undefined') {
            try {
                const env = import.meta.env;
                if (env) return env[key];
            } catch (e) {}
        }
        return undefined;
    };

    if (imageConfig) {
        // Use image_config from database (via Episode Context)
        const presetDimensions = imageConfig.presets[preset];
        return {
            model: imageConfig.model,
            width: presetDimensions.width,
            height: presetDimensions.height,
            steps: imageConfig.steps,
            cfgscale: imageConfig.cfgscale,
            sampler: imageConfig.sampler,
            scheduler: imageConfig.scheduler,
            loras: imageConfig.loras,
            loraweights: imageConfig.lora_weights,
        };
    }

    // Fallback to environment variables
    const width = preset === 'vertical'
        ? parseInt(getEnvVar('SWARMUI_VERTICAL_WIDTH') || '768')
        : parseInt(getEnvVar('SWARMUI_WIDTH') || '1344');
    const height = preset === 'vertical'
        ? parseInt(getEnvVar('SWARMUI_VERTICAL_HEIGHT') || '1344')
        : parseInt(getEnvVar('SWARMUI_HEIGHT') || '768');

    return {
        model: getEnvVar('SWARMUI_MODEL') || 'flux1-dev-fp8',
        width,
        height,
        steps: parseInt(getEnvVar('SWARMUI_STEPS') || '40'),
        cfgscale: parseFloat(getEnvVar('SWARMUI_CFG_SCALE') || '1'),
        sampler: getEnvVar('SWARMUI_SAMPLER') || 'euler',
        scheduler: getEnvVar('SWARMUI_SCHEDULER') || 'beta',
        loras: getEnvVar('SWARMUI_LORAS') || 'gargan',
        loraweights: getEnvVar('SWARMUI_LORA_WEIGHTS') || '1',
    };
}

/**
 * Clothing segment mapping for automatic segment tag generation.
 * When clothing_description contains these keywords, append corresponding segment tags.
 * Lower creativity (0.3-0.4) preserves original while cleaning artifacts.
 */
const CLOTHING_SEGMENT_MAP: Array<{
    keywords: string[];
    segment: string;
    creativity: number;
    description: string;
}> = [
    // === AEGIS TACTICAL SUIT (Sci-Fi) - Updated mesh/armor hybrid ===
    {
        keywords: ['aegis', 'tactical bodysuit', 'compression black tactical bodysuit'],
        segment: 'ultra-tight compression black tactical bodysuit semi-transparent mesh',
        creativity: 0.4,
        description: 'Aegis suit with mesh base layer and armor panels'
    },
    {
        keywords: ['molded armored bust panels', 'bust panels', 'armored bust'],
        segment: 'molded armored bust panels with blue LED underglow',
        creativity: 0.4,
        description: 'Cat-specific molded chest armor with LED lighting'
    },
    {
        keywords: ['molded chest armor plates', 'chest armor plates', 'chest plates'],
        segment: 'molded chest armor plates with blue LED underglow',
        creativity: 0.4,
        description: 'Daniel-specific molded chest armor with LED lighting'
    },
    {
        keywords: ['high collar', 'collar with front zipper', 'front zipper'],
        segment: 'high collar tactical bodysuit front zipper',
        creativity: 0.4,
        description: 'High collar with front zipper detail'
    },
    {
        keywords: ['forearm gauntlets', 'gauntlets with led', 'gauntlets with multicolor'],
        segment: 'forearm gauntlets with multicolor LED indicators',
        creativity: 0.4,
        description: 'Tech gauntlets with LED displays'
    },
    // === WRAITH HELMET STATES ===
    {
        keywords: ['helmet visor down', 'visor down', 'visor fully down', 'concealing face'],
        segment: 'matte black tactical helmet reflective black visor down',
        creativity: 0.4,
        description: 'Wraith helmet with reflective black visor fully down'
    },
    {
        keywords: ['helmet visor up', 'visor up', 'visor raised', 'visor retracted', 'exposing face'],
        segment: 'matte black tactical helmet visor raised',
        creativity: 0.4,
        description: 'Wraith helmet with visor raised exposing face'
    },
    {
        keywords: ['helmet off', 'helmet removed', 'helmet mag-locked', 'helmet at hip', 'without helmet'],
        segment: 'tactical helmet clipped to hip',
        creativity: 0.4,
        description: 'Wraith helmet carried at hip'
    },
    {
        keywords: ['hud active', 'hud display', 'holographic hud', 'targeting reticle'],
        segment: 'tactical helmet with glowing hud elements on visor',
        creativity: 0.4,
        description: 'Wraith helmet with active HUD display'
    },
    // === STANDARD CLOTHING ===
    {
        keywords: ['tank top', 'tank-top', 'sleeveless tank', 'crop tank'],
        segment: 'plain seamless tank top',
        creativity: 0.4,
        description: 'Reinforces clean seamless construction, removes unwanted seams/fasteners'
    },
    {
        keywords: ['halter', 'halter top', 'halterneck'],
        segment: 'halter top',
        creativity: 0.4,
        description: 'Clean halter neckline without artifacts'
    },
    {
        keywords: ['crop top', 'cropped top', 'midriff'],
        segment: 'crop top midriff',
        creativity: 0.4,
        description: 'Clean crop with exposed midriff'
    },
    {
        keywords: ['sports bra', 'athletic bra'],
        segment: 'sports bra',
        creativity: 0.4,
        description: 'Clean athletic top'
    },
    {
        keywords: ['tactical vest', 'plate carrier', 'body armor'],
        segment: 'tactical vest',
        creativity: 0.5,
        description: 'Tactical gear consistency'
    }
];

/**
 * Detect clothing items in description and generate corresponding segment tags.
 * @param clothingDescription - The character's clothing description from Episode Context
 * @returns Array of segment tags to append to prompt (before YOLO face segment)
 */
function generateClothingSegments(clothingDescription: string): string[] {
    if (!clothingDescription) return [];

    const lowerDesc = clothingDescription.toLowerCase();
    const segments: string[] = [];

    for (const mapping of CLOTHING_SEGMENT_MAP) {
        const matched = mapping.keywords.some(keyword => lowerDesc.includes(keyword));
        if (matched) {
            // Format: <segment:description,creativity,threshold>
            segments.push(`<segment:${mapping.segment},${mapping.creativity},0.5>`);
            console.log(`[ClothingSegment] Detected "${mapping.keywords.find(k => lowerDesc.includes(k))}" → adding ${mapping.segment} segment`);
        }
    }

    return segments;
}

/**
 * Extract clothing description for a character in a specific scene from Episode Context.
 * @param episodeContext - Parsed Episode Context object
 * @param sceneNumber - Scene number to look up
 * @param characterTrigger - Character's base_trigger to identify them
 * @returns Clothing description string or null
 */
function getCharacterClothingForScene(
    episodeContext: any,
    sceneNumber: number,
    characterTrigger: string
): string | null {
    try {
        const scene = episodeContext.episode?.scenes?.find(
            (s: any) => s.scene_number === sceneNumber
        );
        if (!scene) return null;

        // Check scene.characters
        const charFromScene = scene.characters?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromScene?.location_context?.clothing_description) {
            return charFromScene.location_context.clothing_description;
        }

        // Check scene.character_appearances
        const charFromAppearances = scene.character_appearances?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromAppearances?.location_context?.clothing_description) {
            return charFromAppearances.location_context.clothing_description;
        }

        return null;
    } catch (e) {
        console.warn('[ClothingSegment] Error extracting clothing:', e);
        return null;
    }
}

/**
 * Get swarmui_prompt_override for a character in a specific scene.
 * This contains the complete prompt with all segments from StoryTeller database.
 * @param episodeContext - Parsed episode context JSON
 * @param sceneNumber - Scene number to search in
 * @param characterTrigger - Character's LORA trigger (e.g., "JRUMLV")
 * @returns The full swarmui_prompt_override or null if not found
 */
function getCharacterOverrideForScene(
    episodeContext: any,
    sceneNumber: number,
    characterTrigger: string,
    isAegisContext: boolean = true,
    phase: string = 'default'
): string | null {
    try {
        const scene = episodeContext.episode?.scenes?.find(
            (s: any) => s.scene_number === sceneNumber
        );
        if (!scene) return null;

        // Check scene.characters
        const charFromScene = scene.characters?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromScene?.location_context?.swarmui_prompt_override) {
            return sanitizePromptOverride(charFromScene.location_context.swarmui_prompt_override, isAegisContext);
        }

        // Check scene.character_appearances (multi-phase support v0.20)
        const charFromAppearances = scene.character_appearances?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromAppearances) {
            // Multi-phase support: try to find matching phase first
            if (charFromAppearances.phases && Array.isArray(charFromAppearances.phases)) {
                const phaseMatch = charFromAppearances.phases.find((p: any) => p.context_phase === phase)
                    ?? charFromAppearances.phases.find((p: any) => p.context_phase === 'default')
                    ?? charFromAppearances.phases[0];
                if (phaseMatch?.swarmui_prompt_override) {
                    return sanitizePromptOverride(phaseMatch.swarmui_prompt_override, isAegisContext);
                }
            }
            // Fallback to single location_context
            if (charFromAppearances.location_context?.swarmui_prompt_override) {
                return sanitizePromptOverride(charFromAppearances.location_context.swarmui_prompt_override, isAegisContext);
            }
        }

        return null;
    } catch (e) {
        console.warn('[SegmentExtraction] Error getting character override:', e);
        return null;
    }
}

/**
 * Extract all segment directives from a prompt string.
 * Segments are in format: <segment:description,weight1,weight2>
 * @param prompt - The prompt string containing segments
 * @returns Array of segment strings (e.g., ["<segment:bodysuit,0.4,0.5>", "<segment:helmet,0.4,0.5>"])
 */
function extractSegmentsFromPrompt(prompt: string): string[] {
    const segmentRegex = /<segment:[^>]+>/g;
    return prompt.match(segmentRegex) || [];
}

/**
 * Remove all segment directives from a prompt string.
 * Used to strip segments before re-adding database segments.
 * @param prompt - The prompt string potentially containing segments
 * @returns Prompt with all segments removed
 */
function stripSegmentsFromPrompt(prompt: string): string {
    return prompt.replace(/<segment:[^>]+>/g, '').trim();
}

/**
 * Apply segments from database override to Gemini's generated prompt.
 * Extracts segments from the original swarmui_prompt_override and appends them.
 * This ensures segments from StoryTeller database are always preserved.
 * @param geminiPrompt - The prompt generated by Gemini (may have segments stripped)
 * @param originalOverride - The swarmui_prompt_override from database (contains segments)
 * @returns Gemini prompt with database segments appended
 */
function applyDatabaseSegments(geminiPrompt: string, originalOverride: string | null): string {
    if (!originalOverride) return geminiPrompt;

    // Extract segments from the original database override
    const databaseSegments = extractSegmentsFromPrompt(originalOverride);
    if (databaseSegments.length === 0) return geminiPrompt;

    // Strip any segments Gemini may have generated (to avoid duplicates)
    const cleanedPrompt = stripSegmentsFromPrompt(geminiPrompt);

    // Append database segments at the end
    const result = `${cleanedPrompt} ${databaseSegments.join(' ')}`;

    console.log(`[SegmentInjection] Appended ${databaseSegments.length} segment(s) from database`);

    return result;
}

/**
 * Apply clothing segments to a prompt based on detected clothing items.
 * Inserts clothing segments BEFORE the YOLO face segment.
 * @deprecated Use applyDatabaseSegments() instead - segments should come from database
 * @param prompt - The generated prompt string
 * @param clothingDescription - Character's clothing description
 * @returns Modified prompt with clothing segments inserted
 */
function applyClothingSegmentsToPrompt(prompt: string, clothingDescription: string): string {
    const clothingSegments = generateClothingSegments(clothingDescription);
    if (clothingSegments.length === 0) return prompt;

    // Find the YOLO face segment position
    const yoloMatch = prompt.match(/<segment:yolo-face/);
    if (yoloMatch && yoloMatch.index !== undefined) {
        // Insert clothing segments before YOLO segment
        const beforeYolo = prompt.substring(0, yoloMatch.index);
        const yoloAndAfter = prompt.substring(yoloMatch.index);
        return `${beforeYolo}${clothingSegments.join(' ')} ${yoloAndAfter}`;
    }

    // No YOLO segment found, append clothing segments at end
    return `${prompt} ${clothingSegments.join(' ')}`;
}

// Response schema - only cinematic prompts are required for standard beat analysis (Phase C optimization)
const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            beatId: { type: Type.STRING },
            cinematic: swarmUIPromptSchema,
            vertical: swarmUIPromptSchema,
            marketingVertical: swarmUIPromptSchema,
        },
        required: ['beatId', 'cinematic']
    }
};

/**
 * StorySwarm API Response Types
 */
interface StorySwarmPromptResponse {
    success: boolean;
    prompts: Array<{
        beatId: string;
        prompt: {
            positive: string;
            negative: string;
        };
        generation_metadata: {
            agents_consulted: string[];
            database_sources: {
                character?: string;
                location?: string;
            };
            continuity_notes: string;
            generation_time_ms?: number;
        };
    }>;
    stats: {
        beats_processed: number;
        generation_time_ms: number;
        cache_hits?: number;
    };
    error?: {
        message: string;
        failed_beats?: string[];
    };
}

/**
 * Generate prompts via StorySwarm multi-agent pipeline API
 * Implements V2 integration with automatic fallback to local generation
 *
 * @param analyzedEpisode - Episode with beats needing prompts
 * @param episodeContext - Episode context JSON
 * @param styleConfig - Image generation style configuration
 * @returns StorySwarm response with generated prompts
 * @throws Error if all retries exhausted
 */
export async function generatePromptsViaStorySwarm(
    analyzedEpisode: AnalyzedEpisode,
    episodeContext: string,
    styleConfig: EpisodeStyleConfig,
    onProgress?: (message: string) => void
): Promise<StorySwarmPromptResponse> {
    // Get StorySwarm API URL from environment
    const getEnvVar = (key: string): string | undefined => {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key];
        }
        if (typeof process !== 'undefined' && process.env) {
            return (process.env as any)[key];
        }
        return undefined;
    };

    const apiUrl = getEnvVar('VITE_STORYSWARM_API_URL') ||
                   getEnvVar('STORYSWARM_API_URL') ||
                   'http://localhost:8050';

    const endpoint = `${apiUrl}/api/v1/visual-prompt/generate-batch`;

    // Parse episode context to get episode metadata
    let episodeNumber = 1;
    let episodeTitle = 'Unknown';
    let storyId: string | undefined;

    try {
        const context = JSON.parse(episodeContext);
        episodeNumber = context.episode?.episodeNumber || context.episode?.number || 1;
        episodeTitle = context.episode?.title || context.episode?.name || 'Unknown';
        storyId = context.story?.id || context.story?.story_id;
    } catch (e) {
        console.warn('[StorySwarm] Failed to parse episode context, using defaults');
    }

    // Build request payload
    const beats = analyzedEpisode.scenes.flatMap(scene =>
        scene.beats.map(beat => ({
            beatId: beat.beatId,
            sceneNumber: scene.sceneNumber,
            beatNumber: beat.beatNumber,
            scriptText: beat.scriptText,
            characters: beat.characters || [],
            locationId: beat.locationId || '',
            emotionalTone: beat.emotionalTone || '',
            visualElements: beat.visualElements || [],
            shotSuggestion: beat.shotSuggestion,
            cameraAngleSuggestion: beat.cameraAngleSuggestion
        }))
    );

    const requestPayload = {
        beats,
        episode_context: {
            episodeNumber,
            title: episodeTitle,
            storyId
        },
        style_config: {
            model: styleConfig.model || 'flux1-dev-fp8',
            cinematicAspectRatio: '16:9',
            steps: styleConfig.steps || 40,
            seed: styleConfig.seed
        }
    };

    console.log(`[StorySwarm] Calling API with ${beats.length} beats...`);
    onProgress?.(`Sending ${beats.length} beats to StorySwarm...`);

    // Retry logic with exponential backoff
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            onProgress?.(`Calling StorySwarm API (attempt ${attempt}/${maxRetries})...`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
            }

            const data: StorySwarmPromptResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'StorySwarm returned success=false');
            }

            console.log(`[StorySwarm] Success! Generated ${data.stats.beats_processed} prompts in ${data.stats.generation_time_ms}ms`);
            onProgress?.(`Received ${data.stats.beats_processed} prompts from StorySwarm`);

            return data;

        } catch (error) {
            lastError = error as Error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if error is retryable
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                                  errorMessage.includes('network') ||
                                  errorMessage.includes('timeout') ||
                                  errorMessage.includes('aborted');

            const isServerError = errorMessage.includes('HTTP 5');

            if (!isNetworkError && !isServerError) {
                // Non-retryable error (e.g., 400 Bad Request, invalid response)
                console.error('[StorySwarm] Non-retryable error:', errorMessage);
                throw error;
            }

            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`[StorySwarm] Attempt ${attempt} failed: ${errorMessage}`);
                console.log(`[StorySwarm] Retrying in ${delay}ms...`);
                onProgress?.(`StorySwarm attempt ${attempt} failed, retrying in ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('[StorySwarm] All retries exhausted');
            }
        }
    }

    // All retries failed
    throw lastError || new Error('StorySwarm API call failed after all retries');
}

export const generateSwarmUiPrompts = async (
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig,
    retrievalMode: RetrievalMode = 'manual',
    storyId?: string,
    provider: LLMProvider = 'gemini',
    onProgress?: (message: string) => void,
    promptVersion: 'v020' | 'v021' = 'v020'
): Promise<BeatPrompts[]> => {
    onProgress?.('Verifying API key...');

    // Route to v0.21 compiler pipeline if requested
    if (promptVersion === 'v021') {
        return await generateSwarmUiPromptsV021(analyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, provider, onProgress);
    }

    // Route to appropriate provider for prompt generation (v0.20)
    // Note: Currently only Gemini has full implementation. Other providers use Gemini as fallback.
    switch (provider) {
        case 'gemini':
            return await generateSwarmUiPromptsWithGemini(analyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, onProgress);
        case 'qwen':
        case 'claude':
        case 'openai':
        case 'xai':
        case 'deepseek':
        case 'glm':
            // For now, use Gemini implementation until provider-specific logic is implemented
            onProgress?.(`⚠️ ${provider.toUpperCase()} prompt generation not yet fully implemented. Using Gemini API for prompt generation.`);
            console.warn(`Prompt generation with ${provider.toUpperCase()} is not yet implemented. Using Gemini as fallback.`);
            return await generateSwarmUiPromptsWithGemini(analyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, onProgress);
        default:
            throw new Error(`Unsupported provider for prompt generation: ${provider}`);
    }
};

// Gemini prompt generation (original implementation)
async function generateSwarmUiPromptsWithGemini(
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig,
    retrievalMode: RetrievalMode = 'manual',
    storyId?: string,
    onProgress?: (message: string) => void
): Promise<BeatPrompts[]> {
    onProgress?.('Verifying Gemini API key...');
    // Support both Vite (import.meta.env) and Node.js (process.env) environments
    const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
                   (typeof import.meta !== 'undefined' && import.meta.env?.GEMINI_API_KEY) ||
                   process.env.VITE_GEMINI_API_KEY ||
                   process.env.GEMINI_API_KEY ||
                   process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is not configured in .env file. Please set it and restart the dev server.");
    }
    const ai = new GoogleGenAI({ apiKey });
    onProgress?.('✅ API key verified. Initializing prompt generation...');

    // SKILL.md Integration: Process episode through beatStateService for:
    // - Anti-monotony enforcement (Section 14)
    // - Carryover state tracking (Section 4.5)
    // - FLUX vocabulary validation (Section 5)
    // - Time of day lighting (Section 13)
    // - Character expression tells (Section 12)
    onProgress?.('Applying SKILL.md rules (anti-monotony, carryover, FLUX validation)...');
    console.log('[SKILL.md] Processing episode through beatStateService...');

    // Extract scene overrides (time_of_day, intensity, pacing) from Episode Context
    const sceneOverrides = extractSceneOverrides(episodeContextJson);

    const processedResult = processEpisodeWithFullContext(analyzedEpisode, {
        sceneOverrides: sceneOverrides
    });
    const processedEpisode = processedResult.episode;

    console.log(`[SKILL.md] Processed ${processedResult.stats.totalBeats} beats across ${processedEpisode.scenes.length} scenes`);
    console.log(`[SKILL.md] Carryover applied: ${processedResult.stats.carryoverApplied} beats`);
    console.log(`[SKILL.md] Variety adjustments: ${processedResult.stats.varietyApplied} beats`);
    console.log(`[SKILL.md] FLUX validated: ${processedResult.stats.fluxValidated}/${processedResult.stats.totalBeats} beats`);

    const beatsForPrompting = processedEpisode.scenes.flatMap(scene =>
        scene.beats.filter(beat => beat.imageDecision.type === 'NEW_IMAGE')
    );

    if (beatsForPrompting.length === 0) {
        return [];
    }

    onProgress?.(`Processing ${beatsForPrompting.length} NEW_IMAGE beats for prompt generation...`);
    console.log(`Processing ${beatsForPrompting.length} NEW_IMAGE beats for prompt generation`);

    // Extract image_config from Episode Context (Phase 4 enhancement)
    const imageConfig = extractImageConfig(episodeContextJson);
    const cinematicParams = getGenerationParams(imageConfig, 'cinematic');
    const verticalParams = getGenerationParams(imageConfig, 'vertical');

    if (imageConfig) {
        console.log(`[ImageConfig] Using database config: model=${imageConfig.model}, steps=${imageConfig.steps}, scheduler=${imageConfig.scheduler}`);
        console.log(`[ImageConfig] Cinematic: ${cinematicParams.width}x${cinematicParams.height}`);
        console.log(`[ImageConfig] Vertical: ${verticalParams.width}x${verticalParams.height}`);
    } else {
        console.log('[ImageConfig] No image_config in Episode Context, using environment/default values');
    }

    // If we have too many beats, process them in batches to avoid token limits
    // Reduced from 20 to 12 to prevent JSON truncation issues with large prompts
    const BATCH_SIZE = 12;
    const batches = [];
    for (let i = 0; i < beatsForPrompting.length; i += BATCH_SIZE) {
        batches.push(beatsForPrompting.slice(i, i + BATCH_SIZE));
    }

    onProgress?.(`Organized into ${batches.length} batch${batches.length > 1 ? 'es' : ''} for processing...`);
    console.log(`Processing ${batches.length} batches of beats`);

    // Enhanced context processing for database mode
    let enhancedContextJson = episodeContextJson;
    let contextSource = 'manual';
    
    if (retrievalMode === 'database' && storyId) {
        try {
            // Check if episodeContextJson already contains database structure
            // (when fetched via contextService.ts)
            const parsedContext = JSON.parse(episodeContextJson);
            const hasDatabaseStructure = parsedContext.episode?.scenes?.some((scene: any) => 
                scene.location?.visual_description || scene.location?.artifacts?.length > 0
            );
            
            if (hasDatabaseStructure) {
                // Already have database context - use it directly
                console.log('✅ Using existing database context with location descriptions and artifacts');
                contextSource = 'database';
                enhancedContextJson = episodeContextJson;
            } else {
                // Need to generate enhanced context (fallback for older flows)
                console.log('Generating enhanced episode context from database...');
                const enhancedContext = await generateEnhancedEpisodeContext(
                    storyId,
                    analyzedEpisode.episodeNumber,
                    analyzedEpisode.title,
                    `Episode ${analyzedEpisode.episodeNumber} analysis`,
                    analyzedEpisode.scenes.map(scene => ({
                        scene_number: scene.sceneNumber,
                        scene_title: scene.title,
                        scene_summary: scene.metadata.sceneRole,
                        location: scene.beats[0]?.locationAttributes ? {
                            name: scene.beats[0].locationAttributes[0] || 'Unknown Location',
                            description: 'Location from beat analysis',
                            visual_description: 'Visual description from database',
                            artifacts: []
                        } : null
                    }))
                );
                
                enhancedContextJson = JSON.stringify(enhancedContext, null, 2);
                contextSource = 'database';
                console.log('✅ Enhanced context generated from database');
            }
        } catch (error) {
            console.warn('Failed to generate enhanced context from database, falling back to manual context:', error);
            contextSource = 'manual (fallback)';
        }
    }
    
    // Helper to parse aspect ratio string like "16:9"
    const parseAspectRatio = (ratioStr: string) => {
      const [w, h] = ratioStr.split(':').map(Number);
      return w / h;
    }

    // A base width to calculate heights from
    const baseResolution = 1024;
    const cinematicRatio = parseAspectRatio(styleConfig.cinematicAspectRatio);
    const verticalRatio = parseAspectRatio(styleConfig.verticalAspectRatio);

    const cinematicWidth = Math.round(Math.sqrt(baseResolution * baseResolution * cinematicRatio) / 8) * 8;
    const cinematicHeight = Math.round(cinematicWidth / cinematicRatio / 8) * 8;

    const verticalWidth = Math.round(Math.sqrt(baseResolution * baseResolution * verticalRatio) / 8) * 8;
    const verticalHeight = Math.round(verticalWidth / verticalRatio / 8) * 8;

    // Phase B Enhancement: Fetch story context for episode-wide intelligence
    // Token tracking: Track impact of story context on prompt size
    const tokenMetrics = {
        storyContextChars: 0,
        storyContextTokensEstimate: 0,
        baseSystemInstructionChars: 0,
        baseSystemInstructionTokensEstimate: 0,
        enhancedSystemInstructionChars: 0,
        enhancedSystemInstructionTokensEstimate: 0,
        deltaChars: 0,
        deltaTokensEstimate: 0,
        totalPromptChars: 0,
        totalPromptTokensEstimate: 0
    };

    let episodeContextSection = '';
    let storyContextAvailable = false;
    if (storyId) {
        try {
            onProgress?.('Fetching story context...');
            const storyContext = await getStoryContext(storyId);
            if (storyContext) {
                storyContextAvailable = true;
                const contextLength = storyContext.story_context.length + storyContext.narrative_tone.length + storyContext.core_themes.length;
                console.log(`[Phase B] Story context retrieved: ${contextLength} chars total`);

                // Camera Realism Principle: Story context is for internal use only
                // DO NOT inject narrative elements into prompts - they cause grain, noise, and illustration-like output
                console.log(`[Camera Realism] Story context available but NOT injected into prompts (narrative elements forbidden)`);

                episodeContextSection = `

**CAMERA REALISM PRINCIPLE (MANDATORY):**

> "The prompt generator is a camera, not a narrator."

A prompt must describe ONLY what a camera can directly observe. If a detail cannot be verified visually by a photographer at the moment of capture, it MUST NOT be in the prompt.

**Violation causes:** Grain, noise, loss of photorealism, illustration-like output.

**✅ ALLOWED in prompts:**
- Physical appearance (general, non-technical)
- Lighting conditions
- Pose
- Environment (visual elements only)
- Clothing (brief, non-symbolic)
- Camera framing
- Observable expressions (what face/body shows)

**❌ FORBIDDEN in prompts:**
- Psychology
- Backstory
- Symbolism
- Cultural analysis
- Narrative interpretation
- Moral/emotional explanation
- Internal character states
- What something "used to be" or "will become"
- Organizational affiliations (CDC, NHIA, etc.)

**IMPLICIT OVER EXPLICIT:**
| Concept | ✅ CORRECT | ❌ INCORRECT |
|---------|-----------|--------------|
| Emotion | "neutral expression, intense gaze" | "defiance visible in eyes" |
| Heritage | "warm brown skin, dark wavy hair" | "Cabocla heritage" |
| Importance | omit | "poster girl, secrets held within" |

`;

                // Track story context metrics
                tokenMetrics.storyContextChars = episodeContextSection.length;
                tokenMetrics.storyContextTokensEstimate = Math.ceil(episodeContextSection.length / 4); // ~4 chars per token

                onProgress?.('✅ Story context integrated into prompt generation');
                console.log(`[Phase B Token Tracking] Story context section: ${tokenMetrics.storyContextChars} chars (~${tokenMetrics.storyContextTokensEstimate} tokens)`);
            } else {
                console.log('[Phase B] Story context not available, proceeding without episode enhancement');
            }
        } catch (error) {
            console.warn('[Phase B] Failed to fetch story context, proceeding without enhancement:', error);
        }
    } else {
        console.log('[Phase B] No storyId provided, skipping story context enhancement');
    }

    // Detect whether this episode uses Aegis suits (data-driven, not hardcoded)
    let isAegisEpisode = false;
    try {
        const parsedForAegisCheck = JSON.parse(enhancedContextJson);
        isAegisEpisode = detectAegisEpisode(parsedForAegisCheck);
    } catch { /* leave as false */ }
    console.log(`[AegisDetection] isAegisEpisode=${isAegisEpisode}`);

    // Create system instruction with context source information
    const systemInstructionLength = storyContextAvailable ? '[with episode context]' : '[without episode context]';
    console.log(`[Phase B] Building system instruction ${systemInstructionLength}`);

    // Build base system instruction (without episodeContextSection) for comparison
    const baseSystemInstructionStart = `You are a SwarmUI prompt generator. Generate clean, token-efficient prompts.`;

    // PROMPT GENERATION RULES - Authoritative source: StoryTeller/.claude/skills/prompt-generation-rules/SKILL.md v0.13
    // This system instruction implements SKILL.md rules for LLM prompt generation.
    // Key sections: 1.1-1.4 (Templates), 3.6 (Helmet/Dingy), 8 (Dual Character), 16 (Camera Realism)
    const systemInstruction = `You are a SwarmUI prompt generator following SKILL.md v0.18 rules. Generate clean, token-efficient prompts:

**T5 ATTENTION MODEL (Critical — understand how FLUX processes your prompts):**

FLUX uses a T5-XXL text encoder. T5 understands SENTENCES, not tag lists. Attention follows a decay curve:
- Tokens 1-30: STRONG (THE IMAGE — primary subject, composition, spatial relationship)
- Tokens 31-80: GOOD (character details, gear, posture)
- Tokens 81-150: MODERATE (environment, lighting, atmosphere)
- Tokens 151-200: WEAK (color grade, technical quality, segments)
- Tokens 200+: EFFECTIVELY IGNORED

The FIRST CONCRETE NOUN determines what FLUX thinks the image IS:
- "HSCEIA man field operative..." → FLUX renders a MAN, everything else is decoration
- "matte-black armored motorcycle with two riders..." → FLUX renders a MOTORCYCLE with riders on it

DECISION: What is this image OF? That leads the prompt.
- Motorcycle scene → motorcycle first
- Character moment → character first
- Location reveal → location first

Write grammatically coherent SENTENCES. Link concepts with spatial relationships ("behind", "beside", "gripping", "on").
WRONG: "woman, black suit, motorcycle, man, riding, behind, night, forest"
RIGHT: "woman seated behind man on matte-black motorcycle speeding through dark forest road at night"

**PROMPT TEMPLATE (Parentheses Grouping):**
\`\`\`
[styleGuide.camera], TRIGGER (age, hair, eyes, build, clothing) [action], [expression], [location], [styleGuide.lighting] <segment>
\`\`\`

**DATA SOURCE MAPPING:**
| Template Field | Source |
|----------------|--------|
| \`[styleGuide.camera]\` | \`beat.styleGuide.camera\` (e.g., "close-up shot, shallow depth of field") |
| \`[styleGuide.lighting]\` | \`beat.styleGuide.lighting\` (e.g., "dramatic rim light") |
| \`[expression]\` | \`beat.fluxExpression\` if available, else derive from beat narrative |
| \`[action]\` | \`beat.fluxPose\` if available, else derive from beat narrative |

**PARENTHESES RULE (CRITICAL):**
Parentheses group character attributes and prevent attribute bleed between characters.

| PARENTHESES (Character) | BODY (Scene) |
|-------------------------|--------------|
| Age | Location anchor elements |
| Hair | Lighting source |
| Eyes | Lighting quality |
| Build | Atmosphere/effects |
| Clothing | Environmental details |

**CRITICAL:** Never combine expression with age (e.g., "32 years old relaxed" is WRONG).
**CORRECT:** Separate them: \`(32 years old, ...) relaxed expression\`

${episodeContextSection}
**FIELD MAPPING (from Beat Data and Episode Context):**

**SHOT TYPE & CAMERA (MANDATORY - START OF EVERY PROMPT):**

Every prompt MUST begin with the shot type from \`styleGuide.camera\`:

- **[SHOT TYPE]**: Use \`beat.styleGuide.camera\` - this contains the camera direction
  - Examples: "medium shot", "close-up shot", "wide shot", "over-the-shoulder shot"
  - If multiple values (e.g., "close-up shot, shallow depth of field"), use the FIRST as shot type
  - Additional camera modifiers (depth of field, handheld feel) can follow the shot type

**MANDATORY SHOT TYPE PLACEMENT:**
\`\`\`
[styleGuide.camera shot type], TRIGGER (attributes) action, expression, location, lighting
\`\`\`

**Example:**
- \`styleGuide.camera\`: "close-up shot, shallow depth of field"
- Prompt starts: \`close-up shot, [base_trigger] ([VERBATIM visual_description from Episode Context])...\`

**LIGHTING (from styleGuide):**
- Use \`beat.styleGuide.lighting\` for lighting direction (e.g., "dramatic rim light", "soft natural lighting")
- Place at end of prompt before segments

**ATMOSPHERE/ENVIRONMENT (from styleGuide):**
- Use \`beat.styleGuide.atmosphere\` for environmental mood keywords
- Use \`beat.styleGuide.environmentFX\` for visual effects (volumetric dust, desaturated color grade)

---

**CHARACTER VISUAL (UNIFIED APPROACH):**

**DESCRIPTION SCALING BY SHOT TYPE (MANDATORY):**
Suit/gear description length MUST scale with shot proximity:
${isAegisEpisode ? `- CLOSE-UP: Full canonical description (material, texture, LED color, mesh, ribbed reinforcement)
- MEDIUM SHOT: Standard (suit color, hexagonal weave, helmet state, LED underglow, primary accessory)
- WIDE SHOT: ~15 tokens per character ("skin-tight matte charcoal-black Aegis suit with hexagonal weave and sealed Wraith helmet")
- EXTREME WIDE: ~8 tokens combined ("matching matte-black tactical suits and sealed helmets")` : `- CLOSE-UP: Full canonical description from swarmui_prompt_override (material, texture, accessories)
- MEDIUM SHOT: Standard (clothing color, key features, primary accessory)
- WIDE SHOT: ~15 tokens per character (core clothing + silhouette)
- EXTREME WIDE: ~8 tokens combined (brief clothing summary)`}

FIRST, check for \`swarmui_prompt_override\`:
- Find in: \`character.location_context.swarmui_prompt_override\`
- If present and non-empty, this is the COMPLETE character visual prompt
- Contains: LoRA trigger, physical traits, clothing/gear, hair, accessories
- **WRAP IN PARENTHESES** after trigger: \`TRIGGER (override content)\`
- The override goes INSIDE parentheses, action/expression/location go OUTSIDE

ONLY if swarmui_prompt_override is empty/missing, build from individual fields:

1. **[TRIGGER]**: Character's \`base_trigger\` (e.g., "HSCEIA man", "JRUMLV woman")
   - Find in: \`episode.scenes[N].characters[].base_trigger\` or \`episode.characters[].base_trigger\`

2. **[PHYSICAL + CLOTHING]**: Character appearance from the Episode Context JSON
   - **CRITICAL: Copy the visual_description or physical_description text VERBATIM into the prompt**
   - Do NOT summarize, abbreviate, paraphrase, or drop any details
   - Find in (priority order):
     1. \`episode.scenes[N].character_appearances[].location_context.physical_description\`
     2. \`episode.characters[].location_contexts[].physical_description\`
     3. \`episode.characters[].visual_description\`
   - This text is professionally curated for image generation - trust it exactly as written
   - Example: if visual_description says "35 years old, 6'2\\" imposing muscular build, stark white military-cut hair, green eyes. Wearing a fitted black long-sleeve fitted base layer with sleeves stretched over muscular biceps, MultiCam woodland camouflage tactical pants." then the prompt MUST contain ALL of those details, not a shortened version

5. **[ACTION]**: What the character is DOING in this beat
   - Extract from: \`beat.beat_script_text\` - identify the primary visual action
   - Examples: "examining data on a tablet", "speaking into a radio", "standing alert"

6. **[LOCATION]**: The scene's visual environment
   - Find in: \`episode.scenes[N].location.visual_description\` (REQUIRED)
   - **CRITICAL: Copy the visual_description text VERBATIM - do NOT summarize, paraphrase, or interpret**
   - This is professionally curated visual description - trust it exactly as written
   - Include relevant artifacts from \`episode.scenes[N].location.artifacts[].swarmui_prompt_fragment\`

7. **[LIGHTING]**: Lighting derived from beat context OR location atmosphere
   - FIRST: Check beat narrative for lighting cues (flickering monitors, emergency lights, etc.)
   - FALLBACK: Use \`episode.scenes[N].location.atmosphere\` lighting keywords
   - Examples: "harsh fluorescent lighting", "dim emergency lighting", "clinical white light"

8. **[ATMOSPHERE]**: Visual atmosphere from location
   - Find in: \`episode.scenes[N].location.atmosphere\`
   - Use ONLY camera-observable atmospheric effects (dust, haze, fog, steam)
   - DO NOT interpret mood or emotion - describe what the camera SEES

**YOLO SEGMENT (CRITICAL):**
- Single character: \`<segment:yolo-face_yolov9c.pt-0,0.35,0.5>\`
- Two characters: \`<segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>\`
- Index starts at 0, NOT 1
- NO segment for establishing shots (no faces to detect)

---

**PARENTHESES QUICK RULES:**

| Do | Don't |
|----|-------|
| \`TRIGGER (attributes)\` | \`TRIGGER (attributes,)\` ← trailing comma |
| Separate expression from age | \`32 years old relaxed\` ← combined |
| Use parentheses for dual scenes | Free-form attributes for two characters |
| Keep clothing INSIDE parens | Split clothing outside parens |
| Location/lighting OUTSIDE parens | Location inside character grouping |

**DUAL CHARACTER FORMAT (ESSENTIAL):**
\`\`\`
CHAR1 (attributes) on left and CHAR2 (attributes) on right, [interaction], [location], [lighting] <segments>
\`\`\`

Without parentheses in dual scenes, FLUX causes attribute bleed (woman gets white hair, man gets green eyes).

**DUAL CHARACTER POSITIONING:**
- Daniel: camera-LEFT (larger frame, protective positioning)
- Cat: camera-RIGHT (analytical, observing)
- On motorcycle: Daniel FRONT (driving), Cat BEHIND (passenger) — ALWAYS this arrangement
- Both faces must be in frame for dual YOLO segments (visor-up scenes only)

**CHARACTER TRIGGER MANDATORY (ZERO TOLERANCE):**
EVERY character in \`charactersPresent\` MUST appear with their LoRA trigger in EVERY prompt.
- NEVER reduce to "two figures", "two riders", "two people", or "two silhouettes"
- Even with sealed helmets and no faces visible: "HSCEIA man" and "JRUMLV woman" MUST appear
- FLUX needs the trigger to render correct body type, build, and anatomy
- Helmet-sealed vehicle example: "HSCEIA man driving with JRUMLV woman seated behind him, both in sealed Wraith helmets"
- NOT: "motorcycle with two riders in matching suits"
- If a beat mentions a character by name, that character's trigger MUST be in the prompt
- Ghost is the ONLY exception (no physical body to render)

**CAT AS VISUAL ANCHOR (Director's Standing Note):**
Cat is the visual center of gravity. The cinematographer frames her as an action heroine — powerful, capable, and physically compelling.
- VISOR DOWN on motorcycle: rear three-quarter angle, silhouette emphasized, curves of suit catching light
- VISOR DOWN standing: low angle, shape against environment/sky
- VISOR UP / face visible: face is primary anchor, medium close-up or close-up, eye level or slight low angle
- In motion: rear three-quarter or side angle, athletic silhouette
${isAegisEpisode ? `- The Aegis suit is skin-tight — frame to show athletic hourglass figure, defined waist. The suit does the work.` : `- Frame to show athletic build and defined silhouette through clothing fit.`}
- NOT pin-up posing. She never poses for the camera. Femininity serves characterization, not decoration.

---

**CARRYOVER STATE (Beat Continuity):**

Some beats include a \`carryoverContext\` object with state carried from previous beats:

\`\`\`json
{
  "carryoverContext": {
    "hasCarryover": true,
    "action": "standing tall, examining monitor",
    "expression": "alert expression, eyes scanning",
    "sourcebeat": "s1-b2"
  }
}
\`\`\`

**How to use carryover:**
- If beat has NO \`characterPositioning\` but has \`carryoverContext.action\`, use the carryover action
- If beat has NO \`emotional_tone\` but has \`carryoverContext.expression\`, use the carryover expression
- This maintains visual continuity between beats (same pose/expression persists until explicitly changed)

**Example:**
- Beat s1-b1: "Cat standing at monitor" -> establishes pose
- Beat s1-b2: Dialogue only, no positioning -> use carryover "standing tall, examining monitor"
- Beat s1-b3: "Cat turns to face Daniel" -> new pose overrides carryover

**Variety Adjustments:**
If beat has \`carryoverContext.varietyAdjusted: true\`, the shot type in \`styleGuide.camera\` has been adjusted to prevent visual monotony. Trust this adjustment.

---

**SCENE CONTINUITY CARRY-FORWARD (MANDATORY):**

Some beats include a \`scenePersistentState\` object with elements that MUST persist:

\`\`\`json
{
  "scenePersistentState": {
    "vehicle": "matte-black armored motorcycle (The Dinghy)",
    "vehicleState": "in_motion",
    "charactersPresent": ["Cat", "Daniel"],
    "characterPositions": { "Daniel": "front/driving", "Cat": "behind/passenger" },
    "gearState": "HELMET_DOWN",
    "location": "Georgia forest road at night"
  }
}
\`\`\`

**RULES:**
- ALL elements in \`scenePersistentState\` MUST appear in the prompt unless the beat EXPLICITLY changes them
- A beat about Cat's dialogue does NOT remove Daniel — he is still there
- If \`vehicleState\` is "in_motion", the vehicle MUST be in the prompt
- If \`charactersPresent\` has 2+ characters, ALL must appear (using their triggers)
- VALIDATION: Before finalizing, ask: "What would a camera literally see right now?"

Some beats also include a \`sceneTemplate\` identifying the scene type:
- "vehicle": Use motorcycle template (wide shot, both riders, vehicle leads prompt)
- "indoor_dialogue": Both characters positioned in room
- "combat": Wide/medium, helmet HUD active, LED underglow RED
- "stealth": Low light, visor DOWN, blue LED only
- "establishing": Location leads, characters small in frame
- "suit_up": Medium shot, suit detail is the subject
- "ghost": Ghost through environment, no physical body

---

**FLUX-VALIDATED FIELDS:**

Some beats include pre-validated FLUX.1-Dev vocabulary fields:

- \`fluxExpression\`: Character-specific expression (e.g., "analytical gaze, intense focus" for Cat)
- \`fluxPose\`: FLUX-compliant pose description (e.g., "standing tall", "leaning against wall")

Use these fields DIRECTLY in your prompts when present - they are already validated against FLUX vocabulary.

---

**VISUAL GUIDANCE (Scene Context):**

Some beats include \`visualGuidance\` with scene-level context:

\`\`\`json
{
  "visualGuidance": {
    "isHookBeat": true,
    "isClimaxBeat": false,
    "isAdBreakBeat": false,
    "recommendedShotType": "close-up shot",
    "intensityLevel": "high"
  }
}
\`\`\`

**How to use visual guidance:**
- \`isHookBeat\`: Beat 1 of each scene - make visually striking for 3-second retention
- \`isClimaxBeat\`: Final beat of climax scene - dramatic, impactful framing
- \`isAdBreakBeat\`: Near 8-minute mark - medium framing, breath moment
- \`intensityLevel\`: "low", "medium", or "high" - affects expression intensity
- \`recommendedShotType\`: Scene-appropriate shot type (consider using if styleGuide.camera differs)

---

**ESTABLISHING SHOTS (No Character Present):**

Some beats are pure atmosphere/mood-setting with NO character action. Detect these by:
- No character names or pronouns in beat text
- Beat describes environment, silence, tension, or mood
- Beat is scene-opening or transition

**ESTABLISHING SHOT TEMPLATE:**
\`\`\`
[SHOT_TYPE] of [LOCATION], [ENVIRONMENTAL_DETAILS], [ARTIFACTS], [LIGHTING], [ATMOSPHERE], cinematic establishing shot
\`\`\`

**Field mapping for establishing shots:**
- **[SHOT_TYPE]**: "wide interior shot", "detail shot", "slow pan across"
- **[LOCATION]**: Copy VERBATIM from \`episode.scenes[N].location.visual_description\` - do NOT paraphrase
- **[ENVIRONMENTAL_DETAILS]**: Translate beat's sensory descriptions to VISUAL elements
- **[ARTIFACTS]**: ALL artifacts from \`location.artifacts[].swarmui_prompt_fragment\`
- **[LIGHTING]**: From beat cues or \`location.atmosphere\`
- **[ATMOSPHERE]**: Translate abstract mood to visual atmosphere

**SENSORY-TO-VISUAL TRANSLATION (for establishing shots):**
| Beat Describes | Translate To |
|----------------|--------------|
| "silence", "quiet" | "still air, motionless equipment, undisturbed dust" |
| "pressurized", "heavy" | "cramped tight space, low ceiling, close walls" |
| "thick air" | "visible dust particles suspended in air, hazy atmosphere" |
| "tension" | "harsh shadows, high contrast lighting, stark emptiness" |
| "cold/sterile" | "clinical white surfaces, sharp edges, antiseptic gleam" |

**ESTABLISHING SHOT EXAMPLE (No Character - No Parentheses):**

Beat: "The silence in the Mobile Medical Base was not empty; it was pressurized..."

Output:
\`\`\`
wide interior shot, cramped converted trailer, salvaged server racks, multiple monitors on reinforced walls, IV bags hanging motionless, modular storage bins, cables across floor, visible dust particles suspended, dim emergency LED strips, clinical blue glow
\`\`\`

**Note:** No parentheses needed - establishing shots have no character to group.
**No YOLO segment** - no faces in frame.

---

**CHARACTER SHOT EXAMPLE (Parentheses Grouping):**
\`\`\`
[SHOT_TYPE], [TRIGGER] ([VERBATIM visual_description from Episode Context]) [ACTION], [EXPRESSION], [LOCATION visual_description], [LIGHTING], [ATMOSPHERE] <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
\`\`\`

**Structure breakdown (showing styleGuide mapping):**
- Shot type: \`[SHOT_TYPE],\` ← FROM \`beat.styleGuide.camera\`
- Trigger + Parens: \`[TRIGGER] (FULL visual_description from Episode Context JSON - copy VERBATIM, NEVER abbreviate or summarize)\`
- Action: \`[ACTION],\` ← FROM \`beat.fluxPose\` or narrative
- Expression: \`[EXPRESSION],\` ← FROM \`beat.fluxExpression\` or narrative
- Location (body): copied VERBATIM from \`episode.scenes[N].location.visual_description\`
- Lighting (body): ← FROM \`beat.styleGuide.lighting\`
- Environment FX: ← FROM \`beat.styleGuide.environmentFX\`
- Segment: \`<segment:...>\`

**DUAL CHARACTER EXAMPLE:**
\`\`\`
[SHOT_TYPE], [TRIGGER_1] ([VERBATIM visual_description for character 1]) on left and [TRIGGER_2] ([VERBATIM visual_description for character 2]) on right, [INTERACTION], [LOCATION visual_description], [LIGHTING] <segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
\`\`\`

**CRITICAL**: The text inside parentheses after each trigger MUST be the EXACT visual_description from the Episode Context JSON for that character. Do NOT summarize, shorten, paraphrase, or rearrange the description. It is pre-written for image generation fidelity.

**RULES:**
1. NO character names (Cat, Daniel, etc.) - ONLY use base_trigger
2. NO location names (NHIA Facility 7, CDC, NHIA Facility 7, etc.) - use visual elements only
3. NO contradictory moods (cannot be "relaxed" AND "tense")
4. NO weighted syntax like (((term:1.5))) - use natural language
5. Keep prompts under 350 tokens (character visual_description text is EXEMPT from this limit - never abbreviate character appearance to save tokens)
6. NO narrative elements (backstory, psychology, symbolism, "former", "what it used to be")
7. NO internal states ("haunted by loss", "analytical mind") - only observable expressions

---

**SCENE TYPE TEMPLATES (match beat to template, then fill specifics):**

VEHICLE (motorcycle): \`[shot] from [angle], [vehicle] [state] on [road], HSCEIA man driving in [suit_abbrev] and [helmet], JRUMLV woman seated behind in [suit_abbrev] and [helmet], [environment], [lighting], [color_grade]\`
- MANDATORY: Use LoRA triggers (HSCEIA man, JRUMLV woman) even with sealed helmets — NEVER "two riders" or "two figures"
- Default: wide shot, low rear three-quarter angle (if Cat present). Riding = always visor DOWN, no face segments.

INDOOR DIALOGUE: \`[shot], [depth], [char1] [room_position] [action/posture], [expression], and [char2] [room_position], [expression], [location], [lighting] <segments>\`
- Both characters present even if beat focuses on one speaking. Faces visible = face segments.

COMBAT/BREACH: \`[shot] from [angle], [char1] [combat_action] in [full_suit] with [weapon] and [helmet_HUD], [char2_if_present], [environment], [lighting]\`
- HUD active, no faces, LED underglow RED (combat) or AMBER (elevated threat).

STEALTH: \`[shot], [characters] moving tactically through [environment], [suit] with [helmet_DOWN], [posture], [lighting]\`
- Visor DOWN, blue LED only, deep shadows, low light.

ESTABLISHING: \`extreme wide shot, [location], [TRIGGER characters_tiny_if_present], [environmental_detail], [lighting], [atmosphere]\`
- Location leads prompt. Characters small. No face segments. Still use LoRA triggers even at distance.

SUIT-UP: \`medium shot, shallow depth of field, [character] standing motionless in [full_suit_detail] vacuum-sealed, [hair_visible], [expression], [prep_area], [diagnostic_lighting]\`
- Hair visible (no helmet). Face segments YES. Suit detail IS the subject.

**DECISION FRAMEWORK (when no styleGuide or template match):**
1. What is the SUBJECT? (determines what leads prompt and shot type)
2. What is the MOOD? (determines lighting/color grade)
3. Where is the CAMERA? (determines angle — apply Cat visual anchor if she is in frame)

---

**TOKEN BUDGET (ADAPTIVE — varies by shot type):**

Your token budget is calculated PER BEAT based on shot type and character count.
The budget for this beat is provided in the beat context as \`tokenBudget\`.

APPROXIMATE RANGES:
- Close-up (1 char): ~250 tokens | Close-up (2 chars): ~280 tokens
- Medium shot (1 char): ~220 tokens | Medium (2 chars): ~260 tokens
- Wide shot (1 char): ~180 tokens | Wide (2 chars): ~200 tokens
- Extreme wide / establishing: ~150 tokens

COMPOSITION COMES FIRST. The first ~30 tokens define WHO is WHERE doing WHAT.
Character details go in tokens 31-80 (GOOD attention zone).
Beyond your budget, T5 loses coherence — stay within budget.

HELMET SAVINGS: When helmet is sealed, skip hair and face details.
Reinvest those ~30 freed tokens into suit material detail and spatial positioning.

**FLUX RENDERING RULES:**
1. Subject-first ordering: Primary visual subject MUST lead the prompt
2. Spatial relationships MUST be explicit ("man driving motorcycle with woman seated behind him arms wrapped around his waist")
3. NO prompt weighting — (concept:1.5) does NOT work on FLUX, T5 ignores it
4. NO negative prompts — FLUX does not support them
5. Natural language sentences, NOT comma-separated keyword lists
6. Every element must be camera-observable (no emotions, story context, sound, internal states)

${isAegisEpisode ? `**CANONICAL DESCRIPTIONS ONLY (ZERO TOLERANCE):**
NEVER fabricate gear details. Aegis is a BIOSUIT, not military tactical gear.
FORBIDDEN: "tactical sensor arrays", "weapon mounting points", "combat webbing", "ammunition pouches", "geometric sensor patterns", "biometric monitors on forearms", "reinforced joints at knees and elbows"
CANONICAL: "skin-tight matte charcoal-black Aegis suit with hexagonal weave pattern", "molded armored bust panels with [COLOR] LED underglow" (Cat), "molded chest armor plates with [COLOR] LED underglow" (Daniel), "Wraith helmet fully sealed with dark opaque visor"
NEVER use: tactical vest, cargo pockets, loose fitting, BDU, fatigues, combat webbing, ammunition pouches.` : `**USE DATABASE CLOTHING DESCRIPTIONS (ZERO TOLERANCE):**
NEVER fabricate clothing or gear details. Use ONLY the clothing described in swarmui_prompt_override or clothing_description from the episode context.
FORBIDDEN: "tactical sensor arrays", "weapon mounting points", "combat webbing", "ammunition pouches", "geometric sensor patterns", "biometric monitors on forearms", "reinforced joints at knees and elbows"
NEVER use: tactical vest, cargo pockets, BDU, combat webbing, ammunition pouches.`}

**PROMPT COMPACTION (Token Efficiency):**

Apply these compaction strategies to reduce tokens without losing visual information:

**Prepositions to DROP:**
- \`of\`: "photo of a" → "photo," or omit entirely
- \`a/an\`: Articles rarely needed
- \`with\` (attributes): "woman with brown hair" → "woman, brown hair"
- \`in\` (environment): "standing in corridor" → "standing, corridor" (when context clear)

**Prepositions to KEEP (Critical for clarity):**
- \`on left/right\`: CRITICAL for dual character positioning
- \`at\` (gaze): "looking at viewer" needs it
- \`facing\`: Orientation marker
- \`over/under\`: Layering needs clarity ("vest over shirt")
- \`across/slung\`: Attachment position ("rifle slung across chest")
- \`from/through\`: Light direction ("light through broken ceiling")

**Compaction Strategies:**
- Use commas as implicit "with/and": "woman, brown hair, green eyes, athletic build"
- Use participles: "woman standing doorway" not "woman who is standing in the doorway"
- Compound adjectives: "tactical-bun hair" or just "tactical bun"
- FLUX knows it's generating an image - "photo of a" is optional

**Location Compaction Example:**
❌ VERBOSE (54 words): "in a former CDC satellite facility that was bombed during faction fighting, with collapsed ceiling panels hanging by wires..."
✅ COMPACT (12 words): "collapsed corridor, twisted rebar, shattered glass, flickering emergency lights, volumetric dust"

What was cut: "former", "CDC", "faction fighting" (narrative), redundant debris types, "tiled floors" (implied).
What remains: Everything the camera can see.

---

**TACTICAL GEAR (Database-Driven):**

Character gear (${isAegisEpisode ? 'Aegis suits, helmets, loadouts' : 'clothing, accessories, gear'}) comes from \`swarmui_prompt_override\`.
The database provides complete, pre-assembled gear descriptions - use them directly.

**HELMET STATE DETECTION:**
- If \`swarmui_prompt_override\` contains helmet description, use it as-is
- The database already determines the correct helmet state based on scene context
- Only apply inference rules below if helmet state is ambiguous in the override

**HAIR SUPPRESSION RULE (CRITICAL - ZERO TOLERANCE):**
When generating a prompt for a character wearing ANY helmet state (visor up, visor down, HUD active):
- **NEVER include**: ponytail, hair color, hair style, flowing hair, hair texture, "brown hair", "white hair", "military-cut hair", "hair in ponytail", or ANY hair descriptors
- **The helmet physically covers the head** - hair is INVISIBLE in the image
- **FAIL CONDITION**: If your prompt mentions hair AND helmet, you have FAILED. Remove the hair descriptor.

**CORRECT EXAMPLES:**
- "JRUMLV woman in tactical mode, lean athletic build, wearing bodysuit with helmet visor down" (NO HAIR)
- "HSCEIA man field operative, muscular build, helmet with blue visor glow" (NO HAIR)

**INCORRECT EXAMPLES (DO NOT GENERATE):**
- "JRUMLV woman, dark brown hair in ponytail, wearing helmet visor down" (WRONG - hair visible through helmet is impossible)
- "HSCEIA man, stark white military-cut hair, helmet HUD active" (WRONG - hair is under the helmet)

**HELMET OFF only:** INCLUDE hair description (ponytail, hair color, style visible) because the character's head is uncovered.

**HELMET STATE ZERO-TOLERANCE RULES:**
- RIDING AT SPEED (any speed above walking) → visor DOWN. No exceptions. No hair. No face. No face segments.
- STANDING/STATIONARY IN FIELD → visor UP (default). Face visible. Face segments included.
- COMBAT/BREACH → HUD ACTIVE. No hair. No face segment.
- STEALTH/INFILTRATION → visor DOWN. Sealed for noise/light discipline.
- When visor is DOWN, prompt MUST NOT contain: any hair description, any facial expression, any face segment tag, "exposing face", "showing face", "visor raised"

**INFERENCE RULES (when beat doesn't specify):**
- Combat/breach scenes → Default to VISOR DOWN
- Speaking/dialogue scenes → Default to VISOR UP (need to see face for emotion)
- Investigation/scanning → Default to HUD ACTIVE
- Safe location/aftermath → Default to HELMET OFF

**HUD POV SHOTS (Special Case):**
If beat describes character SEEING something on HUD (readouts, targeting data, threat indicators):
- Use FIRST-PERSON POV shot looking OUT through the visor
- Template: \`first-person POV through Wraith helmet visor, holographic HUD overlay showing [data type], reflective black visor edges visible, [environment] visible through HUD display\`
- NO character visible - this is what they SEE
- NO YOLO segment (no face in frame)

---

**HELMET FRAGMENT DATABASE COLUMNS (LLM Selection):**

For tactical mode characters (Cat, Daniel), the Episode Context includes helmet fragment options:

- \`helmet_fragment_off\`: Hair/face description when helmet is off (e.g., "dark brown hair, practical ponytail, face visible")
- \`helmet_fragment_visor_up\`: Helmet with visor raised - face visible, no hair (e.g., "Wraith tactical helmet visor raised, angular matte black shell fully encasing head, face visible, no hair visible")
- \`helmet_fragment_visor_down\`: Helmet with visor down - face hidden, no hair (e.g., "Wraith tactical helmet visor down, angular black visor completely covering face, aerodynamic matte black shell, no hair visible, face hidden")
- \`face_segment_rule\`: Controls YOLO face segment inclusion: \`ALWAYS\` | \`IF_FACE_VISIBLE\` | \`NEVER\`

**LLM Selection Logic:**
Read the beat narrative and select the appropriate helmet fragment:

| Beat Narrative Example | Select Fragment | Include Face Segment |
|------------------------|-----------------|---------------------|
| "Cat seals her helmet visor" | \`helmet_fragment_visor_down\` | NO |
| "Daniel raises his visor to speak" | \`helmet_fragment_visor_up\` | YES |
| "They left helmets on the bike" | \`helmet_fragment_off\` | YES |
| "Cat's helmet HUD flickers" | \`helmet_fragment_visor_down\` | NO |
| "He removes his helmet" | \`helmet_fragment_off\` | YES |

**Prompt Assembly:**
Replace the hair/face portion of \`swarmui_prompt_override\` with the selected helmet fragment, then apply face segment rules.

---

**DINGY (MOTORCYCLE) APPEARANCE STATES:**

The Dingy (Cat and Daniel's shared electric motorcycle) has TWO distinct visual appearances based on context:

| State | Context | Visual Description |
|-------|---------|-------------------|
| \`PARKED_CAMOUFLAGE\` | Parked at MMB, Safehouse, or any static location | rusty weathered motorcycle, mismatched body panels, dust-covered, dented fenders, salvage aesthetic, parked |
| \`IN_USE_SLEEK\` | Being ridden by any character | sleek matte black electric motorcycle, aerodynamic fairings, streamlined profile, in motion, silent electric drive |

**LLM Selection Logic:**

| Beat Narrative Example | Appearance State |
|------------------------|-----------------|
| "The motorcycle sits outside the MMB" | \`PARKED_CAMOUFLAGE\` |
| "Cat approaches her parked bike" | \`PARKED_CAMOUFLAGE\` |
| "Daniel accelerates through the streets" | \`IN_USE_SLEEK\` |
| "Cat weaves between abandoned cars" | \`IN_USE_SLEEK\` |
| "They dismount at the safehouse" | Transition - was in motion, now parking |
| "The Dingy leans against the wall, rusted" | \`PARKED_CAMOUFLAGE\` |

**Continuity Rules (CRITICAL):**
1. **Singular Vehicle:** There is only ONE Dingy. Never show two motorcycles in any scene.
2. **Rider Configurations:** Daniel alone, Cat alone, or both together (Daniel ALWAYS drives when both present).
3. **Paired Continuity:** If both start together on the Dingy, they stay together until returning to MMB/Safehouse or narrative explicitly separates them.

**Anti-Patterns (DO NOT GENERATE):**
- "rusty motorcycle speeding through streets" (WRONG - use \`IN_USE_SLEEK\` when in motion)
- "sleek motorcycle parked at MMB" (WRONG - use \`PARKED_CAMOUFLAGE\` when stationary)
- "Two motorcycles in the scene" (WRONG - only ONE Dingy exists)
- "Cat driving with Daniel passenger" (WRONG - Daniel always drives when both present)

---

**FLUX SETTINGS (apply to all prompts):**
- model: from Episode Style Config
- cfgscale: 1
- steps: from image_config or 40
- seed: -1

**OUTPUT FORMAT:**
Return JSON array: \`[{ "beatId": "s1-b1", "cinematic": { "prompt": "...", "model": "...", "width": ..., "height": ..., "steps": ..., "cfgscale": 1, "seed": -1 } }]\`

Context Source: ${contextSource}`;

    // Token tracking: Measure system instruction size impact
    // Calculate base system instruction size (without episode context section)
    const baseSystemInstructionWithoutContext = systemInstruction.replace(episodeContextSection, '');
    tokenMetrics.baseSystemInstructionChars = baseSystemInstructionWithoutContext.length;
    tokenMetrics.baseSystemInstructionTokensEstimate = Math.ceil(baseSystemInstructionWithoutContext.length / 4);

    // Calculate enhanced system instruction size (with episode context section)
    tokenMetrics.enhancedSystemInstructionChars = systemInstruction.length;
    tokenMetrics.enhancedSystemInstructionTokensEstimate = Math.ceil(systemInstruction.length / 4);

    // Calculate delta (impact of adding story context)
    tokenMetrics.deltaChars = tokenMetrics.enhancedSystemInstructionChars - tokenMetrics.baseSystemInstructionChars;
    tokenMetrics.deltaTokensEstimate = tokenMetrics.enhancedSystemInstructionTokensEstimate - tokenMetrics.baseSystemInstructionTokensEstimate;

    // Log system instruction metrics
    console.log('\n[Phase B Token Tracking] System Instruction Metrics:');
    console.log(`  Base (without story context): ${tokenMetrics.baseSystemInstructionChars} chars (~${tokenMetrics.baseSystemInstructionTokensEstimate} tokens)`);
    console.log(`  Enhanced (with story context): ${tokenMetrics.enhancedSystemInstructionChars} chars (~${tokenMetrics.enhancedSystemInstructionTokensEstimate} tokens)`);
    console.log(`  Delta (impact of story context): +${tokenMetrics.deltaChars} chars (+~${tokenMetrics.deltaTokensEstimate} tokens)`);
    if (storyContextAvailable) {
        const percentageIncrease = ((tokenMetrics.deltaChars / tokenMetrics.baseSystemInstructionChars) * 100).toFixed(1);
        console.log(`  Percentage increase: +${percentageIncrease}%`);
    }

    // Process beats in batches to avoid token limits
    const allResults: BeatPrompts[] = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        onProgress?.(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} beats)...`);
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} beats`);
        
        // DEV: Enhance beats with a dynamic, structured style guide for more contextual prompts.
        // Also includes carryover state and FLUX-validated fields from beatStateService
        const beatsWithStyleGuide = batch.map(beat => {
            const styleGuide = {
                camera: new Set<string>(),
                lighting: new Set<string>(),
                environmentFX: new Set<string>(),
                atmosphere: new Set<string>()
            };

            // Cast to FullyProcessedBeat to access FLUX-validated and carryover fields
            const beatWithState = beat as FullyProcessedBeat;

            // --- Camera (use FLUX-validated fields when available) ---
            // Priority: FLUX shot type > variety-adjusted > original suggestion
            if (beatWithState.fluxShotType) {
                styleGuide.camera.add(beatWithState.fluxShotType);
                // Add camera angle if not default eye-level
                if (beatWithState.fluxCameraAngle && beatWithState.fluxCameraAngle !== 'eye-level shot') {
                    styleGuide.camera.add(beatWithState.fluxCameraAngle);
                }
            } else {
                const effectiveCameraSuggestion = beatWithState.suggestedShotType || beat.cameraAngleSuggestion;
                if (effectiveCameraSuggestion) {
                    styleGuide.camera.add(effectiveCameraSuggestion);
                }
            }
            styleGuide.camera.add('shallow depth of field');
            // Add handheld feel for more dynamic scenes, could be based on a new 'energy' field in future.
            if (beat.beat_script_text.toLowerCase().includes('action') || beat.beat_script_text.toLowerCase().includes('runs')) {
                styleGuide.camera.add('handheld feel');
            }

            // --- Lighting (use FLUX lighting from time of day when available) ---
            if (beatWithState.fluxLighting && beatWithState.fluxLighting.length > 0) {
                beatWithState.fluxLighting.forEach(light => styleGuide.lighting.add(light));
            } else {
                styleGuide.lighting.add('dramatic rim light');
            }

            // --- Environment & Atmosphere ---
            styleGuide.environmentFX.add('desaturated color grade');
            if (beat.locationAttributes?.some(attr => ['ruined', 'dusty', 'debris'].includes(attr))) {
                styleGuide.environmentFX.add('volumetric dust');
            }
            if (beat.locationAttributes) {
                beat.locationAttributes.forEach(attr => styleGuide.atmosphere.add(attr));
            }

            // --- Hair Fragment Selection (SKILL.md Section 3.6.2) ---
            // Detect helmet state and select appropriate hair fragment
            // Also determine if YOLO face segment should be included
            let hairContext: {
                helmetState: string | null;
                hairSuppressed: boolean;
                hairFragment?: string;
                includeFaceSegment: boolean;  // Whether to include YOLO face segment
                reason: string;
            } | undefined;

            if (beat.characters && beat.characters.length > 0) {
                const primaryCharacter = beat.characters[0];
                // Get location from beat (first location attribute)
                const locationName = beat.locationAttributes?.[0] || null;
                // Determine gear context from beat script FIRST (needed for helmet inference)
                let gearContext: string | null = null;
                const beatText = beat.beat_script_text?.toLowerCase() || '';
                if (beatText.includes('suit up') || beatText.includes('suiting up')) {
                    gearContext = 'suit_up';
                } else if (beatText.includes('tactical') || beatText.includes('field op') || beatText.includes('mission') ||
                           beatText.includes('dingy') || beatText.includes('aegis')) {
                    gearContext = 'field_op';
                } else if (beatText.includes('safehouse') || beatText.includes('relaxed') || beatText.includes('off-duty')) {
                    gearContext = 'off_duty';
                }

                // Now detect helmet state with gear context for inference
                const helmetState = detectHelmetState(beat.beat_script_text || '', gearContext);

                const hairResult = selectHairFragment(
                    primaryCharacter,
                    helmetState,
                    locationName,
                    gearContext
                );

                // Determine if YOLO face segment should be included
                // Face is visible (include segment) UNLESS visor is DOWN
                const includeFaceSegment = helmetState !== 'VISOR_DOWN';

                hairContext = {
                    helmetState,
                    hairSuppressed: hairResult.suppressed,
                    hairFragment: hairResult.suppressed ? undefined : hairResult.promptFragment || undefined,
                    includeFaceSegment,
                    reason: hairResult.reason
                };

                // Enhanced logging for all helmet states
                if (helmetState === 'VISOR_DOWN') {
                    // Helmet ON, visor sealed: no hair, no face
                    console.log(`[Helmet] ${beat.beatId}: VISOR_DOWN - hair suppressed, face hidden`);
                } else if (helmetState === 'VISOR_UP') {
                    // Helmet ON, visor raised: no hair (under helmet), but face visible
                    console.log(`[Helmet] ${beat.beatId}: VISOR_UP - hair suppressed, face visible (include YOLO)`);
                } else {
                    // Helmet OFF/IN_HAND/ON_VEHICLE/null: hair visible, face visible
                    const stateDesc = helmetState || 'not worn';
                    if (hairResult.promptFragment) {
                        console.log(`[Helmet] ${beat.beatId}: ${stateDesc} - hair: ${hairResult.fragmentKey}, face visible (include YOLO)`);
                    } else {
                        console.log(`[Helmet] ${beat.beatId}: ${stateDesc} - face visible (include YOLO)`);
                    }
                }
            }

            // Build carryover context for the AI (SKILL.md Section 4.5)
            const carryoverContext: {
                hasCarryover: boolean;
                action?: string;
                expression?: string;
                sourcebeat?: string;
                varietyAdjusted?: boolean;
            } = {
                hasCarryover: !!(beatWithState.carryoverAction || beatWithState.carryoverExpression)
            };

            if (beatWithState.carryoverAction) {
                carryoverContext.action = beatWithState.carryoverAction;
            }
            if (beatWithState.carryoverExpression) {
                carryoverContext.expression = beatWithState.carryoverExpression;
            }
            if (beatWithState.carryoverSourceBeatId) {
                carryoverContext.sourcebeat = beatWithState.carryoverSourceBeatId;
            }
            if (beatWithState.varietyApplied) {
                carryoverContext.varietyAdjusted = true;
                console.log(`[PromptGen] Beat ${beat.beatId}: Using variety-adjusted shot type "${beatWithState.suggestedShotType}"`);
            }

            // Build visual guidance context (from sceneContextService)
            const visualGuidance = beatWithState.beatVisualGuidance ? {
                isHookBeat: beatWithState.beatVisualGuidance.isHookBeat,
                isClimaxBeat: beatWithState.beatVisualGuidance.isClimaxBeat,
                isAdBreakBeat: beatWithState.beatVisualGuidance.isAdBreakBeat,
                recommendedShotType: beatWithState.beatVisualGuidance.recommendedShotType,
                intensityLevel: beatWithState.beatVisualGuidance.intensityLevel,
            } : undefined;

            // Calculate adaptive token budget for this beat (v0.19)
            const helmetStates: Array<'sealed' | 'visor_up' | 'off' | null> = [];
            if (hairContext) {
                const hs = hairContext.helmetState;
                helmetStates.push(
                    hs === 'VISOR_DOWN' ? 'sealed'
                    : hs === 'VISOR_UP' ? 'visor_up'
                    : hs ? 'off'
                    : null
                );
            }
            const tokenBudget = calculateAdaptiveTokenBudget(
                beatWithState.fluxShotType || 'medium shot',
                (beat as any).characters?.length || 1,
                helmetStates,
                !!(beatWithState.scenePersistentState?.vehicle)
            );

            return {
                ...beat,
                styleGuide: {
                    camera: Array.from(styleGuide.camera).join(', '),
                    lighting: Array.from(styleGuide.lighting).join(', '),
                    environmentFX: Array.from(styleGuide.environmentFX).join(', '),
                    atmosphere: Array.from(styleGuide.atmosphere).join(', '),
                },
                // FLUX-validated expression (from characterExpressionService)
                fluxExpression: beatWithState.fluxExpression || undefined,
                // FLUX-validated pose (from beatStateService)
                fluxPose: beatWithState.fluxPose || undefined,
                // Include carryover context for the AI to use
                carryoverContext: carryoverContext.hasCarryover ? carryoverContext : undefined,
                // Include visual guidance for hook/climax emphasis
                visualGuidance,
                // Hair/helmet context for correct character appearance (SKILL.md Section 3.6.2)
                hairContext,
                // Scene persistent state for continuity carry-forward (Architect Memo Section 2)
                scenePersistentState: beatWithState.scenePersistentState || undefined,
                // Scene type template for prompt skeleton selection (Architect Memo Section 14-15)
                sceneTemplate: beatWithState.sceneTemplate || undefined,
                // Adaptive token budget for Gemini to target (v0.19)
                tokenBudget: { total: tokenBudget.total, perCharacter: tokenBudget.character1 },
            };
        });

        try {
            // Token tracking: Measure total prompt size for this batch
            const batchContents = `Generate SwarmUI prompts for the following beat analyses, using the provided Episode Context for character details and the Style Config for aesthetic guidance.\n\n---BEAT ANALYSES---\n${JSON.stringify(beatsWithStyleGuide, null, 2)}\n\n---EPISODE CONTEXT JSON (Source: ${contextSource})---\n${enhancedContextJson}\n\n---EPISODE STYLE CONFIG---\n${JSON.stringify({ ...styleConfig, cinematicWidth, cinematicHeight }, null, 2)}`;

            const batchPromptChars = batchContents.length + systemInstruction.length;
            const batchPromptTokensEstimate = Math.ceil(batchPromptChars / 4);

            console.log(`\n[Phase B Token Tracking] Batch ${batchIndex + 1} Total Prompt Size:`);
            console.log(`  Contents: ${batchContents.length} chars (~${Math.ceil(batchContents.length / 4)} tokens)`);
            console.log(`  System Instruction: ${systemInstruction.length} chars (~${Math.ceil(systemInstruction.length / 4)} tokens)`);
            console.log(`  Total: ${batchPromptChars} chars (~${batchPromptTokensEstimate} tokens)`);

            // Track for final summary (only track first batch for representative metrics)
            if (batchIndex === 0) {
                tokenMetrics.totalPromptChars = batchPromptChars;
                tokenMetrics.totalPromptTokensEstimate = batchPromptTokensEstimate;
            }

            // Retry logic for network failures
            let response;
            let lastError;
            const maxRetries = 3;
            const baseDelay = 2000; // 2 seconds

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    onProgress?.(`Sending batch ${batchIndex + 1} to Gemini API (model: ${getGeminiModel()}, temp: ${getGeminiTemperature()}) - attempt ${attempt}/${maxRetries}...`);

                    response = await ai.models.generateContent({
                        model: getGeminiModel(),
                        contents: batchContents,
                        config: {
                            systemInstruction,
                            responseMimeType: 'application/json',
                            responseSchema: responseSchema,
                            temperature: getGeminiTemperature(),
                        },
                    });

                    // Success - break retry loop
                    break;

                } catch (error) {
                    lastError = error;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    console.error(`[Retry ${attempt}/${maxRetries}] Batch ${batchIndex + 1} failed: ${errorMessage}`);

                    // Check if this is a retryable error
                    const isNetworkError = errorMessage.includes('Failed to fetch') ||
                                          errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                                          errorMessage.includes('network') ||
                                          errorMessage.includes('timeout') ||
                                          errorMessage.includes('ECONNRESET');

                    if (!isNetworkError) {
                        // Non-retryable error (API key, quota, etc.) - fail immediately
                        console.error(`Non-retryable error detected. Not retrying.`);
                        throw error;
                    }

                    if (attempt < maxRetries) {
                        // Calculate exponential backoff delay
                        const delay = baseDelay * Math.pow(2, attempt - 1);
                        console.log(`Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
                        onProgress?.(`Network error. Retrying in ${delay / 1000} seconds... (${attempt}/${maxRetries})`);

                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Final attempt failed
                        console.error(`All ${maxRetries} attempts failed for batch ${batchIndex + 1}`);
                        throw new Error(`Network error after ${maxRetries} attempts: ${errorMessage}`);
                    }
                }
            }

            if (!response) {
                throw new Error(`Failed to get response after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
            }

            onProgress?.(`Processing Gemini response for batch ${batchIndex + 1}...`);
            const jsonString = response.text.trim();

            // Attempt to parse JSON with repair fallback for truncation
            let batchResult: any[];
            try {
                batchResult = JSON.parse(jsonString) as any[];
            } catch (parseError) {
                console.warn(`[JSON Parse] Initial parse failed for batch ${batchIndex + 1}, attempting repair...`);

                // Try to repair truncated JSON
                const { repaired, wasRepaired, droppedItems } = attemptJsonRepair(jsonString);

                if (wasRepaired) {
                    try {
                        batchResult = JSON.parse(repaired) as any[];
                        console.log(`[JSON Parse] Repair successful for batch ${batchIndex + 1}`);
                        if (droppedItems > 0) {
                            console.warn(`[JSON Parse] Dropped ${droppedItems} incomplete items from batch ${batchIndex + 1}`);
                        }
                    } catch (repairError) {
                        // Log the original error context for debugging
                        console.error(`[JSON Parse] Repair failed. Original response length: ${jsonString.length}`);
                        console.error(`[JSON Parse] First 500 chars: ${jsonString.substring(0, 500)}`);
                        console.error(`[JSON Parse] Last 500 chars: ${jsonString.substring(jsonString.length - 500)}`);
                        throw parseError; // Throw original error
                    }
                } else {
                    // No repair possible, throw original error
                    console.error(`[JSON Parse] Unable to repair JSON. Response length: ${jsonString.length}`);
                    console.error(`[JSON Parse] First 500 chars: ${jsonString.substring(0, 500)}`);
                    console.error(`[JSON Parse] Last 500 chars: ${jsonString.substring(jsonString.length - 500)}`);
                    throw parseError;
                }
            }
            
            // Build lookup from input beats to re-attach persistent state after Gemini response
            const inputBeatLookup = new Map<string, any>();
            for (const b of beatsWithStyleGuide) {
                inputBeatLookup.set(b.beatId, b);
            }

            // Post-process: Ensure correct steps and FLUX-specific parameters (Phase C optimization)
            // Now uses image_config from Episode Context when available (Phase 4 enhancement)
            const correctedBatch = batchResult.map(bp => {
                // Ensure cinematic has correct values from image_config
                const correctedCinematic = {
                    ...bp.cinematic,
                    width: cinematicParams.width,
                    height: cinematicParams.height,
                    steps: cinematicParams.steps,
                    cfgscale: cinematicParams.cfgscale,
                    model: cinematicParams.model,
                };

                // Handle optional vertical prompt (now optional in Phase C)
                const correctedVertical = bp.vertical ? {
                    ...bp.vertical,
                    width: verticalParams.width,
                    height: verticalParams.height,
                    steps: verticalParams.steps,
                    cfgscale: verticalParams.cfgscale,
                    model: verticalParams.model,
                } : undefined;

                // Handle optional marketing vertical prompt (now optional in Phase C)
                const correctedMarketingVertical = bp.marketingVertical ? {
                    ...bp.marketingVertical,
                    width: verticalParams.width,
                    height: verticalParams.height,
                    steps: verticalParams.steps,
                    cfgscale: verticalParams.cfgscale,
                    model: verticalParams.model,
                } : undefined;

                // Re-attach persistent state and template from input beats (not in Gemini response)
                const inputBeat = inputBeatLookup.get(bp.beatId);
                const corrected: BeatPrompts = {
                    beatId: bp.beatId,
                    cinematic: correctedCinematic,
                    vertical: correctedVertical,
                    marketingVertical: correctedMarketingVertical,
                    scenePersistentState: inputBeat?.scenePersistentState,
                    sceneTemplate: inputBeat?.sceneTemplate,
                };

                // Log if values were corrected from AI response to image_config values
                const expectedSteps = cinematicParams.steps;
                const expectedCfgScale = cinematicParams.cfgscale;
                if (bp.cinematic?.steps !== expectedSteps || bp.cinematic?.cfgscale !== expectedCfgScale ||
                    (bp.vertical && (bp.vertical?.steps !== expectedSteps || bp.vertical?.cfgscale !== expectedCfgScale)) ||
                    (bp.marketingVertical && (bp.marketingVertical?.steps !== expectedSteps || bp.marketingVertical?.cfgscale !== expectedCfgScale))) {
                    console.log(`⚠️ Corrected steps/CFG for beat ${bp.beatId} to image_config values:`);
                    if (bp.cinematic?.steps !== expectedSteps || bp.cinematic?.cfgscale !== expectedCfgScale) {
                        console.log(`   Cinematic: steps ${bp.cinematic?.steps || 'missing'}→${expectedSteps}, cfgscale ${bp.cinematic?.cfgscale || 'missing'}→${expectedCfgScale}`);
                    }
                    if (bp.vertical && (bp.vertical?.steps !== expectedSteps || bp.vertical?.cfgscale !== expectedCfgScale)) {
                        console.log(`   Vertical: steps ${bp.vertical?.steps || 'missing'}→${expectedSteps}, cfgscale ${bp.vertical?.cfgscale || 'missing'}→${expectedCfgScale}`);
                    }
                    if (bp.marketingVertical && (bp.marketingVertical?.steps !== expectedSteps || bp.marketingVertical?.cfgscale !== expectedCfgScale)) {
                        console.log(`   Marketing Vertical: steps ${bp.marketingVertical?.steps || 'missing'}→${expectedSteps}, cfgscale ${bp.marketingVertical?.cfgscale || 'missing'}→${expectedCfgScale}`);
                    }
                }

                return corrected;
            });
            
            allResults.push(...correctedBatch);
            
            onProgress?.(`✅ Batch ${batchIndex + 1} completed: ${correctedBatch.length} prompts generated`);
            console.log(`Batch ${batchIndex + 1} completed: ${correctedBatch.length} prompts generated`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error processing batch ${batchIndex + 1}:`, error);

            // Save progress before failing
            console.log(`\n⚠️ PARTIAL PROGRESS: ${allResults.length} prompts generated successfully before failure`);
            console.log(`   Completed batches: ${batchIndex} of ${batches.length}`);
            console.log(`   Failed at batch: ${batchIndex + 1}`);

            // Provide helpful error guidance
            if (errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                errorMessage.includes('network')) {
                throw new Error(
                    `Network error at batch ${batchIndex + 1} of ${batches.length}. ` +
                    `${allResults.length} prompts generated successfully. ` +
                    `Possible causes: DNS resolution failure, network connectivity issue, or Gemini API outage. ` +
                    `Try: (1) Check network connection, (2) Verify DNS resolution for generativelanguage.googleapis.com, ` +
                    `(3) Retry analysis to resume from this point.`
                );
            } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
                throw new Error(
                    `API quota exceeded at batch ${batchIndex + 1} of ${batches.length}. ` +
                    `${allResults.length} prompts generated successfully. ` +
                    `Wait a few minutes and retry to resume.`
                );
            } else {
                throw new Error(
                    `Failed to generate prompts for batch ${batchIndex + 1} of ${batches.length}. ` +
                    `${allResults.length} prompts generated successfully. ` +
                    `Error: ${errorMessage}`
                );
            }
        }
    }

    // Apply LORA trigger substitution based on character contexts
    onProgress?.('Applying LORA trigger substitutions...');
    console.log('\n🔍 PROMPT GENERATION: Checking for location overrides before LORA substitution...');
    try {
        const contextObj = JSON.parse(episodeContextJson);
        
        // Log all available overrides in the context
        if (contextObj.episode?.scenes) {
            contextObj.episode.scenes.forEach((scene: any) => {
                const sceneChars = scene.characters || [];
                const sceneApps = scene.character_appearances || [];
                let sceneOverrideCount = 0;
                
                [...sceneChars, ...sceneApps].forEach((char: any) => {
                    const locCtx = char.location_context;
                    if (locCtx?.swarmui_prompt_override) {
                        sceneOverrideCount++;
                    }
                });
                
                if (sceneOverrideCount > 0) {
                    console.log(`   Scene ${scene.scene_number}: ${sceneOverrideCount} character(s) with overrides available`);
                }
            });
        }
        console.log('');
        
        // Extract characters - handle both structures:
        // 1. episode.characters (manual mode)
        // 2. episode.scenes[].characters[] (database mode)
        let characterContexts: Array<{ character_name: string; aliases: string[]; base_trigger: string }> = [];
        
        if (contextObj.episode?.characters && Array.isArray(contextObj.episode.characters)) {
            // Manual mode: characters at episode level
            characterContexts = contextObj.episode.characters.map((char: any) => ({
                character_name: char.character_name || char.name || '',
                aliases: char.aliases || [],
                base_trigger: char.base_trigger || ''
            })).filter((char: any) => char.character_name && char.base_trigger);
        } else if (contextObj.episode?.scenes && Array.isArray(contextObj.episode.scenes)) {
            // Database mode: extract unique characters from scenes
            // Also log location overrides for debugging
            console.log('\n🔍 PROMPT GENERATION: Analyzing location overrides in episode context...');
            contextObj.episode.scenes.forEach((scene: any) => {
                const sceneChars = scene.characters || [];
                const sceneApps = scene.character_appearances || [];
                
                [...sceneChars, ...sceneApps].forEach((char: any) => {
                    const locCtx = char.location_context;
                    if (locCtx?.swarmui_prompt_override) {
                        console.log(`   ✅ Scene ${scene.scene_number}: ${char.name || char.character_name}`);
                        console.log(`      Override will be used: "${locCtx.swarmui_prompt_override.substring(0, 80)}..."`);
                    }
                });
            });
            console.log('');
            
            const characterMap = new Map<string, { character_name: string; aliases: string[]; base_trigger: string }>();
            
            contextObj.episode.scenes.forEach((scene: any) => {
                // Extract from scene.characters
                if (scene.characters && Array.isArray(scene.characters)) {
                    scene.characters.forEach((char: any) => {
                        const name = char.name || char.character_name || '';
                        const baseTrigger = char.base_trigger || '';
                        
                        if (name && baseTrigger && !characterMap.has(name)) {
                            characterMap.set(name, {
                                character_name: name,
                                aliases: char.aliases || [],
                                base_trigger: baseTrigger
                            });
                        }
                    });
                }
                
                // Also extract from character_appearances (alternative structure)
                if (scene.character_appearances && Array.isArray(scene.character_appearances)) {
                    scene.character_appearances.forEach((char: any) => {
                        const name = char.name || char.character_name || '';
                        const baseTrigger = char.base_trigger || '';
                        
                        if (name && baseTrigger && !characterMap.has(name)) {
                            characterMap.set(name, {
                                character_name: name,
                                aliases: char.aliases || [],
                                base_trigger: baseTrigger
                            });
                        }
                    });
                }
            });
            
            characterContexts = Array.from(characterMap.values());
            console.log(`🔍 LORA Substitution: Extracted ${characterContexts.length} character context(s) from database:`, 
                characterContexts.map(c => `${c.character_name} (trigger: ${c.base_trigger}, aliases: ${c.aliases.join(', ')})`));
        }
        
        // Only apply substitution if we have character contexts
        if (characterContexts.length > 0) {
            console.log(`🔍 LORA Substitution: Processing ${characterContexts.length} character context(s):`,
                characterContexts.map(c => `${c.character_name} -> ${c.base_trigger}`).join(', '));

            // Build character trigger map for continuity validation
            const characterTriggerMap = new Map<string, string>();
            for (const ctx of characterContexts) {
                characterTriggerMap.set(ctx.character_name, ctx.base_trigger);
                for (const alias of (ctx.aliases || [])) {
                    characterTriggerMap.set(alias, ctx.base_trigger);
                }
            }

            const finalResults = allResults.map(bp => {
                const originalCinematic = bp.cinematic.prompt;

                // Step 1: Apply LORA trigger substitution
                let processedCinematic = applyLoraTriggerSubstitution(bp.cinematic.prompt, characterContexts);

                // Step 2: Apply segments from database override (replaces hardcoded segment map)
                // Segments are stored in swarmui_prompt_override from StoryTeller database
                const sceneMatch = bp.beatId.match(/s(\d+)-/);
                const sceneNumber = sceneMatch ? parseInt(sceneMatch[1]) : null;

                if (sceneNumber) {
                    // Find which character's trigger appears in this prompt and get their override (multi-phase v0.20)
                    for (const charCtx of characterContexts) {
                        if (processedCinematic.includes(charCtx.base_trigger)) {
                            const charPhase = bp.scenePersistentState?.characterPhases?.[charCtx.character_name] || 'default';
                            const originalOverride = getCharacterOverrideForScene(
                                contextObj,
                                sceneNumber,
                                charCtx.base_trigger,
                                isAegisEpisode,
                                charPhase
                            );
                            if (originalOverride) {
                                const beforeSegments = processedCinematic;
                                processedCinematic = applyDatabaseSegments(processedCinematic, originalOverride);
                                if (beforeSegments !== processedCinematic) {
                                    console.log(`[Segments] Database segments applied for ${charCtx.character_name} in beat ${bp.beatId} (phase: ${charPhase})`);
                                }
                            }
                            break; // Only apply for first matched character (primary subject)
                        }
                    }
                }

                // Step 3: Hair suppression enforcement (belt-and-suspenders safety fallback)
                // The hairFragmentService should have already suppressed hair for helmet-on beats.
                // This is a safety fallback to catch LLM hallucinations or edge cases.
                if (processedCinematic.includes('<segment:helmet') ||
                    processedCinematic.includes('helmet visor') ||
                    processedCinematic.includes('Wraith helmet') ||
                    processedCinematic.includes('visor down') ||
                    processedCinematic.includes('visor raised')) {
                    const beforeHairStrip = processedCinematic;
                    // Remove all hair descriptions that might conflict with helmet
                    processedCinematic = processedCinematic
                        .replace(/,?\s*dark brown hair[^,]*/gi, '')
                        .replace(/,?\s*stark white military-cut hair/gi, '')
                        .replace(/,?\s*white hair/gi, '')
                        .replace(/,?\s*brown hair[^,]*/gi, '')
                        .replace(/,?\s*hair in[^,]*/gi, '')
                        .replace(/,?\s*hair pulled back[^,]*/gi, '')
                        .replace(/,?\s*hair loose[^,]*/gi, '')
                        .replace(/,?\s*flowing hair/gi, '')
                        .replace(/,?\s*ponytail[^,]*/gi, '')
                        .replace(/,?\s*hair visible/gi, '')
                        .replace(/,?\s*updo[^,]*/gi, '')
                        .replace(/,?\s*tactical cap/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (beforeHairStrip !== processedCinematic) {
                        // Log as warning - hairFragmentService should have prevented this
                        console.warn(`[HairSuppression] FALLBACK ACTIVATED for ${bp.beatId} - hair service may have missed this case`);
                    }
                }

                // Step 3.5: Sanitize forbidden fabrication terms from generated prompt
                const preSanitize = processedCinematic;
                processedCinematic = sanitizePromptOverride(processedCinematic, isAegisEpisode);
                if (preSanitize !== processedCinematic) {
                    console.log(`[Sanitize] ${bp.beatId}: Removed/replaced forbidden terms`);
                }

                // Step 3.7: Override-aware character injection (v0.19)
                // When Gemini drops a character, inject their condensed swarmui_prompt_override
                // at attention-optimal position (token 31-80 zone) instead of weak "nearby" phrases.
                const beatHelmetState = bp.scenePersistentState?.gearState || null;
                // Detect shot type from the prompt itself (first word cluster before comma)
                const shotTypeMatch = processedCinematic.match(/^([\w\s-]+?)\s*,/);
                const detectedShotType = shotTypeMatch ? shotTypeMatch[1].trim() : 'medium shot';
                const injectionResult = injectMissingCharacterOverrides(
                    processedCinematic,
                    bp.beatId,
                    bp.scenePersistentState,
                    characterTriggerMap,
                    characterContexts,
                    contextObj,
                    sceneNumber || 1,
                    detectedShotType,
                    beatHelmetState,
                    isAegisEpisode
                );
                processedCinematic = injectionResult.prompt;

                // Step 4: Post-generation validation (Architect Memo: belt-and-suspenders)
                // Persistent state and template are re-attached from input beats after Gemini response
                const beatPersistentState = bp.scenePersistentState;
                const beatSceneTemplate = bp.sceneTemplate;
                // Calculate adaptive token budget for validation (v0.19)
                const validationHelmetStates: Array<'sealed' | 'visor_up' | 'off' | null> = [];
                if (beatHelmetState) {
                    validationHelmetStates.push(
                        beatHelmetState.includes('HELMET_DOWN') || beatHelmetState.includes('VISOR_DOWN') ? 'sealed'
                        : beatHelmetState.includes('VISOR_UP') ? 'visor_up'
                        : 'off'
                    );
                }
                const charCount = bp.scenePersistentState?.charactersPresent?.length || 1;
                const hasVehicle = !!(bp.scenePersistentState?.vehicle);
                const adaptiveBudget = calculateAdaptiveTokenBudget(
                    detectedShotType,
                    charCount,
                    validationHelmetStates,
                    hasVehicle
                );

                const validation = runPostGenerationValidation(
                    processedCinematic,
                    bp.beatId,
                    beatPersistentState,
                    characterTriggerMap,
                    beatSceneTemplate,
                    injectionResult.injectedCharacters,
                    injectionResult.vehicleInjected,
                    adaptiveBudget
                );

                // Log if any processing occurred
                if (originalCinematic !== processedCinematic) {
                    console.log(`[PostProcess] Applied for beat ${bp.beatId}`);
                    console.log(`   Final: "${processedCinematic.substring(0, 120)}..."`);
                } else {
                    console.warn(`[PostProcess] No changes for beat ${bp.beatId}`);
                }

                return {
                    ...bp,
                    cinematic: {
                        ...bp.cinematic,
                        prompt: processedCinematic,
                    },
                    validation,
                };
            });

            // Validation summary (Architect Memo: belt-and-suspenders)
            const validationResults = finalResults
                .filter(r => r.validation)
                .map(r => r.validation!);

            if (validationResults.length > 0) {
                const tokenExceeded = validationResults.filter(v => v.tokenBudgetExceeded).length;
                const continuityIssues = validationResults.filter(v => v.missingCharacters.length > 0 || v.missingVehicle).length;
                const fabricationIssues = validationResults.filter(v => v.forbiddenTermsFound.length > 0).length;
                const visorIssues = validationResults.filter(v => v.visorViolation).length;
                const alternateModel = validationResults.filter(v => v.modelRecommendation === 'ALTERNATE').length;
                const avgTokens = Math.round(validationResults.reduce((sum, v) => sum + v.tokenCount, 0) / validationResults.length);
                const triggersInjected = validationResults.filter(v => v.injectedCharacters.length > 0).length;
                const totalInjections = validationResults.reduce((sum, v) => sum + v.injectedCharacters.length, 0);
                const vehiclesInjected = validationResults.filter(v => v.vehicleInjected).length;

                const avgBudget = Math.round(validationResults.reduce((sum, v) => sum + (v.adaptiveTokenBudget || 200), 0) / validationResults.length);

                console.log('\n[Validation Summary] Architect Memo Enforcement (v0.19 Adaptive Budgets)');
                console.log(`  Prompts validated: ${validationResults.length}`);
                console.log(`  Average tokens: ${avgTokens}/${avgBudget} (adaptive budget)`);
                console.log(`  Token budget exceeded: ${tokenExceeded}/${validationResults.length}`);
                console.log(`  Continuity issues (missing chars/vehicle): ${continuityIssues}/${validationResults.length}`);
                console.log(`  Characters injected: ${totalInjections} across ${triggersInjected}/${validationResults.length} prompts`);
                console.log(`  Vehicles injected: ${vehiclesInjected}/${validationResults.length} prompts`);
                console.log(`  Fabrication violations: ${fabricationIssues}/${validationResults.length}`);
                console.log(`  Visor violations: ${visorIssues}/${validationResults.length}`);
                console.log(`  ALTERNATE model recommended: ${alternateModel}/${validationResults.length}`);
            }

            // Token tracking: Final summary
            console.log('\n╔═══════════════════════════════════════════════════════════════╗');
            console.log('║     [Phase B Token Tracking] FINAL SUMMARY                    ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('\n📊 Story Context Impact:');
            console.log(`   Story context section: ${tokenMetrics.storyContextChars} chars (~${tokenMetrics.storyContextTokensEstimate} tokens)`);
            console.log('\n📊 System Instruction:');
            console.log(`   Base (without story context): ${tokenMetrics.baseSystemInstructionChars} chars (~${tokenMetrics.baseSystemInstructionTokensEstimate} tokens)`);
            console.log(`   Enhanced (with story context): ${tokenMetrics.enhancedSystemInstructionChars} chars (~${tokenMetrics.enhancedSystemInstructionTokensEstimate} tokens)`);
            console.log(`   Delta: +${tokenMetrics.deltaChars} chars (+~${tokenMetrics.deltaTokensEstimate} tokens)`);
            if (storyContextAvailable) {
                const percentageIncrease = ((tokenMetrics.deltaChars / tokenMetrics.baseSystemInstructionChars) * 100).toFixed(1);
                console.log(`   Percentage increase: +${percentageIncrease}%`);
            }
            console.log('\n📊 Total Prompt (Batch 1 representative):');
            console.log(`   Total: ${tokenMetrics.totalPromptChars} chars (~${tokenMetrics.totalPromptTokensEstimate} tokens)`);
            console.log('\n✅ Prompt generation complete!');
            console.log('═══════════════════════════════════════════════════════════════\n');

            onProgress?.(`✅ Prompt generation complete! Generated ${finalResults.length} prompt pairs.`);
            return finalResults;
        } else {
            // Token tracking: Final summary (no story context case)
            console.log('\n╔═══════════════════════════════════════════════════════════════╗');
            console.log('║     [Phase B Token Tracking] FINAL SUMMARY                    ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('\n⚠️  No story context available for this generation');
            console.log('\n📊 System Instruction:');
            console.log(`   Base: ${tokenMetrics.baseSystemInstructionChars} chars (~${tokenMetrics.baseSystemInstructionTokensEstimate} tokens)`);
            console.log('\n📊 Total Prompt (Batch 1 representative):');
            console.log(`   Total: ${tokenMetrics.totalPromptChars} chars (~${tokenMetrics.totalPromptTokensEstimate} tokens)`);
            console.log('\n✅ Prompt generation complete (without story context enhancement)');
            console.log('═══════════════════════════════════════════════════════════════\n');

            // No character contexts found - return prompts without substitution
            onProgress?.(`⚠️ No character contexts found for LORA substitution. Generated ${allResults.length} prompt pairs.`);
            return allResults;
        }
    } catch (e) {
        console.warn('Failed to apply LORA trigger substitution:', e);
        onProgress?.(`⚠️ LORA substitution failed, but prompts are ready. Generated ${allResults.length} prompt pairs.`);
        return allResults;
    }
};

// --- NEW HIERARCHICAL PROMPT GENERATION SERVICE (Phase 3.1 - Risk-Free Implementation) ---

/**
 * NOTE FOR FUTURE DEVELOPERS:
 * This function is part of a parallel, risk-free implementation for advanced prompt generation.
 * It is activated by a feature flag ('useHierarchicalPrompts') in the main application.
 * It is designed to be tested and developed without interfering with the original `generateSwarmUiPrompts` function.
 *
 * This service generates SwarmUI prompts using a hierarchical, context-aware approach.
 * It fetches detailed visual data for specific sub-locations (e.g., a server room within a facility)
 * and combines it with the ambient visual DNA of the parent location to create grounded, consistent imagery.
 *
 * It includes a graceful fallback: if a beat lacks the necessary hierarchical data,
 * this function will revert to the simpler `locationAttributes`-based method for that beat,
 * ensuring robustness and allowing for incremental data population.
 */
import { getHierarchicalLocationContext } from './databaseContextService';

export const generateHierarchicalSwarmUiPrompts = async (
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig,
    retrievalMode: RetrievalMode = 'manual',
    storyId?: string,
    provider: LLMProvider = 'gemini',
    onProgress?: (message: string) => void
): Promise<BeatPrompts[]> => {
    onProgress?.('Initializing hierarchical prompt generation service...');
    console.log("INFO: Using NEW Hierarchical Prompt Generation Service.");

    // This function reuses the logic and AI call from the original service.
    // The primary difference is the pre-processing step where we enrich the beat
    // data with hierarchical location context before sending it to the AI.

    const enrichedBeats = [];
    for (const scene of analyzedEpisode.scenes) {
        for (const beat of scene.beats) {
            let finalBeat = { ...beat };

            // Check if the beat has a resolved location ID from the analysis phase.
            if (finalBeat.resolvedLocationId) {
                const hierarchicalContext = await getHierarchicalLocationContext(finalBeat.resolvedLocationId);

                if (hierarchicalContext) {
                    const { ambient_prompt_fragment, defining_visual_features } = hierarchicalContext;
                    
                    // Combine the hierarchical data into the existing locationAttributes.
                    // The AI's system instruction will be updated to prioritize these.
                    const newAttributes = [];
                    if (ambient_prompt_fragment) {
                        newAttributes.push(`ambient_context:(${ambient_prompt_fragment})`);
                    }
                    if (defining_visual_features && defining_visual_features.length > 0) {
                        newAttributes.push(...defining_visual_features);
                    }

                    // If we have new attributes, prepend them. Otherwise, keep the old ones.
                    if (newAttributes.length > 0) {
                        finalBeat.locationAttributes = [...newAttributes, ...(finalBeat.locationAttributes || [])];
                    }
                    
                    console.log(`Enriched Beat ${finalBeat.beatId} with hierarchical context.`);
                } else {
                    console.log(`Beat ${finalBeat.beatId} had a resolvedLocationId, but no hierarchical context was found. Falling back.`);
                }
            }
            enrichedBeats.push(finalBeat);
        }
    }

    // We need to create a new AnalyzedEpisode object with the enriched beats
    // to pass to the original prompt generation logic.
    const enrichedAnalyzedEpisode: AnalyzedEpisode = {
        ...analyzedEpisode,
        scenes: analyzedEpisode.scenes.map(scene => ({
            ...scene,
            beats: enrichedBeats.filter(b => b.beatId.startsWith(`s${scene.sceneNumber}-`))
        }))
    };

    // Now, call the original prompt generation function with the *enriched* data.
    // We will also slightly modify the system instruction to tell the AI how to use the new context.
    // For this example, we will assume the original function can be called directly.
    // In a full implementation, we would refactor `generateSwarmUiPrompts` to share its core AI call logic.
    
    // For now, we will just log the enriched data and call the original function.
    console.log("--- ENRICHED EPISODE DATA ---");
    console.log(JSON.stringify(enrichedAnalyzedEpisode, null, 2));
    console.log("-----------------------------");
    
    // This is a placeholder for calling the refactored AI logic.
    // For this implementation, we will just call the original function, which
    // will now benefit from the enriched `locationAttributes`.
    onProgress?.('Starting prompt generation with enriched location context...');
    return generateSwarmUiPrompts(enrichedAnalyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, provider, onProgress);
};

// ============================================================================
// v0.21 VBS Compiler Pipeline: Orchestrator
// ============================================================================

/**
 * V0.21 Compiler-style prompt generation using Visual Beat Spec (VBS).
 * Four-phase pipeline:
 *   Phase A: Deterministic enrichment (vbsBuilderService)
 *   Phase B: LLM fill-in (vbsFillInService)
 *   Phase C: Deterministic compilation (vbsCompilerService)
 *   Phase D: Validation and repair loop (vbsCompilerService)
 *
 * Beats processed sequentially (not batched) for per-beat location awareness.
 */
async function generateSwarmUiPromptsV021(
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig,
    retrievalMode: RetrievalMode = 'manual',
    storyId?: string,
    provider: LLMProvider = 'gemini',
    onProgress?: (message: string) => void
): Promise<BeatPrompts[]> {
    try {
        // Lazy imports to avoid circular dependencies
        const { buildVisualBeatSpec } = await import('./vbsBuilderService');
        const { fillVBSWithLLM, mergeVBSFillIn } = await import('./vbsFillInService');
        const { validateAndRepairVBS } = await import('./vbsCompilerService');
        const { processEpisodeWithFullContext } = await import('./beatStateService');
        const { generateEnhancedEpisodeContext } = await import('./databaseContextService');

        onProgress?.('v0.21: Processing episode context...');

        // Parse episode context
        let parsedEpisodeContext: EnhancedEpisodeContext;
        try {
            parsedEpisodeContext = JSON.parse(episodeContextJson);
        } catch {
            throw new Error('Failed to parse episode context JSON');
        }

        // Process episode through beatStateService (Phase A foundation)
        onProgress?.('v0.21: Building beat state...');
        const processedEpisode = await processEpisodeWithFullContext(
            analyzedEpisode,
            parsedEpisodeContext,
            storyId
        );

        const beatPrompts: BeatPrompts[] = [];

        // Initialize scene persistent state (will accumulate across beats)
        const sceneStates: Record<number, ScenePersistentState> = {};

        // Process each scene
        for (const scene of processedEpisode.episode.scenes) {
            onProgress?.(`v0.21: Processing scene ${scene.sceneNumber}...`);

            // Initialize scene persistent state if not already done
            if (!sceneStates[scene.sceneNumber]) {
                sceneStates[scene.sceneNumber] = {
                    charactersPresent: [],
                    characterPositions: {},
                    characterPhases: {},
                    gearState: null,
                    vehicle: null,
                    vehicleState: null,
                    location: null,
                    lighting: null,
                };
            }

            let previousBeatVBS: any = undefined;
            let previousBeat: any = undefined;

            // Process beats sequentially
            for (const beat of scene.beats) {
                const beatLabel = `s${scene.sceneNumber}-b${beat.beatId.split('-')[1]}`;
                onProgress?.(`  Generating prompt for beat ${beatLabel}...`);

                try {
                    // Get current scene state (accumulated from beat state service processing)
                    // For now, initialize with characters from beat analysis
                    const currentSceneState: ScenePersistentState = {
                        ...sceneStates[scene.sceneNumber],
                        charactersPresent: (beat as any).characters || sceneStates[scene.sceneNumber].charactersPresent,
                        characterPositions: (beat as any).characterPositioning ? { [(beat as any).characters?.[0]]: (beat as any).characterPositioning } : sceneStates[scene.sceneNumber].characterPositions,
                    };

                    // Phase A: Build VBS (deterministic enrichment)
                    // Now async with runtime skill integration
                    const partialVBS = await buildVisualBeatSpec(
                        beat as any as FullyProcessedBeat,
                        parsedEpisodeContext,
                        currentSceneState,
                        scene.sceneNumber,
                        previousBeatVBS,
                        previousBeat as any as FullyProcessedBeat
                    );

                    // Update scene state with VBS persistent state
                    sceneStates[scene.sceneNumber] = partialVBS.persistentStateSnapshot;

                    // Phase B: Fill with LLM
                    const fillIn = await fillVBSWithLLM(partialVBS, beat, provider);

                    // Merge fill-in into VBS
                    const completedVBS = mergeVBSFillIn(partialVBS, fillIn);

                    // Phase D: Validate and repair (now async with skill integration)
                    const validationResult = await validateAndRepairVBS(completedVBS);

                    // Create BeatPrompts result
                    const prompt = validationResult.finalPrompt;
                    const swarmUIPrompt: SwarmUIPrompt = {
                        prompt,
                        model: styleConfig.model,
                        width: styleConfig.cinematicAspectRatio === '16:9' ? 1280 : 1024,
                        height: styleConfig.cinematicAspectRatio === '16:9' ? 720 : 1024,
                        steps: 30,
                        cfgscale: 7.5,
                        seed: Math.floor(Math.random() * 1000000),
                        sampler: 'euler',
                        scheduler: 'simple',
                    };

                    beatPrompts.push({
                        beatId: beat.beatId,
                        cinematic: swarmUIPrompt,
                        scenePersistentState: beat.persistentState,
                        sceneTemplate: beat.sceneTemplate,
                        validation: {
                            beatId: beat.beatId,
                            tokenCount: estimatePromptTokens(prompt),
                            tokenBudgetExceeded: false,
                            missingCharacters: [],
                            missingVehicle: false,
                            forbiddenTermsFound: [],
                            visorViolation: false,
                            modelRecommendation: completedVBS.modelRoute,
                            modelRecommendationReason: completedVBS.modelRoute === 'FLUX' ? 'faces_visible' : 'no_faces',
                            sceneTemplate: beat.sceneTemplate,
                            injectedCharacters: [],
                            vehicleInjected: false,
                            adaptiveTokenBudget: completedVBS.constraints.tokenBudget.total,
                            warnings: validationResult.issues
                                .filter(i => i.severity === 'warning')
                                .map(i => i.description),
                        },
                        vbs: completedVBS,
                    });

                    // Update previousBeatVBS and previousBeat for next iteration
                    previousBeatVBS = completedVBS;
                    previousBeat = beat;

                    if (validationResult.issues.length > 0) {
                        console.log(`[v0.21] Beat ${beatLabel}: ${validationResult.issues.length} validation issue(s)`);
                        console.log(`  Repairs applied: ${validationResult.repairsApplied.join(', ')}`);
                    }
                } catch (beatError) {
                    console.error(`[v0.21] Failed to process beat ${beatLabel}:`, beatError);
                    // Fall back to creating an empty prompt for this beat
                    beatPrompts.push({
                        beatId: beat.beatId,
                        cinematic: {
                            prompt: `[Beat ${beatLabel}: Generation failed]`,
                            model: styleConfig.model,
                            width: 1280,
                            height: 720,
                            steps: 30,
                            cfgscale: 7.5,
                            seed: 0,
                        },
                        validation: {
                            beatId: beat.beatId,
                            tokenCount: 0,
                            tokenBudgetExceeded: false,
                            missingCharacters: [],
                            missingVehicle: false,
                            forbiddenTermsFound: [],
                            visorViolation: false,
                            modelRecommendation: 'FLUX',
                            modelRecommendationReason: 'error_fallback',
                            injectedCharacters: [],
                            vehicleInjected: false,
                            warnings: [`Generation failed: ${beatError instanceof Error ? beatError.message : String(beatError)}`],
                        },
                    });
                }
            }
        }

        onProgress?.('v0.21: Pipeline complete');
        return beatPrompts;
    } catch (error) {
        console.error('[v0.21] Pipeline failed:', error);
        throw error;
    }
}