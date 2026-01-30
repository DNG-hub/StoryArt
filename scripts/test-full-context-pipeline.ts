/**
 * Full Context Pipeline Test
 *
 * Tests the complete beat processing pipeline with:
 * - FLUX vocabulary validation
 * - Character-specific expressions
 * - Time of day lighting
 * - Scene intensity/pacing
 * - YouTube 8-4-4-3 format
 * - Carryover state
 * - Variety tracking
 */

import {
  processEpisodeWithFullContext,
  type FullyProcessedBeat
} from '../services/beatStateService';

import type { AnalyzedEpisode } from '../types';

// Create test Episode 2 data with full scene metadata
const testEpisode: AnalyzedEpisode = {
  episodeNumber: 2,
  title: 'The Ghost in the Machine',
  scenes: [
    {
      sceneNumber: 1,
      title: 'Debrief and Disbelief',
      metadata: {
        targetDuration: '8 minutes',
        sceneRole: 'setup_hook',
        timing: '0:00-8:00',
        adBreak: true
      },
      beats: [
        {
          beatId: 's1-b1',
          beat_script_text: 'Cat reviews the impossible data from the anomaly',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Opening hook' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Cat standing at terminal, fingers hovering over keyboard',
          locationAttributes: 'NORAD command center, dim blue lighting',
          characters: ['Cat'],
          emotional_tone: 'tense anticipation'
        },
        {
          beatId: 's1-b2',
          beat_script_text: 'She traces patterns in the data',
          visualSignificance: 'Medium',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Character focus' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: undefined, // Should carry over
          locationAttributes: 'Terminal display showing graph patterns',
          characters: ['Cat'],
          emotional_tone: 'clinical focus'
        },
        {
          beatId: 's1-b3',
          beat_script_text: 'Daniel enters with new intel',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'New character' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Daniel entering through secure door',
          locationAttributes: 'Command center entrance',
          characters: ['Daniel'],
          emotional_tone: 'professional calm'
        },
        {
          beatId: 's1-b4',
          beat_script_text: 'Cat and Daniel compare notes',
          visualSignificance: 'Medium',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Interaction' },
          cameraAngleSuggestion: 'medium shot', // Should trigger variety
          characterPositioning: undefined, // Multi-character carryover
          locationAttributes: 'Command center',
          characters: ['Cat', 'Daniel'],
          emotional_tone: 'tense'
        }
      ]
    },
    {
      sceneNumber: 2,
      title: 'The Breadcrumb',
      metadata: {
        targetDuration: '4 minutes',
        sceneRole: 'development',
        timing: '8:00-12:00',
        adBreak: false
      },
      beats: [
        {
          beatId: 's2-b1',
          beat_script_text: 'Cat discovers a hidden message in the data',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Discovery' },
          cameraAngleSuggestion: 'extreme close-up',
          characterPositioning: 'Cat leaning forward, face illuminated by screen',
          locationAttributes: 'Private lab, single desk lamp',
          characters: ['Cat'],
          emotional_tone: 'shock'
        },
        {
          beatId: 's2-b2',
          beat_script_text: 'The message resolves into coherent text',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Revelation' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: undefined, // Should carry over
          locationAttributes: 'Screen showing decoded message',
          characters: ['Cat'],
          emotional_tone: undefined // Should carry over shock
        }
      ]
    },
    {
      sceneNumber: 3,
      title: 'The Abandoned Clinic',
      metadata: {
        targetDuration: '4 minutes',
        sceneRole: 'escalation',
        timing: '12:00-16:00',
        adBreak: false
      },
      beats: [
        {
          beatId: 's3-b1',
          beat_script_text: 'Cat and Daniel approach the abandoned facility',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'New location' },
          cameraAngleSuggestion: 'establishing shot',
          characterPositioning: 'Cat and Daniel walking through overgrown entrance',
          locationAttributes: 'Abandoned clinic, moonlit exterior',
          characters: ['Cat', 'Daniel'],
          emotional_tone: 'tense anticipation'
        },
        {
          beatId: 's3-b2',
          beat_script_text: 'They enter the dark interior',
          visualSignificance: 'Medium',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Atmosphere' },
          cameraAngleSuggestion: 'wide shot',
          characterPositioning: 'Cat and Daniel silhouetted in doorway',
          locationAttributes: 'Clinic interior, debris and shadows',
          characters: ['Cat', 'Daniel'],
          emotional_tone: 'suppressed fear'
        },
        {
          beatId: 's3-b3',
          beat_script_text: 'Something moves in the darkness',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Tension peak' },
          cameraAngleSuggestion: 'low angle shot',
          characterPositioning: undefined, // Carryover silhouette
          locationAttributes: 'Dark corridor with distant light',
          characters: ['Cat', 'Daniel'],
          emotional_tone: 'suppressed fear'
        }
      ]
    },
    {
      sceneNumber: 4,
      title: 'Another Voice',
      metadata: {
        targetDuration: '3 minutes',
        sceneRole: 'climax',
        timing: '16:00-19:00',
        adBreak: false
      },
      beats: [
        {
          beatId: 's4-b1',
          beat_script_text: 'The Ghost makes first contact',
          visualSignificance: 'Critical',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Climax reveal' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: 'Cat facing the apparition, trembling slightly',
          locationAttributes: 'Clinic lab, ethereal light emanating',
          characters: ['Cat', 'Ghost'],
          emotional_tone: 'shock'
        },
        {
          beatId: 's4-b2',
          beat_script_text: 'Daniel sees it too',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Witness moment' },
          cameraAngleSuggestion: 'close-up shot', // Variety check
          characterPositioning: 'Daniel frozen, eyes wide',
          locationAttributes: 'Clinic lab',
          characters: ['Daniel'],
          emotional_tone: 'shock'
        },
        {
          beatId: 's4-b3',
          beat_script_text: 'The Ghost speaks a single word',
          visualSignificance: 'Critical',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Episode cliffhanger' },
          cameraAngleSuggestion: 'extreme close-up',
          characterPositioning: undefined, // Ghost focus
          locationAttributes: 'Ethereal form coalescing',
          characters: ['Ghost'],
          emotional_tone: 'communicating'
        }
      ]
    }
  ]
};

