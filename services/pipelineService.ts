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
import { initializeSession, generateImages } from './swarmUIService';
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
 * Fetch prompts from Redis session data
 * 
 * Extracts prompts from analyzedEpisode.scenes[].beats[].prompts
 * Filters only NEW_IMAGE beats
 * 
 * @param sessionTimestamp - Session timestamp to fetch from Redis
 * @returns Promise that resolves to array of BeatPrompt objects
 */
export async function fetchPromptsFromRedis(
  sessionTimestamp: number
): Promise<BeatPrompt[]> {
  // Fetch session data from Redis
  const sessionResponse = await getSessionByTimestamp(sessionTimestamp);
  
  if (!sessionResponse.success || !sessionResponse.data) {
    throw new Error(`Failed to fetch session ${sessionTimestamp}: ${sessionResponse.error || 'Unknown error'}`);
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
        console.warn(`Beat ${beat.beatId} has NEW_IMAGE decision but no prompts. Skipping.`);
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
 * tracks progress, handles errors per prompt
 * 
 * @param prompts - Array of beat prompts to generate
 * @param progressCallback - Optional callback for progress updates
 * @returns Promise that resolves to array of generation results
 */
export async function generateImagesFromPrompts(
  prompts: BeatPrompt[],
  progressCallback?: ProgressCallback
): Promise<ImageGenerationResult[]> {
  if (prompts.length === 0) {
    return [];
  }

  const results: ImageGenerationResult[] = [];
  const generationStartDate = new Date();

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
    throw new Error(`Failed to initialize SwarmUI session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Process prompts sequentially
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const currentStep = i + 1;

    progressCallback?.({
      currentStep: currentStep,
      totalSteps: prompts.length + 1,
      currentStepName: `Generating image ${currentStep} of ${prompts.length}...`,
      progress: Math.round((currentStep / (prompts.length + 1)) * 100),
    });

    try {
      // Generate images (default: 3 images per prompt)
      const result = await generateImages(
        prompt.prompt.prompt,
        3, // imagesCount
        sessionId
      );

      // Add metadata about the beat
      if (result.success && result.metadata) {
        result.metadata.prompt = prompt.prompt.prompt;
      }

      results.push(result);
    } catch (error) {
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
 * Organize assets in DaVinci project
 * 
 * Extracts episode number, creates DaVinci project if needed,
 * normalizes image paths, and organizes images
 * 
 * @param generationResults - Array of image generation results
 * @param sessionTimestamp - Session timestamp to get episode info
 * @param progressCallback - Optional callback for progress updates
 * @returns Promise that resolves to organization result
 */
export async function organizeAssetsInDaVinci(
  generationResults: ImageGenerationResult[],
  sessionTimestamp: number,
  progressCallback?: ProgressCallback
): Promise<OrganizationResult> {
  // Fetch session to get episode info
  const sessionResponse = await getSessionByTimestamp(sessionTimestamp);
  
  if (!sessionResponse.success || !sessionResponse.data) {
    throw new Error(`Failed to fetch session for organization: ${sessionResponse.error || 'Unknown error'}`);
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
 * Process complete episode pipeline
 * 
 * Fetches prompts from Redis, filters NEW_IMAGE beats,
 * initializes SwarmUI session, generates images, normalizes paths,
 * and organizes assets in DaVinci
 * 
 * @param sessionTimestamp - Session timestamp to process
 * @param progressCallback - Optional callback for progress updates
 * @returns Promise that resolves to pipeline result
 */
export async function processEpisodeCompletePipeline(
  sessionTimestamp: number,
  progressCallback?: ProgressCallback
): Promise<PipelineResult> {
  const startTime = Date.now();

  try {
    // Fetch session data to get episode info
    const sessionResponse = await getSessionByTimestamp(sessionTimestamp);
    
    if (!sessionResponse.success || !sessionResponse.data) {
      throw new Error(`Failed to fetch session: ${sessionResponse.error || 'Unknown error'}`);
    }

    const analyzedEpisode: AnalyzedEpisode = sessionResponse.data.analyzedEpisode;
    
    if (!analyzedEpisode) {
      throw new Error('No analyzed episode data found');
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

    // Generate images
    const generationResults = await generateImagesFromPrompts(prompts, (progress) => {
      progressCallback?.({
        currentStep: progress.currentStep,
        totalSteps: 5,
        currentStepName: progress.currentStepName,
        progress: Math.round((progress.currentStep / 5) * 20),
      });
    });

    const successfulGenerations = generationResults.filter(r => r.success).length;
    const failedGenerations = generationResults.filter(r => !r.success).length;

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
 * Process single beat image generation
 * 
 * Fetches prompt from analyzed episode, initializes/reuses SwarmUI session,
 * generates image, normalizes path, copies to DaVinci
 * 
 * @param beatId - Beat ID (e.g., "s1-b1")
 * @param format - Format type ('cinematic' or 'vertical')
 * @param sessionTimestamp - Optional session timestamp (uses latest if not provided)
 * @param progressCallback - Optional callback for progress updates
 * @returns Promise that resolves to beat pipeline result
 */
export async function processSingleBeat(
  beatId: string,
  format: 'cinematic' | 'vertical',
  sessionTimestamp?: number,
  progressCallback?: ProgressCallback
): Promise<BeatPipelineResult> {
  try {
    // Get session (use provided timestamp or latest)
    const sessionResponse = sessionTimestamp
      ? await getSessionByTimestamp(sessionTimestamp)
      : await getLatestSession();

    if (!sessionResponse.success || !sessionResponse.data) {
      throw new Error(`Failed to fetch session: ${sessionResponse.error || 'Unknown error'}`);
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

    // Initialize SwarmUI session
    progressCallback?.({
      currentStep: 0,
      totalSteps: 3,
      currentStepName: 'Initializing SwarmUI session...',
      progress: 0,
    });

    const sessionId = await initializeSession();
    const generationStartDate = new Date();

    // Generate image
    progressCallback?.({
      currentStep: 1,
      totalSteps: 3,
      currentStepName: 'Generating image...',
      progress: 33,
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

