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
  console.log(`[SwarmUI] Initializing session with base URL: ${SWARMUI_API_BASE_URL}`);
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const endpoint = `${SWARMUI_API_BASE_URL}/API/GetNewSession`;
      console.log(`[SwarmUI] Attempting to connect to: ${endpoint}`);
      
      // SwarmUI GetNewSession endpoint - use same format as test file
      // Send empty JSON object with Content-Type header (matches working test implementation)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty object as per test file
        signal: controller.signal,
      });
      
      console.log(`[SwarmUI] Response status: ${response.status} ${response.statusText}`);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `SwarmUI session initialization failed (HTTP ${response.status})`;
        
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
        } else {
          errorMessage += `\n\nDetails: ${errorBody}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`[SwarmUI] Session response:`, result);
      
      if (!result.session_id) {
        console.error(`[SwarmUI] Invalid response format. Expected session_id, got:`, result);
        throw new Error('SwarmUI session initialization failed: No session_id in response');
      }

      console.log(`[SwarmUI] Session initialized successfully: ${result.session_id.substring(0, 20)}...`);
      return result.session_id;
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.error(`[SwarmUI] Session initialization error:`, error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(
          `SwarmUI session initialization timed out after 30 seconds.\n\n` +
          `Troubleshooting:\n` +
          `1. Check if SwarmUI is running: ${SWARMUI_API_BASE_URL}\n` +
          `2. Verify SwarmUI is not overloaded\n` +
          `3. Check network connectivity\n` +
          `4. Try restarting SwarmUI service`
        );
        console.error(`[SwarmUI]`, timeoutError.message);
        throw timeoutError;
      }
      
      // Log fetch errors with more detail
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          console.error(`[SwarmUI] Network error connecting to ${SWARMUI_API_BASE_URL}:`, error.message);
          console.error(`[SwarmUI] This usually means:`);
          console.error(`  - SwarmUI is not running`);
          console.error(`  - SwarmUI is running on a different port`);
          console.error(`  - CORS is blocking the request (if from browser)`);
          console.error(`  - Firewall is blocking the connection`);
        }
      }
      
      throw error;
    }
  }, maxRetries);
};

/**
 * Create or update a SwarmUI preset with default StoryArt parameters.
 * 
 * @param presetName - Name of the preset to create/update
 * @param sessionId - SwarmUI session ID
 * @param options - Optional parameters to include in preset (defaults to StoryArt defaults)
 * @returns Promise that resolves to true if preset was created/updated successfully
 */
export const createSwarmUIPreset = async (
  presetName: string,
  sessionId: string,
  options?: SwarmUIGenerationOptions
): Promise<boolean> => {
  try {
    const model = options?.model || getEnvVar('SWARMUI_MODEL') || 'flux1-dev-fp8';
    const width = options?.width || parseInt(getEnvVar('SWARMUI_WIDTH') || '1088');
    const height = options?.height || parseInt(getEnvVar('SWARMUI_HEIGHT') || '1920');
    const sampler = options?.sampler || getEnvVar('SWARMUI_SAMPLER') || 'euler';
    const scheduler = options?.scheduler || getEnvVar('SWARMUI_SCHEDULER') || 'simple';
    const steps = options?.steps || parseInt(getEnvVar('SWARMUI_STEPS') || '20');
    const cfgscale = options?.cfgscale || parseFloat(getEnvVar('SWARMUI_CFG_SCALE') || '1');
    // Generate random seed if -1, otherwise use provided seed
    let seed = options?.seed ?? parseInt(getEnvVar('SWARMUI_SEED') || '-1');
    if (seed === -1) {
        seed = Math.floor(Math.random() * 2147483647);
        console.log(`[SwarmUI] Generated random seed: ${seed}`);
    }
    const loras = options?.loras || getEnvVar('SWARMUI_LORAS') || '';
    const loraweights = options?.loraweights || getEnvVar('SWARMUI_LORA_WEIGHTS') || '';
    const aspectratio = options?.aspectratio;

    // Build param_map matching SwarmUI preset format (all values as strings)
    const paramMap: any = {
      images: "1", // Default to 1, can be overridden per request
      seed: seed.toString(),
      steps: steps.toString(),
      cfgscale: cfgscale.toString(),
      sampler: sampler,
      scheduler: scheduler,
    };

    // Use aspectratio if provided, otherwise use width/height
    if (aspectratio) {
      paramMap.aspectratio = aspectratio;
    } else {
      paramMap.width = width.toString();
      paramMap.height = height.toString();
    }

    if (model) {
      paramMap.model = model;
    }

    if (loras) {
      paramMap.loras = loras;
      paramMap.loraweights = loraweights || "1";
    }

    const requestBody = {
      title: presetName,
      description: `StoryArt default preset: ${presetName}`,
      raw: {
        param_map: paramMap
      },
      is_edit: true, // Update if exists
      editing: presetName
    };

    console.log(`[SwarmUI] Creating/updating preset: ${presetName}`);

    const response = await fetch(`${SWARMUI_API_BASE_URL}/API/AddNewPreset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`[SwarmUI] Failed to create preset: ${errorBody}`);
      return false;
    }

    const result = await response.json();
    if (result.success) {
      console.log(`[SwarmUI] ✅ Preset "${presetName}" created/updated successfully`);
      return true;
    } else if (result.preset_fail) {
      console.warn(`[SwarmUI] Preset creation failed: ${result.preset_fail}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[SwarmUI] Error creating preset:`, error);
    return false;
  }
};

