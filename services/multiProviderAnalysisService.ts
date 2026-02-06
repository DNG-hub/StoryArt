// Multi-Provider Analysis Service
// Provides unified analysis function that routes to appropriate provider
// Implements per-scene analysis: splits script by ===SCENE=== markers,
// analyzes each scene independently, then assembles into a single AnalyzedEpisode.
// This eliminates the duplicate-scene bug caused by chunk-and-merge.

import type { AnalyzedEpisode, AnalyzedScene } from '../types';
import { compactEpisodeContext, splitScriptByScenes, parseEpisodeHeader, compactSceneContext } from '../utils';
import { analyzeScript } from './geminiService';
import { analyzeScriptWithQwen } from './qwenService';
import { processEpisodeWithState } from './beatStateService';
import type { LLMProvider } from '../types';

// Shared system instruction for all providers
const getSystemInstruction = () => `You are an expert AI **Visual Moment Architect** and **Continuity Supervisor** for episodic visual storytelling. Each scene is a standalone 15-20 minute YouTube video. Your goal is to decompose a script into individual VISUAL MOMENTS (camera compositions) for static-image video production.

**BEAT DEFINITION:** A beat = one distinct VISUAL MOMENT (one camera composition on screen).
- Duration: 15-30 seconds on screen (image hold time)
- Content: 1-3 sentences describing what the viewer SEES in this frame
- Each beat = one image. If the camera would CUT to a new shot, that is a new beat.
- Each beat MUST include full cinematographic direction in \`cameraAngleSuggestion\`.

**VISUAL MOMENT SPLIT RULES:** If you can imagine the editor cutting to a different camera angle, it is a separate beat.
| Scenario | Result |
| Screen/UI close-up + character reaction | 2 beats |
| Character A speaks + Character B responds | 2 beats |
| Same character, different action/expression | 2 beats |
| Wide establishing + character entry | 2 beats |
| Object focus + character holding it | 2 beats |

**SCENE TARGETS:**
- Total beats per scene: 45-60 (target 50)
- NEW_IMAGE: 37-50 per scene (any new framing, expression change, angle, action, or subject)
- REUSE_IMAGE: 8-15 per scene (ONLY when composition is truly identical; never 2+ consecutive)
- NO_IMAGE: 0-2 per scene max (extremely rare)
- Beat duration: 15-30 sec
- Images per minute: 2.5-4

**CINEMATOGRAPHIC DIRECTION (REQUIRED for every beat):**
Each beat's \`cameraAngleSuggestion\` MUST specify direction using validated FLUX vocabulary:

Shot Types (pick one): extreme close-up, close-up shot, intimate close-up shot, medium close-up, medium shot, upper-body portrait, cowboy shot, medium full shot, full body shot, wide shot, extreme wide shot, establishing shot, macro shot, forensic shot, silhouette shot

Camera Angles (pick one): eye-level shot, low angle shot, high angle shot, overhead shot, Dutch angle, front view, profile, three-quarter view, back view

Depth/Composition (pick one if relevant): shallow depth of field, deep depth of field, bokeh background, centered composition, symmetrical composition, foreground elements, framed by doorway

Lighting (pick 1-2): soft lighting, harsh lighting, dramatic lighting, natural lighting, rim lighting, side lighting, backlit, volumetric lighting

Example: "medium close-up, three-quarter view, shallow depth of field, dramatic rim lighting"

**YOUTUBE PACING (each scene is its own 15-20 min video):**
| Phase | Timing | Beats | Purpose |
| Hook | 0:00-0:30 | 1-2 | Provocative opening image |
| Setup | 0:30-3:00 | 5-10 | Establish scene + stakes |
| Build | 3:00-7:30 | 12-18 | Rising tension, escalating visuals |
| Peak | 7:30-8:00 | 1-2 | Tension peak (AD BREAK insertion point) |
| Reset | 8:00-10:00 | 5-8 | Post-break re-engagement |
| Develop | 10:00-15:00 | 12-18 | Core revelations + conflicts |
| Climax | 15:00-18:00 | 8-12 | Emotional peak |
| Resolve | 18:00-20:00 | 3-6 | Resolution or cliffhanger |

**TRANSITION RULES (static-image video format):**
- Standard hold: 15-25 sec per image (voiceover narration)
- Dramatic hold: 25-35 sec (slow zoom/pan applied in post)
- Rapid sequence: 8-15 sec (action beats, max 3-4 consecutive)
- Max hold: Never exceed 40 sec on single image
- Anti-slideshow: REUSE_IMAGE never more than 2 consecutive beats
- Camera variety: Never 3 consecutive beats with same framing/angle
- Environment beats: At least 2-3 per scene with no characters (establishing/atmosphere)

**Inputs:**
1.  **Script Text:** A scene from a screenplay (each scene is a standalone 15-20 min YouTube video).
2.  **Visually-Focused Episode Context JSON:** A "Director's Bible" containing visual data for characters and locations.

**Your Detailed Workflow:**

1.  **Visual Moment Decomposition (CRITICAL TASK):**
    *   **Objective:** Decompose the scene into **45-60 distinct visual moments**. Think like a cinematographer: every time the camera would CUT to a new angle, subject, or composition, that is a new beat.
    *   **Segmentation Process:** Read the scene carefully. For EVERY dialogue line, consider: speaker shot + listener reaction = 2 beats. For EVERY action, consider: wide context + close detail = 2 beats. For EVERY revelation, consider: the information + the character's reaction = 2 beats.
    *   **Pacing Rule:** Each beat = **15-30 seconds** of on-screen image hold time. Populate \`beat_duration_estimate_sec\` accordingly.

2.  **Populate Beat Metadata (CORE TASK):** For every visual moment:
    a.  **Identifiers:** Assign a unique \`beatId\` ('sX-bY') and a sequential \`beat_number\`.
    b.  **Visual Content (CRITICAL):**
        *   \`beat_title\`: Short, descriptive title (e.g., "Cat's Reaction Shot").
        *   \`core_action\`: 1-2 sentence summary of what the viewer SEES in this frame.
        *   \`beat_script_text\`: 1-3 sentences describing this visual moment from the script.
        *   \`source_paragraph\`: The broader narrative section this moment was extracted from.
    c.  **Narrative Analysis:**
        *   \`beat_type\`: Classify purpose ('Revelation', 'Action', 'Escalation', 'Pivot', 'Resolution', 'Other').
        *   \`narrative_function\`: Role in story structure.
        *   \`emotional_tone\`: Dominant mood.
    d.  **Cinematographic Direction (REQUIRED):**
        *   \`cameraAngleSuggestion\`: MUST contain FLUX-validated direction: "[shot_type], [camera_angle], [depth/composition], [lighting]"
        *   \`setting\`: Location and time of day.
        *   \`characters\`: Characters visible in this frame.
        *   \`visual_anchor\`: The single most powerful image for this moment.
        *   \`characterPositioning\`: How characters are positioned in frame.
        *   \`locationAttributes\`: 1-3 relevant 'prompt_fragment' strings from Episode Context artifacts. **USE THE RICH LOCATION DATA:** Include atmosphere descriptions, environmental details, key features. Pay special attention to 'atmosphere', 'atmosphere_category', 'geographical_location', 'time_period', and artifact 'prompt_fragment' values.
        *   \`transition_trigger\`: What leads to the next beat.
    e.  **Image Decision (Continuity Task):**
        i.  **Look Back:** Review all *previous* beats.
        ii. **Decide the Type:**
            - **'NEW_IMAGE'** (default): 37-50 per scene. Any new framing, expression change, angle, action, or subject.
            - **'REUSE_IMAGE'**: 8-15 per scene. ONLY when composition is truly identical. Never 2+ consecutive.
            - **'NO_IMAGE'**: 0-2 per scene max. Extremely rare.
        iii. **Provide Justification:** Write a concise 'reason'.
        iv. **Create the Link (CRITICAL):** If 'REUSE_IMAGE', you MUST populate 'reuseSourceBeatId'.

**Output:**
- Your entire response MUST be a single JSON object that strictly adheres to the provided schema.
- **VALIDATION CHECK:** Before submitting, count beats per scene. Target: 45-60 beats. Ensure each beat has FLUX-validated \`cameraAngleSuggestion\` with shot type + angle + lighting. Ensure NEW_IMAGE count is 37-50 per scene.`;

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
            description: "A list of 45-60 visual moment beats per scene. Each beat = one camera composition (one image on screen for 15-30 seconds).",
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
                cameraAngleSuggestion: { type: "string", description: "REQUIRED cinematographic direction using FLUX vocabulary. Format: '[shot_type], [camera_angle], [depth/composition], [lighting]'. Example: 'medium close-up, three-quarter view, shallow depth of field, dramatic rim lighting'." },
                characterPositioning: { type: "string", description: "Optional description of character positions and interactions." },
                locationAttributes: {
                  type: "array",
                  description: "An array of \`prompt_fragment\` strings extracted from the most relevant \`artifacts\` in the Episode Context JSON that apply to this specific beat.",
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
});

