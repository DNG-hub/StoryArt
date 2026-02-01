// services/authService.ts

// Support both Vite (browser) and Node.js environments
const BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_STORYTELLER_API_URL)
  || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORYTELLER_API_URL)
  || "http://localhost:8000";
let accessToken: string | null = null;
let tokenExpiry: number = 0;  // Timestamp when token expires
let tokenPromise: Promise<string> | null = null;

// Token expiration buffer - refresh 5 minutes before expiry
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Fetches a developer access token from the StoryTeller API.
 * This function caches the token in memory to avoid re-fetching on every call.
 * @returns {Promise<string>} The access token.
 */
async function fetchDevToken(): Promise<string> {
  const url = `${BASE_URL}/api/v1/auth/dev-login-working?user_type=production`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed with status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error('No access token found in auth response.');
    }

    accessToken = data.access_token;

    // Parse JWT to extract expiry time (exp claim)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      if (payload.exp) {
        // exp is in seconds, convert to milliseconds
        tokenExpiry = payload.exp * 1000;
        console.log('[Auth] Token expires at:', new Date(tokenExpiry).toISOString());
      } else {
        // Default to 1 hour if no exp claim
        tokenExpiry = Date.now() + 60 * 60 * 1000;
        console.log('[Auth] No exp claim in token, defaulting to 1 hour expiry');
      }
    } catch (e) {
      // If parsing fails, default to 1 hour
      tokenExpiry = Date.now() + 60 * 60 * 1000;
      console.warn('[Auth] Failed to parse token expiry, defaulting to 1 hour');
    }

    return accessToken as string;
  } catch (error) {
    // Check if it's a connection error (backend not running)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('⚠️ Backend server not available. Please ensure the StoryTeller API is running on', BASE_URL);
      console.warn('   Some features may not work until the backend is started.');
      // Don't throw - allow the app to continue with limited functionality
      throw new Error(`Backend server unavailable at ${BASE_URL}. Please start the StoryTeller API server.`);
    }
    console.error('Failed to fetch developer token:', error);
    throw error;
  }
}

/**
 * Gets a valid access token, fetching it if it's not already available or expired.
 * It uses a promise to prevent multiple concurrent token requests.
 * @returns {Promise<string>} A promise that resolves to the access token.
 */
export async function getToken(): Promise<string> {
  // Check if token exists and is not expired (with buffer)
  const now = Date.now();
  if (accessToken && tokenExpiry > now + TOKEN_EXPIRY_BUFFER_MS) {
    return accessToken;
  }

  // Token is expired or about to expire - clear it
  if (accessToken && tokenExpiry <= now + TOKEN_EXPIRY_BUFFER_MS) {
    console.log('[Auth] Token expired or expiring soon, refreshing...');
    accessToken = null;
    tokenExpiry = 0;
  }

  // If a token request is already in progress, return the same promise
  if (tokenPromise) {
    return tokenPromise;
  }

  // Otherwise, start a new token request
  tokenPromise = fetchDevToken().finally(() => {
    // Once the promise is settled, clear it
    tokenPromise = null;
  });

  return tokenPromise;
}

/**
 * Clears the cached token, forcing a refresh on next getToken call.
 * Call this when you receive a 401 error to force token refresh.
 */
export function clearTokenCache(): void {
  console.log('[Auth] Clearing token cache');
  accessToken = null;
  tokenExpiry = 0;
  tokenPromise = null;
}
