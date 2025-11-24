// FIX: Corrected import path for Google GenAI SDK.
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedEpisode, BeatPrompts, EpisodeStyleConfig, RetrievalMode, EnhancedEpisodeContext, LLMProvider, SwarmUIPrompt } from '../types';
import { generateEnhancedEpisodeContext } from './databaseContextService';
import { applyLoraTriggerSubstitution } from '../utils';

const swarmUIPromptSchema = {
    type: Type.OBJECT,
    properties: {
        prompt: { type: Type.STRING },
        model: { type: Type.STRING },
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
        steps: { type: Type.NUMBER },
        cfgscale: { type: Type.NUMBER },
        seed: { type: Type.NUMBER },
    },
    required: ['prompt', 'model', 'width', 'height', 'steps', 'cfgscale', 'seed'],
};

// Response schema - cinematic, vertical, and marketing vertical prompts are now included for long-form and marketing
const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            beatId: { type: Type.STRING },
            cinematic: swarmUIPromptSchema,
            vertical: swarmUIPromptSchema,
            marketingVertical: swarmUIPromptSchema,
        },
        required: ['beatId', 'cinematic', 'vertical']
    }
};

export const generateSwarmUiPrompts = async (
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig,
    retrievalMode: RetrievalMode = 'manual',
    storyId?: string,
    provider: LLMProvider = 'gemini',
    onProgress?: (message: string) => void
): Promise<BeatPrompts[]> => {
    onProgress?.('Verifying API key...');
    
    // Route to appropriate provider for prompt generation
    // Note: Currently only Gemini has full implementation. Other providers use Gemini as fallback.
    switch (provider) {
        case 'gemini':
            return await generateSwarmUiPromptsWithGemini(analyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, onProgress);
        case 'qwen':
        case 'claude':
        case 'openai':
        case 'xai':
        case 'deepseek':
        case 'glm':
            // For now, use Gemini implementation until provider-specific logic is implemented
            onProgress?.(`⚠️ ${provider.toUpperCase()} prompt generation not yet fully implemented. Using Gemini API for prompt generation.`);
            console.warn(`Prompt generation with ${provider.toUpperCase()} is not yet implemented. Using Gemini as fallback.`);
            return await generateSwarmUiPromptsWithGemini(analyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, onProgress);
        default:
            throw new Error(`Unsupported provider for prompt generation: ${provider}`);
    }
};

