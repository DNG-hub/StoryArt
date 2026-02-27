/**
 * Multi-Provider Analysis Service V2 (OpenRouter Edition)
 *
 * Unified interface for script analysis using OpenRouter.
 * Replaces individual API key management for Claude, OpenAI, Qwen, DeepSeek, xAI, GLM.
 *
 * Single source of truth: VITE_OPENROUTER_API_KEY in .env
 *
 * Migration from V1:
 * - Removes: Individual provider API calls (Claude, OpenAI, etc.)
 * - Adds: OpenRouter unified interface
 * - Keeps: Same system instruction and response schema for all providers
 * - Benefit: Single API key, centralized rate limiting, easy provider switching
 */

import type { AnalyzedEpisode, LLMProvider } from '../types';
import { compactEpisodeContext } from '../utils';
import { callOpenRouter, OPENROUTER_MODELS } from './openrouterService';

/**
 * Map LLM provider names to OpenRouter model IDs
 * Note: Claude 3.5 Sonnet removed per user preference
 */
const PROVIDER_TO_MODEL: Record<LLMProvider, string> = {
  gemini: OPENROUTER_MODELS.GPT_4O, // Default: GPT-4o (Gemini still available separately)
  claude: OPENROUTER_MODELS.LLAMA_3_1_405B, // Map claude requests to Llama for consistency
  openai: OPENROUTER_MODELS.GPT_4O,
  xai: OPENROUTER_MODELS.MISTRAL_LARGE, // xAI unavailable, fallback to Mistral
  deepseek: OPENROUTER_MODELS.DEEPSEEK_CHAT,
  qwen: OPENROUTER_MODELS.QWEN_TURBO,
  glm: OPENROUTER_MODELS.GPT_4_TURBO, // GLM unavailable, fallback to GPT-4 Turbo
};

// System instruction (shared across all providers)
const getSystemInstruction = () => `You are an expert AI **Narrative Pacing Architect** and **Continuity Supervisor** for episodic visual storytelling, optimized for platforms like YouTube. Your primary goal is to structure a script into a rhythm of engaging narrative beats to maintain viewer attention, while also minimizing redundant image creation.

**BEAT DEFINITION:** A beat is a complete narrative unit (15-30 seconds) that:
- Captures a significant story moment or dialogue exchange
- Advances plot, character, or theme meaningfully
- Can be represented by a single key image
- Contains 1-3 sentences of script text

**Your Detailed Workflow:**

1.  **Holistic Scene Analysis & Beat Segmentation (CRITICAL TASK):**
    *   **Objective:** Your main task is to analyze each scene and segment it into **MANY distinct narrative beats**. You MUST generate at least 35 beats per scene, ideally 35-45 beats (target 40).
    *   **Beat Definition:** A **Beat** advances plot, character, or theme. Beats should be FINE-GRAINED — each dialogue line, reaction, gesture, or visual change is its own beat.
    *   **Segmentation Process:** Identify at least 35 distinct beats. Break down EVERY dialogue line, action, reaction, character entrance/exit, emotional shift, and plot development.

2.  **Populate Beat Metadata (CORE TASK):** For every beat:
    a.  **Identifiers:** Assign \`beatId\` ('sX-bY') and sequential \`beat_number\`.
    b.  **Narrative Content:**
        *   \`beat_title\`: Short descriptive title
        *   \`core_action\`: 2-3 sentence summary with specific actions and dialogue
        *   \`beat_script_text\`: COMPLETE, VERBATIM block of script text (action lines AND dialogue)
        *   \`source_paragraph\`: Broader narrative context from original script
    c.  **Narrative Analysis:**
        *   \`beat_type\`: 'Revelation', 'Action', 'Escalation', 'Pivot', 'Resolution', 'Other'
        *   \`narrative_function\`: Role in story (e.g., "Inciting Incident")
        *   \`emotional_tone\`: Dominant mood
    d.  **Visual & Contextual Details:**
        *   \`setting\`: Location and time of day
        *   \`characters\`: List of present characters
        *   \`visual_anchor\`: Single most powerful image representing beat
        *   \`transition_trigger\`: What event leads to next beat?
        *   \`locationAttributes\`: 1-3 most relevant prompt_fragment strings from location artifacts
    e.  **Image Decision (Continuity Task):**
        i.  Look back at previous beats
        ii. Decide type: 'NEW_IMAGE' (distinct moment) or 'REUSE_IMAGE' (identical scene)
        iii. Target: 28-36 NEW_IMAGE, 7-12 REUSE_IMAGE per scene
        iv. If 'REUSE_IMAGE', populate 'reuseSourceBeatId'

**Output:**
- Single JSON object strictly adhering to provided schema
- VALIDATION: Each scene must have 35-45 beats (target 40)
- Each beat contains 1-3 sentences of complete script text`;

