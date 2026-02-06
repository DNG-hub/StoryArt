import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedEpisode } from '../types';
import { compactEpisodeContext } from '../utils';

// Read API key from .env
// Support both Vite (import.meta.env) and Node.js (process.env) environments
const getApiKey = () => {
  // Check if we're in Node.js context (tsx/node) or Vite context
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // Vite environment
    return import.meta.env.VITE_GEMINI_API_KEY ||
           import.meta.env.GEMINI_API_KEY;
  }
  // Node.js environment (tsx, node)
  return (process.env as any).VITE_GEMINI_API_KEY ||
         (process.env as any).GEMINI_API_KEY ||
         (process.env as any).API_KEY;
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.");
}

// Create a function to get a fresh instance with current API key (allows key refresh)
const getGeminiClient = () => {
  const currentKey = getApiKey();
  if (!currentKey) {
    throw new Error("VITE_GEMINI_API_KEY is not configured in .env file. Please set it and restart the dev server.");
  }
  return new GoogleGenAI({ apiKey: currentKey });
};

// Initialize with current API key from .env
let ai = getGeminiClient();

// Function to refresh client with new API key (if .env was updated)
export const refreshGeminiClient = () => {
  ai = getGeminiClient();
};

// Read Gemini model from .env — NEVER hardcode the model
export const getGeminiModel = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_GEMINI_MODEL ||
           import.meta.env.GEMINI_MODEL ||
           'gemini-2.0-flash';
  }
  return (process.env as any).VITE_GEMINI_MODEL ||
         (process.env as any).GEMINI_MODEL ||
         'gemini-2.0-flash';
};

// Read Gemini temperature from .env — NEVER hardcode the temperature
export const getGeminiTemperature = (): number => {
  const temp = (() => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_GEMINI_TEMPERATURE ||
             import.meta.env.GEMINI_TEMPERATURE;
    }
    return (process.env as any).VITE_GEMINI_TEMPERATURE ||
           (process.env as any).GEMINI_TEMPERATURE;
  })();
  return temp ? parseFloat(temp) : 0.1; // Low temp for structured JSON output
};

// Read Gemini max tokens from .env
export const getGeminiMaxTokens = (): number => {
  const tokens = (() => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_GEMINI_MAX_TOKENS ||
             import.meta.env.GEMINI_MAX_TOKENS;
    }
    return (process.env as any).VITE_GEMINI_MAX_TOKENS ||
           (process.env as any).GEMINI_MAX_TOKENS;
  })();
  return tokens ? parseInt(tokens) : 65536; // Gemini 2.0/2.5 Flash max output token limit
};

