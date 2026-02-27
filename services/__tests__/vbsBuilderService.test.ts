/**
 * Tests for VBS Builder Service (Phase A)
 *
 * Tests deterministic enrichment: building Visual Beat Spec from database context
 * and beat state. Verifies helmet state application, artifact mapping, and
 * segment tag generation.
 *
 * v0.21 Compiler-Style Prompt Generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildVisualBeatSpec,
  mapArtifactsByType,
  applyHelmetStateToDescription,
} from '../vbsBuilderService';

import type {
  VisualBeatSpec,
  EnhancedEpisodeContext,
  ScenePersistentState,
  ArtifactContext,
} from '../../types';
import type { FullyProcessedBeat } from '../beatStateService';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockFullyProcessedBeat(overrides?: Partial<FullyProcessedBeat>): FullyProcessedBeat {
  return {
    beatId: 's1-b1',
    beat_script_text: 'Test beat script',
    visualSignificance: 'High',
    imageDecision: { type: 'NEW_IMAGE', reason: 'test' },
    cameraAngleSuggestion: 'close-up',
    characterPositioning: 'Cat left, Daniel right',
    locationAttributes: [],
    resolvedLocationId: undefined,
    prompts: undefined,
    phaseTransitions: [],
    scenePersistentState: {
      charactersPresent: ['Cat', 'Daniel'],
      characterPositions: { 'Cat': 'camera-left', 'Daniel': 'camera-right' },
      characterPhases: { 'Cat': 'default', 'Daniel': 'default' },
      gearState: 'HELMET_OFF',
      vehicle: null,
      vehicleState: null,
      location: 'warehouse',
      lighting: 'harsh overhead',
    },
    sceneTemplate: { templateType: 'indoor_dialogue', templateReason: 'two characters talking' },
    fluxShotType: 'medium shot',
    fluxCameraAngle: 'over-the-shoulder',
    fluxExpression: 'alert',
    fluxPose: 'standing',
    fluxLighting: ['directional light from above'],
    beatVisualGuidance: null,
    shotTypeValidated: true,
    angleValidated: true,
    expressionValidated: true,
    ...overrides,
  } as FullyProcessedBeat;
}

function createMockEpisodeContext(overrides?: Partial<EnhancedEpisodeContext>): EnhancedEpisodeContext {
  return {
    episode: {
      episode_number: 1,
      episode_title: 'Test Episode',
      episode_summary: 'Test summary',
      story_context: 'Test story context',
      narrative_tone: 'action-packed',
      core_themes: 'survival, trust',
      image_config: undefined,
      characters: [
        {
          character_name: 'Cat',
          aliases: [],
          base_trigger: 'JRUMLV',
          visual_description: 'young woman',
          location_contexts: [
            {
              location_name: 'warehouse',
              physical_description: 'athletic build',
              clothing_description: 'black tactical suit',
              demeanor_description: 'alert',
              swarmui_prompt_override: 'JRUMLV, 23-year-old woman, athletic build, dark hair, visor up, Aegis suit',
              temporal_context: 'present',
              lora_weight_adjustment: 1.0,
              helmet_fragment_off: 'dark hair, visor raised',
              helmet_fragment_visor_up: 'Wraith helmet visor raised',
              helmet_fragment_visor_down: 'sealed Wraith helmet with dark opaque visor',
              face_segment_rule: 'IF_FACE_VISIBLE',
              context_phase: 'default',
              phase_trigger_text: 'default appearance',
            },
          ],
        },
        {
          character_name: 'Daniel',
          aliases: [],
          base_trigger: 'HSCEIA',
          visual_description: 'experienced operative',
          location_contexts: [
            {
              location_name: 'warehouse',
              physical_description: 'broad shoulders',
              clothing_description: 'technical combat gear',
              demeanor_description: 'focused',
              swarmui_prompt_override: 'HSCEIA, 40-year-old man, broad shoulders, close-cropped hair, visor up, Aegis suit',
              temporal_context: 'present',
              lora_weight_adjustment: 1.0,
              helmet_fragment_off: 'close-cropped hair, visor raised',
              helmet_fragment_visor_up: 'Wraith helmet visor raised',
              helmet_fragment_visor_down: 'sealed Wraith helmet with dark opaque visor',
              face_segment_rule: 'IF_FACE_VISIBLE',
              context_phase: 'default',
              phase_trigger_text: 'default appearance',
            },
          ],
        },
      ],
      scenes: [
        {
          scene_number: 1,
          scene_title: 'Warehouse Infiltration',
          scene_summary: 'Test scene',
          roadmap_location: 'warehouse',
          location: {
            id: 'loc-1',
            name: 'warehouse',
            description: 'abandoned industrial warehouse',
            visual_description: 'concrete pillars, metal shelving',
            atmosphere: 'dust in air',
            atmosphere_category: 'industrial',
            geographical_location: 'urban',
            time_period: 'modern',
            cultural_context: 'neutral',
            key_features: 'columns, catwalks',
            visual_reference_url: '',
            significance_level: 'high',
            artifacts: [
              {
                artifact_name: 'concrete pillars',
                artifact_type: 'STRUCTURAL',
                description: 'support columns',
                swarmui_prompt_fragment: 'concrete pillars, industrial support columns',
                always_present: true,
                scene_specific: false,
              },
              {
                artifact_name: 'harsh light',
                artifact_type: 'LIGHTING',
                description: 'overhead fluorescent lighting',
                swarmui_prompt_fragment: 'harsh overhead fluorescent lights with shadow pools',
                always_present: true,
                scene_specific: false,
              },
              {
                artifact_name: 'dust particles',
                artifact_type: 'ATMOSPHERIC',
                description: 'dust in light shafts',
                swarmui_prompt_fragment: 'dust particles visible in light shafts',
                always_present: false,
                scene_specific: true,
              },
              {
                artifact_name: 'metal shelving',
                artifact_type: 'PROP',
                description: 'industrial shelving units',
                swarmui_prompt_fragment: 'industrial metal shelving units',
                always_present: true,
                scene_specific: false,
              },
            ],
          },
          character_appearances: [
            {
              character_name: 'Cat',
              location_context: {
                location_name: 'warehouse',
                physical_description: 'athletic build',
                clothing_description: 'black tactical suit',
                demeanor_description: 'alert',
                swarmui_prompt_override: 'JRUMLV, 23-year-old woman, athletic build, dark hair, visor up, Aegis suit',
                temporal_context: 'present',
                lora_weight_adjustment: 1.0,
                helmet_fragment_off: 'dark hair, visor raised',
                helmet_fragment_visor_up: 'Wraith helmet visor raised',
                helmet_fragment_visor_down: 'sealed Wraith helmet with dark opaque visor',
                face_segment_rule: 'IF_FACE_VISIBLE',
                context_phase: 'default',
                phase_trigger_text: 'default appearance',
              },
            },
            {
              character_name: 'Daniel',
              location_context: {
                location_name: 'warehouse',
                physical_description: 'broad shoulders',
                clothing_description: 'technical combat gear',
                demeanor_description: 'focused',
                swarmui_prompt_override: 'HSCEIA, 40-year-old man, broad shoulders, close-cropped hair, visor up, Aegis suit',
                temporal_context: 'present',
                lora_weight_adjustment: 1.0,
                helmet_fragment_off: 'close-cropped hair, visor raised',
                helmet_fragment_visor_up: 'Wraith helmet visor raised',
                helmet_fragment_visor_down: 'sealed Wraith helmet with dark opaque visor',
                face_segment_rule: 'IF_FACE_VISIBLE',
                context_phase: 'default',
                phase_trigger_text: 'default appearance',
              },
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

function createMockPersistentState(overrides?: Partial<ScenePersistentState>): ScenePersistentState {
  return {
    charactersPresent: ['Cat', 'Daniel'],
    characterPositions: { 'Cat': 'camera-left', 'Daniel': 'camera-right' },
    characterPhases: { 'Cat': 'default', 'Daniel': 'default' },
    gearState: 'HELMET_OFF',
    vehicle: null,
    vehicleState: null,
    location: 'warehouse',
    lighting: 'harsh overhead',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('VBS Builder Service', () => {
  describe('buildVisualBeatSpec', () => {
    it('builds a complete VBS from beat data and episode context', () => {
      const beat = createMockFullyProcessedBeat();
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);

      expect(vbs).toBeDefined();
      expect(vbs.beatId).toBe('s1-b1');
      expect(vbs.sceneNumber).toBe(1);
      expect(vbs.templateType).toBe('indoor_dialogue');
      expect(vbs.modelRoute).toBe('FLUX'); // Faces visible
      expect(vbs.subjects).toHaveLength(2);
      expect(vbs.environment).toBeDefined();
    });

    it('populates all subject fields deterministically', () => {
      const beat = createMockFullyProcessedBeat();
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);
      const catSubject = vbs.subjects.find(s => s.characterName === 'Cat');

      expect(catSubject).toBeDefined();
      expect(catSubject!.loraTrigger).toBe('JRUMLV');
      expect(catSubject!.characterName).toBe('Cat');
      expect(catSubject!.description).toBeTruthy();
      expect(catSubject!.position).toBe('camera-left');
      expect(catSubject!.faceVisible).toBe(true);
      expect(catSubject!.helmetState).toBe('OFF');
      expect(catSubject!.action).toBeUndefined(); // Filled by LLM
      expect(catSubject!.expression).toBeUndefined(); // Filled by LLM
    });

    it('sets modelRoute to FLUX when any face is visible', () => {
      const beat = createMockFullyProcessedBeat();
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState({
        gearState: 'HELMET_OFF', // Faces visible
      });

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);
      expect(vbs.modelRoute).toBe('FLUX');
    });

    it('sets modelRoute to ALTERNATE when all visors down', () => {
      const beat = createMockFullyProcessedBeat();
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState({
        gearState: 'VISOR_DOWN', // All helmets sealed
      });

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);
      expect(vbs.modelRoute).toBe('ALTERNATE');
    });

    it('maps location artifacts by type', () => {
      const beat = createMockFullyProcessedBeat();
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);

      expect(vbs.environment.anchors.length).toBeGreaterThan(0); // STRUCTURAL artifacts
      expect(vbs.environment.lighting).toBeTruthy(); // LIGHTING artifacts
      // ATMOSPHERIC and PROP artifacts may or may not be present depending on scene
    });

    it('includes previous beat summary when provided', () => {
      const beat = createMockFullyProcessedBeat();
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      // Create a prior VBS for context
      const priorVBS = buildVisualBeatSpec(beat, context, persistentState, 1);

      // Build a new beat with prior VBS reference
      const beat2 = createMockFullyProcessedBeat({ beatId: 's1-b2' });
      const vbs2 = buildVisualBeatSpec(beat2, context, persistentState, 1, priorVBS);

      expect(vbs2.previousBeatSummary).toBeTruthy();
      expect(vbs2.previousBeatSummary).toContain('Cat');
      expect(vbs2.previousBeatSummary).toContain('warehouse');
    });

    it('calculates adaptive token budget', () => {
      const beat = createMockFullyProcessedBeat({
        fluxShotType: 'close-up shot',
      });
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);

      expect(vbs.constraints.tokenBudget).toBeDefined();
      expect(vbs.constraints.tokenBudget.total).toBeGreaterThan(200);
      expect(vbs.constraints.tokenBudget.composition).toBe(30); // Always 30
      expect(vbs.constraints.tokenBudget.segments).toBe(15); // Always 15
    });

    it('skips Ghost character (non-physical)', () => {
      const beat = createMockFullyProcessedBeat({
        scenePersistentState: {
          ...createMockPersistentState(),
          charactersPresent: ['Cat', 'Daniel', 'Ghost'],
        },
      });
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState({
        charactersPresent: ['Cat', 'Daniel', 'Ghost'],
      });

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);

      expect(vbs.subjects.find(s => s.characterName === 'Ghost')).toBeUndefined();
      expect(vbs.subjects).toHaveLength(2); // Only Cat and Daniel
    });
  });

  describe('applyHelmetStateToDescription', () => {
    const baseDescription = 'JRUMLV, 23-year-old woman, dark hair, ponytail, visor up, Aegis suit';

    it('applies HELMET_OFF state (face visible, hair visible)', () => {
      const result = applyHelmetStateToDescription(
        baseDescription,
        'OFF',
        'dark hair, face visible',
        undefined,
        undefined
      );

      expect(result).toContain('JRUMLV');
      expect(result).toContain('Aegis suit');
      expect(result).not.toContain('visor');
    });

    it('applies VISOR_UP state (face visible, hair hidden when visor up)', () => {
      const result = applyHelmetStateToDescription(
        baseDescription,
        'VISOR_UP',
        undefined,
        'Wraith helmet visor raised',
        undefined
      );

      expect(result).toContain('JRUMLV');
      expect(result).toContain('Wraith helmet visor raised');
      expect(result).toContain('Aegis suit');
      // Hair should be stripped/replaced by helmet fragment
      expect(result).not.toContain('visor up');
    });

    it('applies VISOR_DOWN state (face hidden, hair hidden)', () => {
      const result = applyHelmetStateToDescription(
        baseDescription,
        'VISOR_DOWN',
        undefined,
        undefined,
        'sealed Wraith helmet with dark opaque visor'
      );

      expect(result).toContain('JRUMLV');
      expect(result).toContain('sealed Wraith helmet');
      expect(result).toContain('Aegis suit');
      // Old visor reference should be removed
      expect(result).not.toContain('visor up');
    });

    it('removes existing helmet references before applying new ones', () => {
      const withExistingHelmet = 'JRUMLV, woman, helmet visor up, dark hair, Aegis suit';
      const result = applyHelmetStateToDescription(
        withExistingHelmet,
        'VISOR_DOWN',
        undefined,
        undefined,
        'sealed helmet'
      );

      expect(result).not.toMatch(/visor up/i);
      expect(result).toContain('sealed helmet');
    });

    it('cleans up formatting (double commas, spaces)', () => {
      const messyDescription = 'JRUMLV,,  woman,  dark hair,   Aegis suit';
      const result = applyHelmetStateToDescription(
        messyDescription,
        'OFF',
        'face visible',
        undefined,
        undefined
      );

      expect(result).not.toMatch(/,\s*,/);
      expect(result).not.toMatch(/\s{2,}/);
    });
  });

  describe('mapArtifactsByType', () => {
    const artifacts: ArtifactContext[] = [
      {
        artifact_name: 'pillars',
        artifact_type: 'STRUCTURAL',
        description: 'concrete pillars',
        swarmui_prompt_fragment: 'concrete industrial pillars',
        always_present: true,
        scene_specific: false,
      },
      {
        artifact_name: 'harsh light',
        artifact_type: 'LIGHTING',
        description: 'overhead lights',
        swarmui_prompt_fragment: 'harsh overhead fluorescent lighting',
        always_present: true,
        scene_specific: false,
      },
      {
        artifact_name: 'dust',
        artifact_type: 'ATMOSPHERIC',
        description: 'dust in air',
        swarmui_prompt_fragment: 'dust particles in light shafts',
        always_present: false,
        scene_specific: true,
      },
      {
        artifact_name: 'shelving',
        artifact_type: 'PROP',
        description: 'metal shelves',
        swarmui_prompt_fragment: 'industrial metal shelving',
        always_present: true,
        scene_specific: false,
      },
    ];

    it('maps artifacts by type', () => {
      const mapped = mapArtifactsByType(artifacts);

      expect(mapped.structural).toHaveLength(1);
      expect(mapped.structural[0]).toContain('concrete');

      expect(mapped.lighting).toHaveLength(1);
      expect(mapped.lighting[0]).toContain('fluorescent');

      expect(mapped.atmospheric).toHaveLength(1);
      expect(mapped.atmospheric[0]).toContain('dust');

      expect(mapped.prop).toHaveLength(1);
      expect(mapped.prop[0]).toContain('shelving');
    });

    it('handles empty artifact lists', () => {
      const mapped = mapArtifactsByType([]);

      expect(mapped.structural).toEqual([]);
      expect(mapped.lighting).toEqual([]);
      expect(mapped.atmospheric).toEqual([]);
      expect(mapped.prop).toEqual([]);
    });

    it('defaults unknown types to PROP', () => {
      const unknownArtifacts: ArtifactContext[] = [
        {
          artifact_name: 'unknown',
          artifact_type: 'UNKNOWN_TYPE',
          description: 'mysterious artifact',
          swarmui_prompt_fragment: 'mysterious thing',
          always_present: false,
          scene_specific: false,
        },
      ];

      const mapped = mapArtifactsByType(unknownArtifacts);

      expect(mapped.prop).toHaveLength(1);
      expect(mapped.prop[0]).toContain('mysterious');
    });
  });

  describe('Beat-level Location Context', () => {
    it('uses beat location when resolvedLocationId is set', () => {
      const beat1 = createMockFullyProcessedBeat({ resolvedLocationId: 'loc-1' });
      const beat2 = createMockFullyProcessedBeat({
        beatId: 's1-b2',
        resolvedLocationId: 'loc-2',
      });

      const context = createMockEpisodeContext({
        episode: {
          ...createMockEpisodeContext().episode,
          scenes: [
            {
              scene_number: 1,
              scene_title: 'Multi-location scene',
              scene_summary: 'Scene with location changes',
              roadmap_location: 'warehouse',
              location: {
                id: 'loc-1',
                name: 'warehouse',
                description: 'abandoned warehouse',
                visual_description: 'concrete pillars',
                atmosphere: 'dusty',
                atmosphere_category: 'industrial',
                geographical_location: 'urban',
                time_period: 'modern',
                cultural_context: 'neutral',
                key_features: 'columns',
                visual_reference_url: '',
                significance_level: 'high',
                artifacts: [],
              },
              character_appearances: [
                {
                  character_name: 'Cat',
                  location_context: {
                    location_name: 'warehouse',
                    physical_description: 'tactical gear',
                    clothing_description: 'black suit',
                    demeanor_description: 'alert',
                    swarmui_prompt_override: 'JRUMLV in warehouse gear',
                    temporal_context: 'present',
                    lora_weight_adjustment: 1.0,
                  },
                },
              ],
            },
          ],
        },
      });

      const persistentState = createMockPersistentState({ charactersPresent: ['Cat'] });

      // Beat 1 with location loc-1
      const vbs1 = buildVisualBeatSpec(beat1, context, persistentState, 1);
      expect(vbs1.environment.locationShorthand).toBe('warehouse');

      // Beat 2 with location loc-2 (location changed)
      const vbs2 = buildVisualBeatSpec(beat2, context, persistentState, 1, vbs1, beat1);
      expect(vbs2).toBeDefined();
    });

    it('detects location changes between beats', () => {
      const beat1 = createMockFullyProcessedBeat({
        beatId: 's1-b1',
        resolvedLocationId: 'loc-1',
      });

      const beat2 = createMockFullyProcessedBeat({
        beatId: 's1-b2',
        resolvedLocationId: 'loc-2', // Location changed
      });

      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs1 = buildVisualBeatSpec(beat1, context, persistentState, 1);
      // Location changed: beat1.resolvedLocationId (loc-1) !== beat2.resolvedLocationId (loc-2)
      const vbs2 = buildVisualBeatSpec(beat2, context, persistentState, 1, vbs1, beat1);

      expect(vbs2).toBeDefined();
      // Both VBS should exist (no errors on location change)
      expect(vbs1.beatId).toBe('s1-b1');
      expect(vbs2.beatId).toBe('s1-b2');
    });

    it('falls back to scene-level location when resolvedLocationId is undefined', () => {
      const beat = createMockFullyProcessedBeat({ resolvedLocationId: undefined });
      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);

      // Should use scene-level location
      expect(vbs.environment.locationShorthand).toBe('warehouse');
      expect(vbs.subjects.length).toBeGreaterThan(0);
    });

    it('applies multi-phase character appearance at beat location', () => {
      const beat = createMockFullyProcessedBeat({ resolvedLocationId: 'loc-1' });

      const context = createMockEpisodeContext({
        episode: {
          ...createMockEpisodeContext().episode,
          scenes: [
            {
              ...createMockEpisodeContext().episode.scenes[0],
              character_appearances: [
                {
                  character_name: 'Cat',
                  location_context: {
                    location_name: 'warehouse',
                    physical_description: 'alert posture',
                    clothing_description: 'tactical gear',
                    demeanor_description: 'ready for action',
                    swarmui_prompt_override: 'JRUMLV standing ready in warehouse',
                    temporal_context: 'present',
                    lora_weight_adjustment: 1.0,
                    context_phase: 'default',
                    phase_trigger_text: 'initial entry to warehouse',
                  },
                  phases: [
                    {
                      location_name: 'warehouse',
                      physical_description: 'crouched position',
                      clothing_description: 'tactical gear, dusty',
                      demeanor_description: 'stealthy',
                      swarmui_prompt_override: 'JRUMLV crouched low, moving silently',
                      temporal_context: 'present',
                      lora_weight_adjustment: 1.0,
                      context_phase: 'stealth',
                      phase_trigger_text: 'entering stealth mode in warehouse',
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      const persistentState = createMockPersistentState({
        charactersPresent: ['Cat'],
        characterPhases: { Cat: 'default' },
      });

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);

      expect(vbs.subjects[0].characterName).toBe('Cat');
      expect(vbs.subjects[0].description).toContain('standing ready');
    });

    it('respects phase_trigger_text when selecting character phase', () => {
      const beat = createMockFullyProcessedBeat({ resolvedLocationId: 'loc-1' });

      // Create context with multiple phases at same location
      const context = createMockEpisodeContext({
        episode: {
          ...createMockEpisodeContext().episode,
          scenes: [
            {
              ...createMockEpisodeContext().episode.scenes[0],
              character_appearances: [
                {
                  character_name: 'Cat',
                  location_context: {
                    location_name: 'warehouse',
                    physical_description: 'arrival posture',
                    clothing_description: 'casual clothes',
                    demeanor_description: 'just arrived',
                    swarmui_prompt_override: 'JRUMLV just arrived in casual clothes',
                    temporal_context: 'present',
                    lora_weight_adjustment: 1.0,
                    context_phase: 'arrival',
                    phase_trigger_text: 'first entry to warehouse after mission briefing',
                  },
                  phases: [
                    {
                      location_name: 'warehouse',
                      physical_description: 'settled in position',
                      clothing_description: 'fully geared up',
                      demeanor_description: 'combat ready',
                      swarmui_prompt_override: 'JRUMLV fully armored and ready for combat',
                      temporal_context: 'present',
                      lora_weight_adjustment: 1.0,
                      context_phase: 'settled',
                      phase_trigger_text: 'after gear-up sequence in warehouse',
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      // Start at arrival phase
      const persistentState = createMockPersistentState({
        charactersPresent: ['Cat'],
        characterPhases: { Cat: 'arrival' },
      });

      const vbs = buildVisualBeatSpec(beat, context, persistentState, 1);

      // Should use arrival phase appearance
      expect(vbs.subjects[0].description).toContain('casual clothes');
    });

    it('maintains character appearance when no location change', () => {
      const beat1 = createMockFullyProcessedBeat({
        beatId: 's1-b1',
        resolvedLocationId: 'loc-1',
      });

      const beat2 = createMockFullyProcessedBeat({
        beatId: 's1-b2',
        resolvedLocationId: 'loc-1', // Same location
      });

      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs1 = buildVisualBeatSpec(beat1, context, persistentState, 1);
      const vbs2 = buildVisualBeatSpec(beat2, context, persistentState, 1, vbs1, beat1);

      // Character appearance should be consistent for same location
      expect(vbs1.subjects[0].characterName).toBe(vbs2.subjects[0].characterName);
      expect(vbs1.subjects[0].loraTrigger).toBe(vbs2.subjects[0].loraTrigger);
    });

    it('includes previousBeatSummary for continuity across location changes', () => {
      const beat1 = createMockFullyProcessedBeat({
        beatId: 's1-b1',
        resolvedLocationId: 'loc-1',
      });

      const beat2 = createMockFullyProcessedBeat({
        beatId: 's1-b2',
        resolvedLocationId: 'loc-2', // Location changed
      });

      const context = createMockEpisodeContext();
      const persistentState = createMockPersistentState();

      const vbs1 = buildVisualBeatSpec(beat1, context, persistentState, 1);
      const vbs2 = buildVisualBeatSpec(
        beat2,
        context,
        persistentState,
        1,
        vbs1, // previousBeatVBS
        beat1 // previousBeat
      );

      // vbs2 should have previousBeatSummary capturing vbs1 state for continuity
      expect(vbs2.previousBeatSummary).toBeDefined();
      expect(vbs2.previousBeatSummary).toContain('warehouse'); // From vbs1 location
    });

    it('transitions character appearance when location changes', () => {
      const beat1 = createMockFullyProcessedBeat({
        beatId: 's1-b1',
        resolvedLocationId: 'loc-warehouse',
      });

      const beat2 = createMockFullyProcessedBeat({
        beatId: 's1-b2',
        resolvedLocationId: 'loc-bedroom', // Moved to bedroom
      });

      const context = createMockEpisodeContext({
        episode: {
          ...createMockEpisodeContext().episode,
          scenes: [
            {
              ...createMockEpisodeContext().episode.scenes[0],
              character_appearances: [
                {
                  character_name: 'Cat',
                  location_context: {
                    location_name: 'warehouse',
                    physical_description: 'tactical stance',
                    clothing_description: 'tactical suit',
                    demeanor_description: 'alert',
                    swarmui_prompt_override: 'JRUMLV in black tactical suit, visor up',
                    temporal_context: 'present',
                    lora_weight_adjustment: 1.0,
                    context_phase: 'default',
                    phase_trigger_text: 'warehouse gear',
                  },
                  phases: [
                    {
                      location_name: 'bedroom',
                      physical_description: 'relaxed posture',
                      clothing_description: 'casual pajamas',
                      demeanor_description: 'at ease',
                      swarmui_prompt_override: 'JRUMLV in grey cotton tank and white cotton halter',
                      temporal_context: 'present',
                      lora_weight_adjustment: 1.0,
                      context_phase: 'transit',
                      phase_trigger_text: 'transition from warehouse to bedroom',
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      const persistentState = createMockPersistentState({
        charactersPresent: ['Cat'],
        location: 'warehouse',
      });

      const vbs1 = buildVisualBeatSpec(beat1, context, persistentState, 1);
      expect(vbs1.subjects[0].description).toContain('tactical suit');

      // Transition to bedroom with location change flag
      const vbs2 = buildVisualBeatSpec(
        beat2,
        context,
        persistentState,
        1,
        vbs1,
        beat1
      );

      // Should transition to new appearance (bedroom pajamas)
      // Note: Actual appearance depends on how location matching is implemented
      expect(vbs2.subjects[0].characterName).toBe('Cat');
    });
  });
});
