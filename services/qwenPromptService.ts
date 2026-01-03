import type { AnalyzedEpisode, BeatPrompts, EpisodeStyleConfig, SwarmUIPrompt } from '../types';
import { providerManager, AIProvider, TaskType, AIRequest } from './aiProviderService';

export const generateSwarmUiPromptsWithQwen = async (
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig
): Promise<BeatPrompts[]> => {
    const systemInstruction = `You are an expert **Virtual Cinematographer and Visual Translator**. Your job is to create visually potent, token-efficient SwarmUI prompts following the LATEST PRODUCTION-STANDARD prompt construction techniques from Episode 1. These techniques have been tested across 135 prompts with superior visual results. For each beat, generate a cinematic (16:9) prompt. This is used for long-form storytelling.

**Your Mandate: THINK LIKE A CINEMATOGRAPHER. Compose the shot by weaving together stylistic elements with the narrative.**

**CRITICAL NEW PRODUCTION STANDARDS (Based on 135 tested prompts, Version 2.0):**
1.  **Facial Expressions INSTEAD of Heavy Camera Direction:**
    - OLD: \`(((facing camera:2.0)))\`
    - NEW: \`"alert, tactical expression on her face"\`
2.  **Atmosphere-Specific Face Lighting** (Always Include):
    - Tactical scenes: \`"dramatic tactical lighting on face, high contrast face shadows"\`
    - Medical scenes: \`"harsh medical lighting on face, stark white face illumination"\`
3.  **YOLO Face Segments** (Precise Control):
    - Single character: \`<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>\`
    - Two characters: Add segment for each face
4.  **Character Physique Emphasis** (Critical for Proper Rendering):
    - ALWAYS include: \`"lean athletic build, toned arms"\`
    - Prevents bulky appearance from tactical gear
5.  **FLUX-Specific Settings**:
    - cfgscale: 1 (NOT 7!)
    - fluxguidancescale: 3.5
    - seed: -1 (random for batch generation)

**Inputs:**
1.  **Beat Analysis JSON:** This is the primary input. It contains the high-level summary of the action ('core_action'), the original script text ('beat_script_text'), the desired 'emotional_tone', a 'visual_anchor', camera notes, character positions, and pre-selected 'locationAttributes' for the shot.
2.  **Episode Context JSON:** The "Director's Bible." This is your primary source for character and location details.
3.  **Episode Style Config:** Contains the global 'stylePrefix' (e.g., "cinematic, gritty"), 'model', and aspect ratios.

**Your Detailed Workflow for EACH Beat:**

1.  **Synthesize Core Visual Elements:**
    a.  **Characters:**
        i.  **Identify Characters using Aliases (CRITICAL):** When you identify a name in the script's 'beat_script_text' (e.g., "Cat", "Daniel", "O'Brien"), you MUST cross-reference it with both the 'character_name' and the 'aliases' array for each character in the Episode Context to find the correct profile. This is mandatory for identifying characters correctly when nicknames or partial names are used.
        ii. **Use Correct Trigger Syntax:** Once a character is identified, you MUST use their 'base_trigger'. NEW STANDARD: Include specific "form-fitting" and "lean athletic build" and "toned arms" to prevent bulky appearance from gear. Example: \`JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun)\`. Do NOT use weighted syntax.
        iii. **Contextualize Appearance:** Critically evaluate the character's 'visual_description' against the current scene's location and narrative. Do not just copy the description. You must ensure their clothing, hair, and overall state are appropriate for the environment. For example, if a character's base description is 'wearing a pristine lab coat' but the scene is in a 'bombed-out ruin', you must describe them as 'wearing a torn, dust-covered lab coat'. This contextual adaptation is mandatory.
    b.  **Environment:** Use 'locationAttributes' as your primary set dressing. Supplement with the overall mood from the location's 'visual_description' in the context. **Crucially, all scenes are interior shots.** To prevent the model from defaulting to outdoor scenes, you MUST explicitly include terms like "interior shot," "inside the facility," or "within a room" in the environment description.
    c.  **Composition & Character Positioning Intelligence (Flux Model Targeting):**
        This is a critical step to counteract known Flux/Flux1 model deficiencies using the LATEST PRODUCTION STANDARDS:
        i.  **MANDATORY: Shot Type at Prompt Start (NEW PRODUCTION STANDARD):**
            - **ALWAYS** start with shot type: "medium shot of a", "wide shot of a", "close-up of a"
            - **DO NOT** start with positioning directives as previously recommended (this is old method)
            - **Example:** \`"medium shot of a JRUMLV woman (...), alert expression on her face, moving through..."\`
        ii. **Facial Expression Integration (NEW PRODUCTION STANDARD):**
            - Always include facial expression AFTER character description
            - Use natural language: \`"alert, tactical expression on her face"\`, \`"focused combat readiness on his face"\`, \`"concentrated medical expression on her face"\`
            - This replaces heavy weighted camera direction syntax (e.g., \`(((facing camera:2.0)))\`)
        iii. **BEAT-NARRATIVE DRIVEN Face Lighting (PRINCIPLE-BASED LIGHTING EXTRACTION):**
            - **CRITICAL:** The beat narrative is the **SOURCE OF TRUTH** for all lighting.
            - **PRINCIPLE:** READ beat narrative for ANY lighting-related details, EXTRACT those details and adapt to face lighting. ONLY FALLBACK to location atmosphere if beat has NO lighting details.
            - **Lighting Extraction Categories:** Look for Light Sources (generators, flashes, explosions), Qualities (bright, subdued, harsh), Colors (green, red, orange), Environmental Effects (gunsmoke, dust, fog), Time Indicators (dawn, dusk, night), Intensity Modifiers (barely visible, blinding).
            - **Then adapt to face lighting** using the SAME descriptive words from beat: \`PRINCIPLE: If beat says it, face lighting echoes it.\`
            - **Example Extraction:** Beat: "heavy gunsmoke, bright muzzle flashes illuminating the haze" → Face Lighting: "bright intermittent muzzle flashes on face, subdued by thick gunsmoke"
            - **Example Extraction:** Beat: "bathed in eerie green light from backup generators" → Face Lighting: "eerie green light on face, sickly green illumination"
            - **Example Fallback:** Beat: "moving through damaged tactical facility" (no lighting details) → Use: "dramatic tactical lighting on face"
        iv. **Dynamic Weapon Positioning (NEW PRODUCTION STANDARD):**
            - **For Daniel (HSCEIA man):** Weapon positioning is beat-specific action, NOT a character trait. Include M4 carbine position in the action portion of the prompt based on context.
            - **Examples:** \`"advancing with M4 carbine at ready position"\`, \`"aiming M4 carbine"\`, \`"with M4 carbine slung across chest"\`, \`"with M4 carbine at low ready"\`
            - **Do NOT:** Include weapon position in character description (e.g., "M4 carbine slung across chest" as static trait).
        v. **Narrative Override:** Override normal facing only when narrative context demands it. BUT still describe facing explicitly: "in profile view," "looking at the console," "looking away from camera," "gaze turned toward window," etc.
        vi. **Multi-Character Spacing & Gaze Control:** When two or more characters are present, you MUST prevent unnatural clustering. Use explicit spatial language like "Person A on the left," "Person B on the right," "standing apart with distance between them." Crucially, you must also control each character's gaze independently with YOLO segments to ensure they engage the viewer rather than each other.

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
    -   INSTEAD OF \`navigating the trecherous landscape\`, USE \`carefully stepping over twisted rebar and concrete chunks\`.

3.  **Compose the Prompts (CRITICAL STEP - NEW PRODUCTION STANDARD):**
    **Do NOT just list keywords.** Weave the elements from your synthesis into a cohesive, descriptive paragraph that paints a picture.

    **A. Cinematic Prompt (16:9):**
    -   **Focus:** Wide, narrative. Emphasizes horizontal composition and environmental storytelling.
    -   **Structure:** \`[shot_type] of [character_description], [facial_expression], [action_verb] [environment_description with beat narrative lighting]. [face_lighting_extracted_from_beat_narrative]. [composition_directives]. <yolo_segments>\`
    -   **Character Details:** Include specific clothing (MultiCam woodland camo, form-fitting tactical vest, fitted olive long-sleeved shirt), physique (lean athletic build, toned arms), and gear details (dual holsters, tactical watch).
    -   **Facial Expression:** \`"alert, tactical expression on her face"\`, \`"focused combat readiness on his face"\`
    -   **Dynamic Weapon Positioning (Daniel):** Include weapon position in action based on beat narrative: \`"advancing with M4 carbine at ready position"\`, \`"with M4 carbine slung on tactical sling"\`
    -   **Face Lighting Extraction:** READ beat narrative first, extract lighting keywords, adapt to face lighting using same descriptive words. FALLBACK to atmosphere lighting only if beat has no lighting details.
    -   **Example:** \`wide shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), alert, tactical expression on her face, moving through CDC archive bathed in eerie green light from backup generators. eerie green light on face, sickly green illumination, Dramatic rim light, desaturated color grade, shallow depth of field. <segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>\`

4.  **YOLO Face Refinement (Multi-Character):** You MUST apply a unique YOLO segmentation tag for **each character** whose face is visible in the shot.
    a.  **Identify Characters:** Count the number of distinct characters you are describing in the prompt.
    b.  **Append Indexed Tags:** For each character, append an indexed tag to the end of the prompt. The first character gets index 1, the second gets index 2, and so on.
    c.  **Use Exact Syntax:** The tag format MUST be \`<segment:yolo-face_yolov9c.pt-INDEX, 0.35, 0.5>\`.
    d.  **For Two Characters:** Include engaging commands: \`<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> engaging viewer, looking at camera\`
    e.  **Example (2 characters):** A prompt describing a woman and a man would end with: \`...<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> HSCEIA man, engaging viewer, looking at camera <segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> JRUMLV woman, engaging viewer, looking at camera\`.
    f.  **Example (1 character):** A prompt describing only a woman would end with: \`...<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>\`.
    g.  **Parameter Explanation:**
        - **Confidence (0.35):** Minimum confidence to accept face detection. Lower values catch more faces but may include false positives.
        - **IoU (0.5):** Overlap threshold for non-maximum suppression. Higher values keep more overlapping faces.
        - **Model (face_yolov9c.pt):** YOLOv9 face detection model optimized for face segmentation tasks.

5.  **Composition Directives (Standard Set):** Always include this standard set:
    - \`Dramatic rim light, desaturated color grade, shallow depth of field\`
    - **Why:**
        - **Dramatic rim light:** Separates character from background, adds depth
        - **Desaturated color grade:** Post-apocalyptic mood, gritty tone
        - **Shallow depth of field:** Professional photography look, focus on character

6.  **Negative Prompt (Production Standard):** The negative prompt MUST include: \`blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy, artificial appearance, oversaturated, childish style, background characters, faces hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive special effects\`

7.  **FLUX Model Settings (CRITICAL):**
    - **cfgscale:** You MUST use **1** for FLUX models. Never use 7 or other values.
    - **fluxguidancescale:** You MUST use **3.5** for FLUX models.
    - **seed:** Use **-1** for random generation.
    - **steps:** Use **20** (production standard from tested prompts).
    - **model:** Use the model specified in the Episode Style Config (typically 'flux1-dev-fp8').

**CRITICAL REMINDER - Prompt Structure:**
- **DO start with shot type:** \`"medium shot of a"\`, \`"wide shot of a"\`, \`"close-up of a"\`
- **DO include facial expression** after character description
- **DO include atmosphere-specific face lighting** after environment description
- **DO end with YOLO segments** for precise camera control
- **DO NOT start with weighted positioning** (old method, new method uses facial expressions and YOLO)

**Output:**
- Your entire response MUST be a single JSON array of objects. Each object represents one beat and contains the 'beatId' and the 'cinematic' prompt object.
- **CRITICAL:** Every prompt string in your response MUST follow the new production standard structure: [shot_type] of [character_description], [facial_expression], [action], [environment]. [face_lighting], [composition].
- **CRITICAL:** Every prompt object MUST have \`steps: 20\`, \`cfgscale: 1\`, and \`fluxguidancescale: 3.5\` (for FLUX models). These are non-negotiable and must be used for all prompts.
- **Note:** Vertical (9:16) prompts are NO LONGER generated per beat as they are now handled by a separate marketing-specific process.`;

    // Schema - only cinematic prompts are required for beat-based analysis
    // Vertical prompts are generated separately for video short marketing content (Phase C optimization)
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
                },
                marketingVertical: {
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
                },
            },
            required: ['beatId', 'cinematic']
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
    // Note: verticalRatio removed - vertical prompts are for video shorts, not beat analysis

    const cinematicWidth = Math.round(Math.sqrt(baseResolution * baseResolution * cinematicRatio) / 8) * 8;
    const cinematicHeight = Math.round(cinematicWidth / cinematicRatio / 8) * 8;
    
    // Note: Vertical dimensions removed - vertical prompts are for video shorts, not beat analysis

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

    const verticalWidth = Math.round(Math.sqrt(baseResolution * baseResolution * verticalRatio) / 8) * 8;
    const verticalHeight = Math.round(verticalWidth / verticalRatio / 8) * 8;

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
        const result = JSON.parse(response.content) as any[];

        // Post-process: Ensure correct steps and FLUX-specific parameters (Phase C optimization)
        const corrected = result.map(bp => {
            // Ensure cinematic has correct values
            const correctedCinematic: SwarmUIPrompt = {
                ...bp.cinematic,
                steps: 20, // Production standard: 20 (not 40 as previously)
                cfgscale: 1, // FLUX standard: 1 (not 7)
            };

            // Ensure vertical has correct values if present (now optional in Phase C)
            const correctedVertical: SwarmUIPrompt | undefined = bp.vertical ? {
                ...bp.vertical,
                width: verticalWidth,
                height: verticalHeight,
                steps: 20, // Production standard: 20 (not 40 as previously)
                cfgscale: 1, // FLUX standard: 1 (not 7)
            } : undefined;

            // Ensure marketing vertical has correct values if present (now optional in Phase C)
            const correctedMarketingVertical: SwarmUIPrompt | undefined = bp.marketingVertical ? {
                ...bp.marketingVertical,
                width: verticalWidth,
                height: verticalHeight,
                steps: 20, // Production standard: 20 (not 40 as previously)
                cfgscale: 1, // FLUX standard: 1 (not 7)
            } : undefined;

            const corrected: BeatPrompts = {
                beatId: bp.beatId,
                cinematic: correctedCinematic,
                vertical: correctedVertical,
                marketingVertical: correctedMarketingVertical,
            };

            // Log if values were corrected
            if (bp.cinematic?.steps !== 20 || bp.cinematic?.cfgscale !== 1 ||
                (bp.vertical && (bp.vertical?.steps !== 20 || bp.vertical?.cfgscale !== 1)) ||
                (bp.marketingVertical && (bp.marketingVertical?.steps !== 20 || bp.marketingVertical?.cfgscale !== 1))) {
                console.log(`⚠️ Corrected steps/CFG for beat ${bp.beatId}:`);
                if (bp.cinematic?.steps !== 20 || bp.cinematic?.cfgscale !== 1) {
                    console.log(`   Cinematic: steps ${bp.cinematic?.steps || 'missing'}→20, cfgscale ${bp.cinematic?.cfgscale || 'missing'}→1`);
                }
                if (bp.vertical && (bp.vertical?.steps !== 20 || bp.vertical?.cfgscale !== 1)) {
                    console.log(`   Vertical: steps ${bp.vertical?.steps || 'missing'}→20, cfgscale ${bp.vertical?.cfgscale || 'missing'}→1`);
                }
                if (bp.marketingVertical && (bp.marketingVertical?.steps !== 20 || bp.marketingVertical?.cfgscale !== 1)) {
                    console.log(`   Marketing Vertical: steps ${bp.marketingVertical?.steps || 'missing'}→20, cfgscale ${bp.marketingVertical?.cfgscale || 'missing'}→1`);
                }
            }

            return corrected;
        });

        console.log('✅ Qwen prompt generation completed successfully');
        return corrected;

    } catch (error) {
        console.error("Error calling Qwen API for prompt generation:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
            throw new Error("Failed to generate prompts. The AI model returned an invalid JSON structure.");
        }
        throw new Error("Failed to generate prompts. The AI model may be temporarily unavailable or the request was invalid.");
    }
};
