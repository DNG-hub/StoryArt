/**
 * Full Time Integration Test
 *
 * Demonstrates the complete time progression chain across episodes:
 * - E1 starts at midday, ends at dusk
 * - E2 continues from dusk, progresses through deep night
 * - E3 has time jumps (next morning, three days later)
 *
 * Shows proper lighting applied based on detected time of day.
 */

import {
  processEpisodeWithFullContext,
  type ProcessedEpisodeResult,
  type FullyProcessedBeat
} from '../services/beatStateService';
import type { AnalyzedEpisode } from '../types';
import type { TimeOfDay } from '../services/fluxVocabularyService';

// ============================================================================
// TEST DATA - Three episodes showing time continuity and jumps
// ============================================================================

const episode1: AnalyzedEpisode = {
  episodeNumber: 1,
  title: 'The Signal',
  scenes: [
    {
      sceneNumber: 1,
      title: 'Ground Zero',
      metadata: { targetDuration: '8 min', sceneRole: 'setup_hook', timing: '0:00-8:00', adBreak: true },
      beats: [
        {
          beatId: 'e1-s1-b1',
          beat_script_text: 'EXT. BOMBED NHIA FACILITY - DAY. Harsh midday sun streams through collapsed walls. Cat picks through debris.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Opening' },
          cameraAngleSuggestion: 'establishing shot',
          characterPositioning: 'Cat examining debris in full tactical gear',
          characters: ['Cat'],
          emotional_tone: 'clinical focus'
        },
      ]
    },
    {
      sceneNumber: 2,
      title: 'The Shepherd',
      metadata: { targetDuration: '4 min', sceneRole: 'development', timing: '8:00-12:00', adBreak: false },
      beats: [
        {
          beatId: 'e1-s2-b1',
          beat_script_text: 'EXT. FACILITY PERIMETER - LATE AFTERNOON. Daniel observes Cat from a concealed position as golden light stretches across the ruins.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'New character' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Daniel crouching behind cover, watching',
          characters: ['Daniel'],
          emotional_tone: 'alert'
        },
      ]
    },
    {
      sceneNumber: 3,
      title: 'Impossible Data',
      metadata: { targetDuration: '4 min', sceneRole: 'escalation', timing: '12:00-16:00', adBreak: false },
      beats: [
        {
          beatId: 'e1-s3-b1',
          beat_script_text: 'INT. MOBILE LAB - EVENING. As dusk settles outside, Cat analyzes the recovered data drive.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Discovery' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: 'Cat seated at terminal, face lit by screen',
          characters: ['Cat'],
          emotional_tone: 'intense focus'
        },
      ]
    },
    {
      sceneNumber: 4,
      title: 'A Message',
      metadata: { targetDuration: '3 min', sceneRole: 'climax', timing: '16:00-19:00', adBreak: false },
      beats: [
        {
          beatId: 'e1-s4-b1',
          beat_script_text: 'INT. MOBILE LAB - CONTINUOUS. As twilight deepens, text appears on screen: "I AM EVERYONE WHO DIED."',
          visualSignificance: 'Critical',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Cliffhanger' },
          cameraAngleSuggestion: 'extreme close-up',
          characterPositioning: 'Cat frozen, eyes wide at screen',
          characters: ['Cat'],
          emotional_tone: 'shock'
        },
      ]
    },
  ]
};

