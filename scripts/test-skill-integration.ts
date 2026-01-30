/**
 * Full SKILL.md Integration Test
 *
 * Tests the complete prompt generation pipeline:
 * - Section 1: Prompt templates
 * - Section 6: Beat type detection
 * - Section 8: Dual character handling
 * - Section 11: Arc phase visual mapping
 * - Section 11B: Visual hooks
 * - Section 13: Time of day lighting
 * - Section 14: Anti-monotony enforcement
 * - Section 15: Image routing
 *
 * Usage: npx tsx scripts/test-skill-integration.ts
 */

import { assembleScenePrompts, type BeatInput, type SceneContext } from '../services/promptAssemblyService';
import { detectBeatType } from '../services/beatTypeService';
import { getPhaseAwareShotRecommendation, inferArcPhaseFromSceneRole } from '../services/arcPhaseVisualService';
import { getHookRecommendation, type HookContext } from '../services/visualHookService';
import { createVarietyState, enforceVariety, updateVarietyState } from '../services/antiMonotonyService';
import { setupDualCharacter, determineImageRoute, generateDualFaceSegments } from '../services/dualCharacterService';
import { getLightingForTimeOfDay } from '../services/fluxVocabularyService';

console.log('======================================================================');
console.log('SKILL.md FULL INTEGRATION TEST');
console.log('======================================================================\n');

// ============================================================================
// TEST 1: Beat Type Detection (Section 6)
// ============================================================================

console.log('--- TEST 1: Beat Type Detection (Section 6) ---\n');

const beatTypeTests = [
  { characters: ['Cat'], desc: 'Single character with LoRA' },
  { characters: ['Cat', 'Daniel'], desc: 'Dual characters with LoRAs' },
  { characters: ['Webb'], desc: 'Character requiring zimage' },
  { characters: ['Cat', 'Chen'], desc: 'Mixed route characters' },
  { characters: [], desc: 'Environment only' },
  { characters: ['a soldier'], desc: 'Generic character' },
];

for (const test of beatTypeTests) {
  const result = detectBeatType(test.characters, null, test.characters.length === 0);
  console.log(`  ${test.desc}:`);
  console.log(`    Characters: [${test.characters.join(', ')}]`);
  console.log(`    Beat Type: ${result.beatType}`);
  console.log(`    Requires zimage: ${result.requiresZimageRoute}`);
  console.log('');
}

// ============================================================================
// TEST 2: Arc Phase Visual Mapping (Section 11)
// ============================================================================

console.log('--- TEST 2: Arc Phase Visual Mapping (Section 11) ---\n');

const phases = ['DORMANT', 'RISING', 'CLIMAX', 'FALLING', 'RESOLVED'] as const;
for (const phase of phases) {
  const rec = getPhaseAwareShotRecommendation(phase, 'High', 7, 2, 4);
  console.log(`  ${phase}:`);
  console.log(`    Shot: ${rec.recommendedShotType}`);
  console.log(`    Angle: ${rec.recommendedAngle}`);
  console.log(`    Lighting: ${rec.lightingStyle}`);
  console.log(`    Reason: ${rec.reason}`);
  console.log('');
}

// ============================================================================
// TEST 3: Visual Hook Detection (Section 11B)
// ============================================================================

console.log('--- TEST 3: Visual Hook Detection (Section 11B) ---\n');

const hookTests: Array<{ context: HookContext; desc: string }> = [
  {
    context: { gearContext: 'off_duty', characterCount: 1, hasCharacters: true, isInterior: true, sceneIntensity: 2 },
    desc: 'Low intensity, single character off-duty'
  },
  {
    context: { gearContext: 'field_op', characterCount: 2, hasCharacters: true, isInterior: false, sceneIntensity: 8 },
    desc: 'High intensity, dual character field op'
  },
  {
    context: { gearContext: null, characterCount: 0, hasCharacters: false, isInterior: false, sceneIntensity: 3 },
    desc: 'Environment only, low intensity'
  },
];

for (const test of hookTests) {
  const hook = getHookRecommendation(test.context, true, true, false);
  console.log(`  ${test.desc}:`);
  console.log(`    Hook Type: ${hook.hookType}`);
  console.log(`    Effort: ${hook.hookEffort}`);
  console.log(`    Shot: ${hook.suggestedShotType}`);
  console.log(`    Grab: ${hook.grabElement}`);
  console.log('');
}

// ============================================================================
// TEST 4: Anti-Monotony Enforcement (Section 14)
// ============================================================================

console.log('--- TEST 4: Anti-Monotony Enforcement (Section 14) ---\n');

let varietyState = createVarietyState();
const shotSequence: Array<{ shot: string; angle: string }> = [
  { shot: 'medium shot', angle: 'eye-level shot' },
  { shot: 'medium shot', angle: 'eye-level shot' },  // Warning
  { shot: 'medium shot', angle: 'eye-level shot' },  // Violation - should adjust
  { shot: 'close-up shot', angle: 'three-quarter view' },
  { shot: 'medium shot', angle: 'eye-level shot' },  // OK again
];

