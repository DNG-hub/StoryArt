// services/swarmUIService.ts
import type { 
  SwarmUIPrompt, 
  LocationContext, 
  CharacterAppearance, 
  ArtifactContext,
  RetrievalMode,
  QueueStatus,
  GenerationStats
} from '../types';

// SwarmUI API base URL - uses native API endpoints (not Stable Diffusion API)
// Support both Vite (browser) and Node.js environments
const getEnvVar = (key: string): string | undefined => {
  // Try Node.js environment first
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  // Try Vite/browser environment (with safe checks)
  if (typeof import.meta !== 'undefined') {
    try {
      const env = import.meta.env;
      if (env) {
        return env[key];
      }
    } catch (e) {
      // Ignore errors accessing import.meta.env
    }
  }
  
  return undefined;
};

const SWARMUI_API_BASE_URL = getEnvVar('VITE_SWARMUI_API_URL') || 
                              getEnvVar('SWARMUI_API_URL') || 
                              "http://localhost:7801";

// Legacy Stable Diffusion API endpoint (for backward compatibility)
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
  imagePaths?: string[]; // Array of image paths (filename, relative, or absolute)
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
 * Retry a function with exponential backoff.
 * 
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelay - Initial delay in milliseconds (default: 1000)
 * @returns The result of the function
 */
/**
 * Enhanced retry with exponential backoff and better error classification
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  const errors: Array<{ attempt: number; error: string; timestamp: Date }> = [];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      const errorMessage = lastError.message;
      
      // Log error with attempt number
      errors.push({
        attempt: attempt + 1,
        error: errorMessage,
        timestamp: new Date(),
      });
      
      // Classify error type for better retry logic
      const isNetworkError = errorMessage.includes('fetch') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('ECONNREFUSED') ||
                            errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('timeout');
      
      const isServerError = errorMessage.includes('500') || 
                           errorMessage.includes('503') ||
                           errorMessage.includes('502');
      
      const isClientError = errorMessage.includes('400') || 
                           errorMessage.includes('401') ||
                           errorMessage.includes('403');
      
      // Don't retry on client errors (4xx) - they won't succeed on retry
      if (isClientError && attempt < maxRetries) {
        console.warn(`Client error (${errorMessage.substring(0, 100)}), skipping retries`);
        throw lastError;
      }
      
      // Retry network and server errors
      if (attempt < maxRetries && (isNetworkError || isServerError)) {
        const delay = initialDelay * Math.pow(2, attempt);
        const errorType = isNetworkError ? 'network' : 'server';
        console.warn(
          `[SwarmUI] Attempt ${attempt + 1}/${maxRetries + 1} failed (${errorType} error), ` +
          `retrying in ${delay}ms...\n` +
          `Error: ${errorMessage.substring(0, 200)}`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (attempt < maxRetries) {
        // Retry other errors with warning
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `[SwarmUI] Attempt ${attempt + 1}/${maxRetries + 1} failed, ` +
          `retrying in ${delay}ms...\n` +
          `Error: ${errorMessage.substring(0, 200)}`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Log all retry attempts for debugging
  if (errors.length > 1) {
    console.error(`[SwarmUI] All ${errors.length} retry attempts failed:`);
    errors.forEach((e, i) => {
      console.error(`  Attempt ${e.attempt}: ${e.error.substring(0, 150)}`);
    });
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * Initialize a SwarmUI session for image generation.
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns A promise that resolves with the session ID
 * @throws Error if session initialization fails after retries
 */
