// services/pipelineClientService.ts
// Client-side wrapper for pipeline API endpoints
// These functions call the server-side API instead of importing Node.js-only services

import type { PipelineResult, BeatPipelineResult, PipelineProgress } from '../types';
import type { ProgressCallback } from './pipelineService';

const API_BASE_URL = import.meta.env.VITE_REDIS_API_URL || 
                     import.meta.env.VITE_STORYTELLER_API_URL || 
                     'http://localhost:7802';

/**
 * Process complete episode pipeline via API
 * 
 * @param sessionTimestamp - Session timestamp to process
 * @param progressCallback - Optional callback for progress updates
 * @param abortController - Optional AbortController for cancellation
 */
export async function processEpisodeCompletePipeline(
  sessionTimestamp: number,
  progressCallback?: ProgressCallback,
  abortController?: AbortController
): Promise<PipelineResult> {
  return new Promise((resolve, reject) => {
    // Use fetch with streaming for POST to support SSE
    fetch(`${API_BASE_URL}/api/v1/pipeline/process-episode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionTimestamp }),
      signal: abortController?.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to process episode');
        }

        // Read SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        let result: PipelineResult | null = null;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                
                if (data.type === 'progress') {
                  progressCallback?.(data.data);
                } else if (data.type === 'complete') {
                  result = data.data;
                } else if (data.type === 'error') {
                  reject(new Error(data.error));
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', trimmed);
              }
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim().startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            if (data.type === 'complete') {
              result = data.data;
            }
          } catch (e) {
            // Ignore parse errors in final buffer
          }
        }

        if (result) {
          resolve(result);
        } else {
          reject(new Error('No result received from pipeline'));
        }
      })
      .catch(reject);
  });
}

/**
 * Process single beat via API
 * 
 * @param beatId - Beat ID to process
 * @param format - Format type ('cinematic' or 'vertical')
 * @param sessionTimestamp - Optional session timestamp
 * @param progressCallback - Optional callback for progress updates
 * @param abortController - Optional AbortController for cancellation
 */
export async function processSingleBeat(
  beatId: string,
  format: 'cinematic' | 'vertical',
  sessionTimestamp?: number,
  progressCallback?: ProgressCallback,
  abortController?: AbortController
): Promise<BeatPipelineResult> {
  return new Promise((resolve, reject) => {
    fetch(`${API_BASE_URL}/api/v1/pipeline/process-beat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ beatId, format, sessionTimestamp }),
      signal: abortController?.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to process beat');
        }

        // Read SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Response body is not readable');
        }

        let result: BeatPipelineResult | null = null;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                
                if (data.type === 'progress') {
                  progressCallback?.(data.data);
                } else if (data.type === 'complete') {
                  result = data.data;
                } else if (data.type === 'error') {
                  reject(new Error(data.error));
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', trimmed);
              }
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim().startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.trim().slice(6));
            if (data.type === 'complete') {
              result = data.data;
            }
          } catch (e) {
            // Ignore parse errors in final buffer
          }
        }

        if (result) {
          resolve(result);
        } else {
          reject(new Error('No result received from pipeline'));
        }
      })
      .catch(reject);
  });
}

