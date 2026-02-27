/**
 * Test v0.21 VBS Pipeline with Mocked Context
 *
 * This test completely mocks the episode context to verify the four-phase pipeline
 * works correctly without database dependencies.
 *
 * Usage: npx tsx scripts/test-vbs-v021-mock.ts
 */

import type { AnalyzedEpisode, EnhancedEpisodeContext } from '../types';
import { generateSwarmUiPrompts } from '../services/promptGenerationService';

// Create mock episode context for testing
function createMockEpisodeContext(): EnhancedEpisodeContext {
  return {
    episode: {
      episode_number: 3,
      episode_title: 'The Vault',
      episode_summary: 'Cat and Daniel infiltrate the vault.',
      story_context: 'Secret agent story in cyberpunk setting',
      narrative_tone: 'tense, dramatic, action-packed',
      core_themes: 'trust, deception, loyalty',
      characters: [
        {
          character_name: 'Cat',
          aliases: ['The Cat'],
          base_trigger: 'JRUMLV',
          visual_description: 'Agile operative with tactical gear',
          location_contexts: [
            {
              location_name: 'Vault Corridor',
              physical_description: 'sleek, athletic frame',
              clothing_description: 'skin-tight matte charcoal-black Aegis suit',
              demeanor_description: 'focused, alert',
              swarmui_prompt_override: '<segment:JRUMLV,0,0,0.5,1> skin-tight matte charcoal-black Aegis suit with hexagonal weave pattern, molded chest armor plates, LED underglow',
              lora_weight_adjustment: 1.2,
              helmet_fragment_off: 'dark sleek hair, alert expression',
              helmet_fragment_visor_up: 'visor raised, face visible, determined eyes',
              helmet_fragment_visor_down: 'visor down, matte dark opaque faceplate',
              face_segment_rule: 'IF_FACE_VISIBLE',
              context_phase: 'default',
              phase_trigger_text: 'Standard infiltration appearance',
            },
          ],
        },
        {
          character_name: 'Daniel',
          aliases: ['Danny'],
          base_trigger: 'HSCEIA',
          visual_description: 'Tactical specialist with precision focus',
          location_contexts: [
            {
              location_name: 'Vault Corridor',
              physical_description: 'muscular, poised frame',
              clothing_description: 'skin-tight matte charcoal-black Aegis suit',
              demeanor_description: 'calm, methodical',
              swarmui_prompt_override: '<segment:HSCEIA,0.5,0,1,1> skin-tight matte charcoal-black Aegis suit with hexagonal weave pattern, molded chest armor plates, LED underglow',
              lora_weight_adjustment: 1.1,
              helmet_fragment_off: 'close-cropped dark hair, intense focus',
              helmet_fragment_visor_up: 'visor raised, sharp eyes, calculating gaze',
              helmet_fragment_visor_down: 'visor down, matte dark opaque faceplate',
              face_segment_rule: 'IF_FACE_VISIBLE',
              context_phase: 'default',
              phase_trigger_text: 'Standard infiltration appearance',
            },
          ],
        },
      ],
      scenes: [
        {
          scene_number: 2,
          scene_title: 'Vault Approach',
          scene_summary: 'Infiltration sequence',
          roadmap_location: 'Secure Facility',
          location: {
            id: 'loc-vault',
            name: 'Vault Corridor',
            description: 'Underground vault approach',
            visual_description: 'reinforced steel corridors with red emergency lighting',
            atmosphere: 'tense, industrial',
            atmosphere_category: 'underground',
            geographical_location: 'beneath metropolis',
            time_period: 'future',
            cultural_context: 'corporate security infrastructure',
            key_features: 'vault door, security panels, containment',
            visual_reference_url: 'https://example.com/vault.jpg',
            significance_level: 'critical',
            artifacts: [
              {
                artifact_name: 'Reinforced Vault Door',
                artifact_type: 'STRUCTURAL',
                description: 'Massive steel vault entrance',
                swarmui_prompt_fragment: 'massive reinforced steel vault door with biometric locks',
                always_present: true,
                scene_specific: false,
              },
              {
                artifact_name: 'Red Security Lighting',
                artifact_type: 'LIGHTING',
                description: 'Emergency alert lighting',
                swarmui_prompt_fragment: 'red emergency lighting casting ominous shadows',
                always_present: true,
                scene_specific: true,
              },
              {
                artifact_name: 'Security Panel',
                artifact_type: 'PROP',
                description: 'Access control panel',
                swarmui_prompt_fragment: 'illuminated security panel with LED indicators',
                always_present: true,
                scene_specific: false,
              },
            ],
          },
          character_appearances: [
            {
              character_name: 'Cat',
              location_context: {
                location_name: 'Vault Corridor',
                physical_description: 'sleek, athletic',
                clothing_description: 'Aegis suit',
                demeanor_description: 'focused',
                swarmui_prompt_override: '<segment:JRUMLV,0,0,0.5,1> Aegis suit',
                temporal_context: 'POST_COLLAPSE',
                lora_weight_adjustment: 1.2,
                helmet_fragment_off: 'dark sleek hair, alert',
                helmet_fragment_visor_up: 'visor raised, determined',
                helmet_fragment_visor_down: 'visor down',
                face_segment_rule: 'IF_FACE_VISIBLE',
                context_phase: 'default',
              },
            },
            {
              character_name: 'Daniel',
              location_context: {
                location_name: 'Vault Corridor',
                physical_description: 'muscular, poised',
                clothing_description: 'Aegis suit',
                demeanor_description: 'calm',
                swarmui_prompt_override: '<segment:HSCEIA,0.5,0,1,1> Aegis suit',
                temporal_context: 'POST_COLLAPSE',
                lora_weight_adjustment: 1.1,
                helmet_fragment_off: 'close-cropped dark hair',
                helmet_fragment_visor_up: 'visor raised, sharp',
                helmet_fragment_visor_down: 'visor down',
                face_segment_rule: 'IF_FACE_VISIBLE',
                context_phase: 'default',
              },
            },
          ],
        },
      ],
    },
  };
}

