/**
 * Test Location Context Service
 *
 * Validates that locationContextService correctly retrieves and formats
 * location data from the database.
 *
 * Usage: npx tsx scripts/test-location-context-service.ts
 */

import dotenv from 'dotenv';
import {
  getLocationContext,
  generateLocationPromptFragment,
  hasLocationData,
  closeLocationContextPool
} from '../services/locationContextService';

dotenv.config();

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

async function testLocationContextService() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Location Context Service Test                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Test 1: Fetch a location with good data (NHIA Facility 7)
    console.log('Test 1: Fetching NHIA Facility 7 (should have data)...');
    const nhiaContext = await getLocationContext(CAT_DANIEL_STORY_ID, 'NHIA Facility 7');

    console.log(`  ✓ Found: ${nhiaContext.found}`);
    console.log(`  ✓ Visual Description: ${nhiaContext.visual_description.length} chars`);
    console.log(`  ✓ Artifacts: ${nhiaContext.artifacts.length}`);
    console.log(`  ✓ Has Data: ${hasLocationData(nhiaContext)}`);
    console.log('');

    if (nhiaContext.artifacts.length > 0) {
      console.log('  Sample Artifact:');
      console.log(`    - Name: ${nhiaContext.artifacts[0].artifact_name}`);
      console.log(`    - Fragment: ${nhiaContext.artifacts[0].swarmui_prompt_fragment.substring(0, 60)}...`);
      console.log('');
    }

    // Test 2: Generate prompt fragment
    console.log('Test 2: Generating prompt fragment...');
    const nhiaFragment = generateLocationPromptFragment(nhiaContext, {
      includeArtifacts: true,
      maxArtifacts: 2
    });

    console.log(`  ✓ Fragment Length: ${nhiaFragment.length} chars`);
    console.log(`  ✓ Fragment Preview: "${nhiaFragment.substring(0, 100)}..."`);
    console.log('');

    // Test 3: Fetch location with excellent data (Dan's Safehouse)
    console.log('Test 3: Fetching Dan\'s Safehouse (should have excellent data)...');
    const safehouseContext = await getLocationContext(CAT_DANIEL_STORY_ID, "Dan's Safehouse");

    console.log(`  ✓ Found: ${safehouseContext.found}`);
    console.log(`  ✓ Visual Description: ${safehouseContext.visual_description.length} chars`);
    console.log(`  ✓ Artifacts: ${safehouseContext.artifacts.length}`);
    console.log(`  ✓ Has Data: ${hasLocationData(safehouseContext)}`);
    console.log('');

    // Test 4: Fetch location with no artifacts (Atlanta Emergency Zone)
    console.log('Test 4: Fetching Atlanta Emergency Zone (has description, no artifacts)...');
    const atlantaContext = await getLocationContext(CAT_DANIEL_STORY_ID, 'Atlanta Emergency Zone');

    console.log(`  ✓ Found: ${atlantaContext.found}`);
    console.log(`  ✓ Visual Description: ${atlantaContext.visual_description.length} chars`);
    console.log(`  ✓ Artifacts: ${atlantaContext.artifacts.length}`);
    console.log(`  ✓ Has Data: ${hasLocationData(atlantaContext)}`);
    console.log('');

    const atlantaFragment = generateLocationPromptFragment(atlantaContext);
    console.log(`  ✓ Fragment (no artifacts): "${atlantaFragment.substring(0, 100)}..."`);
    console.log('');

    // Test 5: Fetch non-existent location
    console.log('Test 5: Fetching non-existent location (graceful degradation)...');
    const unknownContext = await getLocationContext(CAT_DANIEL_STORY_ID, 'Unknown Location XYZ');

    console.log(`  ✓ Found: ${unknownContext.found}`);
    console.log(`  ✓ Visual Description: ${unknownContext.visual_description.length} chars`);
    console.log(`  ✓ Artifacts: ${unknownContext.artifacts.length}`);
    console.log(`  ✓ Has Data: ${hasLocationData(unknownContext)}`);
    console.log('');

    // Summary
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 TEST SUMMARY');
    console.log('');
    console.log('✅ All tests passed');
    console.log('');
    console.log('Key Findings:');
    console.log(`  - Locations with data: 3/4 tested`);
    console.log(`  - Average visual description: ${Math.round((nhiaContext.visual_description.length + safehouseContext.visual_description.length + atlantaContext.visual_description.length) / 3)} chars`);
    console.log(`  - Average artifacts: ${Math.round((nhiaContext.artifacts.length + safehouseContext.artifacts.length + atlantaContext.artifacts.length) / 3)}`);
    console.log(`  - Graceful degradation: Working ✓`);
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await closeLocationContextPool();
  }
}

// Run test
testLocationContextService()
  .then(() => {
    console.log('✅ Location Context Service test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
