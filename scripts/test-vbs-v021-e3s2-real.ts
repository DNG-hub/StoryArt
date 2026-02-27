/**
 * Test v0.21 VBS Pipeline with Real Episode 3 Scene 2 Data
 *
 * Loads actual e3s2 context and beat analysis, runs full four-phase pipeline.
 *
 * Usage: npx tsx scripts/test-vbs-v021-e3s2-real.ts
 */

import * as fs from 'fs';
import type { AnalyzedEpisode, EnhancedEpisodeContext } from '../types';
import { generateSwarmUiPrompts } from '../services/promptGenerationService';

/**
 * Create a realistic beat analysis for Scene 2 from script
 */
function createE3S2BeatAnalysis(): AnalyzedEpisode {
  return {
    episodeNumber: 3,
    title: "The Shepherd's Past",
    scenes: [
      {
        sceneNumber: 2,
        title: 'The Safehouse',
        metadata: {
          targetDuration: '5:30-7:00',
          sceneRole: 'exposition-dialogue',
          timing: 'night',
          adBreak: false,
        },
        beats: [
          {
            beatId: 's2-b1',
            beat_script_text:
              'Cat and Daniel descend the reinforced staircase into The Silo. Daniel unlocks the bulkhead with his biometric palm signature.',
            visualSignificance: 'High',
            imageDecision: {
              type: 'NEW_IMAGE',
              reason: 'Establishing the hidden safehouse entrance and reveal',
            },
            cameraAngleSuggestion: 'wide establishing shot',
            characterPositioning: 'Both walking down industrial concrete stairs, Daniel ahead slightly',
            locationAttributes: [
              'reinforced blast door with biometric scanner',
              'industrial concrete walls',
              'exposed electrical conduit piping',
            ],
            charactersPresent: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
          },
          {
            beatId: 's2-b2',
            beat_script_text:
              'The main chamber opens before them. Surveillance monitors glow with live feeds from the city above. Weapon racks line the walls. Daniel watches Cat\'s reaction as she takes in the scope of his preparation.',
            visualSignificance: 'High',
            imageDecision: {
              type: 'NEW_IMAGE',
              reason: 'Interior reveal of the command center and weapons',
            },
            cameraAngleSuggestion: 'medium wide shot sweeping the chamber',
            characterPositioning: 'Cat center examining the space, Daniel left observing her',
            locationAttributes: [
              'bank of surveillance monitors displaying city thermal feeds',
              'weapon racks organized by caliber',
              'server farm humming in corner',
              'military-grade communications equipment',
              'map wall with pinned locations',
            ],
          },
          {
            beatId: 's2-b3',
            beat_script_text:
              '"Three years", Daniel says quietly. "Everything you see was built in the dark. Every wire, every circuit." Cat runs her fingers across a shelf of organized medical supplies, scanning labels with clinical precision.',
            visualSignificance: 'Medium',
            imageDecision: {
              type: 'NEW_IMAGE',
              reason: 'Character moment of revelation and trust',
            },
            cameraAngleSuggestion: 'intimate two-shot',
            characterPositioning: 'Daniel center standing proud, Cat right examining medical supplies',
            locationAttributes: [
              'organized racks of medical supplies',
              'amber work lights mixed with cold fluorescent strips',
              'stainless steel medical workbench',
            ],
          },
          {
            beatId: 's2-b4',
            beat_script_text:
              'Daniel opens the door to the automated surgical suite. State-of-the-art equipment. Sterile. Ready. "I kept you alive for three years in the field. I never planned to stop."',
            visualSignificance: 'High',
            imageDecision: {
              type: 'NEW_IMAGE',
              reason: 'The surgical suite reveal and emotional crescendo',
            },
            cameraAngleSuggestion: 'medium close-up of Daniel\'s face',
            characterPositioning: 'Daniel right profile, surgical suite glowing behind him',
            locationAttributes: [
              'automated surgical suite with robotic arms',
              'surgical lights casting white glow',
              'sterile stainless steel surfaces',
              'medical monitors displaying readiness',
            ],
          },
          {
            beatId: 's2-b5',
            beat_script_text:
              'Cat turns to face Daniel. "The Shepherd-Actual designation. It pinged the network for eleven seconds during your biometric scan." Daniel\'s face hardens. The implications cascade through the room.',
            visualSignificance: 'High',
            imageDecision: {
              type: 'NEW_IMAGE',
              reason: 'Critical tension escalation and vulnerability reveal',
            },
            cameraAngleSuggestion: 'close-up shot between them',
            characterPositioning: 'Both facing each other, intense eye contact',
            locationAttributes: ['surveillance monitors flickering', 'red alert light beginning to pulse'],
          },
          {
            beatId: 's2-b6',
            beat_script_text:
              'Daniel walks to the master breaker. His hand hovers over it. "If they know this location exists, it\'s already compromised." He pulls the switch. All external communications go dark. The silo goes silent except for the hum of independent power.',
            visualSignificance: 'High',
            imageDecision: {
              type: 'NEW_IMAGE',
              reason: 'Action decision and tactical isolation',
            },
            cameraAngleSuggestion: 'wide shot as lights flicker',
            characterPositioning: 'Daniel at breaker panel, Cat watching from across the chamber',
            locationAttributes: [
              'master breaker panel with heavy switches',
              'red emergency indicators going dark',
              'surveillance screens going black',
              'generator hum becoming the only sound',
            ],
          },
          {
            beatId: 's2-b7',
            beat_script_text:
              'In the sudden darkness and silence, Cat and Daniel stand alone in the bunker they\'ve inherited. The only light now is the amber work lights casting long shadows. Emergency autonomous systems maintain minimal illumination.',
            visualSignificance: 'Medium',
            imageDecision: {
              type: 'NEW_IMAGE',
              reason: 'Moment of isolation and new beginning',
            },
            cameraAngleSuggestion: 'wide establishing with minimal light',
            characterPositioning: 'Both silhouettes in amber light, standing in the center of the chamber',
            locationAttributes: [
              'ambient amber work lights',
              'minimal emergency lighting',
              'deep underground silence',
              'independent systems humming softly',
            ],
          },
        ],
      },
    ],
  };
}