export const initializeSession = async (maxRetries: number = 3): Promise<string> => {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(`${SWARMUI_API_BASE_URL}/API/GetNewSession`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `SwarmUI session initialization failed (HTTP ${response.status})`;
        
        // User-friendly error messages with actionable suggestions
        if (response.status === 404) {
          errorMessage = `SwarmUI API endpoint not found. Please verify:\n` +
            `1. SwarmUI is running at ${SWARMUI_API_BASE_URL}\n` +
            `2. The API URL is correct in your .env file\n` +
            `3. SwarmUI version supports the /API/GetNewSession endpoint`;
        } else if (response.status === 500) {
          errorMessage = `SwarmUI server error. Please check:\n` +
            `1. SwarmUI logs for errors\n` +
            `2. SwarmUI service is fully started\n` +
            `3. Try restarting SwarmUI`;
        } else if (response.status === 503) {
          errorMessage = `SwarmUI service unavailable. Please check:\n` +
            `1. SwarmUI is running\n` +
            `2. No other process is using the same port\n` +
            `3. Try restarting SwarmUI`;
        } else {
          errorMessage += `\n\nDetails: ${errorBody}\n\nTroubleshooting:\n` +
            `1. Verify SwarmUI is running: curl ${SWARMUI_API_BASE_URL}/API/GetNewSession\n` +
            `2. Check SwarmUI logs for errors\n` +
            `3. Verify network connectivity to ${SWARMUI_API_BASE_URL}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.session_id) {
        throw new Error('SwarmUI session initialization failed: No session_id in response');
      }

      return result.session_id;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `SwarmUI session initialization timed out after 30 seconds.\n\n` +
          `Troubleshooting:\n` +
          `1. Check if SwarmUI is running: ${SWARMUI_API_BASE_URL}\n` +
          `2. Verify SwarmUI is not overloaded (check queue status)\n` +
          `3. Check network connectivity and firewall settings\n` +
          `4. Try restarting SwarmUI service`
        );
      }
      
      throw error;
    }
  }, maxRetries);
};

/**
 * Generate images using SwarmUI's native API endpoint.
 * 
 * Sends generation request to SwarmUI with prompt text and session ID.
 * Returns image paths in various formats (filename, relative, or absolute).
 * Includes retry logic with exponential backoff for network/server errors.
 * 
 * @param prompt - The prompt text (with stage directions intrinsic)
 * @param imagesCount - Number of images to generate per prompt (default: 3)
 * @param sessionId - The SwarmUI session ID from initializeSession()
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise that resolves to ImageGenerationResult with success status and image paths
 * @throws Error if generation fails after all retries
 * 
 * @example
 * ```typescript
 * const sessionId = await initializeSession();
 * const result = await generateImages('A beautiful sunset', 3, sessionId);
 * if (result.success && result.imagePaths) {
 *   console.log('Generated images:', result.imagePaths);
 * }
 * ```
 */
export const generateImages = async (
  prompt: string,
  imagesCount: number = 3,
  sessionId: string,
  maxRetries: number = 3
): Promise<ImageGenerationResult> => {
  try {
    return await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for generation
      
      try {
        const response = await fetch(`${SWARMUI_API_BASE_URL}/API/Generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            prompt: prompt,
            images_count: imagesCount,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          let errorMessage = `Image generation failed (HTTP ${response.status})`;
          
          // User-friendly error messages with actionable suggestions
          if (response.status === 400) {
            errorMessage = `Invalid generation request. Please check:\n` +
              `1. Prompt is not empty\n` +
              `2. Session ID is valid\n` +
              `3. Request parameters are correct\n\n` +
              `Details: ${errorBody}`;
          } else if (response.status === 404) {
            errorMessage = `Generation endpoint not found. Please verify:\n` +
              `1. SwarmUI version supports /API/Generate endpoint\n` +
              `2. API URL is correct: ${SWARMUI_API_BASE_URL}\n` +
              `3. SwarmUI is fully started`;
          } else if (response.status === 500 || response.status === 503) {
            errorMessage = `SwarmUI server error during generation. Please check:\n` +
              `1. SwarmUI logs for model loading errors\n` +
              `2. GPU memory availability\n` +
              `3. SwarmUI service health\n` +
              `4. Try restarting SwarmUI if errors persist\n\n` +
              `Details: ${errorBody}`;
          } else {
            errorMessage += `\n\nDetails: ${errorBody}\n\nTroubleshooting:\n` +
              `1. Check SwarmUI logs\n` +
              `2. Verify SwarmUI is running and healthy\n` +
              `3. Try generating with a simpler prompt first`;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        
        // SwarmUI returns image_paths array (may be filename, relative, or absolute)
        const imagePaths = result.image_paths || [];
        
        return {
          success: true,
          imagePaths: imagePaths,
          metadata: {
            prompt: prompt,
            model: 'flux1-dev-fp8', // SwarmUI handles model internally
            dimensions: { width: 0, height: 0 }, // Not provided by native API
            parameters: {
              steps: 0,
              cfgScale: 0,
              seed: 0,
            },
            contextSource: 'manual',
            tacticalOverrideApplied: false,
            artifactsUsed: 0,
            characterContextsUsed: 0,
          }
        };
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(
            `Image generation timed out after 5 minutes.\n\n` +
            `Possible causes:\n` +
            `1. SwarmUI queue is very long (check queue status)\n` +
            `2. GPU is overloaded or out of memory\n` +
            `3. Model is taking longer than expected\n` +
            `4. Network connectivity issues\n\n` +
            `Troubleshooting:\n` +
            `1. Check SwarmUI queue: ${SWARMUI_API_BASE_URL}/API/GetQueueStatus\n` +
            `2. Monitor GPU usage and memory\n` +
            `3. Try generating fewer images per request\n` +
            `4. Check SwarmUI logs for errors`
          );
        }
        
        throw error;
      }
    }, maxRetries);
  } catch (error) {
    console.error("Failed to generate images:", error);
    
    // Provide user-friendly error message
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Add retry suggestion for network errors
    if (error instanceof Error && (
      error.message.includes('fetch') || 
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Failed to fetch')
    )) {
      errorMessage += `\n\nRetry suggestion: Check network connectivity and SwarmUI service status.`;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Get the current queue status from SwarmUI.
 * Note: This endpoint may not be available in all SwarmUI versions.
 * 
 * @returns A promise that resolves with queue status including length and current generation
 * @throws Error if endpoint is not available or request fails
 */
export const getQueueStatus = async (): Promise<QueueStatus> => {
  try {
    const response = await fetch(`${SWARMUI_API_BASE_URL}/API/GetQueueStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      // If endpoint doesn't exist (404), return default values
      if (response.status === 404) {
        console.warn('GetQueueStatus endpoint not available in this SwarmUI version');
        return {
          queue_length: 0,
          current_generation: null,
        };
      }
      const errorBody = await response.text();
      throw new Error(`SwarmUI Queue Status Error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    return {
      queue_length: result.queue_length || 0,
      current_generation: result.current_generation || null,
    };
  } catch (error) {
    // If it's a network error or endpoint doesn't exist, return defaults
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('fetch'))) {
      console.warn('GetQueueStatus endpoint not available, returning default values');
      return {
        queue_length: 0,
        current_generation: null,
      };
    }
    console.error("Failed to get queue status:", error);
    throw error instanceof Error ? error : new Error('Unknown error occurred while getting queue status');
  }
};

/**
 * Get generation statistics from SwarmUI.
 * Note: This endpoint may not be available in all SwarmUI versions.
 * 
 * @returns A promise that resolves with generation statistics
 * @throws Error if endpoint is not available or request fails
 */
export const getGenerationStatistics = async (): Promise<GenerationStats> => {
  try {
    const response = await fetch(`${SWARMUI_API_BASE_URL}/API/GetStats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      // If endpoint doesn't exist (404), return default values
      if (response.status === 404) {
        console.warn('GetStats endpoint not available in this SwarmUI version');
        return {
          total_generations: 0,
          average_generation_time: 0,
        };
      }
      const errorBody = await response.text();
      throw new Error(`SwarmUI Stats Error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    return {
      total_generations: result.total_generations || 0,
      average_generation_time: result.average_generation_time || 0,
    };
  } catch (error) {
    // If it's a network error or endpoint doesn't exist, return defaults
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('fetch'))) {
      console.warn('GetStats endpoint not available, returning default values');
      return {
        total_generations: 0,
        average_generation_time: 0,
      };
    }
    console.error("Failed to get generation statistics:", error);
    throw error instanceof Error ? error : new Error('Unknown error occurred while getting statistics');
  }
};

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
