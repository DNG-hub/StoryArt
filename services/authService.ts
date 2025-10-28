// services/authService.ts

const BASE_URL = import.meta.env.VITE_STORYTELLER_API_URL || "http://localhost:8000";
// Use credentials as specified in the prompt.
const USERNAME = import.meta.env.VITE_STORYTELLER_TEST_USER || "dngargan@avantihealthcare.org";
const PASSWORD = import.meta.env.VITE_STORYTELLER_TEST_PASSWORD || "dave7071";


let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

async function login(): Promise<string> {
  const url = `${BASE_URL}/api/v1/auth/dev-login-working?user_type=production`;

  console.log('Starting authentication with StoryTeller API');
  console.log('URL:', url);
  console.log('BASE_URL from env:', import.meta.env.VITE_STORYTELLER_API_URL);
  console.log('Current location:', window.location.href);

  // Basic connectivity test
  try {
    console.log('Testing basic connectivity to StoryTeller API...');
    const testResponse = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      mode: 'no-cors'
    });
    console.log('Basic connectivity test completed (no-cors mode)');
  } catch (testError) {
    console.error('Basic connectivity test failed:', testError);
  }

  try {
    console.log('Sending GET request to StoryTeller API...');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Authentication failed with response:', errorBody);
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }

    const result = await response.json();
    console.log('Authentication response:', {
      hasAccessToken: !!result.access_token,
      userInfo: result.user_info,
      tokenType: result.token_type
    });

    if (result.access_token) {
      cachedToken = result.access_token;
      console.log('Successfully authenticated with StoryTeller API as:', result.user_info?.username || 'unknown user');
      return cachedToken as string;
    } else {
      throw new Error("Login successful, but no access token received.");
    }
  } catch (error) {
    console.error("Login request failed:", error);
    console.error("Error details:", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack
    });

    tokenPromise = null;

    // Check for specific network/connectivity errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Network connectivity issue detected - StoryTeller API appears unreachable');
      throw new Error('SERVICE_UNAVAILABLE');
    }

    if (error instanceof Error) {
        throw new Error(`Failed to authenticate with StoryTeller API. Please ensure the service is running. Details: ${error.message}`);
    }
     throw new Error(`Failed to authenticate with StoryTeller API. Please ensure the service is running.`);
  }
}

export async function getToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = login();
  try {
    const token = await tokenPromise;
    return token;
  } finally {
    tokenPromise = null;
  }
}