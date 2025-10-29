import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedEpisode } from '../types';
import { compactEpisodeContext } from '../utils';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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


export const analyzeScript = async (
  scriptText: string, 
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<AnalyzedEpisode> => {
  const systemInstruction = `You are an expert AI **Narrative Pacing Architect** and **Continuity Supervisor** for episodic visual storytelling, optimized for platforms like YouTube. Your primary goal is to structure a script into a rhythm of engaging narrative beats to maintain viewer attention, while also minimizing redundant image creation.

**CRITICAL BEAT GENERATION REQUIREMENT: You MUST generate a MINIMUM of 25 beats per scene. Most scenes should have 30-40 beats. This is MANDATORY - do not generate fewer than 25 beats per scene. Your goal is to capture EVERY single moment, action, dialogue line, character movement, and plot development with EXTREME GRANULARITY.**

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
- **VALIDATION CHECK:** Before submitting your response, count the beats in each scene. Each scene MUST have at least 25 beats. If any scene has fewer than 25 beats, you MUST go back and break it down further into more granular beats. Count every single dialogue line, action, pause, and moment as a separate beat. Ensure each beat contains complete narrative content, not just summaries.`;

  try {
    onProgress?.('Connecting to Gemini API...');
    
    const compactedContextJson = compactEpisodeContext(episodeContextJson);
    onProgress?.('Compacting episode context...');

    onProgress?.('Sending script to Gemini for analysis...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following script using the provided visually-focused Episode Context as your guide.\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${compactedContextJson}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    onProgress?.('Processing Gemini response...');
    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    
    onProgress?.('Analysis complete!');
    return result as AnalyzedEpisode;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    onProgress?.('Error occurred during analysis');
    if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error("Failed to analyze script. The AI model returned an invalid JSON structure. This can happen with complex scripts. Try simplifying the script or checking the episode context data format.");
    }
    throw new Error("Failed to analyze script. The AI model may be temporarily unavailable or the request was invalid.");
  }
};