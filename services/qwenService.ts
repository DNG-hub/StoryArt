import type { AnalyzedEpisode } from '../types';
import { compactEpisodeContext } from '../utils';
import { providerManager, AIProvider, TaskType, AIRequest } from './aiProviderService';

export const analyzeScriptWithQwen = async (
  scriptText: string, 
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> => {
  const systemInstruction = `You are an expert AI **Visual Moment Architect** and **Continuity Supervisor** for episodic visual storytelling. Each scene is a standalone 15-20 minute YouTube video. Your goal is to decompose a script into individual VISUAL MOMENTS (camera compositions) for static-image video production.

**BEAT DEFINITION:** A beat = one distinct VISUAL MOMENT (one camera composition on screen).
- Duration: 15-30 seconds on screen (image hold time)
- Content: 1-3 sentences describing what the viewer SEES in this frame
- Each beat = one image. If the camera would CUT to a new shot, that is a new beat.
- Each beat MUST include full cinematographic direction in \`cameraAngleSuggestion\`.

**SCENE TARGETS:**
- Total beats per scene: 35-45 (target 40)
- NEW_IMAGE: 28-36 per scene
- REUSE_IMAGE: 7-12 per scene (never 2+ consecutive)
- Beat duration: 15-30 sec

**CINEMATOGRAPHIC DIRECTION (REQUIRED):**
\`cameraAngleSuggestion\` format: "[shot_type], [camera_angle], [depth/composition], [lighting]"
Example: "medium close-up, three-quarter view, shallow depth of field, dramatic rim lighting"

**Inputs:**
1.  **Script Text:** A scene from a screenplay (standalone 15-20 min YouTube video).
2.  **Visually-Focused Episode Context JSON:** Visual data for characters and locations.

**Workflow:**
1.  Decompose the scene into **35-45 visual moments** (target 40). Think like a cinematographer.
2.  For each beat: populate identifiers, visual content, narrative analysis, cinematographic direction, and image decision.
3.  Image decisions: NEW_IMAGE (default, 28-36/scene), REUSE_IMAGE (7-12/scene, never 2+ consecutive), NO_IMAGE (0-2 max).

**Output:** Single JSON object adhering to the provided schema.`;

  const responseSchema = {
    type: "object",
    properties: {
      episodeNumber: { type: "number", description: "The episode number parsed from the script." },
      title: { type: "string", description: "The episode title parsed from the script." },
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sceneNumber: { type: "number" },
            title: { type: "string" },
            metadata: {
              type: "object",
              properties: {
                targetDuration: { type: "string" },
                sceneRole: { type: "string" },
                timing: { type: "string" },
                adBreak: { type: "boolean" },
              },
              required: ['targetDuration', 'sceneRole', 'timing', 'adBreak']
            },
            beats: {
              type: "array",
              description: "A list of 35-45 visual moment beats per scene (target 40). Each beat = one camera composition (one image on screen for 15-30 seconds).",
              items: {
                type: "object",
                properties: {
                  beatId: { type: "string", description: "A unique identifier for this beat, in the format 'sX-bY' where X is scene number and Y is beat number (e.g., 's1-b2')." },
                  beat_number: { type: "number", description: "The sequential number of the beat within the scene, starting from 1." },
                  beat_title: { type: "string", description: "A short, descriptive title for the beat (e.g., 'The Ruins')." },
                  beat_type: { type: "string", description: "Classification of the beat's primary narrative purpose. Must be one of: 'Revelation', 'Action', 'Escalation', 'Pivot', 'Resolution', or 'Other'." },
                  narrative_function: { type: "string", description: "The beat's role in the story structure (e.g., 'Inciting Incident', 'Rising Action')." },
                  setting: { type: "string", description: "The setting of the beat, including location and time of day." },
                  characters: { type: "array", items: { type: "string" }, description: "A list of characters present in the beat." },
                  core_action: { type: "string", description: "A concise, one-sentence summary of the beat's main action or event." },
                  beat_script_text: { type: "string", description: "1-3 sentences describing the visual moment. What the viewer SEES in this single frame/composition." },
                  source_paragraph: { type: "string", description: "The broader narrative paragraph or section from the original script that this beat was extracted from." },
                  emotional_tone: { type: "string", description: "The dominant emotion or mood of the beat (e.g., 'Tense', 'Hopeful')." },
                  visual_anchor: { type: "string", description: "A description of the single, most powerful image that could represent this beat." },
                  transition_trigger: { type: "string", description: "The event or discovery that leads into the next beat." },
                  beat_duration_estimate_sec: { type: "number", description: "Estimated on-screen hold time for this image in seconds, typically between 15 and 30." },
                  visualSignificance: { type: "string", description: "How important this beat is to visualize: 'High', 'Medium', or 'Low'." },
                  imageDecision: {
                    type: "object",
                    description: "The final decision on image creation for this beat, including reuse logic.",
                    properties: {
                      type: { type: "string", description: "The decision type: 'NEW_IMAGE', 'REUSE_IMAGE', or 'NO_IMAGE'." },
                      reason: { type: "string", description: "The justification for the decision." },
                      reuseSourceBeatId: { type: "string", description: "If type is 'REUSE_IMAGE', this is the 'beatId' of the beat whose image should be reused." },
                      reuseSourceBeatLabel: { type: "string", description: "A human-readable label for the source beat. THIS WILL BE POPULATED BY a post-processing step; you can leave it blank." },
                    },
                    required: ['type', 'reason'],
                  },
                  cameraAngleSuggestion: { type: "string", description: "REQUIRED cinematographic direction using FLUX vocabulary. Format: '[shot_type], [camera_angle], [depth/composition], [lighting]'." },
                  characterPositioning: { type: "string", description: "Optional description of character positions and interactions." },
                  locationAttributes: {
                      type: "array",
                      description: "An array of `prompt_fragment` strings extracted from the most relevant `artifacts` in the Episode Context JSON that apply to this specific beat.",
                      items: { type: "string" }
                  },
                },
                required: [
                  'beatId', 'beat_number', 'beat_title', 'beat_type', 'narrative_function', 'setting',
                  'characters', 'core_action', 'beat_script_text', 'source_paragraph', 'emotional_tone', 'visual_anchor',
                  'transition_trigger', 'beat_duration_estimate_sec', 'visualSignificance', 'imageDecision',
                  'cameraAngleSuggestion'
                ]
              }
            }
          },
          required: ['sceneNumber', 'title', 'metadata', 'beats']
        }
      }
    },
    required: ['episodeNumber', 'title', 'scenes']
  };

  try {
    onProgress?.('Connecting to Qwen API...');
    
    const compactedContextJson = compactEpisodeContext(episodeContextJson);
    onProgress?.('Compacting episode context...');

    onProgress?.('Sending script to Qwen for analysis...');
    
    const request: AIRequest = {
      prompt: `Analyze the following script using the provided visually-focused Episode Context as your guide.\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`,
      systemInstruction,
      temperature: 0.1,
      maxTokens: 8192,
      schema: responseSchema,
      taskType: TaskType.SCRIPT_ANALYSIS
    };

    const response = await providerManager.executeTask(request);

    onProgress?.('Processing Qwen response...');
    const rawResult = JSON.parse(response.content) as AnalyzedEpisode;

    onProgress?.('Analysis complete!');
    return rawResult;

  } catch (error) {
    console.error("Error calling Qwen API:", error);
    onProgress?.('Error occurred during analysis');
    if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error("Failed to analyze script. The AI model returned an invalid JSON structure. This can happen with complex scripts. Try simplifying the script or checking the episode context data format.");
    }
    throw new Error("Failed to analyze script. The AI model may be temporarily unavailable or the request was invalid.");
  }
};

/**
 * Simple generic content generation using Qwen via providerManager
 */
export const qwenGenerateContent = async (
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.7,
  maxTokens: number = 2048
): Promise<{ content: string }> => {
  const request: AIRequest = {
    prompt,
    systemInstruction: systemInstruction || 'You are a helpful AI assistant.',
    temperature,
    maxTokens,
    taskType: TaskType.CREATIVE_WRITING,
    preferredProvider: AIProvider.QWEN
  };

  const response = await providerManager.executeTask(request);

  return {
    content: response.content
  };
};