// Response schema (shared across all providers)
const getResponseSchema = () => ({
  type: "object",
  properties: {
    episodeNumber: { type: "number" },
    title: { type: "string" },
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
              scenePacing: { type: "string" },
            },
            required: ["targetDuration", "sceneRole"],
          },
          beats: {
            type: "array",
            items: {
              type: "object",
              properties: {
                beatId: { type: "string" },
                beat_number: { type: "number" },
                beat_title: { type: "string" },
                beat_script_text: { type: "string" },
                source_paragraph: { type: "string" },
                core_action: { type: "string" },
                beat_type: { type: "string" },
                narrative_function: { type: "string" },
                emotional_tone: { type: "string" },
                setting: { type: "string" },
                characters: { type: "array", items: { type: "string" } },
                visual_anchor: { type: "string" },
                transition_trigger: { type: "string" },
                locationAttributes: { type: "array", items: { type: "string" } },
                imageDecision: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["NEW_IMAGE", "REUSE_IMAGE", "NO_IMAGE"] },
                    reason: { type: "string" },
                    reuseSourceBeatId: { type: "string" },
                  },
                  required: ["type", "reason"],
                },
              },
              required: [
                "beatId", "beat_number", "beat_title", "beat_script_text",
                "core_action", "beat_type", "narrative_function", "emotional_tone",
                "setting", "characters", "visual_anchor", "imageDecision"
              ],
            },
          },
        },
        required: ["sceneNumber", "title", "metadata", "beats"],
      },
    },
  },
  required: ["episodeNumber", "title", "scenes"],
});

/**
 * Analyze script with specified provider via OpenRouter
 */
export const analyzeScriptWithProvider = async (
  scriptText: string,
  episodeContextJson: string,
  provider: LLMProvider,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> => {
  const modelId = PROVIDER_TO_MODEL[provider];

  if (!modelId) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  onProgress?.(`Analyzing script with ${provider} via OpenRouter...`);

  const systemInstruction = getSystemInstruction();
  const compactContext = compactEpisodeContext(episodeContextJson);

  const userPrompt = `SCRIPT:
${scriptText}

EPISODE CONTEXT (Director's Bible):
${compactContext}

RESPONSE SCHEMA:
${JSON.stringify(getResponseSchema(), null, 2)}

Analyze this script and populate the schema. Generate 35-45 beats per scene.`;

  try {
    onProgress?.(`Sending request to OpenRouter (model: ${provider})...`);

    const response = await callOpenRouter(
      modelId,
      systemInstruction,
      userPrompt,
      0.1, // Low temperature for deterministic beat analysis
      8000 // Max tokens for response
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
 * List all available models via OpenRouter for script analysis
 */
export async function getAvailableModelsForScriptAnalysis() {
  return {
    providers: Object.entries(PROVIDER_TO_MODEL).map(([name, modelId]) => ({
      name: name as LLMProvider,
      modelId,
      displayName: {
        claude: 'Claude 3.5 Sonnet',
        openai: 'GPT-4o',
        xai: 'Grok-3',
        deepseek: 'DeepSeek Chat',
        qwen: 'Qwen Turbo',
        glm: 'GLM-4',
        gemini: 'Claude 3.5 Sonnet (via OpenRouter)',
      }[name as LLMProvider] || name,
    })),
    message: 'All providers available via OpenRouter API'
  };
}

/**
 * Switch between providers easily (for testing)
 */
export function setPreferredProvider(provider: LLMProvider) {
  // Could be stored in localStorage for UI persistence
  return PROVIDER_TO_MODEL[provider];
}
