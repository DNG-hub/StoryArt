// services/__tests__/pipelineService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  AnalyzedEpisode,
  BeatAnalysis,
  SwarmUIPrompt,
  ImageGenerationResult,
  OrganizationResult,
} from '../../types';
import {
  fetchPromptsFromRedis,
  generateImagesFromPrompts,
  organizeAssetsInDaVinci,
  processEpisodeCompletePipeline,
  processSingleBeat,
  type ProgressCallback,
} from '../pipelineService';

// Mock dependencies
vi.mock('../redisService', () => ({
  getSessionByTimestamp: vi.fn(),
  getLatestSession: vi.fn(),
}));

vi.mock('../swarmUIService', () => ({
  initializeSession: vi.fn(),
  generateImages: vi.fn(),
}));

vi.mock('../imagePathTracker', () => ({
  normalizeImagePath: vi.fn(),
  enhanceImagePathsWithMetadata: vi.fn(),
}));

vi.mock('../davinciProjectService', () => ({
  createEpisodeProject: vi.fn(),
  organizeSwarmUIImages: vi.fn(),
}));

import { getSessionByTimestamp, getLatestSession } from '../redisService';
import { initializeSession, generateImages } from '../swarmUIService';
import { enhanceImagePathsWithMetadata } from '../imagePathTracker';
import { createEpisodeProject, organizeSwarmUIImages } from '../davinciProjectService';

