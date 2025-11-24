/**
 * Redis Integration Service for Video Short Marketing Campaigns
 * 
 * This service handles the integration between the Redis session storage
 * and the video short marketing generation system, allowing for generation
 * of marketing-focused vertical images based on full episode analysis.
 */

import type { 
  SwarmUIExportData,
  VideoShortEpisode,
  AnalyzedEpisode,
  EpisodeStyleConfig
} from '../types';
import { generateVideoShortMarketingCampaign } from './videoShortMarketingService';
import { saveSessionToRedis, getLatestSession, RedisSessionResponse } from './redisService';

/**
 * Integrates video short marketing generation with existing Redis session data
 */
export const generateVideoShortCampaignFromRedisSession = async (
  timestamp?: number,
  styleConfig: EpisodeStyleConfig = {
    model: 'flux1-dev',
    cinematicAspectRatio: '16:9',
    verticalAspectRatio: '9:16'
  },
  onProgress?: (message: string) => void
): Promise<VideoShortEpisode> => {
  try {
    let sessionData: RedisSessionResponse;

    if (timestamp) {
      // Get specific session by timestamp
      const { getSessionByTimestamp } = await import('./redisService'); 
      sessionData = await getSessionByTimestamp(timestamp);
    } else {
      // Get latest session
      sessionData = await getLatestSession();
    }

    if (!sessionData.success || !sessionData.data) {
      throw new Error(`Could not retrieve session data from Redis: ${sessionData.error}`);
    }

    const { scriptText, episodeContext, analyzedEpisode } = sessionData.data;

    if (!analyzedEpisode || !episodeContext) {
      throw new Error('Session data missing required fields (analyzedEpisode or episodeContext)');
    }

    // Generate video short marketing campaign from the episode data
    onProgress?.('Generating video short marketing campaign from Redis session...');
    
    const videoShortEpisode = await generateVideoShortMarketingCampaign(
      analyzedEpisode,
      episodeContext,
      styleConfig,
      onProgress
    );

    onProgress?.(`Successfully generated video short campaign with ${videoShortEpisode.moments.length} marketing moments`);
    
    return videoShortEpisode;

  } catch (error) {
    console.error('Error generating video short campaign from Redis session:', error);
    onProgress?.(`Error generating video short campaign: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * Updates a Redis session to include marketing vertical prompts
 * This enhances the existing session with marketing-focused vertical prompts
 */
export const enhanceSessionWithMarketingPrompts = async (
  timestamp?: number,
  styleConfig: EpisodeStyleConfig = {
    model: 'flux1-dev',
    cinematicAspectRatio: '16:9',
    verticalAspectRatio: '9:16'
  },
  onProgress?: (message: string) => void
): Promise<SwarmUIExportData> => {
  try {
    // Get existing session
    let sessionResponse = await getLatestSession();
    
    if (timestamp) {
      const { getSessionByTimestamp } = await import('./redisService');
      sessionResponse = await getSessionByTimestamp(timestamp);
    }

    if (!sessionResponse.success || !sessionResponse.data) {
      throw new Error(`Could not retrieve session data from Redis: ${sessionResponse.error}`);
    }

    const existingSession: SwarmUIExportData = sessionResponse.data;
    
    if (!existingSession.analyzedEpisode || !existingSession.episodeContext) {
      throw new Error('Session data missing required fields for marketing prompt enhancement');
    }

    onProgress?.('Enhancing session with marketing vertical prompts...');

    // Analyze the episode for marketing moments
    const marketingMoments = await analyzeEpisodeForMarketingMoments(
      existingSession.analyzedEpisode,
      existingSession.episodeContext,
      onProgress
    );

    // Update the session with marketing verticals
    const enhancedSession = {
      ...existingSession,
      analyzedEpisode: {
        ...existingSession.analyzedEpisode,
        scenes: existingSession.analyzedEpisode.scenes.map(scene => ({
          ...scene,
          beats: scene.beats.map(beat => {
            // Check if this beat corresponds to any marketing moment
            const correspondingMoment = marketingMoments.find(moment => 
              moment.beatReference === beat.beatId || 
              beat.beat_script_text.includes(moment.title)
            );

            // If there's a corresponding marketing moment, add its prompt
            if (correspondingMoment) {
              return {
                ...beat,
                prompts: {
                  ...beat.prompts,
                  marketingVertical: correspondingMoment.visualPrompt
                }
              };
            }

            return beat;
          })
        }))
      }
    };

    // Save the enhanced session back to Redis
    await saveSessionToRedis(enhancedSession);
    onProgress?.('Session enhanced with marketing vertical prompts and saved to Redis');

    return enhancedSession;

  } catch (error) {
    console.error('Error enhancing session with marketing prompts:', error);
    onProgress?.(`Error enhancing session: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * Helper function to analyze episode for marketing moments
 */
const analyzeEpisodeForMarketingMoments = async (
  analyzedEpisode: AnalyzedEpisode,
  episodeContext: string,
  onProgress?: (message: string) => void
) => {
  // We'll use the marketing service to identify moments but link them to beats
  // For now, we'll create a simple mapping based on beat characteristics
  const allBeats = analyzedEpisode.scenes.flatMap(scene => 
    scene.beats.map(beat => ({ ...beat, sceneNumber: scene.sceneNumber }))
  );

  // Sort beats by marketing potential
  const sortedBeats = allBeats.sort((a, b) => {
    // Calculate marketing potential score for each beat
    const aScore = calculateMarketingPotential(a);
    const bScore = calculateMarketingPotential(b);
    return bScore - aScore;
  });

  // Take top beats as marketing moments
  return sortedBeats.slice(0, Math.min(5, sortedBeats.length)).map((beat, index) => ({
    momentId: `marketing_moment_${beat.beatId}_${index}`,
    title: `Marketing Moment: ${beat.beat_title || `Scene ${beat.sceneNumber} Beat`}`,
    description: `Beat with high marketing potential: ${beat.core_action}`,
    storyArcConnection: `Connects to scene ${beat.sceneNumber} narrative`,
    emotionalHook: `${beat.emotional_tone || 'compelling'} moment`,
    visualPrompt: beat.prompts?.vertical || createBasicMarketingPrompt(beat, index), // Use existing vertical as base, or create marketing prompt
    beatReference: beat.beatId,
    buzzScore: calculateMarketingPotential(beat),
  }));
};

/**
 * Calculate marketing potential of a beat based on various factors
 */
const calculateMarketingPotential = (beat: any): number => {
  let score = 5; // Base score

  // Boost for emotional intensity
  const emotionalBoosts: Record<string, number> = {
    'Intense': 3,
    'Dramatic': 2,
    'Tense': 2,
    'Emotional': 2,
    'Suspenseful': 3,
    'Action': 2,
    'Shocking': 3,
    'Revelatory': 2,
  };

  const emotionalTone = beat.emotional_tone || '';
  for (const [tone, boost] of Object.entries(emotionalBoosts)) {
    if (emotionalTone.toLowerCase().includes(tone.toLowerCase())) {
      score += boost;
    }
  }

  // Boost for visual significance
  if (beat.visualSignificance === 'High') score += 2;
  if (beat.visualSignificance === 'Medium') score += 1;

  // Boost if it's an image-worthy moment
  if (beat.imageDecision?.type === 'NEW_IMAGE') score += 1;

  // Cap at 10
  return Math.min(score, 10);
};

/**
 * Create a basic marketing-focused prompt if one doesn't exist
 */
const createBasicMarketingPrompt = (beat: any, index: number) => {
  const basePrompt = beat.beat_script_text || beat.core_action || 'compelling narrative moment';
  
  return {
    prompt: `marketing optimized, high engagement potential, ${basePrompt}, 9:16 aspect ratio, vertical composition emphasizing character and action, designed for social media platform, visual hook that draws viewers in, attention grabbing`,
    model: 'flux1-dev',
    width: 1088, // Default vertical width
    height: 1920, // Default vertical height
    steps: 20, // FLUX standard
    cfgscale: 1, // FLUX standard
    seed: -1,
  };
};

/**
 * Retrieves marketing-focused verticals from a session
 */
export const getMarketingVerticalsFromSession = async (
  timestamp?: number
): Promise<{ beatId: string; marketingPrompt?: any }[]> => {
  const sessionResponse = await getLatestSession();
  
  if (timestamp) {
    const { getSessionByTimestamp } = await import('./redisService');
    sessionResponse = await getSessionByTimestamp(timestamp);
  }

  if (!sessionResponse.success || !sessionResponse.data?.analyzedEpisode) {
    return [];
  }

  const { analyzedEpisode } = sessionResponse.data;
  
  const marketingPrompts = [];
  
  for (const scene of analyzedEpisode.scenes) {
    for (const beat of scene.beats) {
      if (beat.prompts?.marketingVertical) {
        marketingPrompts.push({
          beatId: beat.beatId,
          marketingPrompt: beat.prompts.marketingVertical
        });
      }
    }
  }

  return marketingPrompts;
};

/**
 * Gets a summary of video short marketing potential from a session
 */
export const getVideoShortSummaryFromSession = async (
  timestamp?: number
): Promise<{
  hasMarketingPrompts: boolean;
  marketingPromptCount: number;
  totalBeatCount: number;
  episodeNumber?: number;
  episodeTitle?: string;
}> => {
  const sessionResponse = await getLatestSession();
  
  if (timestamp) {
    const { getSessionByTimestamp } = await import('./redisService');
    sessionResponse = await getSessionByTimestamp(timestamp);
  }

  if (!sessionResponse.success || !sessionResponse.data?.analyzedEpisode) {
    return {
      hasMarketingPrompts: false,
      marketingPromptCount: 0,
      totalBeatCount: 0
    };
  }

  const { analyzedEpisode } = sessionResponse.data;
  
  let marketingPromptCount = 0;
  let totalBeatCount = 0;
  
  for (const scene of analyzedEpisode.scenes) {
    for (const beat of scene.beats) {
      totalBeatCount++;
      if (beat.prompts?.marketingVertical) {
        marketingPromptCount++;
      }
    }
  }

  return {
    hasMarketingPrompts: marketingPromptCount > 0,
    marketingPromptCount,
    totalBeatCount,
    episodeNumber: analyzedEpisode.episodeNumber,
    episodeTitle: analyzedEpisode.title
  };
};