/**
 * Routes a single analysis call to the appropriate provider.
 * Used internally by the per-scene orchestrator and as fallback for scripts without scene markers.
 */
async function analyzeFullScript(
  provider: LLMProvider,
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> {
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
}

/**
 * Per-scene analysis orchestrator.
 * Splits the script by ===SCENE=== markers, analyzes each scene independently
 * with scene-specific context, then assembles into a single AnalyzedEpisode.
 * Eliminates the duplicate-scene bug from chunk-and-merge.
 */
export const analyzeScriptWithProvider = async (
  provider: LLMProvider,
  scriptText: string,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> => {
  // Step 1: Split script into individual scenes
  const scenes = splitScriptByScenes(scriptText);
  const episodeHeader = parseEpisodeHeader(scriptText);

  // Step 2: If no scene markers found, fall back to full-script analysis
  if (scenes.length <= 1 && scenes[0]?.title === 'Full Script') {
    onProgress?.(`No scene markers detected. Analyzing full script with ${provider.toUpperCase()}...`);
    const result = await analyzeFullScript(provider, scriptText, episodeContextJson, onProgress);
    onProgress?.('Applying beat carryover state...');
    return processEpisodeWithState(result);
  }

  onProgress?.(`Per-scene analysis: ${scenes.length} scenes detected. Analyzing with ${provider.toUpperCase()}...`);

  // Step 3: Analyze each scene in parallel
  const scenePromises = scenes.map(async (scene) => {
    const sceneTag = `[Scene ${scene.sceneNumber}/${scenes.length}]`;
    const sceneProgress = (msg: string) => onProgress?.(`${sceneTag} ${msg}`);

    // Create scene-specific context (only this scene's location/artifacts)
    const sceneContextJson = compactSceneContext(episodeContextJson, scene.sceneNumber);

    // Prepend per-scene instruction to the scene text so the AI knows it's analyzing one scene
    const sceneInstruction = `[SCENE ANALYSIS MODE: Analyze ONLY Scene ${scene.sceneNumber} of ${scenes.length}. Output exactly ONE scene with sceneNumber=${scene.sceneNumber}. All beatIds MUST use format 's${scene.sceneNumber}-bY' where Y is sequential from 1.]`;
    const sceneScriptText = `${sceneInstruction}\n\n${scene.text}`;

    sceneProgress('Starting analysis...');
    const sceneResult = await analyzeFullScript(provider, sceneScriptText, sceneContextJson, sceneProgress);

    // Extract the scene from the response
    if (!sceneResult.scenes || sceneResult.scenes.length === 0) {
      throw new Error(`Scene ${scene.sceneNumber} ("${scene.title}") analysis returned no scene data`);
    }

    const analyzedScene = sceneResult.scenes[0];
    // Ensure correct scene number (AI might return wrong number)
    analyzedScene.sceneNumber = scene.sceneNumber;

    sceneProgress(`Complete: ${analyzedScene.beats.length} beats`);
    return analyzedScene;
  });

  const analyzedScenes = await Promise.all(scenePromises);

  // Step 4: Assemble into single AnalyzedEpisode
  onProgress?.('Assembling episode from per-scene analyses...');
  const assembled: AnalyzedEpisode = {
    episodeNumber: episodeHeader.episodeNumber,
    title: episodeHeader.title,
    scenes: analyzedScenes.sort((a, b) => a.sceneNumber - b.sceneNumber)
  };

  // Step 5: Apply beat state carryover across the full episode
  onProgress?.('Applying beat carryover state...');
  const result = processEpisodeWithState(assembled);

  const totalBeats = result.scenes.reduce((sum, s) => sum + s.beats.length, 0);
  onProgress?.(`Analysis complete! ${result.scenes.length} scenes, ${totalBeats} total beats.`);

  return result;
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

