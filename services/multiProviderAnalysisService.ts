// Multi-Provider Analysis Service
// Provides unified analysis function that routes to appropriate provider

import type { AnalyzedEpisode } from '../types';
import { compactEpisodeContext } from '../utils';
import { analyzeScript } from './geminiService';
import { analyzeScriptWithQwen } from './qwenService';
import type { LLMProvider } from '../types';

// Shared system instruction for all providers
const getSystemInstruction = () => `You are an expert AI **Narrative Pacing Architect** and **Continuity Supervisor** for episodic visual storytelling, optimized for platforms like YouTube. Your primary goal is to structure a script into a rhythm of engaging narrative beats to maintain viewer attention, while also minimizing redundant image creation.

**BEAT DEFINITION:** A beat is a complete narrative unit (15-30 seconds) that:
- Captures a significant story moment or dialogue exchange
- Advances plot, character, or theme meaningfully
- Can be represented by a single key image
- Contains 1-3 sentences of script text

**Inputs:**
1.  **Script Text:** A full screenplay, typically divided into 4 scenes.
2.  **Visually-Focused Episode Context JSON:** A "Director's Bible" containing visual data for characters and locations.

**Your Detailed Workflow:**

1.  **Holistic Scene Analysis & Beat Segmentation (CRITICAL TASK):**
    *   **Objective:** Your main task is to analyze each scene and segment it into **MANY distinct narrative beats**. You MUST generate at least 35 beats per scene, ideally 35-45 beats (target 40). A beat is NOT a single line; it is a complete unit of narrative action, perspective, or thematic development. Capture EVERY significant moment, dialogue exchange, action, and character interaction with COMPLETE DETAIL.
    *   **Beat Definition:** A **Beat** advances plot, character, or theme, and can be represented by a single key image. It is a significant narrative or emotional inflection point. Beats should be FINE-GRAINED — each individual dialogue line, reaction, gesture, or visual change is its own beat.
    *   **Pacing Rule:** Each beat you define should correspond to approximately **15-30 seconds** of narrative time. For NEW_IMAGE beats, target **15-25 seconds** to maintain rapid visual pacing. For REUSE_IMAGE beats, use **10-20 seconds** since they don't require new visual processing. You must estimate this and populate \`beat_duration_estimate_sec\`.
    *   **Segmentation Process:** Read an entire scene carefully. You MUST identify at least 35 distinct beats, ideally 35-45 beats (target 40). Break down EVERY dialogue line into its own beat. Break down EVERY action, reaction, gesture, character entrance/exit, emotional shift, and plot development into separate beats. Each beat should contain 1-3 sentences of script text. Be MAXIMALLY granular — every single dialogue line gets its own beat, every reaction shot gets its own beat, every new camera angle or visual change gets its own beat. Include ALL action lines and dialogue across beats.

2.  **Populate Beat Metadata (CORE TASK):** For every single beat you have identified:
    a.  **Identifiers:** Assign a unique \`beatId\` ('sX-bY') and a sequential \`beat_number\`.
    b.  **Narrative Content (CRITICAL):**
        *   \`beat_title\`: Create a short, descriptive title (e.g., "The Reinforced Door").
        *   \`core_action\`: Write a **detailed 2-3 sentence summary** of what happens in the beat. Include specific actions, dialogue exchanges, character movements, and plot developments. This should be comprehensive enough to understand exactly what is being visualized.
        *   \`beat_script_text\`: Copy the **COMPLETE, VERBATIM block of script text** (action lines AND dialogue) that constitutes this entire beat. This must include ALL dialogue, action descriptions, and stage directions. Do NOT summarize or abbreviate - include the full text exactly as it appears in the script.
        *   \`source_paragraph\`: Copy the **BROADER NARRATIVE PARAGRAPH or section** from the original script that this beat was extracted from. This should include the surrounding context and any additional narrative text that provides fuller understanding of the scene flow. This gives refinement context beyond just the individual beat text.
    c.  **Narrative Analysis:**
        *   \`beat_type\`: Classify the beat's primary purpose ('Revelation', 'Action', 'Escalation', 'Pivot', 'Resolution', 'Other').
        *   \`narrative_function\`: Describe its role in the story (e.g., "Inciting Incident," "Rising Action").
        *   \`emotional_tone\`: Define the dominant mood (e.g., "Tense," "Suspicious").
    d.  **Visual & Contextual Details:**
        *   \`setting\`: State the location and time of day.
        *   \`characters\`: List the characters present.
        *   \`visual_anchor\`: Describe the single most powerful image that represents this beat.
        *   \`transition_trigger\`: What event in this beat leads to the next one?
        *   \`locationAttributes\`: From the Episode Context's 'artifacts' for the current scene's location, you MUST select the 1-3 most relevant 'prompt_fragment' strings that best match the beat's action and populate the array. This is mandatory for visual consistency. **USE THE RICH LOCATION DATA:** Include atmosphere descriptions, environmental details, key features, and artifact prompt fragments from the detailed location context provided. Pay special attention to 'atmosphere', 'atmosphere_category', 'geographical_location', 'time_period', and rich artifact descriptions with their 'prompt_fragment' values.
    e.  **Image Decision (Continuity Task):**
        i.  **Look Back:** Review all *previous* beats in the script.
        ii. **Decide the Type:**
            - **'NEW_IMAGE':** Choose this if the beat represents a distinct visual moment: a new location, a character's first appearance, a significant change in composition, a key action, an emotional revelation, etc.
            - **'REUSE_IMAGE':** Choose this if the visual scene is substantially identical to a previous beat. The same characters, same location, same general framing—but perhaps a continuation of dialogue or subtle action. This saves image generation costs. Target: 28-36 NEW_IMAGE beats per scene, with 7-12 REUSE_IMAGE beats for efficiency.
            - **'NO_IMAGE':** Rarely used. For beats with no visual component at all (e.g., pure internal monologue with no character shown).
        iii. **Provide Justification:** Write a concise 'reason' for your decision.
        iv. **Create the Link (CRITICAL):** If your 'type' is 'REUSE_IMAGE', you MUST populate 'reuseSourceBeatId' with the 'beatId' from the earlier beat whose image you are reusing. This is not optional.

**Output:**
- Your entire response MUST be a single JSON object that strictly adheres to the provided schema. The integrity of the beat segmentation and linking is paramount.
- **VALIDATION CHECK:** Before submitting your response, count the beats in each scene. Each scene MUST have 35-45 beats (target 40). Ensure each beat contains complete narrative content with 1-3 sentences of script text.`;

