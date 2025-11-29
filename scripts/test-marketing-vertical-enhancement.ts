/**
 * Test script for Marketing Vertical Template Optimization (Task 4.0)
 * Tests that marketing vertical prompts include Phase B enhancements
 *
 * Usage: tsx scripts/test-marketing-vertical-enhancement.ts
 */

import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

import { generateSwarmUiPrompts } from '../services/promptGenerationService';
import type { AnalyzedEpisode, EpisodeStyleConfig } from '../types';

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

// Test data for 5 beats with different scenarios
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
          beat_script_text: "Cat moves cautiously through the damaged tactical facility, weapon at ready, investigating evidence.",
          core_action: "Cat investigates with professional focus",
          visual_anchor: "Cat examining evidence",
          imageDecision: {
            type: 'NEW_IMAGE' as const,
            reasoning: 'Investigation scene with moral tension'
          },
          locationAttributes: ['damaged', 'tactical facility', 'interior', 'evidence scattered'],
          cameraAngleSuggestion: 'close-up'
        },
        {
          beatId: "s1-b2",
          beat_script_text: "Daniel advances with M4 carbine, alert and focused on potential threats.",
          core_action: "Daniel maintains tactical readiness",
          visual_anchor: "Daniel in combat stance",
          imageDecision: {
            type: 'NEW_IMAGE' as const,
            reasoning: 'Survival tension'
          },
          locationAttributes: ['dark corridor', 'tactical facility', 'threat potential'],
          cameraAngleSuggestion: 'medium shot'
        },
        {
          beatId: "s1-b3",
          beat_script_text: "Cat and Daniel exchange a look, professional boundaries tested by the situation.",
          core_action: "Interpersonal tension moment",
          visual_anchor: "Two characters, emotional connection",
          imageDecision: {
            type: 'NEW_IMAGE' as const,
            reasoning: 'Character relationship dynamic'
          },
          locationAttributes: ['damaged facility', 'intimate moment'],
          cameraAngleSuggestion: 'medium shot'
        },
        {
          beatId: "s1-b4",
          beat_script_text: "Cat discovers critical evidence, expression shifting from professional to personally affected.",
          core_action: "Moment of revelation",
          visual_anchor: "Cat's emotional reaction",
          imageDecision: {
            type: 'NEW_IMAGE' as const,
            reasoning: 'Truth vs survival theme moment'
          },
          locationAttributes: ['evidence area', 'dramatic lighting'],
          cameraAngleSuggestion: 'close-up'
        },
        {
          beatId: "s1-b5",
          beat_script_text: "Daniel provides tactical overwatch while Cat processes the implications.",
          core_action: "Protective stance with emotional subtext",
          visual_anchor: "Daniel protecting, Cat vulnerable",
          imageDecision: {
            type: 'NEW_IMAGE' as const,
            reasoning: 'Professional boundaries + personal care'
          },
          locationAttributes: ['tactical position', 'emotional moment'],
          cameraAngleSuggestion: 'wide shot'
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
      },
      {
        character_name: "Daniel O'Brien",
        aliases: ["Daniel"],
        base_trigger: "HSCEIA man",
        visual_description: "Dark hair, intense gaze, tactical gear"
      }
    ]
  }
}, null, 2);

const testStyleConfig: EpisodeStyleConfig = {
  model: 'flux1-dev-fp8',
  cinematicAspectRatio: '16:9',
  verticalAspectRatio: '9:16'
};

// Marketing optimization keywords to check for
const marketingKeywords = {
  composition: [
    'Rule of Thirds',
    'third of frame',
    'leading lines',
    'depth',
    'negative space',
    'layering',
    'foreground',
    'background'
  ],
  drama: [
    'dramatic',
    'intensity',
    'intensely',
    'thumbnail',
    'high contrast',
    'focal point',
    'visual hierarchy'
  ],
  lighting: [
    'rim light',
    'rim lighting',
    'eye light',
    'dramatic shadows',
    'shadow',
    'contrast'
  ],
  hooks: [
    'determination',
    'tension',
    'moral',
    'professional',
    'investigation',
    'survival',
    'boundaries'
  ]
};