async function runE3S2V021Test() {
  console.log('\n' + '='.repeat(90));
  console.log('🎬 v0.21 VBS Pipeline - Episode 3 Scene 2 (REAL DATA)');
  console.log('='.repeat(90) + '\n');

  try {
    // Load e3s2 context JSON
    console.log('📂 Loading Episode 3 Scene 2 context...');
    const contextPath = './test_e3s2_context.json';
    if (!fs.existsSync(contextPath)) {
      throw new Error(`Context file not found: ${contextPath}`);
    }

    const contextJson = fs.readFileSync(contextPath, 'utf-8');
    const episodeContext: EnhancedEpisodeContext = JSON.parse(contextJson);

    console.log(`✅ Loaded: ${episodeContext.episode.episode_title}`);
    console.log(`   Characters: ${episodeContext.episode.characters.map(c => c.character_name).join(', ')}`);
    console.log(`   Scene 2: "${episodeContext.episode.scenes[0].scene_title}"`);
    console.log();

    // Create beat analysis
    console.log('📖 Creating beat analysis for Scene 2...');
    const analyzedEpisode = createE3S2BeatAnalysis();
    const scene2 = analyzedEpisode.scenes[0];

    console.log(`✅ Created: ${scene2.beats.length} beats`);
    scene2.beats.slice(0, 3).forEach(b => console.log(`   - ${b.beatId}: ${b.beat_script_text.substring(0, 60)}...`));
    console.log();

    // Run v0.21 pipeline
    console.log('🚀 Running v0.21 VBS Pipeline...');
    console.log('   Phase A: Deterministic Enrichment (VBS building)');
    console.log('   Phase B: LLM Fill-In (Gemini composition/action/expression)');
    console.log('   Phase C: Prompt Compilation (deterministic assembly)');
    console.log('   Phase D: Validation & Repair (auto-fix if needed)\n');

    const styleConfig = {
      model: 'FLUX.1-dev',
      cinematicAspectRatio: '16:9',
      verticalAspectRatio: '9:16',
    };

    const startTime = Date.now();

    const results = await generateSwarmUiPrompts(
      analyzedEpisode,
      contextJson,
      styleConfig,
      'database',
      'e3s2-test',
      'gemini',
      (msg: string) => console.log(`   ℹ️  ${msg}`),
      'v021' // Enable v0.21 pipeline
    );

    const duration = Date.now() - startTime;

    // Display results
    console.log('\n' + '='.repeat(90));
    console.log('📊 RESULTS - Generated Prompts');
    console.log('='.repeat(90) + '\n');

    for (let i = 0; i < results.length; i++) {
      const beatPrompt = results[i];
      const beat = scene2.beats[i];
      const prompt = beatPrompt.cinematic.prompt;
      const tokens = Math.ceil(prompt.replace(/<segment:[^>]+>/g, '').length / 4);

      console.log(`\n[${'─'.repeat(85)}]`);
      console.log(`Beat ${beatPrompt.beatId} (${beat.beat_script_text.substring(0, 65)}...)`);
      console.log('─'.repeat(90));

      if (beatPrompt.vbs) {
        const vbs = beatPrompt.vbs;
        console.log(
          `📐 VBS: Model=${vbs.modelRoute} | Template=${vbs.templateType} | Chars=${vbs.subjects.length}`
        );
        vbs.subjects.forEach(s => {
          console.log(
            `   • ${s.characterName}: ${s.helmetState}, faceVisible=${s.faceVisible}, loRA=${s.loraTrigger}`
          );
        });
        console.log(
          `📊 Tokens: Budget=${vbs.constraints.tokenBudget.total} | Actual=${tokens} | Status=${tokens <= vbs.constraints.tokenBudget.total ? '✅' : '⚠️'}`
        );
      }

      console.log('\n🎨 FLUX Prompt:');
      console.log(prompt);

      if (beatPrompt.validation) {
        const status = beatPrompt.validation.warnings.length === 0 ? '✅ PASS' : '⚠️ WARNINGS';
        console.log(`\n✔️ Validation: ${status}`);
        if (beatPrompt.validation.warnings.length > 0) {
          beatPrompt.validation.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(90));
    console.log(`✅ PIPELINE COMPLETE`);
    console.log('─'.repeat(90));
    console.log(`Total Beats: ${results.length}`);
    console.log(`Successful Prompts: ${results.filter(r => r.cinematic.prompt.length > 0).length}`);
    console.log(`Total Time: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`Avg Time/Beat: ${(duration / results.length).toFixed(0)}ms`);
    console.log('='.repeat(90) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run test
runE3S2V021Test().catch(console.error);