// Response schema (same for all providers)
const getResponseSchema = () => ({
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
                beat_script_text: { type: "string", description: "The full, verbatim script text (including action lines and dialogue) that constitutes this entire beat." },
                emotional_tone: { type: "string", description: "The dominant emotion or mood of the beat (e.g., 'Tense', 'Hopeful')." },
                visual_anchor: { type: "string", description: "A description of the single, most powerful image that could represent this beat." },
                transition_trigger: { type: "string", description: "The event or discovery that leads into the next beat." },
                beat_duration_estimate_sec: { type: "number", description: "An estimated duration for this beat in seconds, typically between 15 and 30." },
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
                cameraAngleSuggestion: { type: "string", description: "Optional suggestion for camera framing or perspective." },
                characterPositioning: { type: "string", description: "Optional description of character positions and interactions." },
                locationAttributes: {
                  type: "array",
                  description: "An array of \`prompt_fragment\` strings extracted from the most relevant \`artifacts\` in the Episode Context JSON that apply to this specific beat.",
                  items: { type: "string" }
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
});

/**
 * Unified analysis function that routes to the appropriate provider
 */
export const analyzeScriptWithProvider = async (
  provider: LLMProvider,
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> => {
  onProgress?.(`Analyzing script with ${provider.toUpperCase()}...`);
  
  switch (provider) {
    case 'gemini':
      return await analyzeScript(scriptText, episodeContextJson, onProgress);
    
    case 'qwen':
      return await analyzeScriptWithQwen(scriptText, episodeContextJson, onProgress);
    
    case 'claude':
      return await analyzeScriptWithClaude(scriptText, episodeContextJson, onProgress);
    
    case 'openai':
      return await analyzeScriptWithOpenAI(scriptText, episodeContextJson, onProgress);
    
    case 'xai':
      return await analyzeScriptWithXAI(scriptText, episodeContextJson, onProgress);
    
    case 'deepseek':
      return await analyzeScriptWithDeepSeek(scriptText, episodeContextJson, onProgress);
    
    case 'glm':
      return await analyzeScriptWithGLM(scriptText, episodeContextJson, onProgress);
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

// Claude Analysis Implementation
async function analyzeScriptWithClaude(
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_CLAUDE_API_KEY is not configured in .env file.");
  }

  onProgress?.('Connecting to Claude API...');
  const compactedContextJson = compactEpisodeContext(episodeContextJson);
  onProgress?.('Compacting episode context...');

  const systemInstruction = getSystemInstruction();
  const responseSchema = getResponseSchema();

  onProgress?.('Sending script to Claude for analysis...');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: parseInt(import.meta.env.VITE_CLAUDE_MAX_TOKENS || '200000'),
      temperature: parseFloat(import.meta.env.VITE_CLAUDE_TEMPERATURE || '0.1'),
      messages: [{
        role: 'user',
        content: `Analyze the following script using the provided visually-focused Episode Context as your guide.\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`
      }],
      system: systemInstruction
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  onProgress?.('Processing Claude response...');
  const data = await response.json();
  const content = data.content[0].text;

  // Claude returns JSON in text, need to parse it
  try {
    const result = JSON.parse(content);
    onProgress?.('Analysis complete!');
    return result as AnalyzedEpisode;
  } catch (error) {
    throw new Error(`Failed to parse Claude response as JSON: ${error.message}`);
  }
}

// OpenAI Analysis Implementation
async function analyzeScriptWithOpenAI(
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_OPENAI_API_KEY is not configured in .env file.");
  }

  onProgress?.('Connecting to OpenAI API...');
  const compactedContextJson = compactEpisodeContext(episodeContextJson);
  onProgress?.('Compacting episode context...');

  const systemInstruction = getSystemInstruction();
  const responseSchema = getResponseSchema();

  onProgress?.('Sending script to OpenAI for analysis...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: `Analyze the following script using the provided visually-focused Episode Context as your guide. You MUST respond with valid JSON matching this schema: ${JSON.stringify(responseSchema)}\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`
        }
      ],
      max_tokens: parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS || '16384'),
      temperature: parseFloat(import.meta.env.VITE_OPENAI_TEMPERATURE || '0.1'),
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  onProgress?.('Processing OpenAI response...');
  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const result = typeof content === 'string' ? JSON.parse(content) : content;
    onProgress?.('Analysis complete!');
    return result as AnalyzedEpisode;
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${error.message}`);
  }
}

// XAI Analysis Implementation
async function analyzeScriptWithXAI(
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> {
  const apiKey = import.meta.env.VITE_XAI_API_KEY || import.meta.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_XAI_API_KEY is not configured in .env file.");
  }

  onProgress?.('Connecting to XAI API...');
  const compactedContextJson = compactEpisodeContext(episodeContextJson);
  onProgress?.('Compacting episode context...');

  const systemInstruction = getSystemInstruction();
  const responseSchema = getResponseSchema();

  onProgress?.('Sending script to XAI for analysis...');

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_XAI_MODEL || 'grok-3',
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: `Analyze the following script using the provided visually-focused Episode Context as your guide. You MUST respond with valid JSON matching this schema: ${JSON.stringify(responseSchema)}\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`
        }
      ],
      max_tokens: parseInt(import.meta.env.VITE_XAI_MAX_TOKENS || '8192'),
      temperature: parseFloat(import.meta.env.VITE_XAI_TEMPERATURE || '0.1'),
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`XAI API error: ${response.status} - ${errorText}`);
  }

  onProgress?.('Processing XAI response...');
  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const result = typeof content === 'string' ? JSON.parse(content) : content;
    onProgress?.('Analysis complete!');
    return result as AnalyzedEpisode;
  } catch (error) {
    throw new Error(`Failed to parse XAI response as JSON: ${error.message}`);
  }
}

// DeepSeek Analysis Implementation
async function analyzeScriptWithDeepSeek(
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_DEEPSEEK_API_KEY is not configured in .env file.");
  }

  onProgress?.('Connecting to DeepSeek API...');
  const compactedContextJson = compactEpisodeContext(episodeContextJson);
  onProgress?.('Compacting episode context...');

  const systemInstruction = getSystemInstruction();
  const responseSchema = getResponseSchema();

  onProgress?.('Sending script to DeepSeek for analysis...');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: `Analyze the following script using the provided visually-focused Episode Context as your guide. You MUST respond with valid JSON matching this schema: ${JSON.stringify(responseSchema)}\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`
        }
      ],
      max_tokens: parseInt(import.meta.env.VITE_DEEPSEEK_MAX_TOKENS || '8192'),
      temperature: parseFloat(import.meta.env.VITE_DEEPSEEK_TEMPERATURE || '0.1'),
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  onProgress?.('Processing DeepSeek response...');
  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const result = typeof content === 'string' ? JSON.parse(content) : content;
    onProgress?.('Analysis complete!');
    return result as AnalyzedEpisode;
  } catch (error) {
    throw new Error(`Failed to parse DeepSeek response as JSON: ${error.message}`);
  }
}

// GLM Analysis Implementation
async function analyzeScriptWithGLM(
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> {
  const apiKey = import.meta.env.VITE_ZHIPU_API_KEY || import.meta.env.ZHIPU_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_ZHIPU_API_KEY is not configured in .env file.");
  }

  onProgress?.('Connecting to GLM (Zhipu AI) API...');
  const compactedContextJson = compactEpisodeContext(episodeContextJson);
  onProgress?.('Compacting episode context...');

  const systemInstruction = getSystemInstruction();
  const responseSchema = getResponseSchema();

  const baseUrl = import.meta.env.VITE_ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';

  onProgress?.('Sending script to GLM for analysis...');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_ZHIPU_MODEL || 'glm-4',
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: `Analyze the following script using the provided visually-focused Episode Context as your guide. You MUST respond with valid JSON matching this schema: ${JSON.stringify(responseSchema)}\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`
        }
      ],
      max_tokens: parseInt(import.meta.env.VITE_ZHIPU_MAX_TOKENS || '8192'),
      temperature: parseFloat(import.meta.env.VITE_ZHIPU_TEMPERATURE || '0.1'),
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM API error: ${response.status} - ${errorText}`);
  }

  onProgress?.('Processing GLM response...');
  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const result = typeof content === 'string' ? JSON.parse(content) : content;
    onProgress?.('Analysis complete!');
    return result as AnalyzedEpisode;
  } catch (error) {
    throw new Error(`Failed to parse GLM response as JSON: ${error.message}`);
  }
}

