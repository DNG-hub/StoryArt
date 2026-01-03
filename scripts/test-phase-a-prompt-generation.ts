/**
 * Phase A Prompt Generation Test
 *
 * Generates 1-2 actual prompts using the full Phase A pipeline with real database data.
 * Compares against what the prompts would look like without Phase A.
 *
 * Usage: npx tsx scripts/test-phase-a-prompt-generation.ts
 */

import dotenv from 'dotenv';
import { generateSwarmUiPrompts } from '../services/promptGenerationService';
import type { AnalyzedEpisode, EpisodeStyleConfig } from '../types';

dotenv.config();

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

// Sample analyzed episode with 1 beat for testing
const testEpisode: AnalyzedEpisode = {
  episodeNumber: 1,
  episodeTitle: "The Reckoning",
  episodeSummary: "Cat investigates NHIA Facility 7",
  totalBeats: 1,
  scenes: [
    {
      sceneNumber: 1,
      sceneTitle: "Facility Investigation",
      sceneSummary: "Cat examines evidence at abandoned facility",
      totalBeats: 1,
      location: {
        name: "NHIA Facility 7",
        description: "Abandoned CDC facility",
        visual_description: "",
        atmosphere: "Tense, abandoned",
        key_features: "Server rooms, emergency lighting",
        artifacts: []
      },
      beats: [
        {
          beatId: "s1-b1",
          sceneNumber: 1,
          beatNumber: 1,
          core_action: "Cat examines scattered evidence with professional focus",
          beat_script_text: "Cat methodically examines the scattered evidence, her medical training evident in every precise movement.",
          visual_anchor: "Cat examining evidence",
          central_character: {
            character_name: "Catherine 'Cat' Mitchell",
            base_trigger: "JRUMLV woman",
            visual_description: "Athletic woman in tactical gear",
            location_context: {
              location_name: "NHIA Facility 7",
              swarmui_prompt_override: "",
              physical_description: "",
              clothing_description: "",
              demeanor_description: "",
              temporal_context: "POST_COLLAPSE",
              lora_weight_adjustment: 1.0
            }
          },
          supporting_characters: [],
          locationAttributes: ["damaged", "emergency_lighting", "abandoned_equipment"],
          styleGuide: {
            camera: "medium shot, shallow depth of field",
            lighting: "dramatic rim lighting, high contrast",
            environmentFX: "volumetric dust, desaturated color grade",
            atmosphere: "tense, investigative"
          },
          imageDecision: {
            type: "NEW_IMAGE",
            reasoning: "Establishing shot of Cat investigating"
          }
        }
      ]
    }
  ]
};

const episodeContextJson = JSON.stringify({
  episode_number: 1,
  episode_title: "The Reckoning",
  episode_summary: "Investigation begins",
  scenes: [
    {
      scene_number: 1,
      scene_title: "Facility Investigation",
      location: {
        name: "NHIA Facility 7"
      }
    }
  ]
});

const styleConfig: EpisodeStyleConfig = {
  model: "flux1-dev-fp8.safetensors",
  aspectRatios: {
    cinematic: { width: 1344, height: 768 },
    vertical: { width: 768, height: 1344 }
  }
};

async function testPhaseAPromptGeneration() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Phase A Prompt Generation Test                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Generating prompts with Phase A (real database data)...');
  console.log('');

  try {
    // Generate prompts with Phase A enhancement (database mode)
    const prompts = await generateSwarmUiPrompts(
      testEpisode,
      episodeContextJson,
      styleConfig,
      'database', // Use database retrieval mode for Phase A
      CAT_DANIEL_STORY_ID,
      'gemini',
      (msg) => console.log(`  ${msg}`)
    );

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 PHASE A PROMPT GENERATION RESULTS');
    console.log('');

    if (prompts.length === 0) {
      console.log('❌ No prompts generated');
      return;
    }

    const beat = prompts[0];
    console.log(`Beat ID: ${beat.beatId}`);
    console.log('');

    console.log('CINEMATIC PROMPT (16:9):');
    console.log('─'.repeat(60));
    console.log(beat.cinematic.prompt.substring(0, 500));
    if (beat.cinematic.prompt.length > 500) {
      console.log(`... (${beat.cinematic.prompt.length - 500} more chars)`);
    }
    console.log('');
    console.log(`Total Length: ${beat.cinematic.prompt.length} chars`);
    console.log('');

    console.log('MARKETING VERTICAL PROMPT (9:16):');
    console.log('─'.repeat(60));
    console.log(beat.marketingVertical.prompt.substring(0, 500));
    if (beat.marketingVertical.prompt.length > 500) {
      console.log(`... (${beat.marketingVertical.prompt.length - 500} more chars)`);
    }
    console.log('');
    console.log(`Total Length: ${beat.marketingVertical.prompt.length} chars`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Phase A prompt generation complete');
    console.log('');
    console.log('KEY INDICATORS TO CHECK:');
    console.log('  - Character name/age present? (Cat, 32)');
    console.log('  - Detailed clothing? (MultiCam tactical pants, tactical vest)');
    console.log('  - Location visual description? (ghost town, emergency lights)');
    console.log('  - Artifacts mentioned? (SledBed prototype, server racks)');
    console.log('  - Theme integration? (truth, investigation, moral stakes)');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run test
testPhaseAPromptGeneration()
  .then(() => {
    console.log('✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
