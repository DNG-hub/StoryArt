// services/swarmUIService.ts
import type { 
  SwarmUIPrompt, 
  LocationContext, 
  CharacterAppearance, 
  ArtifactContext,
  RetrievalMode 
} from '../types';

// This URL should be configurable in a real application, perhaps via an environment variable
// or a settings panel in the UI.
const SWARM_UI_API_URL = "http://127.0.0.1:7801/sdapi/v1/txt2img";

// Enhanced prompt data interface for database context
export interface ContextEnhancedPromptData extends SwarmUIPrompt {
  locationContext?: LocationContext;
  characterAppearances?: CharacterAppearance[];
  artifacts?: ArtifactContext[];
  tacticalOverrideApplied?: boolean;
  contextSource?: 'database' | 'manual';
  promptFragments?: string[];
}

// Image generation result interface
export interface ImageGenerationResult {
  success: boolean;
  imageData?: string; // Base64 encoded image data
  imageUrl?: string;   // URL to the generated image
  metadata?: {
    prompt: string;
    model: string;
    dimensions: { width: number; height: number };
    parameters: {
      steps: number;
      cfgScale: number;
      seed: number;
    };
    contextSource: 'database' | 'manual';
    tacticalOverrideApplied: boolean;
    artifactsUsed: number;
    characterContextsUsed: number;
  };
  error?: string;
}

/**
 * Sends a prompt to the SwarmUI API to generate an image with enhanced database context.
 * 
 * @param promptData - The fully-formed prompt and parameters object with optional database context.
 * @returns A promise that resolves with the API response including metadata.
 */
export const generateImageInSwarmUI = async (promptData: SwarmUIPrompt): Promise<ImageGenerationResult> => {
  console.log("Attempting to generate image with data:", promptData);

  // Phase 2: Implement the actual fetch call to the SwarmUI API.
  try {
    const response = await fetch(SWARM_UI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: promptData.prompt,
        model: promptData.model,
        width: promptData.width,
        height: promptData.height,
        steps: promptData.steps,
        cfg_scale: promptData.cfgscale,
        seed: promptData.seed,
        // Add any other necessary parameters here
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SwarmUI API Error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      imageData: result.images?.[0], // Base64 encoded image
      imageUrl: result.image_url, // If SwarmUI provides a URL
      metadata: {
        prompt: promptData.prompt,
        model: promptData.model,
        dimensions: { width: promptData.width, height: promptData.height },
        parameters: {
          steps: promptData.steps,
          cfgScale: promptData.cfgscale,
          seed: promptData.seed,
        },
        contextSource: 'manual', // Default for basic prompts
        tacticalOverrideApplied: false,
        artifactsUsed: 0,
        characterContextsUsed: 0,
      }
    };
  } catch (error) {
    console.error("Failed to call SwarmUI API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Enhanced image generation with database context support.
 * 
 * @param promptData - Enhanced prompt data with database context
 * @returns A promise that resolves with the API response including rich metadata
 */
export const generateContextEnhancedImage = async (promptData: ContextEnhancedPromptData): Promise<ImageGenerationResult> => {
  console.log("Generating context-enhanced image:", {
    prompt: promptData.prompt.substring(0, 100) + "...",
    contextSource: promptData.contextSource,
    tacticalOverrideApplied: promptData.tacticalOverrideApplied,
    artifactsCount: promptData.artifacts?.length || 0,
    characterContextsCount: promptData.characterAppearances?.length || 0
  });

  try {
    const response = await fetch(SWARM_UI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: promptData.prompt,
        model: promptData.model,
        width: promptData.width,
        height: promptData.height,
        steps: promptData.steps,
        cfg_scale: promptData.cfgscale,
        seed: promptData.seed,
        // Enhanced parameters for database context
        enable_hr: true, // High resolution
        hr_scale: 1.5,   // Upscale factor
        // Add any other SwarmUI-specific parameters
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SwarmUI API Error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      imageData: result.images?.[0],
      imageUrl: result.image_url,
      metadata: {
        prompt: promptData.prompt,
        model: promptData.model,
        dimensions: { width: promptData.width, height: promptData.height },
        parameters: {
          steps: promptData.steps,
          cfgScale: promptData.cfgscale,
          seed: promptData.seed,
        },
        contextSource: promptData.contextSource || 'manual',
        tacticalOverrideApplied: promptData.tacticalOverrideApplied || false,
        artifactsUsed: promptData.artifacts?.length || 0,
        characterContextsUsed: promptData.characterAppearances?.length || 0,
      }
    };
  } catch (error) {
    console.error("Failed to generate context-enhanced image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Batch generate images for multiple prompts with context enhancement.
 * 
 * @param promptDataArray - Array of enhanced prompt data
 * @returns Promise that resolves with array of generation results
 */
export const generateBatchImages = async (promptDataArray: ContextEnhancedPromptData[]): Promise<ImageGenerationResult[]> => {
  console.log(`Starting batch generation for ${promptDataArray.length} images`);
  
  const results: ImageGenerationResult[] = [];
  
  // Process images sequentially to avoid overwhelming the API
  for (let i = 0; i < promptDataArray.length; i++) {
    const promptData = promptDataArray[i];
    console.log(`Generating image ${i + 1}/${promptDataArray.length}`);
    
    try {
      const result = await generateContextEnhancedImage(promptData);
      results.push(result);
      
      // Add a small delay between requests to be respectful to the API
      if (i < promptDataArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`Batch generation completed: ${successCount}/${promptDataArray.length} successful`);
  
  return results;
};

/**
 * Generate image with fallback support - tries database context first, falls back to manual.
 * 
 * @param promptData - Enhanced prompt data
 * @param fallbackPrompt - Fallback prompt for manual mode
 * @returns Promise that resolves with generation result
 */
export const generateImageWithFallback = async (
  promptData: ContextEnhancedPromptData,
  fallbackPrompt: SwarmUIPrompt
): Promise<ImageGenerationResult> => {
  // Try context-enhanced generation first
  if (promptData.contextSource === 'database' && promptData.locationContext) {
    console.log('Attempting database context generation...');
    const result = await generateContextEnhancedImage(promptData);
    
    if (result.success) {
      return result;
    }
    
    console.warn('Database context generation failed, falling back to manual mode');
  }
  
  // Fall back to manual generation
  console.log('Using manual fallback generation...');
  return await generateImageInSwarmUI(fallbackPrompt);
};
