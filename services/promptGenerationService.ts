// FIX: Corrected import path for Google GenAI SDK.
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedEpisode, BeatPrompts, EpisodeStyleConfig, RetrievalMode, EnhancedEpisodeContext, LLMProvider, SwarmUIPrompt, ImageConfig, BeatAnalysisWithState } from '../types';
import { processEpisodeWithFullContext, type FullyProcessedBeat } from './beatStateService';
import { generateEnhancedEpisodeContext } from './databaseContextService';
import { getStoryContext } from './storyContextService';
import { applyLoraTriggerSubstitution } from '../utils';
import { getGeminiModel, getGeminiTemperature } from './geminiService';

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

/**
 * Extract image_config from Episode Context JSON.
 * Returns config from database if available, otherwise returns default values.
 */
function extractImageConfig(episodeContextJson: string): ImageConfig | null {
    try {
        const context = JSON.parse(episodeContextJson);
        if (context.episode?.image_config) {
            console.log('[ImageConfig] Using image_config from Episode Context');
            return context.episode.image_config;
        }
    } catch (e) {
        console.warn('[ImageConfig] Failed to parse Episode Context for image_config:', e);
    }
    return null;
}

/**
 * Get generation parameters from image_config or environment variables.
 * Priority: Episode Context image_config > Environment variables > Hardcoded defaults
 */
function getGenerationParams(imageConfig: ImageConfig | null, preset: 'cinematic' | 'vertical' = 'cinematic') {
    // Environment variable helper
    const getEnvVar = (key: string): string | undefined => {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
        if (typeof import.meta !== 'undefined') {
            try {
                const env = import.meta.env;
                if (env) return env[key];
            } catch (e) {}
        }
        return undefined;
    };

    if (imageConfig) {
        // Use image_config from database (via Episode Context)
        const presetDimensions = imageConfig.presets[preset];
        return {
            model: imageConfig.model,
            width: presetDimensions.width,
            height: presetDimensions.height,
            steps: imageConfig.steps,
            cfgscale: imageConfig.cfgscale,
            sampler: imageConfig.sampler,
            scheduler: imageConfig.scheduler,
            loras: imageConfig.loras,
            loraweights: imageConfig.lora_weights,
        };
    }

    // Fallback to environment variables
    const width = preset === 'vertical'
        ? parseInt(getEnvVar('SWARMUI_VERTICAL_WIDTH') || '768')
        : parseInt(getEnvVar('SWARMUI_WIDTH') || '1344');
    const height = preset === 'vertical'
        ? parseInt(getEnvVar('SWARMUI_VERTICAL_HEIGHT') || '1344')
        : parseInt(getEnvVar('SWARMUI_HEIGHT') || '768');

    return {
        model: getEnvVar('SWARMUI_MODEL') || 'flux1-dev-fp8',
        width,
        height,
        steps: parseInt(getEnvVar('SWARMUI_STEPS') || '40'),
        cfgscale: parseFloat(getEnvVar('SWARMUI_CFG_SCALE') || '1'),
        sampler: getEnvVar('SWARMUI_SAMPLER') || 'euler',
        scheduler: getEnvVar('SWARMUI_SCHEDULER') || 'beta',
        loras: getEnvVar('SWARMUI_LORAS') || 'gargan',
        loraweights: getEnvVar('SWARMUI_LORA_WEIGHTS') || '1',
    };
}

/**
 * Clothing segment mapping for automatic segment tag generation.
 * When clothing_description contains these keywords, append corresponding segment tags.
 * Lower creativity (0.3-0.4) preserves original while cleaning artifacts.
 */
const CLOTHING_SEGMENT_MAP: Array<{
    keywords: string[];
    segment: string;
    creativity: number;
    description: string;
}> = [
    // === AEGIS TACTICAL SUIT (Sci-Fi) - Updated mesh/armor hybrid ===
    {
        keywords: ['aegis', 'tactical bodysuit', 'compression black tactical bodysuit'],
        segment: 'ultra-tight compression black tactical bodysuit semi-transparent mesh',
        creativity: 0.4,
        description: 'Aegis suit with mesh base layer and armor panels'
    },
    {
        keywords: ['molded armored bust panels', 'bust panels', 'armored bust'],
        segment: 'molded armored bust panels with blue LED underglow',
        creativity: 0.4,
        description: 'Cat-specific molded chest armor with LED lighting'
    },
    {
        keywords: ['molded chest armor plates', 'chest armor plates', 'chest plates'],
        segment: 'molded chest armor plates with blue LED underglow',
        creativity: 0.4,
        description: 'Daniel-specific molded chest armor with LED lighting'
    },
    {
        keywords: ['high collar', 'collar with front zipper', 'front zipper'],
        segment: 'high collar tactical bodysuit front zipper',
        creativity: 0.4,
        description: 'High collar with front zipper detail'
    },
    {
        keywords: ['forearm gauntlets', 'gauntlets with led', 'gauntlets with multicolor'],
        segment: 'forearm gauntlets with multicolor LED indicators',
        creativity: 0.4,
        description: 'Tech gauntlets with LED displays'
    },
    // === WRAITH HELMET STATES ===
    {
        keywords: ['helmet visor down', 'visor down', 'visor fully down', 'concealing face'],
        segment: 'matte black tactical helmet reflective black visor down',
        creativity: 0.4,
        description: 'Wraith helmet with reflective black visor fully down'
    },
    {
        keywords: ['helmet visor up', 'visor up', 'visor raised', 'visor retracted', 'exposing face'],
        segment: 'matte black tactical helmet visor raised',
        creativity: 0.4,
        description: 'Wraith helmet with visor raised exposing face'
    },
    {
        keywords: ['helmet off', 'helmet removed', 'helmet mag-locked', 'helmet at hip', 'without helmet'],
        segment: 'tactical helmet clipped to hip',
        creativity: 0.4,
        description: 'Wraith helmet carried at hip'
    },
    {
        keywords: ['hud active', 'hud display', 'holographic hud', 'targeting reticle'],
        segment: 'tactical helmet with glowing hud elements on visor',
        creativity: 0.4,
        description: 'Wraith helmet with active HUD display'
    },
    // === STANDARD CLOTHING ===
    {
        keywords: ['tank top', 'tank-top', 'sleeveless tank', 'crop tank'],
        segment: 'plain seamless tank top',
        creativity: 0.4,
        description: 'Reinforces clean seamless construction, removes unwanted seams/fasteners'
    },
    {
        keywords: ['halter', 'halter top', 'halterneck'],
        segment: 'halter top',
        creativity: 0.4,
        description: 'Clean halter neckline without artifacts'
    },
    {
        keywords: ['crop top', 'cropped top', 'midriff'],
        segment: 'crop top midriff',
        creativity: 0.4,
        description: 'Clean crop with exposed midriff'
    },
    {
        keywords: ['sports bra', 'athletic bra'],
        segment: 'sports bra',
        creativity: 0.4,
        description: 'Clean athletic top'
    },
    {
        keywords: ['tactical vest', 'plate carrier', 'body armor'],
        segment: 'tactical vest',
        creativity: 0.5,
        description: 'Tactical gear consistency'
    }
];

/**
 * Detect clothing items in description and generate corresponding segment tags.
 * @param clothingDescription - The character's clothing description from Episode Context
 * @returns Array of segment tags to append to prompt (before YOLO face segment)
 */