// Create mock analyzed episode
function createMockAnalyzedEpisode(): AnalyzedEpisode {
  return {
    episodeNumber: 3,
    title: 'The Vault',
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
            beat_script_text: 'Cat and Daniel approach the vault entrance from the corridor shadows, visors up and ready.',
            visualSignificance: 'High',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Establishing shot of vault approach' },
            cameraAngleSuggestion: 'wide shot',
            characterPositioning: 'Cat front-left, Daniel front-right, both walking forward',
            locationAttributes: ['reinforced vault door', 'red security lighting'],
          },
          {
            beatId: 's3-b2',
            beat_script_text: 'Daniel examines the security panel while Cat covers the corridor, weapons drawn.',
            visualSignificance: 'High',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Focus on tactical work' },
            cameraAngleSuggestion: 'medium close-up',
            characterPositioning: 'Daniel at panel center, Cat left side alert',
            locationAttributes: ['illuminated security panel with LED indicators'],
          },
          {
            beatId: 's3-b3',
            beat_script_text: 'Alarms trigger red flashing - both operatives draw weapons and prepare to breach.',
            visualSignificance: 'High',
            imageDecision: { type: 'NEW_IMAGE', reason: 'Action escalation - alarm triggered' },
            cameraAngleSuggestion: 'close-up shot',
            characterPositioning: 'Both center frame, weapons ready, visors slamming down',
            locationAttributes: ['massive vault door with biometric locks'],
          },
        ],
      },
    ],
  };
}

async function runMockPipelineTest() {
  console.log('\n' + '='.repeat(80));
  console.log('v0.21 VBS Pipeline - Mock Context Test');
  console.log('='.repeat(80) + '\n');

  try {
    // Create mock data
    const episodeContext = createMockEpisodeContext();
    const analyzedEpisode = createMockAnalyzedEpisode();

    console.log('✅ Created mock episode context and analysis');
    console.log(`   Episode: ${episodeContext.episode.episode_title}`);
    console.log(`   Characters: ${episodeContext.episode.characters.map(c => c.character_name).join(', ')}`);
    console.log(`   Scene 2 Beats: ${analyzedEpisode.scenes[0].beats.length}`);
    console.log();

    // Run v0.21 pipeline
    console.log('🚀 Running v0.21 VBS Pipeline...');
    console.log('   Phase A: Deterministic Enrichment');
    console.log('   Phase B: LLM Fill-In (Gemini)');
    console.log('   Phase C: Prompt Compilation');
    console.log('   Phase D: Validation & Repair\n');

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
      'mock-story-id',
      'gemini',
      (msg: string) => console.log(`   ℹ️  ${msg}`),
      'v021' // Enable v0.21 pipeline
    );

    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('RESULTS - Generated Prompts');
    console.log('='.repeat(80) + '\n');

    for (const beatPrompt of results) {
      const prompt = beatPrompt.cinematic.prompt;
      const tokens = Math.ceil(prompt.replace(/<segment:[^>]+>/g, '').length / 4);

      console.log(`📷 Beat ${beatPrompt.beatId}`);
      console.log('─'.repeat(60));

      if (beatPrompt.vbs) {
        console.log(`Model Route: ${beatPrompt.vbs.modelRoute}`);
        console.log(`Characters: ${beatPrompt.vbs.subjects.map(s => `${s.characterName} (${s.helmetState})`).join(', ')}`);
        console.log(`Token Budget: ${beatPrompt.vbs.constraints.tokenBudget.total} | Actual: ${tokens}`);
      }

      console.log('\nFLUX Prompt:');
      console.log(prompt);

      if (beatPrompt.validation) {
        console.log(`\n✅ Validation: ${beatPrompt.validation.warnings.length === 0 ? 'PASS' : 'WARNINGS'}`);
        beatPrompt.validation.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
      }
      console.log('\n');
    }

    console.log('='.repeat(80));
    console.log(`✅ Pipeline Complete! Generated ${results.length} prompts`);
    console.log('='.repeat(80) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run test
runMockPipelineTest().catch(console.error);
