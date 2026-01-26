// services/pipelineService.ts
// Pipeline Orchestrator Service for SwarmUI to DaVinci Pipeline
// Orchestrates complete pipeline: Redis → SwarmUI → DaVinci

import type {
  BeatPrompt,
  PipelineResult,
  BeatPipelineResult,
  AnalyzedEpisode,
  BeatAnalysis,
  SwarmUIPrompt,
  ImageGenerationResult,
  OrganizationResult,
  EnhancedImagePath,
  ImageMetadata,
} from '../types';

import { getSessionByTimestamp, getLatestSession } from './redisService';
import { initializeSession, generateImages, getQueueStatus, getGenerationStatistics, createSwarmUIPreset } from './swarmUIService';
import { normalizeImagePath, enhanceImagePathsWithMetadata } from './imagePathTracker';
import { createEpisodeProject, organizeSwarmUIImages } from './davinciProjectService';
import { createImageReviewSession, BeatGenerationResult } from './storyTellerService';

/**
 * Progress callback type for pipeline operations
 */
export type ProgressCallback = (progress: {
  currentStep: number;
  totalSteps: number;
  currentStepName: string;
  progress: number;
  estimatedTimeRemaining?: number;
}) => void;

/**
 * Cancellation token for pipeline operations
 */
export class CancellationToken {
  private cancelled = false;
  private reason?: string;

