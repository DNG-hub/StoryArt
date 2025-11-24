import type { BeatPrompts, SwarmUIPrompt, EpisodeStyleConfig } from '../types';

/**
 * Vertical Prompt Service
 * 
 * This service handles the generation and processing of vertical (9:16) prompts
 * with different approaches for long-form storytelling vs marketing use cases.
 */

export interface VerticalPromptOptions {
  useCase: 'longform' | 'marketing'; // Different approaches for content vs marketing
  characterFocus?: boolean; // Prioritize character details for marketing
  environmentalFocus?: boolean; // Prioritize environment for long-form
  hookIntensity?: 'low' | 'medium' | 'high'; // Marketing hook intensity
}

/**
 * Generates vertical prompts optimized for long-form storytelling
 * Focuses on narrative continuity and character positioning within the story
 */
export const generateLongFormVerticalPrompt = (
  basePrompt: string,
  styleConfig: EpisodeStyleConfig,
  options?: Partial<VerticalPromptOptions>
): SwarmUIPrompt => {
  // Enhance the base prompt for long-form vertical storytelling
  // Emphasizes narrative flow and character positioning in the story world
  const enhancedPrompt = `${basePrompt} vertical composition emphasizing story continuity, character placement in narrative flow, and environmental storytelling focused for 9:16 aspect ratio`;

  return {
    prompt: enhancedPrompt,
    model: styleConfig.model,
    width: getVerticalWidth(styleConfig.verticalAspectRatio),
    height: getVerticalHeight(styleConfig.verticalAspectRatio),
    steps: 40,
    cfgscale: 1,
    seed: -1
  };
};

/**
 * Generates vertical prompts optimized for marketing and social media
 * Focuses on character appeal and visual hooks to attract viewers
 */
export const generateMarketingVerticalPrompt = (
  basePrompt: string,
  styleConfig: EpisodeStyleConfig,
  options?: Partial<VerticalPromptOptions>
): SwarmUIPrompt => {
  // Enhance the base prompt for marketing/sales focus
  // Emphasizes character appeal, emotional impact, and visual hooks
  const hookIntensity = options?.hookIntensity || 'medium';
  const hookDescriptors = {
    low: 'subtle visual appeal',
    medium: 'compelling visual hook that draws viewers in',
    high: 'highly compelling visual hook that demands attention and drives engagement'
  };

  const enhancedPrompt = `${basePrompt} vertical composition optimized for social media, character-focused close-up with dramatic lighting, ${hookDescriptors[hookIntensity]}, emphasizing character emotion and visual appeal for 9:16 aspect ratio`;

  return {
    prompt: enhancedPrompt,
    model: styleConfig.model,
    width: getVerticalWidth(styleConfig.verticalAspectRatio),
    height: getVerticalHeight(styleConfig.verticalAspectRatio),
    steps: 40,
    cfgscale: 1,
    seed: -1
  };
};

/**
 * Processes vertical prompts based on their intended use case
 */
export const processVerticalPrompt = (
  basePrompt: SwarmUIPrompt,
  styleConfig: EpisodeStyleConfig,
  options: VerticalPromptOptions
): SwarmUIPrompt => {
  switch (options.useCase) {
    case 'longform':
      return generateLongFormVerticalPrompt(basePrompt.prompt, styleConfig, options);
    case 'marketing':
      return generateMarketingVerticalPrompt(basePrompt.prompt, styleConfig, options);
    default:
      return basePrompt; // Return original if no specific use case
  }
};

/**
 * Adjusts a vertical prompt for marketing purposes with additional hook elements
 */
export const enhanceVerticalForMarketing = (
  prompt: SwarmUIPrompt,
  hookText?: string
): SwarmUIPrompt => {
  const enhancedPrompt = hookText 
    ? `${prompt.prompt} ${hookText} - marketing optimized, high engagement potential`
    : `${prompt.prompt} marketing optimized, designed for social media engagement, visual hook emphasized`;

  return {
    ...prompt,
    prompt: enhancedPrompt
  };
};

/**
 * Creates distinct vertical prompts for long-form vs marketing based on the same source
 */
export const generateDualVerticalPrompts = (
  basePrompt: string,
  styleConfig: EpisodeStyleConfig,
  longFormOptions?: Partial<VerticalPromptOptions>,
  marketingOptions?: Partial<VerticalPromptOptions>
): { longform: SwarmUIPrompt; marketing: SwarmUIPrompt } => {
  const longFormPrompt = generateLongFormVerticalPrompt(
    basePrompt, 
    styleConfig, 
    { useCase: 'longform', ...longFormOptions }
  );

  const marketingPrompt = generateMarketingVerticalPrompt(
    basePrompt, 
    styleConfig, 
    { 
      useCase: 'marketing', 
      hookIntensity: 'high',
      ...marketingOptions 
    }
  );

  return {
    longform: longFormPrompt,
    marketing: marketingPrompt
  };
};

// Helper functions
const getVerticalWidth = (aspectRatio: string): number => {
  const [w, h] = aspectRatio.split(':').map(Number);
  const ratio = w / h;
  const baseResolution = 1024;
  return Math.round(Math.sqrt(baseResolution * baseResolution * ratio) / 8) * 8;
};

const getVerticalHeight = (aspectRatio: string): number => {
  const [w, h] = aspectRatio.split(':').map(Number);
  const ratio = w / h;
  const baseResolution = 1024;
  const width = Math.round(Math.sqrt(baseResolution * baseResolution * ratio) / 8) * 8;
  return Math.round(width / ratio / 8) * 8;
};

// Type guard to check if a prompt is optimized for marketing
export const isMarketingOptimized = (prompt: SwarmUIPrompt): boolean => {
  return prompt.prompt.includes('marketing optimized') || 
         prompt.prompt.includes('social media') || 
         prompt.prompt.includes('engagement') ||
         prompt.prompt.includes('hook');
};

// Type guard to check if a prompt is optimized for long-form
export const isLongFormOptimized = (prompt: SwarmUIPrompt): boolean => {
  return prompt.prompt.includes('narrative flow') || 
         prompt.prompt.includes('story continuity') || 
         prompt.prompt.includes('environmental storytelling');
};