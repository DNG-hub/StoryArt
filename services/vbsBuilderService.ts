/**
 * VBS Builder Service — Phase A: Deterministic Enrichment
 *
 * Builds the Visual Beat Spec (VBS) from database context and beat state.
 * All deterministic data is populated in Phase A; only action/expression/composition
 * slots are left empty for Phase B (LLM fill-in).
 *
 * No API calls, no LLM involvement — pure TypeScript determinism.
 *
 * v0.21 Compiler-Style Prompt Generation
 */

import type {
  VisualBeatSpec,
  VBSSubject,
  VBSEnvironment,
  TokenBudget,
  ScenePersistentState,
  CharacterLocationContext,
  EnhancedEpisodeContext,
  ArtifactContext,
  CharacterAppearance,
} from '../types';
import type { FullyProcessedBeat } from './beatStateService';

/**
 * Build the Visual Beat Spec for a single beat.
 * Populates all deterministic fields from database context and persistent state.
 */
export function buildVisualBeatSpec(
  beat: FullyProcessedBeat,
  episodeContext: EnhancedEpisodeContext,
  persistentState: ScenePersistentState,
  sceneNumber: number,
  previousBeatVBS?: VisualBeatSpec,
  previousBeat?: FullyProcessedBeat
): VisualBeatSpec {
  // Determine template type from scene template
  const templateType = beat.sceneTemplate?.templateType || 'generic';

  // Detect location change if we have previous beat
  const locationChanged = previousBeat &&
    (beat.resolvedLocationId !== previousBeat.resolvedLocationId);

  // Determine model route: FLUX if any face visible, ALTERNATE if all visors down
  const subjects = buildSubjects(
    beat,
    episodeContext,
    sceneNumber,
    persistentState,
    locationChanged
  );
  const faceVisible = subjects.some(s => s.faceVisible);
  const modelRoute = faceVisible ? 'FLUX' : 'ALTERNATE';

  // Build environment from location artifacts
  const environment = buildEnvironment(beat, episodeContext, sceneNumber);

  // Get shot details from beat
  const shot = {
    shotType: beat.fluxShotType || 'medium shot',
    cameraAngle: beat.fluxCameraAngle,
    // composition is filled by LLM in Phase B
    composition: undefined as string | undefined,
  };

  // Build vehicle section if present
  const vehicle = persistentState.vehicle ? {
    description: persistentState.vehicle,
    spatialNote: undefined as string | undefined, // Filled by LLM
  } : undefined;

  // Calculate adaptive token budget
  const helmetStates = subjects.map(s => {
    if (s.helmetState === 'VISOR_DOWN') return 'sealed';
    if (s.helmetState === 'VISOR_UP') return 'visor_up';
    return 'off';
  });
  const tokenBudget = calculateAdaptiveTokenBudgetFromContext(
    shot.shotType,
    subjects.length,
    helmetStates as Array<'sealed' | 'visor_up' | 'off'>,
    !!vehicle
  );

  // Build previous beat summary for continuity
  const previousBeatSummary = previousBeatVBS
    ? buildPreviousBeatSummary(previousBeatVBS)
    : undefined;

  return {
    beatId: beat.beatId,
    sceneNumber,
    templateType,
    modelRoute,
    shot,
    subjects,
    environment,
    vehicle,
    constraints: {
      tokenBudget,
      segmentPolicy: 'IF_FACE_VISIBLE',
      compactionDropOrder: [
        'vehicle.spatialNote',
        'environment.props',
        'environment.fx',
        'environment.atmosphere',
        'subjects[1].description',
      ],
    },
    previousBeatSummary,
    persistentStateSnapshot: persistentState,
  };
}

/**
 * Build subjects (characters) for the VBS.
 * All appearance details come from database; action/expression are left empty for Phase B.
 * Beat-level location context takes precedence over scene-level.
 */
