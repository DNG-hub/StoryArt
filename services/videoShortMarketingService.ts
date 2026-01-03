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
import { geminiGenerateContent } from './geminiService.js';

export interface VideoShortMoment {
  momentId: string;
  title: string;
  viralHookOverlay: string;     // One-liner viral hook overlay text
  script: string;               // Full script with dialogue and sound direction
  imagePrompts: string[];       // 3-4 specific image prompts for different shots
  description: string;          // Why this moment is compelling for marketing
  storyArcConnection: string;   // How it relates to overall story
  emotionalHook: string;        // Emotional appeal for marketing
  visualPrompt: SwarmUIPrompt;  // 9:16 marketing-optimized prompt (primary/combined)
  beatReference?: string;       // Optional reference to original beat if applicable
  buzzScore: number;            // 0-10 score for marketing potential
  sceneNumber?: number;         // Scene this moment belongs to
  sceneTitle?: string;          // Title of the scene
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

    const response = await geminiGenerateContent(
      userPrompt,
      systemInstruction,
      0.3,
      2048
    );
    
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
        viralHookOverlay: '',  // Will be populated later
        script: '',            // Will be populated later
        imagePrompts: [],      // Will be populated later
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
          viralHookOverlay: `${beat.emotional_tone} moment that will hook viewers`,
          script: beat.beat_script_text || beat.core_action,
          imagePrompts: [],  // Will be populated later
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
      viralHookOverlay: `${beat.emotional_tone} moment from the story`,
      script: beat.beat_script_text || beat.core_action,
      imagePrompts: [],
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

  const updatedMoments: VideoShortMoment[] = [];

  for (let index = 0; index < moments.length; index++) {
    const moment = moments[index];
    onProgress?.(`Generating marketing prompt ${index + 1}/${moments.length} for: ${moment.title}`);
    
    const systemInstruction = `You are an expert **YouTube Shorts Marketing Strategist** creating viral vertical video concepts. For each moment, you will create:

1. A VIRAL HOOK OVERLAY - A single compelling sentence that appears as text overlay (max 15 words)
2. A FULL SCRIPT - Complete narrative with dialogue, sound effects (in parentheses), and voiceover direction
3. 3-4 IMAGE PROMPTS - Specific, detailed prompts for different shots/angles that tell the visual story

Your output should be optimized for social media virality (TikTok, Instagram Reels, YouTube Shorts).`;

    const userPrompt = `Create a comprehensive YouTube Short marketing concept for this moment:

MOMENT DETAILS:
- Title: ${moment.title}
- Description: ${moment.description}
- Story Connection: ${moment.storyArcConnection}
- Emotional Hook: ${moment.emotionalHook}
- Buzz Score: ${moment.buzzScore}/10

EPISODE CONTEXT:
${compactEpisodeContext(episodeContextJson)}

Please provide your response in the following format:

VIRAL HOOK OVERLAY:
[One compelling sentence, max 15 words, that appears as text overlay on the video]

SCRIPT:
[Full script including:
- Sound effects in parentheses like (Sound of wind howling)
- Character dialogue with character names
- Voiceover narration marked as (V.O.)
- Beat markers showing pacing
- Keep it under 60 seconds when read aloud]

IMAGE PROMPTS:
[Provide exactly 3-4 detailed, specific image generation prompts, each on its own line starting with "Prompt 1:", "Prompt 2:", etc. Each prompt should describe a different shot/angle that helps tell this moment's visual story. Include:
- Camera angle (close-up, wide shot, POV, etc.)
- Character positioning and expression
- Lighting and atmosphere
- Environmental details
- Emotional tone
Format: One prompt per line, very detailed and specific for image generation]

Focus on creating viral, scroll-stopping content optimized for 9:16 vertical format.`;

    try {
      const response = await geminiGenerateContent(
        userPrompt,
        systemInstruction,
        0.4, // Slightly more creative for marketing
        2048  // Increased for longer response
      );

      const responseText = response.content;

      // Parse the structured response
      const viralHookMatch = responseText.match(/VIRAL HOOK OVERLAY:\s*\n(.+?)(?:\n\n|$)/s);
      const scriptMatch = responseText.match(/SCRIPT:\s*\n(.+?)(?:\n\nIMAGE PROMPTS:|$)/s);
      const imagePromptsMatch = responseText.match(/IMAGE PROMPTS:\s*\n(.+?)$/s);

      const viralHook = viralHookMatch ? viralHookMatch[1].trim() : moment.emotionalHook;
      const script = scriptMatch ? scriptMatch[1].trim() : moment.description;

      // Extract individual image prompts
      const imagePrompts: string[] = [];
      if (imagePromptsMatch) {
        const promptsText = imagePromptsMatch[1];
        const promptLines = promptsText.split(/Prompt \d+:/g).slice(1); // Split and remove empty first element
        promptLines.forEach(line => {
          const cleaned = line.trim();
          if (cleaned) {
            imagePrompts.push(cleaned);
          }
        });
      }

      // Use first image prompt as the primary visual prompt, or combine all if needed
      const primaryPrompt = imagePrompts.length > 0
        ? imagePrompts[0]
        : `marketing optimized, high engagement potential, ${moment.title} - compelling visual hook, 9:16 aspect ratio`;

      // Create the SwarmUI prompt
      const visualPrompt: SwarmUIPrompt = {
        prompt: primaryPrompt,
        model: styleConfig.model,
        width: verticalWidth,
        height: verticalHeight,
        steps: 40, // Standard value
        cfgscale: 1, // FLUX standard
        seed: -1, // Random seed for variety
      };

      updatedMoments.push({
        ...moment,
        viralHookOverlay: viralHook,
        script: script,
        imagePrompts: imagePrompts,
        visualPrompt,
      });
    } catch (error) {
      console.error(`Error generating prompt for moment ${moment.title}:`, error);
      onProgress?.(`Error generating prompt for: ${moment.title}`);

      // Add the moment with a fallback prompt
      updatedMoments.push({
        ...moment,
        viralHookOverlay: moment.viralHookOverlay || moment.emotionalHook,
        script: moment.script || moment.description,
        imagePrompts: moment.imagePrompts || [],
        visualPrompt: {
          prompt: `marketing optimized, high engagement potential, ${moment.title} - compelling visual hook that draws viewers in, 9:16 aspect ratio`,
          model: styleConfig.model,
          width: verticalWidth,
          height: verticalHeight,
          steps: 40,
          cfgscale: 1,
          seed: -1,
        },
      });
    }

    // Rate limiting: Wait 7 seconds between calls to stay under 10 RPM
    if (index < moments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 7000));
    }
  }

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