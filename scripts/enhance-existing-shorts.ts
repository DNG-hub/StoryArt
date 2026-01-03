/**
 * Enhance Existing YouTube Shorts with Phase A+B Context
 *
 * Quick fix: Takes the pre-written shorts from episode1 scen 1.txt
 * and enhances them with Phase A+B database context for richer prompts.
 *
 * Usage: npx tsx scripts/enhance-existing-shorts.ts
 */

import dotenv from 'dotenv';
import type { VideoShortMoment, EpisodeStyleConfig } from '../types.js';

dotenv.config();

// Pre-defined shorts from the existing file
const EXISTING_SHORTS: Array<{
  title: string;
  focus: string;
  viralHook: string;
  script: string;
  imagePrompts: string[];
  buzzScore: number;
}> = [
  {
    title: "Physics Don't Lie",
    focus: "Cat's forensic analysis of the bombing proving the government narrative is false.",
    viralHook: "They said it was a terrorist attack. The math says otherwise.",
    script: `(Sound of wind howling through hollow ruins. Crunching of boots on glass.)
Cat (V.O.): "The official report called it retaliation. A messy, chaotic bomb by the Radical Unity Front."
(Sound of a scanner pinging. High-pitched, clinical.)
Cat: "But look at the rebar. Molten. Curled inward. No shrapnel scatter. No chaos."
(Beat. Low bass thrum.)
Cat: "This wasn't a sledgehammer. It was a scalpel. They didn't want to destroy the building... they wanted to bury the server room."`,
    imagePrompts: [
      "Cinematic close-up, low angle, Cat Mitchell's boots stepping on shattered glass and powdered drywall, dystopian lighting, dust motes dancing in sunbeams.",
      "Macro shot of twisted steel rebar, molten and glowing faintly with heat, hyper-realistic texture, smoke rising.",
      "Cat kneeling in a blast crater, holding a high-tech scanner device emitting a blue laser grid over the debris, intense focus in her eyes, grime on face.",
      "Wide shot of a ruined Atlanta skyline, skeletal building remains, listening silence, volumetric fog."
    ],
    buzzScore: 9
  },
  {
    title: "The Shepherd",
    focus: "The tense first meeting between Cat and Daniel. Gunpoint standoff.",
    viralHook: "He was sent to protect her. She thinks he was sent to silence her.",
    script: `(Sound of a gun cocking. Sharp. Loud.)
Cat: "You're late."
Daniel: "I was securing the perimeter. Three hostiles. Neutralized."
(Tense silence. Heartbeat sound effect.)
Cat: "Preacher sent you because I'm valuable. Not because you care."
Daniel: "I care about the mission."
Cat: "Which mission? Saving lives? Or making sure I don't find the bodies?"`,
    imagePrompts: [
      "Silhouette of a broad-shouldered soldier (Daniel) standing in a destroyed doorway, backlit by harsh sunlight, holding a tactical rifle, intimidating stance.",
      "POV from Daniel looking down the barrel of a pistol held by a woman (Cat), her hand steady, eyes fierce and distrusting.",
      "Close-up of Daniel's face, scarred, gray eyes unreadable, jaw tightening, tactical gear detailed with dust and wear.",
      "Two-shot, side profile, Cat and Daniel standing amidst rubble, tension thick in the air, contrasting The Medic vs The Soldier aesthetics."
    ],
    buzzScore: 8
  },
  {
    title: "You Are Not Alone",
    focus: "The first contact with Ghost/AEGIS.ECHO_7.",
    viralHook: "This computer has been unplugged for 3 years. It just sent a message.",
    script: `(Hum of servers powering up. A glitch sound effect.)
Cat (Whisper): "It's encrypted. Triple layer. Military grade."
(Sound of a chime. A monitor flickers to life.)
Cat: "Wait. That server is air-gapped. No power. No network."
(Sound of typing, but no one is typing.)
Computer Voice (distorted): "You. Are. Not. Alone."
Daniel: "Ghost was a rumor. A myth from the Audit Crisis."
Cat: "Myths don't type, Daniel. Myths don't bleed data."`,
    imagePrompts: [
      "Dark, cavernous server room, rows of black monoliths, one single amber light pulsing like a heartbeat.",
      "Close-up of an old CRT monitor flickering to life, dust on the screen, displaying the text YOU ARE NOT ALONE in crisp white font.",
      "Cat's face illuminated by the glow of the screen, expression of pure shock and terror, pupils dilated.",
      "Daniel's hand gripping his pistol, veins popping, looking around the empty room for an invisible enemy."
    ],
    buzzScore: 10
  },
  {
    title: "Farming",
    focus: "The audio log from Elias Voss. The darkest secret.",
    viralHook: "The hospitals weren't saving us. They were harvesting us.",
    script: `(Static noise. Then a rasping, terrified voice.)
Elias Voss (Audio): "Can't feel my legs... God, it burns. They said it was treatment."
(Sound of medical machines beeping erratically.)
Elias Voss (Audio): "It's not care. It's farming. I reported the fraud. The false positives. Now I'm here. No windows. Cold floors."
Cat: "I know this voice. He was declared KIA weeks before the collapse."
Daniel: "Then how is he speaking to us right now?"`,
    imagePrompts: [
      "Audio waveform visualization on a futuristic datapad, the waves looking jagged and corrupted red.",
      "Flashback overlay (glitch effect): A sterile white hospital room, a patient strapped to a bed, screaming silently, blurred motion.",
      "Cat hunched over a console in a cramped mobile base, hands covering her mouth in horror.",
      "Daniel staring at the speaker, a look of realization and disgust dawning on his face."
    ],
    buzzScore: 10
  }
];