const episode2: AnalyzedEpisode = {
  episodeNumber: 2,
  title: 'The Ghost in the Machine',
  scenes: [
    {
      sceneNumber: 1,
      title: 'Debrief and Disbelief',
      metadata: { targetDuration: '8 min', sceneRole: 'setup_hook', timing: '0:00-8:00', adBreak: true },
      beats: [
        {
          beatId: 'e2-s1-b1',
          beat_script_text: 'INT. NORAD COMMAND CENTER - NIGHT. The episode opens moments after the last. Cat frantically traces Ghost\'s signal.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Opening' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Cat at terminal, typing rapidly',
          characters: ['Cat'],
          emotional_tone: 'tense anticipation'
        },
      ]
    },
    {
      sceneNumber: 2,
      title: 'The Breadcrumb',
      metadata: { targetDuration: '4 min', sceneRole: 'development', timing: '8:00-12:00', adBreak: false },
      beats: [
        {
          beatId: 'e2-s2-b1',
          beat_script_text: 'INT. CAT\'S PRIVATE LAB - LATER THAT NIGHT. Ghost sends a second message with coordinates.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Discovery' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: 'Cat leaning close to screen, isolated lamp light',
          characters: ['Cat'],
          emotional_tone: 'determination'
        },
      ]
    },
    {
      sceneNumber: 3,
      title: 'The Abandoned Clinic',
      metadata: { targetDuration: '4 min', sceneRole: 'escalation', timing: '12:00-16:00', adBreak: false },
      beats: [
        {
          beatId: 'e2-s3-b1',
          beat_script_text: 'EXT. SERENITY RIDGE FACILITY - DEEP NIGHT. Cat and Daniel approach through overgrown grounds. Faint moonlight barely illuminates the path.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'New location' },
          cameraAngleSuggestion: 'establishing shot',
          characterPositioning: 'Cat and Daniel moving cautiously through brush',
          characters: ['Cat', 'Daniel'],
          emotional_tone: 'suppressed fear'
        },
      ]
    },
    {
      sceneNumber: 4,
      title: 'Another Voice',
      metadata: { targetDuration: '3 min', sceneRole: 'climax', timing: '16:00-19:00', adBreak: false },
      beats: [
        {
          beatId: 'e2-s4-b1',
          beat_script_text: 'INT. ABANDONED CLINIC - CONTINUOUS. In the near-darkness, the Ghost manifests.',
          visualSignificance: 'Critical',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Climax' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: 'Cat facing ethereal light, trembling',
          characters: ['Cat', 'Ghost'],
          emotional_tone: 'shock'
        },
      ]
    },
  ]
};

const episode3: AnalyzedEpisode = {
  episodeNumber: 3,
  title: 'Echoes',
  scenes: [
    {
      sceneNumber: 1,
      title: 'The Aftermath',
      metadata: { targetDuration: '8 min', sceneRole: 'setup_hook', timing: '0:00-8:00', adBreak: true },
      beats: [
        {
          beatId: 'e3-s1-b1',
          beat_script_text: 'INT. NORAD MEDICAL BAY - THE NEXT MORNING. Cat sits in shock, processing what she witnessed.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Opening' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Cat sitting on medical bed, staring blankly',
          characters: ['Cat'],
          emotional_tone: 'vulnerable'
        },
      ]
    },
    {
      sceneNumber: 2,
      title: 'Debriefing Webb',
      metadata: { targetDuration: '4 min', sceneRole: 'development', timing: '8:00-12:00', adBreak: false },
      beats: [
        {
          beatId: 'e3-s2-b1',
          beat_script_text: 'INT. WEBB\'S OFFICE - MIDDAY. Colonel Webb listens to Cat\'s account with growing concern.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Character interaction' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Webb behind desk, Cat seated opposite',
          characters: ['Cat', 'Webb'],
          emotional_tone: 'tense'
        },
      ]
    },
    {
      sceneNumber: 3,
      title: 'The Research',
      metadata: { targetDuration: '4 min', sceneRole: 'escalation', timing: '12:00-16:00', adBreak: false },
      beats: [
        {
          beatId: 'e3-s3-b1',
          beat_script_text: 'THREE DAYS LATER. INT. SECURE ARCHIVE - DAY. Cat has spent days researching Ghost phenomena.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Time jump' },
          cameraAngleSuggestion: 'wide shot',
          characterPositioning: 'Cat surrounded by files and screens',
          characters: ['Cat'],
          emotional_tone: 'determination'
        },
      ]
    },
    {
      sceneNumber: 4,
      title: 'A New Lead',
      metadata: { targetDuration: '3 min', sceneRole: 'climax', timing: '16:00-19:00', adBreak: false },
      beats: [
        {
          beatId: 'e3-s4-b1',
          beat_script_text: 'EXT. DOWNTOWN STREET - EVENING. Daniel spots someone who might know about Serenity Ridge.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Cliffhanger' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Daniel watching a figure across the street',
          characters: ['Daniel'],
          emotional_tone: 'alert'
        },
      ]
    },
  ]
};

