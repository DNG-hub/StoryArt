/**
 * Test Script: v0.21 VBS Pipeline on Episode 3 Scene 2
 *
 * Runs the complete four-phase VBS compiler-style pipeline:
 * Phase A (Deterministic Enrichment) → Phase B (LLM Fill-In) → Phase C (Compilation) → Phase D (Validation)
 *
 * Usage: npx tsx scripts/test-vbs-v021-e3s2.ts
 */

import { generateSwarmUiPrompts } from '../services/promptGenerationService';
import { generateEnhancedEpisodeContext } from '../services/databaseContextService';
import type { AnalyzedEpisode } from '../types';

const STORY_ID = '5d5a8e85-c01d-4a48-8e0f-24fcc2b5a29e'; // StoryArt story ID
const EPISODE_NUMBER = 3;
const SCENE_NUMBERS = [2]; // Test Scene 2 only

/**
 * Mock analyzed episode for testing (Scene 2 only, 5 beats)
 */
function getMockAnalyzedEpisodeE3S2(): AnalyzedEpisode {
  return {
    episodeNumber: EPISODE_NUMBER,
    title: 'Episode 3: The Vault',
    scenes: [
      {
        sceneNumber: 2,
        title: 'Vault Approach & Infiltration',
        metadata: {
          targetDuration: '4:00-5:30',
          sceneRole: 'action-sequence',
          timing: 'night',
          adBreak: false,
        },
        beats: [
          {
            beatId: 's3-b1',
            beat_script_text: 'Cat and Daniel approach the vault entrance from the corridor shadows.',
            visualSignificance: 'High',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Establishing shot of vault approach' },
            cameraAngleSuggestion: 'wide angle',
            characterPositioning: 'Cat front-left, Daniel front-right',
            locationAttributes: ['reinforced steel vault door', 'red security lighting'],
            phaseTransitions: [{ character: 'Cat', toPhase: 'arrival' }],
          },
          {
            beatId: 's3-b2',
            beat_script_text: 'Daniel examines the security panel while Cat covers the corridor.',
            visualSignificance: 'High',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Character focus on security work' },
            cameraAngleSuggestion: 'medium close-up',
            characterPositioning: 'Daniel center studying panel, Cat left watching',
            locationAttributes: ['security panel with LED indicators'],
          },
          {
            beatId: 's3-b3',
            beat_script_text: 'Alarms trigger - Cat and Daniel prepare to breach.',
            visualSignificance: 'High',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Tension escalation' },
            cameraAngleSuggestion: 'close-up shot',
            characterPositioning: 'Both center-frame, ready stance',
            locationAttributes: ['flashing red alarm lights'],
          },
          {
            beatId: 's3-b4',
            beat_script_text: 'Cat takes point, Daniel provides covering fire.',
            visualSignificance: 'High',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Action beat - breach' },
            cameraAngleSuggestion: 'medium full shot',
            characterPositioning: 'Cat center-left rushing, Daniel right crouched',
            locationAttributes: ['vault door opening'],
          },
          {
            beatId: 's3-b5',
            beat_script_text: 'Interior of vault revealed - target secured.',
            visualSignificance: 'Medium',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Vault interior establishing' },
            cameraAngleSuggestion: 'wide shot',
            characterPositioning: 'Both figures small in large vault interior',
            locationAttributes: ['vault interior shelving', 'security containers'],
          },
        ],
      },
    ],
  };
}

/**
 * Main test function
 */
async function runVBS021Test() {
  console.log('\n' + '='.repeat(80));
  console.log('v0.21 VBS Pipeline Test - Episode 3 Scene 2');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Load episode context from database
    console.log('📚 Loading episode context from database...');
    const episodeContext = await generateEnhancedEpisodeContext(STORY_ID, EPISODE_NUMBER);
    if (!episodeContext) {
      throw new Error('Failed to load episode context');
    }
    console.log(`✅ Episode context loaded: ${episodeContext.episode.episode_title}`);
    console.log(`   Characters: ${episodeContext.episode.characters.map(c => c.character_name).join(', ')}`);
    console.log(`   Scenes: ${episodeContext.episode.scenes.length}`);
    console.log();

    // Step 2: Get analyzed episode (mock for now, or from database)
    console.log('📖 Loading analyzed episode...');
    const analyzedEpisode = getMockAnalyzedEpisodeE3S2();
    console.log(`✅ Analyzed: ${analyzedEpisode.scenes.length} scene(s), ${analyzedEpisode.scenes[0].beats.length} beats in scene 2`);
    console.log();

    // Step 3: Run prompt generation with v0.21 pipeline
    console.log('🚀 Running v0.21 VBS Pipeline...');
    console.log('   Phase A: Deterministic Enrichment');
    console.log('   Phase B: LLM Fill-In (Gemini)');
    console.log('   Phase C: Prompt Compilation');
    console.log('   Phase D: Validation & Repair');
    console.log();

    const styleConfig = {
      model: 'FLUX.1-dev',
      cinematicAspectRatio: '16:9',
      verticalAspectRatio: '9:16',
    };

    const results = await generateSwarmUiPrompts(
      analyzedEpisode,
      JSON.stringify(episodeContext),
      styleConfig,
      'database',
      STORY_ID,
      'gemini',
      (msg: string) => console.log(`   ℹ️  ${msg}`),
      'v021' // Enable v0.21 pipeline
    );

    // Step 4: Display results
    console.log('\n' + '='.repeat(80));
    console.log('RESULTS');
    console.log('='.repeat(80) + '\n');

    for (const beatPrompt of results) {
      console.log(`Beat ${beatPrompt.beatId}:`);
      console.log('─'.repeat(60));

      if (beatPrompt.vbs) {
        console.log(`Model Route: ${beatPrompt.vbs.modelRoute}`);
        console.log(`Subjects: ${beatPrompt.vbs.subjects.map(s => s.characterName).join(', ')}`);
        console.log(`Template: ${beatPrompt.vbs.templateType}`);
        console.log(`Token Budget: ${beatPrompt.vbs.constraints.tokenBudget.total} tokens`);
        console.log();
      }

      const prompt = beatPrompt.cinematic.prompt;
      const tokenCount = Math.ceil(prompt.replace(/<segment:[^>]+>/g, '').length / 4);
      console.log(`FLUX Prompt (${tokenCount} tokens):`);
      console.log(prompt);
      console.log();

      if (beatPrompt.validation) {
        console.log(`Validation: ${beatPrompt.validation.warnings.length === 0 ? '✅ PASS' : '⚠️  WARNINGS'}`);
        if (beatPrompt.validation.warnings.length > 0) {
          beatPrompt.validation.warnings.forEach(w => console.log(`  - ${w}`));
        }
      }
      console.log('\n');
    }

    console.log('='.repeat(80));
    console.log(`✅ v0.21 Pipeline Complete! Generated ${results.length} prompts`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Pipeline Error:', error);
    process.exit(1);
  }
}

// Run test
runVBS021Test().catch(console.error);
