/**
 * GPU Monitoring Service
 * Checks NVIDIA GPU availability and utilization before triggering image generation
 */

export interface GPUStatus {
  available: boolean;
  gpuCount: number;
  utilization: number;  // 0-100%
  memoryUsed: number;   // MB
  memoryTotal: number;  // MB
  temperature: number;  // Celsius
  processCount: number; // Number of processes using GPU
  error?: string;
}

/**
 * Check GPU status using nvidia-smi
 * Requires NVIDIA drivers installed
 */
export async function checkGPUStatus(): Promise<GPUStatus> {
  try {
    // Call nvidia-smi via backend API (prevents CORS issues)
    const response = await fetch('http://localhost:8000/api/v1/gpu/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`GPU status check failed: ${response.status}`);
    }

    const status: GPUStatus = await response.json();
    return status;
  } catch (error) {
    console.warn('[GPU Monitor] Failed to check GPU status:', error);
    return {
      available: false,
      gpuCount: 0,
      utilization: 0,
      memoryUsed: 0,
      memoryTotal: 0,
      temperature: 0,
      processCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if GPU is ready for image generation
 * Returns true if GPU is available and not heavily utilized
 */
export async function isGPUReadyForGeneration(): Promise<boolean> {
  const status = await checkGPUStatus();

  if (!status.available) {
    console.warn('[GPU Monitor] GPU not available');
    return false;
  }

  // GPU is ready if:
  // 1. Utilization < 80% (not heavily loaded)
  // 2. Memory available > 4GB (enough for Flux)
  // 3. Temperature < 85°C (not overheating)
  const memoryAvailable = status.memoryTotal - status.memoryUsed;
  const isReady =
    status.utilization < 80 &&
    memoryAvailable > 4096 &&
    status.temperature < 85;

  if (!isReady) {
    console.warn('[GPU Monitor] GPU not ready for generation:', {
      utilization: `${status.utilization}%`,
      memoryAvailable: `${memoryAvailable}MB`,
      temperature: `${status.temperature}°C`,
    });
  }

  return isReady;
}

/**
 * Wait for GPU to become available
 * Polls every 5 seconds with timeout
 */
export async function waitForGPU(timeoutMs: number = 300000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const isReady = await isGPUReadyForGeneration();

    if (isReady) {
      console.log('[GPU Monitor] GPU is ready for generation');
      return true;
    }

    console.log('[GPU Monitor] GPU busy, waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.warn('[GPU Monitor] Timeout waiting for GPU');
  return false;
}
