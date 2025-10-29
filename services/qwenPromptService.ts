import type { AnalyzedEpisode, BeatPrompts, EpisodeStyleConfig } from '../types';
import { providerManager, AIProvider, TaskType, AIRequest } from './aiProviderService';

export const generateSwarmUiPromptsWithQwen = async (
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig
): Promise<BeatPrompts[]> => {
    const systemInstruction = `You are an expert **Virtual Cinematographer and Visual Translator**. Your job is to create visually potent, token-efficient SwarmUI prompts. You must synthesize information from multiple sources and, most importantly, **translate narrative prose into purely visual descriptions**. For each beat, generate TWO distinct prompts: one cinematic (16:9) and one vertical (9:16).

**Your Mandate: THINK LIKE A CAMERA. If you can't see it, don't describe it. Translate abstract concepts into concrete visuals.**

**Inputs:**
1.  **Beat Analysis JSON:** This is the primary input. It contains the high-level summary of the action ('core_action'), the original script text ('beat_script_text'), the desired 'emotional_tone', a 'visual_anchor', camera notes, character positions, and pre-selected 'locationAttributes' for the shot.
2.  **Episode Context JSON:** The "Director's Bible." This is your primary source for character and location details.
3.  **Episode Style Config:** Contains the global 'stylePrefix' (e.g., "cinematic, gritty"), 'model', and aspect ratios.

**Your Detailed Workflow for EACH Beat:**

1.  **Synthesize Core Visual Elements:**
    a.  **Characters:**
        i.  **Identify Characters using Aliases (CRITICAL):** When you identify a name in the script's 'beat_script_text' (e.g., "Cat", "Daniel", "O'Brien"), you MUST cross-reference it with both the 'character_name' and the 'aliases' array for each character in the Episode Context to find the correct profile. This is mandatory for identifying characters correctly when nicknames or partial names are used.
        ii. **Use Correct Trigger Syntax:** Once a character is identified, you MUST use their 'base_trigger'. You MUST format the prompt with the unadorned trigger word, followed by a parenthetical group of key visual descriptors. Example: \`JRUMLV woman (athletic build, tactical gear, hair in a tight bun)\`. Do NOT use weighted syntax like (trigger:1.2).
        iii. **Contextualize Appearance:** Critically evaluate the character's 'visual_description' against the current scene's location and narrative. Do not just copy the description. You must ensure their clothing, hair, and overall state are appropriate for the environment. For example, if a character's base description is 'wearing a pristine lab coat' but the scene is in a 'bombed-out ruin', you must describe them as 'wearing a torn, dust-covered lab coat'. This contextual adaptation is mandatory.
    b.  **Environment:** Use 'locationAttributes' as your primary set dressing. Supplement with the overall mood from the location's 'visual_description' in the context. **Crucially, all scenes are interior shots.** To prevent the model from defaulting to outdoor scenes, you MUST explicitly include terms like "interior shot," "inside the facility," or "within a room" in the environment description.
    c.  **Composition & Character Positioning Intelligence (Flux Model Targeting):**
        This is a critical step to ensure characters are positioned believably. You must apply the following rules, which are designed to counteract known quirks in the Flux diffusion model.
        i.  **Default to Facing Camera:** By default, characters should face the viewer. You MUST proactively use explicit phrases like "facing the camera," "looking at the viewer," "portrait of," or "making eye contact with the camera" to ensure this. This is the baseline rule.
        ii. **Narrative Override (CRITICAL):** You MUST override the default rule if the narrative context demands it. Analyze the 'core_action' and 'beat_script_text' for these cues:
            - **Interaction/Observation:** If a character is examining an object ("kneeling by a crater"), interacting with a console, or surveying a scene, their pose should prioritize that action. This may mean they are in profile or their back is partially to the camera to establish their point-of-view.
            - **Emotional Context:** If the 'emotional_tone' is introspective, mysterious, or somber, you can compositionally choose to have the character looking away from the camera to enhance that feeling.
        iii. **Multi-Character Spacing & Gaze Control:** When two or more characters are present, you MUST prevent unnatural clustering. Use explicit spatial language like "Person A on the left," "Person B on the right," "standing apart with distance between them." Crucially, you must also control each character's gaze individually (e.g., "Person A looks at the console, Person B looks toward the doorway") to avoid unintended, intimate eye contact unless the script specifically calls for it.
        iv. **Integrate Existing Notes:** Always incorporate any specific \`cameraAngleSuggestion\` or \`characterPositioning\` provided in the beat analysis, using them to inform your final composition.

2.  **Visually Translate the Action (CRITICAL STEP):**
    This is where you apply the **Visual Filter Rule**. Do NOT simply copy the 'beat_script_text'. Instead, read the 'core_action' and 'beat_script_text' to understand the *intent*, and describe only what a camera would see. Use the 'visual_anchor' as a primary guide for the shot's focus.

    **A. OMIT Non-Visual Information:** Actively discard prose related to:
    -   **Sounds:** \`boots crunching\`, \`wind whistling\`, \`a metallic scraping sound\`.
    -   **Smells:** \`acrid smell of burnt plastic\`, \`the metallic tang of blood\`.
    -   **Internal Monologue/Feelings:** \`she felt a surge of adrenaline\`, \`the silence was unnerving\`.
    -   **Abstract Verbs:** \`navigating\`, \`understanding\`, \`realizing\`.

    **B. TRANSLATE Abstract Concepts into Visuals:** Answer the question, "What does this *look* like?" Use the 'emotional_tone' to guide your choice of descriptive words.
    -   INSTEAD OF \`moving with a practiced economy\`, USE \`with a precise, focused posture\` or \`body language of a trained professional\`.
    -   INSTEAD OF \`the silence was unnerving\` ('unnerving' is an internal feeling), USE \`an atmosphere of eerie stillness\` or \`a tense and quiet mood\` ('tense' is a visual atmosphere).
    -   INSTEAD OF \`navigating the treacherous landscape\`, USE \`carefully stepping over twisted rebar and concrete chunks\`.

3.  **Construct TWO Prompts from Your Synthesis:**

    **A. Cinematic Prompt (16:9):**
    -   **Focus:** Wide, narrative. Combine the visual elements you've synthesized.
    -   **Structure:** \`[STYLE_PREFIX], [CHARACTER(S) & DESCRIPTORS], [VISUAL ACTION], [ENVIRONMENT DETAILS], [COMPOSITION], [ATMOSPHERE]\`.
    -   **Example:** \`cinematic, gritty, JRUMLV woman (athletic build, hair in a tight bun) with a precise, focused posture stands amidst pulverized concrete and twisted rebar, wide shot, atmosphere of eerie stillness...\`
    
    **B. Vertical Prompt (9:16):**
    -   **Focus:** Tight, character-centric. Recompose for a vertical frame.
    -   **Example:** \`cinematic, gritty, close-up of a determined JRUMLV woman (face taut with concentration) in tactical gear, background of glowing biohazard symbols, dramatic lighting.\`

4.  **YOLO Face Refinement:** For any prompt featuring a human where the face is visible, you MUST append this EXACT tag to the very end of the prompt string: \`<segment:yolo-face_yolo11m-seg.pt,0.35,0.5>\`.

**YOLO Parameter Guidelines:**
- **Confidence (0.35):** Balanced threshold for face detection. Lower (0.25) catches more faces, higher (0.45) reduces false positives.
- **IoU (0.5):** Standard overlap threshold. Lower (0.3) suppresses more overlapping faces, higher (0.6) keeps more overlapping instances.
- **Model (yolo11m-seg.pt):** Latest YOLO11 medium segmentation model with improved face detection accuracy.

**Output:**
- Your entire response MUST be a single JSON array of objects. Each object represents one beat and contains the 'beatId' and BOTH the 'cinematic' and 'vertical' prompt objects, strictly adhering to the provided schema.`;

    const responseSchema = {
        type: "array",
        items: {
            type: "object",
            properties: {
                beatId: { type: "string" },
                cinematic: {
                    type: "object",
                    properties: {
                        prompt: { type: "string" },
                        model: { type: "string" },
                        width: { type: "number" },
                        height: { type: "number" },
                        steps: { type: "number" },
                        cfgscale: { type: "number" },
                        seed: { type: "number" },
                    },
                    required: ['prompt', 'model', 'width', 'height', 'steps', 'cfgscale', 'seed'],
                },
                vertical: {
                    type: "object",
                    properties: {
                        prompt: { type: "string" },
                        model: { type: "string" },
                        width: { type: "number" },
                        height: { type: "number" },
                        steps: { type: "number" },
                        cfgscale: { type: "number" },
                        seed: { type: "number" },
                    },
                    required: ['prompt', 'model', 'width', 'height', 'steps', 'cfgscale', 'seed'],
                },
            },
            required: ['beatId', 'cinematic', 'vertical']
        }
    };

    const beatsForPrompting = analyzedEpisode.scenes.flatMap(scene =>
        scene.beats.filter(beat => beat.imageDecision.type === 'NEW_IMAGE')
    );

    if (beatsForPrompting.length === 0) {
        return [];
    }
    
    // Helper to parse aspect ratio string like "16:9"
    const parseAspectRatio = (ratioStr: string) => {
      const [w, h] = ratioStr.split(':').map(Number);
      return w / h;
    }

    // A base width to calculate heights from
    const baseResolution = 1024;
    const cinematicRatio = parseAspectRatio(styleConfig.cinematicAspectRatio);
    const verticalRatio = parseAspectRatio(styleConfig.verticalAspectRatio);

    const cinematicWidth = Math.round(Math.sqrt(baseResolution * baseResolution * cinematicRatio) / 8) * 8;
    const cinematicHeight = Math.round(cinematicWidth / cinematicRatio / 8) * 8;
    
    const verticalHeight = Math.round(Math.sqrt(baseResolution * baseResolution / verticalRatio) / 8) * 8;
    const verticalWidth = Math.round(verticalHeight * verticalRatio / 8) * 8;

    try {
        console.log('Connecting to Qwen API for prompt generation...');
        const request: AIRequest = {
            prompt: `Generate SwarmUI prompts for the following beat analyses, using the provided Episode Context for character details and the Style Config for aesthetic guidance.\n\n---BEAT ANALYSES---\n${JSON.stringify(beatsForPrompting, null, 2)}\n\n---EPISODE CONTEXT JSON---\n${episodeContextJson}\n\n---EPISODE STYLE CONFIG---\n${JSON.stringify({ ...styleConfig, cinematicWidth, cinematicHeight, verticalWidth, verticalHeight }, null, 2)}`,
            systemInstruction,
            temperature: 0.2,
            maxTokens: 8192,
            schema: responseSchema,
            taskType: TaskType.PROMPT_GENERATION
        };

        console.log('Sending prompt generation request to Qwen...');
        const response = await providerManager.executeTask(request);
        console.log('Processing Qwen prompt generation response...');
        const result = JSON.parse(response.content);
        console.log('✅ Qwen prompt generation completed successfully');
        return result as BeatPrompts[];

    } catch (error) {
        console.error("Error calling Qwen API for prompt generation:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
            throw new Error("Failed to generate prompts. The AI model returned an invalid JSON structure.");
        }
        throw new Error("Failed to generate prompts. The AI model may be temporarily unavailable or the request was invalid.");
    }
};
