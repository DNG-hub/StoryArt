// services/authService.ts

const BASE_URL = "http://localhost:8000";
// Use credentials as specified in the prompt.
const USERNAME = "dngargan@avantihealthcare.org";
const PASSWORD = "PW+dave7071";


let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

async function login(): Promise<string> {
  const url = `${BASE_URL}/api/v1/auth/login`;
  
  const formData = new URLSearchParams();
  formData.append('username', USERNAME);
  formData.append('password', PASSWORD);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}. Details: ${errorBody}`);
    }

    const result = await response.json();
    if (result.access_token) {
      cachedToken = result.access_token;
      return cachedToken as string;
    } else {
      throw new Error("Login successful, but no access token received.");
    }
  } catch (error) {
    console.error("Login request failed:", error);
    tokenPromise = null;
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