  cancel(reason?: string): void {
    this.cancelled = true;
    this.reason = reason;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  getReason(): string | undefined {
    return this.reason;
  }
}

/**
 * Fetch prompts from Redis session for image generation.
 * 
 * Extracts prompts from analyzed episode data, filters only beats with NEW_IMAGE decisions,
 * and returns an array of BeatPrompt objects ready for image generation.
 * 
 * @param sessionTimestamp - The session timestamp to fetch prompts from
 * @returns Promise that resolves to array of BeatPrompt objects
 * @throws Error if session not found or episode data is missing
 * 
 * @example
 * ```typescript
 * const prompts = await fetchPromptsFromRedis(1234567890);
 * // Returns: [{ beatId: 's1-b1', sceneNumber: 1, format: 'cinematic', prompt: {...}, ... }]
 * ```
 */
export async function fetchPromptsFromRedis(
  sessionTimestamp: number
): Promise<BeatPrompt[]> {
  // Fetch session data from Redis
  const sessionResponse = await getSessionByTimestamp(sessionTimestamp);
  
  if (!sessionResponse.success || !sessionResponse.data) {
    const errorMsg = sessionResponse.error || 'Unknown error';
    throw new Error(
      `Failed to fetch session ${sessionTimestamp} from Redis.\n\n` +
      `Error: ${errorMsg}\n\n` +
      `Troubleshooting:\n` +
      `1. Verify session was saved successfully\n` +
      `2. Check Redis API is accessible\n` +
      `3. Try re-analyzing the episode to create a new session`
    );
  }

  const sessionData = sessionResponse.data;
  const analyzedEpisode: AnalyzedEpisode = sessionData.analyzedEpisode;

  if (!analyzedEpisode || !analyzedEpisode.scenes) {
    throw new Error('No analyzed episode data found in session');
  }

  const prompts: BeatPrompt[] = [];

  console.log(`[Pipeline] ========== EXTRACTING PROMPTS FROM SESSION ==========`);
  console.log(`[Pipeline] Episode: ${analyzedEpisode.episodeNumber} - ${analyzedEpisode.title}`);
  console.log(`[Pipeline] Total scenes: ${analyzedEpisode.scenes.length}`);

  // Iterate through scenes and beats
  for (const scene of analyzedEpisode.scenes) {
    if (!scene.beats) continue;

    console.log(`[Pipeline] --- Scene ${scene.sceneNumber}: ${scene.title} (${scene.beats.length} beats) ---`);

    for (const beat of scene.beats) {
      // Filter only NEW_IMAGE beats
      if (beat.imageDecision?.type !== 'NEW_IMAGE') {
        console.log(`[Pipeline]   Beat ${beat.beatId}: SKIP (decision: ${beat.imageDecision?.type || 'none'})`);
        continue;
      }

      // Check if prompts exist
      if (!beat.prompts) {
        console.warn(
          `[Pipeline] Beat ${beat.beatId} (Scene ${scene.sceneNumber}) has NEW_IMAGE decision but no prompts. Skipping.\n` +
          `  Suggestion: Regenerate prompts for this beat to create image generation prompts.`
        );
        continue;
      }

      // Add cinematic prompt if available
      if (beat.prompts.cinematic) {
        const promptText = beat.prompts.cinematic.prompt;
        console.log(`[Pipeline]   Beat ${beat.beatId}: NEW_IMAGE (cinematic)`);
        console.log(`[Pipeline]     Prompt preview: "${promptText.substring(0, 150)}..."`);
        console.log(`[Pipeline]     Full prompt length: ${promptText.length} chars`);

        prompts.push({
          beatId: beat.beatId,
          sceneNumber: scene.sceneNumber,
          format: 'cinematic',
          prompt: beat.prompts.cinematic,
          beat_script_text: beat.beat_script_text || '',
        });
      }

      // Add vertical prompt if available
      if (beat.prompts.vertical) {
        const promptText = beat.prompts.vertical.prompt;
        console.log(`[Pipeline]   Beat ${beat.beatId}: NEW_IMAGE (vertical)`);
        console.log(`[Pipeline]     Prompt preview: "${promptText.substring(0, 150)}..."`);

        prompts.push({
          beatId: beat.beatId,
          sceneNumber: scene.sceneNumber,
          format: 'vertical',
          prompt: beat.prompts.vertical,
          beat_script_text: beat.beat_script_text || '',
        });
      }
    }
  }

  console.log(`[Pipeline] ========== TOTAL PROMPTS EXTRACTED: ${prompts.length} ==========`);

  // DEBUG: Search for specific keywords to help debug prompt issues
  const halterPrompts = prompts.filter(p => p.prompt.prompt.toLowerCase().includes('halter'));
  if (halterPrompts.length > 0) {
    console.log(`[Pipeline] ✅ Found ${halterPrompts.length} prompts containing "halter":`);
    halterPrompts.forEach(p => {
      console.log(`[Pipeline]   - Beat ${p.beatId}: "...${p.prompt.prompt.substring(0, 100)}..."`);
    });
  } else {
    console.warn(`[Pipeline] ⚠️ NO prompts contain "halter" - this might indicate wrong data!`);
  }

  return prompts;
}

/**
 * Generate images from prompts using SwarmUI
 * 
 * Initializes SwarmUI session, processes prompts sequentially with rate limiting,
 * tracks progress, handles errors per prompt, supports cancellation and time estimation
 * 
 * @param prompts - Array of beat prompts to generate
 * @param progressCallback - Optional callback for progress updates
 * @param cancellationToken - Optional cancellation token to stop processing
 * @returns Promise that resolves to array of generation results
 */
export async function generateImagesFromPrompts(
  prompts: BeatPrompt[],
  progressCallback?: ProgressCallback,
  cancellationToken?: CancellationToken
): Promise<ImageGenerationResult[]> {
  if (prompts.length === 0) {
    return [];
  }

  const results: ImageGenerationResult[] = [];
  const generationStartDate = new Date();
  const generationTimes: number[] = []; // Track generation times for estimation

  // Get initial statistics for time estimation (will be called after session init)
  let averageGenerationTime = 0;
  let queueLength = 0;

  // Initialize SwarmUI session
  progressCallback?.({
    currentStep: 0,
    totalSteps: prompts.length + 1,
    currentStepName: 'Initializing SwarmUI session...',
    progress: 0,
  });

  let sessionId: string;
  console.log('[Pipeline] Initializing SwarmUI session...');
  console.log('[Pipeline] About to call initializeSession() from swarmUIService');
  try {
    sessionId = await initializeSession();
    console.log(`[Pipeline] ✅ SwarmUI session initialized successfully: ${sessionId.substring(0, 20)}...`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pipeline] ❌ Failed to initialize SwarmUI session:', errorMsg);
    console.error('[Pipeline] Full error:', error);
    throw new Error(
      `Failed to initialize SwarmUI session.\n\n` +
      `${errorMsg}\n\n` +
      `This prevents image generation. Please resolve the SwarmUI connection issue before continuing.`
    );
  }

  // Check for cancellation
  if (cancellationToken?.isCancelled()) {
    throw new Error(`Operation cancelled: ${cancellationToken.getReason() || 'User cancelled'}`);
  }

  // OPTIMIZATION: Create/ensure presets exist for faster generation
  // Get preset name from environment or use defaults
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

  const presetName = getEnvVar('SWARMUI_PRESET') || getEnvVar('VITE_SWARMUI_PRESET');
  const usePresets = presetName !== undefined && presetName !== '';

  if (usePresets) {
    console.log(`[Pipeline] 🚀 Using preset optimization: ${presetName}`);
    // Preset should already exist in SwarmUI, but we'll try to ensure it exists
    // This is a no-op if preset already exists (SwarmUI handles it)
    try {
      await createSwarmUIPreset(presetName, sessionId);
    } catch (error) {
      console.warn(`[Pipeline] Could not ensure preset exists, continuing anyway:`, error);
    }
  } else {
    console.log('[Pipeline] No preset configured, using full parameter mode');
  }

  // Get initial statistics for time estimation (now that we have sessionId)
  // Note: GetStats endpoint may not be available in all SwarmUI versions - this is optional
  try {
    const stats = await getGenerationStatistics(sessionId);
    averageGenerationTime = stats.average_generation_time || 0; // milliseconds
    
    const queueStatus = await getQueueStatus(sessionId);
    queueLength = queueStatus.queue_length || 0;
    console.log(`[Pipeline] Queue status: ${queueLength} items, avg time: ${averageGenerationTime}ms`);
  } catch (error) {
    // If endpoints not available, we'll track our own times
    // This is expected if SwarmUI version doesn't support GetStats endpoint
    console.log('[Pipeline] SwarmUI statistics endpoints not available, will track generation times locally');
  }

  // Process prompts sequentially
  for (let i = 0; i < prompts.length; i++) {
    // Check for cancellation before each prompt
    if (cancellationToken?.isCancelled()) {
      console.log(`Processing cancelled at prompt ${i + 1} of ${prompts.length}`);
      break; // Stop processing but return partial results
    }

    const prompt = prompts[i];
    const currentStep = i + 1;
    const promptStartTime = Date.now();

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (averageGenerationTime > 0 || generationTimes.length > 0) {
      // Use tracked average if we have local data, otherwise use SwarmUI stats
      const avgTime = generationTimes.length > 0
        ? generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length
        : averageGenerationTime;
      
      const remainingPrompts = prompts.length - i;
      const queueWaitTime = queueLength > 0 ? queueLength * avgTime : 0;
      estimatedTimeRemaining = (remainingPrompts * avgTime) + queueWaitTime;
    }

    progressCallback?.({
      currentStep: currentStep,
      totalSteps: prompts.length + 1,
      currentStepName: `Generating image ${currentStep} of ${prompts.length}...`,
      progress: Math.round((currentStep / (prompts.length + 1)) * 100),
      estimatedTimeRemaining,
    });

    try {
      // Generate images (default: 3 images per prompt)
      console.log(`[Pipeline] ========== GENERATING IMAGE ${i + 1}/${prompts.length} ==========`);
      console.log(`[Pipeline] Beat: ${prompt.beatId} (Scene ${prompt.sceneNumber}, Format: ${prompt.format})`);
      console.log(`[Pipeline] FULL PROMPT TEXT:`);
      console.log(`[Pipeline] >>> ${prompt.prompt.prompt} <<<`);
      console.log(`[Pipeline] Prompt length: ${prompt.prompt.prompt.length} chars`);
      
      // Use parameters from prompt (populated from Episode Context image_config)
      // Fallback to hardcoded defaults only if prompt doesn't have the values
      // Priority: prompt values (from image_config) > format-specific defaults > hardcoded defaults
      const generationOptions: any = {
        // Use prompt values as primary source (now populated from Episode Context image_config)
        width: prompt.prompt.width || (prompt.format === 'vertical' ? 768 : 1344),
        height: prompt.prompt.height || (prompt.format === 'vertical' ? 1344 : 768),
        steps: prompt.prompt.steps || 40,
        cfgscale: prompt.prompt.cfgscale !== undefined ? prompt.prompt.cfgscale : 1,
        sampler: prompt.prompt.sampler || 'euler',
        scheduler: prompt.prompt.scheduler || 'beta', // Default to 'beta' (from image_config default)
        automaticvae: true,
        loras: prompt.prompt.loras || 'gargan',
        loraweights: prompt.prompt.loraweights || '1',
      };

      // Set model if available from prompt
      if (prompt.prompt.model) {
        generationOptions.model = prompt.prompt.model;
      }

      console.log(`[Pipeline] Using image_config values: ${generationOptions.width}x${generationOptions.height}, ` +
        `steps=${generationOptions.steps}, cfgscale=${generationOptions.cfgscale}, scheduler=${generationOptions.scheduler}`);
      
      const result = await generateImages(
        prompt.prompt.prompt,
        3, // imagesCount
        sessionId,
        3, // maxRetries
        generationOptions
      );

      // Track generation time
      const generationTime = Date.now() - promptStartTime;
      generationTimes.push(generationTime);

      // Update average if we have enough samples
      if (generationTimes.length >= 3) {
        averageGenerationTime = generationTimes.slice(-10).reduce((a, b) => a + b, 0) / Math.min(generationTimes.length, 10);
      }

      // Add metadata about the beat
      if (result.success && result.metadata) {
        result.metadata.prompt = prompt.prompt.prompt;
      }

      results.push(result);
    } catch (error) {
      // Track time even for errors
      const generationTime = Date.now() - promptStartTime;
      generationTimes.push(generationTime);

      // Create error result
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          prompt: prompt.prompt.prompt,
          model: prompt.prompt.model,
          dimensions: { width: prompt.prompt.width, height: prompt.prompt.height },
          parameters: {
            steps: prompt.prompt.steps,
            cfgScale: prompt.prompt.cfgscale,
            seed: prompt.prompt.seed,
          },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      });
    }

