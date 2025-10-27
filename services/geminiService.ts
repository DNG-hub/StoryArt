


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
            description: "A list of distinct visual moments or 'beats' within the scene.",
            items: {
              type: Type.OBJECT,
              properties: {
                beatId: { type: Type.STRING, description: "A unique identifier for this beat, in the format 'sX-bY' where X is scene number and Y is beat number (e.g., 's1-b2')." },
                beatText: { type: Type.STRING, description: "The verbatim text content of the beat." },
                beatType: { type: Type.STRING, description: "The primary classification of the beat." },
                visualSignificance: { type: Type.STRING, description: "How important this beat is to visualize." },
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
              required: ['beatId', 'beatText', 'beatType', 'visualSignificance', 'imageDecision']
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
  const systemInstruction = `You are an expert AI script analyst and a frugal, efficient **Continuity Supervisor** for film production. Your primary goal is to maximize visual storytelling impact while **aggressively minimizing redundant image creation**. You achieve this by analyzing an entire script holistically, maintaining a "short-term memory" of your visual decisions to identify and explicitly link opportunities for image reuse.

**Your Mandate: BE EFFICIENT. Do not waste budget on unnecessary new shots.**

**Inputs:**
1.  **Script Text:** A full screenplay.
2.  **Visually-Focused Episode Context JSON:** A "Director's Bible" containing visual data.

**Your Detailed Workflow:**
1.  **Holistic Analysis:** Read and understand the entire script first. Your decisions for a beat in Scene 3 must be informed by the decisions you made for Scene 1.

2.  **Parse & Segment (CRITICAL TASK - FOLLOW THESE RULES EXACTLY):**
    *   **Primary Goal: Maximum Granularity.** It is better to create too many small, specific beats than too few large, summarized ones. Each beat represents a potential camera shot, and every distinct action deserves its own beat.
    *   **Definition of a "Beat":** A beat is a single, distinct visual action, event, or moment described in the script's action lines (the non-dialogue text).
    *   **Beat Segmentation Rules (Apply Strictly):**
        *   A new paragraph in the script's action lines almost always signifies a new beat.
        *   A single sentence containing a specific character action is a beat.
        *   A sentence describing a critical piece of the environment can be a beat.
        *   **Example Rule:** If the script says: 'Cat enters the room. She scans the wreckage.' This MUST be treated as TWO separate beats. The first beat's text is 'Cat enters the room.' and the second is 'She scans the wreckage.'
    *   **Verbatim Extraction for \`beatText\` (Non-Negotiable):**
        *   For the \`beatText\` field, you MUST extract the text verbatim from the source script. Do NOT summarize, paraphrase, or alter the original text in any way. The \`beatText\` must be a direct copy-paste of the script segment that corresponds to that single action.

3.  **Analyze Each Beat (CORE TASK):** For every beat you have segmented:
    a. **Assign a Unique ID:** Generate a unique 'beatId' in the format 'sX-bY' (e.g., 's1-b1'). This is critical for linking.
    b. **Perform Standard Analysis:** Classify 'beatType', 'visualSignificance', etc.
    c. **Decorate the Set (Mandatory):** For every single beat, you MUST visually ground it in its correct environment. First, identify the correct location for the current scene by cross-referencing the scene number with the provided Episode Context. Then, from that specific location's list of 'artifacts', you MUST select the 1-3 most relevant 'prompt_fragment' strings that best match the beat's specific action. Populate the 'locationAttributes' array with these selected strings. This step is not optional and ensures that scenes in different locations have distinct visual details.
    d. **Make the Image Decision (Crucial Continuity Task):**
        i.  **Look Back:** Before making a decision, review all *previous* beats in the script.
        ii. **Decide the Type (Apply these rules strictly):**
            - **'NEW_IMAGE':** ONLY choose this for a truly distinct and essential visual moment. You must justify why an existing image cannot be used. Valid reasons include: a character's first appearance, a significant change in location, a critical physical action, or a dramatic change in camera angle that is vital for storytelling.
            - **'REUSE_IMAGE':** This should be your default choice if the visual context is similar to a previous beat. **Be aggressive in reusing.** If characters are in the same location having a conversation without significant movement, you MUST reuse the previous image. If a beat describes an emotional reaction without a change in setting, REUSE the previous shot.
            - **'NO_IMAGE':** Choose this for beats with no significant visual information (e.g., internal thoughts, redundant dialogue, minor non-visual actions).
        iii. **Provide Justification:** Write a concise 'reason' for your decision. For 'NEW_IMAGE', you must explain why it's necessary.
        iv. **Create the Link (CRITICAL):** If, and only if, your 'type' is 'REUSE_IMAGE', you MUST populate the 'reuseSourceBeatId' field with the exact 'beatId' from the earlier beat you are reusing. This is not optional. **A 'REUSE_IMAGE' decision without a valid 'reuseSourceBeatId' is an error.** For 'NEW_IMAGE' or 'NO_IMAGE', this field should be omitted or left null.

**Output:**
- Your entire response MUST be a single JSON object that strictly adheres to the provided schema. The integrity of the 'beatId' and the 'reuseSourceBeatId' link is paramount.`;

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