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
import { initializeSession, generateImages, getQueueStatus, getGenerationStatistics } from './swarmUIService';
import { normalizeImagePath, enhanceImagePathsWithMetadata } from './imagePathTracker';
import { createEpisodeProject, organizeSwarmUIImages } from './davinciProjectService';

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

  // Iterate through scenes and beats
  for (const scene of analyzedEpisode.scenes) {
    if (!scene.beats) continue;

    for (const beat of scene.beats) {
      // Filter only NEW_IMAGE beats
      if (beat.imageDecision?.type !== 'NEW_IMAGE') {
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

  // Get initial statistics for time estimation
  let averageGenerationTime = 0;
  let queueLength = 0;
  try {
    const stats = await getGenerationStatistics();
    averageGenerationTime = stats.average_generation_time || 0; // milliseconds
    
    const queueStatus = await getQueueStatus();
    queueLength = queueStatus.queue_length || 0;
  } catch (error) {
    // If endpoints not available, we'll track our own times
    console.log('SwarmUI statistics endpoints not available, will track generation times locally');
  }

  // Initialize SwarmUI session
  progressCallback?.({
    currentStep: 0,
    totalSteps: prompts.length + 1,
    currentStepName: 'Initializing SwarmUI session...',
    progress: 0,
  });

    let sessionId: string;
  try {
    sessionId = await initializeSession();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
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
      const result = await generateImages(
        prompt.prompt.prompt,
        3, // imagesCount
        sessionId
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

    // Fetch prompts from Redis
    progressCallback?.({
      currentStep: 0,
      totalSteps: 4,
      currentStepName: 'Fetching prompts from Redis...',
      progress: 0,
    });

    const prompts = await fetchPromptsFromRedis(sessionTimestamp);

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
          totalSteps: 7,
          currentStepName: progress.currentStepName,
          progress: Math.round(80 + (progress.progress / 3) * 20),
        });
      });
    } catch (error) {
      console.error('Failed to organize assets:', error);
    }

    const duration = Date.now() - startTime;

    return {
      success: organizationResult?.success ?? false,
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

    // Get time estimation for single beat
    let estimatedTimeRemaining: number | undefined;
    try {
      const stats = await getGenerationStatistics();
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

    const generationResult = await generateImages(
      prompt.prompt,
      3, // imagesCount
      sessionId
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