describe('Pipeline Service', () => {
  const mockTimestamp = 1704067200000;
  const mockSessionData = {
    scriptText: 'Test script',
    episodeContext: '{}',
    storyUuid: 'test-uuid',
    analyzedEpisode: {
      episodeNumber: 1,
      title: 'Test Episode',
      scenes: [
        {
          sceneNumber: 1,
          title: 'Scene 1',
          metadata: {},
          beats: [
            {
              beatId: 's1-b1',
              beat_script_text: 'Test beat',
              visualSignificance: 'High' as const,
              imageDecision: { type: 'NEW_IMAGE' as const, reason: 'Test' },
              prompts: {
                cinematic: {
                  prompt: 'Test cinematic prompt',
                  model: 'flux1-dev',
                  width: 1024,
                  height: 576,
                  steps: 28,
                  cfgscale: 7.0,
                  seed: -1,
                },
                vertical: {
                  prompt: 'Test vertical prompt',
                  model: 'flux1-dev',
                  width: 576,
                  height: 1024,
                  steps: 28,
                  cfgscale: 7.0,
                  seed: -1,
                },
              },
            },
            {
              beatId: 's1-b2',
              beat_script_text: 'Test beat 2',
              visualSignificance: 'Medium' as const,
              imageDecision: { type: 'REUSE_IMAGE' as const, reason: 'Reuse', reuseSourceBeatId: 's1-b1' },
              prompts: {
                cinematic: {
                  prompt: 'Reuse prompt',
                  model: 'flux1-dev',
                  width: 1024,
                  height: 576,
                  steps: 28,
                  cfgscale: 7.0,
                  seed: -1,
                },
              },
            },
          ],
        },
      ],
    } as AnalyzedEpisode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPromptsFromRedis', () => {
    it('should fetch and extract NEW_IMAGE prompts from Redis session', async () => {
      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });

      const prompts = await fetchPromptsFromRedis(mockTimestamp);

      expect(prompts).toHaveLength(2); // Only NEW_IMAGE beats (s1-b1 has cinematic + vertical)
      expect(prompts[0].beatId).toBe('s1-b1');
      expect(prompts[0].format).toBe('cinematic');
      expect(prompts[0].sceneNumber).toBe(1);
      expect(prompts[1].format).toBe('vertical');
    });

    it('should filter out REUSE_IMAGE beats', async () => {
      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });

      const prompts = await fetchPromptsFromRedis(mockTimestamp);

      // Should not include s1-b2 (REUSE_IMAGE)
      expect(prompts.every(p => p.beatId !== 's1-b2')).toBe(true);
    });

    it('should throw error if session fetch fails', async () => {
      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      await expect(fetchPromptsFromRedis(mockTimestamp)).rejects.toThrow('Failed to fetch session');
    });

    it('should throw error if no analyzed episode data', async () => {
      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: {
          scriptText: 'Test',
          episodeContext: '{}',
          storyUuid: 'test',
        },
      });

      await expect(fetchPromptsFromRedis(mockTimestamp)).rejects.toThrow('No analyzed episode data');
    });

    it('should skip beats without prompts', async () => {
      const sessionWithoutPrompts = {
        ...mockSessionData,
        analyzedEpisode: {
          ...mockSessionData.analyzedEpisode,
          scenes: [
            {
              sceneNumber: 1,
              title: 'Scene 1',
              metadata: {},
              beats: [
                {
                  beatId: 's1-b1',
                  beat_script_text: 'Test',
                  visualSignificance: 'High' as const,
                  imageDecision: { type: 'NEW_IMAGE' as const, reason: 'Test' },
                  // No prompts
                },
              ],
            },
          ],
        },
      };

      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: sessionWithoutPrompts,
      });

      const prompts = await fetchPromptsFromRedis(mockTimestamp);
      expect(prompts).toHaveLength(0);
    });
  });

  describe('generateImagesFromPrompts', () => {
    it('should generate images for all prompts', async () => {
      const mockSessionId = 'test-session-id';
      const mockPrompts = [
        {
          beatId: 's1-b1',
          sceneNumber: 1,
          format: 'cinematic' as const,
          prompt: {
            prompt: 'Test prompt',
            model: 'flux1-dev',
            width: 1024,
            height: 576,
            steps: 28,
            cfgscale: 7.0,
            seed: -1,
          },
          beat_script_text: 'Test beat',
        },
      ];

      vi.mocked(initializeSession).mockResolvedValue(mockSessionId);
      vi.mocked(generateImages).mockResolvedValue({
        success: true,
        imagePaths: ['image1.png', 'image2.png', 'image3.png'],
        metadata: {
          prompt: 'Test prompt',
          model: 'flux1-dev',
          dimensions: { width: 1024, height: 576 },
          parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      });

      const results = await generateImagesFromPrompts(mockPrompts);

      expect(initializeSession).toHaveBeenCalledOnce();
      expect(generateImages).toHaveBeenCalledWith('Test prompt', 3, mockSessionId);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should handle errors gracefully per prompt', async () => {
      const mockPrompts = [
        {
          beatId: 's1-b1',
          sceneNumber: 1,
          format: 'cinematic' as const,
          prompt: {
            prompt: 'Test prompt',
            model: 'flux1-dev',
            width: 1024,
            height: 576,
            steps: 28,
            cfgscale: 7.0,
            seed: -1,
          },
          beat_script_text: 'Test beat',
        },
      ];

      vi.mocked(initializeSession).mockResolvedValue('test-session');
      vi.mocked(generateImages).mockResolvedValue({
        success: false,
        error: 'Generation failed',
        metadata: {
          prompt: 'Test prompt',
          model: 'flux1-dev',
          dimensions: { width: 1024, height: 576 },
          parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      });

      const results = await generateImagesFromPrompts(mockPrompts);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Generation failed');
    });

    it('should call progress callback', async () => {
      const mockPrompts = [
        {
          beatId: 's1-b1',
          sceneNumber: 1,
          format: 'cinematic' as const,
          prompt: {
            prompt: 'Test prompt',
            model: 'flux1-dev',
            width: 1024,
            height: 576,
            steps: 28,
            cfgscale: 7.0,
            seed: -1,
          },
          beat_script_text: 'Test beat',
        },
      ];

      const progressCallback = vi.fn();
      vi.mocked(initializeSession).mockResolvedValue('test-session');
      vi.mocked(generateImages).mockResolvedValue({
        success: true,
        imagePaths: ['image1.png'],
        metadata: {
          prompt: 'Test',
          model: 'flux1-dev',
          dimensions: { width: 1024, height: 576 },
          parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      });

      await generateImagesFromPrompts(mockPrompts, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStepName: expect.stringContaining('Generating image'),
        })
      );
    });

    it('should return empty array for empty prompts', async () => {
      const results = await generateImagesFromPrompts([]);
      expect(results).toHaveLength(0);
      expect(initializeSession).not.toHaveBeenCalled();
    });

    it('should throw error if session initialization fails', async () => {
      const mockPrompts = [
        {
          beatId: 's1-b1',
          sceneNumber: 1,
          format: 'cinematic' as const,
          prompt: {
            prompt: 'Test prompt',
            model: 'flux1-dev',
            width: 1024,
            height: 576,
            steps: 28,
            cfgscale: 7.0,
            seed: -1,
          },
          beat_script_text: 'Test beat',
        },
      ];

      vi.mocked(initializeSession).mockRejectedValue(new Error('Session init failed'));

      await expect(generateImagesFromPrompts(mockPrompts)).rejects.toThrow('Failed to initialize SwarmUI session');
    });
  });

  describe('organizeAssetsInDaVinci', () => {
    it('should organize images into DaVinci project', async () => {
      const mockGenerationResults: ImageGenerationResult[] = [
        {
          success: true,
          imagePaths: ['image1.png', 'image2.png'],
          metadata: {
            prompt: 'Test prompt',
            model: 'flux1-dev',
            dimensions: { width: 1024, height: 576 },
            parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
            contextSource: 'manual',
            tacticalOverrideApplied: false,
            artifactsUsed: 0,
            characterContextsUsed: 0,
          },
        },
      ];

      const mockEnhancedPaths = [
        {
          originalPath: 'image1.png',
          normalizedPath: '/path/to/image1.png',
          sceneNumber: 1,
          beatId: 's1-b1',
          format: 'cinematic' as const,
          filename: 'image1.png',
          exists: true,
        },
        {
          originalPath: 'image2.png',
          normalizedPath: '/path/to/image2.png',
          sceneNumber: 1,
          beatId: 's1-b1',
          format: 'cinematic' as const,
          filename: 'image2.png',
          exists: true,
        },
      ];

      const mockOrganizationResult: OrganizationResult = {
        success: true,
        episodeProjectPath: '/path/to/project',
        organizedImages: [],
        failedImages: [],
        summary: {
          totalImages: 2,
          successfulCopies: 2,
          failedCopies: 0,
        },
      };

      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });
      vi.mocked(createEpisodeProject).mockResolvedValue('/path/to/project');
      vi.mocked(enhanceImagePathsWithMetadata).mockResolvedValue(mockEnhancedPaths);
      vi.mocked(organizeSwarmUIImages).mockResolvedValue(mockOrganizationResult);

      const result = await organizeAssetsInDaVinci(mockGenerationResults, mockTimestamp);

      expect(createEpisodeProject).toHaveBeenCalledWith(1, 'Test Episode');
      expect(enhanceImagePathsWithMetadata).toHaveBeenCalled();
      expect(organizeSwarmUIImages).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle missing episode data', async () => {
      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: {
          scriptText: 'Test',
          episodeContext: '{}',
          storyUuid: 'test',
        },
      });

      await expect(
        organizeAssetsInDaVinci([], mockTimestamp)
      ).rejects.toThrow('No analyzed episode data found');
    });
  });

  describe('processEpisodeCompletePipeline', () => {
    it('should process complete pipeline successfully', async () => {
      const mockPrompts = [
        {
          beatId: 's1-b1',
          sceneNumber: 1,
          format: 'cinematic' as const,
          prompt: {
            prompt: 'Test prompt',
            model: 'flux1-dev',
            width: 1024,
            height: 576,
            steps: 28,
            cfgscale: 7.0,
            seed: -1,
          },
          beat_script_text: 'Test beat',
        },
      ];

      const mockGenerationResult: ImageGenerationResult = {
        success: true,
        imagePaths: ['image1.png'],
        metadata: {
          prompt: 'Test prompt',
          model: 'flux1-dev',
          dimensions: { width: 1024, height: 576 },
          parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      };

      const mockOrganizationResult: OrganizationResult = {
        success: true,
        episodeProjectPath: '/path/to/project',
        organizedImages: [],
        failedImages: [],
        summary: {
          totalImages: 1,
          successfulCopies: 1,
          failedCopies: 0,
        },
      };

      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });
      vi.mocked(initializeSession).mockResolvedValue('test-session');
      vi.mocked(generateImages).mockResolvedValue(mockGenerationResult);
      vi.mocked(createEpisodeProject).mockResolvedValue('/path/to/project');
      vi.mocked(enhanceImagePathsWithMetadata).mockResolvedValue([
        {
          originalPath: 'image1.png',
          normalizedPath: '/path/to/image1.png',
          sceneNumber: 1,
          beatId: 's1-b1',
          format: 'cinematic',
          filename: 'image1.png',
          exists: true,
        },
      ]);
      vi.mocked(organizeSwarmUIImages).mockResolvedValue(mockOrganizationResult);

      const result = await processEpisodeCompletePipeline(mockTimestamp);

      expect(result.success).toBe(true);
      expect(result.episodeNumber).toBe(1);
      expect(result.episodeTitle).toBe('Test Episode');
      expect(result.totalPrompts).toBeGreaterThan(0);
      expect(result.organizationResult).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should handle no prompts found', async () => {
      const sessionWithNoPrompts = {
        ...mockSessionData,
        analyzedEpisode: {
          ...mockSessionData.analyzedEpisode,
          scenes: [
            {
              sceneNumber: 1,
              title: 'Scene 1',
              metadata: {},
              beats: [
                {
                  beatId: 's1-b1',
                  beat_script_text: 'Test',
                  visualSignificance: 'High' as const,
                  imageDecision: { type: 'NO_IMAGE' as const, reason: 'No image needed' },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: sessionWithNoPrompts,
      });

      const result = await processEpisodeCompletePipeline(mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.totalPrompts).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('No NEW_IMAGE prompts found');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      const result = await processEpisodeCompletePipeline(mockTimestamp);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it('should call progress callback', async () => {
      const progressCallback = vi.fn();

      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });
      vi.mocked(initializeSession).mockResolvedValue('test-session');
      vi.mocked(generateImages).mockResolvedValue({
        success: true,
        imagePaths: ['image1.png'],
        metadata: {
          prompt: 'Test',
          model: 'flux1-dev',
          dimensions: { width: 1024, height: 576 },
          parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      });
      vi.mocked(createEpisodeProject).mockResolvedValue('/path/to/project');
      vi.mocked(enhanceImagePathsWithMetadata).mockResolvedValue([]);
      vi.mocked(organizeSwarmUIImages).mockResolvedValue({
        success: true,
        episodeProjectPath: '/path/to/project',
        organizedImages: [],
        failedImages: [],
        summary: { totalImages: 0, successfulCopies: 0, failedCopies: 0 },
      });

      await processEpisodeCompletePipeline(mockTimestamp, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('processSingleBeat', () => {
    it('should process single beat successfully', async () => {
      vi.mocked(getLatestSession).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });
      vi.mocked(initializeSession).mockResolvedValue('test-session');
      vi.mocked(generateImages).mockResolvedValue({
        success: true,
        imagePaths: ['image1.png'],
        metadata: {
          prompt: 'Test prompt',
          model: 'flux1-dev',
          dimensions: { width: 1024, height: 576 },
          parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      });
      vi.mocked(enhanceImagePathsWithMetadata).mockResolvedValue([
        {
          originalPath: 'image1.png',
          normalizedPath: '/path/to/image1.png',
          sceneNumber: 1,
          beatId: 's1-b1',
          format: 'cinematic',
          filename: 'image1.png',
          exists: true,
        },
      ]);
      vi.mocked(organizeSwarmUIImages).mockResolvedValue({
        success: true,
        episodeProjectPath: '/path/to/project',
        organizedImages: [],
        failedImages: [],
        summary: { totalImages: 1, successfulCopies: 1, failedCopies: 0 },
      });

      const result = await processSingleBeat('s1-b1', 'cinematic');

      expect(result.success).toBe(true);
      expect(result.beatId).toBe('s1-b1');
      expect(result.format).toBe('cinematic');
      expect(result.generationResult).toBeDefined();
      expect(result.organizationResult).toBeDefined();
    });

    it('should handle beat not found', async () => {
      vi.mocked(getLatestSession).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });

      const result = await processSingleBeat('s1-nonexistent', 'cinematic');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle missing prompt', async () => {
      const sessionWithoutPrompt = {
        ...mockSessionData,
        analyzedEpisode: {
          ...mockSessionData.analyzedEpisode,
          scenes: [
            {
              sceneNumber: 1,
              title: 'Scene 1',
              metadata: {},
              beats: [
                {
                  beatId: 's1-b1',
                  beat_script_text: 'Test',
                  visualSignificance: 'High' as const,
                  imageDecision: { type: 'NEW_IMAGE' as const, reason: 'Test' },
                  // No prompts
                },
              ],
            },
          ],
        },
      };

      vi.mocked(getLatestSession).mockResolvedValue({
        success: true,
        data: sessionWithoutPrompt,
      });

      const result = await processSingleBeat('s1-b1', 'cinematic');

      expect(result.success).toBe(false);
      expect(result.error).toContain('no prompts');
    });

    it('should use provided session timestamp', async () => {
      vi.mocked(getSessionByTimestamp).mockResolvedValue({
        success: true,
        data: mockSessionData,
      });
      vi.mocked(initializeSession).mockResolvedValue('test-session');
      vi.mocked(generateImages).mockResolvedValue({
        success: true,
        imagePaths: ['image1.png'],
        metadata: {
          prompt: 'Test',
          model: 'flux1-dev',
          dimensions: { width: 1024, height: 576 },
          parameters: { steps: 28, cfgScale: 7.0, seed: -1 },
          contextSource: 'manual',
          tacticalOverrideApplied: false,
          artifactsUsed: 0,
          characterContextsUsed: 0,
        },
      });
      vi.mocked(enhanceImagePathsWithMetadata).mockResolvedValue([]);
      vi.mocked(organizeSwarmUIImages).mockResolvedValue({
        success: true,
        episodeProjectPath: '/path/to/project',
        organizedImages: [],
        failedImages: [],
        summary: { totalImages: 0, successfulCopies: 0, failedCopies: 0 },
      });

      await processSingleBeat('s1-b1', 'cinematic', mockTimestamp);

      expect(getSessionByTimestamp).toHaveBeenCalledWith(mockTimestamp);
      expect(getLatestSession).not.toHaveBeenCalled();
    });
  });
});

