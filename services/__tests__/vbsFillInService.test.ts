/**
 * Tests for VBS Fill-In Service (Phase B)
 *
 * Tests LLM slot-fill logic: validates JSON schema, tests fallback fill-in
 * generation, and verifies VBS merging logic.
 *
 * v0.21 Compiler-Style Prompt Generation
 */

import { describe, it, expect } from 'vitest';
import {
  buildFallbackFillIn,
  mergeVBSFillIn,
} from '../vbsFillInService';

import type {
  VisualBeatSpec,
  VBSSubject,
  VBSFillIn,
  BeatAnalysis,
} from '../../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockVBS(overrides?: Partial<VisualBeatSpec>): VisualBeatSpec {
  return {
    beatId: 's1-b1',
    sceneNumber: 1,
    templateType: 'combat',
    modelRoute: 'FLUX',
    shot: {
      shotType: 'medium shot',
      cameraAngle: 'over-the-shoulder',
      composition: undefined, // To be filled by LLM
    },
    subjects: [
      {
        characterName: 'Cat',
        loraTrigger: 'JRUMLV',
        description: 'JRUMLV, 23-year-old woman, athletic build, dark hair, visor up, Aegis suit',
        action: undefined, // To be filled by LLM
        expression: undefined, // To be filled by LLM
        position: 'camera-left',
        faceVisible: true,
        helmetState: 'VISOR_UP',
        segments: {
          face: '<segment:yolo-face>',
          clothing: '<segment:clothes-aegis>',
        },
      },
      {
        characterName: 'Daniel',
        loraTrigger: 'HSCEIA',
        description: 'HSCEIA, 40-year-old man, broad shoulders, close-cropped hair, visor up, Aegis suit',
        action: undefined,
        expression: undefined,
        position: 'camera-right',
        faceVisible: true,
        helmetState: 'VISOR_UP',
        segments: {
          face: '<segment:yolo-face>',
          clothing: '<segment:clothes-aegis>',
        },
      },
    ],
    environment: {
      locationShorthand: 'warehouse',
      anchors: ['concrete pillars', 'metal shelving'],
      lighting: 'harsh overhead fluorescents with shadow pools',
      atmosphere: 'dust motes in light shafts',
      props: ['equipment crates'],
      fx: 'desaturated color grade',
    },
    vehicle: null,
    constraints: {
      tokenBudget: {
        total: 260,
        composition: 30,
        character1: 78,
        character2: 73,
        environment: 62,
        atmosphere: 17,
        segments: 15,
      },
      segmentPolicy: 'IF_FACE_VISIBLE',
      compactionDropOrder: [
        'vehicle.spatialNote',
        'environment.props',
        'environment.fx',
        'environment.atmosphere',
        'subjects[1].description',
      ],
    },
    previousBeatSummary: 'Scene begins: warehouse entrance, morning light',
    persistentStateSnapshot: {
      charactersPresent: ['Cat', 'Daniel'],
      characterPositions: { Cat: 'camera-left', Daniel: 'camera-right' },
      characterPhases: { Cat: 'default', Daniel: 'default' },
      gearState: 'VISOR_UP',
      vehicle: null,
      vehicleState: null,
      location: 'warehouse',
      lighting: 'harsh overhead',
    },
    ...overrides,
  };
}

function createMockBeatAnalysis(overrides?: Partial<BeatAnalysis>): BeatAnalysis {
  return {
    beatId: 's1-b1',
    beat_script_text: 'Cat vaults over crate, spinning to face Daniel.',
    visualSignificance: 'High',
    imageDecision: { type: 'NEW_IMAGE', reason: 'key action' },
    ...overrides,
  } as BeatAnalysis;
}

// ============================================================================
// Tests
// ============================================================================

