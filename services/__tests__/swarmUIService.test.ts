// services/__tests__/swarmUIService.test.ts
// Unit tests for SwarmUI Service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeSession, generateImages, getQueueStatus, getGenerationStatistics } from '../swarmUIService';

// Mock fetch globally
global.fetch = vi.fn();

describe('SwarmUI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeSession', () => {
    it('should initialize a SwarmUI session successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ session_id: 'test-session-123' }),
      };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      const sessionId = await initializeSession();

      expect(sessionId).toBe('test-session-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/API/GetNewSession'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should retry on network failure', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ session_id: 'test-session-123' }),
      };
      
      // First call fails, second succeeds
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse as Response);

      const sessionId = await initializeSession(3);

      expect(sessionId).toBe('test-session-123');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error if session initialization fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      };
      
      vi.mocked(global.fetch).mockResolvedValue(mockResponse as Response);

      await expect(initializeSession(1)).rejects.toThrow();
    }, 10000);

    it('should handle timeout errors', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(initializeSession(1)).rejects.toThrow();
    });
  });

  describe('generateImages', () => {
    it('should generate images successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          image_paths: ['image1.png', 'image2.png', 'image3.png'],
        }),
      };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      const result = await generateImages('test prompt', 3, 'test-session-123');

      expect(result.success).toBe(true);
      expect(result.imagePaths).toEqual(['image1.png', 'image2.png', 'image3.png']);
    });

    it('should handle generation errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Server error',
      };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      const result = await generateImages('test prompt', 3, 'test-session-123', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout during generation', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const result = await generateImages('test prompt', 3, 'test-session-123', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getQueueStatus', () => {
    it('should get queue status successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          queue_length: 5,
          current_generation: { prompt: 'test', status: 'processing' },
        }),
      };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      const status = await getQueueStatus();

      expect(status.queue_length).toBe(5);
      expect(status.current_generation).toBeDefined();
    });

    it('should return default values if endpoint not available', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      const status = await getQueueStatus();

      expect(status.queue_length).toBe(0);
      expect(status.current_generation).toBeNull();
    });
  });

  describe('getGenerationStatistics', () => {
    it('should get generation statistics successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          average_generation_time: 15000,
          total_generations: 100,
          success_rate: 0.95,
        }),
      };
      
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as Response);

      const stats = await getGenerationStatistics();

      expect(stats.average_generation_time).toBe(15000);
      expect(stats.total_generations).toBe(100);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(getGenerationStatistics()).rejects.toThrow();
    });
  });
});