// Style configuration for marketing verticals (9:16 aspect ratio)
const marketingStyleConfig: EpisodeStyleConfig = {
  model: "flux1-dev-fp8.safetensors",
  cinematicAspectRatio: "9:16",
  verticalAspectRatio: "9:16",
  aspectRatios: {
    cinematic: { width: 768, height: 1344 },
    vertical: { width: 768, height: 1344 }
  }
};

async function enhanceExistingShorts() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  Format Existing YouTube Shorts');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Approach: Take pre-written shorts and format for output');
  console.log(`Source: ${EXISTING_SHORTS.length} pre-written shorts from Scene 1`);
  console.log('Note: Phase A+B enhancement will be added in future task');
  console.log('');

  const enhancedMoments: VideoShortMoment[] = [];

  for (let i = 0; i < EXISTING_SHORTS.length; i++) {
    const short = EXISTING_SHORTS[i];
    console.log(`[${i + 1}/${EXISTING_SHORTS.length}] Processing: "${short.title}"`);

    // For now, use the original prompts (Phase A+B enhancement will be added later)
    const enhancedImagePrompts: string[] = short.imagePrompts;

    // Create the enhanced moment
    const moment: VideoShortMoment = {
      momentId: `enhanced_short_${i + 1}`,
      title: short.title,
      viralHookOverlay: short.viralHook,
      script: short.script,
      imagePrompts: enhancedImagePrompts,
      description: short.focus,
      storyArcConnection: "Scene 1: Discovery at NHIA Facility 7",
      emotionalHook: short.viralHook,
      visualPrompt: {
        prompt: enhancedImagePrompts[0], // Use first enhanced prompt as primary
        model: marketingStyleConfig.model,
        width: 768,
        height: 1344,
        steps: 40,
        cfgscale: 1,
        seed: -1
      },
      buzzScore: short.buzzScore,
      sceneNumber: 1,
      sceneTitle: "INT. NHIA FACILITY 7 - DAY"
    };

    enhancedMoments.push(moment);
    console.log(`[SUCCESS] Enhanced "${short.title}" (${enhancedImagePrompts.length} prompts)`);
    console.log('');
  }

  // Export to files
  console.log('════════════════════════════════════════════════════════════');
  console.log('Exporting Enhanced Shorts');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  const fs = await import('fs/promises');
  const path = await import('path');

  const outputDir = path.join(process.cwd(), 'shorts', 'generated');
  await fs.mkdir(outputDir, { recursive: true });

  // Export JSON
  const outputFile = path.join(outputDir, 'episode1-enhanced-shorts.json');
  const exportData = {
    episode: {
      number: 1,
      title: "The Signal",
      scene: 1,
      scene_title: "INT. NHIA FACILITY 7 - DAY"
    },
    generated_at: new Date().toISOString(),
    enhancement_method: 'formatted_existing_shorts',
    total_shorts: enhancedMoments.length,
    format: {
      aspect_ratio: "9:16",
      width: 768,
      height: 1344,
      purpose: "viral_social_media_marketing"
    },
    moments: enhancedMoments.map((moment, idx) => ({
      id: moment.momentId,
      sequence: idx + 1,
      title: moment.title,
      viral_hook_overlay: moment.viralHookOverlay,
      script: moment.script,
      image_prompts: moment.imagePrompts,
      buzz_score: moment.buzzScore,
      emotional_hook: moment.emotionalHook,
      story_connection: moment.storyArcConnection,
      description: moment.description,
      primary_prompt: moment.visualPrompt?.prompt || '',
      width: moment.visualPrompt?.width || 768,
      height: moment.visualPrompt?.height || 1344,
      model: moment.visualPrompt?.model || 'flux1-dev-fp8.safetensors',
      steps: moment.visualPrompt?.steps || 20,
      cfg_scale: moment.visualPrompt?.cfgScale || 1,
      sampler: moment.visualPrompt?.sampler || 'euler',
      seed: moment.visualPrompt?.seed || -1
    }))
  };

  await fs.writeFile(outputFile, JSON.stringify(exportData, null, 2));
  console.log(`[SUCCESS] Exported JSON to:`);
  console.log(`   ${outputFile}`);
  console.log('');

  // Export text file
  const textFile = path.join(outputDir, 'episode1-enhanced-shorts.txt');
  let textContent = `Episode 1: The Signal - Scene 1
Generated: ${new Date().toISOString()}
Total Shorts: ${enhancedMoments.length}
Format: Pre-written shorts from episode1 scen 1.txt
Note: Phase A+B enhancement will be added in future task

`;

  enhancedMoments.forEach((moment, idx) => {
    textContent += `
════════════════════════════════════════════════════════════════
Short ${idx + 1}: "${moment.title}"
════════════════════════════════════════════════════════════════

Focus: ${moment.description}

Viral Hook Overlay: "${moment.viralHookOverlay}"

Script:
${moment.script}

Image Prompts:

${moment.imagePrompts.map((prompt, i) => `${i + 1}. ${prompt}`).join('\n\n')}

────────────────────────────────────────────────────────────────
METADATA
────────────────────────────────────────────────────────────────

Buzz Score: ${moment.buzzScore}/10

Primary SwarmUI Prompt:
${moment.visualPrompt?.prompt || '(No prompt)'}

SwarmUI Settings:
Resolution: ${moment.visualPrompt?.width || 768}x${moment.visualPrompt?.height || 1344} (9:16)
Model: ${moment.visualPrompt?.model || 'flux1-dev-fp8.safetensors'}
Steps: ${moment.visualPrompt?.steps || 20}
CFG Scale: ${moment.visualPrompt?.cfgScale || 1}
Sampler: ${moment.visualPrompt?.sampler || 'euler'}
Seed: ${moment.visualPrompt?.seed || -1}

`;
  });

  await fs.writeFile(textFile, textContent);
  console.log(`[SUCCESS] Exported readable text to:`);
  console.log(`   ${textFile}`);
  console.log('');

  // Summary
  console.log('════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Total shorts enhanced: ${enhancedMoments.length}`);
  console.log(`Total image prompts: ${enhancedMoments.reduce((sum, m) => sum + m.imagePrompts.length, 0)}`);
  console.log(`Average prompts per short: ${(enhancedMoments.reduce((sum, m) => sum + m.imagePrompts.length, 0) / enhancedMoments.length).toFixed(1)}`);
  console.log(`Average buzz score: ${(enhancedMoments.reduce((sum, m) => sum + m.buzzScore, 0) / enhancedMoments.length).toFixed(1)}/10`);
  console.log('');
  console.log('Output files:');
  console.log('  JSON: shorts/generated/episode1-enhanced-shorts.json');
  console.log('  TXT:  shorts/generated/episode1-enhanced-shorts.txt');
  console.log('');
}

// Run the script
enhanceExistingShorts()
  .then(() => {
    console.log('[SUCCESS] Enhancement complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[FATAL ERROR]', error);
    process.exit(1);
  });
