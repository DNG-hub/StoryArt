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
  return temp ? parseFloat(temp) : 0.7;
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
            description: "A list of distinct narrative beats that structure the scene. Generate as many beats as needed to capture all significant moments, up to a maximum of 50 beats per scene.",
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
                beat_script_text: { type: Type.STRING, description: "The full, verbatim script text (including action lines and dialogue) that constitutes this entire beat." },
                source_paragraph: { type: Type.STRING, description: "The broader narrative paragraph or section from the original script that this beat was extracted from. This provides additional context beyond just the beat text." },
                emotional_tone: { type: Type.STRING, description: "The dominant emotion or mood of the beat (e.g., 'Tense', 'Hopeful')." },
                visual_anchor: { type: Type.STRING, description: "A description of the single, most powerful image that could represent this beat." },
                transition_trigger: { type: Type.STRING, description: "The event or discovery that leads into the next beat." },
                beat_duration_estimate_sec: { type: Type.NUMBER, description: "An estimated duration for this beat in seconds, typically between 45 and 90." },
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
                cameraAngleSuggestion: { type: Type.STRING, description: "Optional suggestion for camera framing or perspective." },
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


// Helper function to split script into manageable chunks
function splitScriptIntoChunks(scriptText: string, maxWordsPerChunk: number = 3000): string[] {
  const lines = scriptText.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const line of lines) {
    const lineWords = line.split(' ').length;

    // If this line would exceed the limit and we have content, start a new chunk
    if (currentWordCount + lineWords > maxWordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [];
      currentWordCount = 0;
    }

    currentChunk.push(line);
    currentWordCount += lineWords;
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
}