/**
 * Generation options for SwarmUI (Flux-specific)
 */
export interface SwarmUIGenerationOptions {
  model?: string;
  width?: number;
  height?: number;
  sampler?: string;
  scheduler?: string;
  steps?: number;
  cfgscale?: number;
  fluxguidancescale?: number;
  seed?: number;
  variationseed?: number; // Variation seed (optional, for image variations)
  automaticvae?: boolean;
  sdtextencs?: string;
  loras?: string;
  loraweights?: string;
  negativeprompt?: string;
  preset?: string; // Optional preset name (DISABLED - use explicit parameters instead)
  aspectratio?: string; // Optional aspect ratio (e.g., "16:9", "9:16") - alternative to width/height
}

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
 * @param options - Optional generation parameters (model, width, height, etc.)
 * @returns Promise that resolves to ImageGenerationResult with success status and image paths
 * @throws Error if generation fails after all retries
 *
 * @example
 * ```typescript
 * const sessionId = await initializeSession();
 * const result = await generateImages('A beautiful sunset', 3, sessionId, 3, {
 *   width: 1024,
 *   height: 1024,
 *   model: 'OfficialStableDiffusion/sd_xl_base_1.0'
 * });
 * if (result.success && result.imagePaths) {
 *   console.log('Generated images:', result.imagePaths);
 * }
 * ```
 */
