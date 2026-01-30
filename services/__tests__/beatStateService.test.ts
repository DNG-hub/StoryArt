/**
 * Tests for Beat State Service
 *
 * Tests carryover state logic (SKILL.md Section 4.5) and
 * variety tracking (SKILL.md Section 4.7)
 */

import {
  createInitialSceneState,
  extractActionFromBeat,
  extractExpressionFromBeat,
  extractShotTypeFromBeat,
  extractAngleFromBeat,
  checkShotTypeMonotony,
  checkAngleMonotony,
  suggestAlternativeShotType,
  updateVarietyState,
  processBeaWithState,
  processSceneWithState,
  processEpisodeWithState,
  hasCarryoverState
} from '../beatStateService';

import type { BeatAnalysis, AnalyzedScene, AnalyzedEpisode, SceneVarietyState } from '../../types';

// Helper to create a minimal beat for testing
function createTestBeat(overrides: Partial<BeatAnalysis> & { characters?: string[], emotional_tone?: string }): BeatAnalysis {
  return {
    beatId: overrides.beatId || 's1-b1',
    beat_script_text: overrides.beat_script_text || 'Test beat script',
    visualSignificance: overrides.visualSignificance || 'Medium',
    imageDecision: overrides.imageDecision || { type: 'NEW_IMAGE', reason: 'Test' },
    cameraAngleSuggestion: overrides.cameraAngleSuggestion,
    characterPositioning: overrides.characterPositioning,
    locationAttributes: overrides.locationAttributes,
    ...overrides
  } as BeatAnalysis;
}

// Helper to create a minimal scene
function createTestScene(sceneNumber: number, beats: BeatAnalysis[]): AnalyzedScene {
  return {
    sceneNumber,
    title: `Test Scene ${sceneNumber}`,
    metadata: {
      targetDuration: '8 minutes',
      sceneRole: 'setup_hook',
      timing: '0:00-8:00',
      adBreak: false
    },
    beats
  };
}