console.log('  Simulating 5-beat sequence with repeated shots:');
for (let i = 0; i < shotSequence.length; i++) {
  const { shot, angle } = shotSequence[i];
  const result = enforceVariety(varietyState, shot as any, angle as any);

  console.log(`    Beat ${i + 1}: Proposed ${shot}`);
  if (result.wasAdjusted) {
    console.log(`      -> ADJUSTED to ${result.adjustedShot} (${result.adjustmentReason})`);
  } else if (result.violations.length > 0) {
    const warns = result.violations.filter(v => v.severity === 'WARNING');
    if (warns.length > 0) {
      console.log(`      -> WARNING: ${warns[0].message}`);
    }
  } else {
    console.log(`      -> OK`);
  }

  varietyState = updateVarietyState(varietyState, result.adjustedShot, result.adjustedAngle);
}
console.log('');

// ============================================================================
// TEST 5: Dual Character Handling (Section 8)
// ============================================================================

console.log('--- TEST 5: Dual Character Handling (Section 8) ---\n');

const dualSetup = setupDualCharacter('Cat', 'Daniel', 'TACTICAL_PARTNERSHIP', 'flux');
console.log('  Cat + Daniel (FLUX route, TACTICAL_PARTNERSHIP):');
console.log(`    Left: ${dualSetup.leftCharacter.name} -> ${dualSetup.leftCharacter.trigger} (index ${dualSetup.leftCharacter.faceSegmentIndex})`);
console.log(`    Right: ${dualSetup.rightCharacter.name} -> ${dualSetup.rightCharacter.trigger} (index ${dualSetup.rightCharacter.faceSegmentIndex})`);
console.log(`    Interaction: ${dualSetup.interaction}`);
console.log(`    Positioning: ${dualSetup.positioning}`);
console.log(`    Face Segments: ${generateDualFaceSegments(dualSetup)}`);
console.log('');

// Test zimage route
const zimageSetup = setupDualCharacter('Cat', 'Chen', 'EMOTIONAL_MOMENT', 'zimage');
console.log('  Cat + Chen (zimage route, EMOTIONAL_MOMENT):');
console.log(`    Left: ${zimageSetup.leftCharacter.name} -> ${zimageSetup.leftCharacter.trigger}`);
console.log(`    Right: ${zimageSetup.rightCharacter.name} -> ${zimageSetup.rightCharacter.trigger}`);
console.log(`    Route: ${determineImageRoute(['Cat', 'Chen'])}`);
console.log('');

// ============================================================================
// TEST 6: Time of Day Lighting (Section 13.2)
// ============================================================================

console.log('--- TEST 6: Time of Day Lighting (Section 13.2) ---\n');

const times = ['morning', 'midday', 'golden_hour', 'dusk', 'night_interior', 'deep_night_exterior'] as const;
for (const time of times) {
  const lighting = getLightingForTimeOfDay(time);
  console.log(`  ${time}: ${lighting.join(', ')}`);
}
console.log('');

// ============================================================================
// TEST 7: Image Routing (Section 15)
// ============================================================================

console.log('--- TEST 7: Image Routing (Section 15) ---\n');

const routeTests = [
  { chars: ['Cat'], expected: 'FLUX' },
  { chars: ['Cat', 'Daniel'], expected: 'FLUX' },
  { chars: ['Chen'], expected: 'ZIMAGE' },
  { chars: ['Cat', 'Webb'], expected: 'ZIMAGE' },
  { chars: ['Daniel', '2K'], expected: 'ZIMAGE' },
  { chars: [], expected: 'FLUX' },
];

for (const test of routeTests) {
  const route = determineImageRoute(test.chars);
  const status = route === test.expected ? 'PASS' : 'FAIL';
  console.log(`  [${status}] [${test.chars.join(', ') || 'none'}] -> ${route}`);
}
console.log('');

// ============================================================================
// TEST 8: Full Scene Assembly
// ============================================================================

console.log('--- TEST 8: Full Scene Assembly ---\n');