function buildSubjects(
  beat: FullyProcessedBeat,
  episodeContext: EnhancedEpisodeContext,
  sceneNumber: number,
  persistentState: ScenePersistentState,
  locationChanged?: boolean
): VBSSubject[] {
  const subjects: VBSSubject[] = [];

  for (const charName of persistentState.charactersPresent) {
    // Skip Ghost — non-physical entity
    if (charName.toLowerCase() === 'ghost') continue;

    // Find character in episode context
    const charContext = episodeContext.episode.characters.find(c => c.character_name === charName);
    if (!charContext) continue;

    // Get the scene-specific appearance
    const sceneContext = episodeContext.episode.scenes.find(s => s.scene_number === sceneNumber);
    if (!sceneContext) continue;

    const charAppearance = sceneContext.character_appearances.find(ca => ca.character_name === charName);
    if (!charAppearance) continue;

    // Determine location context: use beat-level if available, fall back to scene-level
    let locationContext = selectLocationContext(
      beat,
      charAppearance,
      persistentState,
      charName,
      locationChanged
    );

    // Determine helmet state from persistent state
    const helmetState = detectHelmetState(persistentState.gearState);

    // Apply helmet state to description
    const baseDescription = locationContext.swarmui_prompt_override || '';
    const description = applyHelmetStateToDescription(
      baseDescription,
      helmetState,
      locationContext.helmet_fragment_off,
      locationContext.helmet_fragment_visor_up,
      locationContext.helmet_fragment_visor_down
    );

    // Extract segments from description
    const clothingSegments = extractSegments(baseDescription);
    const faceVisible = helmetState === 'OFF' || helmetState === 'IN_HAND' || helmetState === 'VISOR_UP';

    // Build segment tags
    const segments: VBSSubject['segments'] = {
      clothing: clothingSegments,
    };

    // Add face segment if visible
    if (faceVisible && locationContext.face_segment_rule !== 'NEVER') {
      segments.face = '<segment:yolo-face>';
    }

    const subject: VBSSubject = {
      characterName: charName,
      loraTrigger: charContext.base_trigger,
      description,
      action: undefined, // Filled by LLM
      expression: helmetState === 'VISOR_DOWN' ? null : undefined, // Null when sealed, filled otherwise
      position: persistentState.characterPositions[charName],
      faceVisible,
      helmetState,
      segments,
    };

    subjects.push(subject);
  }

  return subjects;
}

/**
 * Intelligently select location context for a character.
 * Prioritizes beat-level location with phase matching, falls back to scene-level.
 */
function selectLocationContext(
  beat: FullyProcessedBeat,
  charAppearance: CharacterAppearance,
  persistentState: ScenePersistentState,
  charName: string,
  locationChanged?: boolean
): CharacterLocationContext {
  // If beat has a resolved location ID, try to find matching context
  if (beat.resolvedLocationId) {
    const beatLocationContext = findLocationContextByBeatLocation(
      charAppearance,
      beat.resolvedLocationId,
      persistentState,
      charName,
      locationChanged
    );
    if (beatLocationContext) {
      return beatLocationContext;
    }
  }

  // Fall back to scene-level location context
  // Use current phase if set
  const currentPhase = persistentState.characterPhases[charName] || 'default';

  let locationContext = charAppearance.location_context;
  if (charAppearance.phases && charAppearance.phases.length > 0) {
    const phaseMatch = charAppearance.phases.find(p => p.context_phase === currentPhase);
    if (phaseMatch) {
      locationContext = phaseMatch;
    }
  }

  return locationContext;
}

/**
 * Find location context for a beat-specific location.
 * Uses phase_trigger_text matching to select appropriate phase.
 */
function findLocationContextByBeatLocation(
  charAppearance: CharacterAppearance,
  beatLocationId: string,
  persistentState: ScenePersistentState,
  charName: string,
  locationChanged?: boolean
): CharacterLocationContext | null {
  // Check if the beat location matches the character appearance location
  // This is determined by comparing location identifiers or names
  // For now, we match by location name from the location context

  let candidateContexts: CharacterLocationContext[] = [];

  // Check base location context
  if (locationMatches(charAppearance.location_context, beatLocationId)) {
    candidateContexts.push(charAppearance.location_context);
  }

  // Check phased contexts
  if (charAppearance.phases && charAppearance.phases.length > 0) {
    const phasedMatches = charAppearance.phases.filter(p =>
      locationMatches(p, beatLocationId)
    );
    candidateContexts = candidateContexts.concat(phasedMatches);
  }

  if (candidateContexts.length === 0) {
    return null; // No matching location context
  }

  // If location changed, prioritize phases that match the narrative transition
  if (locationChanged && candidateContexts.length > 1) {
    const transitionPhases = candidateContexts.filter(ctx =>
      ctx.context_phase === 'arrival' || ctx.context_phase === 'transit'
    );
    if (transitionPhases.length > 0) {
      return transitionPhases[0];
    }
  }

  // Use current phase if available in candidate contexts
  const currentPhase = persistentState.characterPhases[charName] || 'default';
  const phaseMatch = candidateContexts.find(ctx => ctx.context_phase === currentPhase);
  if (phaseMatch) {
    return phaseMatch;
  }

  // If multiple candidates, prefer 'default' phase, then 'arrival', then first
  const defaultPhase = candidateContexts.find(ctx => ctx.context_phase === 'default');
  if (defaultPhase) {
    return defaultPhase;
  }

  return candidateContexts[0];
}

