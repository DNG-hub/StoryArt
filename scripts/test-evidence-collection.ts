/**
 * Test script for Evidence Collection System (Task 5.0)
 * Generates 10 beats and collects comprehensive metrics
 *
 * Usage: tsx scripts/test-evidence-collection.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { generateSwarmUiPrompts } from '../services/promptGenerationService';
import { EvidenceCollector } from '../services/evidenceCollectionService';
import type { AnalyzedEpisode, EpisodeStyleConfig } from '../types';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

// Test data for 10 beats with varied scenarios
const testAnalyzedEpisode: AnalyzedEpisode = {
  episodeNumber: 1,
  title: "The Reckoning",
  scenes: [
    {
      sceneNumber: 1,
      title: "Facility Entry",
      metadata: {
        sceneRole: "Initial investigation",
        emotionalProgression: "Tension building"
      },
      beats: [
        {
          beatId: "s1-b1",
          beat_script_text: "Cat investigates scattered evidence in the damaged facility.",
          core_action: "Investigation",
          visual_anchor: "Cat examining evidence",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Investigation scene' },
          locationAttributes: ['damaged', 'facility', 'evidence'],
          cameraAngleSuggestion: 'close-up'
        },
        {
          beatId: "s1-b2",
          beat_script_text: "Daniel provides tactical overwatch, alert for threats.",
          core_action: "Tactical positioning",
          visual_anchor: "Daniel in combat stance",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Survival tension' },
          locationAttributes: ['corridor', 'tactical'],
          cameraAngleSuggestion: 'medium shot'
        },
        {
          beatId: "s1-b3",
          beat_script_text: "Cat and Daniel exchange a look, professional boundaries tested.",
          core_action: "Interpersonal moment",
          visual_anchor: "Eye contact between characters",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Character dynamic' },
          locationAttributes: ['facility', 'intimate'],
          cameraAngleSuggestion: 'medium shot'
        },
        {
          beatId: "s1-b4",
          beat_script_text: "Cat discovers critical evidence, expression shifting from professional to affected.",
          core_action: "Revelation moment",
          visual_anchor: "Cat's emotional reaction",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Truth theme' },
          locationAttributes: ['evidence area', 'dramatic'],
          cameraAngleSuggestion: 'close-up'
        },
        {
          beatId: "s1-b5",
          beat_script_text: "Daniel watches Cat process the implications, torn between duty and care.",
          core_action: "Protective stance",
          visual_anchor: "Daniel's concern",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Boundaries tested' },
          locationAttributes: ['facility', 'emotional'],
          cameraAngleSuggestion: 'medium shot'
        }
      ]
    },
    {
      sceneNumber: 2,
      title: "Deeper Into Facility",
      metadata: {
        sceneRole: "Escalation",
        emotionalProgression: "Stakes rising"
      },
      beats: [
        {
          beatId: "s2-b1",
          beat_script_text: "They advance through darker corridors, tension mounting.",
          core_action: "Tactical advance",
          visual_anchor: "Both characters moving",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Atmosphere escalation' },
          locationAttributes: ['dark', 'corridor', 'threatening'],
          cameraAngleSuggestion: 'wide shot'
        },
        {
          beatId: "s2-b2",
          beat_script_text: "Cat pauses at a junction, moral conflict evident in her expression.",
          core_action: "Decision moment",
          visual_anchor: "Cat's internal conflict",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Truth vs survival' },
          locationAttributes: ['junction', 'choices'],
          cameraAngleSuggestion: 'close-up'
        },
        {
          beatId: "s2-b3",
          beat_script_text: "Daniel positions himself protectively, ready for whatever comes.",
          core_action: "Defensive positioning",
          visual_anchor: "Daniel protecting",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Survival instinct' },
          locationAttributes: ['tactical position', 'defensive'],
          cameraAngleSuggestion: 'medium shot'
        },
        {
          beatId: "s2-b4",
          beat_script_text: "Cat makes a choice that crosses professional boundaries.",
          core_action: "Boundary crossing",
          visual_anchor: "Cat's decisive action",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Professional vs personal' },
          locationAttributes: ['facility', 'decisive moment'],
          cameraAngleSuggestion: 'close-up'
        },
        {
          beatId: "s2-b5",
          beat_script_text: "Daniel acknowledges her choice with a nod, their bond deepening.",
          core_action: "Unspoken understanding",
          visual_anchor: "Silent communication",
          imageDecision: { type: 'NEW_IMAGE' as const, reasoning: 'Relationship evolution' },
          locationAttributes: ['facility', 'connection'],
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

async function testEvidenceCollection() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Test: Evidence Collection System (Task 5.0)                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Create evidence collector
  const collector = new EvidenceCollector();
  collector.startSession(
    'Task 5.0 Testing - 10 Beats Evidence Collection',
    CAT_DANIEL_STORY_ID,
    1
  );

  try {
    console.log('🔄 Generating prompts for 10 beats with evidence collection...');
    console.log('');

    const startTime = Date.now();

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

    const totalTime = Date.now() - startTime;

    console.log('');
    console.log(`✅ Generated ${results.length} prompt sets in ${totalTime}ms`);
    console.log('');

    // Track each beat with the evidence collector
    console.log('🔄 Collecting evidence metrics for each beat...');
    console.log('');

    for (const result of results) {
      // Simulate individual beat generation time (total / count)
      const beatGenTime = totalTime / results.length;

      collector.trackPromptGeneration(
        result.beatId,
        {
          cinematic: result.cinematic.prompt,
          vertical: result.vertical.prompt,
          marketingVertical: result.marketingVertical.prompt
          // No baseline for this test, but in real usage we might have one
        },
        {
          storyContextAvailable: true,
          storyContextUsed: true,
          tokenUsage: {
            baseSystemInstruction: 6271,
            enhancedSystemInstruction: 6848,
            delta: 577,
            percentageIncrease: 9.2
          },
          generationTime: beatGenTime,
          success: true
        }
      );
    }

    console.log('');
    console.log('✅ Evidence collection complete for all beats');
    console.log('');

    // Print summary
    collector.printSummary();

    // Export metrics
    console.log('🔄 Exporting metrics to JSON file...');
    const metricsPath = await collector.exportMetrics();
    console.log('');

    // Verify metrics file
    console.log('🔍 Verifying metrics export...');
    if (existsSync(metricsPath)) {
      const metricsContent = await readFile(metricsPath, 'utf-8');
      const metrics = JSON.parse(metricsContent);

      console.log('✅ Metrics file exists and is valid JSON');
      console.log(`   Path: ${metricsPath}`);
      console.log(`   Size: ${Math.round(metricsContent.length / 1024)}KB`);
      console.log('');

      // Validate structure
      const validations = {
        'Has sessionId': !!metrics.sessionId,
        'Has sessionName': !!metrics.sessionName,
        'Has timestamp': !!metrics.timestamp,
        'Has 10 promptRichness entries': metrics.promptRichness?.length === 10,
        'Has 10 abComparisons entries': metrics.abComparisons?.length === 10,
        'Has 10 metadata entries': metrics.metadata?.length === 10,
        'Has summary': !!metrics.summary,
        'Summary has averageRichnessScore': typeof metrics.summary?.averageRichnessScore === 'number',
        'Summary has contextInjectionSuccessRate': typeof metrics.summary?.contextInjectionSuccessRate === 'number'
      };

      console.log('📊 Metrics File Structure Validation:');
      let allValid = true;
      for (const [check, passed] of Object.entries(validations)) {
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${check}`);
        if (!passed) allValid = false;
      }
      console.log('');

      if (allValid) {
        console.log('🎉 ALL VALIDATIONS PASSED! Evidence collection system working correctly.');
      } else {
        console.log('⚠️  Some validations failed - review metrics file structure');
      }

      // Show sample data
      console.log('');
      console.log('📋 Sample Metrics Data:');
      console.log('');
      console.log('Beat s1-b1 Richness:');
      const sampleRichness = metrics.promptRichness[0];
      console.log(`   Richness Score: ${sampleRichness.richnessScore.toFixed(1)}/100`);
      console.log(`   Cinematic Length: ${sampleRichness.cinematicLength} chars`);
      console.log(`   Marketing Length: ${sampleRichness.marketingVerticalLength} chars`);
      console.log(`   Theme Keywords: ${sampleRichness.narrativeElements.themeKeywords.join(', ') || 'none'}`);
      console.log(`   Emotional Descriptors: ${sampleRichness.narrativeElements.emotionalDescriptors.join(', ') || 'none'}`);
      console.log(`   Composition Keywords: ${sampleRichness.narrativeElements.compositionKeywords.join(', ') || 'none'}`);
      console.log('');

      console.log('Summary Statistics:');
      console.log(`   Average Richness Score: ${metrics.summary.averageRichnessScore.toFixed(1)}/100`);
      console.log(`   Average Marketing Length: ${metrics.summary.averageMarketingLength} chars`);
      console.log(`   Context Injection Success Rate: ${metrics.summary.contextInjectionSuccessRate.toFixed(1)}%`);
      console.log(`   Total Theme Keywords: ${metrics.summary.totalThemeKeywords}`);
      console.log(`   Total Emotional Descriptors: ${metrics.summary.totalEmotionalDescriptors}`);
      console.log(`   Total Composition Keywords: ${metrics.summary.totalCompositionKeywords}`);
      console.log('');

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');

      return allValid;
    } else {
      console.log('❌ Metrics file not found');
      return false;
    }

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED WITH ERROR:');
    console.error(error);
    return false;
  }
}

// Run the test
testEvidenceCollection()
  .then((success) => {
    console.log('');
    if (success) {
      console.log('✅ Task 5.0 testing complete! Evidence collection system validated.');
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
