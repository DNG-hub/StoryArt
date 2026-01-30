/**
 * Time Progression Service Test
 *
 * Demonstrates:
 * 1. Cross-episode time continuity (E1S4 -> E2S1)
 * 2. Natural time progression within episode
 * 3. Time jump detection ("THREE DAYS LATER")
 * 4. Interior/exterior inference
 */

import {
  detectTimeOfDay,
  processEpisodeTimeProgression,
  getEpisodeEndTime,
  type SceneTimeContext
} from '../services/timeProgressionService';
import type { TimeOfDay } from '../services/fluxVocabularyService';

console.log('======================================================================');
console.log('TIME PROGRESSION SERVICE TEST');
console.log('======================================================================\n');

// Episode 1 scenes (to establish ending time)
const episode1Scenes = [
  {
    sceneNumber: 1,
    title: 'Ground Zero',
    description: 'INT. BOMBED NHIA FACILITY - DAY. The episode opens in the eerie silence of the bombed-out facility. Harsh midday sun streams through collapsed walls.',
  },
  {
    sceneNumber: 2,
    title: 'The Shepherd',
    description: 'Daniel is introduced. Late afternoon light casts long shadows as he observes Cat from a distance.',
  },
  {
    sceneNumber: 3,
    title: 'Impossible Data',
    description: 'INT. MOBILE LAB - LATER. Inside her mobile lab as evening approaches, Cat begins analyzing the data drive.',
  },
  {
    sceneNumber: 4,
    title: 'A Message',
    description: 'As twilight deepens outside, a string of text appears on Cat\'s monitor. Ghost makes first contact.',
  },
];

// Episode 2 scenes (continue from E1 ending)
const episode2Scenes = [
  {
    sceneNumber: 1,
    title: 'Debrief and Disbelief',
    description: 'INT. NORAD COMMAND CENTER - NIGHT. The episode opens moments after the last. Cat is frantically trying to trace Ghost\'s signal.',
  },
  {
    sceneNumber: 2,
    title: 'The Breadcrumb',
    description: 'INT. CAT\'S PRIVATE LAB - LATER THAT NIGHT. Ghost sends a second message with an address.',
  },
  {
    sceneNumber: 3,
    title: 'The Abandoned Clinic',
    description: 'EXT. SERENITY RIDGE FACILITY - DEEP NIGHT. Cat and Daniel approach the abandoned clinic. Moonlight barely illuminates the overgrown grounds.',
  },
  {
    sceneNumber: 4,
    title: 'Another Voice',
    description: 'INT. ABANDONED CLINIC LAB - CONTINUOUS. The Ghost manifests in the near-darkness.',
  },
];

// Episode 3 scenes (with time jump)
const episode3Scenes = [
  {
    sceneNumber: 1,
    title: 'The Aftermath',
    description: 'INT. NORAD MEDICAL BAY - THE NEXT MORNING. Cat sits in shock, trying to process what she witnessed.',
  },
  {
    sceneNumber: 2,
    title: 'Debriefing Webb',
    description: 'INT. WEBB\'S OFFICE - LATER. Colonel Webb listens to Cat\'s account with growing concern.',
  },
  {
    sceneNumber: 3,
    title: 'The Research',
    description: 'THREE DAYS LATER. INT. SECURE ARCHIVE - DAY. Cat has spent days researching the Ghost phenomenon.',
  },
  {
    sceneNumber: 4,
    title: 'A New Lead',
    description: 'EXT. DOWNTOWN STREET - EVENING. Daniel spots someone who might know more about Serenity Ridge.',
  },
];

// Process Episode 1
console.log('--- Episode 1: The Signal ---\n');
const e1TimeContexts = processEpisodeTimeProgression(episode1Scenes, null);

for (const ctx of e1TimeContexts) {
  console.log(`Scene ${ctx.sceneNumber}: ${ctx.sceneTitle}`);
  console.log(`  Time: ${ctx.timeOfDay} (${ctx.source})`);
  if (ctx.isTimeJump) {
    console.log(`  [TIME JUMP: ${ctx.jumpDescription}]`);
  }
  console.log('');
}

