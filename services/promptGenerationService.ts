// FIX: Corrected import path for Google GenAI SDK.
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedEpisode, BeatPrompts, EpisodeStyleConfig, RetrievalMode, EnhancedEpisodeContext } from '../types';
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

const responseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            beatId: { type: Type.STRING },
            cinematic: swarmUIPromptSchema,
            vertical: swarmUIPromptSchema,
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
    onProgress?: (message: string) => void
): Promise<BeatPrompts[]> => {
    onProgress?.('Verifying API key...');
    // Read API key from .env via import.meta.env (Vite client-side)
    // Try VITE_ prefix first (recommended), then fallback to non-prefixed for backward compat
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
    
    const verticalHeight = Math.round(Math.sqrt(baseResolution * baseResolution / verticalRatio) / 8) * 8;
    const verticalWidth = Math.round(verticalHeight * verticalRatio / 8) * 8;

    // Create system instruction with context source information
    const systemInstruction = `You are an expert **Virtual Cinematographer and Visual Translator**. Your job is to create visually potent, token-efficient SwarmUI prompts. You must synthesize information from multiple sources and, most importantly, **translate narrative prose into purely visual descriptions**. For each beat, generate TWO distinct prompts: one cinematic (16:9) and one vertical (9:16).

**Your Mandate: THINK LIKE A CINEMATOGRAPHER. Compose the shot by weaving together stylistic elements with the narrative.**

**Strict Content Rules (NON-NEGOTIABLE):**
1.  **NO NARRATIVE NAMES:** You MUST NOT use character's actual names (e.g., "Catherine Mitchell", "Cat", "O'Brien"). You MUST ONLY use their assigned \`base_trigger\` from the context (e.g., "JRUMLV woman").
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
        ii. **Use Correct Trigger Syntax:** Use the character's 'base_trigger' followed by a parenthetical group of key visual descriptors. Example: \`JRUMLV woman (athletic build, tactical gear, hair in a tight bun)\`. No weighted syntax.
        iii. **Contextualize Appearance:** Adapt the character's 'visual_description' to the scene's context. A 'pristine lab coat' in a 'bombed-out ruin' becomes a 'torn, dust-covered lab coat'.
        iv. **Database Context Enhancement:** Use 'location_contexts' and 'swarmui_prompt_override' for highly detailed, location-specific appearances when available.
    b.  **Environment:** 
        i. **Location Visual Description (CRITICAL):** You MUST use the 'visual_description' field from \`episode.scenes[sceneNumber].location.visual_description\` in the Episode Context JSON. This is NOT optional - it contains the detailed visual description of the location that must appear in your prompts.
        ii. **Artifacts (CRITICAL):** You MUST include relevant artifacts from \`episode.scenes[sceneNumber].location.artifacts[]\` in the Episode Context JSON. Each artifact has a \`swarmui_prompt_fragment\` field that contains visual elements you MUST incorporate. If artifacts are present, they are part of the location's visual identity and MUST be described.
        iii. **Location Attributes:** Use 'locationAttributes' from the beat analysis and the 'atmosphere' from the style guide as additional set dressing.
        iv. **Interior Shots:** **All scenes are interior shots.** You MUST include terms like "interior shot," "inside the facility," to prevent outdoor scenes.
        v. **Database Context Priority:** When Episode Context shows "Context Source: database", you MUST prioritize the location's \`visual_description\` and \`artifacts\` over generic location names. Do NOT say "NHIA Facility 7" - instead describe what the \`visual_description\` tells you about the location.
    c.  **Composition & Character Positioning Intelligence (Flux Model Targeting - CRITICAL):**
        This is a critical step to counteract known Flux/Flux1 model deficiencies regarding character positioning and facing direction. You MUST apply these rules:
        i.  **Default to Facing Camera (Baseline Rule):** By default, characters MUST face the viewer/camera. You MUST proactively use explicit phrases like "facing the camera," "looking at the viewer," "portrait of," "making eye contact with the camera," "character facing forward," or "direct gaze toward camera" to ensure this. Without explicit direction, Flux models often position characters facing away.
        ii. **Narrative Override (CRITICAL):** You MUST override the default "facing camera" rule ONLY if the narrative context explicitly demands it. Analyze the 'core_action' and 'beat_script_text' for these specific cues:
            - **Interaction/Observation:** If a character is examining an object ("kneeling by a crater"), interacting with a console/screen, or surveying a scene, their pose should prioritize that action. They may be in profile or have their back partially to the camera to establish their point-of-view. BUT still describe their facing explicitly: "in profile view," "looking at the console," "back partially turned to camera."
            - **Emotional Context:** If the 'emotional_tone' is introspective, mysterious, or somber, you may compositionally choose to have the character looking away from the camera to enhance that feeling. BUT be explicit: "looking away from camera," "gaze turned toward window," etc.
        iii. **Multi-Character Spacing & Gaze Control (CRITICAL for 2+ characters):** When two or more characters are present, you MUST prevent unnatural face-to-face positioning (a known Flux model quirk). Apply these rules:
            - **Spatial Separation:** Use explicit spatial language like "[Character A] on the left," "[Character B] on the right," "standing apart with distance between them," "positioned on opposite sides of the frame," "characters separated by [distance/element]."
            - **Individual Gaze Control:** Control each character's gaze independently to avoid unintended intimate eye contact. Examples: "[Character A] looks at the console, [Character B] looks toward the doorway," "[Character A] faces camera, [Character B] looks to the left," "[Character A] examining the data screen, [Character B] scanning the room." Do NOT let both characters face each other unless the script explicitly calls for a confrontation or intimate moment.
            - **Prevent Clustering:** Explicitly state they are NOT positioned face-to-face: "not facing each other," "characters are not making eye contact with each other," "positioned at angles to each other."
        iv. **Integrate Existing Notes:** Always incorporate any specific \`cameraAngleSuggestion\` or \`characterPositioning\` provided in the beat analysis, using them to inform your final composition while still applying the Flux positioning rules above.

3.  **Visually Translate the Action (Visual Filter Rule):**
    Read the 'core_action' and 'beat_script_text' for intent, then describe only what a camera sees. Use the 'visual_anchor' as the shot's focus.
    -   **OMIT:** Sounds, smells, internal feelings, abstract verbs.
    -   **TRANSLATE:** Convert abstract concepts into concrete visuals. INSTEAD OF \`unnerving silence\`, USE \`an atmosphere of eerie stillness\`.

4.  **Compose the Prompt (CRITICAL STEP):**
    **Do NOT just list keywords.** Weave the elements from the \`styleGuide\` and your synthesis into a cohesive, descriptive paragraph that paints a picture.

    **A. Cinematic Prompt (16:9):**
    -   **Focus:** Wide, narrative.
    -   **Structure:** Start with the camera shot, then describe the scene, integrating lighting, environment FX, and atmosphere throughout the description.
    -   **Example:** \`wide shot. In a room choked with volumetric dust and twisted rebar, the air is thick with an atmosphere of eerie stillness. Dramatic rim light cuts through the gloom, catching the precise, focused posture of a JRUMLV woman (athletic build, hair in a tight bun). The scene has a desaturated color grade, shot with a shallow depth of field.\`
    
    **B. Vertical Prompt (9:16):**
    -   **Focus:** Tight, character-centric. Recompose for a vertical frame, often using a closer shot from the style guide or inferring one (e.g., 'close-up').
    -   **Example:** \`close-up of a determined JRUMLV woman (face taut with concentration) in tactical gear. Dramatic rim light highlights the dust on her cheek, with a background of glowing biohazard symbols blurred by a shallow depth of field. The image has a desaturated color grade.\`

5.  **YOLO Face Refinement (Multi-Character):** You MUST apply a unique YOLO segmentation tag for **each character** whose face is visible in the shot.
    a.  **Identify Characters:** Count the number of distinct characters you are describing in the prompt.
    b.  **Append Indexed Tags:** For each character, append an indexed tag to the end of the prompt. The first character gets index 1, the second gets index 2, and so on.
    c.  **Use Exact Syntax:** The tag format MUST be \`<segment:yolo-face_yolo11m-seg.pt-INDEX,0.35,0.5>\`.
    d.  **Example (2 characters):** A prompt describing a woman and a man would end with: \`...cinematic shot <segment:yolo-face_yolo11m-seg.pt-1,0.35,0.5> <segment:yolo-face_yolo11m-seg.pt-2,0.35,0.5>\`.
    e.  **Example (1 character):** A prompt describing only a woman would end with: \`...cinematic shot <segment:yolo-face_yolo11m-seg.pt-1,0.35,0.5>\`.
    f.  **Parameter Explanation:** 
        - **Confidence (0.35):** Minimum confidence to accept face detection. Lower values catch more faces but may include false positives.
        - **IoU (0.5):** Overlap threshold for non-maximum suppression. Higher values keep more overlapping faces.
        - **Model (yolo11m-seg.pt):** Latest YOLO11 medium segmentation model for better face detection.

**Output:**
- Your entire response MUST be a single JSON array of objects. Each object represents one beat and contains the 'beatId' and BOTH the 'cinematic' and 'vertical' prompt objects, strictly adhering to the provided schema.`;

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
                contents: `Generate SwarmUI prompts for the following beat analyses, using the provided Episode Context for character details and the Style Config for aesthetic guidance.\n\n---BEAT ANALYSES---\n${JSON.stringify(beatsWithStyleGuide, null, 2)}\n\n---EPISODE CONTEXT JSON (Source: ${contextSource})---\n${enhancedContextJson}\n\n---EPISODE STYLE CONFIG---\n${JSON.stringify({ ...styleConfig, cinematicWidth, cinematicHeight, verticalWidth, verticalHeight }, null, 2)}`,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                    temperature: 0.2,
                },
            });

            onProgress?.(`Processing Gemini response for batch ${batchIndex + 1}...`);
            const jsonString = response.text.trim();
            const batchResult = JSON.parse(jsonString) as BeatPrompts[];
            allResults.push(...batchResult);
            
            onProgress?.(`✅ Batch ${batchIndex + 1} completed: ${batchResult.length} prompts generated`);
            console.log(`Batch ${batchIndex + 1} completed: ${batchResult.length} prompts generated`);
            
        } catch (error) {
            console.error(`Error processing batch ${batchIndex + 1}:`, error);
            throw new Error(`Failed to generate prompts for batch ${batchIndex + 1}. ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Apply LORA trigger substitution based on character contexts
    onProgress?.('Applying LORA trigger substitutions...');
    try {
        const contextObj = JSON.parse(episodeContextJson);
        
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
            const characterMap = new Map<string, { character_name: string; aliases: string[]; base_trigger: string }>();
            
            contextObj.episode.scenes.forEach((scene: any) => {
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
            });
            
            characterContexts = Array.from(characterMap.values());
        }
        
        // Only apply substitution if we have character contexts
        if (characterContexts.length > 0) {
            const finalResults = allResults.map(bp => ({
                ...bp,
                cinematic: {
                    ...bp.cinematic,
                    prompt: applyLoraTriggerSubstitution(bp.cinematic.prompt, characterContexts),
                },
                vertical: {
                    ...bp.vertical,
                    prompt: applyLoraTriggerSubstitution(bp.vertical.prompt, characterContexts),
                }
            }));
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
    return generateSwarmUiPrompts(enrichedAnalyzedEpisode, episodeContextJson, styleConfig, retrievalMode, storyId, onProgress);
};