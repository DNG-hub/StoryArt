/**
 * Automation Orchestration Service
 * Coordinates the full automation pipeline:
 * 1. Notify StorySwarm when beats ready
 * 2. Wait for StorySwarm to generate prompts
 * 3. Check GPU availability
 * 4. Ensure SwarmUI is running
 * 5. Auto-trigger image generation
 */

import { checkGPUStatus, isGPUReadyForGeneration, waitForGPU } from './gpuMonitorService';
import { ensureSwarmUIRunning, checkSwarmUIStatus } from './swarmUIServiceManager';
import {
  startNotificationPolling,
  stopNotificationPolling,
  checkIfPromptsReady,
  type PromptsReadyNotification,
} from './webhookReceiverService';

export interface AutomationConfig {
  enabled: boolean;
  waitForGPU: boolean;
  autoStartSwarmUI: boolean;
  autoTriggerImageGeneration: boolean;
  maxWaitTimeMinutes: number;
}

export interface AutomationStatus {
  phase:
    | 'idle'
    | 'waiting_for_prompts'
    | 'checking_gpu'
    | 'starting_swarmui'
    | 'generating_images'
    | 'complete'
    | 'error';
  message: string;
  progress: number; // 0-100
  error?: string;
}

let currentStatus: AutomationStatus = {
  phase: 'idle',
  message: 'Automation not active',
  progress: 0,
};

let statusCallback: ((status: AutomationStatus) => void) | null = null;

/**
 * Update automation status and notify callback
 */
function updateStatus(phase: AutomationStatus['phase'], message: string, progress: number): void {
  currentStatus = { phase, message, progress };
  console.log(`[Automation] ${phase}: ${message} (${progress}%)`);
  if (statusCallback) {
    statusCallback(currentStatus);
  }
}

/**
 * Set status update callback
 */
export function setAutomationStatusCallback(callback: (status: AutomationStatus) => void): void {
  statusCallback = callback;
}

/**
 * Notify StorySwarm that beats are ready
 */
export async function notifyStorySwarmBeatsReady(
  sessionTimestamp: number,
  storyUuid: string,
  episodeNumber: number,
  totalBeats: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Automation] Notifying StorySwarm: beats ready');

    const response = await fetch('http://localhost:8050/api/v1/trigger/beats-ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionTimestamp,
        storyUuid,
        episodeNumber,
        totalBeats,
      }),
    });

    if (!response.ok) {
      // StorySwarm might not be running, but that's OK
      // It will poll Redis later
      console.warn('[Automation] StorySwarm notification failed (not critical)');
      return { success: false, error: 'StorySwarm not responding' };
    }

    const result = await response.json();
    console.log('[Automation] StorySwarm notification successful');
    return { success: true };
  } catch (error) {
    console.warn('[Automation] StorySwarm notification failed (not critical):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start full automation pipeline after beats are saved
 */
export async function startAutomationPipeline(
  sessionTimestamp: number,
  storyUuid: string,
  episodeNumber: number,
  totalBeats: number,
  config: AutomationConfig,
  onImageGenerationTrigger: () => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: 'Automation not enabled' };
  }

  try {
    updateStatus('waiting_for_prompts', 'Notifying StorySwarm and waiting for prompts...', 10);

    // Step 1: Notify StorySwarm
    await notifyStorySwarmBeatsReady(sessionTimestamp, storyUuid, episodeNumber, totalBeats);

    // Step 2: Wait for prompts (with timeout)
    const promptsReady = await waitForPrompts(sessionTimestamp, config.maxWaitTimeMinutes * 60 * 1000);

    if (!promptsReady) {
      throw new Error('Timeout waiting for prompts from StorySwarm');
    }

    updateStatus('waiting_for_prompts', 'Prompts received from StorySwarm', 40);

    // Step 3: Check GPU availability (if configured)
    if (config.waitForGPU) {
      updateStatus('checking_gpu', 'Checking GPU availability...', 50);

      const gpuStatus = await checkGPUStatus();
      console.log('[Automation] GPU status:', gpuStatus);

      if (!gpuStatus.available) {
        throw new Error('GPU not available');
      }

      const gpuReady = await isGPUReadyForGeneration();

      if (!gpuReady) {
        updateStatus('checking_gpu', 'Waiting for GPU to become available...', 55);
        const gpuAvailable = await waitForGPU(5 * 60 * 1000); // 5 minute timeout

        if (!gpuAvailable) {
          throw new Error('GPU busy - timeout waiting for availability');
        }
      }
    }

    updateStatus('checking_gpu', 'GPU available', 60);

    // Step 4: Ensure SwarmUI is running (if configured)
    if (config.autoStartSwarmUI) {
      updateStatus('starting_swarmui', 'Ensuring SwarmUI is running...', 70);

      const swarmUIRunning = await ensureSwarmUIRunning();

      if (!swarmUIRunning) {
        throw new Error('Failed to start SwarmUI');
      }
    } else {
      // Just check if it's running
      const swarmUIStatus = await checkSwarmUIStatus();
      if (!swarmUIStatus.responsive) {
        throw new Error('SwarmUI not running (auto-start disabled)');
      }
    }

    updateStatus('starting_swarmui', 'SwarmUI ready', 80);

    // Step 5: Auto-trigger image generation (if configured)
    if (config.autoTriggerImageGeneration) {
      updateStatus('generating_images', 'Triggering image generation...', 90);

      await onImageGenerationTrigger();

      updateStatus('complete', 'Automation pipeline complete', 100);
      return { success: true };
    } else {
      updateStatus('complete', 'Ready for manual image generation', 100);
      return { success: true };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateStatus('error', errorMessage, 0);
    console.error('[Automation] Pipeline failed:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Wait for prompts to be ready in Redis
 */
async function waitForPrompts(sessionTimestamp: number, timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < timeoutMs) {
    attempts++;

    const ready = await checkIfPromptsReady(sessionTimestamp);

    if (ready) {
      console.log(`[Automation] Prompts ready after ${attempts} checks`);
      return true;
    }

    // Wait 10 seconds between checks
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  return false;
}

/**
 * Get current automation status
 */
export function getAutomationStatus(): AutomationStatus {
  return currentStatus;
}

/**
 * Cancel automation pipeline
 */
export function cancelAutomation(): void {
  updateStatus('idle', 'Automation cancelled', 0);
  stopNotificationPolling();
}
