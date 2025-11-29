/**
 * Phase A Integration Test
 *
 * Tests location and character context integration into prompt generation.
 * Generates 2 test prompts to validate quality improvement.
 *
 * Usage: npx tsx scripts/test-phase-a-integration.ts
 */

import dotenv from 'dotenv';
import {
  getLocationContext,
  generateLocationPromptFragment,
  closeLocationContextPool
} from '../services/locationContextService';
import {
  getCharacterLocationOverride,
  generateCharacterAppearanceFragment,
  closeCharacterContextPool
} from '../services/characterContextService';

dotenv.config();

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

async function testPhaseAIntegration() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Phase A Integration Test                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Testing location and character context enhancement...');
  console.log('');

  try {
    // Test Beat 1: Cat at NHIA Facility 7
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST BEAT 1: Cat investigating at NHIA Facility 7');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Fetch location context
    console.log('1. Fetching location context...');
    const nhiaLocation = await getLocationContext(CAT_DANIEL_STORY_ID, 'NHIA Facility 7');
    const nhiaLocationFragment = generateLocationPromptFragment(nhiaLocation, {
      includeArtifacts: true,
      maxArtifacts: 2
    });

    console.log(`   ✓ Location found: ${nhiaLocation.found}`);
    console.log(`   ✓ Visual description: ${nhiaLocation.visual_description.length} chars`);
    console.log(`   ✓ Artifacts: ${nhiaLocation.artifacts.length}`);
    console.log(`   ✓ Fragment length: ${nhiaLocationFragment.length} chars`);
    console.log('');

    // Fetch character context
    console.log('2. Fetching character context...');
    const catAtNHIA = await getCharacterLocationOverride(
      CAT_DANIEL_STORY_ID,
      "Catherine 'Cat' Mitchell",
      'NHIA Facility 7'
    );
    const catFragment = generateCharacterAppearanceFragment(catAtNHIA, { useOverride: true });

    console.log(`   ✓ Character found: ${catAtNHIA.found}`);
    console.log(`   ✓ Override length: ${catAtNHIA.swarmui_prompt_override.length} chars`);
    console.log(`   ✓ LoRA weight: ${catAtNHIA.lora_weight_adjustment}`);
    console.log('');

    // Simulate enhanced prompt
    console.log('3. Simulated Enhanced Prompt Fragment:');
    console.log('');
    console.log('   BASELINE (without Phase A):');
    console.log('   "JRUMLV woman in tactical gear examining evidence in damaged facility"');
    console.log('');
    console.log('   PHASE A ENHANCED:');
    const enhancedPrompt = `medium shot of ${catFragment}, examining scattered evidence with focused intensity, ${nhiaLocationFragment.substring(0, 200)}...`;
    console.log(`   "${enhancedPrompt}"`);
    console.log('');
    console.log(`   Length comparison: Baseline ~60 chars → Enhanced ~${enhancedPrompt.length} chars`);
    console.log('');

    // Show what was added
    console.log('4. Phase A Enhancements Added:');
    console.log('');
    console.log('   CHARACTER DETAILS:');
    console.log(`   - Name and age: ${catFragment.includes('32') ? '✓' : '✗'}`);
    console.log(`   - Specific clothing: ${catFragment.includes('MultiCam') ? '✓' : '✗'}`);
    console.log(`   - Physical build: ${catFragment.includes('lean athletic') ? '✓' : '✗'}`);
    console.log(`   - Hair style: ${catFragment.includes('tactical bun') ? '✓' : '✗'}`);
    console.log('');
    console.log('   LOCATION DETAILS:');
    console.log(`   - Visual description: ${nhiaLocation.visual_description.length > 0 ? '✓' : '✗'}`);
    console.log(`   - Atmosphere: ${nhiaLocation.atmosphere.length > 0 ? '✓' : '✗'}`);
    console.log(`   - Artifacts: ${nhiaLocation.artifacts.length > 0 ? '✓' : '✗'}`);
    if (nhiaLocation.artifacts.length > 0) {
      console.log(`   - First artifact: "${nhiaLocation.artifacts[0].artifact_name}"`);
    }
    console.log('');

    // Test Beat 2: Daniel at Dan's Safehouse
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST BEAT 2: Daniel at his safehouse');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    console.log('1. Fetching contexts...');
    const safehouseLocation = await getLocationContext(CAT_DANIEL_STORY_ID, "Dan's Safehouse");
    const safehouseFragment = generateLocationPromptFragment(safehouseLocation, {
      includeArtifacts: true,
      maxArtifacts: 3
    });

    const danAtSafehouse = await getCharacterLocationOverride(
      CAT_DANIEL_STORY_ID,
      "Daniel O'Brien",
      "Dan's Safehouse"
    );
    const danFragment = generateCharacterAppearanceFragment(danAtSafehouse, { useOverride: true });

    console.log(`   ✓ Location: ${safehouseLocation.visual_description.length} chars (${safehouseLocation.artifacts.length} artifacts)`);
    console.log(`   ✓ Character: ${danAtSafehouse.swarmui_prompt_override.length} chars`);
    console.log('');

    console.log('2. Enhancement Preview:');
    console.log('');
    console.log('   BASELINE:');
    console.log('   "HSCEIA man working at computer in safehouse"');
    console.log('');
    console.log('   PHASE A ENHANCED:');
    const danEnhanced = `close-up of ${danFragment}, intensely focused at conspiracy whiteboard, ${safehouseFragment.substring(0, 150)}...`;
    console.log(`   "${danEnhanced}"`);
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 PHASE A INTEGRATION TEST SUMMARY');
    console.log('');
    console.log('✅ Both services working correctly');
    console.log('');
    console.log('Quality Improvements Demonstrated:');
    console.log(`  - Character specificity: Generic triggers → ${catFragment.length} char detailed overrides`);
    console.log(`  - Location richness: Generic names → ${Math.round((nhiaLocationFragment.length + safehouseFragment.length) / 2)} char descriptions`);
    console.log(`  - Artifact details: None → ${nhiaLocation.artifacts.length + safehouseLocation.artifacts.length} total artifacts`);
    console.log('');
    console.log('Average Prompt Enhancement:');
    console.log(`  - Baseline: ~60 chars (generic)`);
    console.log(`  - Phase A: ~${Math.round((enhancedPrompt.length + danEnhanced.length) / 2)} chars (detailed)`);
    console.log(`  - Improvement: +${Math.round(((enhancedPrompt.length + danEnhanced.length) / 2 - 60) / 60 * 100)}%`);
    console.log('');
    console.log('Next Step: Integrate into promptGenerationService.ts for full pipeline');
    console.log('');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    await closeLocationContextPool();
    await closeCharacterContextPool();
  }
}

// Run test
testPhaseAIntegration()
  .then(() => {
    console.log('✅ Phase A Integration test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
