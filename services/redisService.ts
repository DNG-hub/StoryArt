// services/redisService.ts
import type { SwarmUIExportData } from '../types';

const STORAGE_KEY = 'storyart-latest-session';

// Use environment variable with fallback - check if Redis API is part of StoryTeller API or separate
// Note: Base URL should NOT include /api/v1 - it's added per endpoint
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

const REDIS_API_BASE_URL = getEnvVar('VITE_REDIS_API_URL') || 
                           getEnvVar('REDIS_API_URL') ||
                           getEnvVar('VITE_STORYTELLER_API_URL') || 
                           getEnvVar('STORYTELLER_API_URL') ||
                           'http://localhost:7802';

export interface RedisSessionResponse {
  success: boolean;
  data?: SwarmUIExportData;
  error?: string;
  message?: string;
  storage?: 'redis' | 'memory' | 'localStorage'; // Storage source
}

export interface SessionListItem {
  timestamp: number;
  scriptText: string;
  storyUuid: string;
  analyzedEpisode?: {
    episodeNumber?: number;
    title?: string;
    scenes?: any[];
  };
}

export interface SessionListResponse {
  success: boolean;
  sessions?: SessionListItem[];
  count?: number;
  error?: string;
}

/**
 * Saves session data to Redis API (or localStorage fallback)
 */
export const saveSessionToRedis = async (data: SwarmUIExportData): Promise<{ success: boolean; storage: 'redis' | 'memory' | 'localStorage'; error?: string }> => {
  // Normalize URLs - remove trailing slashes and /api/v1 if present
  const normalizeUrl = (url: string) => {
    let normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // If it already includes /api/v1, remove it so we can add it consistently
    if (normalized.endsWith('/api/v1')) {
      normalized = normalized.slice(0, -7);
    }
    return normalized;
  };

  const redisApiUrl = normalizeUrl(REDIS_API_BASE_URL);
  const storyTellerUrl = normalizeUrl(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.STORYTELLER_API_URL) ||
    'http://localhost:8000'
  );
  const endpoints = [
    `${redisApiUrl}/api/v1/session/save`,
    `${storyTellerUrl}/api/v1/session/save`,
  ];

  let lastError: Error | null = null;

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
          console.log(`✅ Session saved to Redis API (${result.storage || 'redis'})`);
          return { success: true, storage: result.storage || 'redis' };
        } else {
          // API returned success: false
          const errorMsg = result.error || 'Unknown error from API';
          console.error(`❌ API save failed: ${errorMsg}`);
          lastError = new Error(errorMsg);
          continue;
        }
      } else {
        // Non-OK response
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorMsg = `HTTP ${response.status}: ${errorText}`;
        
        // Special handling for payload too large
        if (response.status === 413) {
          errorMsg = `Payload too large (${response.status}). The session data is too big to save. Consider reducing the number of beats or prompts.`;
        }
        
        console.error(`❌ Save endpoint failed: ${errorMsg}`);
        lastError = new Error(errorMsg);
        continue;
      }
    } catch (error) {
      // Network or other fetch errors
      if (error instanceof Error) {
        console.error(`❌ Save endpoint error (${endpoint}):`, error.message);
        lastError = error;
      }
      // Continue to next endpoint or fallback
      continue;
    }
  }

  // Fallback to localStorage if Redis API is not available
  try {
    saveSessionToLocalStorage(data);
    console.log('✅ Session saved to localStorage (fallback)');
    return { success: true, storage: 'localStorage' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to save to localStorage';
    console.error(`❌ localStorage save failed: ${errorMsg}`);
    throw new Error(`Failed to save session. Redis API unavailable and localStorage save failed: ${errorMsg}`);
  }
};

/**
 * Saves session data to localStorage (fallback when Redis API is not available)
 */
const saveSessionToLocalStorage = (data: SwarmUIExportData): void => {
  try {
    // Use provided timestamp if available, otherwise generate new one
    const timestamp = (data as any).timestamp || Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      timestamp,
    }));
    console.log(`[Redis] Saved to localStorage with timestamp ${timestamp}`);
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
 * Gets the session timestamp from localStorage
 */
export const getSessionTimestampFromLocalStorage = (): number | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed.timestamp || null;
  } catch (error) {
    console.warn('Failed to read session timestamp from localStorage:', error);
    return null;
  }
};

/**
 * Gets the full session data from localStorage INCLUDING the timestamp.
 * Used for syncing localStorage sessions to Redis.
 */
export const getFullLocalStorageSession = (): (SwarmUIExportData & { timestamp: number }) | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed.timestamp) return null;

    return parsed as (SwarmUIExportData & { timestamp: number });
  } catch (error) {
    console.warn('Failed to read full session from localStorage:', error);
    return null;
  }
};

/**
 * Fetches the latest session data from the Redis API, with localStorage fallback.
 *
 * @param skipApiCalls - If true, only check localStorage (avoids network calls and console errors)
 * @param forceRedis - If true, skip localStorage and fetch directly from Redis (ensures fresh data)
 * @returns {Promise<RedisSessionResponse>} The API response containing session data or an error.
 */