function generateClothingSegments(clothingDescription: string): string[] {
    if (!clothingDescription) return [];

    const lowerDesc = clothingDescription.toLowerCase();
    const segments: string[] = [];

    for (const mapping of CLOTHING_SEGMENT_MAP) {
        const matched = mapping.keywords.some(keyword => lowerDesc.includes(keyword));
        if (matched) {
            // Format: <segment:description,creativity,threshold>
            segments.push(`<segment:${mapping.segment},${mapping.creativity},0.5>`);
            console.log(`[ClothingSegment] Detected "${mapping.keywords.find(k => lowerDesc.includes(k))}" → adding ${mapping.segment} segment`);
        }
    }

    return segments;
}

/**
 * Extract clothing description for a character in a specific scene from Episode Context.
 * @param episodeContext - Parsed Episode Context object
 * @param sceneNumber - Scene number to look up
 * @param characterTrigger - Character's base_trigger to identify them
 * @returns Clothing description string or null
 */
function getCharacterClothingForScene(
    episodeContext: any,
    sceneNumber: number,
    characterTrigger: string
): string | null {
    try {
        const scene = episodeContext.episode?.scenes?.find(
            (s: any) => s.scene_number === sceneNumber
        );
        if (!scene) return null;

        // Check scene.characters
        const charFromScene = scene.characters?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromScene?.location_context?.clothing_description) {
            return charFromScene.location_context.clothing_description;
        }

        // Check scene.character_appearances
        const charFromAppearances = scene.character_appearances?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromAppearances?.location_context?.clothing_description) {
            return charFromAppearances.location_context.clothing_description;
        }

        return null;
    } catch (e) {
        console.warn('[ClothingSegment] Error extracting clothing:', e);
        return null;
    }
}

/**
 * Get swarmui_prompt_override for a character in a specific scene.
 * This contains the complete prompt with all segments from StoryTeller database.
 * @param episodeContext - Parsed episode context JSON
 * @param sceneNumber - Scene number to search in
 * @param characterTrigger - Character's LORA trigger (e.g., "JRUMLV")
 * @returns The full swarmui_prompt_override or null if not found
 */
function getCharacterOverrideForScene(
    episodeContext: any,
    sceneNumber: number,
    characterTrigger: string
): string | null {
    try {
        const scene = episodeContext.episode?.scenes?.find(
            (s: any) => s.scene_number === sceneNumber
        );
        if (!scene) return null;

        // Check scene.characters
        const charFromScene = scene.characters?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromScene?.location_context?.swarmui_prompt_override) {
            return charFromScene.location_context.swarmui_prompt_override;
        }

        // Check scene.character_appearances
        const charFromAppearances = scene.character_appearances?.find(
            (c: any) => c.base_trigger === characterTrigger
        );
        if (charFromAppearances?.location_context?.swarmui_prompt_override) {
            return charFromAppearances.location_context.swarmui_prompt_override;
        }

        return null;
    } catch (e) {
        console.warn('[SegmentExtraction] Error getting character override:', e);
        return null;
    }
}

/**
 * Extract all segment directives from a prompt string.
 * Segments are in format: <segment:description,weight1,weight2>
 * @param prompt - The prompt string containing segments
 * @returns Array of segment strings (e.g., ["<segment:bodysuit,0.4,0.5>", "<segment:helmet,0.4,0.5>"])
 */
function extractSegmentsFromPrompt(prompt: string): string[] {
    const segmentRegex = /<segment:[^>]+>/g;
    return prompt.match(segmentRegex) || [];
}

/**
 * Remove all segment directives from a prompt string.
 * Used to strip segments before re-adding database segments.
 * @param prompt - The prompt string potentially containing segments
 * @returns Prompt with all segments removed
 */
function stripSegmentsFromPrompt(prompt: string): string {
    return prompt.replace(/<segment:[^>]+>/g, '').trim();
}

/**
 * Apply segments from database override to Gemini's generated prompt.
 * Extracts segments from the original swarmui_prompt_override and appends them.
 * This ensures segments from StoryTeller database are always preserved.
 * @param geminiPrompt - The prompt generated by Gemini (may have segments stripped)
 * @param originalOverride - The swarmui_prompt_override from database (contains segments)
 * @returns Gemini prompt with database segments appended
 */
function applyDatabaseSegments(geminiPrompt: string, originalOverride: string | null): string {
    if (!originalOverride) return geminiPrompt;

    // Extract segments from the original database override
    const databaseSegments = extractSegmentsFromPrompt(originalOverride);
    if (databaseSegments.length === 0) return geminiPrompt;

    // Strip any segments Gemini may have generated (to avoid duplicates)
    const cleanedPrompt = stripSegmentsFromPrompt(geminiPrompt);

    // Append database segments at the end
    const result = `${cleanedPrompt} ${databaseSegments.join(' ')}`;

    console.log(`[SegmentInjection] Appended ${databaseSegments.length} segment(s) from database`);

    return result;
}

/**
 * Apply clothing segments to a prompt based on detected clothing items.
 * Inserts clothing segments BEFORE the YOLO face segment.
 * @deprecated Use applyDatabaseSegments() instead - segments should come from database
 * @param prompt - The generated prompt string
 * @param clothingDescription - Character's clothing description
 * @returns Modified prompt with clothing segments inserted
 */
function applyClothingSegmentsToPrompt(prompt: string, clothingDescription: string): string {
    const clothingSegments = generateClothingSegments(clothingDescription);
    if (clothingSegments.length === 0) return prompt;

    // Find the YOLO face segment position
    const yoloMatch = prompt.match(/<segment:yolo-face/);
    if (yoloMatch && yoloMatch.index !== undefined) {
        // Insert clothing segments before YOLO segment
        const beforeYolo = prompt.substring(0, yoloMatch.index);
        const yoloAndAfter = prompt.substring(yoloMatch.index);
        return `${beforeYolo}${clothingSegments.join(' ')} ${yoloAndAfter}`;
    }

    // No YOLO segment found, append clothing segments at end
    return `${prompt} ${clothingSegments.join(' ')}`;
}

// Response schema - only cinematic prompts are required for standard beat analysis (Phase C optimization)
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
        required: ['beatId', 'cinematic']
    }
};

/**
 * StorySwarm API Response Types
 */
interface StorySwarmPromptResponse {
    success: boolean;
    prompts: Array<{
        beatId: string;
        prompt: {
            positive: string;
            negative: string;
        };
        generation_metadata: {
            agents_consulted: string[];
            database_sources: {
                character?: string;
                location?: string;
            };
            continuity_notes: string;
            generation_time_ms?: number;
        };
    }>;
    stats: {
        beats_processed: number;
        generation_time_ms: number;
        cache_hits?: number;
    };
    error?: {
        message: string;
        failed_beats?: string[];
    };
}

/**
 * Generate prompts via StorySwarm multi-agent pipeline API
 * Implements V2 integration with automatic fallback to local generation
 *
 * @param analyzedEpisode - Episode with beats needing prompts
 * @param episodeContext - Episode context JSON
 * @param styleConfig - Image generation style configuration
 * @returns StorySwarm response with generated prompts
 * @throws Error if all retries exhausted
 */
