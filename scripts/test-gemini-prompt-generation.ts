/**
 * End-to-End Gemini Prompt Generation Test
 *
 * Tests the full pipeline:
 * 1. Beat analysis with FLUX vocabulary validation
 * 2. Character-specific expressions
 * 3. Scene context (time of day, intensity, pacing)
 * 4. Carryover state tracking
 * 5. Gemini prompt generation
 *
 * Usage: npx tsx scripts/test-gemini-prompt-generation.ts
 */

import { GoogleGenAI } from "@google/genai";
import {
  processEpisodeWithFullContext,
  type FullyProcessedBeat
} from '../services/beatStateService';
import type { AnalyzedEpisode } from '../types';

// Check for API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable not set');
  console.log('Please set GEMINI_API_KEY in your environment or .env file');
  process.exit(1);
}

// Minimal Episode 2 Scene 1 test data
const testEpisode: AnalyzedEpisode = {
  episodeNumber: 2,
  title: 'The Ghost in the Machine',
  scenes: [
    {
      sceneNumber: 1,
      title: 'Debrief and Disbelief',
      metadata: {
        targetDuration: '8 minutes',
        sceneRole: 'setup_hook',
        timing: '0:00-8:00',
        adBreak: true
      },
      beats: [
        {
          beatId: 's1-b1',
          beat_script_text: 'INT. NORAD COMMAND CENTER - NIGHT. Cat reviews the impossible data from the anomaly. The readings defy everything she knows about quantum physics.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Opening hook' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Cat standing at terminal, fingers hovering over keyboard',
          locationAttributes: 'NORAD command center, dim blue lighting from monitors',
          characters: ['Cat'],
          emotional_tone: 'tense anticipation'
        },
        {
          beatId: 's1-b2',
          beat_script_text: 'She traces patterns in the data, her analytical mind searching for any logical explanation. The numbers shouldn\'t be possible.',
          visualSignificance: 'Medium',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Character focus' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: undefined, // Should carry over
          locationAttributes: 'Terminal display showing graph patterns',
          characters: ['Cat'],
          emotional_tone: 'clinical focus'
        },
        {
          beatId: 's1-b3',
          beat_script_text: 'Daniel enters through the secure door, pausing at the threshold. He carries new intel from the field team.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'New character' },
          cameraAngleSuggestion: 'medium shot',
          characterPositioning: 'Daniel entering through secure door, intel folder in hand',
          locationAttributes: 'Command center entrance, security lights',
          characters: ['Daniel'],
          emotional_tone: 'professional calm'
        },
      ]
    },
    {
      sceneNumber: 2,
      title: 'The Breadcrumb',
      metadata: {
        targetDuration: '4 minutes',
        sceneRole: 'development',
        timing: '8:00-12:00',
        adBreak: false
      },
      beats: [
        {
          beatId: 's2-b1',
          beat_script_text: 'INT. CAT\'S PRIVATE LAB - LATER. Cat discovers a hidden message encoded in the anomaly data. Her face illuminated only by the screen.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Discovery' },
          cameraAngleSuggestion: 'extreme close-up',
          characterPositioning: 'Cat leaning forward, face illuminated by screen glow',
          locationAttributes: 'Private lab, single desk lamp, equipment shadows',
          characters: ['Cat'],
          emotional_tone: 'shock'
        },
      ]
    },
    {
      sceneNumber: 3,
      title: 'The Abandoned Clinic',
      metadata: {
        targetDuration: '4 minutes',
        sceneRole: 'escalation',
        timing: '12:00-16:00',
        adBreak: false
      },
      beats: [
        {
          beatId: 's3-b1',
          beat_script_text: 'EXT. SERENITY RIDGE FACILITY - NIGHT. Cat and Daniel approach the abandoned clinic. Moonlight casts long shadows across the overgrown grounds.',
          visualSignificance: 'High',
          imageDecision: { type: 'NEW_IMAGE', reason: 'New location' },
          cameraAngleSuggestion: 'establishing shot',
          characterPositioning: 'Cat and Daniel walking through overgrown entrance',
          locationAttributes: 'Abandoned clinic exterior, moonlit, overgrown vegetation',
          characters: ['Cat', 'Daniel'],
          emotional_tone: 'tense anticipation'
        },
      ]
    },
    {
      sceneNumber: 4,
      title: 'Another Voice',
      metadata: {
        targetDuration: '3 minutes',
        sceneRole: 'climax',
        timing: '16:00-19:00',
        adBreak: false
      },
      beats: [
        {
          beatId: 's4-b1',
          beat_script_text: 'INT. ABANDONED CLINIC LAB - DEEP NIGHT. The Ghost manifests for the first time. An ethereal form coalesces in the near-darkness.',
          visualSignificance: 'Critical',
          imageDecision: { type: 'NEW_IMAGE', reason: 'Climax reveal' },
          cameraAngleSuggestion: 'close-up shot',
          characterPositioning: 'Cat facing the apparition, trembling slightly',
          locationAttributes: 'Clinic lab, near-darkness, ethereal light emanating',
          characters: ['Cat', 'Ghost'],
          emotional_tone: 'shock'
        },
      ]
    }
  ]
};