async function testMarketingVerticalEnhancement() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Test: Marketing Vertical Template Optimization (Task 4.0)   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    console.log('📋 Test Configuration:');
    console.log(`   Story ID: ${CAT_DANIEL_STORY_ID}`);
    console.log(`   Beats to generate: ${testAnalyzedEpisode.scenes[0].beats.length}`);
    console.log(`   Retrieval Mode: database (to get story context with Core Themes)`);
    console.log('');

    console.log('🔄 Generating prompts with Phase B marketing enhancements...');
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

    console.log('');
    console.log(`✅ Generated ${results.length} prompt sets`);
    console.log('');

    // Test 1: Verify all beats have marketing verticals
    console.log('🔍 Test 1: Verifying marketing vertical presence...');
    let allHaveMarketing = true;
    for (const result of results) {
      if (!result.marketingVertical) {
        console.log(`❌ Beat ${result.beatId} missing marketing vertical`);
        allHaveMarketing = false;
      } else if (!result.marketingVertical.prompt) {
        console.log(`❌ Beat ${result.beatId} has marketing vertical but no prompt text`);
        allHaveMarketing = false;
      }
    }

    if (allHaveMarketing) {
      console.log(`✅ All ${results.length} beats have marketing vertical prompts`);
    }
    console.log('');

    // Test 2: Analyze marketing vertical prompts for optimization keywords
    console.log('🔍 Test 2: Analyzing marketing optimization keywords...');
    console.log('');

    const keywordStats = {
      composition: 0,
      drama: 0,
      lighting: 0,
      hooks: 0
    };

    const beatAnalysis: any[] = [];

    for (const result of results) {
      const prompt = result.marketingVertical?.prompt || '';
      const lowerPrompt = prompt.toLowerCase();

      const foundKeywords = {
        composition: [] as string[],
        drama: [] as string[],
        lighting: [] as string[],
        hooks: [] as string[]
      };

      // Check composition keywords
      for (const keyword of marketingKeywords.composition) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          foundKeywords.composition.push(keyword);
        }
      }
      if (foundKeywords.composition.length > 0) keywordStats.composition++;

      // Check drama keywords
      for (const keyword of marketingKeywords.drama) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          foundKeywords.drama.push(keyword);
        }
      }
      if (foundKeywords.drama.length > 0) keywordStats.drama++;

      // Check lighting keywords
      for (const keyword of marketingKeywords.lighting) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          foundKeywords.lighting.push(keyword);
        }
      }
      if (foundKeywords.lighting.length > 0) keywordStats.lighting++;

      // Check hook keywords (theme-related)
      for (const keyword of marketingKeywords.hooks) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          foundKeywords.hooks.push(keyword);
        }
      }
      if (foundKeywords.hooks.length > 0) keywordStats.hooks++;

      beatAnalysis.push({
        beatId: result.beatId,
        promptLength: prompt.length,
        foundKeywords,
        totalKeywords: foundKeywords.composition.length + foundKeywords.drama.length +
                       foundKeywords.lighting.length + foundKeywords.hooks.length
      });
    }

    // Display results
    console.log('📊 Keyword Coverage Across All Beats:');
    console.log(`   Composition keywords: ${keywordStats.composition}/${results.length} beats`);
    console.log(`   Drama keywords: ${keywordStats.drama}/${results.length} beats`);
    console.log(`   Lighting keywords: ${keywordStats.lighting}/${results.length} beats`);
    console.log(`   Hook keywords (theme): ${keywordStats.hooks}/${results.length} beats`);
    console.log('');

    // Show detailed analysis for each beat
    console.log('📋 Per-Beat Analysis:');
    for (const analysis of beatAnalysis) {
      console.log(`   ${analysis.beatId}:`);
      console.log(`      Length: ${analysis.promptLength} chars`);
      console.log(`      Total optimization keywords: ${analysis.totalKeywords}`);
      if (analysis.foundKeywords.composition.length > 0) {
        console.log(`      Composition: ${analysis.foundKeywords.composition.join(', ')}`);
      }
      if (analysis.foundKeywords.drama.length > 0) {
        console.log(`      Drama: ${analysis.foundKeywords.drama.join(', ')}`);
      }
      if (analysis.foundKeywords.lighting.length > 0) {
        console.log(`      Lighting: ${analysis.foundKeywords.lighting.join(', ')}`);
      }
      if (analysis.foundKeywords.hooks.length > 0) {
        console.log(`      Hooks: ${analysis.foundKeywords.hooks.join(', ')}`);
      }
    }
    console.log('');

    // Test 3: Compare marketing vertical vs standard vertical
    console.log('🔍 Test 3: Comparing marketing vertical vs standard vertical...');
    console.log('');

    for (let i = 0; i < Math.min(2, results.length); i++) {
      const result = results[i];
      console.log(`Beat ${result.beatId}:`);
      console.log(`   Standard Vertical (${result.vertical?.prompt.length} chars):`);
      console.log(`      "${result.vertical?.prompt.substring(0, 150)}..."`);
      console.log(`   Marketing Vertical (${result.marketingVertical?.prompt.length} chars):`);
      console.log(`      "${result.marketingVertical?.prompt.substring(0, 150)}..."`);
      console.log('');
    }

    // Success criteria
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Success Criteria Evaluation:');
    console.log('');

    const criteria = {
      'All beats have marketing verticals': allHaveMarketing,
      'Composition keywords in ≥80% of beats': keywordStats.composition >= results.length * 0.8,
      'Drama keywords in ≥80% of beats': keywordStats.drama >= results.length * 0.8,
      'Lighting keywords in ≥80% of beats': keywordStats.lighting >= results.length * 0.8,
      'Hook keywords in ≥60% of beats': keywordStats.hooks >= results.length * 0.6
    };

    let allPassed = true;
    for (const [criterion, passed] of Object.entries(criteria)) {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${criterion}`);
      if (!passed) allPassed = false;
    }

    console.log('');
    if (allPassed) {
      console.log('🎉 ALL SUCCESS CRITERIA MET! Marketing vertical optimization is working!');
    } else {
      console.log('⚠️  Some criteria not met - review prompts and template');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');

    return allPassed;

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED WITH ERROR:');
    console.error(error);
    return false;
  }
}

// Run the test
testMarketingVerticalEnhancement()
  .then((success) => {
    console.log('');
    if (success) {
      console.log('✅ Task 4.0 testing complete! Marketing vertical optimization validated.');
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