export async function generatePromptsViaStorySwarm(
    analyzedEpisode: AnalyzedEpisode,
    episodeContext: string,
    styleConfig: EpisodeStyleConfig,
    onProgress?: (message: string) => void
): Promise<StorySwarmPromptResponse> {
    // Get StorySwarm API URL from environment
    const getEnvVar = (key: string): string | undefined => {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            return import.meta.env[key];
        }
        if (typeof process !== 'undefined' && process.env) {
            return (process.env as any)[key];
        }
        return undefined;
    };

    const apiUrl = getEnvVar('VITE_STORYSWARM_API_URL') ||
                   getEnvVar('STORYSWARM_API_URL') ||
                   'http://localhost:8050';

    const endpoint = `${apiUrl}/api/v1/visual-prompt/generate-batch`;

    // Parse episode context to get episode metadata
    let episodeNumber = 1;
    let episodeTitle = 'Unknown';
    let storyId: string | undefined;

    try {
        const context = JSON.parse(episodeContext);
        episodeNumber = context.episode?.episodeNumber || context.episode?.number || 1;
        episodeTitle = context.episode?.title || context.episode?.name || 'Unknown';
        storyId = context.story?.id || context.story?.story_id;
    } catch (e) {
        console.warn('[StorySwarm] Failed to parse episode context, using defaults');
    }

    // Build request payload
    const beats = analyzedEpisode.scenes.flatMap(scene =>
        scene.beats.map(beat => ({
            beatId: beat.beatId,
            sceneNumber: scene.sceneNumber,
            beatNumber: beat.beatNumber,
            scriptText: beat.scriptText,
            characters: beat.characters || [],
            locationId: beat.locationId || '',
            emotionalTone: beat.emotionalTone || '',
            visualElements: beat.visualElements || [],
            shotSuggestion: beat.shotSuggestion,
            cameraAngleSuggestion: beat.cameraAngleSuggestion
        }))
    );

    const requestPayload = {
        beats,
        episode_context: {
            episodeNumber,
            title: episodeTitle,
            storyId
        },
        style_config: {
            model: styleConfig.model || 'flux1-dev-fp8',
            cinematicAspectRatio: '16:9',
            steps: styleConfig.steps || 40,
            seed: styleConfig.seed
        }
    };

    console.log(`[StorySwarm] Calling API with ${beats.length} beats...`);
    onProgress?.(`Sending ${beats.length} beats to StorySwarm...`);

    // Retry logic with exponential backoff
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            onProgress?.(`Calling StorySwarm API (attempt ${attempt}/${maxRetries})...`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
            }

            const data: StorySwarmPromptResponse = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'StorySwarm returned success=false');
            }

            console.log(`[StorySwarm] Success! Generated ${data.stats.beats_processed} prompts in ${data.stats.generation_time_ms}ms`);
            onProgress?.(`Received ${data.stats.beats_processed} prompts from StorySwarm`);

            return data;

        } catch (error) {
            lastError = error as Error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if error is retryable
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                                  errorMessage.includes('network') ||
                                  errorMessage.includes('timeout') ||
                                  errorMessage.includes('aborted');

            const isServerError = errorMessage.includes('HTTP 5');

            if (!isNetworkError && !isServerError) {
                // Non-retryable error (e.g., 400 Bad Request, invalid response)
                console.error('[StorySwarm] Non-retryable error:', errorMessage);
                throw error;
            }

            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`[StorySwarm] Attempt ${attempt} failed: ${errorMessage}`);
                console.log(`[StorySwarm] Retrying in ${delay}ms...`);
                onProgress?.(`StorySwarm attempt ${attempt} failed, retrying in ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('[StorySwarm] All retries exhausted');
            }
        }
    }

    // All retries failed
    throw lastError || new Error('StorySwarm API call failed after all retries');
}

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
    // Support both Vite (import.meta.env) and Node.js (process.env) environments
    const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
                   (typeof import.meta !== 'undefined' && import.meta.env?.GEMINI_API_KEY) ||
                   process.env.VITE_GEMINI_API_KEY ||
                   process.env.GEMINI_API_KEY ||
                   process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is not configured in .env file. Please set it and restart the dev server.");
    }
    const ai = new GoogleGenAI({ apiKey });
    onProgress?.('✅ API key verified. Initializing prompt generation...');

    // SKILL.md Integration: Process episode through beatStateService for:
    // - Anti-monotony enforcement (Section 14)
    // - Carryover state tracking (Section 4.5)
    // - FLUX vocabulary validation (Section 5)
    // - Time of day lighting (Section 13)
    // - Character expression tells (Section 12)
    onProgress?.('Applying SKILL.md rules (anti-monotony, carryover, FLUX validation)...');
    console.log('[SKILL.md] Processing episode through beatStateService...');

    const processedResult = processEpisodeWithFullContext(analyzedEpisode);
    const processedEpisode = processedResult.episode;

    console.log(`[SKILL.md] Processed ${processedResult.stats.totalBeats} beats across ${processedResult.stats.scenesProcessed} scenes`);
    console.log(`[SKILL.md] Carryover applied: ${processedResult.stats.carryoverApplied} beats`);
    console.log(`[SKILL.md] Variety adjustments: ${processedResult.stats.varietyAdjustments} beats`);
    if (processedResult.warnings.length > 0) {
        console.warn(`[SKILL.md] Warnings: ${processedResult.warnings.join('; ')}`);
    }

    const beatsForPrompting = processedEpisode.scenes.flatMap(scene =>
        scene.beats.filter(beat => beat.imageDecision.type === 'NEW_IMAGE')
    );

    if (beatsForPrompting.length === 0) {
        return [];
    }

    onProgress?.(`Processing ${beatsForPrompting.length} NEW_IMAGE beats for prompt generation...`);
    console.log(`Processing ${beatsForPrompting.length} NEW_IMAGE beats for prompt generation`);

    // Extract image_config from Episode Context (Phase 4 enhancement)
    const imageConfig = extractImageConfig(episodeContextJson);
    const cinematicParams = getGenerationParams(imageConfig, 'cinematic');
    const verticalParams = getGenerationParams(imageConfig, 'vertical');

    if (imageConfig) {
        console.log(`[ImageConfig] Using database config: model=${imageConfig.model}, steps=${imageConfig.steps}, scheduler=${imageConfig.scheduler}`);
        console.log(`[ImageConfig] Cinematic: ${cinematicParams.width}x${cinematicParams.height}`);
        console.log(`[ImageConfig] Vertical: ${verticalParams.width}x${verticalParams.height}`);
    } else {
        console.log('[ImageConfig] No image_config in Episode Context, using environment/default values');
    }

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

    // Phase B Enhancement: Fetch story context for episode-wide intelligence
    // Token tracking: Track impact of story context on prompt size
    const tokenMetrics = {
        storyContextChars: 0,
        storyContextTokensEstimate: 0,
        baseSystemInstructionChars: 0,
        baseSystemInstructionTokensEstimate: 0,
        enhancedSystemInstructionChars: 0,
        enhancedSystemInstructionTokensEstimate: 0,
        deltaChars: 0,
        deltaTokensEstimate: 0,
        totalPromptChars: 0,
        totalPromptTokensEstimate: 0
    };

    let episodeContextSection = '';
    let storyContextAvailable = false;
    if (storyId) {
        try {
            onProgress?.('Fetching story context...');
            const storyContext = await getStoryContext(storyId);
            if (storyContext) {
                storyContextAvailable = true;
                const contextLength = storyContext.story_context.length + storyContext.narrative_tone.length + storyContext.core_themes.length;
                console.log(`[Phase B] Story context retrieved: ${contextLength} chars total`);

                // Camera Realism Principle: Story context is for internal use only
                // DO NOT inject narrative elements into prompts - they cause grain, noise, and illustration-like output
                console.log(`[Camera Realism] Story context available but NOT injected into prompts (narrative elements forbidden)`);

                episodeContextSection = `

**CAMERA REALISM PRINCIPLE (MANDATORY):**

> "The prompt generator is a camera, not a narrator."

A prompt must describe ONLY what a camera can directly observe. If a detail cannot be verified visually by a photographer at the moment of capture, it MUST NOT be in the prompt.

**Violation causes:** Grain, noise, loss of photorealism, illustration-like output.

**✅ ALLOWED in prompts:**
- Physical appearance (general, non-technical)
- Lighting conditions
- Pose
- Environment (visual elements only)
- Clothing (brief, non-symbolic)
- Camera framing
- Observable expressions (what face/body shows)

**❌ FORBIDDEN in prompts:**
- Psychology
- Backstory
- Symbolism
- Cultural analysis
- Narrative interpretation
- Moral/emotional explanation
- Internal character states
- What something "used to be" or "will become"
- Organizational affiliations (CDC, NHIA, etc.)

**IMPLICIT OVER EXPLICIT:**
| Concept | ✅ CORRECT | ❌ INCORRECT |
|---------|-----------|--------------|
| Emotion | "neutral expression, intense gaze" | "defiance visible in eyes" |
| Heritage | "warm brown skin, dark wavy hair" | "Cabocla heritage" |
| Importance | omit | "poster girl, secrets held within" |

`;

                // Track story context metrics
                tokenMetrics.storyContextChars = episodeContextSection.length;
                tokenMetrics.storyContextTokensEstimate = Math.ceil(episodeContextSection.length / 4); // ~4 chars per token

                onProgress?.('✅ Story context integrated into prompt generation');
                console.log(`[Phase B Token Tracking] Story context section: ${tokenMetrics.storyContextChars} chars (~${tokenMetrics.storyContextTokensEstimate} tokens)`);
            } else {
                console.log('[Phase B] Story context not available, proceeding without episode enhancement');
            }
        } catch (error) {
            console.warn('[Phase B] Failed to fetch story context, proceeding without enhancement:', error);
        }
    } else {
        console.log('[Phase B] No storyId provided, skipping story context enhancement');
    }

    // Create system instruction with context source information
    const systemInstructionLength = storyContextAvailable ? '[with episode context]' : '[without episode context]';
    console.log(`[Phase B] Building system instruction ${systemInstructionLength}`);

    // Build base system instruction (without episodeContextSection) for comparison
    const baseSystemInstructionStart = `You are a SwarmUI prompt generator. Generate clean, token-efficient prompts.`;

    // CLEAN PROMPT TEMPLATE (v4.0 - Parentheses Grouping)
    // Structure: [shot], TRIGGER (age, hair, eyes, build, clothing) [action], [expression], [location], [lighting] <segment>
    const systemInstruction = `You are a SwarmUI prompt generator. Generate clean, token-efficient prompts following this EXACT structure:

**PROMPT TEMPLATE (Parentheses Grouping):**
\`\`\`
[shot type], TRIGGER (age, hair, eyes, build, clothing) [action], [expression], [location], [lighting] <segment>
\`\`\`

**PARENTHESES RULE (CRITICAL):**
Parentheses group character attributes and prevent attribute bleed between characters.

| PARENTHESES (Character) | BODY (Scene) |
|-------------------------|--------------|
| Age | Location anchor elements |
| Hair | Lighting source |
| Eyes | Lighting quality |
| Build | Atmosphere/effects |
| Clothing | Environmental details |

**CRITICAL:** Never combine expression with age (e.g., "32 years old relaxed" is WRONG).
**CORRECT:** Separate them: \`(32 years old, ...) relaxed expression\`

${episodeContextSection}
**FIELD MAPPING (from Episode Context JSON):**

**CHARACTER VISUAL (UNIFIED APPROACH):**

FIRST, check for \`swarmui_prompt_override\`:
- Find in: \`character.location_context.swarmui_prompt_override\`
- If present and non-empty, this is the COMPLETE character visual prompt
- Contains: LoRA trigger, physical traits, clothing/gear, hair, accessories
- **WRAP IN PARENTHESES** after trigger: \`TRIGGER (override content)\`
- The override goes INSIDE parentheses, action/expression/location go OUTSIDE

ONLY if swarmui_prompt_override is empty/missing, build from individual fields:

1. **[TRIGGER]**: Character's \`base_trigger\` (e.g., "HSCEIA man", "JRUMLV woman")
   - Find in: \`episode.scenes[N].characters[].base_trigger\` or \`episode.characters[].base_trigger\`

2. **[AGE]**: Character age + "years old" (e.g., "35 years old")
   - Find in: \`character.location_context.age_at_context\` or derive from character description

3. **[PHYSICAL]**: Physical attributes from character (e.g., "with short cropped white hair, fit athletic build")
   - Find in: \`character.location_context.physical_description\` or \`character.visual_description\`

4. **[CLOTHING]**: Location-specific clothing (e.g., "wearing tactical vest over olive shirt")
   - Find in: \`character.location_context.clothing_description\`

5. **[ACTION]**: What the character is DOING in this beat
   - Extract from: \`beat.beat_script_text\` - identify the primary visual action
   - Examples: "examining data on a tablet", "speaking into a radio", "standing alert"

6. **[LOCATION]**: The scene's visual environment
   - Find in: \`episode.scenes[N].location.visual_description\` (REQUIRED)
   - **CRITICAL: Copy the visual_description text VERBATIM - do NOT summarize, paraphrase, or interpret**
   - This is professionally curated visual description - trust it exactly as written
   - Include relevant artifacts from \`episode.scenes[N].location.artifacts[].swarmui_prompt_fragment\`

7. **[LIGHTING]**: Lighting derived from beat context OR location atmosphere
   - FIRST: Check beat narrative for lighting cues (flickering monitors, emergency lights, etc.)
   - FALLBACK: Use \`episode.scenes[N].location.atmosphere\` lighting keywords
   - Examples: "harsh fluorescent lighting", "dim emergency lighting", "clinical white light"

8. **[ATMOSPHERE]**: Visual atmosphere from location
   - Find in: \`episode.scenes[N].location.atmosphere\`
   - Use ONLY camera-observable atmospheric effects (dust, haze, fog, steam)
   - DO NOT interpret mood or emotion - describe what the camera SEES

**YOLO SEGMENT (CRITICAL):**
- Single character: \`<segment:yolo-face_yolov9c.pt-0,0.35,0.5>\`
- Two characters: \`<segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>\`
- Index starts at 0, NOT 1
- NO segment for establishing shots (no faces to detect)

---

**PARENTHESES QUICK RULES:**

| Do | Don't |
|----|-------|
| \`TRIGGER (attributes)\` | \`TRIGGER (attributes,)\` ← trailing comma |
| Separate expression from age | \`32 years old relaxed\` ← combined |
| Use parentheses for dual scenes | Free-form attributes for two characters |
| Keep clothing INSIDE parens | Split clothing outside parens |
| Location/lighting OUTSIDE parens | Location inside character grouping |

**DUAL CHARACTER FORMAT (ESSENTIAL):**
\`\`\`
CHAR1 (attributes) on left and CHAR2 (attributes) on right, [interaction], [location], [lighting] <segments>
\`\`\`

Without parentheses in dual scenes, FLUX causes attribute bleed (woman gets white hair, man gets green eyes).

---

**CARRYOVER STATE (Beat Continuity):**

Some beats include a \`carryoverContext\` object with state carried from previous beats:

\`\`\`json
{
  "carryoverContext": {
    "hasCarryover": true,
    "action": "standing tall, examining monitor",
    "expression": "alert expression, eyes scanning",
    "sourcebeat": "s1-b2"
  }
}
\`\`\`

**How to use carryover:**
- If beat has NO \`characterPositioning\` but has \`carryoverContext.action\`, use the carryover action
- If beat has NO \`emotional_tone\` but has \`carryoverContext.expression\`, use the carryover expression
- This maintains visual continuity between beats (same pose/expression persists until explicitly changed)

**Example:**
- Beat s1-b1: "Cat standing at monitor" -> establishes pose
- Beat s1-b2: Dialogue only, no positioning -> use carryover "standing tall, examining monitor"
- Beat s1-b3: "Cat turns to face Daniel" -> new pose overrides carryover

**Variety Adjustments:**
If beat has \`carryoverContext.varietyAdjusted: true\`, the shot type in \`styleGuide.camera\` has been adjusted to prevent visual monotony. Trust this adjustment.

---

**FLUX-VALIDATED FIELDS:**

Some beats include pre-validated FLUX.1-Dev vocabulary fields:

- \`fluxExpression\`: Character-specific expression (e.g., "analytical gaze, intense focus" for Cat)
- \`fluxPose\`: FLUX-compliant pose description (e.g., "standing tall", "leaning against wall")

Use these fields DIRECTLY in your prompts when present - they are already validated against FLUX vocabulary.

---

**VISUAL GUIDANCE (Scene Context):**

Some beats include \`visualGuidance\` with scene-level context:

\`\`\`json
{
  "visualGuidance": {
    "isHookBeat": true,
    "isClimaxBeat": false,
    "isAdBreakBeat": false,
    "recommendedShotType": "close-up shot",
    "intensityLevel": "high"
  }
}
\`\`\`

**How to use visual guidance:**
- \`isHookBeat\`: Beat 1 of each scene - make visually striking for 3-second retention
- \`isClimaxBeat\`: Final beat of climax scene - dramatic, impactful framing
- \`isAdBreakBeat\`: Near 8-minute mark - medium framing, breath moment
- \`intensityLevel\`: "low", "medium", or "high" - affects expression intensity
- \`recommendedShotType\`: Scene-appropriate shot type (consider using if styleGuide.camera differs)

---

**ESTABLISHING SHOTS (No Character Present):**

Some beats are pure atmosphere/mood-setting with NO character action. Detect these by:
- No character names or pronouns in beat text
- Beat describes environment, silence, tension, or mood
- Beat is scene-opening or transition

**ESTABLISHING SHOT TEMPLATE:**
\`\`\`
[SHOT_TYPE] of [LOCATION], [ENVIRONMENTAL_DETAILS], [ARTIFACTS], [LIGHTING], [ATMOSPHERE], cinematic establishing shot
\`\`\`

**Field mapping for establishing shots:**
- **[SHOT_TYPE]**: "wide interior shot", "detail shot", "slow pan across"
- **[LOCATION]**: Copy VERBATIM from \`episode.scenes[N].location.visual_description\` - do NOT paraphrase
- **[ENVIRONMENTAL_DETAILS]**: Translate beat's sensory descriptions to VISUAL elements
- **[ARTIFACTS]**: ALL artifacts from \`location.artifacts[].swarmui_prompt_fragment\`
- **[LIGHTING]**: From beat cues or \`location.atmosphere\`
- **[ATMOSPHERE]**: Translate abstract mood to visual atmosphere

**SENSORY-TO-VISUAL TRANSLATION (for establishing shots):**
| Beat Describes | Translate To |
|----------------|--------------|
| "silence", "quiet" | "still air, motionless equipment, undisturbed dust" |
| "pressurized", "heavy" | "cramped tight space, low ceiling, close walls" |
| "thick air" | "visible dust particles suspended in air, hazy atmosphere" |
| "tension" | "harsh shadows, high contrast lighting, stark emptiness" |
| "cold/sterile" | "clinical white surfaces, sharp edges, antiseptic gleam" |

**ESTABLISHING SHOT EXAMPLE (No Character - No Parentheses):**

Beat: "The silence in the Mobile Medical Base was not empty; it was pressurized..."

Output:
\`\`\`
wide interior shot, cramped converted trailer, salvaged server racks, multiple monitors on reinforced walls, IV bags hanging motionless, modular storage bins, cables across floor, visible dust particles suspended, dim emergency LED strips, clinical blue glow
\`\`\`

**Note:** No parentheses needed - establishing shots have no character to group.
**No YOLO segment** - no faces in frame.

---

**CHARACTER SHOT EXAMPLE (Parentheses Grouping):**
\`\`\`
medium shot, HSCEIA man (35 years old, short cropped white hair, gray eyes, athletic build, tactical vest over olive shirt) examining tablet, neutral expression intense gaze, sterile corridor, server racks, blinking status lights, harsh fluorescent lighting, volumetric dust <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
\`\`\`

**Structure breakdown:**
- Shot type: \`medium shot,\`
- Trigger + Parens: \`HSCEIA man (35 years old, short cropped white hair, gray eyes, athletic build, tactical vest over olive shirt)\`
- Action: \`examining tablet,\`
- Expression: \`neutral expression intense gaze,\`
- Location (body): \`sterile corridor, server racks, blinking status lights,\`
- Lighting (body): \`harsh fluorescent lighting, volumetric dust\`
- Segment: \`<segment:...>\`

**DUAL CHARACTER EXAMPLE:**
\`\`\`
medium shot, HSCEIA man (35, white hair, gray eyes, tactical vest, rifle slung) on left and JRUMLV woman (28, tactical bun, green eyes, tactical vest) on right, professional distance, bombed server room, cold blue emergency glow <segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
\`\`\`

**RULES:**
1. NO character names (Cat, Daniel, etc.) - ONLY use base_trigger
2. NO location names (NHIA Facility 7, CDC, NHIA Facility 7, etc.) - use visual elements only
3. NO contradictory moods (cannot be "relaxed" AND "tense")
4. NO weighted syntax like (((term:1.5))) - use natural language
5. Keep prompts under 200 tokens
6. NO narrative elements (backstory, psychology, symbolism, "former", "what it used to be")
7. NO internal states ("haunted by loss", "analytical mind") - only observable expressions

---

**PROMPT COMPACTION (Token Efficiency):**

Apply these compaction strategies to reduce tokens without losing visual information:

**Prepositions to DROP:**
- \`of\`: "photo of a" → "photo," or omit entirely
- \`a/an\`: Articles rarely needed
- \`with\` (attributes): "woman with brown hair" → "woman, brown hair"
- \`in\` (environment): "standing in corridor" → "standing, corridor" (when context clear)

**Prepositions to KEEP (Critical for clarity):**
- \`on left/right\`: CRITICAL for dual character positioning
- \`at\` (gaze): "looking at viewer" needs it
- \`facing\`: Orientation marker
- \`over/under\`: Layering needs clarity ("vest over shirt")
- \`across/slung\`: Attachment position ("rifle slung across chest")
- \`from/through\`: Light direction ("light through broken ceiling")

**Compaction Strategies:**
- Use commas as implicit "with/and": "woman, brown hair, green eyes, athletic build"
- Use participles: "woman standing doorway" not "woman who is standing in the doorway"
- Compound adjectives: "tactical-bun hair" or just "tactical bun"
- FLUX knows it's generating an image - "photo of a" is optional

**Location Compaction Example:**
❌ VERBOSE (54 words): "in a former CDC satellite facility that was bombed during faction fighting, with collapsed ceiling panels hanging by wires..."
✅ COMPACT (12 words): "collapsed corridor, twisted rebar, shattered glass, flickering emergency lights, volumetric dust"

What was cut: "former", "CDC", "faction fighting" (narrative), redundant debris types, "tiled floors" (implied).
What remains: Everything the camera can see.

---

**TACTICAL GEAR (Database-Driven):**

Character gear (Aegis suits, helmets, loadouts) comes from \`swarmui_prompt_override\`.
The database provides complete, pre-assembled gear descriptions - use them directly.

**HELMET STATE DETECTION:**
- If \`swarmui_prompt_override\` contains helmet description, use it as-is
- The database already determines the correct helmet state based on scene context
- Only apply inference rules below if helmet state is ambiguous in the override

**HAIR SUPPRESSION RULE (CRITICAL - ZERO TOLERANCE):**
When generating a prompt for a character wearing ANY helmet state (visor up, visor down, HUD active):
- **NEVER include**: ponytail, hair color, hair style, flowing hair, hair texture, "brown hair", "white hair", "military-cut hair", "hair in ponytail", or ANY hair descriptors
- **The helmet physically covers the head** - hair is INVISIBLE in the image
- **FAIL CONDITION**: If your prompt mentions hair AND helmet, you have FAILED. Remove the hair descriptor.

**CORRECT EXAMPLES:**
- "JRUMLV woman in tactical mode, lean athletic build, wearing bodysuit with helmet visor down" (NO HAIR)
- "HSCEIA man field operative, muscular build, helmet with blue visor glow" (NO HAIR)

**INCORRECT EXAMPLES (DO NOT GENERATE):**
- "JRUMLV woman, dark brown hair in ponytail, wearing helmet visor down" (WRONG - hair visible through helmet is impossible)
- "HSCEIA man, stark white military-cut hair, helmet HUD active" (WRONG - hair is under the helmet)

**HELMET OFF only:** INCLUDE hair description (ponytail, hair color, style visible) because the character's head is uncovered.

**INFERENCE RULES (when beat doesn't specify):**
- Combat/breach scenes → Default to VISOR DOWN
- Speaking/dialogue scenes → Default to VISOR UP (need to see face for emotion)
- Investigation/scanning → Default to HUD ACTIVE
- Safe location/aftermath → Default to HELMET OFF

**HUD POV SHOTS (Special Case):**
If beat describes character SEEING something on HUD (readouts, targeting data, threat indicators):
- Use FIRST-PERSON POV shot looking OUT through the visor
- Template: \`first-person POV through Wraith helmet visor, holographic HUD overlay showing [data type], reflective black visor edges visible, [environment] visible through HUD display\`
- NO character visible - this is what they SEE
- NO YOLO segment (no face in frame)

---

**FLUX SETTINGS (apply to all prompts):**
- model: from Episode Style Config
- cfgscale: 1
- steps: from image_config or 40
- seed: -1

**OUTPUT FORMAT:**
Return JSON array: \`[{ "beatId": "s1-b1", "cinematic": { "prompt": "...", "model": "...", "width": ..., "height": ..., "steps": ..., "cfgscale": 1, "seed": -1 } }]\`

Context Source: ${contextSource}`;

    // Token tracking: Measure system instruction size impact
    // Calculate base system instruction size (without episode context section)
    const baseSystemInstructionWithoutContext = systemInstruction.replace(episodeContextSection, '');
    tokenMetrics.baseSystemInstructionChars = baseSystemInstructionWithoutContext.length;
    tokenMetrics.baseSystemInstructionTokensEstimate = Math.ceil(baseSystemInstructionWithoutContext.length / 4);

    // Calculate enhanced system instruction size (with episode context section)
    tokenMetrics.enhancedSystemInstructionChars = systemInstruction.length;
    tokenMetrics.enhancedSystemInstructionTokensEstimate = Math.ceil(systemInstruction.length / 4);

    // Calculate delta (impact of adding story context)
    tokenMetrics.deltaChars = tokenMetrics.enhancedSystemInstructionChars - tokenMetrics.baseSystemInstructionChars;
    tokenMetrics.deltaTokensEstimate = tokenMetrics.enhancedSystemInstructionTokensEstimate - tokenMetrics.baseSystemInstructionTokensEstimate;

    // Log system instruction metrics
    console.log('\n[Phase B Token Tracking] System Instruction Metrics:');
    console.log(`  Base (without story context): ${tokenMetrics.baseSystemInstructionChars} chars (~${tokenMetrics.baseSystemInstructionTokensEstimate} tokens)`);
    console.log(`  Enhanced (with story context): ${tokenMetrics.enhancedSystemInstructionChars} chars (~${tokenMetrics.enhancedSystemInstructionTokensEstimate} tokens)`);
    console.log(`  Delta (impact of story context): +${tokenMetrics.deltaChars} chars (+~${tokenMetrics.deltaTokensEstimate} tokens)`);
    if (storyContextAvailable) {
        const percentageIncrease = ((tokenMetrics.deltaChars / tokenMetrics.baseSystemInstructionChars) * 100).toFixed(1);
        console.log(`  Percentage increase: +${percentageIncrease}%`);
    }

    // Process beats in batches to avoid token limits
    const allResults: BeatPrompts[] = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        onProgress?.(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} beats)...`);
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} beats`);
        
        // DEV: Enhance beats with a dynamic, structured style guide for more contextual prompts.
        // Also includes carryover state and FLUX-validated fields from beatStateService
        const beatsWithStyleGuide = batch.map(beat => {
            const styleGuide = {
                camera: new Set<string>(),
                lighting: new Set<string>(),
                environmentFX: new Set<string>(),
                atmosphere: new Set<string>()
            };

            // Cast to FullyProcessedBeat to access FLUX-validated and carryover fields
            const beatWithState = beat as FullyProcessedBeat;

            // --- Camera (use FLUX-validated fields when available) ---
            // Priority: FLUX shot type > variety-adjusted > original suggestion
            if (beatWithState.fluxShotType) {
                styleGuide.camera.add(beatWithState.fluxShotType);
                // Add camera angle if not default eye-level
                if (beatWithState.fluxCameraAngle && beatWithState.fluxCameraAngle !== 'eye-level shot') {
                    styleGuide.camera.add(beatWithState.fluxCameraAngle);
                }
            } else {
                const effectiveCameraSuggestion = beatWithState.suggestedShotType || beat.cameraAngleSuggestion;
                if (effectiveCameraSuggestion) {
                    styleGuide.camera.add(effectiveCameraSuggestion);
                }
            }
            styleGuide.camera.add('shallow depth of field');
            // Add handheld feel for more dynamic scenes, could be based on a new 'energy' field in future.
            if (beat.beat_script_text.toLowerCase().includes('action') || beat.beat_script_text.toLowerCase().includes('runs')) {
                styleGuide.camera.add('handheld feel');
            }

            // --- Lighting (use FLUX lighting from time of day when available) ---
            if (beatWithState.fluxLighting && beatWithState.fluxLighting.length > 0) {
                beatWithState.fluxLighting.forEach(light => styleGuide.lighting.add(light));
            } else {
                styleGuide.lighting.add('dramatic rim light');
            }

            // --- Environment & Atmosphere ---
            styleGuide.environmentFX.add('desaturated color grade');
            if (beat.locationAttributes?.some(attr => ['ruined', 'dusty', 'debris'].includes(attr))) {
                styleGuide.environmentFX.add('volumetric dust');
            }
            if (beat.locationAttributes) {
                beat.locationAttributes.forEach(attr => styleGuide.atmosphere.add(attr));
            }

            // Build carryover context for the AI (SKILL.md Section 4.5)
            const carryoverContext: {
                hasCarryover: boolean;
                action?: string;
                expression?: string;
                sourcebeat?: string;
                varietyAdjusted?: boolean;
            } = {
                hasCarryover: !!(beatWithState.carryoverAction || beatWithState.carryoverExpression)
            };

            if (beatWithState.carryoverAction) {
                carryoverContext.action = beatWithState.carryoverAction;
            }
            if (beatWithState.carryoverExpression) {
                carryoverContext.expression = beatWithState.carryoverExpression;
            }
            if (beatWithState.carryoverSourceBeatId) {
                carryoverContext.sourcebeat = beatWithState.carryoverSourceBeatId;
            }
            if (beatWithState.varietyApplied) {
                carryoverContext.varietyAdjusted = true;
                console.log(`[PromptGen] Beat ${beat.beatId}: Using variety-adjusted shot type "${beatWithState.suggestedShotType}"`);
            }

            // Build visual guidance context (from sceneContextService)
            const visualGuidance = beatWithState.beatVisualGuidance ? {
                isHookBeat: beatWithState.beatVisualGuidance.isHookBeat,
                isClimaxBeat: beatWithState.beatVisualGuidance.isClimaxBeat,
                isAdBreakBeat: beatWithState.beatVisualGuidance.isAdBreakBeat,
                recommendedShotType: beatWithState.beatVisualGuidance.recommendedShotType,
                intensityLevel: beatWithState.beatVisualGuidance.intensityLevel,
            } : undefined;

            return {
                ...beat,
                styleGuide: {
                    camera: Array.from(styleGuide.camera).join(', '),
                    lighting: Array.from(styleGuide.lighting).join(', '),
                    environmentFX: Array.from(styleGuide.environmentFX).join(', '),
                    atmosphere: Array.from(styleGuide.atmosphere).join(', '),
                },
                // FLUX-validated expression (from characterExpressionService)
                fluxExpression: beatWithState.fluxExpression || undefined,
                // FLUX-validated pose (from beatStateService)
                fluxPose: beatWithState.fluxPose || undefined,
                // Include carryover context for the AI to use
                carryoverContext: carryoverContext.hasCarryover ? carryoverContext : undefined,
                // Include visual guidance for hook/climax emphasis
                visualGuidance,
            };
        });

        try {
            // Token tracking: Measure total prompt size for this batch
            const batchContents = `Generate SwarmUI prompts for the following beat analyses, using the provided Episode Context for character details and the Style Config for aesthetic guidance.\n\n---BEAT ANALYSES---\n${JSON.stringify(beatsWithStyleGuide, null, 2)}\n\n---EPISODE CONTEXT JSON (Source: ${contextSource})---\n${enhancedContextJson}\n\n---EPISODE STYLE CONFIG---\n${JSON.stringify({ ...styleConfig, cinematicWidth, cinematicHeight }, null, 2)}`;

            const batchPromptChars = batchContents.length + systemInstruction.length;
            const batchPromptTokensEstimate = Math.ceil(batchPromptChars / 4);

            console.log(`\n[Phase B Token Tracking] Batch ${batchIndex + 1} Total Prompt Size:`);
            console.log(`  Contents: ${batchContents.length} chars (~${Math.ceil(batchContents.length / 4)} tokens)`);
            console.log(`  System Instruction: ${systemInstruction.length} chars (~${Math.ceil(systemInstruction.length / 4)} tokens)`);
            console.log(`  Total: ${batchPromptChars} chars (~${batchPromptTokensEstimate} tokens)`);

            // Track for final summary (only track first batch for representative metrics)
            if (batchIndex === 0) {
                tokenMetrics.totalPromptChars = batchPromptChars;
                tokenMetrics.totalPromptTokensEstimate = batchPromptTokensEstimate;
            }

            // Retry logic for network failures
            let response;
            let lastError;
            const maxRetries = 3;
            const baseDelay = 2000; // 2 seconds

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    onProgress?.(`Sending batch ${batchIndex + 1} to Gemini API (model: ${getGeminiModel()}, temp: ${getGeminiTemperature()}) - attempt ${attempt}/${maxRetries}...`);

                    response = await ai.models.generateContent({
                        model: getGeminiModel(),
                        contents: batchContents,
                        config: {
                            systemInstruction,
                            responseMimeType: 'application/json',
                            responseSchema: responseSchema,
                            temperature: getGeminiTemperature(),
                        },
                    });

                    // Success - break retry loop
                    break;

                } catch (error) {
                    lastError = error;
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    console.error(`[Retry ${attempt}/${maxRetries}] Batch ${batchIndex + 1} failed: ${errorMessage}`);

                    // Check if this is a retryable error
                    const isNetworkError = errorMessage.includes('Failed to fetch') ||
                                          errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                                          errorMessage.includes('network') ||
                                          errorMessage.includes('timeout') ||
                                          errorMessage.includes('ECONNRESET');

                    if (!isNetworkError) {
                        // Non-retryable error (API key, quota, etc.) - fail immediately
                        console.error(`Non-retryable error detected. Not retrying.`);
                        throw error;
                    }

                    if (attempt < maxRetries) {
                        // Calculate exponential backoff delay
                        const delay = baseDelay * Math.pow(2, attempt - 1);
                        console.log(`Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
                        onProgress?.(`Network error. Retrying in ${delay / 1000} seconds... (${attempt}/${maxRetries})`);

                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Final attempt failed
                        console.error(`All ${maxRetries} attempts failed for batch ${batchIndex + 1}`);
                        throw new Error(`Network error after ${maxRetries} attempts: ${errorMessage}`);
                    }
                }
            }

            if (!response) {
                throw new Error(`Failed to get response after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
            }

            onProgress?.(`Processing Gemini response for batch ${batchIndex + 1}...`);
            const jsonString = response.text.trim();
            const batchResult = JSON.parse(jsonString) as any[];
            
            // Post-process: Ensure correct steps and FLUX-specific parameters (Phase C optimization)
            // Now uses image_config from Episode Context when available (Phase 4 enhancement)
            const correctedBatch = batchResult.map(bp => {
                // Ensure cinematic has correct values from image_config
                const correctedCinematic = {
                    ...bp.cinematic,
                    width: cinematicParams.width,
                    height: cinematicParams.height,
                    steps: cinematicParams.steps,
                    cfgscale: cinematicParams.cfgscale,
                    model: cinematicParams.model,
                };

                // Handle optional vertical prompt (now optional in Phase C)
                const correctedVertical = bp.vertical ? {
                    ...bp.vertical,
                    width: verticalParams.width,
                    height: verticalParams.height,
                    steps: verticalParams.steps,
                    cfgscale: verticalParams.cfgscale,
                    model: verticalParams.model,
                } : undefined;

                // Handle optional marketing vertical prompt (now optional in Phase C)
                const correctedMarketingVertical = bp.marketingVertical ? {
                    ...bp.marketingVertical,
                    width: verticalParams.width,
                    height: verticalParams.height,
                    steps: verticalParams.steps,
                    cfgscale: verticalParams.cfgscale,
                    model: verticalParams.model,
                } : undefined;

                const corrected: BeatPrompts = {
                    beatId: bp.beatId,
                    cinematic: correctedCinematic,
                    vertical: correctedVertical,
                    marketingVertical: correctedMarketingVertical,
                };

                // Log if values were corrected from AI response to image_config values
                const expectedSteps = cinematicParams.steps;
                const expectedCfgScale = cinematicParams.cfgscale;
                if (bp.cinematic?.steps !== expectedSteps || bp.cinematic?.cfgscale !== expectedCfgScale ||
                    (bp.vertical && (bp.vertical?.steps !== expectedSteps || bp.vertical?.cfgscale !== expectedCfgScale)) ||
                    (bp.marketingVertical && (bp.marketingVertical?.steps !== expectedSteps || bp.marketingVertical?.cfgscale !== expectedCfgScale))) {
                    console.log(`⚠️ Corrected steps/CFG for beat ${bp.beatId} to image_config values:`);
                    if (bp.cinematic?.steps !== expectedSteps || bp.cinematic?.cfgscale !== expectedCfgScale) {
                        console.log(`   Cinematic: steps ${bp.cinematic?.steps || 'missing'}→${expectedSteps}, cfgscale ${bp.cinematic?.cfgscale || 'missing'}→${expectedCfgScale}`);
                    }
                    if (bp.vertical && (bp.vertical?.steps !== expectedSteps || bp.vertical?.cfgscale !== expectedCfgScale)) {
                        console.log(`   Vertical: steps ${bp.vertical?.steps || 'missing'}→${expectedSteps}, cfgscale ${bp.vertical?.cfgscale || 'missing'}→${expectedCfgScale}`);
                    }
                    if (bp.marketingVertical && (bp.marketingVertical?.steps !== expectedSteps || bp.marketingVertical?.cfgscale !== expectedCfgScale)) {
                        console.log(`   Marketing Vertical: steps ${bp.marketingVertical?.steps || 'missing'}→${expectedSteps}, cfgscale ${bp.marketingVertical?.cfgscale || 'missing'}→${expectedCfgScale}`);
                    }
                }

                return corrected;
            });
            
            allResults.push(...correctedBatch);
            
            onProgress?.(`✅ Batch ${batchIndex + 1} completed: ${correctedBatch.length} prompts generated`);
            console.log(`Batch ${batchIndex + 1} completed: ${correctedBatch.length} prompts generated`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error processing batch ${batchIndex + 1}:`, error);

            // Save progress before failing
            console.log(`\n⚠️ PARTIAL PROGRESS: ${allResults.length} prompts generated successfully before failure`);
            console.log(`   Completed batches: ${batchIndex} of ${batches.length}`);
            console.log(`   Failed at batch: ${batchIndex + 1}`);

            // Provide helpful error guidance
            if (errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                errorMessage.includes('network')) {
                throw new Error(
                    `Network error at batch ${batchIndex + 1} of ${batches.length}. ` +
                    `${allResults.length} prompts generated successfully. ` +
                    `Possible causes: DNS resolution failure, network connectivity issue, or Gemini API outage. ` +
                    `Try: (1) Check network connection, (2) Verify DNS resolution for generativelanguage.googleapis.com, ` +
                    `(3) Retry analysis to resume from this point.`
                );
            } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
                throw new Error(
                    `API quota exceeded at batch ${batchIndex + 1} of ${batches.length}. ` +
                    `${allResults.length} prompts generated successfully. ` +
                    `Wait a few minutes and retry to resume.`
                );
            } else {
                throw new Error(
                    `Failed to generate prompts for batch ${batchIndex + 1} of ${batches.length}. ` +
                    `${allResults.length} prompts generated successfully. ` +
                    `Error: ${errorMessage}`
                );
            }
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

                // Step 1: Apply LORA trigger substitution
                let processedCinematic = applyLoraTriggerSubstitution(bp.cinematic.prompt, characterContexts);

                // Step 2: Apply segments from database override (replaces hardcoded segment map)
                // Segments are stored in swarmui_prompt_override from StoryTeller database
                const sceneMatch = bp.beatId.match(/s(\d+)-/);
                const sceneNumber = sceneMatch ? parseInt(sceneMatch[1]) : null;

                if (sceneNumber) {
                    // Find which character's trigger appears in this prompt and get their override
                    for (const charCtx of characterContexts) {
                        if (processedCinematic.includes(charCtx.base_trigger)) {
                            const originalOverride = getCharacterOverrideForScene(
                                contextObj,
                                sceneNumber,
                                charCtx.base_trigger
                            );
                            if (originalOverride) {
                                const beforeSegments = processedCinematic;
                                processedCinematic = applyDatabaseSegments(processedCinematic, originalOverride);
                                if (beforeSegments !== processedCinematic) {
                                    console.log(`[Segments] Database segments applied for ${charCtx.character_name} in beat ${bp.beatId}`);
                                }
                            }
                            break; // Only apply for first matched character (primary subject)
                        }
                    }
                }

                // Step 3: Hair suppression enforcement (belt-and-suspenders)
                // If helmet segment present, strip any hair descriptions Gemini may have included
                if (processedCinematic.includes('<segment:helmet') || processedCinematic.includes('helmet visor')) {
                    const beforeHairStrip = processedCinematic;
                    // Remove common hair descriptions
                    processedCinematic = processedCinematic
                        .replace(/,?\s*dark brown hair in (?:practical )?ponytail/gi, '')
                        .replace(/,?\s*stark white military-cut hair/gi, '')
                        .replace(/,?\s*white hair/gi, '')
                        .replace(/,?\s*brown hair/gi, '')
                        .replace(/,?\s*hair in (?:low )?ponytail/gi, '')
                        .replace(/,?\s*flowing hair/gi, '')
                        .replace(/,?\s*hair visible/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (beforeHairStrip !== processedCinematic) {
                        console.log(`[HairSuppression] Stripped hair description for helmet-on beat ${bp.beatId}`);
                    }
                }

                // Log if any processing occurred
                if (originalCinematic !== processedCinematic) {
                    console.log(`[PostProcess] Applied for beat ${bp.beatId}`);
                    console.log(`   Final: "${processedCinematic.substring(0, 120)}..."`);
                } else {
                    console.warn(`[PostProcess] No changes for beat ${bp.beatId}`);
                }

                return {
                    ...bp,
                    cinematic: {
                        ...bp.cinematic,
                        prompt: processedCinematic,
                    }
                };
            });

            // Token tracking: Final summary
            console.log('\n╔═══════════════════════════════════════════════════════════════╗');
            console.log('║     [Phase B Token Tracking] FINAL SUMMARY                    ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('\n📊 Story Context Impact:');
            console.log(`   Story context section: ${tokenMetrics.storyContextChars} chars (~${tokenMetrics.storyContextTokensEstimate} tokens)`);
            console.log('\n📊 System Instruction:');
            console.log(`   Base (without story context): ${tokenMetrics.baseSystemInstructionChars} chars (~${tokenMetrics.baseSystemInstructionTokensEstimate} tokens)`);
            console.log(`   Enhanced (with story context): ${tokenMetrics.enhancedSystemInstructionChars} chars (~${tokenMetrics.enhancedSystemInstructionTokensEstimate} tokens)`);
            console.log(`   Delta: +${tokenMetrics.deltaChars} chars (+~${tokenMetrics.deltaTokensEstimate} tokens)`);
            if (storyContextAvailable) {
                const percentageIncrease = ((tokenMetrics.deltaChars / tokenMetrics.baseSystemInstructionChars) * 100).toFixed(1);
                console.log(`   Percentage increase: +${percentageIncrease}%`);
            }
            console.log('\n📊 Total Prompt (Batch 1 representative):');
            console.log(`   Total: ${tokenMetrics.totalPromptChars} chars (~${tokenMetrics.totalPromptTokensEstimate} tokens)`);
            console.log('\n✅ Prompt generation complete!');
            console.log('═══════════════════════════════════════════════════════════════\n');

            onProgress?.(`✅ Prompt generation complete! Generated ${finalResults.length} prompt pairs.`);
            return finalResults;
        } else {
            // Token tracking: Final summary (no story context case)
            console.log('\n╔═══════════════════════════════════════════════════════════════╗');
            console.log('║     [Phase B Token Tracking] FINAL SUMMARY                    ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝');
            console.log('\n⚠️  No story context available for this generation');
            console.log('\n📊 System Instruction:');
            console.log(`   Base: ${tokenMetrics.baseSystemInstructionChars} chars (~${tokenMetrics.baseSystemInstructionTokensEstimate} tokens)`);
            console.log('\n📊 Total Prompt (Batch 1 representative):');
            console.log(`   Total: ${tokenMetrics.totalPromptChars} chars (~${tokenMetrics.totalPromptTokensEstimate} tokens)`);
            console.log('\n✅ Prompt generation complete (without story context enhancement)');
            console.log('═══════════════════════════════════════════════════════════════\n');

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