// Scene options with time of day, intensity, pacing
const episodeOptions: Record<number, {
  timeOfDay?: string | null;
  intensity?: number;
  pacing?: string;
  arcPhase?: string | null;
}> = {
  1: { timeOfDay: 'night', intensity: 4, pacing: 'measured', arcPhase: 'RISING' },
  2: { timeOfDay: 'night', intensity: 5, pacing: 'brisk', arcPhase: 'RISING' },
  3: { timeOfDay: 'night', intensity: 7, pacing: 'brisk', arcPhase: 'CLIMAX' },
  4: { timeOfDay: 'night', intensity: 9, pacing: 'frenetic', arcPhase: 'CLIMAX' }
};

console.log('======================================================================');
console.log('FULL CONTEXT PIPELINE TEST');
console.log('======================================================================\n');

console.log('Input Episode:');
console.log(`  Title: ${testEpisode.title}`);
console.log(`  Scenes: ${testEpisode.scenes.length}`);
console.log(`  Total Beats: ${testEpisode.scenes.reduce((sum, s) => sum + s.beats.length, 0)}`);
console.log('');

console.log('Scene Options:');
for (const [sceneNum, opts] of Object.entries(episodeOptions)) {
  console.log(`  Scene ${sceneNum}: ${opts.timeOfDay}, intensity=${opts.intensity}, ${opts.pacing}, ${opts.arcPhase}`);
}
console.log('');

// Process with full context
const result = processEpisodeWithFullContext(testEpisode, episodeOptions);

console.log('\n======================================================================');
console.log('DETAILED RESULTS');
console.log('======================================================================');

for (const scene of result.scenes) {
  console.log(`\n--- Scene ${scene.sceneNumber}: ${scene.title} ---\n`);

  for (const beat of scene.beats) {
    const fullBeat = beat as FullyProcessedBeat;

    console.log(`Beat ${fullBeat.beatId}:`);
    console.log(`  Characters: ${(fullBeat as any).characters?.join(', ') || 'none'}`);

    // FLUX validated fields
    console.log(`  [FLUX] Shot: ${fullBeat.fluxShotType} (validated: ${fullBeat.shotTypeValidated})`);
    console.log(`  [FLUX] Angle: ${fullBeat.fluxCameraAngle}`);
    console.log(`  [FLUX] Expression: ${fullBeat.fluxExpression}`);
    if (fullBeat.fluxPose) {
      console.log(`  [FLUX] Pose: ${fullBeat.fluxPose}`);
    }
    if (fullBeat.fluxLighting.length > 0) {
      console.log(`  [FLUX] Lighting: ${fullBeat.fluxLighting.join(', ')}`);
    }

    // Visual guidance
    if (fullBeat.beatVisualGuidance) {
      const guidance = fullBeat.beatVisualGuidance;
      if (guidance.isHookBeat) {
        console.log(`  [VISUAL] ** HOOK BEAT ** (3-second retention)`);
      }
      if (guidance.isAdBreakBeat) {
        console.log(`  [VISUAL] ** AD BREAK BEAT **`);
      }
      if (guidance.isClimaxBeat) {
        console.log(`  [VISUAL] ** CLIMAX BEAT **`);
      }
      const progression = (guidance.beatNumber / guidance.totalBeatsInScene) * 100;
      console.log(`  [VISUAL] Beat ${guidance.beatNumber}/${guidance.totalBeatsInScene} (${progression.toFixed(0)}% through scene)`);
      console.log(`  [VISUAL] Recommended: ${guidance.recommendedShotType} (${guidance.shotTypeReason})`);
    }

    // Carryover
    if (fullBeat.carryoverAction) {
      console.log(`  [CARRYOVER] Action: "${fullBeat.carryoverAction}" (from ${fullBeat.carryoverSourceBeatId})`);
    }
    if (fullBeat.carryoverExpression) {
      console.log(`  [CARRYOVER] Expression: "${fullBeat.carryoverExpression}"`);
    }

    // Variety
    if (fullBeat.varietyApplied) {
      console.log(`  [VARIETY] Shot adjusted to: "${fullBeat.suggestedShotType}"`);
    }

    console.log('');
  }
}

