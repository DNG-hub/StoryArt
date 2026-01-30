/**
 * SwarmUI Service Manager
 * Manages SwarmUI service lifecycle (check status, start, stop)
 */

export interface SwarmUIStatus {
  running: boolean;
  apiUrl: string;
  port: number;
  version?: string;
  responsive: boolean;
  error?: string;
}

const DEFAULT_SWARMUI_PORT = 7801;
const SWARMUI_API_URL = `http://localhost:${DEFAULT_SWARMUI_PORT}`;

/**
 * Check if SwarmUI is running and responsive
 */
export async function checkSwarmUIStatus(): Promise<SwarmUIStatus> {
  try {
    // Try to ping SwarmUI API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${SWARMUI_API_URL}/API/GetNewSession`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      return {
        running: true,
        apiUrl: SWARMUI_API_URL,
        port: DEFAULT_SWARMUI_PORT,
        responsive: true,
      };
    }

    // SwarmUI not responding
    return {
      running: false,
      apiUrl: SWARMUI_API_URL,
      port: DEFAULT_SWARMUI_PORT,
      responsive: false,
      error: 'SwarmUI API not responding',
    };
  } catch (error) {
    return {
      running: false,
      apiUrl: SWARMUI_API_URL,
      port: DEFAULT_SWARMUI_PORT,
      responsive: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start SwarmUI service via backend
 * Requires backend to have service management capability
 */
export async function startSwarmUI(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[SwarmUI Manager] Starting SwarmUI service...');

    const response = await fetch('http://localhost:8000/api/v1/swarmui/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to start SwarmUI: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown error starting SwarmUI');
    }

    console.log('[SwarmUI Manager] SwarmUI service starting...');

    // Wait for SwarmUI to become responsive (up to 30 seconds)
    const isReady = await waitForSwarmUI(30000);

    if (isReady) {
      console.log('[SwarmUI Manager] SwarmUI is ready');
      return { success: true };
    } else {
      return {
        success: false,
        error: 'SwarmUI started but did not become responsive within 30 seconds',
      };
    }
  } catch (error) {
    console.error('[SwarmUI Manager] Failed to start SwarmUI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wait for SwarmUI to become responsive
 */
async function waitForSwarmUI(timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await checkSwarmUIStatus();

    if (status.responsive) {
      return true;
    }

    console.log('[SwarmUI Manager] Waiting for SwarmUI to become responsive...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return false;
}

/**
 * Ensure SwarmUI is running, start if needed
 * Returns true if SwarmUI is ready, false otherwise
 */
export async function ensureSwarmUIRunning(): Promise<boolean> {
  console.log('[SwarmUI Manager] Checking SwarmUI status...');

  const status = await checkSwarmUIStatus();

  if (status.responsive) {
    console.log('[SwarmUI Manager] SwarmUI already running');
    return true;
  }

  console.log('[SwarmUI Manager] SwarmUI not running, attempting to start...');

  const startResult = await startSwarmUI();

  if (startResult.success) {
    console.log('[SwarmUI Manager] SwarmUI started successfully');
    return true;
  } else {
    console.error('[SwarmUI Manager] Failed to start SwarmUI:', startResult.error);
    return false;
  }
}