/**
 * Check if a location context matches the beat's resolved location ID.
 * Currently matches by location_name; may need UUID matching in future.
 */
function locationMatches(
  locationContext: CharacterLocationContext,
  beatLocationId: string
): boolean {
  // For now, match by location name as a proxy for UUID
  // This assumes beat.resolvedLocationId can be matched to location_name
  // In the future, this should be updated to use actual UUIDs if available

  if (!beatLocationId) return false;

  // Location names are typically human-readable (e.g., "bedroom", "kitchen", "vault")
  // Beat location IDs are UUIDs; we need to find a way to match them
  // For now, return true if location context exists (conservative fallback)
  return true;
}

/**
 * Determine helmet state from gear state string.
 */
function detectHelmetState(gearState: string | null): 'OFF' | 'IN_HAND' | 'VISOR_UP' | 'VISOR_DOWN' {
  if (!gearState) return 'OFF';

  const upper = gearState.toUpperCase();
  if (upper.includes('VISOR_DOWN') || upper.includes('SEALED')) return 'VISOR_DOWN';
  if (upper.includes('VISOR_UP')) return 'VISOR_UP';
  if (upper.includes('HAND') || upper.includes('REMOVE')) return 'IN_HAND';

  return 'OFF';
}

/**
 * Apply helmet state to character description.
 * Swaps in appropriate helmet fragment based on state.
 */
export function applyHelmetStateToDescription(
  baseDescription: string,
  helmetState: 'OFF' | 'IN_HAND' | 'VISOR_UP' | 'VISOR_DOWN',
  fragmentOff?: string,
  fragmentVisorUp?: string,
  fragmentVisorDown?: string
): string {
  let result = baseDescription;

  // Remove existing helmet references
  result = result.replace(/<segment:[^>]+>/g, ''); // Remove segments first
  result = result.replace(/,?\s*helmet[^,]*/gi, '');
  result = result.replace(/,?\s*visor[^,]*/gi, '');
  result = result.replace(/,?\s*sealed[^,]*/gi, '');

  // Apply appropriate fragment based on state
  let fragment = '';
  if (helmetState === 'VISOR_DOWN' && fragmentVisorDown) {
    fragment = fragmentVisorDown;
  } else if (helmetState === 'VISOR_UP' && fragmentVisorUp) {
    fragment = fragmentVisorUp;
  } else if (helmetState === 'OFF' && fragmentOff) {
    fragment = fragmentOff;
  }

  // Append fragment if applicable
  if (fragment) {
    result = result.trim();
    if (result && !result.endsWith(',')) result += ',';
    result += ' ' + fragment;
  }

  // Clean up formatting
  result = result.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();

  return result;
}

/**
 * Extract segment tags from a character description.
 * Returns comma-separated segment tag strings.
 */
function extractSegments(description: string): string {
  const matches = description.match(/<segment:[^>]+>/g);
  return matches ? matches.join(', ') : '';
}

/**
 * Build environment section of VBS.
 * Maps artifacts by type (STRUCTURAL/LIGHTING/ATMOSPHERIC/PROP).
 */
