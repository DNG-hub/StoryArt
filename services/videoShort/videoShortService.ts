/**
 * Video Short Service - Unified Orchestrator
 * 
 * Main orchestrator service coordinating video short generation workflows.
 * Supports both:
 * - Markdown import workflow (pre-written shorts)
 * - StoryTeller AI workflow (AI-analyzed moments)
 * 
 * Aligned with planned video short marketing system architecture.
 */

import type { VideoShortMoment, VideoShortEpisode, EnhancedEpisodeContext, EnhancedImagePath } from '../../types';
import { parseShortsFromMarkdown } from './shortsImportService';
import { generateVideoShortImagesBatch } from './videoShortImageService';
import { saveVideoShortSession } from './videoShortRedisService';
import { organizeSwarmUIImages, createEpisodeProject } from '../davinciProjectService';
import type { ImageGenerationResult } from '../swarmUIService';
import { enhanceImagePathsWithMetadata } from '../imagePathTracker';

/**
 * Generation source type
 */
export type VideoShortGenerationSource = 
  | { type: 'markdown-import'; planPath: string; paramsPath?: string }
  | { type: 'storyteller-ai'; analyzedEpisode: any; episodeContext: string };

/**
 * Generation options
 */
export interface VideoShortGenerationOptions {
  episodeNumber: number;
  episodeTitle: string;
  storyId?: string;
  imagesPerMoment?: number;
  batchSize?: number;
  useDaVinciOrganization?: boolean;
  episodeContext?: EnhancedEpisodeContext;
}

/**
 * Generation progress
 */
export interface VideoShortGenerationProgress {
  stage: 'parsing' | 'generating' | 'organizing' | 'saving' | 'complete';
  current: string;
  total: number;
  completed: number;
  message: string;
}

/**
 * Generation result
 */
export interface VideoShortGenerationResult {
  episode: VideoShortEpisode;
  imageResults: ImageGenerationResult[];
  sessionKey: string;
  daVinciPath?: string;
}

/**
 * Generate video shorts from markdown import
 * 
 * @param planPath - Path to youtube_shorts_creation_plan.md
 * @param paramsPath - Path to swarmui_parameters_mapping.md (optional)
 * @param options - Generation options
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves to generation result
 */
export async function generateVideoShortsFromMarkdown(
  planPath: string,
  paramsPath: string | undefined,
  options: VideoShortGenerationOptions,
  onProgress?: (progress: VideoShortGenerationProgress) => void
): Promise<VideoShortGenerationResult> {
  // Stage 1: Parse markdown files
  onProgress?.({
    stage: 'parsing',
    current: 'markdown',
    total: 1,
    completed: 0,
    message: 'Parsing markdown files...'
  });
  
  const moments = await parseShortsFromMarkdown(
    planPath,
    paramsPath,
    options.episodeNumber
  );
  
  onProgress?.({
    stage: 'parsing',
    current: 'markdown',
    total: 1,
    completed: 1,
    message: `Parsed ${moments.length} moments from ${planPath}`
  });
  
  // Stage 2: Generate images
  onProgress?.({
    stage: 'generating',
    current: 'images',
    total: moments.length,
    completed: 0,
    message: 'Starting image generation...'
  });
  
  const imageResults = await generateVideoShortImagesBatch(
    moments,
    options.imagesPerMoment || 1,
    options.batchSize || 4,
    (progress) => {
      onProgress?.({
        stage: 'generating',
        current: progress.currentMoment,
        total: progress.totalMoments,
        completed: progress.completedMoments,
        message: progress.message
      });
    }
  );
  
  // Stage 3: Organize in DaVinci structure (if enabled)
  let daVinciPath: string | undefined;
  if (options.useDaVinciOrganization !== false) {
    onProgress?.({
      stage: 'organizing',
      current: 'davinci',
      total: 1,
      completed: 0,
      message: 'Organizing images in DaVinci structure...'
    });
    
    // Create episode project if it doesn't exist
    const projectPath = await createEpisodeProject(
      options.episodeNumber,
      options.episodeTitle
    );
    
    // Enhance image paths with metadata
    const imageMetadata = imageResults
      .filter(r => r.success && r.imagePaths)
      .flatMap((result, index) => {
        const moment = moments[index];
        return (result.imagePaths || []).map((imagePath): { path: string; metadata: any } => ({
          path: imagePath,
          metadata: {
            sceneNumber: 1, // Default for video shorts
            beatId: moment.momentId,
            format: 'vertical' as const,
            prompt: moment.visualPrompt.prompt,
            generationStartDate: new Date()
          }
        }));
      });
    
    const enhancedPaths = await enhanceImagePathsWithMetadata(
      imageMetadata.map(m => m.path),
      imageMetadata.map(m => m.metadata)
    );
    
    // Organize images
    await organizeSwarmUIImages(
      enhancedPaths,
      options.episodeNumber,
      options.episodeTitle
    );
    
    daVinciPath = projectPath;
    
    onProgress?.({
      stage: 'organizing',
      current: 'davinci',
      total: 1,
      completed: 1,
      message: `Organized images in ${projectPath}`
    });
  }
  
  // Stage 4: Save to Redis
  onProgress?.({
    stage: 'saving',
    current: 'redis',
    total: 1,
    completed: 0,
    message: 'Saving session to Redis...'
  });
  
  const episode: VideoShortEpisode = {
    episodeNumber: options.episodeNumber,
    episodeTitle: options.episodeTitle,
    moments,
    storyContext: `Video shorts for episode ${options.episodeNumber}: ${options.episodeTitle}`,
    marketingAngle: moments[0]?.emotionalHook || 'Marketing campaign',
    generatedAt: new Date()
  };
  
  const sessionKey = await saveVideoShortSession({
    episodeNumber: options.episodeNumber,
    storyId: options.storyId,
    episodeTitle: options.episodeTitle,
    moments,
    storyContext: episode.storyContext,
    marketingAngle: episode.marketingAngle,
    source: 'markdown-import',
    generatedAt: new Date()
  });
  
  onProgress?.({
    stage: 'saving',
    current: 'redis',
    total: 1,
    completed: 1,
    message: `Session saved: ${sessionKey}`
  });
  
  onProgress?.({
    stage: 'complete',
    current: '',
    total: 1,
    completed: 1,
    message: 'Generation complete!'
  });
  
  return {
    episode,
    imageResults,
    sessionKey,
    daVinciPath
  };
}

/**
 * Unified function to generate video shorts from any source
 * 
 * @param source - Generation source (markdown-import or storyteller-ai)
 * @param options - Generation options
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves to generation result
 */
export async function generateVideoShorts(
  source: VideoShortGenerationSource,
  options: VideoShortGenerationOptions,
  onProgress?: (progress: VideoShortGenerationProgress) => void
): Promise<VideoShortGenerationResult> {
  if (source.type === 'markdown-import') {
    return await generateVideoShortsFromMarkdown(
      source.planPath,
      source.paramsPath,
      options,
      onProgress
    );
  } else {
    // Future: AI-driven workflow
    throw new Error('StoryTeller AI workflow not yet implemented');
  }
}

