/**
 * Multi-Provider Analysis Service (OpenRouter Edition)
 *
 * Unified interface for script analysis using OpenRouter.
 * Replaces individual API key management for Claude, OpenAI, Qwen, DeepSeek, xAI, GLM.
 *
 * Single source of truth: VITE_OPENROUTER_API_KEY in .env
 */

import 'dotenv/config';
import type { AnalyzedEpisode } from '../types';
import { compactEpisodeContext } from '../utils';
import { callOpenRouter, OPENROUTER_MODELS } from './openrouterService';
import type { LLMProvider } from '../types';

/**
 * Map LLM provider names to OpenRouter model IDs
 * Note: Claude 3.5 Sonnet removed per user preference
 */
const PROVIDER_TO_MODEL: Record<LLMProvider, string> = {
  // Primary options
  openai: OPENROUTER_MODELS.GPT_4O,

  // Remapped (Sonnet removed)
  claude: OPENROUTER_MODELS.LLAMA_3_1_405B, // Llama (best value)

  // Alternative providers
  qwen: OPENROUTER_MODELS.QWEN_TURBO,
  deepseek: OPENROUTER_MODELS.DEEPSEEK_CHAT,

  // Fallbacks (unavailable models)
  xai: OPENROUTER_MODELS.MISTRAL_LARGE, // xAI unavailable → Mistral
  glm: OPENROUTER_MODELS.GPT_4_TURBO, // GLM unavailable → GPT-4 Turbo

  // Gemini: Still uses direct Gemini API (not OpenRouter)
  // Kept separate for VBS Phase B compatibility
  gemini: OPENROUTER_MODELS.GPT_4O, // Fallback if somehow called
};

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
        *   \`source_paragraph\`: Copy the **BROADER NARRATIVE PARAGRAPH or section** from the original script that this beat was extracted from. This should include the surrounding context and any additional narrative text that provides fuller understanding of the scene flow.
    c.  **Narrative Analysis:**
        *   \`beat_type\`: Classify the beat's primary purpose ('Revelation', 'Action', 'Escalation', 'Pivot', 'Resolution', 'Other').
        *   \`narrative_function\`: Describe its role in the story (e.g., "Inciting Incident," "Rising Action").
        *   \`emotional_tone\`: Define the dominant mood (e.g., "Tense," "Suspicious").
    d.  **Visual & Contextual Details:**
        *   \`setting\`: State the location and time of day.
        *   \`characters\`: List the characters present.
        *   \`visual_anchor\`: Describe the single most powerful image that represents this beat.
        *   \`transition_trigger\`: What event in this beat leads to the next one?
        *   \`locationAttributes\`: From the Episode Context's 'artifacts' for the current scene's location, you MUST select the 1-3 most relevant 'prompt_fragment' strings that best match the beat's action.
    e.  **Image Decision (Continuity Task):**
        i.  **Look Back:** Review all *previous* beats in the script.
        ii. **Decide the Type:**
            - **'NEW_IMAGE':** Choose this if the beat represents a distinct visual moment: a new location, a character's first appearance, a significant change in composition, a key action, an emotional revelation, etc.
            - **'REUSE_IMAGE':** Choose this if the visual scene is substantially identical to a previous beat. The same characters, same location, same general framing—but perhaps a continuation of dialogue or subtle action. This saves image generation costs. Target: 28-36 NEW_IMAGE beats per scene, with 7-12 REUSE_IMAGE beats for efficiency.
            - **'NO_IMAGE':** Rarely used. For beats with no visual component at all.
        iii. **Provide Justification:** Write a concise 'reason' for your decision.
        iv. **Create the Link (CRITICAL):** If your 'type' is 'REUSE_IMAGE', you MUST populate 'reuseSourceBeatId' with the 'beatId' from the earlier beat whose image you are reusing.

**Output:**
- Your entire response MUST be a single JSON object that strictly adheres to the provided schema.
- **VALIDATION CHECK:** Before submitting your response, count the beats in each scene. Each scene MUST have 35-45 beats (target 40).`;

/**
 * Unified analysis function that routes through OpenRouter
 */
export const analyzeScriptWithProvider = async (
  provider: LLMProvider,
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> => {
  // Special handling for Gemini (uses direct API, not OpenRouter)
  if (provider === 'gemini') {
    onProgress?.('Note: Gemini analysis uses direct API (not OpenRouter)');
    const { analyzeScript } = await import('./geminiService');
    return await analyzeScript(scriptText, episodeContextJson, onProgress);
  }

  const modelId = PROVIDER_TO_MODEL[provider];
  if (!modelId) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  onProgress?.(`Analyzing script with ${provider} via OpenRouter...`);

  const systemInstruction = getSystemInstruction();
  const compactedContext = compactEpisodeContext(episodeContextJson);

  const userPrompt = `Analyze the following script using the provided visually-focused Episode Context as your guide.

---SCRIPT---
${scriptText}

---EPISODE CONTEXT JSON---
${compactedContext}

You MUST respond with valid JSON.`;

  try {
    onProgress?.(`Sending request to OpenRouter (model: ${provider})...`);

    const response = await callOpenRouter(
      modelId,
      systemInstruction,
      userPrompt,
      0.1, // Low temperature for deterministic beat analysis
      16000 // Max tokens for response
    );

    if (!response.success) {
      throw new Error(`OpenRouter API error: ${response.error}`);
    }

    onProgress?.(`Parsing response from ${provider}...`);

    // Parse response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response');
    }

    let result: AnalyzedEpisode;
    try {
      result = JSON.parse(jsonMatch[0]) as AnalyzedEpisode;
    } catch (parseError) {
      throw new Error(`Failed to parse response as JSON: ${parseError}`);
    }

    onProgress?.(`✅ Analysis complete using ${provider}`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    onProgress?.(`❌ Analysis failed: ${errorMessage}`);
    throw new Error(`Script analysis failed with ${provider}: ${errorMessage}`);
  }
};

/**
 * Get available models for script analysis
 */
export async function getAvailableModelsForScriptAnalysis() {
  return {
    providers: Object.entries(PROVIDER_TO_MODEL).map(([name, modelId]) => ({
      name: name as LLMProvider,
      modelId,
      displayName: {
        openai: 'GPT-4o',
        claude: 'Llama 3.1 405B (Claude requests)',
        qwen: 'Qwen Turbo',
        deepseek: 'DeepSeek Chat',
        xai: 'Mistral Large (xAI fallback)',
        glm: 'GPT-4 Turbo (GLM fallback)',
        gemini: 'Gemini (Direct API)',
      }[name as LLMProvider] || name,
    })),
    message: 'All non-Gemini providers available via OpenRouter API. Gemini uses direct API.'
  };
}