    // Rate limiting: small delay between requests
    if (i < prompts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Organize assets in DaVinci project structure.
 * 
 * Takes image generation results, normalizes paths, enhances with metadata,
 * creates DaVinci project folder structure if needed, and organizes images
 * into appropriate folders by scene and format.
 * 
 * @param generationResults - Array of image generation results from SwarmUI
 * @param sessionTimestamp - Session timestamp to fetch episode info from Redis
 * @param progressCallback - Optional callback for progress updates
 * @returns Promise that resolves to OrganizationResult with success status and organized images
 * @throws Error if session not found or episode data is missing
 * 
 * @example
 * ```typescript
 * const organizationResult = await organizeAssetsInDaVinci(
 *   generationResults,
 *   sessionTimestamp,
 *   (progress) => console.log(`Progress: ${progress.progress}%`)
 * );
 * // Returns: { success: true, organizedImages: [...], failedImages: [...], ... }
 * ```
 */
export async function organizeAssetsInDaVinci(
  generationResults: ImageGenerationResult[],
  sessionTimestamp: number,
  progressCallback?: ProgressCallback
): Promise<OrganizationResult> {
  // Fetch session to get episode info
  const sessionResponse = await getSessionByTimestamp(sessionTimestamp);
  
  if (!sessionResponse.success || !sessionResponse.data) {
    const errorMsg = sessionResponse.error || 'Unknown error';
    throw new Error(
      `Failed to fetch session for asset organization.\n\n` +
      `Error: ${errorMsg}\n\n` +
      `Troubleshooting:\n` +
      `1. Verify session was saved successfully\n` +
      `2. Check Redis API is accessible\n` +
      `3. Ensure session contains episode data`
    );
  }

  const analyzedEpisode: AnalyzedEpisode = sessionResponse.data.analyzedEpisode;
  
  if (!analyzedEpisode) {
    throw new Error('No analyzed episode data found for organization');
  }

  const episodeNumber = analyzedEpisode.episodeNumber;
  const episodeTitle = analyzedEpisode.title || 'Untitled';
  const generationStartDate = new Date();

  // Create DaVinci project if it doesn't exist
  progressCallback?.({
    currentStep: 0,
    totalSteps: 3,
    currentStepName: 'Creating DaVinci project structure...',
    progress: 0,
  });

  try {
    await createEpisodeProject(episodeNumber, episodeTitle);
  } catch (error) {
    // Project might already exist, which is fine
    console.log('Project creation:', error instanceof Error ? error.message : 'Project may already exist');
  }

  // Normalize and enhance image paths
  progressCallback?.({
    currentStep: 1,
    totalSteps: 3,
    currentStepName: 'Normalizing image paths...',
    progress: 33,
  });

  const enhancedPaths: EnhancedImagePath[] = [];
  const prompts = await fetchPromptsFromRedis(sessionTimestamp);
  
  // Create metadata for each image path
  const metadata: ImageMetadata[] = [];
  const imagePaths: string[] = [];

  for (let i = 0; i < generationResults.length; i++) {
    const result = generationResults[i];
    const prompt = prompts[i];

    if (result.success && result.imagePaths && result.imagePaths.length > 0) {
      // Process each image path from the result
      for (const imagePath of result.imagePaths) {
        imagePaths.push(imagePath);
        metadata.push({
          sceneNumber: prompt.sceneNumber,
          beatId: prompt.beatId,
          format: prompt.format,
          prompt: prompt.prompt.prompt,
          generationStartDate: generationStartDate,
        });
      }
    }
  }

  if (imagePaths.length > 0) {
    const enhanced = await enhanceImagePathsWithMetadata(imagePaths, metadata);
    enhancedPaths.push(...enhanced);
  }

  // Organize images into DaVinci project
  progressCallback?.({
    currentStep: 2,
    totalSteps: 3,
    currentStepName: 'Organizing images in DaVinci project...',
    progress: 66,
  });

  const organizationResult = await organizeSwarmUIImages(
    enhancedPaths.filter(p => p.exists),
    episodeNumber,
    episodeTitle
  );

  progressCallback?.({
    currentStep: 3,
    totalSteps: 3,
    currentStepName: 'Complete!',
    progress: 100,
  });

  return organizationResult;
}

/**
 * Transform pipeline results to StoryTeller Image Review format.
 *
 * Groups generation results by beat and formats them for the StoryTeller API.
 *
 * @param prompts - Original prompts from Redis
 * @param generationResults - Results from SwarmUI generation
 * @returns Array of BeatGenerationResult for StoryTeller
 */
function transformToStoryTellerFormat(
  prompts: BeatPrompt[],
  generationResults: ImageGenerationResult[]
): BeatGenerationResult[] {
  // Group results by beat ID
  const beatMap = new Map<string, {
    beatId: string;
    sceneNumber: number;
    narrativeContext: string;
    results: { format: string; prompt: string; images: string[]; metadata: any }[];
  }>();

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const result = generationResults[i];

    if (!result?.success || !result.imagePaths || result.imagePaths.length === 0) {
      continue;
    }

    const key = prompt.beatId;
    if (!beatMap.has(key)) {
      beatMap.set(key, {
        beatId: prompt.beatId,
        sceneNumber: prompt.sceneNumber,
        narrativeContext: prompt.beat_script_text || '',
        results: []
      });
    }

    const beatData = beatMap.get(key)!;

    // Map format to StoryTeller format_type
    const formatType = prompt.format === 'cinematic' ? '16:9_cinematic' : '9:16_vertical';

    beatData.results.push({
      format: formatType,
      prompt: prompt.prompt.prompt,
      images: result.imagePaths,
      metadata: result.metadata || {}
    });
  }

  // Convert map to array of BeatGenerationResult
  const storyTellerResults: BeatGenerationResult[] = [];

  beatMap.forEach((beatData) => {
    storyTellerResults.push({
      beat_id: beatData.beatId,
      scene_number: beatData.sceneNumber,
      generation_results: beatData.results.map(r => ({
        format_type: r.format,
        prompt: r.prompt,
        generated_images: r.images,
        metadata: r.metadata
      })),
      narrative_context: beatData.narrativeContext
    });
  });

  // Sort by scene number and beat ID for consistent ordering
  storyTellerResults.sort((a, b) => {
    if (a.scene_number !== b.scene_number) {
      return a.scene_number - b.scene_number;
    }
    return a.beat_id.localeCompare(b.beat_id);
  });

  return storyTellerResults;
}

/**
 * Process complete episode pipeline from Redis to SwarmUI to DaVinci.
 *
 * Orchestrates the full pipeline workflow:
 * 1. Fetches prompts from Redis session
 * 2. Filters beats with NEW_IMAGE decisions
 * 3. Initializes SwarmUI session
 * 4. Generates images for all prompts
 * 5. Normalizes and enhances image paths
 * 6. Creates DaVinci project structure
 * 7. Organizes images into DaVinci folders
 * 
 * @param sessionTimestamp - Session timestamp to process (from analyzed episode)
 * @param progressCallback - Optional callback for real-time progress updates
 * @param cancellationToken - Optional cancellation token to stop processing early
 * @returns Promise that resolves to PipelineResult with success status, counts, and results
 * 
 * @example
 * ```typescript
 * const result = await processEpisodeCompletePipeline(
 *   sessionTimestamp,
 *   (progress) => updateUI(progress),
 *   cancellationToken
 * );
 * if (result.success) {
 *   console.log(`Generated ${result.successfulGenerations} images`);
 * }
 * ```
 */
export async function processEpisodeCompletePipeline(
  sessionTimestamp: number,
  progressCallback?: ProgressCallback,
  cancellationToken?: CancellationToken
): Promise<PipelineResult> {
  const startTime = Date.now();

  try {
    // Fetch session data to get episode info
    const sessionResponse = await getSessionByTimestamp(sessionTimestamp);
    
    if (!sessionResponse.success || !sessionResponse.data) {
      const errorMsg = sessionResponse.error || 'Unknown error';
      throw new Error(
        `Failed to fetch session data from Redis.\n\n` +
        `Error: ${errorMsg}\n\n` +
        `Troubleshooting:\n` +
        `1. Verify session was saved successfully\n` +
        `2. Check Redis API is accessible\n` +
        `3. Verify session timestamp is correct: ${sessionTimestamp}\n` +
        `4. Try re-analyzing the episode to create a new session`
      );
    }

    const analyzedEpisode: AnalyzedEpisode = sessionResponse.data.analyzedEpisode;

    if (!analyzedEpisode) {
      throw new Error(
        `No analyzed episode data found in session.\n\n` +
        `Troubleshooting:\n` +
        `1. Ensure episode was analyzed before running pipeline\n` +
        `2. Verify session contains analyzed episode data\n` +
        `3. Try re-analyzing the episode script\n` +
        `4. Check session data structure in Redis`
      );
    }

    console.log(`[Pipeline] ========== SESSION DATA LOADED ==========`);
    console.log(`[Pipeline] Session timestamp: ${sessionTimestamp}`);
    console.log(`[Pipeline] Episode: ${analyzedEpisode.episodeNumber} - ${analyzedEpisode.title}`);
    console.log(`[Pipeline] Scenes count: ${analyzedEpisode.scenes?.length || 0}`);

    // Log first beat prompt as sanity check
    const firstScene = analyzedEpisode.scenes?.[0];
    const firstBeat = firstScene?.beats?.find(b => b.imageDecision?.type === 'NEW_IMAGE' && b.prompts?.cinematic);
    if (firstBeat) {
      console.log(`[Pipeline] First NEW_IMAGE beat: ${firstBeat.beatId}`);
      console.log(`[Pipeline] First prompt preview: "${firstBeat.prompts?.cinematic?.prompt?.substring(0, 200)}..."`);
    }

    // Fetch prompts from Redis
    progressCallback?.({
      currentStep: 0,
      totalSteps: 4,
      currentStepName: 'Fetching prompts from Redis...',
      progress: 0,
    });

    const prompts = await fetchPromptsFromRedis(sessionTimestamp);
    console.log(`[Pipeline] Fetched ${prompts.length} prompts from Redis for generation`);

    if (prompts.length === 0) {
      return {
        success: false,
        sessionTimestamp: sessionTimestamp,
        episodeNumber: analyzedEpisode.episodeNumber,
        episodeTitle: analyzedEpisode.title,
        totalPrompts: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        generationResults: [],
        errors: ['No NEW_IMAGE prompts found in session'],
      };
    }

    // Check for cancellation
    if (cancellationToken?.isCancelled()) {
      return {
        success: false,
        sessionTimestamp: sessionTimestamp,
        episodeNumber: analyzedEpisode.episodeNumber,
        episodeTitle: analyzedEpisode.title,
        totalPrompts: prompts.length,
        successfulGenerations: 0,
        failedGenerations: 0,
        generationResults: [],
        errors: [`Operation cancelled: ${cancellationToken.getReason() || 'User cancelled'}`],
      };
    }

    // Generate images
    const generationResults = await generateImagesFromPrompts(prompts, (progress) => {
      progressCallback?.({
        currentStep: progress.currentStep,
        totalSteps: 5,
        currentStepName: progress.currentStepName,
        progress: Math.round((progress.currentStep / 5) * 20),
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
      });
    }, cancellationToken);

    const successfulGenerations = generationResults.filter(r => r.success).length;
    const failedGenerations = generationResults.filter(r => !r.success).length;
    
    // Log generation summary
    if (failedGenerations > 0) {
      const failedPrompts = generationResults
        .filter(r => !r.success)
        .map((r, i) => {
          const promptIndex = generationResults.indexOf(r);
          const prompt = prompts[promptIndex];
          return `  ${i + 1}. Beat ${prompt?.beatId || 'unknown'} (Scene ${prompt?.sceneNumber || '?'}): ${r.error?.substring(0, 100) || 'Unknown error'}`;
        });
      
      console.warn(
        `[Pipeline] Generation completed with ${failedGenerations} failures out of ${prompts.length} prompts:\n` +
        failedPrompts.join('\n')
      );
    } else {
      console.log(`[Pipeline] All ${successfulGenerations} image generations succeeded`);
    }

    // Organize assets in DaVinci
    let organizationResult: OrganizationResult | undefined;
    try {
      organizationResult = await organizeAssetsInDaVinci(generationResults, sessionTimestamp, (progress) => {
        progressCallback?.({
          currentStep: 4 + progress.currentStep,
          totalSteps: 8,
          currentStepName: progress.currentStepName,
          progress: Math.round(70 + (progress.progress / 4) * 20),
        });
      });
    } catch (error) {
      console.error('Failed to organize assets:', error);
    }

    // Create StoryTeller Image Review session
    progressCallback?.({
      currentStep: 7,
      totalSteps: 8,
      currentStepName: 'Creating review session in StoryTeller...',
      progress: 90,
    });

    let reviewSessionId: string | undefined;
    try {
      // Transform pipeline results to StoryTeller format
      const storyTellerResults = transformToStoryTellerFormat(prompts, generationResults);

      // Get story info from session if available
      const storyId = sessionResponse.data.storyId;
      const storyName = sessionResponse.data.storyName || analyzedEpisode.title;

      const reviewResponse = await createImageReviewSession({
        episode_number: analyzedEpisode.episodeNumber,
        generation_results: storyTellerResults,
        generation_timestamp: new Date().toISOString(),
        story_id: storyId,
        story_name: storyName,
        images_per_prompt: 3
      });

      if (reviewResponse.success) {
        reviewSessionId = reviewResponse.session_id;
        console.log(`[Pipeline] ✅ Created StoryTeller review session: ${reviewSessionId}`);
        console.log(`[Pipeline]    Total images for review: ${reviewResponse.total_images}`);
      }
    } catch (error) {
      // Don't fail the pipeline if StoryTeller integration fails
      console.warn('[Pipeline] ⚠️ Failed to create StoryTeller review session:', error);
      console.warn('[Pipeline]    Images are saved locally but not available in StoryTeller Image Review.');
    }

    progressCallback?.({
      currentStep: 8,
      totalSteps: 8,
      currentStepName: 'Complete!',
      progress: 100,
    });

    const duration = Date.now() - startTime;

    return {
      success: organizationResult?.success ?? false,
      reviewSessionId: reviewSessionId,
      sessionTimestamp: sessionTimestamp,
      episodeNumber: analyzedEpisode.episodeNumber,
      episodeTitle: analyzedEpisode.title,
      totalPrompts: prompts.length,
      successfulGenerations: successfulGenerations,
      failedGenerations: failedGenerations,
      organizationResult: organizationResult,
      generationResults: generationResults,
      duration: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      sessionTimestamp: sessionTimestamp,
      episodeNumber: 0,
      episodeTitle: '',
      totalPrompts: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      generationResults: [],
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      duration: duration,
    };
  }
}

/**
 * Process single beat image generation and organization.
 * 
 * Generates images for a single beat in either cinematic or vertical format,
 * normalizes paths, and organizes the result in DaVinci project structure.
 * 
 * @param beatId - The beat ID to process (e.g., 's1-b1')
 * @param format - Image format: 'cinematic' (16:9) or 'vertical' (9:16)
 * @param sessionTimestamp - Optional session timestamp (uses latest if not provided)
 * @param progressCallback - Optional callback for progress updates
 * @param cancellationToken - Optional cancellation token to stop processing
 * @returns Promise that resolves to BeatPipelineResult with success status and generation result
 * 
 * @example
 * ```typescript
 * const result = await processSingleBeat(
 *   's1-b1',
 *   'cinematic',
 *   sessionTimestamp,
 *   (progress) => console.log(progress.currentStepName)
 * );
 * if (result.success && result.generationResult?.imagePaths) {
 *   console.log('Images:', result.generationResult.imagePaths);
 * }
 * ```
 */
export async function processSingleBeat(
  beatId: string,
  format: 'cinematic' | 'vertical',
  sessionTimestamp?: number,
  progressCallback?: ProgressCallback,
  cancellationToken?: CancellationToken
): Promise<BeatPipelineResult> {
  try {
    // Get session (use provided timestamp or latest)
    const sessionResponse = sessionTimestamp
      ? await getSessionByTimestamp(sessionTimestamp)
      : await getLatestSession();

    if (!sessionResponse.success || !sessionResponse.data) {
      const errorMsg = sessionResponse.error || 'Unknown error';
      throw new Error(
        `Failed to fetch session data.\n\n` +
        `Error: ${errorMsg}\n\n` +
        `Troubleshooting:\n` +
        `1. Verify session was saved successfully\n` +
        `2. Check Redis API is accessible\n` +
        `3. Try re-analyzing the episode to create a new session`
      );
    }

    const analyzedEpisode: AnalyzedEpisode = sessionResponse.data.analyzedEpisode;
    
    if (!analyzedEpisode || !analyzedEpisode.scenes) {
      throw new Error('No analyzed episode data found');
    }

    // Find the beat
    let beat: BeatAnalysis | undefined;
    let sceneNumber = 0;

    for (const scene of analyzedEpisode.scenes) {
      if (!scene.beats) continue;
      
      const foundBeat = scene.beats.find(b => b.beatId === beatId);
      if (foundBeat) {
        beat = foundBeat;
        sceneNumber = scene.sceneNumber;
        break;
      }
    }

    if (!beat) {
      throw new Error(`Beat ${beatId} not found in analyzed episode`);
    }

    if (!beat.prompts) {
      throw new Error(`Beat ${beatId} has no prompts`);
    }

    const prompt = format === 'cinematic' ? beat.prompts.cinematic : beat.prompts.vertical;
    
    if (!prompt) {
      throw new Error(`Beat ${beatId} has no ${format} prompt`);
    }

    // Check for cancellation
    if (cancellationToken?.isCancelled()) {
      return {
        success: false,
        beatId: beatId,
        format: format,
        sceneNumber: sceneNumber,
        error: `Operation cancelled: ${cancellationToken.getReason() || 'User cancelled'}`,
      };
    }

    // Initialize SwarmUI session
    progressCallback?.({
      currentStep: 0,
      totalSteps: 3,
      currentStepName: 'Initializing SwarmUI session...',
      progress: 0,
    });

    const sessionId = await initializeSession();
    const generationStartDate = new Date();

    // Check for cancellation after session init
    if (cancellationToken?.isCancelled()) {
      return {
        success: false,
        beatId: beatId,
        format: format,
        sceneNumber: sceneNumber,
        error: `Operation cancelled: ${cancellationToken.getReason() || 'User cancelled'}`,
      };
    }

    // OPTIMIZATION: Use preset if configured
    const getEnvVarForBeat = (key: string): string | undefined => {
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
    
    const presetName = getEnvVarForBeat('SWARMUI_PRESET') || getEnvVarForBeat('VITE_SWARMUI_PRESET');
    const usePresets = presetName !== undefined && presetName !== '';

    // Get time estimation for single beat (using sessionId)
    let estimatedTimeRemaining: number | undefined;
    try {
      const stats = await getGenerationStatistics(sessionId);
      if (stats.average_generation_time > 0) {
        estimatedTimeRemaining = stats.average_generation_time;
      }
    } catch (error) {
      // Ignore if stats not available
    }

    // Generate image
    progressCallback?.({
      currentStep: 1,
      totalSteps: 3,
      currentStepName: 'Generating image...',
      progress: 33,
      estimatedTimeRemaining,
    });

    // Use parameters from prompt (populated from Episode Context image_config)
    // Fallback to hardcoded defaults only if prompt doesn't have the values
    const generationOptions: any = {
      // Use prompt values as primary source (now populated from Episode Context image_config)
      width: prompt.width || (format === 'vertical' ? 768 : 1344),
      height: prompt.height || (format === 'vertical' ? 1344 : 768),
      steps: prompt.steps || 40,
      cfgscale: prompt.cfgscale !== undefined ? prompt.cfgscale : 1,
      sampler: prompt.sampler || 'euler',
      scheduler: prompt.scheduler || 'beta', // Default to 'beta' (from image_config default)
      automaticvae: true,
      loras: prompt.loras || 'gargan',
      loraweights: prompt.loraweights || '1',
    };

    // Set model if available from prompt
    if (prompt.model) {
      generationOptions.model = prompt.model;
    }

    console.log(`[Pipeline] Single beat using image_config values: ${generationOptions.width}x${generationOptions.height}, ` +
      `steps=${generationOptions.steps}, cfgscale=${generationOptions.cfgscale}, scheduler=${generationOptions.scheduler}`);
    
    const generationResult = await generateImages(
      prompt.prompt,
      3, // imagesCount
      sessionId,
      3, // maxRetries
      generationOptions
    );

    if (!generationResult.success || !generationResult.imagePaths || generationResult.imagePaths.length === 0) {
      return {
        success: false,
        beatId: beatId,
        format: format,
        sceneNumber: sceneNumber,
        generationResult: generationResult,
        error: generationResult.error || 'Image generation failed',
      };
    }

    // Normalize and organize in DaVinci
    progressCallback?.({
      currentStep: 2,
      totalSteps: 3,
      currentStepName: 'Organizing in DaVinci project...',
      progress: 66,
    });

    const metadata: ImageMetadata[] = generationResult.imagePaths.map(imagePath => ({
      sceneNumber: sceneNumber,
      beatId: beatId,
      format: format,
      prompt: prompt.prompt,
      generationStartDate: generationStartDate,
    }));

    const enhancedPaths = await enhanceImagePathsWithMetadata(generationResult.imagePaths, metadata);
    
    const organizationResult = await organizeSwarmUIImages(
      enhancedPaths.filter(p => p.exists),
      analyzedEpisode.episodeNumber,
      analyzedEpisode.title
    );

    progressCallback?.({
      currentStep: 3,
      totalSteps: 3,
      currentStepName: 'Complete!',
      progress: 100,
    });

    return {
      success: organizationResult.success,
      beatId: beatId,
      format: format,
      sceneNumber: sceneNumber,
      generationResult: generationResult,
      organizationResult: organizationResult,
    };
  } catch (error) {
    return {
      success: false,
      beatId: beatId,
      format: format,
      sceneNumber: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

