
import { GoogleGenAI, Type } from "@google/genai";
import type { SwarmUIPromptOutput, CharacterTrigger, Lora } from '../types';

if (!process.env.API_KEY) {
    // In a real application, this would be a more robust check.
    // Here, we're assuming the environment is set up correctly.
    console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

interface GeneratePromptParams {
  narrative: string;
  locationData: string;
  characterData: string;
  characterTriggers: CharacterTrigger[];
  availableLoras: Lora[];
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    swarmUIPrompt: { 
      type: Type.STRING,
      description: 'The final, complete prompt for SwarmUI, including character triggers, LoRAs, style markers, and segmentation tags.'
    },
    loraTriggersUsed: {
      type: Type.ARRAY,
      description: 'A list of LoRA triggers that were incorporated into the prompt.',
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: 'Either "Character" or "Style".' },
          value: { type: Type.STRING, description: 'The LoRA trigger string, e.g., "<lora:filename:weight>".' },
        },
        required: ['type', 'value']
      },
    },
    swarmUIParameters: {
      type: Type.OBJECT,
      description: 'The standard SwarmUI parameters.',
      properties: {
        model: { type: Type.STRING },
        aspectratio: { type: Type.STRING },
        steps: { type: Type.NUMBER },
        cfgscale: { type: Type.NUMBER },
        sampler: { type: Type.STRING },
        scheduler: { type: Type.STRING },
        seed: { type: Type.NUMBER },
      },
      required: ['model', 'aspectratio', 'steps', 'cfgscale', 'sampler', 'scheduler', 'seed']
    },
    refinementSuggestions: {
      type: Type.ARRAY,
      description: '3-5 specific, actionable suggestions for iteratively improving the prompt.',
      items: { type: Type.STRING }
    }
  },
  required: ['swarmUIPrompt', 'loraTriggersUsed', 'swarmUIParameters', 'refinementSuggestions']
};

export const generateSwarmUIPrompt = async (params: GeneratePromptParams): Promise<SwarmUIPromptOutput> => {
  const { narrative, locationData, characterData, characterTriggers, availableLoras } = params;

  const systemInstruction = `You are a creative AI prompt engineer for story-to-image workflows in SwarmUI. Your task is to transform a story narrative, location data, and character appearances into a highly detailed, optimized prompt for an image generation model called Flux.1-dev.

**Rules:**
- Analyze the narrative for key scenes, emotions, actions, lighting, and composition.
- Incorporate location details: Weather, architecture, time of day, atmosphere.
- Precisely describe character appearances: pose, expression, clothing, interactions.
- Use the specific character triggers provided. Substitute character names/descriptions with their corresponding trigger phrases.
- Apply LoRAs in the format <lora:filename:weight>. Select relevant LoRAs from the provided list. Use a weight of 1.0 for subtle effects and up to 1.5 for strong effects.
- Always append the face refinement tag at the very end of the prompt: <segment:yolo-face_yolov9c.pt,0.7,0.5>
- Structure the prompt: Start with subject/action → Add detailed descriptors → Include style markers (e.g., cinematic, ultra-detailed, hdr) → Append segmentation tags.
- Keep the prompt vivid and concise (under 200 words).
- Use natural language weighting for emphasis where appropriate, e.g., (emphasized:1.2).
- Your output MUST be a JSON object that strictly adheres to the provided schema. Do not output markdown or any other format.
`;

  const userPrompt = `
**INPUT DATA:**

**Narrative:**
${narrative}

**Location JSON:**
${locationData}

**Character JSON:**
${characterData}

**Character Triggers:**
${JSON.stringify(characterTriggers.map(t => ({name: t.name, trigger: t.trigger})))}

**Available LoRAs:**
${JSON.stringify(availableLoras.map(l => l.name))}

**Your Task:**
Generate the JSON object based on all the provided context and rules.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const jsonString = response.text.trim();
    // Although Gemini should return valid JSON, parsing adds a layer of validation.
    const result = JSON.parse(jsonString);
    return result as SwarmUIPromptOutput;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate prompt. The AI model may be temporarily unavailable or the request was invalid.");
  }
};
