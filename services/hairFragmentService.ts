/**
 * Hair Fragment Selection Service
 *
 * Implements SKILL.md Section 3.6.2 - Hair Fragment Selection Logic
 * Selects appropriate hair fragment based on helmet state and location context.
 *
 * Hair is SUPPRESSED when helmet is ON (visor up or down).
 * Hair fragment is SELECTED based on location context when helmet is OFF.
 */

// Location-to-Hair mapping from SKILL.md Section 3.6.2
const LOCATION_HAIR_MAPPING: Record<string, string> = {
  // Safehouse/casual locations -> casual_hair_cat_down
  "dragon's lair": 'casual_hair_cat_down',
  "safehouse": 'casual_hair_cat_down',
  "mmb": 'casual_hair_cat_down',  // Mobile Medical Base when off-duty
  "lair": 'casual_hair_cat_down',

  // Formal locations -> formal_hair_cat_updo
  "chen's rejuvenation spa": 'formal_hair_cat_updo',
  "chen's spa": 'formal_hair_cat_updo',
  "spa": 'formal_hair_cat_updo',
  "klepstein": 'formal_hair_cat_updo',
  "klepstein's": 'formal_hair_cat_updo',
  "klepstein tower": 'formal_hair_cat_updo',

  // Stealth/covert locations -> stealth_hair_cat_cap
  "urban market": 'stealth_hair_cat_cap',
  "market": 'stealth_hair_cat_cap',

  // Combat/field locations -> combat_hair_cat (default tactical)
  "abandoned mall": 'combat_hair_cat',
  "hospital ruins": 'combat_hair_cat',
  "nhia": 'combat_hair_cat',
  "facility": 'combat_hair_cat',
  "vault": 'combat_hair_cat',
};

// Gear context to hair mapping
const GEAR_CONTEXT_HAIR_MAPPING: Record<string, string> = {
  'off_duty': 'casual_hair_cat_down',
  'field_op': 'combat_hair_cat',
  'suit_up': 'combat_hair_cat_tucked',  // Pre-helmet seal
  'stealth': 'stealth_hair_cat_cap',
};

// Hair fragment prompt text lookup
const HAIR_FRAGMENTS: Record<string, string> = {
  'combat_hair_cat': 'dark brown hair pulled back in quick low ponytail at nape of neck secured with black scrunchy',
  'combat_hair_cat_tucked': 'dark brown hair in low ponytail tucked into suit collar',
  'casual_hair_cat_down': 'dark brown hair loose and down with natural waves flowing freely',
  'formal_hair_cat_updo': 'dark brown hair in elegant updo with sleek professional styling',
  'stealth_hair_cat_cap': 'dark brown hair hidden under tactical cap',
  'combat_hair_daniel': 'stark white military-cut hair',
};

export interface HairFragmentResult {
  fragmentKey: string | null;
  promptFragment: string | null;
  suppressed: boolean;
  reason: string;
}

/**
 * Determine if hair should be suppressed based on helmet state.
 * Hair is hidden under helmet when visor is up or down.
 */
export function shouldSuppressHair(helmetState: string | null): boolean {
  if (!helmetState) return false;

  const normalizedState = helmetState.toUpperCase().replace(/\s+/g, '_');

  // Helmet ON states suppress hair (hair hidden under helmet)
  const suppressStates = ['VISOR_UP', 'VISOR_DOWN', 'ON_VISOR_UP', 'ON_VISOR_DOWN'];
  return suppressStates.includes(normalizedState);
}

/**
 * Select appropriate hair fragment based on helmet state and location context.
 *
 * Decision tree:
 * 1. If helmet ON (visor up/down) -> suppress hair entirely
 * 2. If suit_up gear context -> combat_hair_cat_tucked (pre-helmet seal)
 * 3. If location matches mapping -> use location-specific hair
 * 4. If gear context matches mapping -> use context-specific hair
 * 5. Default -> combat_hair_cat (tactical ponytail)
 */
export function selectHairFragment(
  characterName: string,
  helmetState: string | null,
  locationName: string | null,
  gearContext: string | null
): HairFragmentResult {
  const charLower = characterName.toLowerCase();

  // Daniel always uses same hair (no variation by location)
  if (charLower.includes('daniel') || charLower.includes("o'brien")) {
    if (shouldSuppressHair(helmetState)) {
      return {
        fragmentKey: null,
        promptFragment: null,
        suppressed: true,
        reason: `Helmet ${helmetState} - hair hidden under helmet`
      };
    }
    return {
      fragmentKey: 'combat_hair_daniel',
      promptFragment: HAIR_FRAGMENTS['combat_hair_daniel'],
      suppressed: false,
      reason: 'Daniel - military cut (no variation)'
    };
  }

  // Cat (or any other character with hair variation)

  // Step 1: Check helmet state for suppression
  if (shouldSuppressHair(helmetState)) {
    return {
      fragmentKey: null,
      promptFragment: null,
      suppressed: true,
      reason: `Helmet ${helmetState} - hair hidden under helmet`
    };
  }

  // Step 2: Check suit-up phase (highest priority after helmet)
  if (gearContext === 'suit_up') {
    return {
      fragmentKey: 'combat_hair_cat_tucked',
      promptFragment: HAIR_FRAGMENTS['combat_hair_cat_tucked'],
      suppressed: false,
      reason: 'Suit-up phase - pre-helmet seal'
    };
  }

  // Step 3: Check location mapping
  if (locationName) {
    const locLower = locationName.toLowerCase();
    for (const [locPattern, hairKey] of Object.entries(LOCATION_HAIR_MAPPING)) {
      if (locLower.includes(locPattern)) {
        return {
          fragmentKey: hairKey,
          promptFragment: HAIR_FRAGMENTS[hairKey] || null,
          suppressed: false,
          reason: `Location: ${locationName}`
        };
      }
    }
  }

  // Step 4: Check gear context mapping
  if (gearContext && GEAR_CONTEXT_HAIR_MAPPING[gearContext]) {
    const hairKey = GEAR_CONTEXT_HAIR_MAPPING[gearContext];
    return {
      fragmentKey: hairKey,
      promptFragment: HAIR_FRAGMENTS[hairKey] || null,
      suppressed: false,
      reason: `Gear context: ${gearContext}`
    };
  }

  // Step 5: Default to combat hair (tactical ponytail)
  return {
    fragmentKey: 'combat_hair_cat',
    promptFragment: HAIR_FRAGMENTS['combat_hair_cat'],
    suppressed: false,
    reason: 'Default tactical hair'
  };
}

/**
 * Get hair fragment prompt text by key.
 */
export function getHairFragmentPrompt(fragmentKey: string): string | null {
  return HAIR_FRAGMENTS[fragmentKey] || null;
}

/**
 * Check if a character is Cat (has hair variation logic).
 */
export function hasHairVariation(characterName: string): boolean {
  const charLower = characterName.toLowerCase();
  // Cat has hair variation, Daniel does not
  return charLower.includes('cat') ||
         charLower.includes('catherine') ||
         charLower.includes('mitchell');
}