// Gemini prompt generation (original implementation)
async function generateSwarmUiPromptsWithGemini(
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig,
    retrievalMode: RetrievalMode = 'manual',
    storyId?: string,
    onProgress?: (message: string) => void
): Promise<BeatPrompts[]> {
    onProgress?.('Verifying Gemini API key...');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                   import.meta.env.GEMINI_API_KEY || 
                   (process.env as any).API_KEY ||
                   (process.env as any).GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is not configured in .env file. Please set it and restart the dev server.");
    }
    const ai = new GoogleGenAI({ apiKey });
    onProgress?.('✅ API key verified. Initializing prompt generation...');

    const beatsForPrompting = analyzedEpisode.scenes.flatMap(scene =>
        scene.beats.filter(beat => beat.imageDecision.type === 'NEW_IMAGE')
    );

    if (beatsForPrompting.length === 0) {
        return [];
    }

    onProgress?.(`Processing ${beatsForPrompting.length} NEW_IMAGE beats for prompt generation...`);
    console.log(`Processing ${beatsForPrompting.length} NEW_IMAGE beats for prompt generation`);

    // If we have too many beats, process them in batches to avoid token limits
    const BATCH_SIZE = 20; // Process 20 beats at a time
    const batches = [];
    for (let i = 0; i < beatsForPrompting.length; i += BATCH_SIZE) {
        batches.push(beatsForPrompting.slice(i, i + BATCH_SIZE));
    }

    onProgress?.(`Organized into ${batches.length} batch${batches.length > 1 ? 'es' : ''} for processing...`);
    console.log(`Processing ${batches.length} batches of beats`);

    // Enhanced context processing for database mode
    let enhancedContextJson = episodeContextJson;
    let contextSource = 'manual';
    
    if (retrievalMode === 'database' && storyId) {
        try {
            // Check if episodeContextJson already contains database structure
            // (when fetched via contextService.ts)
            const parsedContext = JSON.parse(episodeContextJson);
            const hasDatabaseStructure = parsedContext.episode?.scenes?.some((scene: any) => 
                scene.location?.visual_description || scene.location?.artifacts?.length > 0
            );
            
            if (hasDatabaseStructure) {
                // Already have database context - use it directly
                console.log('✅ Using existing database context with location descriptions and artifacts');
                contextSource = 'database';
                enhancedContextJson = episodeContextJson;
            } else {
                // Need to generate enhanced context (fallback for older flows)
                console.log('Generating enhanced episode context from database...');
                const enhancedContext = await generateEnhancedEpisodeContext(
                    storyId,
                    analyzedEpisode.episodeNumber,
                    analyzedEpisode.title,
                    `Episode ${analyzedEpisode.episodeNumber} analysis`,
                    analyzedEpisode.scenes.map(scene => ({
                        scene_number: scene.sceneNumber,
                        scene_title: scene.title,
                        scene_summary: scene.metadata.sceneRole,
                        location: scene.beats[0]?.locationAttributes ? {
                            name: scene.beats[0].locationAttributes[0] || 'Unknown Location',
                            description: 'Location from beat analysis',
                            visual_description: 'Visual description from database',
                            artifacts: []
                        } : null
                    }))
                );
                
                enhancedContextJson = JSON.stringify(enhancedContext, null, 2);
                contextSource = 'database';
                console.log('✅ Enhanced context generated from database');
            }
        } catch (error) {
            console.warn('Failed to generate enhanced context from database, falling back to manual context:', error);
            contextSource = 'manual (fallback)';
        }
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

    const verticalWidth = Math.round(Math.sqrt(baseResolution * baseResolution * verticalRatio) / 8) * 8;
    const verticalHeight = Math.round(verticalWidth / verticalRatio / 8) * 8;

    // Create system instruction with context source information
    const systemInstruction = `You are an expert **Virtual Cinematographer and Visual Translator**. Your job is to create visually potent, token-efficient SwarmUI prompts following the LATEST PRODUCTION-STANDARD prompt construction techniques from Episode 1. These techniques have been tested across 135 prompts with superior visual results. For each beat, generate BOTH cinematic (16:9) AND vertical (9:16) prompts. Both are used for long-form storytelling and marketing, but with different compositional requirements.

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

**Strict Content Rules (NON-NEGOTIABLE):**
1.  **NO NARRATIVE NAMES (with Override Exception):** You MUST NOT use character's actual names (e.g., "Catherine Mitchell", "Cat", "O'Brien") UNLESS a \`swarmui_prompt_override\` is provided. If \`swarmui_prompt_override\` exists, it may contain character names and you MUST use it exactly as written. Otherwise, you MUST ONLY use their assigned \`base_trigger\` from the context (e.g., "JRUMLV woman").
2.  **NO LOCATION NAMES:** You MUST NOT use the proper name of a location (e.g., "NHIA Facility 7"). Instead, you MUST visually describe the environment based on its \`visual_description\`, \`locationAttributes\`, and \`artifacts\` from the context. Translate the *idea* of the location into what a camera would see.

**Inputs:**
1.  **Beat Analysis JSON:** This is the primary input. Each beat now includes a \`styleGuide\` object containing categorized cinematic terms. You MUST use this as your palette. It also contains the 'core_action', 'beat_script_text', 'visual_anchor', and character positions.
2.  **Episode Context JSON:** The "Director's Bible." Your primary source for character and location details. **Context Source: ${contextSource}** - When using database context, you have access to rich location-specific character appearances, detailed artifacts with SwarmUI prompt fragments, and atmospheric context.
3.  **Episode Style Config:** Contains the global 'model' and aspect ratios.

**Your Detailed Workflow for EACH Beat:**

1.  **Deconstruct the Style Guide:** For each beat, review the provided \`styleGuide\` object. This is your shot list and technical spec.
    -   \`camera\`: Instructions on shot type, lens effects, and movement (e.g., "wide shot, shallow depth of field").
    -   \`lighting\`: The lighting scheme (e.g., "dramatic rim light").
    -   \`environmentFX\`: Visual effects present in the scene (e.g., "desaturated color grade, volumetric dust").
    -   \`atmosphere\`: Keywords describing the mood and feel of the environment.

2.  **Synthesize Core Visual Elements (Characters & Environment):**
    a.  **Characters:**
        i.  **Identify using Aliases (CRITICAL):** Cross-reference names in 'beat_script_text' with 'character_name' and 'aliases' in the Episode Context to find the correct profile.

        ii. **Location-Specific Override Priority (CRITICAL - HIGHEST PRIORITY):**
            - **STEP 1 - CHECK FOR OVERRIDE:** For each character in the current scene, you MUST check for \`location_context.swarmui_prompt_override\`. The override can be found in these locations (check in order):
              1. \`episode.scenes[sceneNumber].characters[characterIndex].location_context.swarmui_prompt_override\` (primary path for database context)
              2. \`episode.scenes[sceneNumber].character_appearances[characterIndex].location_context.swarmui_prompt_override\` (alternative path)
              3. \`episode.characters[characterIndex].location_contexts[].swarmui_prompt_override\` where the location matches the scene location (fallback path)
            - **STEP 2 - IF OVERRIDE EXISTS:** You MUST use the ENTIRE \`swarmui_prompt_override\` string EXACTLY as written. This COMPLETELY REPLACES and OVERRIDES the base_trigger syntax. DO NOT:
              * Use base_trigger (e.g., "JRUMLV woman")
              * Modify the override text
              * Add to or supplement the override
              * Replace character names in the override with triggers
            - **STEP 3 - IF NO OVERRIDE EXISTS:** Only then use the character's 'base_trigger' followed by a parenthetical group of key visual descriptors. NEW STANDARD: Include specific "form-fitting" and "lean athletic build" and "toned arms" to prevent bulky appearance from gear. Example: \`JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun)\`. Do NOT use weighted syntax.

        iii. **Contextualize Appearance (only if no override):** If no \`swarmui_prompt_override\` exists, adapt the character's 'visual_description' to the scene's context. A 'pristine lab coat' in a 'bombed-out ruin' becomes a 'torn, dust-covered lab coat'.

        iv. **Example Override Usage:** If \`swarmui_prompt_override\` contains "Catherine 'Cat' Mitchell as field investigator, 32, dark brown tactical bun, green eyes alert and focused, wearing MultiCam woodland camo tactical pants, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms...", you MUST use that ENTIRE string in your prompt. Do NOT replace "Catherine" with "JRUMLV woman" - the override is already complete and formatted correctly.
    b.  **Environment:**
        i. **Location Visual Description (CRITICAL):** You MUST use the 'visual_description' field from \`episode.scenes[sceneNumber].location.visual_description\` in the Episode Context JSON. This is NOT optional - it contains the detailed visual description of the location that must appear in your prompts.
        ii. **Artifacts (CRITICAL):** You MUST include relevant artifacts from \`episode.scenes[sceneNumber].location.artifacts[]\` in the Episode Context JSON. Each artifact has a \`swarmui_prompt_fragment\` field that contains visual elements you MUST incorporate. If artifacts are present, they are part of the location's visual identity and MUST be described.
        iii. **Location Attributes:** Use 'locationAttributes' from the beat analysis and the 'atmosphere' from the style guide as additional set dressing.
        iv. **Interior Shots:** **All scenes are interior shots.** You MUST include terms like "interior shot," "inside the facility," to prevent outdoor scenes.
        v. **Database Context Priority:** When Episode Context shows "Context Source: database", you MUST prioritize the location's \`visual_description\` and \`artifacts\` over generic location names. Do NOT say "NHIA Facility 7" - instead describe what the \`visual_description\` tells you about the location.
    c.  **Composition & Character Positioning Intelligence (Flux Model Targeting - CRITICAL):**
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
        vi. **Multi-Character Spacing & Gaze Control:**
            - **Spatial Separation:** Use explicit spatial language like "[Character A] on the left," "[Character B] on the right," "standing apart with distance between them," "positioned on opposite sides of the frame," "characters separated by [distance/element]."
            - **Individual Gaze Control:** Control each character's gaze independently with YOLO segments (see below)
            - **Prevent Clustering:** Explicitly state they are NOT positioned face-to-face: "not facing each other," "characters are not making eye contact with each other," "positioned at angles to each other."

3.  **Visually Translate the Action (Visual Filter Rule):**
    Read the 'core_action' and 'beat_script_text' for intent, then describe only what a camera sees. Use the 'visual_anchor' as the shot's focus.
    -   **OMIT:** Sounds, smells, internal feelings, abstract verbs.
    -   **TRANSLATE:** Convert abstract concepts into concrete visuals. INSTEAD OF \`unnerving silence\`, USE \`an atmosphere of eerie stillness\`.

4.  **Compose the Prompts (CRITICAL STEP - NEW PRODUCTION STANDARD):**
    **Do NOT just list keywords.** Weave the elements from the \`styleGuide\` and your synthesis into a cohesive, descriptive paragraph that paints a picture.

    **A. Cinematic Prompt (16:9):**
    -   **Focus:** Wide, narrative. Emphasizes horizontal composition and environmental storytelling.
    -   **Structure:** \`[shot_type] of [character_description], [facial_expression], [action_verb] [environment_description with beat narrative lighting]. [face_lighting_extracted_from_beat_narrative]. [composition_directives]. <yolo_segments>\`
    -   **Character Details:** Include specific clothing (MultiCam woodland camo, form-fitting tactical vest, fitted olive long-sleeved shirt), physique (lean athletic build, toned arms), and gear details (dual holsters, tactical watch).
    -   **Facial Expression:** \`"alert, tactical expression on her face"\`, \`"focused combat readiness on his face"\`
    -   **Dynamic Weapon Positioning (Daniel):** Include weapon position in action based on beat narrative: \`"advancing with M4 carbine at ready position"\`, \`"with M4 carbine slung on tactical sling"\`
    -   **Face Lighting Extraction:** READ beat narrative first, extract lighting keywords, adapt to face lighting using same descriptive words. FALLBACK to atmosphere lighting only if beat has no lighting details.
    -   **Example:** \`wide shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), alert, tactical expression on her face, moving through CDC archive bathed in eerie green light from backup generators. eerie green light on face, sickly green illumination, Dramatic rim light, desaturated color grade, shallow depth of field. <segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>\`

    **B. Vertical Prompt (9:16):**
    -   **Focus:** Character-centric, emphasizing people and vertical composition. Prioritizes top and bottom of frame over side-to-side.
    -   **Composition Requirements:**
        - **Vertical Emphasis:** Prioritize elements in the top and bottom of the frame, not just center
        - **Character Focus:** Place main subject close to camera, emphasizing facial features and expressions
        - **Positioning:** Use facial expressions and YOLO segments for precise control (not weighted syntax at start)
        - **Environment:** Include environmental context but keep it as background, not competing with the character
        - **Top/BOTTOM Framing:** Include elements at the top of the frame (e.g., "character's head at top of frame") and bottom (e.g., "feet at bottom of frame")
    -   **Structure:** \`[shot_type] of [character_description], [facial_expression], [action_verb] [environment_description with beat narrative lighting]. [face_lighting_extracted_from_beat_narrative]. [composition_directives]. <yolo_segments>\`
    -   **For character focus:** \`medium shot of JRUMLV woman (detailed clothing and physique), alert expression on her face, [action in environment with beat narrative lighting]. [face lighting extracted from beat], [composition directives]. <yolo-face_yolov9c.pt-1, 0.35, 0.5>\`
    -   **For environmental storytelling in vertical:** \`medium shot of JRUMLV woman (detailed clothing and physique), [expression], [action in environment with beat narrative lighting]. [face lighting extracted from beat], [composition directives]. <yolo-face_yolov9c.pt-1, 0.35, 0.5>\`
    -   **Example (character focus):** \`medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), alert, tactical expression on her face, advancing through heavy gunsmoke with bright muzzle flashes illuminating the chaos. bright intermittent muzzle flashes on face subdued by thick gunsmoke, dramatic explosive illumination, flickering combat lighting, Dramatic rim light, desaturated color grade, shallow depth of field. <segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>\`

    **C. Marketing Vertical Prompt (9:16) (EXPERIMENTAL):**
    -   **Focus:** Marketing-optimized vertical composition designed to generate buzz and drive viewers to the full episode. This prompt is specifically crafted to be more hook-focused than beat-based vertical prompts.
    -   **Purpose:** Create compelling social media content for platforms like TikTok, Instagram Reels, YouTube Shorts
    -   **Style:** More dramatic, attention-grabbing, with stronger visual hooks that stop scrolling
    -   **Composition:** Optimized for mobile viewing with strong focal points that work in social feeds
    -   **Emphasis:** Emotional/visual hooks that generate interest about the full narrative
    -   **Structure:** \`[shot_type] of [character_description], [strong_emotional_expression], [compelling_action] [marketing_focused_environment]. [marketing_emotional_lighting], [attention_grabbing_composition]. <yolo_segments>\`
    -   **Key Difference:** More marketing-focused language, hooks that generate curiosity, optimized for social media engagement
    -   **Example:** \`close-up of a JRUMLV woman (MultiCam woodland camo tactical pants, form-fitting tactical vest, lean athletic build, toned arms), intense, focused expression on her face that grabs attention, performing a dramatic action in a compelling environment. dramatic marketing lighting with high contrast, attention-grabbing rim lighting that stops the scroll, desaturated color grade, shallow depth of field. <segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>\`

5.  **YOLO Face Refinement (Multi-Character):** You MUST apply a unique YOLO segmentation tag for **each character** whose face is visible in the shot.
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

6.  **Composition Directives (Standard Set):** Always include this standard set:
    - \`Dramatic rim light, desaturated color grade, shallow depth of field\`
    - **Why:**
        - **Dramatic rim light:** Separates character from background, adds depth
        - **Desaturated color grade:** Post-apocalyptic mood, gritty tone
        - **Shallow depth of field:** Professional photography look, focus on character

7.  **Negative Prompt (Production Standard):** The negative prompt MUST include: \`blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy, artificial appearance, oversaturated, childish style, background characters, faces hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive special effects\`

8.  **FLUX Model Settings (CRITICAL):**
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
- Your entire response MUST be a single JSON array of objects. Each object represents one beat and contains the 'beatId', 'cinematic' prompt object, and 'vertical' prompt object.
- **CRITICAL:** Every prompt string in your response MUST follow the new production standard structure: [shot_type] of [character_description], [facial_expression], [action], [environment]. [face_lighting], [composition].
- **CRITICAL:** Every prompt object MUST have \`steps: 20\`, \`cfgscale: 1\`, and \`fluxguidancescale: 3.5\` (for FLUX models). These are non-negotiable and must be used for all prompts.
- **Note:** Both cinematic (16:9) and vertical (9:16) prompts are now required for long-form storytelling and marketing use cases.`;

    // Process beats in batches to avoid token limits
    const allResults: BeatPrompts[] = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        onProgress?.(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} beats)...`);
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} beats`);
        
        // DEV: Enhance beats with a dynamic, structured style guide for more contextual prompts.
        const beatsWithStyleGuide = batch.map(beat => {
            const styleGuide = {
                camera: new Set<string>(),
                lighting: new Set<string>(),
                environmentFX: new Set<string>(),
                atmosphere: new Set<string>()
            };

            // --- Camera ---
            if (beat.cameraAngleSuggestion) {
                styleGuide.camera.add(beat.cameraAngleSuggestion);
            }
            styleGuide.camera.add('shallow depth of field');
            // Add handheld feel for more dynamic scenes, could be based on a new 'energy' field in future.
            if (beat.beat_script_text.toLowerCase().includes('action') || beat.beat_script_text.toLowerCase().includes('runs')) {
                styleGuide.camera.add('handheld feel');
            }

            // --- Lighting ---
            styleGuide.lighting.add('dramatic rim light');

            // --- Environment & Atmosphere ---
            styleGuide.environmentFX.add('desaturated color grade');
            if (beat.locationAttributes?.some(attr => ['ruined', 'dusty', 'debris'].includes(attr))) {
                styleGuide.environmentFX.add('volumetric dust');
            }
            if (beat.locationAttributes) {
                beat.locationAttributes.forEach(attr => styleGuide.atmosphere.add(attr));
            }

            return {
                ...beat,
                styleGuide: {
                    camera: Array.from(styleGuide.camera).join(', '),
                    lighting: Array.from(styleGuide.lighting).join(', '),
                    environmentFX: Array.from(styleGuide.environmentFX).join(', '),
                    atmosphere: Array.from(styleGuide.atmosphere).join(', '),
                }
            };
        });

        try {
            onProgress?.(`Sending batch ${batchIndex + 1} to Gemini API for prompt generation...`);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Generate SwarmUI prompts for the following beat analyses, using the provided Episode Context for character details and the Style Config for aesthetic guidance.\n\n---BEAT ANALYSES---\n${JSON.stringify(beatsWithStyleGuide, null, 2)}\n\n---EPISODE CONTEXT JSON (Source: ${contextSource})---\n${enhancedContextJson}\n\n---EPISODE STYLE CONFIG---\n${JSON.stringify({ ...styleConfig, cinematicWidth, cinematicHeight }, null, 2)}`,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                    temperature: 0.2,
                },
            });

            onProgress?.(`Processing Gemini response for batch ${batchIndex + 1}...`);
            const jsonString = response.text.trim();
            const batchResult = JSON.parse(jsonString) as any[];
            
            // Post-process: Ensure correct steps and FLUX-specific parameters for both cinematic and vertical prompts
            const correctedBatch = batchResult.map(bp => {
                // Ensure cinematic has correct values
                const correctedCinematic = {
                    ...bp.cinematic,
                    steps: 20, // Production standard: 20 (not 40 as previously)
                    cfgscale: 1, // FLUX standard: 1 (not 7)
                };

                // Ensure vertical has correct values
                const correctedVertical = {
                    ...bp.vertical,
                    width: verticalWidth,
                    height: verticalHeight,
                    steps: 20, // Production standard: 20 (not 40 as previously)
                    cfgscale: 1, // FLUX standard: 1 (not 7)
                };

                // Ensure marketing vertical has correct values if present
                const correctedMarketingVertical = bp.marketingVertical ? {
                    ...bp.marketingVertical,
                    width: verticalWidth,
                    height: verticalHeight,
                    steps: 20, // Production standard: 20 (not 40 as previously)
                    cfgscale: 1, // FLUX standard: 1 (not 7)
                } : undefined;

                const corrected: BeatPrompts = {
                    beatId: bp.beatId,
                    cinematic: correctedCinematic,
                    vertical: correctedVertical, // Now using properly generated vertical prompt
                    marketingVertical: correctedMarketingVertical, // Marketing vertical if present
                };

                // Log if values were corrected
                if (bp.cinematic?.steps !== 20 || bp.cinematic?.cfgscale !== 1 ||
                    bp.vertical?.steps !== 20 || bp.vertical?.cfgscale !== 1 ||
                    bp.marketingVertical?.steps !== 20 || bp.marketingVertical?.cfgscale !== 1) {
                    console.log(`⚠️ Corrected steps/CFG for beat ${bp.beatId}:`);
                    if (bp.cinematic?.steps !== 20 || bp.cinematic?.cfgscale !== 1) {
                        console.log(`   Cinematic: steps ${bp.cinematic?.steps || 'missing'}→20, cfgscale ${bp.cinematic?.cfgscale || 'missing'}→1`);
                    }
                    if (bp.vertical?.steps !== 20 || bp.vertical?.cfgscale !== 1) {
                        console.log(`   Vertical: steps ${bp.vertical?.steps || 'missing'}→20, cfgscale ${bp.vertical?.cfgscale || 'missing'}→1`);
                    }
                    if (bp.marketingVertical?.steps !== 20 || bp.marketingVertical?.cfgscale !== 1) {
                        console.log(`   Marketing Vertical: steps ${bp.marketingVertical?.steps || 'missing'}→20, cfgscale ${bp.marketingVertical?.cfgscale || 'missing'}→1`);
                    }
                }

                return corrected;
            });
            
            allResults.push(...correctedBatch);
            
            onProgress?.(`✅ Batch ${batchIndex + 1} completed: ${correctedBatch.length} prompts generated`);
            console.log(`Batch ${batchIndex + 1} completed: ${correctedBatch.length} prompts generated`);
            
        } catch (error) {
            console.error(`Error processing batch ${batchIndex + 1}:`, error);
            throw new Error(`Failed to generate prompts for batch ${batchIndex + 1}. ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Apply LORA trigger substitution based on character contexts
    onProgress?.('Applying LORA trigger substitutions...');
    console.log('\n🔍 PROMPT GENERATION: Checking for location overrides before LORA substitution...');
    try {
        const contextObj = JSON.parse(episodeContextJson);
        
        // Log all available overrides in the context
        if (contextObj.episode?.scenes) {
            contextObj.episode.scenes.forEach((scene: any) => {
                const sceneChars = scene.characters || [];
                const sceneApps = scene.character_appearances || [];
                let sceneOverrideCount = 0;
                
                [...sceneChars, ...sceneApps].forEach((char: any) => {
                    const locCtx = char.location_context;
                    if (locCtx?.swarmui_prompt_override) {
                        sceneOverrideCount++;
                    }
                });
                
                if (sceneOverrideCount > 0) {
                    console.log(`   Scene ${scene.scene_number}: ${sceneOverrideCount} character(s) with overrides available`);
                }
            });
        }
        console.log('');
        
        // Extract characters - handle both structures:
        // 1. episode.characters (manual mode)
        // 2. episode.scenes[].characters[] (database mode)
        let characterContexts: Array<{ character_name: string; aliases: string[]; base_trigger: string }> = [];
        
        if (contextObj.episode?.characters && Array.isArray(contextObj.episode.characters)) {
            // Manual mode: characters at episode level
            characterContexts = contextObj.episode.characters.map((char: any) => ({
                character_name: char.character_name || char.name || '',
                aliases: char.aliases || [],
                base_trigger: char.base_trigger || ''
            })).filter((char: any) => char.character_name && char.base_trigger);
        } else if (contextObj.episode?.scenes && Array.isArray(contextObj.episode.scenes)) {
            // Database mode: extract unique characters from scenes
            // Also log location overrides for debugging
            console.log('\n🔍 PROMPT GENERATION: Analyzing location overrides in episode context...');
            contextObj.episode.scenes.forEach((scene: any) => {
                const sceneChars = scene.characters || [];
                const sceneApps = scene.character_appearances || [];
                
                [...sceneChars, ...sceneApps].forEach((char: any) => {
                    const locCtx = char.location_context;
                    if (locCtx?.swarmui_prompt_override) {
                        console.log(`   ✅ Scene ${scene.scene_number}: ${char.name || char.character_name}`);
                        console.log(`      Override will be used: "${locCtx.swarmui_prompt_override.substring(0, 80)}..."`);
                    }
                });
            });
            console.log('');
            
            const characterMap = new Map<string, { character_name: string; aliases: string[]; base_trigger: string }>();
            
            contextObj.episode.scenes.forEach((scene: any) => {
                // Extract from scene.characters
                if (scene.characters && Array.isArray(scene.characters)) {
                    scene.characters.forEach((char: any) => {
                        const name = char.name || char.character_name || '';
                        const baseTrigger = char.base_trigger || '';
                        
                        if (name && baseTrigger && !characterMap.has(name)) {
                            characterMap.set(name, {
                                character_name: name,
                                aliases: char.aliases || [],
                                base_trigger: baseTrigger
                            });
                        }
                    });
                }
                
                // Also extract from character_appearances (alternative structure)
                if (scene.character_appearances && Array.isArray(scene.character_appearances)) {
                    scene.character_appearances.forEach((char: any) => {
                        const name = char.name || char.character_name || '';
                        const baseTrigger = char.base_trigger || '';
                        
                        if (name && baseTrigger && !characterMap.has(name)) {
                            characterMap.set(name, {
                                character_name: name,
                                aliases: char.aliases || [],
                                base_trigger: baseTrigger
                            });
                        }
                    });
                }
            });
            
            characterContexts = Array.from(characterMap.values());
            console.log(`🔍 LORA Substitution: Extracted ${characterContexts.length} character context(s) from database:`, 
                characterContexts.map(c => `${c.character_name} (trigger: ${c.base_trigger}, aliases: ${c.aliases.join(', ')})`));
        }
        
        // Only apply substitution if we have character contexts
        if (characterContexts.length > 0) {
            console.log(`🔍 LORA Substitution: Processing ${characterContexts.length} character context(s):`, 
                characterContexts.map(c => `${c.character_name} -> ${c.base_trigger}`).join(', '));
            
            const finalResults = allResults.map(bp => {
                const originalCinematic = bp.cinematic.prompt;
                
                const substitutedCinematic = applyLoraTriggerSubstitution(bp.cinematic.prompt, characterContexts);
                
                // Log if substitution occurred
                if (originalCinematic !== substitutedCinematic) {
                    console.log(`✅ LORA Substitution applied for beat ${bp.beatId}`);
                    console.log(`   Cinematic: "${originalCinematic.substring(0, 100)}..." -> "${substitutedCinematic.substring(0, 100)}..."`);
                } else {
                    console.warn(`⚠️ LORA Substitution: No changes for beat ${bp.beatId}`);
                    console.log(`   Original cinematic prompt: "${originalCinematic.substring(0, 150)}..."`);
                }
                
                return {
                    ...bp,
                    cinematic: {
                        ...bp.cinematic,
                        prompt: substitutedCinematic,
                    }
                };
            });
            onProgress?.(`✅ Prompt generation complete! Generated ${finalResults.length} prompt pairs.`);
            return finalResults;
        } else {
            // No character contexts found - return prompts without substitution
            onProgress?.(`⚠️ No character contexts found for LORA substitution. Generated ${allResults.length} prompt pairs.`);
            return allResults;
        }
    } catch (e) {
        console.warn('Failed to apply LORA trigger substitution:', e);
        onProgress?.(`⚠️ LORA substitution failed, but prompts are ready. Generated ${allResults.length} prompt pairs.`);
        return allResults;
    }
};

