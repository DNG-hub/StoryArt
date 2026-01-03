/**
 * Video Short Image Service
 * 
 * Wraps SwarmUI service for 9:16 vertical image generation.
 * Aligned with planned video short marketing system architecture.
 * 
 * This service handles:
 * - 9:16 vertical image generation
 * - Progress tracking
 * - Error handling and retries
 * - Integration with existing SwarmUI service
 */

import type { VideoShortMoment, SwarmUIPrompt } from '../../types';
import { initializeSession, generateImages, type ImageGenerationResult, type SwarmUIGenerationOptions } from '../swarmUIService';

/**
 * Progress callback for image generation
 */
export interface GenerationProgress {
  currentMoment: string;
  totalMoments: number;
  completedMoments: number;
  message: string;
}

/**
 * Generate images for a single video short moment
 * 
 * @param moment - VideoShortMoment with visualPrompt
 * @param imagesCount - Number of images to generate (default: 1)
 * @param sessionId - SwarmUI session ID (optional, will create if not provided)
 * @returns Promise that resolves to ImageGenerationResult
 */
export async function generateMomentImage(
  moment: VideoShortMoment,
  imagesCount: number = 1,
  sessionId?: string
): Promise<ImageGenerationResult> {
  // Initialize session if not provided
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    activeSessionId = await initializeSession();
  }

  // Extract prompt text from SwarmUIPrompt
  const promptText = moment.visualPrompt.prompt;

  // Use default Flux parameters from .env (1088x1920 for 9:16 vertical YouTube Shorts)
  // All Flux-specific parameters (sampler, scheduler, fluxguidancescale, etc.)
  // will be loaded from environment variables
  const result = await generateImages(
    promptText,
    imagesCount,
    activeSessionId,
    3 // maxRetries
  );

  return result;
}

/**
 * Generate images for multiple video short moments
 * 
 * @param moments - Array of VideoShortMoment objects
 * @param imagesPerMoment - Number of images to generate per moment (default: 1)
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves to array of ImageGenerationResult objects
 */
export async function generateVideoShortImages(
  moments: VideoShortMoment[],
  imagesPerMoment: number = 1,
  onProgress?: (progress: GenerationProgress) => void
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];
  const totalMoments = moments.length;
  
  // Initialize session once for all generations
  const sessionId = await initializeSession();
  
  // Process moments sequentially to avoid overwhelming SwarmUI
  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    
    onProgress?.({
      currentMoment: moment.momentId,
      totalMoments,
      completedMoments: i,
      message: `Generating ${moment.title}...`
    });
    
    try {
      const result = await generateMomentImage(moment, imagesPerMoment, sessionId);
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate image for ${moment.momentId}:`, error);
      // Continue with next moment even if one fails
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  onProgress?.({
    currentMoment: '',
    totalMoments,
    completedMoments: totalMoments,
    message: 'Generation complete!'
  });
  
  return results;
}

/**
 * Generate images in batches (parallel processing)
 * 
 * @param moments - Array of VideoShortMoment objects
 * @param imagesPerMoment - Number of images to generate per moment (default: 1)
 * @param batchSize - Number of moments to process in parallel (default: 4)
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves to array of ImageGenerationResult objects
 */
export async function generateVideoShortImagesBatch(
  moments: VideoShortMoment[],
  imagesPerMoment: number = 1,
  batchSize: number = 4,
  onProgress?: (progress: GenerationProgress) => void
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];
  const totalMoments = moments.length;
  
  // Initialize session once for all generations
  const sessionId = await initializeSession();
  
  // Process in batches
  for (let i = 0; i < moments.length; i += batchSize) {
    const batch = moments.slice(i, i + batchSize);
    
    onProgress?.({
      currentMoment: batch[0].momentId,
      totalMoments,
      completedMoments: i,
      message: `Generating batch ${Math.floor(i / batchSize) + 1}...`
    });
    
    // Process batch in parallel
    const batchPromises = batch.map(async (moment) => {
      try {
        return await generateMomentImage(moment, imagesPerMoment, sessionId);
      } catch (error) {
        console.error(`Failed to generate image for ${moment.momentId}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as ImageGenerationResult;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  onProgress?.({
    currentMoment: '',
    totalMoments,
    completedMoments: totalMoments,
    message: 'Generation complete!'
  });
  
  return results;
}

