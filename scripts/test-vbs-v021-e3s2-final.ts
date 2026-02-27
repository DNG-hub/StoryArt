/**
 * v0.21 VBS Pipeline - Episode 3 Scene 2 FINAL TEST
 * Complete real data with character integration
 */

import * as fs from 'fs';
import type { AnalyzedEpisode, EnhancedEpisodeContext } from '../types';
import { generateSwarmUiPrompts } from '../services/promptGenerationService';

function createE3S2BeatAnalysisWithCharacters(): AnalyzedEpisode {
  const beats = [
    {
      beatId: 's2-b1',
      beat_script_text: 'Cat and Daniel descend into The Silo. Daniel unlocks the bulkhead with biometric scan.',
      characters: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
    },
    {
      beatId: 's2-b2',
      beat_script_text: 'The surveillance chamber opens. Monitors display feeds. Daniel watches Cat react.',
      characters: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
    },
    {
      beatId: 's2-b3',
      beat_script_text: '"Three years", Daniel says. Cat examines medical supplies systematically.',
      characters: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
    },
    {
      beatId: 's2-b4',
      beat_script_text: 'Daniel opens automated surgical suite. "I kept you alive. I never planned to stop."',
      characters: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
    },
    {
      beatId: 's2-b5',
      beat_script_text: 'Cat reveals: "Shepherd-Actual pinged for eleven seconds." Daniel\'s face hardens.',
      characters: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
    },
    {
      beatId: 's2-b6',
      beat_script_text: 'Daniel walks to master breaker. "It\'s compromised." He cuts external comms.',
      characters: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
    },
    {
      beatId: 's2-b7',
      beat_script_text: 'Darkness. Only amber work lights. The silo goes silent except generator hum.',
      characters: ["Catherine 'Cat' Mitchell", "Daniel O'Brien"],
    },
  ];

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
        beats: beats.map((b, i) => ({
          beatId: b.beatId,
          beat_script_text: b.beat_script_text,
          characters: b.characters,
          visualSignificance: 'High' as const,
          imageDecision: {
            type: 'NEW_IMAGE' as const,
            reason: `Scene beat ${i + 1}`,
          },
          cameraAngleSuggestion: ['wide shot', 'medium wide', 'medium close', 'close-up'][i % 4],
          characterPositioning: `Both characters, beat ${i + 1}`,
          locationAttributes: ['surveillance monitors', 'concrete walls', 'emergency lighting'],
        })),
      },
    ],
  };
}

async function runFinalTest() {
  console.log('\n' + '='.repeat(100));
  console.log('🎬 v0.21 VBS FINAL TEST - Episode 3 Scene 2 (Real Context + Real Beat Analysis)');
  console.log('='.repeat(100) + '\n');

  try {
    // Load real context
    console.log('📂 Loading e3s2 context JSON...');
    const contextJson = fs.readFileSync('./test_e3s2_context.json', 'utf-8');
    const episodeContext: EnhancedEpisodeContext = JSON.parse(contextJson);
    console.log(`✅ Context loaded: ${episodeContext.episode.characters.length} characters`);
    console.log();

    // Create beat analysis
    console.log('📖 Creating beat analysis with character data...');
    const analyzedEpisode = createE3S2BeatAnalysisWithCharacters();
    console.log(`✅ Created: ${analyzedEpisode.scenes[0].beats.length} beats`);
    analyzedEpisode.scenes[0].beats.forEach(b => {
      console.log(`   ${b.beatId}: ${b.characters!.join(', ')}`);
    });
    console.log();

    // Run pipeline
    console.log('🚀 STARTING V0.21 PIPELINE...\n');
    const startTime = Date.now();

    const results = await generateSwarmUiPrompts(
      analyzedEpisode,
      contextJson,
      { model: 'FLUX.1-dev', cinematicAspectRatio: '16:9', verticalAspectRatio: '9:16' },
      'database',
      'e3s2-final',
      'gemini',
      (msg) => console.log(`   ℹ️  ${msg}`),
      'v021'
    );

    const duration = Date.now() - startTime;

    // Display results
    console.log('\n' + '='.repeat(100));
    console.log('📊 RESULTS');
    console.log('='.repeat(100) + '\n');

    results.forEach((beatPrompt, i) => {
      const prompt = beatPrompt.cinematic.prompt;
      const tokens = Math.ceil(prompt.replace(/<segment:[^>]+>/g, '').length / 4);

      console.log(`\nBeat ${beatPrompt.beatId}:`);
      console.log('─'.repeat(100));

      if (beatPrompt.vbs) {
        const { vbs } = beatPrompt;
        console.log(`VBS: Model=${vbs.modelRoute} | Template=${vbs.templateType} | Subjects=${vbs.subjects.length}`);
        vbs.subjects.forEach(s => console.log(`  • ${s.characterName}: LoRA=${s.loraTrigger}`));
        console.log(`Tokens: ${tokens}/${vbs.constraints.tokenBudget.total}`);
      }

      console.log(`\nPrompt (${tokens} tokens):\n${prompt}\n`);
      if (beatPrompt.validation?.warnings.length === 0) console.log('✅ Validation: PASS');
    });

    console.log('\n' + '='.repeat(100));
    console.log(`✅ COMPLETE: ${results.length} beats, ${(duration / 1000).toFixed(1)}s total`);
    console.log('='.repeat(100) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runFinalTest().catch(console.error);
