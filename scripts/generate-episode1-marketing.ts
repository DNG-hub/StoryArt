/**
 * Generate Episode 1 Marketing Prompts from constants.ts
 *
 * This script uses the FULL narrative analysis approach for marketing:
 * 1. Analyzes DEFAULT_SCRIPT to extract all story beats per scene
 * 2. For EACH SCENE, uses AI to identify the 3-5 MOST VIRAL/COMPELLING moments
 * 3. Generates 9:16 marketing prompts for those selected moments
 *
 * Output: 3-5 marketing moments per scene (12-20 total for 4 scenes)
 * This supports rolling scene releases where each scene gets its own marketing.
 *
 * Usage: npx tsx scripts/generate-episode1-marketing.ts
 */

import dotenv from 'dotenv';
import { DEFAULT_EPISODE_CONTEXT, DEFAULT_SCRIPT } from '../constants.js';
import { analyzeScriptWithProvider } from '../services/multiProviderAnalysisService.js';
import { analyzeFullEpisodeForMarketing, generateMarketingVerticalPrompts } from '../services/videoShortMarketingService.js';
import type { EpisodeStyleConfig } from '../types.js';

dotenv.config();

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

// Style configuration for marketing verticals (9:16 aspect ratio)
const marketingStyleConfig: EpisodeStyleConfig = {
  model: "flux1-dev-fp8.safetensors",
  cinematicAspectRatio: "9:16", // Vertical for social media
  verticalAspectRatio: "9:16",  // Marketing vertical
  aspectRatios: {
    cinematic: { width: 768, height: 1344 },      // Main marketing images
    vertical: { width: 768, height: 1344 }        // Additional variations
  }
};

