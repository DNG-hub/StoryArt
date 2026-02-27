import * as fs from 'fs';
import { analyzeScript } from './services/geminiService';

async function testE3S2Analysis() {
  const scriptPath = './test_e3s2_script.txt';
  const contextPath = './test_e3s2_context.json';

  if (!fs.existsSync(scriptPath) || !fs.existsSync(contextPath)) {
    console.error('Test files not found');
    process.exit(1);
  }

  const scriptText = fs.readFileSync(scriptPath, 'utf-8');
  const contextJson = fs.readFileSync(contextPath, 'utf-8');

  console.log('🎬 Testing E3S2 Beat Analysis with Multi-Phase Character Appearance\n');
  console.log('Script length:', scriptText.length, 'characters');
  console.log('Context length:', contextJson.length, 'characters\n');

  try {
    console.log('📊 Running Gemini beat analysis...\n');
    
    const result = await analyzeScript(scriptText, contextJson, (progress) => {
      console.log(`   ℹ️  ${progress}`);
    });

    // Find scene 2
    const scene2 = result.scenes.find(s => s.sceneNumber === 2);
    if (!scene2) {
      console.error('❌ Scene 2 not found in analysis');
      process.exit(1);
    }

    console.log('\n✅ Analysis Complete!\n');
    console.log('📍 Scene 2: The Safehouse');
    console.log(`   Beats analyzed: ${scene2.beats.length}\n`);

    // Look for phase transitions
    const beatsWithTransitions = scene2.beats.filter((b: any) => 
      b.phaseTransitions && b.phaseTransitions.length > 0
    );

    if (beatsWithTransitions.length > 0) {
      console.log(`🔄 Found ${beatsWithTransitions.length} beat(s) with phase transitions:\n`);
      beatsWithTransitions.forEach((beat: any) => {
        console.log(`   ${beat.beatId} - ${beat.beat_title}`);
        beat.phaseTransitions.forEach((t: any) => {
          console.log(`      → ${t.character} transitions to '${t.toPhase}' phase`);
        });
        console.log(`      Script: "${beat.beat_script_text.substring(0, 100)}..."\n`);
      });
    } else {
      console.log('⚠️  No phase transitions detected\n');
    }

    // Sample a few beats
    console.log('📋 Sample Beats (first 5):');
    scene2.beats.slice(0, 5).forEach((beat: any, i: number) => {
      console.log(`\n   ${i + 1}. ${beat.beatId} - ${beat.beat_title}`);
      console.log(`      Characters: ${beat.characters?.join(', ')}`);
      console.log(`      Image decision: ${beat.imageDecision?.type}`);
      if (beat.phaseTransitions?.length) {
        console.log(`      🔄 Phase transitions: ${beat.phaseTransitions.map((t: any) => `${t.character}→${t.toPhase}`).join(', ')}`);
      }
    });

    console.log('\n✨ Test Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

testE3S2Analysis();