// Log active Gemini config on startup
console.log(`[Gemini Config] Model: ${getGeminiModel()}, Temperature: ${getGeminiTemperature()}, MaxTokens: ${getGeminiMaxTokens()}`);

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    episodeNumber: { type: Type.NUMBER, description: "The episode number parsed from the script." },
    title: { type: Type.STRING, description: "The episode title parsed from the script." },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.NUMBER },
          title: { type: Type.STRING },
          metadata: {
            type: Type.OBJECT,
            properties: {
              targetDuration: { type: Type.STRING },
              sceneRole: { type: Type.STRING },
              timing: { type: Type.STRING },
              adBreak: { type: Type.BOOLEAN },
            },
            required: ['targetDuration', 'sceneRole', 'timing', 'adBreak']
          },
          beats: {
            type: Type.ARRAY,
            description: "A list of 45-60 visual moment beats per scene. Each beat = one camera composition (one image on screen for 15-30 seconds).",
            items: {
              type: Type.OBJECT,
              properties: {
                beatId: { type: Type.STRING, description: "A unique identifier for this beat, in the format 'sX-bY' where X is scene number and Y is beat number (e.g., 's1-b2')." },
                beat_number: { type: Type.NUMBER, description: "The sequential number of the beat within the scene, starting from 1." },
                beat_title: { type: Type.STRING, description: "A short, descriptive title for the beat (e.g., 'The Ruins')." },
                beat_type: { type: Type.STRING, description: "Classification of the beat's primary narrative purpose. Must be one of: 'Revelation', 'Action', 'Escalation', 'Pivot', 'Resolution', or 'Other'." },
                narrative_function: { type: Type.STRING, description: "The beat's role in the story structure (e.g., 'Inciting Incident', 'Rising Action')." },
                setting: { type: Type.STRING, description: "The setting of the beat, including location and time of day." },
                characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of characters present in the beat." },
                core_action: { type: Type.STRING, description: "A concise, one-sentence summary of the beat's main action or event." },
                beat_script_text: { type: Type.STRING, description: "1-3 sentences describing the visual moment. What the viewer SEES in this single frame/composition." },
                source_paragraph: { type: Type.STRING, description: "The broader narrative paragraph or section from the original script that this beat was extracted from. This provides additional context beyond just the beat text." },
                emotional_tone: { type: Type.STRING, description: "The dominant emotion or mood of the beat (e.g., 'Tense', 'Hopeful')." },
                visual_anchor: { type: Type.STRING, description: "A description of the single, most powerful image that could represent this beat." },
                transition_trigger: { type: Type.STRING, description: "The event or discovery that leads into the next beat." },
                beat_duration_estimate_sec: { type: Type.NUMBER, description: "Estimated on-screen hold time for this image in seconds, typically between 15 and 30." },
                visualSignificance: { type: Type.STRING, description: "How important this beat is to visualize: 'High', 'Medium', or 'Low'." },
                imageDecision: {
                  type: Type.OBJECT,
                  description: "The final decision on image creation for this beat, including reuse logic.",
                  properties: {
                    type: { type: Type.STRING, description: "The decision type: 'NEW_IMAGE', 'REUSE_IMAGE', or 'NO_IMAGE'." },
                    reason: { type: Type.STRING, description: "The justification for the decision." },
                    reuseSourceBeatId: { type: Type.STRING, description: "If type is 'REUSE_IMAGE', this is the 'beatId' of the beat whose image should be reused." },
                    reuseSourceBeatLabel: { type: Type.STRING, description: "A human-readable label for the source beat. THIS WILL BE POPULATED BY a post-processing step; you can leave it blank." },
                  },
                  required: ['type', 'reason'],
                },
                cameraAngleSuggestion: { type: Type.STRING, description: "REQUIRED cinematographic direction using FLUX vocabulary. Format: '[shot_type], [camera_angle], [depth/composition], [lighting]'. Example: 'medium close-up, three-quarter view, shallow depth of field, dramatic rim lighting'." },
                characterPositioning: { type: Type.STRING, description: "Optional description of character positions and interactions." },
                locationAttributes: {
                    type: Type.ARRAY,
                    description: "An array of `prompt_fragment` strings extracted from the most relevant `artifacts` in the Episode Context JSON that apply to this specific beat.",
                    items: { type: Type.STRING }
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


// Helper function to parse Gemini JSON response
async function parseGeminiResponse(jsonString: string): Promise<AnalyzedEpisode> {
  console.log('Raw Gemini response length:', jsonString.length);
  console.log('Raw Gemini response preview:', jsonString.substring(0, 500) + '...');
  console.log('Raw Gemini response end:', '...' + jsonString.substring(jsonString.length - 500));

  try {
    // Try to clean and validate the JSON response
    let cleanedJsonString = jsonString;

    // Check if the response appears to be truncated
    if (!cleanedJsonString.trim().endsWith('}')) {
      console.warn('Response appears to be truncated, attempting to repair...');

      // Find the last complete object/array closing
      const lastCompleteIndex = Math.max(
        cleanedJsonString.lastIndexOf('}}'),
        cleanedJsonString.lastIndexOf(']}'),
        cleanedJsonString.lastIndexOf('}]')
      );

      if (lastCompleteIndex > cleanedJsonString.length * 0.8) {
        cleanedJsonString = cleanedJsonString.substring(0, lastCompleteIndex + 2);
      } else {
        // Try to find a complete JSON structure by matching braces
        let openBraces = 0;
        let inString = false;
        let escape = false;
        let lastValidIndex = -1;

        for (let i = 0; i < cleanedJsonString.length; i++) {
          const char = cleanedJsonString[i];

          if (escape) {
            escape = false;
            continue;
          }

          if (char === '\\') {
            escape = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === '{') openBraces++;
            else if (char === '}') openBraces--;

            if (openBraces === 0 && i > 0) {
              lastValidIndex = i;
              break;
            }
          }
        }

        if (lastValidIndex > -1) {
          cleanedJsonString = cleanedJsonString.substring(0, lastValidIndex + 1);
        }
      }
    }

    // Remove any potential control characters that might cause issues
    cleanedJsonString = cleanedJsonString.replace(/[\x00-\x1F\x7F]/g, '');

    const result = JSON.parse(cleanedJsonString);
    return result as AnalyzedEpisode;
  } catch (parseError) {
    console.error('JSON Parse Error Details:', parseError);
    console.error('Original response length:', jsonString.length);
    console.error('Response preview (first 500):', jsonString.substring(0, 500));
    console.error('Response preview (last 500):', jsonString.substring(Math.max(0, jsonString.length - 500)));

    // Find the error position and show context around it
    if (parseError instanceof SyntaxError && parseError.message.includes('position')) {
      const positionMatch = parseError.message.match(/position (\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        const start = Math.max(0, position - 100);
        const end = Math.min(jsonString.length, position + 100);
        console.error('Error context:', jsonString.substring(start, end));
      }
    }

    // Try to extract just the JSON portion if there's extra text
    try {
      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const extractedJson = jsonString.substring(jsonStart, jsonEnd);
        console.log('Attempting to parse extracted JSON...');
        const extractedResult = JSON.parse(extractedJson);
        return extractedResult as AnalyzedEpisode;
      }
    } catch (extractError) {
      console.error('Failed to parse extracted JSON:', extractError);
    }

    throw new Error(`The AI model returned an invalid JSON structure. Response length: ${jsonString.length} characters. This can happen with complex scripts. Try simplifying the script or checking the episode context data format.`);
  }
}

export const analyzeScript = async (
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

  try {
    onProgress?.('Connecting to Gemini API...');

    const compactedContextJson = compactEpisodeContext(episodeContextJson);
    onProgress?.('Compacting episode context...');

    // Per-scene analysis is handled by the orchestrator in multiProviderAnalysisService.
    // This function now always receives a single scene or small script - no chunking needed.
    onProgress?.(`Sending script to Gemini for analysis (model: ${getGeminiModel()}, temp: ${getGeminiTemperature()})...`);
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: `Analyze the following script using the provided visually-focused Episode Context as your guide.\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: getGeminiTemperature(),
        maxOutputTokens: getGeminiMaxTokens(),
        candidateCount: 1,
      },
    });

    onProgress?.('Processing Gemini response...');
    const jsonString = response.text.trim();
    const rawResult = await parseGeminiResponse(jsonString);

    return rawResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    onProgress?.('Error occurred during analysis');
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('JSON') || error.message.includes('parse')) {
        throw new Error("Failed to analyze script. The AI model returned an invalid JSON structure. This can happen with complex scripts. Try simplifying the script or checking the episode context data format.");
      }
      
      // API key errors
      if (error.message.includes('API_KEY') || error.message.includes('authentication') || error.message.includes('401')) {
        throw new Error("Failed to analyze script. API key is invalid or missing. Please check your GEMINI_API_KEY environment variable in .env");
      }
      
      // Leaked API key error (403)
      if (error.message.includes('leaked') || error.message.includes('reported as leaked') || (error.message.includes('403') && error.message.includes('PERMISSION_DENIED'))) {
        throw new Error("Failed to analyze script. Your Gemini API key has been reported as leaked and is no longer valid. Please generate a new API key from Google AI Studio and update your GEMINI_API_KEY in .env. You can also switch to a different LLM provider (Qwen, Claude, etc.) in the Provider Selector.");
      }
      
      // Network errors
      if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('timeout')) {
        throw new Error(`Failed to analyze script. Network error: ${error.message}. Please check your internet connection and try again.`);
      }
      
      // Rate limiting
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error("Failed to analyze script. Rate limit exceeded. Please wait a moment and try again.");
      }
      
      // Quota/usage errors
      if (error.message.includes('quota') || error.message.includes('usage')) {
        throw new Error("Failed to analyze script. API quota exceeded. Please check your Gemini API usage limits.");
      }
      
      // Model unavailable
      if (error.message.includes('not found') || error.message.includes('404')) {
        throw new Error("Failed to analyze script. The requested AI model is unavailable. Please check your model configuration.");
      }
      
      // Provide the actual error message if it's informative
      const errorMsg = error.message.length > 0 ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to analyze script: ${errorMsg}`);
    }
    
    throw new Error("Failed to analyze script. The AI model may be temporarily unavailable or the request was invalid.");
  }
};

/**
 * Simple generic content generation using Gemini
 */
export const geminiGenerateContent = async (
  prompt: string,
  systemInstruction?: string,
  temperature: number = getGeminiTemperature(),
  maxTokens: number = getGeminiMaxTokens()
): Promise<{ content: string }> => {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: prompt,
    config: {
      systemInstruction: systemInstruction || 'You are a helpful AI assistant.',
      temperature,
      maxOutputTokens: maxTokens,
    }
  });

  return {
    content: response.text || ''
  };
};