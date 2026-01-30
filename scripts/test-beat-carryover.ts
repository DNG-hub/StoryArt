/**
 * Test Script: Beat Carryover State
 *
 * Tests the beat carryover state implementation (SKILL.md Section 4.5)
 * by simulating an episode analysis and verifying state is carried over correctly.
 *
 * Run with: npx tsx scripts/test-beat-carryover.ts
 */

import { processEpisodeWithState } from '../services/beatStateService';
import type { AnalyzedEpisode, BeatAnalysis, BeatAnalysisWithState, AnalyzedScene } from '../types';

// Helper to create a beat with specific properties
function createBeat(
  beatId: string,
  options: {
    characters?: string[];
    characterPositioning?: string;
    emotional_tone?: string;
    cameraAngleSuggestion?: string;
    beat_script_text?: string;
  }
): BeatAnalysis {
  return {
    beatId,
    beat_script_text: options.beat_script_text || 'Test beat script text',
    visualSignificance: 'Medium',
    imageDecision: { type: 'NEW_IMAGE', reason: 'Test' },
    cameraAngleSuggestion: options.cameraAngleSuggestion,
    characterPositioning: options.characterPositioning,
    // These fields are part of the extended beat analysis from Gemini
    characters: options.characters,
    emotional_tone: options.emotional_tone,
  } as BeatAnalysis;
}

// Create a test episode simulating Episode 2 Scene 1 (The Seven Dots)
function createTestEpisode(): AnalyzedEpisode {
  return {
    episodeNumber: 2,
    title: 'The Ghost in the Machine',
    scenes: [
      {
        sceneNumber: 1,
        title: 'The Seven Dots',
        metadata: {
          targetDuration: '8 minutes',
          sceneRole: 'setup_hook',
          timing: '0:00-8:00',
          adBreak: false
        },
        beats: [
          // Beat 1: Establishes Cat's pose and expression
          createBeat('s1-b1', {
            characters: ['Cat'],
            characterPositioning: 'Cat standing at terminal, fingers hovering over keyboard',
            emotional_tone: 'tense anticipation',
            cameraAngleSuggestion: 'medium shot',
            beat_script_text: 'Cat stands at the terminal, her fingers hovering over the keyboard as she studies the map Ghost has created.'
          }),

          // Beat 2: No positioning - should carry over from beat 1
          createBeat('s1-b2', {
            characters: ['Cat'],
            // NO characterPositioning - should carry over "Cat standing at terminal"
            emotional_tone: 'clinical focus',
            cameraAngleSuggestion: 'medium shot',
            beat_script_text: 'The seven red dots pulse on the display, each one a target, each one a piece of a puzzle she cannot yet see.'
          }),

          // Beat 3: Still no positioning - should still carry over
          createBeat('s1-b3', {
            characters: ['Cat'],
            // NO characterPositioning - should still carry over
            // NO emotional_tone - should carry over "clinical focus"
            cameraAngleSuggestion: 'medium shot', // Same shot type 3x - variety should trigger
            beat_script_text: 'She traces the pattern with her eyes, searching for the connection.'
          }),

          // Beat 4: Daniel enters, establishes new character state
          createBeat('s1-b4', {
            characters: ['Daniel'],
            characterPositioning: 'Daniel entering through the door, pausing at threshold',
            emotional_tone: 'professional calm',
            cameraAngleSuggestion: 'medium shot', // 4th medium shot - definitely triggers variety
            beat_script_text: 'Daniel enters the MMB, pausing at the threshold as he takes in the scene.'
          }),

          // Beat 5: Two characters, Cat should still have carryover from b1, Daniel from b4
          createBeat('s1-b5', {
            characters: ['Cat', 'Daniel'],
            // NO positioning for either - both should have carryover
            emotional_tone: 'tense',
            cameraAngleSuggestion: 'wide shot', // Different shot type, breaks monotony
            beat_script_text: 'They exchange a look across the room, communicating without words.'
          }),

          // Beat 6: Cat explicitly changes pose
          createBeat('s1-b6', {
            characters: ['Cat'],
            characterPositioning: 'Cat turning from the terminal, facing Daniel', // New pose
            emotional_tone: 'determination',
            cameraAngleSuggestion: 'medium close-up',
            beat_script_text: 'Cat turns from the terminal, her expression shifting to determination.'
          }),

          // Beat 7: Should carry over Cat's new pose from b6
          createBeat('s1-b7', {
            characters: ['Cat'],
            // NO positioning - should carry over "Cat turning from the terminal"
            emotional_tone: 'determination', // Same tone
            cameraAngleSuggestion: 'close-up shot',
            beat_script_text: '"I know where we need to go first," she says.'
          }),
        ]
      },
      {
        // Scene 2: State should reset at scene boundary
        sceneNumber: 2,
        title: 'The Red Line',
        metadata: {
          targetDuration: '4 minutes',
          sceneRole: 'development',
          timing: '8:00-12:00',
          adBreak: true
        },
        beats: [
          // Beat 1 of Scene 2: Fresh start, no carryover from Scene 1
          createBeat('s2-b1', {
            characters: ['Cat'],
            // NO positioning - should NOT carry over from s1-b7 (scene boundary reset)
            emotional_tone: 'tense',
            cameraAngleSuggestion: 'establishing shot',
            beat_script_text: 'The Suit-Up Station gleams in the low light of the facility.'
          }),
        ]
      }
    ]
  };
}

