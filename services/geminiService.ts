import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedEpisode } from '../types';

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
                beatText: { type: Type.STRING, description: "The verbatim text content of the beat." },
                beatType: { type: Type.STRING, description: "The primary classification of the beat." },
                visualSignificance: { type: Type.STRING, description: "How important this beat is to visualize." },
                imageRequirement: { type: Type.STRING, description: "Recommendation for image generation." },
                justification: { type: Type.STRING, description: "Reasoning for the image requirement recommendation." },
                cameraAngleSuggestion: { type: Type.STRING, description: "Optional suggestion for camera framing or perspective." },
                characterPositioning: { type: Type.STRING, description: "Optional description of character positions and interactions." },
                locationAttributes: { 
                    type: Type.ARRAY, 
                    description: "An array of `prompt_fragment` strings extracted from the most relevant `artifacts` in the Episode Context JSON that apply to this specific beat.",
                    items: { type: Type.STRING }
                },
              },
              required: ['beatText', 'beatType', 'visualSignificance', 'imageRequirement', 'justification']
            }
          }
        },
        required: ['sceneNumber', 'title', 'metadata', 'beats']
      }
    }
  },
  required: ['episodeNumber', 'title', 'scenes']
};


export const analyzeScript = async (scriptText: string, episodeContextJson: string): Promise<AnalyzedEpisode> => {
  const systemInstruction = `You are an expert AI script analyst and virtual set decorator for film and animation. Your task is to perform a detailed analysis of a script by cross-referencing it with a comprehensive Episode Context JSON file, which acts as the "Director's Bible."

**Inputs:**
1.  **Script Text:** A screenplay with scene markers ('===SCENE X: Title===') and metadata.
2.  **Episode Context JSON:** A structured JSON object that provides high-level context, summaries, and, most importantly, a scene-by-scene breakdown of locations and their specific 'artifacts'. Each artifact has a 'prompt_fragment' which is essential for visual descriptions.

**Your Detailed Workflow:**
1.  **Parse the Script:** Identify the episode number, title, and all scenes with their metadata directly from the Script Text.
2.  **Segment into Beats:** For each scene in the script, segment the text into distinct visual moments or "beats." A beat is a continuous block of action or a significant character moment.
3.  **Analyze Each Beat (CORE TASK):** For every beat you identify within a scene from the script:
    a. **Identify Scene Context:** Determine which scene number the beat belongs to.
    b. **Reference the "Director's Bible":** Find the corresponding scene object in the Episode Context JSON (e.g., for a beat in Scene 2 of the script, you will use the scene object where 'scene_number' is 2 in the JSON).
    c. **Perform Standard Analysis:**
        - **beatText:** Extract the verbatim text of the beat from the script.
        - **beatType:** Classify the beat: 'Character Introduction', 'Action', 'Emotional', 'Dialogue', 'Environmental', 'Revelation', 'Other'.
        - **visualSignificance:** Rate its visual importance: 'High', 'Medium', or 'Low'.
        - **imageRequirement:** Decide the image need: 'New Image Recommended', 'Reuse Possible', or 'No Image Needed'.
        - **justification:** Provide a concise reason for your decision.
    d. **Populate Location Attributes (Crucial "Set Decorator" Task):**
        i.  Read the beat's text and understand its specific sub-location and action (e.g., 'reception area', 'server vault', 'character opens a door').
        ii. Look at the 'artifacts' array within the relevant scene from the Episode Context JSON. This is your ONLY source for artifacts.
        iii. **Intelligently select** 2-4 of the most relevant artifacts from this list that fit the beat's specific context. Use your reasoning. For example, if the beat text describes a server room, select artifacts like "server_racks". Do NOT select artifacts that don't fit the context (e.g., do not place "The Original SledBed" in a server vault unless the script explicitly mentions it there; it belongs in a lab).
        iv. For each artifact you select, you MUST extract its 'prompt_fragment' string.
        v. Populate the 'locationAttributes' field with an array containing ONLY these extracted 'prompt_fragment' strings.
    e. **Suggest Framing (Optional):**
        - **cameraAngleSuggestion:** If relevant, suggest a camera angle.
        - **characterPositioning:** If relevant, describe character placement.

**Output:**
- Your entire response MUST be a single JSON object that strictly adheres to the provided schema. Do not output markdown or any other text.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following script using the provided Episode Context as your guide.\n\n---SCRIPT---\n${scriptText}\n\n---EPISODE CONTEXT JSON---\n${episodeContextJson}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result as AnalyzedEpisode;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error("Failed to analyze script. The AI model returned an invalid JSON structure. This can happen with complex scripts. Try simplifying the script or checking the episode context data format.");
    }
    throw new Error("Failed to analyze script. The AI model may be temporarily unavailable or the request was invalid.");
  }
};
