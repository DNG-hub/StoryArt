// services/authService.ts

const BASE_URL = import.meta.env.VITE_STORYTELLER_API_URL || "http://localhost:8000";
let accessToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

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
    return accessToken as string;
  } catch (error) {
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
  if (accessToken) {
    return accessToken;
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
