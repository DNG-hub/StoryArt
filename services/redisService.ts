// services/redisService.ts
import type { SwarmUIExportData } from '../types';

const STORAGE_KEY = 'storyart-latest-session';

// Use environment variable with fallback - check if Redis API is part of StoryTeller API or separate
const REDIS_API_BASE_URL = import.meta.env.VITE_REDIS_API_URL || 
                           import.meta.env.VITE_STORYTELLER_API_URL || 
                           'http://localhost:7802/api/v1';

export interface RedisSessionResponse {
  success: boolean;
  data?: SwarmUIExportData;
  error?: string;
  message?: string;
  storage?: 'redis' | 'memory' | 'localStorage'; // Storage source
}

/**
 * Saves session data to Redis API (or localStorage fallback)
 */
export const saveSessionToRedis = async (data: SwarmUIExportData): Promise<void> => {
  // Try Redis API first
  const storyTellerUrl = import.meta.env.VITE_STORYTELLER_API_URL || 'http://localhost:8000';
  const endpoints = [
    `${REDIS_API_BASE_URL}/session/save`,
    `${storyTellerUrl}/api/v1/session/save`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Session saved to Redis API');
          return;
        }
      }
    } catch (error) {
      // Continue to next endpoint or fallback
      continue;
    }
  }

  // Fallback to localStorage if Redis API is not available
  saveSessionToLocalStorage(data);
};

/**
 * Saves session data to localStorage (fallback when Redis API is not available)
 */
const saveSessionToLocalStorage = (data: SwarmUIExportData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Failed to save session to localStorage:', error);
  }
};

/**
 * Gets session data from localStorage (fallback when Redis API is not available)
 */
const getSessionFromLocalStorage = (): SwarmUIExportData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Remove timestamp before returning
    const { timestamp, ...sessionData } = parsed;
    return sessionData as SwarmUIExportData;
  } catch (error) {
    console.warn('Failed to read session from localStorage:', error);
    return null;
  }
};

/**
 * Fetches the latest session data from the Redis API, with localStorage fallback.
 * 
 * @returns {Promise<RedisSessionResponse>} The API response containing session data or an error.
 */
export const getLatestSession = async (): Promise<RedisSessionResponse> => {
  // Try StoryTeller API endpoint first (if Redis is part of StoryTeller)
  const storyTellerUrl = import.meta.env.VITE_STORYTELLER_API_URL || 'http://localhost:8000';
  const endpoints = [
    `${REDIS_API_BASE_URL}/session/latest`,
    `${storyTellerUrl}/api/v1/session/latest`,
    `${storyTellerUrl}/api/v1/redis/session/latest`,
  ];

  let lastError: Error | null = null;

  // Try each endpoint until one works
  for (const endpoint of endpoints) {
    try {
      // Create abort controller for timeout (AbortSignal.timeout may not be available in all browsers)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 404 means endpoint doesn't exist - try next endpoint silently
        if (response.status === 404) {
          continue;
        }
        // For other errors, try to get error message but continue to next endpoint
        const errorData = await response.json().catch(() => ({ message: 'Unknown error with non-JSON response' }));
        lastError = new Error(`Redis API Error: ${response.status} - ${errorData.message || 'Failed to fetch session'}`);
        continue;
      }

      const result: RedisSessionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to retrieve session from Redis.');
      }

      return result;
    } catch (error) {
      // If it's a timeout, connection refused, or abort, try next endpoint silently
      if (error instanceof Error) {
        // Don't log expected errors (connection refused, timeouts) - they're normal when API doesn't exist
        const isExpectedError = error.message.includes('Failed to fetch') || 
                               error.message.includes('ERR_CONNECTION_REFUSED') ||
                               error.name === 'AbortError';
        
        if (!isExpectedError) {
          lastError = error;
        }
        
        // Continue to next endpoint for all errors
        continue;
      }
    }
  }

  // All endpoints failed - try localStorage fallback
  const localSession = getSessionFromLocalStorage();
  if (localSession) {
    return {
      success: true,
      data: localSession,
      message: 'Restored from local storage (Redis API not available)',
      storage: 'localStorage'
    };
  }

  // No session found in localStorage either
  return {
    success: false,
    error: `No session found. Redis API endpoints are not configured or the service is not running. When you analyze a script, your session will be saved locally for restoration.`,
  };
};
