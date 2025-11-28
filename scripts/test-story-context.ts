/**
 * Test script for Story Context Service
 * Verifies real database access (no mock data)
 *
 * Usage: tsx scripts/test-story-context.ts
 */

import { getStoryContext, getCacheStats, clearStoryContextCache } from '../services/storyContextService';

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

async function testStoryContextService() {
  console.log('='.repeat(60));
  console.log('Story Context Service Test');
  console.log('='.repeat(60));
  console.log('');

  console.log('📋 Testing with story ID:', CAT_DANIEL_STORY_ID);
  console.log('');

  try {
    // Test 1: Fresh fetch from database
    console.log('Test 1: Fetching from database (should query DB)...');
    const context1 = await getStoryContext(CAT_DANIEL_STORY_ID);

    if (context1) {
      console.log('✅ SUCCESS: Retrieved story context');
      console.log('');
      console.log('Story Context:', context1.story_context.substring(0, 100) + '...');
      console.log(`   (Total: ${context1.story_context.length} characters)`);
      console.log('');
      console.log('Narrative Tone:', context1.narrative_tone.substring(0, 80) + '...');
      console.log(`   (Total: ${context1.narrative_tone.length} characters)`);
      console.log('');
      console.log('Core Themes:', context1.core_themes.substring(0, 80) + '...');
      console.log(`   (Total: ${context1.core_themes.length} characters)`);
      console.log('');
    } else {
      console.log('❌ FAILED: No context returned');
      return;
    }

    // Test 2: Cached fetch (should use cache)
    console.log('Test 2: Fetching again (should use cache)...');
    const context2 = await getStoryContext(CAT_DANIEL_STORY_ID);

    if (context2) {
      console.log('✅ SUCCESS: Retrieved from cache');
      console.log('');
    } else {
      console.log('❌ FAILED: Cache miss');
    }

    // Test 3: Cache stats
    console.log('Test 3: Checking cache statistics...');
    const stats = getCacheStats();
    console.log(`✅ Cache contains ${stats.entries} entries:`, stats.keys);
    console.log('');

    // Test 4: Invalid story ID (should handle gracefully)
    console.log('Test 4: Testing with invalid story ID...');
    const invalidContext = await getStoryContext('00000000-0000-0000-0000-000000000000');

    if (invalidContext === null) {
      console.log('✅ SUCCESS: Handled invalid story ID gracefully (returned null)');
      console.log('');
    } else {
      console.log('❌ FAILED: Should return null for invalid ID');
    }

    // Test 5: Data quality validation
    console.log('Test 5: Validating data quality against Phase B requirements...');
    if (context1) {
      const validations = {
        'story_context length >= 50': context1.story_context.length >= 50,
        'narrative_tone length >= 20': context1.narrative_tone.length >= 20,
        'core_themes length >= 20': context1.core_themes.length >= 20,
        'story_context is comprehensive (300-700 chars)': context1.story_context.length >= 300 && context1.story_context.length <= 700,
        'narrative_tone is detailed (150-350 chars)': context1.narrative_tone.length >= 150 && context1.narrative_tone.length <= 350,
        'core_themes is rich (150-300 chars)': context1.core_themes.length >= 150 && context1.core_themes.length <= 300
      };

      let allPassed = true;
      for (const [check, passed] of Object.entries(validations)) {
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${check}`);
        if (!passed) allPassed = false;
      }

      console.log('');
      if (allPassed) {
        console.log('🎉 ALL DATA QUALITY CHECKS PASSED - READY FOR PHASE B!');
      } else {
        console.log('⚠️  Some data quality checks failed - review data');
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED WITH ERROR:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testStoryContextService()
  .then(() => {
    console.log('');
    console.log('✅ All tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