describe('Beat State Service', () => {
  describe('createInitialSceneState', () => {
    it('creates an empty state for a scene', () => {
      const state = createInitialSceneState(1);

      expect(state.sceneNumber).toBe(1);
      expect(state.characterStates).toEqual({});
      expect(state.varietyState.recentShotTypes).toEqual([]);
      expect(state.varietyState.recentAngles).toEqual([]);
      expect(state.varietyState.beatCount).toBe(0);
    });
  });

  describe('extractActionFromBeat', () => {
    it('extracts action from characterPositioning', () => {
      const beat = createTestBeat({
        characterPositioning: 'Cat standing, facing the monitor bank'
      });

      const action = extractActionFromBeat(beat);
      expect(action).toBe('cat standing, facing the monitor bank');
    });

    it('returns null when no characterPositioning', () => {
      const beat = createTestBeat({});

      const action = extractActionFromBeat(beat);
      expect(action).toBeNull();
    });

    it('returns null for empty characterPositioning', () => {
      const beat = createTestBeat({
        characterPositioning: '   '
      });

      const action = extractActionFromBeat(beat);
      expect(action).toBeNull();
    });
  });

  describe('extractExpressionFromBeat', () => {
    it('maps tense anticipation to FLUX expression', () => {
      const beat = createTestBeat({
        emotional_tone: 'tense anticipation'
      });

      const expression = extractExpressionFromBeat(beat);
      expect(expression).toBe('alert expression, eyes scanning');
    });

    it('maps determination to FLUX expression', () => {
      const beat = createTestBeat({
        emotional_tone: 'determination'
      });

      const expression = extractExpressionFromBeat(beat);
      expect(expression).toBe('determined expression, jaw set');
    });

    it('maps unrecognized tones to neutral expression (FLUX compliance)', () => {
      const beat = createTestBeat({
        emotional_tone: 'confused excitement'
      });

      const expression = extractExpressionFromBeat(beat);
      // FLUX vocabulary validation maps unrecognized tones to 'neutral expression'
      expect(expression).toBe('neutral expression');
    });

    it('returns null when no emotional_tone', () => {
      const beat = createTestBeat({});

      const expression = extractExpressionFromBeat(beat);
      expect(expression).toBeNull();
    });
  });

  describe('extractShotTypeFromBeat', () => {
    it('extracts medium shot from suggestion', () => {
      const beat = createTestBeat({
        cameraAngleSuggestion: 'Medium shot on Cat'
      });

      const shotType = extractShotTypeFromBeat(beat);
      expect(shotType).toBe('medium shot');
    });

    it('extracts close-up shot from suggestion', () => {
      const beat = createTestBeat({
        cameraAngleSuggestion: 'Close-up of Daniel'
      });

      const shotType = extractShotTypeFromBeat(beat);
      expect(shotType).toBe('close-up shot');
    });

    it('extracts wide/establishing from suggestion', () => {
      const beat = createTestBeat({
        cameraAngleSuggestion: 'Wide establishing shot of the facility'
      });

      const shotType = extractShotTypeFromBeat(beat);
      expect(shotType).toBe('establishing shot');
    });

    it('returns default medium shot for unrecognized suggestions', () => {
      const beat = createTestBeat({
        cameraAngleSuggestion: 'Some weird angle'
      });

      const shotType = extractShotTypeFromBeat(beat);
      // FLUX vocabulary validation now returns default 'medium shot' instead of null
      expect(shotType).toBe('medium shot');
    });
  });

  describe('extractAngleFromBeat', () => {
    it('extracts low angle from suggestion', () => {
      const beat = createTestBeat({
        cameraAngleSuggestion: 'Low angle shot of the tower'
      });

      const angle = extractAngleFromBeat(beat);
      expect(angle).toBe('low angle shot');
    });

    it('returns eye-level as default for unrecognized angles', () => {
      const beat = createTestBeat({
        cameraAngleSuggestion: 'Medium shot on Cat'
      });

      const angle = extractAngleFromBeat(beat);
      expect(angle).toBe('eye-level shot');
    });
  });

  describe('checkShotTypeMonotony', () => {
    it('returns false when not enough history', () => {
      const state: SceneVarietyState = {
        recentShotTypes: ['medium shot'],
        recentAngles: [],
        beatCount: 1
      };

      expect(checkShotTypeMonotony(state, 'medium shot')).toBe(false);
    });

    it('returns true when same shot used 3 times in a row', () => {
      const state: SceneVarietyState = {
        recentShotTypes: ['medium shot', 'medium shot'],
        recentAngles: [],
        beatCount: 2
      };

      expect(checkShotTypeMonotony(state, 'medium shot')).toBe(true);
    });

    it('returns false when shot types are varied', () => {
      const state: SceneVarietyState = {
        recentShotTypes: ['medium shot', 'close-up shot'],
        recentAngles: [],
        beatCount: 2
      };

      expect(checkShotTypeMonotony(state, 'medium shot')).toBe(false);
    });
  });

  describe('checkAngleMonotony', () => {
    it('returns false when not enough history', () => {
      const state: SceneVarietyState = {
        recentShotTypes: [],
        recentAngles: ['eye-level shot', 'eye-level shot'],
        beatCount: 2
      };

      expect(checkAngleMonotony(state, 'eye-level shot')).toBe(false);
    });

    it('returns true when same angle used 4 times in a row', () => {
      const state: SceneVarietyState = {
        recentShotTypes: [],
        recentAngles: ['eye-level shot', 'eye-level shot', 'eye-level shot'],
        beatCount: 3
      };

      expect(checkAngleMonotony(state, 'eye-level shot')).toBe(true);
    });
  });

  describe('suggestAlternativeShotType', () => {
    it('suggests alternative for medium shot', () => {
      const alt = suggestAlternativeShotType('medium shot', ['medium shot', 'medium shot']);

      expect(['medium close-up', 'cowboy shot', 'upper-body portrait']).toContain(alt);
    });

    it('avoids recently used shots in suggestion', () => {
      const alt = suggestAlternativeShotType('medium shot', ['medium shot', 'medium close-up']);

      expect(alt).not.toBe('medium close-up');
    });
  });

  describe('updateVarietyState', () => {
    it('updates recent shot types (max 3)', () => {
      const state: SceneVarietyState = {
        recentShotTypes: ['a', 'b', 'c'],
        recentAngles: [],
        beatCount: 3
      };

      const newState = updateVarietyState(state, 'd', null);

      expect(newState.recentShotTypes).toEqual(['b', 'c', 'd']);
      expect(newState.beatCount).toBe(4);
    });

    it('updates recent angles (max 3)', () => {
      const state: SceneVarietyState = {
        recentShotTypes: [],
        recentAngles: ['x', 'y', 'z'],
        beatCount: 3
      };

      const newState = updateVarietyState(state, null, 'w');

      expect(newState.recentAngles).toEqual(['y', 'z', 'w']);
    });
  });

  describe('processBeaWithState', () => {
    it('applies carryover when beat has no positioning', () => {
      const sceneState = createInitialSceneState(1);

      // First beat establishes state
      const beat1 = createTestBeat({
        beatId: 's1-b1',
        characters: ['Cat'],
        characterPositioning: 'standing tall, examining monitor'
      });
      processBeaWithState(beat1, sceneState);

      // Second beat has no positioning - should carry over
      const beat2 = createTestBeat({
        beatId: 's1-b2',
        characters: ['Cat'],
        characterPositioning: undefined
      });
      const result = processBeaWithState(beat2, sceneState);

      // Action is mapped to FLUX pose vocabulary ('standing tall' from 'standing tall, examining monitor')
      expect(result.carryoverAction).toBe('standing tall');
      expect(result.carryoverSourceBeatId).toBe('s1-b1');
    });

    it('does not carry over action when beat has explicit positioning', () => {
      const sceneState = createInitialSceneState(1);

      // First beat establishes state
      const beat1 = createTestBeat({
        beatId: 's1-b1',
        characters: ['Cat'],
        characterPositioning: 'standing tall'
      });
      processBeaWithState(beat1, sceneState);

      // Second beat has explicit positioning - should NOT carry over ACTION
      const beat2 = createTestBeat({
        beatId: 's1-b2',
        characters: ['Cat'],
        characterPositioning: 'kneeling to examine'
      });
      const result = processBeaWithState(beat2, sceneState);

      // Action carryover should be undefined (beat has explicit positioning)
      expect(result.carryoverAction).toBeUndefined();
      // Note: carryoverSourceBeatId may still be set due to expression carryover
      // from character's default expression when no emotional_tone is specified
    });

    it('applies variety adjustment when shot type repeats', () => {
      const sceneState = createInitialSceneState(1);

      // Build up history
      const beat1 = createTestBeat({
        beatId: 's1-b1',
        characters: ['Cat'],
        cameraAngleSuggestion: 'medium shot'
      });
      processBeaWithState(beat1, sceneState);

      const beat2 = createTestBeat({
        beatId: 's1-b2',
        characters: ['Cat'],
        cameraAngleSuggestion: 'medium shot'
      });
      processBeaWithState(beat2, sceneState);

      // Third medium shot should trigger variety
      const beat3 = createTestBeat({
        beatId: 's1-b3',
        characters: ['Cat'],
        cameraAngleSuggestion: 'medium shot'
      });
      const result = processBeaWithState(beat3, sceneState);

      expect(result.varietyApplied).toBe(true);
      expect(result.suggestedShotType).toBeDefined();
      expect(result.suggestedShotType).not.toBe('medium shot');
    });
  });

  describe('processSceneWithState', () => {
    it('processes all beats in a scene', () => {
      const scene = createTestScene(1, [
        createTestBeat({ beatId: 's1-b1', characters: ['Cat'], characterPositioning: 'standing' }),
        createTestBeat({ beatId: 's1-b2', characters: ['Cat'] }),
        createTestBeat({ beatId: 's1-b3', characters: ['Cat'] })
      ]);

      const result = processSceneWithState(scene);

      expect(result.beats.length).toBe(3);
      // Beat 2 and 3 should have carryover from beat 1
      expect(hasCarryoverState(result.beats[1] as any)).toBe(true);
      expect(hasCarryoverState(result.beats[2] as any)).toBe(true);
    });
  });

  describe('processEpisodeWithState', () => {
    it('resets state at scene boundaries', () => {
      const episode: AnalyzedEpisode = {
        episodeNumber: 1,
        title: 'Test Episode',
        scenes: [
          createTestScene(1, [
            createTestBeat({ beatId: 's1-b1', characters: ['Cat'], characterPositioning: 'standing in scene 1' })
          ]),
          createTestScene(2, [
            createTestBeat({ beatId: 's2-b1', characters: ['Cat'] }) // No positioning - should NOT carry from scene 1
          ])
        ]
      };

      const result = processEpisodeWithState(episode);

      // Scene 2 beat 1 should NOT have carryover from scene 1
      const scene2Beat1 = result.scenes[1].beats[0] as any;
      expect(scene2Beat1.carryoverAction).toBeUndefined();
    });

    it('tracks separate state per character', () => {
      const scene = createTestScene(1, [
        createTestBeat({ beatId: 's1-b1', characters: ['Cat'], characterPositioning: 'Cat standing' }),
        createTestBeat({ beatId: 's1-b2', characters: ['Daniel'], characterPositioning: 'Daniel kneeling' }),
        createTestBeat({ beatId: 's1-b3', characters: ['Cat', 'Daniel'] }) // Both should get carryover
      ]);

      const episode: AnalyzedEpisode = {
        episodeNumber: 1,
        title: 'Test',
        scenes: [scene]
      };

      const result = processEpisodeWithState(episode);
      const beat3 = result.scenes[0].beats[2] as any;

      // Beat 3 should have carryover (the exact value depends on which character is processed last)
      expect(hasCarryoverState(beat3)).toBe(true);
    });
  });
});