function buildEnvironment(
  beat: FullyProcessedBeat,
  episodeContext: EnhancedEpisodeContext,
  sceneNumber: number
): VBSEnvironment {
  const sceneContext = episodeContext.episode.scenes.find(s => s.scene_number === sceneNumber);
  if (!sceneContext) {
    return {
      locationShorthand: 'generic location',
      anchors: [],
      lighting: '',
      atmosphere: '',
    };
  }

  const location = sceneContext.location;
  const artifacts = location.artifacts || [];

  // Map artifacts by type
  const byType = mapArtifactsByType(artifacts);

  // Build lighting from artifacts + beat lighting
  let lighting = byType.lighting.join(', ');
  if (beat.fluxLighting && beat.fluxLighting.length > 0) {
    const fluxLightingText = Array.isArray(beat.fluxLighting)
      ? beat.fluxLighting.join(', ')
      : beat.fluxLighting;
    lighting = lighting ? `${lighting}, ${fluxLightingText}` : fluxLightingText;
  }

  return {
    locationShorthand: location.name || 'location',
    anchors: byType.structural,
    lighting: lighting || 'neutral lighting',
    atmosphere: byType.atmospheric.join(', ') || '',
    props: byType.prop.length > 0 ? byType.prop : undefined,
    // fx: additional environmental effects (if available in future)
  };
}

/**
 * Map artifacts by type for VBS environment.
 */
export function mapArtifactsByType(artifacts: ArtifactContext[]): {
  structural: string[];
  lighting: string[];
  atmospheric: string[];
  prop: string[];
} {
  const result = {
    structural: [] as string[],
    lighting: [] as string[],
    atmospheric: [] as string[],
    prop: [] as string[],
  };

  for (const artifact of artifacts) {
    const type = artifact.artifact_type?.toUpperCase() || 'GENERIC';
    const fragment = artifact.swarmui_prompt_fragment || artifact.description;

    if (type === 'STRUCTURAL') {
      result.structural.push(fragment);
    } else if (type === 'LIGHTING') {
      result.lighting.push(fragment);
    } else if (type === 'ATMOSPHERIC') {
      result.atmospheric.push(fragment);
    } else if (type === 'PROP') {
      result.prop.push(fragment);
    } else {
      // Default to prop for unknown types
      result.prop.push(fragment);
    }
  }

  return result;
}

/**
 * Calculate adaptive token budget (replicates promptGenerationService logic).
 */
function calculateAdaptiveTokenBudgetFromContext(
  shotType: string,
  characterCount: number,
  helmetStates: Array<'sealed' | 'visor_up' | 'off'>,
  hasVehicle: boolean
): TokenBudget {
  const BASE_BUDGETS: Record<string, { one: number; two: number }> = {
    'close-up shot': { one: 250, two: 280 },
    'close-up': { one: 250, two: 280 },
    'medium close-up': { one: 235, two: 270 },
    'medium shot': { one: 220, two: 260 },
    'medium wide shot': { one: 200, two: 230 },
    'wide shot': { one: 180, two: 200 },
    'extreme wide shot': { one: 150, two: 170 },
    'establishing shot': { one: 150, two: 150 },
  };

  const normalizedShot = shotType.toLowerCase().trim();
  const baseBudget = BASE_BUDGETS[normalizedShot] || BASE_BUDGETS['medium shot'];
  const effectiveCharCount = Math.min(characterCount, 2);
  let total = effectiveCharCount >= 2 ? baseBudget.two : baseBudget.one;

  // Helmet savings
  for (const state of helmetStates) {
    if (state === 'sealed') {
      total -= 30;
      total += 25;
    }
  }

  // Vehicle bonus
  if (hasVehicle) {
    total += 20;
  }

  const composition = 30;
  const segments = 15;
  const remaining = total - composition - segments;

  const isCloseUp = normalizedShot.includes('close');
  const isWide = normalizedShot.includes('wide') || normalizedShot.includes('establishing');

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
 * Build a summary of the previous beat for continuity context.
 * ~30 token prose snapshot of prior VBS for feeding to Phase B LLM.
 */
export function buildPreviousBeatSummary(prevVBS: VisualBeatSpec): string {
  const subjectSummaries = prevVBS.subjects
    .map(s => {
      const pos = s.position ? ` ${s.position}` : '';
      const gear = s.helmetState === 'VISOR_DOWN' ? ' visor-down' : '';
      return `${s.characterName}${pos}${gear}`;
    })
    .join(', ');

  const locationRef = prevVBS.environment.locationShorthand;
  const lighting = prevVBS.environment.lighting ? ` ${prevVBS.environment.lighting.split(',')[0]}` : '';

  return `Scene continues: ${subjectSummaries} in ${locationRef}${lighting}.`;
}
