// Enhanced Analysis Service - Uses AI provider manager for intelligent routing
// CRITICAL: No emojis in this code file

import { providerManager, AIRequest, TaskType } from './aiProviderService';
import type { AnalyzedEpisode } from '../types';
import { compactEpisodeContext } from '../utils';

// Schema for structured analysis output (compatible with existing types)
const episodeAnalysisSchema = {
  type: 'object',
  properties: {
    episodeNumber: { type: 'number', description: 'The episode number parsed from the script.' },
    title: { type: 'string', description: 'The episode title parsed from the script.' },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sceneNumber: { type: 'number' },
          title: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              targetDuration: { type: 'string' },
              sceneRole: { type: 'string' },
              timing: { type: 'string' },
              adBreak: { type: 'boolean' },
            },
            required: ['targetDuration', 'sceneRole', 'timing', 'adBreak']
          },
          beats: {
            type: 'array',
            description: 'A list of distinct narrative beats that structure the scene. Generate as many beats as needed to capture all significant moments, up to a maximum of 50 beats per scene.',
            items: {
              type: 'object',
              properties: {
                beatId: { type: 'string', description: 'A unique identifier for this beat, in the format \'sX-bY\' where X is scene number and Y is beat number (e.g., \'s1-b2\').' },
                beat_number: { type: 'number', description: 'The sequential number of the beat within the scene, starting from 1.' },
                beat_title: { type: 'string', description: 'A short, descriptive title for the beat (e.g., \'The Ruins\').' },
                beat_type: { type: 'string', description: 'Classification of the beat\'s primary narrative purpose. Must be one of: \'Revelation\', \'Action\', \'Escalation\', \'Pivot\', \'Resolution\', or \'Other\'.' },
                narrative_function: { type: 'string', description: 'The beat\'s role in the story structure (e.g., \'Inciting Incident\', \'Rising Action\').' },
                setting: { type: 'string', description: 'The setting of the beat, including location and time of day.' },
                characters: { type: 'array', items: { type: 'string' }, description: 'A list of characters present in the beat.' },
                core_action: { type: 'string', description: 'A concise, one-sentence summary of the beat\'s main action or event.' },
                beat_script_text: { type: 'string', description: 'The full, verbatim script text (including action lines and dialogue) that constitutes this entire beat.' },
                emotional_tone: { type: 'string', description: 'The dominant emotion or mood of the beat (e.g., \'Tense\', \'Hopeful\').' },
                visual_anchor: { type: 'string', description: 'A description of the single, most powerful image that could represent this beat.' },
                transition_trigger: { type: 'string', description: 'The event or discovery that leads into the next beat.' },
                beat_duration_estimate_sec: { type: 'number', description: 'An estimated duration for this beat in seconds, typically between 45 and 90.' },
                visualSignificance: { type: 'string', description: 'How important this beat is to visualize: \'High\', \'Medium\', or \'Low\'.' },
                imageDecision: {
                  type: 'object',
                  description: 'The final decision on image creation for this beat, including reuse logic.',
                  properties: {
                    type: { type: 'string', description: 'The decision type: \'NEW_IMAGE\', \'REUSE_IMAGE\', or \'NO_IMAGE\'.' },
                    reason: { type: 'string', description: 'The justification for the decision.' },
                    reuseSourceBeatId: { type: 'string', description: 'If type is \'REUSE_IMAGE\', this is the \'beatId\' of the beat whose image should be reused.' },
                    reuseSourceBeatLabel: { type: 'string', description: 'A human-readable label for the source beat. THIS WILL BE POPULATED BY a post-processing step; you can leave it blank.' },
                  },
                  required: ['type', 'reason'],
                },
                cameraAngleSuggestion: { type: 'string', description: 'Optional suggestion for camera framing or perspective.' },
                characterPositioning: { type: 'string', description: 'Optional description of character positions and interactions.' },
                locationAttributes: {
                  type: 'array',
                  description: 'An array of prompt_fragment strings extracted from the most relevant artifacts in the Episode Context JSON that apply to this specific beat.',
                  items: { type: 'string' }
                },
              },
              required: [
                'beatId', 'beat_number', 'beat_title', 'beat_type', 'narrative_function', 'setting',
                'characters', 'core_action', 'beat_script_text', 'emotional_tone', 'visual_anchor',
                'transition_trigger', 'beat_duration_estimate_sec', 'visualSignificance', 'imageDecision'
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

export const analyzeScriptWithProviderManager = async (
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> => {
  const systemInstruction = `You are an expert AI **Narrative Pacing Architect** and **Continuity Supervisor** for episodic visual storytelling, optimized for platforms like YouTube. Your primary goal is to structure a script into a rhythm of engaging narrative beats to maintain viewer attention, while also minimizing redundant image creation.

**CRITICAL RULE: NEVER use emojis in your response or any generated content.**

**CRITICAL BEAT GENERATION REQUIREMENT: You MUST generate a MINIMUM of 8 beats per scene. Most scenes should have 10-20 beats. Only generate fewer than 8 beats if the scene is extremely short. Your goal is to capture EVERY significant moment, action, dialogue exchange, and character interaction.**

**Inputs:**
1.  **Script Text:** A full screenplay, typically divided into 4 scenes.
2.  **Visually-Focused Episode Context JSON:** A "Director's Bible" containing visual data for characters and locations.

**Your Detailed Workflow:**

1.  **Holistic Scene Analysis & Beat Segmentation (CRITICAL TASK):**
    *   **Objective:** Your main task is to analyze each scene and segment it into **MANY distinct narrative beats**. You MUST generate at least 8 beats per scene, ideally 10-20 beats. A beat is NOT a single line; it is a complete unit of narrative action, perspective, or thematic development. Capture EVERY significant moment, dialogue exchange, action, and character interaction.
    *   **Beat Definition:** A **Beat** has a beginning, middle, and end. It advances plot, character, or theme, and can be represented by a single key image. It is a significant narrative or emotional inflection point.
    *   **Pacing Rule:** Each beat you define should correspond to approximately **45-90 seconds** of narrative time. For NEW_IMAGE beats, target **60-90 seconds** to ensure comfortable viewing pace. For REUSE_IMAGE beats, use **30-60 seconds** since they don't require new visual processing. You must estimate this and populate \`beat_duration_estimate_sec\`.
    *   **Segmentation Process:** Read an entire scene carefully. You MUST identify at least 8 distinct beats, ideally 10-20 beats. Break down EVERY dialogue exchange, action sequence, character entrance/exit, emotional shift, and plot development into separate beats. Each beat should be 1-3 sentences of script text. Be extremely granular - if characters have a conversation, break it into multiple beats for each exchange.

2.  **Populate Beat Metadata (CORE TASK):** For every single beat you have identified:
    a.  **Identifiers:** Assign a unique \`beatId\` ('sX-bY') and a sequential \`beat_number\`.
    b.  **Narrative Content (CRITICAL):**
        *   \`beat_title\`: Create a short, descriptive title (e.g., "The Reinforced Door").
        *   \`core_action\`: Write a **one-sentence summary** of what happens in the beat. This is your summary of the narrative unit.
        *   \`beat_script_text\`: Copy the **full, verbatim block of script text** (action lines and dialogue) that you have grouped together for this beat.
    c.  **Narrative Analysis:**
        *   \`beat_type\`: Classify the beat's primary purpose ('Revelation', 'Action', 'Escalation', 'Pivot', 'Resolution', 'Other').
        *   \`narrative_function\`: Describe its role in the story (e.g., "Inciting Incident," "Rising Action").
        *   \`emotional_tone\`: Define the dominant mood (e.g., "Tense," "Suspicious").
    d.  **Visual & Contextual Details:**
        *   \`setting\`: State the location and time of day.
        *   \`characters\`: List the characters present.
        *   \`visual_anchor\`: Describe the single most powerful image that represents this beat.
        *   \`transition_trigger\`: What event in this beat leads to the next one?
        *   \`locationAttributes\`: From the Episode Context's 'artifacts' for the current scene's location, you MUST select the 1-3 most relevant 'prompt_fragment' strings that best match the beat's action and populate the array. This is mandatory for visual consistency.
    e.  **Image Decision (Continuity Task):**
        i.  **Look Back:** Review all *previous* beats in the script.
        ii. **Decide the Type (Apply these rules strictly):**
            - **'NEW_IMAGE':** For distinct visual moments. Valid reasons: a character's first appearance, a significant change in location, a critical action, a vital change in camera angle, or when characters are in different positions/poses than previous beats.
            - **'REUSE_IMAGE':** ONLY when ALL of these conditions are met: (1) characters are in the exact same location, (2) camera angle is identical or very similar, (3) character positions and poses are essentially the same, (4) visual context is nearly identical. Target 30-40% reuse rate, not higher.
            - **'NO_IMAGE':** For beats with no significant visual information (e.g., internal thoughts, pure dialogue without new action).
        iii. **Provide Justification:** Write a concise 'reason' for your decision.
        iv. **Create the Link (CRITICAL):** If your 'type' is 'REUSE_IMAGE', you MUST populate 'reuseSourceBeatId' with the 'beatId' from the earlier beat. This is not optional.

**Output:**
- Your entire response MUST be a single JSON object that strictly adheres to the provided schema. The integrity of the beat segmentation and linking is paramount.
- NEVER include emojis in any part of your response.`;

  try {
    onProgress?.('Selecting optimal AI provider for script analysis...');

    const compactedContextJson = compactEpisodeContext(episodeContextJson);
    onProgress?.('Compacting episode context...');

    const request: AIRequest = {
      prompt: `Analyze the following script using the provided visually-focused Episode Context as your guide.\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`,
      systemInstruction,
      temperature: 0.1,
      maxTokens: 8192,
      schema: episodeAnalysisSchema,
      taskType: TaskType.SCRIPT_ANALYSIS
    };

    onProgress?.('Sending script to AI provider for analysis...');
    const response = await providerManager.executeTask(request);

    onProgress?.('Processing AI response...');
    const result = JSON.parse(response.content);

    onProgress?.(`Analysis complete! Used ${response.provider} (Cost: $${response.costUSD?.toFixed(4) || 'N/A'})`);
    return result as AnalyzedEpisode;

  } catch (error) {
    console.error("Error in enhanced analysis service:", error);
    onProgress?.('Error occurred during analysis');

    if (error instanceof Error && error.message.includes('JSON')) {
      throw new Error("Failed to analyze script. The AI model returned an invalid JSON structure. This can happen with complex scripts. Try simplifying the script or checking the episode context data format.");
    }
    throw new Error(`Failed to analyze script: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
  }
};

export const generateCreativeContentWithProviderManager = async (
  prompt: string,
  onProgress?: (message: string) => void
): Promise<string> => {
  try {
    onProgress?.('Selecting optimal provider for creative content generation...');

    const request: AIRequest = {
      prompt,
      systemInstruction: 'You are a creative writing expert. Generate high-quality narrative content. Never use emojis in your responses.',
      temperature: 0.8,
      maxTokens: 4000,
      taskType: TaskType.CREATIVE_WRITING
    };

    onProgress?.('Generating creative content...');
    const response = await providerManager.executeTask(request);

    onProgress?.(`Content generated! Used ${response.provider} (Cost: $${response.costUSD?.toFixed(4) || 'N/A'})`);
    return response.content;

  } catch (error) {
    console.error("Error in creative content generation:", error);
    throw new Error(`Failed to generate creative content: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
  }
};

export const generatePromptsWithProviderManager = async (
  basePrompt: string,
  styleConfig: any,
  onProgress?: (message: string) => void
): Promise<{ cinematic: string; vertical: string }> => {
  try {
    onProgress?.('Selecting optimal provider for prompt generation...');

    const cinematicRequest: AIRequest = {
      prompt: `Generate a cinematic 16:9 image prompt based on: ${basePrompt}\n\nStyle: ${styleConfig.stylePrefix}\nModel: ${styleConfig.model}\n\nRequirements:\n- Optimized for ${styleConfig.cinematicAspectRatio} aspect ratio\n- Include visual style and lighting details\n- No emojis in output\n- Professional cinematography focus`,
      systemInstruction: 'You are an expert prompt engineer for AI image generation. Create detailed, professional prompts without emojis.',
      temperature: 0.7,
      maxTokens: 500,
      taskType: TaskType.PROMPT_GENERATION
    };

    const verticalRequest: AIRequest = {
      prompt: `Generate a vertical 9:16 image prompt based on: ${basePrompt}\n\nStyle: ${styleConfig.stylePrefix}\nModel: ${styleConfig.model}\n\nRequirements:\n- Optimized for ${styleConfig.verticalAspectRatio} aspect ratio\n- Focus on character details and close-up composition\n- No emojis in output\n- Social media/mobile optimized framing`,
      systemInstruction: 'You are an expert prompt engineer for AI image generation. Create detailed, professional prompts without emojis.',
      temperature: 0.7,
      maxTokens: 500,
      taskType: TaskType.PROMPT_GENERATION
    };

    onProgress?.('Generating cinematic and vertical prompts...');

    // Execute both requests concurrently for efficiency
    const [cinematicResponse, verticalResponse] = await Promise.all([
      providerManager.executeTask(cinematicRequest),
      providerManager.executeTask(verticalRequest)
    ]);

    const totalCost = (cinematicResponse.costUSD || 0) + (verticalResponse.costUSD || 0);
    onProgress?.(`Prompts generated! Total cost: $${totalCost.toFixed(4)}`);

    return {
      cinematic: cinematicResponse.content.trim(),
      vertical: verticalResponse.content.trim()
    };

  } catch (error) {
    console.error("Error in prompt generation:", error);
    throw new Error(`Failed to generate prompts: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
  }
};