// ============================================================================
// RUN TEST
// ============================================================================

console.log('======================================================================');
console.log('FULL TIME INTEGRATION TEST');
console.log('Cross-Episode Time Continuity Chain');
console.log('======================================================================\n');

// Process Episode 1 (no previous episode)
console.log('--- Processing Episode 1: The Signal ---\n');
const e1Result = processEpisodeWithFullContext(episode1, {
  previousEpisodeEndTime: null
});

console.log('\nE1 Beat Details:');
for (const scene of e1Result.episode.scenes) {
  for (const beat of scene.beats) {
    const fb = beat as FullyProcessedBeat;
    console.log(`  ${fb.beatId}: ${fb.fluxLighting?.join(', ') || 'default'}`);
  }
}

// Process Episode 2 (continuing from E1)
console.log('\n--- Processing Episode 2: The Ghost in the Machine ---\n');
const e2Result = processEpisodeWithFullContext(episode2, {
  previousEpisodeEndTime: e1Result.endingTimeOfDay
});

console.log('\nE2 Beat Details:');
for (const scene of e2Result.episode.scenes) {
  for (const beat of scene.beats) {
    const fb = beat as FullyProcessedBeat;
    console.log(`  ${fb.beatId}: ${fb.fluxLighting?.join(', ') || 'default'}`);
  }
}

// Process Episode 3 (continuing from E2, with time jumps)
console.log('\n--- Processing Episode 3: Echoes ---\n');
const e3Result = processEpisodeWithFullContext(episode3, {
  previousEpisodeEndTime: e2Result.endingTimeOfDay
});

console.log('\nE3 Beat Details:');
for (const scene of e3Result.episode.scenes) {
  for (const beat of scene.beats) {
    const fb = beat as FullyProcessedBeat;
    console.log(`  ${fb.beatId}: ${fb.fluxLighting?.join(', ') || 'default'}`);
  }
}

// Summary
console.log('\n======================================================================');
console.log('TIME CHAIN SUMMARY');
console.log('======================================================================\n');

console.log('Episode 1:');
for (const tc of e1Result.timeProgression) {
  const jump = tc.isTimeJump ? ` [JUMP]` : '';
  console.log(`  Scene ${tc.sceneNumber}: ${tc.timeOfDay}${jump}`);
}
console.log(`  -> Ends at: ${e1Result.endingTimeOfDay}\n`);

console.log('Episode 2 (continues from E1):');
for (const tc of e2Result.timeProgression) {
  const jump = tc.isTimeJump ? ` [JUMP]` : '';
  console.log(`  Scene ${tc.sceneNumber}: ${tc.timeOfDay}${jump}`);
}
console.log(`  -> Ends at: ${e2Result.endingTimeOfDay}\n`);

console.log('Episode 3 (continues from E2):');
for (const tc of e3Result.timeProgression) {
  const jump = tc.isTimeJump ? ` [JUMP: ${tc.jumpDescription}]` : '';
  console.log(`  Scene ${tc.sceneNumber}: ${tc.timeOfDay}${jump}`);
}
console.log(`  -> Ends at: ${e3Result.endingTimeOfDay}\n`);

// Stats
console.log('======================================================================');
console.log('STATS');
console.log('======================================================================\n');

console.log(`Episode 1: ${e1Result.stats.totalBeats} beats, ${e1Result.stats.timeJumps} time jumps`);
console.log(`Episode 2: ${e2Result.stats.totalBeats} beats, ${e2Result.stats.timeJumps} time jumps`);
console.log(`Episode 3: ${e3Result.stats.totalBeats} beats, ${e3Result.stats.timeJumps} time jumps`);

console.log('\n======================================================================');
console.log('TEST COMPLETE');
console.log('======================================================================');