export const getLatestSession = async (skipApiCalls: boolean = false, forceRedis: boolean = false): Promise<RedisSessionResponse> => {
  // If forceRedis is true, skip localStorage entirely to get the most current data
  if (!forceRedis) {
    // Check localStorage first to avoid unnecessary network calls (and console errors)
    const localSession = getSessionFromLocalStorage();
    if (localSession) {
      return {
        success: true,
        data: localSession,
        message: 'Restored from local storage',
        storage: 'localStorage'
      };
    }
  }

  // If skipApiCalls is true, only check localStorage (which we already did above if forceRedis was false)
  if (skipApiCalls) {
    return {
      success: false,
      error: 'No session found in local storage. Redis API calls skipped to avoid console errors.',
    };
  }

  // Normalize URLs - remove trailing slashes and /api/v1 if present
  const normalizeUrl = (url: string) => {
    let normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // If it already includes /api/v1, remove it so we can add it consistently
    if (normalized.endsWith('/api/v1')) {
      normalized = normalized.slice(0, -7);
    }
    return normalized;
  };

  const redisApiUrl = normalizeUrl(REDIS_API_BASE_URL);
  const storyTellerUrl = normalizeUrl(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.STORYTELLER_API_URL) ||
    'http://localhost:8000'
  );
  const endpoints = [
    `${redisApiUrl}/api/v1/session/latest`,
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

      // Suppress browser console errors for expected 404s by catching them before fetch completes
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch((fetchError) => {
        // Network errors (connection refused, CORS, etc.) are expected when services aren't running
        // Return a fake response object that mimics a 404 to allow graceful handling
        return new Response(null, { status: 404, statusText: 'Not Found' });
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 404 means endpoint doesn't exist - try next endpoint silently
        // Don't log to console - these are expected when services aren't running
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

  // All endpoints failed - localStorage already checked at start, so no session exists
  return {
    success: false,
    error: `No session found. Redis API endpoints are not configured or the service is not running. When you analyze a script, your session will be saved locally for restoration.`,
  };
};

/**
 * Fetches the list of all saved sessions from the Redis API
 * 
 * @returns {Promise<SessionListResponse>} The API response containing session list or an error.
 */
export const getSessionList = async (): Promise<SessionListResponse> => {
  // Normalize URLs - remove trailing slashes and /api/v1 if present
  const normalizeUrl = (url: string) => {
    let normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // If it already includes /api/v1, remove it so we can add it consistently
    if (normalized.endsWith('/api/v1')) {
      normalized = normalized.slice(0, -7);
    }
    return normalized;
  };

  const redisApiUrl = normalizeUrl(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REDIS_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_REDIS_API_URL) ||
    (typeof process !== 'undefined' && process.env?.REDIS_API_URL) ||
    'http://localhost:7802'
  );
  const storyTellerUrl = normalizeUrl(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.STORYTELLER_API_URL) ||
    'http://localhost:8000'
  );
  const endpoints = [
    `${redisApiUrl}/api/v1/session/list`,
    `${storyTellerUrl}/api/v1/session/list`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch((fetchError) => {
        return new Response(null, { status: 404, statusText: 'Not Found' });
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result: SessionListResponse = await response.json();
        if (result.success && result.sessions) {
          return result;
        }
      }
    } catch (error) {
      continue;
    }
  }

  // Fallback: Check localStorage
  const localSession = getSessionFromLocalStorage();
  if (localSession) {
    return {
      success: true,
      sessions: [{
        timestamp: Date.now(),
        scriptText: localSession.scriptText,
        storyUuid: localSession.storyUuid,
        analyzedEpisode: localSession.analyzedEpisode,
      }],
      count: 1,
    };
  }

  return {
    success: false,
    error: 'No sessions found. Redis API endpoints are not configured or the service is not running.',
  };
};

/**
 * Restores a specific session by timestamp
 * 
 * @param timestamp - The timestamp of the session to restore
 * @returns {Promise<RedisSessionResponse>} The session data or an error.
 */
export const getSessionByTimestamp = async (timestamp: number): Promise<RedisSessionResponse> => {
  // Normalize URLs - remove trailing slashes and /api/v1 if present
  const normalizeUrl = (url: string) => {
    let normalized = url.trim();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    // If it already includes /api/v1, remove it so we can add it consistently
    if (normalized.endsWith('/api/v1')) {
      normalized = normalized.slice(0, -7);
    }
    return normalized;
  };

  const redisApiUrl = normalizeUrl(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REDIS_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_REDIS_API_URL) ||
    (typeof process !== 'undefined' && process.env?.REDIS_API_URL) ||
    'http://localhost:7802'
  );
  const storyTellerUrl = normalizeUrl(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_STORYTELLER_API_URL) ||
    (typeof process !== 'undefined' && process.env?.STORYTELLER_API_URL) ||
    'http://localhost:8000'
  );
  const endpoints = [
    `${redisApiUrl}/api/v1/session/${timestamp}`,
    `${storyTellerUrl}/api/v1/session/${timestamp}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch((fetchError) => {
        return new Response(null, { status: 404, statusText: 'Not Found' });
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result: RedisSessionResponse = await response.json();
        if (result.success && result.data) {
          // Ensure timestamp is in the data if it's not already there
          // The server should include it, but if not, try to extract from sessionKey
          if (!result.data.timestamp && result.data.sessionKey) {
            // Extract timestamp from sessionKey format: "storyart:session:{timestamp}"
            const match = result.data.sessionKey.match(/storyart:session:(\d+)/);
            if (match) {
              result.data.timestamp = parseInt(match[1], 10);
            }
          }
          return result;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return {
    success: false,
    error: `Session with timestamp ${timestamp} not found.`,
  };
};