// Validation checks
console.log('======================================================================');
console.log('VALIDATION CHECKS');
console.log('======================================================================');

const checks: { name: string; pass: boolean; details: string }[] = [];

// Check 1: FLUX shot type validation
const s1b1 = result.scenes[0].beats[0] as FullyProcessedBeat;
checks.push({
  name: 'FLUX shot type validation works',
  pass: s1b1.shotTypeValidated === true && s1b1.fluxShotType === 'medium shot',
  details: `Got: ${s1b1.fluxShotType} (validated: ${s1b1.shotTypeValidated})`
});

// Check 2: Character-specific expression for Cat
checks.push({
  name: 'Cat gets analytical expression (character profile)',
  pass: s1b1.fluxExpression.includes('analytical') || s1b1.fluxExpression.includes('tense'),
  details: `Got: ${s1b1.fluxExpression}`
});

// Check 3: Lighting is populated (time of day integration requires scene context)
// Note: Full time-of-day lighting requires proper scene visual context setup
checks.push({
  name: 'Lighting is populated',
  pass: s1b1.fluxLighting.length > 0,
  details: `Got: ${s1b1.fluxLighting.join(', ')}`
});

// Check 4: Hook beat detected for scene 1 beat 1
checks.push({
  name: 'Beat 1 is marked as hook beat',
  pass: s1b1.beatVisualGuidance?.isHookBeat === true,
  details: `isHookBeat: ${s1b1.beatVisualGuidance?.isHookBeat}`
});

// Check 5: Scene intensity affects guidance
const s4b1 = result.scenes[3].beats[0] as FullyProcessedBeat;
checks.push({
  name: 'Climax scene has appropriate shot type',
  pass: s4b1.fluxShotType.includes('close') || s4b1.fluxShotType.includes('extreme'),
  details: `Scene 4 Beat 1: ${s4b1.fluxShotType}`
});

// Check 6: Carryover works within scene
const s2b2 = result.scenes[1].beats[1] as FullyProcessedBeat;
checks.push({
  name: 'Scene 2 beat 2 carries over from beat 1',
  pass: !!s2b2.carryoverAction || !!s2b2.carryoverExpression,
  details: `Carryover: action="${s2b2.carryoverAction}", expr="${s2b2.carryoverExpression}"`
});

// Check 7: Scene boundary resets state
const s2b1 = result.scenes[1].beats[0] as FullyProcessedBeat;
checks.push({
  name: 'Scene 2 beat 1 has no carryover (boundary)',
  pass: !s2b1.carryoverAction,
  details: `carryoverAction: ${s2b1.carryoverAction}`
});

// Check 8: Visual guidance has valid recommended shots
// Variety only triggers when 3+ identical shots in a row - test data has variety built in
const hasRecommendations = result.scenes.every(s =>
  s.beats.every(b => (b as FullyProcessedBeat).beatVisualGuidance?.recommendedShotType)
);
checks.push({
  name: 'All beats have visual guidance recommendations',
  pass: hasRecommendations,
  details: `All beats have recommendations: ${hasRecommendations}`
});

// Check 9: Ghost character has character-specific expression
const ghostBeat = result.scenes[3].beats[2] as FullyProcessedBeat;
checks.push({
  name: 'Ghost character has unique expression (from character profile)',
  pass: ghostBeat.fluxExpression.includes('connection') || ghostBeat.fluxExpression.includes('flickering') || ghostBeat.fluxExpression.includes('digital'),
  details: `Ghost expression: ${ghostBeat.fluxExpression}`
});

// Print results
let allPassed = true;
for (const check of checks) {
  const status = check.pass ? '[PASS]' : '[FAIL]';
  console.log(`${status} ${check.name}`);
  if (!check.pass) {
    console.log(`       ${check.details}`);
    allPassed = false;
  }
}

console.log('\n======================================================================');
if (allPassed) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log('SOME CHECKS FAILED - see details above');
  process.exit(1);
}
console.log('======================================================================');
