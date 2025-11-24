/**
 * Video Short Marketing Service
 * 
 * This service generates marketing-focused vertical (9:16) images designed to create buzz
 * based on the full episode narrative rather than individual beat analysis.
 */

import type { 
  AnalyzedEpisode, 
  SwarmUIPrompt, 
  EpisodeStyleConfig,
  EnhancedEpisodeContext,
  BeatAnalysis 
} from '../types';
import { providerManager, AIProvider, TaskType, AIRequest } from './aiProviderService';
import { compactEpisodeContext } from '../utils';

export interface VideoShortMoment {
  momentId: string;
  title: string;
  description: string;          // Why this moment is compelling for marketing
  storyArcConnection: string;   // How it relates to overall story
  emotionalHook: string;        // Emotional appeal for marketing
  visualPrompt: SwarmUIPrompt;  // 9:16 marketing-optimized prompt
  beatReference?: string;       // Optional reference to original beat if applicable
  buzzScore: number;            // 0-10 score for marketing potential
}

export interface VideoShortEpisode {
  episodeNumber: number;
  episodeTitle: string;
  moments: VideoShortMoment[];  // 3-5 key marketing moments
  storyContext: string;         // Overall story connection for marketing
  marketingAngle: string;       // Primary marketing hook for the episode
  generatedAt: Date;
}

/**
 * Analyzes the full episode narrative to identify compelling marketing moments
 */
export const analyzeFullEpisodeForMarketing = async (
  analyzedEpisode: AnalyzedEpisode,
  episodeContextJson: string,
  onProgress?: (message: string) => void
): Promise<VideoShortMoment[]> => {
  const systemInstruction = `You are an expert **Marketing Content Strategist** specializing in entertainment content promotion. Your task is to analyze a complete episode narrative and identify the 3-5 most compelling moments that could generate buzz and drive viewers to watch the full episode. These are not individual scene beats but overarching narrative moments that stand out as particularly intriguing, emotional, or visually striking.`;

  const userPrompt = `Analyze the following complete episode for marketing potential. Identify 3-5 moments that would make viewers want to watch the full episode.

EPISODE DETAILS:
- Episode Number: ${analyzedEpisode.episodeNumber}
- Episode Title: ${analyzedEpisode.title}
- Scene Count: ${analyzedEpisode.scenes.length}

SCENE SUMMARIES:
${analyzedEpisode.scenes.map(scene => `
Scene ${scene.sceneNumber}: ${scene.title}
Beats: ${scene.beats.length}
Key Beats: ${scene.beats.slice(0, 3).map(b => `"${b.core_action}"`).join(', ')}
`).join('\n')}

EPISODE CONTEXT:
${episodeContextJson}

For each of the 3-5 selected moments, provide:
1. A compelling title
2. Why this moment would generate buzz/interest
3. How it connects to the overall story arc
4. The emotional hook that would drive viewers
5. A buzz score (0-10) indicating marketing potential

Rank moments by marketing potential, with highest scores first.`;

  try {
    onProgress?.('Analyzing episode for marketing moments...');

    const request: AIRequest = {
      prompt: userPrompt,
      systemInstruction,
      temperature: 0.3,
      maxTokens: 2048,
      taskType: TaskType.CREATIVE_WRITING
    };

    const response = await providerManager.executeTask(request);
    
    // Parse the AI response into structured moments
    // This is a simplified parsing - in practice, you'd want a more robust parser
    const responseText = response.content;
    
    // Extract key moments from response
    const moments: VideoShortMoment[] = [];
    
    // Example parsing logic (would need to be more robust in practice)
    const momentRegex = /Moment \d+:?\s*\nTitle: (.+?)\s*\nDescription: (.+?)\s*\nStory Connection: (.+?)\s*\nEmotional Hook: (.+?)\s*\nBuzz Score: (\d+)/gs;
    let match;
    
    while ((match = momentRegex.exec(responseText)) !== null) {
      const [, title, description, storyConnection, emotionalHook, buzzScoreStr] = match;
      const buzzScore = parseInt(buzzScoreStr) || 5;
      
      moments.push({
        momentId: `video_short_${Date.now()}_${moments.length + 1}`,
        title: title.trim(),
        description: description.trim(),
        storyArcConnection: storyConnection.trim(),
        emotionalHook: emotionalHook.trim(),
        visualPrompt: null as unknown as SwarmUIPrompt, // Will be populated later
        buzzScore: buzzScore,
      });
    }

    // If parsing failed, create fallback moments
    if (moments.length === 0) {
      onProgress?.('Using fallback moment identification...');
      
      // Identify top moments from beats based on emotional tone and visual anchor
      const allBeats: BeatAnalysis[] = analyzedEpisode.scenes.flatMap(scene => 
        scene.beats.map(beat => ({ ...beat, sceneNumber: scene.sceneNumber }))
      );
      
      // Sort beats by emotional intensity or visual significance
      const sortedBeats = allBeats.sort((a, b) => {
        // Prioritize beats with strong emotional tones or visual anchors
        const aScore = calculateBeatMarketingPotential(a);
        const bScore = calculateBeatMarketingPotential(b);
        return bScore - aScore;
      });
      
      // Take top 3-5 beats as marketing moments
      const topBeats = sortedBeats.slice(0, Math.min(5, sortedBeats.length));
      
      for (let i = 0; i < topBeats.length; i++) {
        const beat = topBeats[i];
        const buzzScore = calculateBeatMarketingPotential(beat);
        
        moments.push({
          momentId: `video_short_${beat.beatId}_${i + 1}`,
          title: `${beat.beat_title || `Scene ${beat['sceneNumber'] || 'X'} Moment`}`,
          description: `Compelling moment from beat: ${beat.core_action}`,
          storyArcConnection: `Connects to overall episode narrative`,
          emotionalHook: `Strong ${beat.emotional_tone} moment`,
          visualPrompt: null as unknown as SwarmUIPrompt, // Will be populated later
          buzzScore: buzzScore,
        });
      }
    }

    onProgress?.(`Identified ${moments.length} marketing moments`);
    return moments;

  } catch (error) {
    console.error("Error analyzing episode for marketing moments:", error);
    onProgress?.('Error analyzing episode for marketing moments');
    
    // Return fallback moments based on simple heuristics
    const allBeats: BeatAnalysis[] = analyzedEpisode.scenes.flatMap(scene => 
      scene.beats.map(beat => ({ ...beat, sceneNumber: scene.sceneNumber }))
    );
    
    const sortedBeats = allBeats.sort((a, b) => {
      return calculateBeatMarketingPotential(b) - calculateBeatMarketingPotential(a);
    });
    
    const fallbackMoments: VideoShortMoment[] = sortedBeats.slice(0, 3).map((beat, idx) => ({
      momentId: `fallback_moment_${beat.beatId}_${idx}`,
      title: `${beat.beat_title || `Key Moment`} (${beat.emotional_tone})`,
      description: beat.core_action,
      storyArcConnection: `Part of scene narrative`,
      emotionalHook: beat.emotional_tone,
      visualPrompt: null as unknown as SwarmUIPrompt,
      buzzScore: calculateBeatMarketingPotential(beat),
    }));

    return fallbackMoments;
  }
};

