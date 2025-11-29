/**
 * Test script for Prompt Generation with Story Context (Task 3.0)
 * Tests the integration of story context into prompt generation and validates token tracking
 *
 * Usage: tsx scripts/test-prompt-generation-with-context.ts
 */

import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

import { generateSwarmUiPrompts } from '../services/promptGenerationService';
import type { AnalyzedEpisode, EpisodeStyleConfig } from '../types';

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

// Minimal test data for a single beat
const testAnalyzedEpisode: AnalyzedEpisode = {
  episodeNumber: 1,
  title: "The Reckoning",
  scenes: [
    {
      sceneNumber: 1,
      title: "Facility Entry",
      metadata: {
        sceneRole: "Cat and Daniel approach the NHIA facility",
        emotionalProgression: "Tension building"
      },
      beats: [
        {
          beatId: "s1-b1",
          beat_script_text: "Cat moves cautiously through the damaged tactical facility, weapon at ready.",
          core_action: "Cat advances through facility",
          visual_anchor: "Cat in tactical gear",
          imageDecision: {
            type: 'NEW_IMAGE' as const,
            reasoning: 'Opening shot establishes the scene'
          },
          locationAttributes: ['damaged', 'tactical facility', 'interior'],
          cameraAngleSuggestion: 'medium shot'
        }
      ]
    }
  ]
};

const testEpisodeContext = JSON.stringify({
  episode: {
    episode_number: 1,
    episode_title: "The Reckoning",
    characters: [
      {
        character_name: "Catherine Mitchell",
        aliases: ["Cat"],
        base_trigger: "JRUMLV woman",
        visual_description: "Dark brown tactical bun, green eyes, tactical gear"
      }
    ]
  }
}, null, 2);

const testStyleConfig: EpisodeStyleConfig = {
  model: 'flux1-dev-fp8',
  cinematicAspectRatio: '16:9',
  verticalAspectRatio: '9:16'
};

async function testPromptGenerationWithContext() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Test: Prompt Generation with Story Context (Task 3.0)       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  let capturedLogs: string[] = [];
  const originalLog = console.log;

  // Capture console logs to extract token metrics
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    capturedLogs.push(message);
    originalLog(...args);
  };

  try {
    console.log('📋 Test Configuration:');
    console.log(`   Story ID: ${CAT_DANIEL_STORY_ID}`);
    console.log(`   Retrieval Mode: database`);
    console.log(`   Provider: gemini`);
    console.log('');

    console.log('🔄 Test 1: Generate prompts WITH story context...');
    console.log('');

    const results = await generateSwarmUiPrompts(
      testAnalyzedEpisode,
      testEpisodeContext,
      testStyleConfig,
      'database',
      CAT_DANIEL_STORY_ID,
      'gemini',
      (message: string) => {
        console.log(`   [Progress] ${message}`);
      }
    );

    console.log = originalLog; // Restore original console.log

    console.log('');
    console.log('✅ Test 1 Complete: Prompts generated successfully');
    console.log(`   Generated ${results.length} prompt(s)`);
    console.log('');

    // Validate results
    console.log('🔍 Test 2: Validating prompt structure...');
    if (results.length > 0) {
      const firstPrompt = results[0];

      const validations = {
        'Has beatId': !!firstPrompt.beatId,
        'Has cinematic prompt': !!firstPrompt.cinematic,
        'Has vertical prompt': !!firstPrompt.vertical,
        'Cinematic has prompt text': !!firstPrompt.cinematic?.prompt,
        'Cinematic has correct steps (20)': firstPrompt.cinematic?.steps === 20,
        'Cinematic has correct cfgscale (1)': firstPrompt.cinematic?.cfgscale === 1,
        'Vertical has prompt text': !!firstPrompt.vertical?.prompt,
        'Vertical has correct steps (20)': firstPrompt.vertical?.steps === 20,
        'Vertical has correct cfgscale (1)': firstPrompt.vertical?.cfgscale === 1
      };

      let allPassed = true;
      for (const [check, passed] of Object.entries(validations)) {
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${check}`);
        if (!passed) allPassed = false;
      }

      console.log('');
      if (!allPassed) {
        console.log('❌ Some structure validations failed');
        return false;
      }
    } else {
      console.log('❌ No prompts generated');
      return false;
    }

    // Extract and validate token metrics from captured logs
    console.log('🔍 Test 3: Validating token tracking metrics...');

    const tokenMetrics = {
      storyContextFound: false,
      baseInstructionFound: false,
      enhancedInstructionFound: false,
      deltaFound: false,
      percentageFound: false
    };

    for (const log of capturedLogs) {
      if (log.includes('Story context section:')) {
        tokenMetrics.storyContextFound = true;
        console.log(`✅ Story context metrics logged: ${log.substring(log.indexOf(':'))}`);
      }
      if (log.includes('Base (without story context):')) {
        tokenMetrics.baseInstructionFound = true;
        console.log(`✅ Base instruction metrics logged: ${log.substring(log.indexOf(':'))}`);
      }
      if (log.includes('Enhanced (with story context):')) {
        tokenMetrics.enhancedInstructionFound = true;
        console.log(`✅ Enhanced instruction metrics logged: ${log.substring(log.indexOf(':'))}`);
      }
      if (log.includes('Delta (impact of story context):')) {
        tokenMetrics.deltaFound = true;
        console.log(`✅ Delta metrics logged: ${log.substring(log.indexOf(':'))}`);
      }
      if (log.includes('Percentage increase:')) {
        tokenMetrics.percentageFound = true;
        console.log(`✅ Percentage increase logged: ${log.substring(log.indexOf(':'))}`);
      }
    }

    console.log('');
    const allMetricsFound = Object.values(tokenMetrics).every(v => v);
    if (allMetricsFound) {
      console.log('🎉 ALL TOKEN TRACKING METRICS VALIDATED!');
    } else {
      console.log('⚠️  Some token tracking metrics missing:');
      for (const [metric, found] of Object.entries(tokenMetrics)) {
        if (!found) {
          console.log(`   ❌ ${metric}`);
        }
      }
    }

    console.log('');
    console.log('🔍 Test 4: Checking for story context in system instruction...');

    const hasStoryContextMarker = capturedLogs.some(log =>
      log.includes('[with episode context]') ||
      log.includes('Story context integrated')
    );

    if (hasStoryContextMarker) {
      console.log('✅ Story context was successfully integrated into prompt generation');
    } else {
      console.log('❌ Story context integration marker not found');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    return allMetricsFound && hasStoryContextMarker;

  } catch (error) {
    console.log = originalLog; // Restore in case of error
    console.error('');
    console.error('❌ TEST FAILED WITH ERROR:');
    console.error(error);
    return false;
  }
}

// Run the test
testPromptGenerationWithContext()
  .then((success) => {
    console.log('');
    if (success) {
      console.log('✅ All tests passed! Task 3.0 token tracking is working correctly.');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Review the output above.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