export const generateImages = async (
  prompt: string,
  imagesCount: number = 3,
  sessionId: string,
  maxRetries: number = 3,
  options?: SwarmUIGenerationOptions
): Promise<ImageGenerationResult> => {
  try {
    return await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for generation
      
      try {
        // Use SwarmUI's native GenerateText2Image API endpoint
        console.log(`[SwarmUI] Generating with session ID: ${sessionId.substring(0, 20)}...`);

        // Get generation options with defaults matching exact duplicate test config
        // Exact config: 1344x768, steps: 40, scheduler: simple, cfgscale: 1, sampler: euler
        // Tested and verified - produces images matching manual generation
        const model = options?.model || getEnvVar('SWARMUI_MODEL') || 'flux1-dev-fp8';
        const width = options?.width || parseInt(getEnvVar('SWARMUI_WIDTH') || '1344');
        const height = options?.height || parseInt(getEnvVar('SWARMUI_HEIGHT') || '768');
        const sampler = options?.sampler || getEnvVar('SWARMUI_SAMPLER') || 'euler';
        const scheduler = options?.scheduler || getEnvVar('SWARMUI_SCHEDULER') || 'simple';
        const steps = options?.steps || parseInt(getEnvVar('SWARMUI_STEPS') || '40');
        const cfgscale = options?.cfgscale || parseFloat(getEnvVar('SWARMUI_CFG_SCALE') || '1');
        const fluxguidancescale = options?.fluxguidancescale || parseFloat(getEnvVar('SWARMUI_FLUX_GUIDANCE_SCALE') || '3.5');
        // Generate random seed if -1, otherwise use provided seed
        // SwarmUI may not interpret -1 as "random" - we handle it explicitly
        let seed = options?.seed ?? parseInt(getEnvVar('SWARMUI_SEED') || '-1');
        if (seed === -1) {
            seed = Math.floor(Math.random() * 2147483647); // Random 32-bit integer
            console.log(`[SwarmUI] Generated random seed: ${seed}`);
        }
        const automaticvae = options?.automaticvae ?? true; // Default true (matches exact config)
        const sdtextencs = options?.sdtextencs || getEnvVar('SWARMUI_SD_TEXT_ENCS') || 'CLIP + T5';
        const loras = options?.loras || getEnvVar('SWARMUI_LORAS') || 'gargan';
        const loraweights = options?.loraweights || getEnvVar('SWARMUI_LORA_WEIGHTS') || '1';
        const negativeprompt = options?.negativeprompt || getEnvVar('SWARMUI_NEGATIVE_PROMPT') || '';
        const variationseed = options?.variationseed; // Optional variation seed

        const endpoint = `${SWARMUI_API_BASE_URL}/API/GenerateText2Image`;

        console.log(`[SwarmUI] Using endpoint: ${endpoint}`);
        console.log(`[SwarmUI] Parameters: ${imagesCount} images, ${width}x${height}, model: ${model}, sampler: ${sampler}`);
        if (loras) {
          console.log(`[SwarmUI] LoRAs: ${loras} (weight: ${loraweights || '1'})`);
        }

        // Build rawInput object with all T2I parameters as per SwarmUI API spec
        // DECISION: Use explicit parameters (matching manual frog config) instead of presets
        // Presets are unreliable - aspectratio override doesn't work, produces wrong resolution
        // Explicit parameters are reliable, predictable, and match working manual config
        const rawInput: any = {
          prompt: prompt,
        };

        // Always send explicit parameters (matching manual frog config)
        rawInput.model = model;
        rawInput.sampler = sampler;
        rawInput.scheduler = scheduler;
        rawInput.steps = steps.toString();
        rawInput.cfgscale = cfgscale.toString();
        rawInput.seed = seed.toString();
        rawInput.automaticvae = automaticvae;
        rawInput.sdtextencs = sdtextencs;
        
        // Use width/height (matching manual frog: 1344x768) instead of aspectratio
        // aspectratio is unreliable - use explicit dimensions
        if (options?.aspectratio && !options?.width && !options?.height) {
          // Only use aspectratio if width/height not explicitly provided
          rawInput.aspectratio = options.aspectratio;
          console.log(`[SwarmUI] Using aspect ratio: ${options.aspectratio}`);
        } else {
          // Prefer explicit width/height (more reliable)
          rawInput.width = width;
          rawInput.height = height;
        }

        if (fluxguidancescale !== undefined) {
          rawInput.fluxguidancescale = fluxguidancescale.toString();
        }

        // Add variation seed if provided
        if (variationseed !== undefined) {
          rawInput.variationseed = variationseed.toString();
        }

        // Override with explicit parameters if provided
        if (options?.model) rawInput.model = options.model;
        if (options?.sampler) rawInput.sampler = options.sampler;
        if (options?.scheduler) rawInput.scheduler = options.scheduler;
        if (options?.steps !== undefined) rawInput.steps = options.steps.toString();
        if (options?.cfgscale !== undefined) rawInput.cfgscale = options.cfgscale.toString();
        if (options?.seed !== undefined) rawInput.seed = options.seed.toString();
        if (options?.variationseed !== undefined) rawInput.variationseed = options.variationseed.toString();
        
        // Handle width/height overrides (prefer explicit dimensions over aspectratio)
        if (options?.width || options?.height) {
          if (options.width) rawInput.width = options.width;
          if (options.height) rawInput.height = options.height;
          // Remove aspectratio if width/height are explicitly set (they conflict)
          delete rawInput.aspectratio;
        } else if (options?.aspectratio) {
          // Only use aspectratio if width/height not provided
          rawInput.aspectratio = options.aspectratio;
          delete rawInput.width;
          delete rawInput.height;
        }

        if (loras) {
          rawInput.loras = loras;
        }

        if (loraweights) {
          rawInput.loraweights = loraweights;
        }

        if (negativeprompt) {
          rawInput.negativeprompt = negativeprompt;
        }

        // SwarmUI API expects all parameters at ROOT level, not nested in rawInput
        // SwarmUI logs show: "rawInput parameter is unrecognized" - parameters must be at root
        // The API docs note: "all params go on the same level as images, session_id, etc."
        const requestBody: any = {
          images: imagesCount,
          session_id: sessionId,
          // All T2I parameters go at root level (not nested in rawInput)
          prompt: rawInput.prompt,
        };

        // Add model (required) - use from rawInput or fallback
        if (rawInput.model) {
          requestBody.model = rawInput.model;
        } else if (model) {
          requestBody.model = model;
        }

        // Add all parameters at root level (explicit parameters, matching manual frog config)
        if (rawInput.sampler) requestBody.sampler = rawInput.sampler;
        if (rawInput.scheduler) requestBody.scheduler = rawInput.scheduler;
        if (rawInput.steps) requestBody.steps = rawInput.steps;
        if (rawInput.cfgscale) requestBody.cfgscale = rawInput.cfgscale;
        if (rawInput.seed) requestBody.seed = rawInput.seed;
        if (rawInput.variationseed) requestBody.variationseed = rawInput.variationseed;
        
        // Handle aspectratio/width/height (prefer explicit width/height)
        if (rawInput.width && rawInput.height) {
          // Explicit width/height (more reliable, matches manual frog: 1344x768)
          requestBody.width = rawInput.width;
          requestBody.height = rawInput.height;
        } else if (rawInput.aspectratio) {
          // Fallback to aspectratio if width/height not set
          requestBody.aspectratio = rawInput.aspectratio;
        }
        if (rawInput.fluxguidancescale) requestBody.fluxguidancescale = rawInput.fluxguidancescale;
        if (rawInput.automaticvae !== undefined) requestBody.automaticvae = rawInput.automaticvae;
        if (rawInput.sdtextencs) requestBody.sdtextencs = rawInput.sdtextencs;
        if (rawInput.loras) requestBody.loras = rawInput.loras;
        if (rawInput.loraweights) requestBody.loraweights = rawInput.loraweights;
        if (rawInput.negativeprompt) requestBody.negativeprompt = rawInput.negativeprompt;

        console.log(`[SwarmUI] ========== SENDING TO SWARMUI ==========`);
        console.log(`[SwarmUI] PROMPT BEING SENT:`);
        console.log(`[SwarmUI] >>> ${requestBody.prompt} <<<`);
        console.log(`[SwarmUI] Request body keys:`, Object.keys(requestBody));
        console.log(`[SwarmUI] Images requested: ${requestBody.images}`);
        console.log(`[SwarmUI] Dimensions: ${requestBody.width}x${requestBody.height}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        console.log(`[SwarmUI] Response status: ${response.status}`);

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          let errorMessage = `Image generation failed (HTTP ${response.status})`;
          
          // User-friendly error messages with actionable suggestions
          if (response.status === 400) {
            // Check if it's a session ID error
            if (errorBody.includes('session') || errorBody.includes('Session')) {
              errorMessage = `Invalid session ID. Please check:\n` +
                `1. Session was properly initialized\n` +
                `2. Session ID is valid: ${sessionId}\n` +
                `3. Try reinitializing the session\n\n` +
                `Details: ${errorBody}`;
            } else {
              errorMessage = `Invalid generation request. Please check:\n` +
                `1. Prompt is not empty\n` +
                `2. Session ID is valid\n` +
                `3. Request parameters are correct\n\n` +
                `Details: ${errorBody}`;
            }
          } else if (response.status === 404) {
            errorMessage = `Generation endpoint not found. Please verify:\n` +
              `1. SwarmUI is running at ${SWARMUI_API_BASE_URL}\n` +
              `2. SwarmUI native API endpoint is available: /API/GenerateText2Image\n` +
              `3. SwarmUI is fully started and API is enabled\n` +
              `4. Check SwarmUI logs for API route errors\n\n` +
              `Response: ${errorBody}`;
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
        
        // SwarmUI API returns images array per documentation:
        // "images": ["View/local/raw/2024-01-02/0304-a photo of a cat-etc-1.png", ...]
        let imagePaths: string[] = [];
        
        if (result.images && Array.isArray(result.images)) {
          // API returns array of image paths (or data URLs in some cases)
          imagePaths = result.images;
        } else if (result.image_paths) {
          // Fallback for older API versions or alternative response format
          imagePaths = Array.isArray(result.image_paths) ? result.image_paths : [result.image_paths];
        } else {
          console.warn('[SwarmUI] Unexpected response format:', result);
          throw new Error('SwarmUI API returned unexpected response format. Expected "images" array.');
        }
        
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
 * @param sessionId - Optional session ID (required by some SwarmUI versions)
 * @returns A promise that resolves with queue status including length and current generation
 * @throws Error if endpoint is not available or request fails
 */
export const getQueueStatus = async (sessionId?: string): Promise<QueueStatus> => {
  try {
    const requestBody: any = {};
    if (sessionId) {
      requestBody.session_id = sessionId;
    }
    
    const response = await fetch(`${SWARMUI_API_BASE_URL}/API/GetQueueStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
 * @param sessionId - Optional session ID (required by some SwarmUI versions)
 * @returns A promise that resolves with generation statistics
 * @throws Error if endpoint is not available or request fails
 */
export const getGenerationStatistics = async (sessionId?: string): Promise<GenerationStats> => {
  try {
    const requestBody: any = {};
    if (sessionId) {
      requestBody.session_id = sessionId;
    }
    
    const response = await fetch(`${SWARMUI_API_BASE_URL}/API/GetStats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