/**
 * Calculate marketing potential of a beat based on emotional tone and visual significance
 */
const calculateBeatMarketingPotential = (beat: BeatAnalysis): number => {
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
  
  for (const [tone, boost] of Object.entries(emotionalBoosts)) {
    if (beat.emotional_tone.toLowerCase().includes(tone.toLowerCase())) {
      score += boost;
    }
  }
  
  // Boost for visual significance
  if (beat.visualSignificance === 'High') score += 2;
  if (beat.visualSignificance === 'Medium') score += 1;
  
  // Boost if it's an image-worthy moment
  if (beat.imageDecision.type === 'NEW_IMAGE') score += 1;
  
  // Cap at 10
  return Math.min(score, 10);
};

/**
 * Generate marketing-optimized vertical prompts for identified moments
 */
export const generateMarketingVerticalPrompts = async (
  moments: VideoShortMoment[],
  episodeContextJson: string,
  styleConfig: EpisodeStyleConfig,
  onProgress?: (message: string) => void
): Promise<VideoShortMoment[]> => {
  onProgress?.(`Generating ${moments.length} marketing vertical prompts...`);

  // Calculate dimensions for vertical format
  const parseAspectRatio = (ratioStr: string) => {
    const [w, h] = ratioStr.split(':').map(Number);
    return w / h;
  };

  const baseResolution = 1024;
  const verticalRatio = parseAspectRatio(styleConfig.verticalAspectRatio);
  const verticalWidth = Math.round(Math.sqrt(baseResolution * baseResolution * verticalRatio) / 8) * 8;
  const verticalHeight = Math.round(verticalWidth / verticalRatio / 8) * 8;

  const updatedMoments = await Promise.all(moments.map(async (moment, index) => {
    onProgress?.(`Generating marketing prompt ${index + 1}/${moments.length} for: ${moment.title}`);
    
    const systemInstruction = `You are an expert **Marketing Visual Designer** creating promotional vertical (9:16) images designed to generate buzz and drive viewers to watch the full episode. Your prompts should be optimized for social media platforms (TikTok, Instagram Reels, YouTube Shorts) and focus on creating compelling visual hooks that entice viewers.`;

    const userPrompt = `Create a compelling 9:16 vertical prompt for a marketing image based on this episode moment:

MOMENT DETAILS:
- Title: ${moment.title}
- Description: ${moment.description}
- Story Connection: ${moment.storyArcConnection}
- Emotional Hook: ${moment.emotionalHook}
- Buzz Score: ${moment.buzzScore}/10

EPISODE CONTEXT:
${compactEpisodeContext(episodeContextJson)}

Create a prompt that:
1. Grabs attention in a social media feed
2. Creates curiosity about the full episode
3. Uses vertical composition effectively
4. Is optimized for mobile viewing
5. Has a strong visual hook that drives engagement
6. Balances character focus with environmental storytelling
7. Uses marketing language that generates interest

The prompt should emphasize:
- Strong emotional/visual hook that makes people stop scrolling
- Character appeal and/or dramatic action
- Story connection that teases the full narrative
- Vertical composition with elements at top and bottom of frame`;

    const request: AIRequest = {
      prompt: userPrompt,
      systemInstruction,
      temperature: 0.4, // Slightly more creative for marketing
      maxTokens: 1024,
      taskType: TaskType.CREATIVE_WRITING
    };

    try {
      const response = await providerManager.executeTask(request);
      
      // Create the SwarmUI prompt
      const visualPrompt: SwarmUIPrompt = {
        prompt: response.content.trim(),
        model: styleConfig.model,
        width: verticalWidth,
        height: verticalHeight,
        steps: 40, // Standard value
        cfgscale: 1, // FLUX standard
        seed: -1, // Random seed for variety
      };

      return {
        ...moment,
        visualPrompt,
      };
    } catch (error) {
      console.error(`Error generating prompt for moment ${moment.title}:`, error);
      onProgress?.(`Error generating prompt for: ${moment.title}`);
      
      // Return the moment with a fallback prompt
      return {
        ...moment,
        visualPrompt: {
          prompt: `marketing optimized, high engagement potential, ${moment.title} - compelling visual hook that draws viewers in, 9:16 aspect ratio`,
          model: styleConfig.model,
          width: verticalWidth,
          height: verticalHeight,
          steps: 40,
          cfgscale: 1,
          seed: -1,
        },
      };
    }
  }));

  onProgress?.(`Completed generating ${updatedMoments.length} marketing vertical prompts`);
  return updatedMoments;
};