// --- NEW HIERARCHICAL PROMPT GENERATION SERVICE (Phase 3.1 - Risk-Free Implementation) ---

/**
 * NOTE FOR FUTURE DEVELOPERS:
 * This function is part of a parallel, risk-free implementation for advanced prompt generation.
 * It is activated by a feature flag ('useHierarchicalPrompts') in the main application.
 * It is designed to be tested and developed without interfering with the original `generateSwarmUiPrompts` function.
 *
 * This service generates SwarmUI prompts using a hierarchical, context-aware approach.
 * It fetches detailed visual data for specific sub-locations (e.g., a server room within a facility)
 * and combines it with the ambient visual DNA of the parent location to create grounded, consistent imagery.
 *
 * It includes a graceful fallback: if a beat lacks the necessary hierarchical data,
 * this function will revert to the simpler `locationAttributes`-based method for that beat,
 * ensuring robustness and allowing for incremental data population.
 */
import { getHierarchicalLocationContext } from './databaseContextService';

export const generateHierarchicalSwarmUiPrompts = async (
    analyzedEpisode: AnalyzedEpisode,
    episodeContextJson: string,
    styleConfig: EpisodeStyleConfig,
    retrievalMode: RetrievalMode = 'manual',
    storyId?: string,
    provider: LLMProvider = 'gemini',
    onProgress?: (message: string) => void
): Promise<BeatPrompts[]> => {
    onProgress?.('Initializing hierarchical prompt generation service...');
    console.log("INFO: Using NEW Hierarchical Prompt Generation Service.");

    // This function reuses the logic and AI call from the original service.
    // The primary difference is the pre-processing step where we enrich the beat
    // data with hierarchical location context before sending it to the AI.

    const enrichedBeats = [];
    for (const scene of analyzedEpisode.scenes) {
        for (const beat of scene.beats) {
            let finalBeat = { ...beat };

            // Check if the beat has a resolved location ID from the analysis phase.
            if (finalBeat.resolvedLocationId) {
                const hierarchicalContext = await getHierarchicalLocationContext(finalBeat.resolvedLocationId);

                if (hierarchicalContext) {
                    const { ambient_prompt_fragment, defining_visual_features } = hierarchicalContext;
                    
                    // Combine the hierarchical data into the existing locationAttributes.
                    // The AI's system instruction will be updated to prioritize these.
                    const newAttributes = [];
                    if (ambient_prompt_fragment) {
                        newAttributes.push(`ambient_context:(${ambient_prompt_fragment})`);
                    }
                    if (defining_visual_features && defining_visual_features.length > 0) {
                        newAttributes.push(...defining_visual_features);
                    }

                    // If we have new attributes, prepend them. Otherwise, keep the old ones.
                    if (newAttributes.length > 0) {
                        finalBeat.locationAttributes = [...newAttributes, ...(finalBeat.locationAttributes || [])];
                    }
                    
                    console.log(`Enriched Beat ${finalBeat.beatId} with hierarchical context.`);
                } else {
                    console.log(`Beat ${finalBeat.beatId} had a resolvedLocationId, but no hierarchical context was found. Falling back.`);
                }
            }
            enrichedBeats.push(finalBeat);
        }
    }

    // We need to create a new AnalyzedEpisode object with the enriched beats
    // to pass to the original prompt generation logic.
    const enrichedAnalyzedEpisode: AnalyzedEpisode = {
        ...analyzedEpisode,
        scenes: analyzedEpisode.scenes.map(scene => ({
            ...scene,
            beats: enrichedBeats.filter(b => b.beatId.startsWith(`s${scene.sceneNumber}-`))
        }))
    };

    // Now, call the original prompt generation function with the *enriched* data.
    // We will also slightly modify the system instruction to tell the AI how to use the new context.
    // For this example, we will assume the original function can be called directly.
    // In a full implementation, we would refactor `generateSwarmUiPrompts` to share its core AI call logic.
    
    // For now, we will just log the enriched data and call the original function.
    console.log("--- ENRICHED EPISODE DATA ---");
    console.log(JSON.stringify(enrichedAnalyzedEpisode, null, 2));
    console.log("-----------------------------");
    
    // This is a placeholder for calling the refactored AI logic.
    // For this implementation, we will just call the original function, which
    // will now benefit from the enriched `locationAttributes`.
    onProgress?.('Starting prompt generation with enriched location context...');
    return generateSwarmUiPrompts(enrichedAnalyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, provider, onProgress);
};