// Scene options with full context
// Episode 2 time progression: continuing from E1S4 (twilight) through deepest night
const episodeOptions: Record<number, {
  timeOfDay?: string | null;
  intensity?: number;
  pacing?: string;
  arcPhase?: string | null;
}> = {
  // Scene 1: Just after E1S4 twilight - early night at NORAD
  1: { timeOfDay: 'early_night', intensity: 5, pacing: 'measured', arcPhase: 'RISING' },
  // Scene 2: Night progresses - Cat in her private lab
  2: { timeOfDay: 'night_interior', intensity: 6, pacing: 'brisk', arcPhase: 'RISING' },
  // Scene 3: Traveling to Serenity Ridge - night exterior
  3: { timeOfDay: 'night_exterior', intensity: 7, pacing: 'brisk', arcPhase: 'CLIMAX' },
  // Scene 4: Deepest night at the abandoned clinic - Ghost encounter
  4: { timeOfDay: 'deep_night_exterior', intensity: 9, pacing: 'frenetic', arcPhase: 'CLIMAX' }
};

async function runTest() {
  console.log('======================================================================');
  console.log('END-TO-END GEMINI PROMPT GENERATION TEST');
  console.log('======================================================================\n');

  // Step 1: Process beats through full pipeline
  console.log('Step 1: Processing beats through full SKILL.md pipeline...\n');

  const processedResult = processEpisodeWithFullContext(testEpisode, {
    sceneOverrides: episodeOptions
  });

  console.log('\n--- Processed Beats Summary ---\n');
  for (const scene of processedResult.episode.scenes) {
    console.log(`Scene ${scene.sceneNumber}: ${scene.title}`);
    for (const beat of scene.beats) {
      const fb = beat as FullyProcessedBeat;
      console.log(`  ${fb.beatId}:`);
      console.log(`    Shot: ${fb.fluxShotType} | Angle: ${fb.fluxCameraAngle}`);
      console.log(`    Expression: ${fb.fluxExpression}`);
      console.log(`    Lighting: ${fb.fluxLighting?.join(', ') || 'default'}`);
      if (fb.carryoverAction) {
        console.log(`    [CARRYOVER] Action from ${fb.carryoverSourceBeatId}`);
      }
      if (fb.beatVisualGuidance?.isHookBeat) {
        console.log(`    [HOOK BEAT]`);
      }
    }
  }

  // Step 2: Build prompt request for Gemini
  console.log('\n======================================================================');
  console.log('Step 2: Generating prompts with Gemini API...');
  console.log('======================================================================\n');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Build the context for each beat
  const beatsForPromptGen = processedResult.episode.scenes.flatMap(scene =>
    scene.beats.map(beat => {
      const fb = beat as FullyProcessedBeat;
      return {
        beatId: fb.beatId,
        beat_script_text: fb.beat_script_text,
        characters: (fb as any).characters || [],
        characterPositioning: fb.characterPositioning,
        emotional_tone: (fb as any).emotional_tone,
        locationAttributes: fb.locationAttributes,
        styleGuide: {
          camera: fb.fluxShotType + (fb.fluxCameraAngle !== 'eye-level shot' ? `, ${fb.fluxCameraAngle}` : ''),
          lighting: fb.fluxLighting?.join(', ') || 'dramatic rim light',
          expression: fb.fluxExpression,
          pose: fb.fluxPose || fb.carryoverAction,
        },
        visualGuidance: fb.beatVisualGuidance ? {
          isHookBeat: fb.beatVisualGuidance.isHookBeat,
          isClimaxBeat: fb.beatVisualGuidance.isClimaxBeat,
          intensityLevel: fb.beatVisualGuidance.intensityLevel,
        } : undefined,
        carryoverContext: fb.carryoverAction ? {
          hasCarryover: true,
          action: fb.carryoverAction,
          expression: fb.carryoverExpression,
          sourcebeat: fb.carryoverSourceBeatId,
        } : undefined,
      };
    })
  );

  const systemPrompt = `You are a prompt engineer for FLUX.1-Dev image generation. Generate SwarmUI-compatible prompts for each beat.

**CRITICAL RULES:**
1. Use ONLY the provided styleGuide fields - they are already FLUX-validated
2. For character poses: use styleGuide.pose if provided
3. For expressions: use styleGuide.expression directly
4. For lighting: use styleGuide.lighting directly
5. For hook beats (visualGuidance.isHookBeat=true): make visually striking

**OUTPUT FORMAT (JSON array):**
[
  {
    "beatId": "s1-b1",
    "prompt": "cinematic still, [character description], [pose], [expression], [camera], [lighting], [environment], photorealistic, 8k uhd"
  }
]

Generate a prompt for each beat that incorporates all style elements.`;

  const userPrompt = `Generate SwarmUI prompts for these beats:

${JSON.stringify(beatsForPromptGen, null, 2)}

Return ONLY a JSON array with beatId and prompt for each beat.`;

  try {
    console.log('Sending request to Gemini...\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const responseText = response.text || '';

    console.log('======================================================================');
    console.log('GENERATED PROMPTS');
    console.log('======================================================================\n');

    // Try to parse as JSON
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0];
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0];
      }

      const prompts = JSON.parse(jsonStr.trim());

      for (const p of prompts) {
        console.log(`--- ${p.beatId} ---`);
        console.log(p.prompt);
        console.log('');
      }
    } catch (parseError) {
      // If not JSON, just print the raw response
      console.log('Raw Gemini Response:');
      console.log(responseText);
    }

    console.log('======================================================================');
    console.log('TEST COMPLETE');
    console.log('======================================================================');

  } catch (error) {
    console.error('Gemini API Error:', error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);