async function generateMarketingPrompts() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Episode 1 Marketing Moment Selection & Generation       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Approach: AI-driven viral moment identification PER SCENE');
  console.log('Source: constants.ts (DEFAULT_SCRIPT + DEFAULT_EPISODE_CONTEXT)');
  console.log('Output: 3-5 moments per scene as 9:16 marketing prompts');
  console.log('Strategy: Support rolling scene releases with scene-specific marketing');
  console.log('');

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 1: Analyze FULL Episode 1 script');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Reading DEFAULT_SCRIPT for complete narrative...');
    console.log('');

    const analyzedEpisode = await analyzeScriptWithProvider(
      'gemini',                // Provider - Use Gemini for narrative understanding
      DEFAULT_SCRIPT,          // Script text - Full prose narrative with all story beats
      DEFAULT_EPISODE_CONTEXT,  // Episode context - Character/location metadata
      (msg) => console.log(`  ${msg}`)
    );

    console.log('');
    console.log(`[SUCCESS] Analyzed Episode ${analyzedEpisode.episodeNumber}: ${analyzedEpisode.title}`);
    console.log(`   Scenes: ${analyzedEpisode.scenes.length}`);
    console.log(`   Total beats: ${analyzedEpisode.totalBeats}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 2: AI identifies 3-5 VIRAL moments PER SCENE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const allMarketingMoments = [];

    for (let i = 0; i < analyzedEpisode.scenes.length; i++) {
      const scene = analyzedEpisode.scenes[i];
      console.log(`Analyzing Scene ${scene.sceneNumber}: "${scene.title}"`);
      console.log(`  Beats in scene: ${scene.beats.length}`);
      console.log('');

      // Create a mini episode with just this scene for focused analysis
      const sceneEpisode = {
        ...analyzedEpisode,
        scenes: [scene],
        totalBeats: scene.beats.length
      };

      const sceneMoments = await analyzeFullEpisodeForMarketing(
        sceneEpisode,
        DEFAULT_EPISODE_CONTEXT,
        (msg) => console.log(`  ${msg}`)
      );

      console.log(`  [SUCCESS] Found ${sceneMoments.length} marketing moments for Scene ${scene.sceneNumber}`);
      console.log('');

      // Tag moments with scene info
      sceneMoments.forEach(moment => {
        moment.sceneNumber = scene.sceneNumber;
        moment.sceneTitle = scene.title;
      });

      allMarketingMoments.push(...sceneMoments);
    }

    console.log('');
    console.log(`[SUCCESS] Total marketing moments identified: ${allMarketingMoments.length}`);
    console.log('');

    // Show identified moments grouped by scene
    console.log('Selected moments by scene:');
    console.log('');

    for (let i = 0; i < analyzedEpisode.scenes.length; i++) {
      const scene = analyzedEpisode.scenes[i];
      const sceneMoments = allMarketingMoments.filter(m => m.sceneNumber === scene.sceneNumber);

      console.log(`Scene ${scene.sceneNumber}: "${scene.title}" (${sceneMoments.length} moments)`);
      sceneMoments.forEach((moment, idx) => {
        console.log(`  ${idx + 1}. "${moment.title}" (Buzz: ${moment.buzzScore}/10)`);
      });
      console.log('');
    }

    const marketingMoments = allMarketingMoments;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 3: Generate 9:16 marketing prompts for selected moments');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Creating marketing-optimized prompts with Phase A + B...');
    console.log('');

    const marketingPrompts = await generateMarketingVerticalPrompts(
      marketingMoments,
      DEFAULT_EPISODE_CONTEXT,
      marketingStyleConfig,
      (msg) => console.log(`  ${msg}`)
    );

    console.log('');
    console.log(`[SUCCESS] Generated ${marketingPrompts.length} marketing prompt sets`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 4: Preview marketing prompts');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Show first 2 prompts as preview
    const previewCount = Math.min(2, marketingPrompts.length);

    for (let i = 0; i < previewCount; i++) {
      const moment = marketingPrompts[i];

      console.log(`Moment ${i + 1}: "${moment.title}"`);
      console.log(`Buzz Score: ${moment.buzzScore}/10`);
      console.log('─'.repeat(60));
      console.log('');
      console.log('MARKETING HOOK:');
      console.log(moment.emotionalHook);
      console.log('');
      console.log('9:16 VERTICAL PROMPT:');
      if (moment.visualPrompt && moment.visualPrompt.prompt) {
        console.log(moment.visualPrompt.prompt.substring(0, 400));
        if (moment.visualPrompt.prompt.length > 400) {
          console.log(`... (${moment.visualPrompt.prompt.length - 400} more chars)`);
        }
        console.log('');
        console.log(`Resolution: ${moment.visualPrompt.width}x${moment.visualPrompt.height}`);
      } else {
        console.log('(Prompt generation pending)');
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('STEP 5: Export marketing moments');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Export to JSON file
    const fs = await import('fs/promises');
    const path = await import('path');

    const outputDir = path.join(process.cwd(), 'shorts', 'generated');
    await fs.mkdir(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, 'episode1-marketing-moments.json');

    const exportData = {
      episode: {
        number: analyzedEpisode.episodeNumber,
        title: analyzedEpisode.title,
        summary: analyzedEpisode.episodeSummary,
        total_scenes: analyzedEpisode.scenes.length
      },
      generated_at: new Date().toISOString(),
      selection_method: 'ai_per_scene_narrative_analysis',
      total_beats_analyzed: analyzedEpisode.totalBeats,
      moments_selected: marketingPrompts.length,
      moments_per_scene_target: '3-5',
      format: {
        aspect_ratio: "9:16",
        width: 768,
        height: 1344,
        purpose: "viral_social_media_marketing_per_scene"
      },
      scenes: analyzedEpisode.scenes.map(scene => ({
        scene_number: scene.sceneNumber,
        scene_title: scene.title,
        moments_count: marketingPrompts.filter(m => m.sceneNumber === scene.sceneNumber).length
      })),
      moments: marketingPrompts.map((moment, idx) => ({
        id: moment.momentId,
        sequence: idx + 1,
        scene_number: moment.sceneNumber,
        scene_title: moment.sceneTitle,
        title: moment.title,
        viral_hook_overlay: moment.viralHookOverlay || '',
        script: moment.script || '',
        image_prompts: moment.imagePrompts || [],
        buzz_score: moment.buzzScore,
        emotional_hook: moment.emotionalHook,
        story_connection: moment.storyArcConnection,
        description: moment.description,
        primary_prompt: moment.visualPrompt?.prompt || '',
        negative_prompt: moment.visualPrompt?.negativePrompt || '',
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

    console.log(`[SUCCESS] Exported ${marketingPrompts.length} marketing moments to:`);
    console.log(`   ${outputFile}`);
    console.log('');

    // Also export simplified text format grouped by scene
    const textFile = path.join(outputDir, 'episode1-marketing-moments.txt');

    let textContent = `Episode ${analyzedEpisode.episodeNumber}: ${analyzedEpisode.title}
Generated: ${new Date().toISOString()}
Total Moments: ${marketingPrompts.length} (across ${analyzedEpisode.scenes.length} scenes)
Strategy: 3-5 viral moments per scene for rolling releases

`;

    // Group by scene
    for (const scene of analyzedEpisode.scenes) {
      const sceneMoments = marketingPrompts.filter(m => m.sceneNumber === scene.sceneNumber);

      textContent += `
════════════════════════════════════════════════════════════════
SCENE ${scene.sceneNumber}: ${scene.title}
${sceneMoments.length} Marketing Moments
════════════════════════════════════════════════════════════════

`;

      sceneMoments.forEach((moment, idx) => {
        textContent += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Short ${idx + 1}: "${moment.title}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Focus: ${moment.description}

Viral Hook Overlay: "${moment.viralHookOverlay || moment.emotionalHook}"

Script:
${moment.script || moment.description}

Image Prompts:
${(moment.imagePrompts && moment.imagePrompts.length > 0) ? moment.imagePrompts.map((prompt, i) => `${i + 1}. ${prompt}`).join('\n\n') : '(No prompts generated yet)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL METADATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Buzz Score: ${moment.buzzScore}/10

Emotional Hook:
${moment.emotionalHook}

Story Connection:
${moment.storyArcConnection}

Primary SwarmUI Prompt:
${moment.visualPrompt?.prompt || '(Prompt pending)'}

SwarmUI Settings:
Resolution: ${moment.visualPrompt?.width || 768}x${moment.visualPrompt?.height || 1344} (9:16)
Model: ${moment.visualPrompt?.model || 'flux1-dev-fp8.safetensors'}
Steps: ${moment.visualPrompt?.steps || 20}
CFG Scale: ${moment.visualPrompt?.cfgScale || 1}
Sampler: ${moment.visualPrompt?.sampler || 'euler'}
Seed: ${moment.visualPrompt?.seed || -1}

`;
      });
    }

    await fs.writeFile(textFile, textContent);
    console.log(`[SUCCESS] Exported readable text to:`);
    console.log(`   ${textFile}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('MARKETING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Episode: ${analyzedEpisode.episodeNumber} - ${analyzedEpisode.title}`);
    console.log(`Total scenes: ${analyzedEpisode.scenes.length}`);
    console.log(`Total beats analyzed: ${analyzedEpisode.totalBeats}`);
    console.log(`Total viral moments selected: ${marketingPrompts.length}`);
    console.log(`Average buzz score: ${(marketingPrompts.reduce((sum, m) => sum + m.buzzScore, 0) / marketingPrompts.length).toFixed(1)}/10`);
    console.log('');
    console.log('Per-scene breakdown:');
    for (const scene of analyzedEpisode.scenes) {
      const sceneMoments = marketingPrompts.filter(m => m.sceneNumber === scene.sceneNumber);
      const avgBuzz = sceneMoments.length > 0
        ? (sceneMoments.reduce((sum, m) => sum + m.buzzScore, 0) / sceneMoments.length).toFixed(1)
        : '0';
      console.log(`  Scene ${scene.sceneNumber}: ${sceneMoments.length} moments (avg buzz: ${avgBuzz}/10)`);
    }
    console.log('');
    console.log('Output files:');
    console.log(`  • JSON: shorts/generated/episode1-marketing-moments.json`);
    console.log(`  • TXT:  shorts/generated/episode1-marketing-moments.txt`);
    console.log('');

  } catch (error) {
    console.error('[ERROR]', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
generateMarketingPrompts()
  .then(() => {
    console.log('[SUCCESS] Marketing moment generation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[FATAL ERROR]', error);
    process.exit(1);
  });