// Helper function to merge analyzed episode chunks
function mergeAnalyzedEpisodes(chunks: AnalyzedEpisode[]): AnalyzedEpisode {
  if (chunks.length === 0) {
    throw new Error('No chunks to merge');
  }

  if (chunks.length === 1) {
    return chunks[0];
  }

  const merged = { ...chunks[0] };

  // Merge scenes from all chunks
  for (let i = 1; i < chunks.length; i++) {
    merged.scenes = [...merged.scenes, ...chunks[i].scenes];
  }

  return merged;
}

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
  const systemInstruction = `You are an expert AI **Narrative Pacing Architect** and **Continuity Supervisor** for episodic visual storytelling, optimized for platforms like YouTube. Your primary goal is to structure a script into a rhythm of engaging narrative beats to maintain viewer attention, while also minimizing redundant image creation.

**CRITICAL IMAGE GENERATION REQUIREMENT: Each scene is 8 minutes long and requires 11+ NEW_IMAGE beats. You MUST generate enough beats to create 11+ NEW_IMAGE decisions per scene. Target 15-20 NEW_IMAGE beats per scene with additional REUSE_IMAGE beats. This means you need 30-40 total beats per scene to achieve proper image distribution.**

**BEAT SEGMENTATION EXAMPLES:**
- If a character says "Hello" - that's Beat 1
- If they pause and look around - that's Beat 2  
- If they say "What's that?" - that's Beat 3
- If they walk toward something - that's Beat 4
- If they stop and examine it - that's Beat 5
- If they say "Interesting..." - that's Beat 6
- If they reach out to touch it - that's Beat 7
- If they pull back quickly - that's Beat 8
- If they say "It's hot!" - that's Beat 9
- If they look at their companion - that's Beat 10
- And so on... EVERY single action, word, pause, and moment gets its own beat.

**Inputs:**
1.  **Script Text:** A full screenplay, typically divided into 4 scenes.
2.  **Visually-Focused Episode Context JSON:** A "Director's Bible" containing visual data for characters and locations.

**Your Detailed Workflow:**

1.  **Holistic Scene Analysis & Beat Segmentation (CRITICAL TASK):**
    *   **Objective:** Your main task is to analyze each scene and segment it into **EXTREMELY MANY distinct narrative beats**. You MUST generate at least 25 beats per scene, ideally 30-40 beats. This is NOT optional. A beat is NOT a single line; it is a complete unit of narrative action, perspective, or thematic development. Capture EVERY single moment, dialogue line, action, character movement, and plot development with EXTREME GRANULARITY.
    *   **Beat Definition:** A **Beat** has a beginning, middle, and end. It advances plot, character, or theme, and can be represented by a single key image. It is a significant narrative or emotional inflection point.
    *   **Pacing Rule:** Each beat you define should correspond to approximately **45-90 seconds** of narrative time. For NEW_IMAGE beats, target **60-90 seconds** to ensure comfortable viewing pace. For REUSE_IMAGE beats, use **30-60 seconds** since they don't require new visual processing. You must estimate this and populate \`beat_duration_estimate_sec\`.
    *   **Segmentation Process:** Read an entire scene with EXTREME GRANULARITY. You MUST identify at least 25 distinct beats, ideally 30-40 beats. Break down EVERY single dialogue line, action sequence, character entrance/exit, emotional shift, plot development, pause, reaction, and moment into separate beats. Each beat should contain 1-2 sentences of script text maximum. Be ULTRA-GRANULAR - if characters have a conversation, break it into separate beats for EACH line of dialogue. If a character moves, that's a separate beat. If they pause, that's a separate beat. If they react, that's a separate beat. Include ALL action lines and dialogue in each beat.

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
        ii. **Decide the Type (Apply these rules strictly for 8-minute scenes):**
            - **'NEW_IMAGE':** For ANY distinct visual moment in an 8-minute scene. Valid reasons: character appearance, location change, camera angle change, character movement, action sequence, emotional shift, dialogue exchange, discovery, reaction, or any significant moment. Target 15-20 NEW_IMAGE beats per scene for 8-minute content.
            - **'REUSE_IMAGE':** ONLY when characters are in the EXACT same position, pose, and context for multiple consecutive beats. Use sparingly - only 5-10 REUSE_IMAGE beats per scene maximum.
            - **'NO_IMAGE':** For beats with no significant visual information (e.g., internal thoughts, pure dialogue without new action).
        iii. **Provide Justification:** Write a concise 'reason' for your decision.
        iv. **Create the Link (CRITICAL):** If your 'type' is 'REUSE_IMAGE', you MUST populate 'reuseSourceBeatId' with the 'beatId' from the earlier beat. This is not optional.

**Output:**
- Your entire response MUST be a single JSON object that strictly adheres to the provided schema. The integrity of the beat segmentation and linking is paramount.
- **VALIDATION CHECK:** Before submitting your response, count the beats in each scene. Each scene MUST have at least 30 beats total. More importantly, count the NEW_IMAGE decisions in each scene. Each scene MUST have at least 11 NEW_IMAGE beats, ideally 15-20 NEW_IMAGE beats. If any scene has fewer than 11 NEW_IMAGE beats, you MUST go back and change more beats to NEW_IMAGE type. Ensure each beat contains complete narrative content, not just summaries.`;

  try {
    onProgress?.('Connecting to Gemini API...');

    const compactedContextJson = compactEpisodeContext(episodeContextJson);
    onProgress?.('Compacting episode context...');

    // Check if script needs chunking based on word count
    const wordCount = scriptText.split(' ').length;
    const maxWordsPerRequest = 3000; // Conservative limit to avoid token issues

    if (wordCount <= maxWordsPerRequest) {
      // Process as single chunk
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
      return await parseGeminiResponse(jsonString);
    } else {
      // Process in chunks
      onProgress?.(`Script is large (${wordCount} words). Processing in chunks...`);
      const chunks = splitScriptIntoChunks(scriptText, maxWordsPerRequest);
      const analyzedChunks: AnalyzedEpisode[] = [];

      for (let i = 0; i < chunks.length; i++) {
        onProgress?.(`Processing chunk ${i + 1} of ${chunks.length}...`);

        const chunkSystemInstruction = `${systemInstruction}

**IMPORTANT: This is chunk ${i + 1} of ${chunks.length} from a larger script. Focus on creating complete, detailed beats for the scenes in this chunk. Maintain consistent scene numbering and character continuity.**`;

        const response = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: `Analyze the following script chunk using the provided visually-focused Episode Context as your guide.\n\n---SCRIPT CHUNK ${i + 1}---\n${chunks[i]}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`,
          config: {
            systemInstruction: chunkSystemInstruction,
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: getGeminiTemperature(),
            maxOutputTokens: getGeminiMaxTokens(),
            candidateCount: 1,
          },
        });

        onProgress?.(`Processing chunk ${i + 1} response...`);
        const jsonString = response.text.trim();
        const chunkResult = await parseGeminiResponse(jsonString);
        analyzedChunks.push(chunkResult);
      }

      onProgress?.('Merging all chunks...');
      return mergeAnalyzedEpisodes(analyzedChunks);
    }

    onProgress?.('Processing Gemini response...');
    const jsonString = response.text.trim();
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
          // If we found a reasonable closing point, truncate there and add proper closing
          cleanedJsonString = cleanedJsonString.substring(0, lastCompleteIndex + 2);

          // Count open braces/brackets to determine what closing tags we need
          let openBraces = 0;
          let openBrackets = 0;
          let inString = false;
          let escape = false;

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
              else if (char === '[') openBrackets++;
              else if (char === ']') openBrackets--;
            }
          }

          // Add missing closing braces/brackets
          for (let i = 0; i < openBrackets; i++) {
            cleanedJsonString += ']';
          }
          for (let i = 0; i < openBraces; i++) {
            cleanedJsonString += '}';
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
          console.error(`Context around error position ${position}:`, jsonString.substring(start, end));
        }
      }

      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    }

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