// Run the test
function runTest() {
  console.log('='.repeat(70));
  console.log('BEAT CARRYOVER STATE TEST');
  console.log('='.repeat(70));
  console.log('');

  const testEpisode = createTestEpisode();

  console.log('Input Episode:');
  console.log(`  Title: ${testEpisode.title}`);
  console.log(`  Scenes: ${testEpisode.scenes.length}`);
  console.log(`  Total Beats: ${testEpisode.scenes.reduce((sum, s) => sum + s.beats.length, 0)}`);
  console.log('');

  // Process with carryover state
  const processedEpisode = processEpisodeWithState(testEpisode);

  console.log('');
  console.log('='.repeat(70));
  console.log('DETAILED RESULTS');
  console.log('='.repeat(70));

  for (const scene of processedEpisode.scenes) {
    console.log('');
    console.log(`--- Scene ${scene.sceneNumber}: ${scene.title} ---`);

    for (const beat of scene.beats) {
      const b = beat as BeatAnalysisWithState;
      console.log('');
      console.log(`Beat ${b.beatId}:`);
      console.log(`  Characters: ${(b as any).characters?.join(', ') || 'none'}`);
      console.log(`  Original Positioning: ${b.characterPositioning || '(none)'}`);
      console.log(`  Original Tone: ${(b as any).emotional_tone || '(none)'}`);
      console.log(`  Camera Suggestion: ${b.cameraAngleSuggestion || '(none)'}`);

      if (b.carryoverAction) {
        console.log(`  [CARRYOVER] Action: "${b.carryoverAction}" (from ${b.carryoverSourceBeatId})`);
      }
      if (b.carryoverExpression) {
        console.log(`  [CARRYOVER] Expression: "${b.carryoverExpression}" (from ${b.carryoverSourceBeatId})`);
      }
      if (b.varietyApplied) {
        console.log(`  [VARIETY] Shot adjusted to: "${b.suggestedShotType}"`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('VALIDATION CHECKS');
  console.log('='.repeat(70));

  const scene1 = processedEpisode.scenes[0];
  const scene2 = processedEpisode.scenes[1];

  // Check 1: Beat s1-b2 should have carryover from s1-b1
  const b2 = scene1.beats[1] as BeatAnalysisWithState;
  const check1Pass = b2.carryoverAction?.toLowerCase().includes('cat standing at terminal');
  console.log(`[${check1Pass ? 'PASS' : 'FAIL'}] s1-b2 carries over action from s1-b1`);

  // Check 2: Beat s1-b3 should trigger variety (3rd medium shot)
  const b3 = scene1.beats[2] as BeatAnalysisWithState;
  const check2Pass = b3.varietyApplied === true;
  console.log(`[${check2Pass ? 'PASS' : 'FAIL'}] s1-b3 triggers variety adjustment`);

  // Check 3: Beat s1-b5 (two characters) should have carryover
  const b5 = scene1.beats[4] as BeatAnalysisWithState;
  const check3Pass = b5.carryoverAction !== undefined;
  console.log(`[${check3Pass ? 'PASS' : 'FAIL'}] s1-b5 has carryover for multi-character beat`);

  // Check 4: Beat s1-b7 should carry over from s1-b6 (not earlier beats)
  const b7 = scene1.beats[6] as BeatAnalysisWithState;
  const check4Pass = b7.carryoverAction?.includes('turning from the terminal') && b7.carryoverSourceBeatId === 's1-b6';
  console.log(`[${check4Pass ? 'PASS' : 'FAIL'}] s1-b7 carries over from s1-b6 (updated pose)`);

  // Check 5: Scene 2 beat 1 should NOT have carryover (scene boundary reset)
  const s2b1 = scene2.beats[0] as BeatAnalysisWithState;
  const check5Pass = s2b1.carryoverAction === undefined;
  console.log(`[${check5Pass ? 'PASS' : 'FAIL'}] s2-b1 has no carryover (scene boundary reset)`);

  const allPassed = check1Pass && check2Pass && check3Pass && check4Pass && check5Pass;

  console.log('');
  console.log('='.repeat(70));
  console.log(allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED');
  console.log('='.repeat(70));

  return allPassed;
}

// Run the test
const success = runTest();
process.exit(success ? 0 : 1);