const testBeats: BeatInput[] = [
  {
    beatId: 's1-b1',
    beatScriptText: 'INT. NORAD COMMAND CENTER - NIGHT. Cat reviews the impossible data from the anomaly.',
    characters: ['Cat'],
    characterPositioning: 'Cat standing at terminal, fingers hovering over keyboard',
    emotionalTone: 'tense anticipation',
    visualSignificance: 'High',
    gearContext: 'off_duty',
    timeOfDay: 'night_interior',
    trigger: 'JRUMLV woman',
    characterDescription: '28 years old, dark brown tactical bun, sharp green eyes',
    locationShorthand: 'NORAD command center, blue monitor glow',
    faceSegment: '<segment:yolo-face_yolov9c.pt-0,0.35,0.5>',
  },
  {
    beatId: 's1-b2',
    beatScriptText: 'She traces patterns in the data, her analytical mind searching for logical explanation.',
    characters: ['Cat'],
    characterPositioning: 'Cat leaning toward screen',
    emotionalTone: 'clinical focus',
    visualSignificance: 'Medium',
    gearContext: 'off_duty',
    timeOfDay: 'night_interior',
    trigger: 'JRUMLV woman',
    characterDescription: '28 years old, dark brown tactical bun, sharp green eyes',
    locationShorthand: 'terminal display, data patterns',
    faceSegment: '<segment:yolo-face_yolov9c.pt-0,0.35,0.5>',
  },
  {
    beatId: 's1-b3',
    beatScriptText: 'Daniel enters through the secure door, pausing at the threshold.',
    characters: ['Daniel'],
    characterPositioning: 'Daniel entering through door',
    emotionalTone: 'professional calm',
    visualSignificance: 'High',
    gearContext: 'off_duty',
    timeOfDay: 'night_interior',
    trigger: 'HSCEIA man',
    characterDescription: '32 years old, short dark hair, tactical build',
    locationShorthand: 'command center entrance',
    faceSegment: '<segment:yolo-face_yolov9c.pt-0,0.35,0.5>',
  },
  {
    beatId: 's1-b4',
    beatScriptText: 'Cat and Daniel share a look of mutual concern across the command center.',
    characters: ['Cat', 'Daniel'],
    characterPositioning: 'facing each other, eye contact',
    emotionalTone: 'shared concern',
    visualSignificance: 'High',
    gearContext: 'off_duty',
    timeOfDay: 'night_interior',
    trigger: 'JRUMLV woman',
    characterDescription: '28 years old, dark brown tactical bun',
    locationShorthand: 'command center, monitors in background',
    faceSegment: '<segment:yolo-face_yolov9c.pt-0,0.35,0.5>',
  },
];

const sceneContext: SceneContext = {
  sceneNumber: 1,
  sceneRole: 'setup_hook',
  totalBeats: 4,
  intensity: 6,
  pacing: 'measured',
  arcPhase: 'RISING',
  isAdBreakScene: true,
};

console.log('  Scene: E2S1 "Debrief and Disbelief" (RISING arc, setup_hook)');
console.log('  Assembling 4 beats...\n');

const assembled = assembleScenePrompts(testBeats, sceneContext);

for (const result of assembled) {
  console.log(`  === ${result.beatId} ===`);
  console.log(`  Beat Type: ${result.beatType.beatType}`);
  console.log(`  Shot: ${result.shotType} | Angle: ${result.cameraAngle}`);
  if (result.hookRecommendation) {
    console.log(`  Hook: ${result.hookRecommendation.hookType} (${result.hookRecommendation.hookEffort} effort)`);
  }
  if (result.varietyAdjustment.wasAdjusted) {
    console.log(`  Variety: ADJUSTED - ${result.varietyAdjustment.adjustmentReason}`);
  }
  console.log(`  Arc Phase: ${result.arcPhaseGuidance}`);
  if (result.warnings.length > 0) {
    console.log(`  Warnings: ${result.warnings.join('; ')}`);
  }
  console.log(`  PROMPT: ${result.prompt}`);
  console.log('');
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('======================================================================');
console.log('SKILL.md COVERAGE SUMMARY');
console.log('======================================================================\n');

const sections = [
  { num: '1', name: 'Target Output Templates', status: 'IMPLEMENTED' },
  { num: '3', name: 'Assembly Rules (partial)', status: 'IMPLEMENTED' },
  { num: '6', name: 'Beat Type Detection', status: 'IMPLEMENTED' },
  { num: '8', name: 'Dual Character Rules', status: 'IMPLEMENTED' },
  { num: '11', name: 'Arc Phase Visual Mapping', status: 'IMPLEMENTED' },
  { num: '11A', name: 'Scene Intensity/Pacing', status: 'IMPLEMENTED' },
  { num: '11B', name: 'Visual Hooks', status: 'IMPLEMENTED' },
  { num: '12', name: 'Character Expression Tells', status: 'IMPLEMENTED (characterExpressionService)' },
  { num: '13.2', name: 'Time of Day Lighting', status: 'IMPLEMENTED' },
  { num: '14', name: 'Anti-Monotony (Anti-Slop)', status: 'IMPLEMENTED' },
  { num: '15', name: 'Image Routing (FLUX/zimage)', status: 'IMPLEMENTED' },
  { num: '2', name: 'Database Data Sources', status: 'STUB (needs DB integration)' },
  { num: '3.7', name: 'Trigger Substitution', status: 'STUB (needs Python service)' },
  { num: '7', name: 'Intermediate JSON Audit', status: 'NOT YET' },
  { num: '10', name: 'Continuity State', status: 'NOT YET' },
];

for (const section of sections) {
  const icon = section.status.startsWith('IMPLEMENTED') ? '[OK]' :
               section.status.startsWith('STUB') ? '[--]' : '[  ]';
  console.log(`  ${icon} Section ${section.num}: ${section.name}`);
  if (!section.status.startsWith('IMPLEMENTED')) {
    console.log(`       ${section.status}`);
  }
}

console.log('\n======================================================================');
console.log('TEST COMPLETE');
console.log('======================================================================');