describe('VBS Fill-In Service', () => {
  describe('buildFallbackFillIn', () => {
    it('generates fallback fill-in for all subjects', () => {
      const vbs = createMockVBS();
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.beatId).toBe('s1-b1');
      expect(fillIn.subjectFillIns).toHaveLength(2);
      expect(fillIn.subjectFillIns[0].characterName).toBe('Cat');
      expect(fillIn.subjectFillIns[1].characterName).toBe('Daniel');
    });

    it('generates action for each subject', () => {
      const vbs = createMockVBS();
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      for (const subjectFillIn of fillIn.subjectFillIns) {
        expect(subjectFillIn.action).toBeTruthy();
        expect(typeof subjectFillIn.action).toBe('string');
        expect(subjectFillIn.action.length).toBeGreaterThan(0);
      }
    });

    it('generates expression for visible faces', () => {
      const vbs = createMockVBS();
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      // Both subjects have visible faces
      for (const subjectFillIn of fillIn.subjectFillIns) {
        expect(subjectFillIn.expression).toBeTruthy();
        expect(typeof subjectFillIn.expression).toBe('string');
      }
    });

    it('sets expression to null for sealed helmet', () => {
      const vbs = createMockVBS({
        subjects: [
          {
            ...createMockVBS().subjects[0],
            helmetState: 'VISOR_DOWN',
            faceVisible: false,
            expression: null,
          },
        ],
      });
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.subjectFillIns[0].expression).toBeNull();
    });

    it('assigns camera positioning for dual-character beats', () => {
      const vbs = createMockVBS(); // Has 2 subjects
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.subjectFillIns[0].dualPositioning).toBe('camera-left');
      expect(fillIn.subjectFillIns[1].dualPositioning).toBe('camera-right');
    });

    it('omits camera positioning for single-character beats', () => {
      const vbs = createMockVBS({
        subjects: [createMockVBS().subjects[0]], // Only Cat
      });
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.subjectFillIns[0].dualPositioning).toBeUndefined();
    });

    it('derives composition from shot type when no visual_anchor', () => {
      const vbs = createMockVBS();
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.shotComposition).toBeTruthy();
      expect(fillIn.shotComposition).toContain('medium shot');
    });

    it('includes visual_anchor in composition when available', () => {
      const vbs = createMockVBS();
      const beat = createMockBeatAnalysis({
        beat_script_text: 'visual anchor: explosive movement, close on Cat\'s face',
      });

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.shotComposition).toBeTruthy();
    });

    it('sets vehicle spatial note when vehicle is present', () => {
      const vbs = createMockVBS({
        vehicle: {
          description: 'matte-black motorcycle',
          spatialNote: undefined,
        },
      });
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.vehicleSpatialNote).toBe('in motion');
    });

    it('omits vehicle spatial note when no vehicle', () => {
      const vbs = createMockVBS({
        vehicle: null,
      });
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.vehicleSpatialNote).toBeUndefined();
    });

    it('uses close-up action for close-up shots', () => {
      const vbs = createMockVBS({
        shot: { ...createMockVBS().shot, shotType: 'close-up shot' },
      });
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.subjectFillIns[0].action).toContain('focus');
    });

    it('uses wide action for wide shots', () => {
      const vbs = createMockVBS({
        shot: { ...createMockVBS().shot, shotType: 'wide shot' },
      });
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      expect(fillIn.subjectFillIns[0].action).toContain('body');
    });

    it('adapts expression to emotional tone', () => {
      const vbs = createMockVBS();
      const beat = createMockBeatAnalysis({
        beat_script_text: 'Cat alert, scanning for threats',
      });

      const fillIn = buildFallbackFillIn(vbs, beat);

      // Should generate alert expression if emotional_tone is detected
      expect(fillIn.subjectFillIns[0].expression).toBeTruthy();
    });

    it('returns valid VBSFillIn schema', () => {
      const vbs = createMockVBS();
      const beat = createMockBeatAnalysis();

      const fillIn = buildFallbackFillIn(vbs, beat);

      // Verify required fields
      expect(fillIn.beatId).toBe('s1-b1');
      expect(typeof fillIn.shotComposition).toBe('string');
      expect(Array.isArray(fillIn.subjectFillIns)).toBe(true);

      // Verify each subject fill-in
      for (const subjectFillIn of fillIn.subjectFillIns) {
        expect(typeof subjectFillIn.characterName).toBe('string');
        expect(typeof subjectFillIn.action).toBe('string');
        expect(subjectFillIn.expression === null || typeof subjectFillIn.expression === 'string').toBe(true);
      }
    });
  });

  describe('mergeVBSFillIn', () => {
    it('merges fill-in data into VBS', () => {
      const vbs = createMockVBS();
      const fillIn: VBSFillIn = {
        beatId: 's1-b1',
        shotComposition: 'close on Cat\'s face with motion blur',
        subjectFillIns: [
          {
            characterName: 'Cat',
            action: 'vaulting over crate, body rotating',
            expression: 'brow furrowed, intense eyes',
            dualPositioning: 'camera-left',
          },
          {
            characterName: 'Daniel',
            action: 'standing alert',
            expression: 'eyes wide in reaction',
            dualPositioning: 'camera-right',
          },
        ],
        vehicleSpatialNote: undefined,
        atmosphereEnrichment: 'dust particles swirling',
      };

      const merged = mergeVBSFillIn(vbs, fillIn);

      expect(merged.shot.composition).toBe('close on Cat\'s face with motion blur');

      const catSubject = merged.subjects.find(s => s.characterName === 'Cat');
      expect(catSubject?.action).toBe('vaulting over crate, body rotating');
      expect(catSubject?.expression).toBe('brow furrowed, intense eyes');
      expect(catSubject?.position).toBe('camera-left');

      const danielSubject = merged.subjects.find(s => s.characterName === 'Daniel');
      expect(danielSubject?.action).toBe('standing alert');
      expect(danielSubject?.expression).toBe('eyes wide in reaction');
    });

    it('updates vehicle spatial note when vehicle present', () => {
      const vbs = createMockVBS({
        vehicle: {
          description: 'matte-black motorcycle',
          spatialNote: undefined,
        },
      });
      const fillIn: VBSFillIn = {
        beatId: 's1-b1',
        shotComposition: 'medium shot',
        subjectFillIns: [
          {
            characterName: 'Cat',
            action: 'driving',
            expression: 'focused',
          },
        ],
        vehicleSpatialNote: 'motorcycle accelerating forward',
        atmosphereEnrichment: undefined,
      };

      const merged = mergeVBSFillIn(vbs, fillIn);

      expect(merged.vehicle?.spatialNote).toBe('motorcycle accelerating forward');
    });

    it('updates atmosphere enrichment', () => {
      const vbs = createMockVBS();
      const fillIn: VBSFillIn = {
        beatId: 's1-b1',
        shotComposition: 'medium shot',
        subjectFillIns: [
          {
            characterName: 'Cat',
            action: 'crouching',
            expression: 'alert',
          },
        ],
        atmosphereEnrichment: 'dust swirling from footsteps',
      };

      const merged = mergeVBSFillIn(vbs, fillIn);

      expect(merged.environment.atmosphere).toBe('dust swirling from footsteps');
    });

    it('handles missing subject fill-ins gracefully', () => {
      const vbs = createMockVBS();
      const fillIn: VBSFillIn = {
        beatId: 's1-b1',
        shotComposition: 'medium shot',
        subjectFillIns: [
          {
            characterName: 'Cat',
            action: 'standing',
            expression: 'neutral',
          },
          // Daniel is missing from fill-in
        ],
      };

      const merged = mergeVBSFillIn(vbs, fillIn);

      const catSubject = merged.subjects.find(s => s.characterName === 'Cat');
      expect(catSubject?.action).toBe('standing');

      const danielSubject = merged.subjects.find(s => s.characterName === 'Daniel');
      expect(danielSubject?.action).toBeUndefined(); // Unchanged
    });

    it('preserves all non-fillable VBS fields', () => {
      const vbs = createMockVBS();
      const fillIn: VBSFillIn = {
        beatId: 's1-b1',
        shotComposition: 'close-up',
        subjectFillIns: [
          {
            characterName: 'Cat',
            action: 'action text',
            expression: 'expression text',
          },
        ],
      };

      const merged = mergeVBSFillIn(vbs, fillIn);

      // Check preserved fields
      expect(merged.beatId).toBe(vbs.beatId);
      expect(merged.sceneNumber).toBe(vbs.sceneNumber);
      expect(merged.templateType).toBe(vbs.templateType);
      expect(merged.modelRoute).toBe(vbs.modelRoute);
      expect(merged.shot.shotType).toBe(vbs.shot.shotType);
      expect(merged.shot.cameraAngle).toBe(vbs.shot.cameraAngle);
      expect(merged.environment.locationShorthand).toBe(vbs.environment.locationShorthand);
      expect(merged.constraints).toEqual(vbs.constraints);
      expect(merged.persistentStateSnapshot).toEqual(vbs.persistentStateSnapshot);
    });

    it('returns completed VBS with all slots filled', () => {
      const vbs = createMockVBS();
      const fillIn: VBSFillIn = {
        beatId: 's1-b1',
        shotComposition: 'close on faces',
        subjectFillIns: [
          {
            characterName: 'Cat',
            action: 'vaulting',
            expression: 'intense',
          },
          {
            characterName: 'Daniel',
            action: 'reacting',
            expression: 'surprised',
          },
        ],
      };

      const merged = mergeVBSFillIn(vbs, fillIn);

      // Verify all slots are now filled
      expect(merged.shot.composition).toBeTruthy();
      for (const subject of merged.subjects) {
        expect(subject.action).toBeTruthy();
        if (subject.faceVisible) {
          expect(subject.expression).toBeTruthy();
        }
      }
    });
  });
});
