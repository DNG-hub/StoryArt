// services/storyTellerService.ts
// Service for communicating with StoryTeller API endpoints

import { getToken, clearTokenCache } from './authService';

// Support both Vite (browser) and Node.js environments
const BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_STORYTELLER_API_URL)
  || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORYTELLER_API_URL)
  || 'http://localhost:8000';

/**
 * Generation result for a single format (cinematic or vertical)
 */
export interface GenerationResultItem {
  format_type: string;
  prompt: string;
  generated_images: string[];
  metadata?: Record<string, any>;
}

/**
 * Generation results for a single beat
 */
export interface BeatGenerationResult {
  beat_id: string;
  scene_number: number;
  generation_results: GenerationResultItem[];
  narrative_context?: string;
  metadata?: Record<string, any>;
}

/**
 * Request payload for creating an image review session
 */
export interface CreateReviewSessionRequest {
  episode_number: number;
  generation_results: BeatGenerationResult[];
  generation_timestamp?: string;
  story_id?: string;
  story_uuid?: string;
  story_name?: string;
  image_folder_path?: string;
  image_folder_date?: string;
  processing_id?: string;
  model_name?: string;
  lora_name?: string;
  images_per_prompt?: number;
}

/**
 * Response from creating an image review session
 */
export interface CreateReviewSessionResponse {
  success: boolean;
  session_id: string;
  episode_number: number;
  total_images: number;
  total_prompts: number;
  status: string;
  message: string;
}

/**
 * Creates an image review session in StoryTeller.
 *
 * This should be called after bulk image generation completes in StoryArt.
 * The session persists in StoryTeller's PostgreSQL database, making images
 * available for review in the Image Review page.
 *
 * @param request - The session creation request with generation results
 * @returns Promise resolving to the session creation response
 * @throws Error if the API call fails
 *
 * @example
 * ```typescript
 * const response = await createImageReviewSession({
 *   episode_number: 1,
 *   generation_results: [
 *     {
 *       beat_id: 's1-b1',
 *       scene_number: 1,
 *       generation_results: [
 *         {
 *           format_type: '16:9_cinematic',
 *           prompt: 'A dramatic scene...',
 *           generated_images: ['C:/path/to/image1.png', 'C:/path/to/image2.png']
 *         }
 *       ]
 *     }
 *   ],
 *   story_name: 'Cat & Daniel'
 * });
 * ```
 */
export async function createImageReviewSession(
  request: CreateReviewSessionRequest,
  retryCount: number = 0
): Promise<CreateReviewSessionResponse> {
  const token = await getToken();
  const url = `${BASE_URL}/api/v1/image-review/sessions`;

  console.log('[StoryTellerService] Creating image review session:', {
    episode_number: request.episode_number,
    beats_count: request.generation_results.length,
    story_name: request.story_name
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      // If unauthorized and haven't retried yet, clear cache and retry
      if (response.status === 401 && retryCount < 1) {
        console.warn('[StoryTellerService] Token expired (401), refreshing and retrying...');
        clearTokenCache();
        return createImageReviewSession(request, retryCount + 1);
      }

      const errorText = await response.text();
      console.error('[StoryTellerService] Failed to create review session:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(
        `Failed to create image review session: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data: CreateReviewSessionResponse = await response.json();

    console.log('[StoryTellerService] Review session created successfully:', {
      session_id: data.session_id,
      total_images: data.total_images,
      status: data.status
    });

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('[StoryTellerService] Network error - StoryTeller API not reachable');
      throw new Error(
        `StoryTeller API not reachable at ${BASE_URL}. ` +
        'Please ensure the StoryTeller backend is running.'
      );
    }
    throw error;
  }
}

/**
 * Health check for the StoryTeller Image Review service
 *
 * @returns Promise resolving to health status
 */
export async function checkImageReviewHealth(): Promise<{
  status: string;
  service: string;
  timestamp: string;
}> {
  const url = `${BASE_URL}/api/v1/image-review/health`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        status: 'unhealthy',
        service: 'image_review',
        timestamp: new Date().toISOString()
      };
    }
    throw error;
  }
}

/**
 * Get a review session by ID
 *
 * @param sessionId - UUID of the session
 * @returns Promise resolving to session data
 */
export async function getReviewSession(sessionId: string): Promise<{
  success: boolean;
  session: {
    id: string;
    episode_number: number;
    status: string;
    total_images: number;
    total_prompts: number;
    story_id: string | null;
    story_name: string | null;
    generation_timestamp: string | null;
    created_at: string | null;
    items_count: number;
  };
}> {
  const token = await getToken();
  const url = `${BASE_URL}/api/v1/image-review/sessions/${sessionId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get review session: ${response.status} ${errorText}`);
  }

  return await response.json();
}