/**
 * Main function to generate a complete video short marketing campaign from an episode
 */
export const generateVideoShortMarketingCampaign = async (
  analyzedEpisode: AnalyzedEpisode,
  episodeContextJson: string,
  styleConfig: EpisodeStyleConfig,
  onProgress?: (message: string) => void
): Promise<VideoShortEpisode> => {
  try {
    onProgress?.('Starting video short marketing campaign generation...');
    
    // Step 1: Analyze episode for marketing moments
    const marketingMoments = await analyzeFullEpisodeForMarketing(analyzedEpisode, episodeContextJson, onProgress);
    
    // Step 2: Generate marketing-optimized vertical prompts
    const momentsWithPrompts = await generateMarketingVerticalPrompts(marketingMoments, episodeContextJson, styleConfig, onProgress);
    
    // Step 3: Create the complete video short episode
    const videoShortEpisode: VideoShortEpisode = {
      episodeNumber: analyzedEpisode.episodeNumber,
      episodeTitle: analyzedEpisode.title,
      moments: momentsWithPrompts,
      storyContext: `Marketing campaign for episode ${analyzedEpisode.episodeNumber}: ${analyzedEpisode.title}`,
      marketingAngle: determineMarketingAngle(momentsWithPrompts),
      generatedAt: new Date(),
    };

    onProgress?.(`Completed video short marketing campaign with ${videoShortEpisode.moments.length} moments`);
    return videoShortEpisode;

  } catch (error) {
    console.error("Error generating video short marketing campaign:", error);
    onProgress?.('Error generating video short marketing campaign');
    throw error;
  }
};

/**
 * Determine the primary marketing angle for an episode based on its strongest moments
 */
const determineMarketingAngle = (moments: VideoShortMoment[]): string => {
  // Find the moment with the highest buzz score
  if (moments.length === 0) return "General episode promotion";
  
  const topMoment = moments.reduce((prev, current) => 
    (prev.buzzScore > current.buzzScore) ? prev : current
  );
  
  // Construct marketing angle from the top moment
  return `${topMoment.title} - ${topMoment.emotionalHook} - ${topMoment.storyArcConnection}`;
};

/**
 * Enhance a regular vertical prompt for marketing purposes
 */
export const enhanceVerticalPromptForMarketing = (prompt: SwarmUIPrompt, marketingAngle?: string): SwarmUIPrompt => {
  const enhancedPrompt = marketingAngle
    ? `${prompt.prompt} ${marketingAngle}, marketing optimized, high engagement potential, designed for social media platform, visual hook emphasized`
    : `${prompt.prompt} marketing optimized, designed for social media engagement, visual hook emphasized`;
  
  return {
    ...prompt,
    prompt: enhancedPrompt,
  };
};

/**
 * Check if a prompt is marketing-optimized
 */
export const isMarketingOptimized = (prompt: SwarmUIPrompt): boolean => {
  return prompt.prompt.includes('marketing optimized') || 
         prompt.prompt.includes('social media') || 
         prompt.prompt.includes('engagement potential') ||
         prompt.prompt.includes('visual hook');
};