const e1EndTime = getEpisodeEndTime(e1TimeContexts);
console.log(`Episode 1 ends at: ${e1EndTime}\n`);

// Process Episode 2 (continuing from E1)
console.log('--- Episode 2: The Ghost in the Machine ---\n');
console.log(`[Continuing from E1 ending: ${e1EndTime}]\n`);

const e2TimeContexts = processEpisodeTimeProgression(episode2Scenes, e1EndTime);

for (const ctx of e2TimeContexts) {
  console.log(`Scene ${ctx.sceneNumber}: ${ctx.sceneTitle}`);
  console.log(`  Time: ${ctx.timeOfDay} (${ctx.source})`);
  if (ctx.isTimeJump) {
    console.log(`  [TIME JUMP: ${ctx.jumpDescription}]`);
  }
  console.log('');
}

const e2EndTime = getEpisodeEndTime(e2TimeContexts);
console.log(`Episode 2 ends at: ${e2EndTime}\n`);

// Process Episode 3 (with time jumps)
console.log('--- Episode 3: Echoes ---\n');
console.log(`[Continuing from E2 ending: ${e2EndTime}]\n`);

const e3TimeContexts = processEpisodeTimeProgression(episode3Scenes, e2EndTime);

for (const ctx of e3TimeContexts) {
  console.log(`Scene ${ctx.sceneNumber}: ${ctx.sceneTitle}`);
  console.log(`  Time: ${ctx.timeOfDay} (${ctx.source})`);
  if (ctx.isTimeJump) {
    console.log(`  [TIME JUMP: ${ctx.jumpDescription}]`);
  }
  console.log('');
}

console.log('======================================================================');
console.log('VALIDATION');
console.log('======================================================================\n');

const checks = [
  {
    name: 'E1S1 detects midday from "Harsh midday sun"',
    pass: e1TimeContexts[0].timeOfDay === 'midday',
    actual: e1TimeContexts[0].timeOfDay
  },
  {
    name: 'E1S4 detects dusk from "twilight deepens"',
    pass: e1TimeContexts[3].timeOfDay === 'dusk',
    actual: e1TimeContexts[3].timeOfDay
  },
  {
    name: 'E2S1 continues from E1 (same time - dusk, since "moments after")',
    pass: e2TimeContexts[0].timeOfDay === 'dusk' || e2TimeContexts[0].timeOfDay.includes('night'),
    actual: e2TimeContexts[0].timeOfDay
  },
  {
    name: 'E2S1 source is "continued" (moments after)',
    pass: e2TimeContexts[0].source === 'continued',
    actual: e2TimeContexts[0].source
  },
  {
    name: 'E2S3 is exterior (from EXT. marker)',
    pass: e2TimeContexts[2].timeOfDay.includes('exterior'),
    actual: e2TimeContexts[2].timeOfDay
  },
  {
    name: 'E2S3 is deep night (from description)',
    pass: e2TimeContexts[2].timeOfDay.includes('deep_night'),
    actual: e2TimeContexts[2].timeOfDay
  },
  {
    name: 'E3S1 is time jump (next morning)',
    pass: e3TimeContexts[0].isTimeJump === true,
    actual: e3TimeContexts[0].isTimeJump
  },
  {
    name: 'E3S1 is morning',
    pass: e3TimeContexts[0].timeOfDay === 'morning',
    actual: e3TimeContexts[0].timeOfDay
  },
  {
    name: 'E3S3 is time jump (three days later)',
    pass: e3TimeContexts[2].isTimeJump === true,
    actual: e3TimeContexts[2].isTimeJump
  },
  {
    name: 'E3S4 is evening/dusk (from description)',
    pass: e3TimeContexts[3].timeOfDay === 'dusk' || e3TimeContexts[3].timeOfDay === 'golden_hour',
    actual: e3TimeContexts[3].timeOfDay
  },
];

let allPassed = true;
for (const check of checks) {
  const status = check.pass ? '[PASS]' : '[FAIL]';
  console.log(`${status} ${check.name}`);
  if (!check.pass) {
    console.log(`       Got: ${check.actual}`);
    allPassed = false;
  }
}

console.log('\n======================================================================');
if (allPassed) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log('SOME CHECKS FAILED');
}
console.log('======================================================================');
