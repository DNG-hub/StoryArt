// services/__tests__/davinciProjectService.test.ts
// Unit tests for DaVinci Project Service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  sanitizeFilename,
  createEpisodeProject,
  organizeSwarmUIImages,
  getProjectDirectoryStructure,
} from '../davinciProjectService';
import type { EnhancedImagePath } from '../../types';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  },
}));

// Note: folderExists uses fs.stat, not fs.access

// Mock process.env
const originalEnv = process.env;

describe('DaVinci Project Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sanitizeFilename', () => {
    it('should replace colons with underscores', () => {
      const result = sanitizeFilename('Episode_01_16:9_Test');
      expect(result).toContain('16_9');
      expect(result).not.toContain(':');
    });

    it('should remove invalid Windows characters', () => {
      const result = sanitizeFilename('Episode<>:"|?*\\/Test');
      expect(result).not.toMatch(/[<>:"|?*\\/]/);
    });

    it('should handle reserved Windows names', () => {
      const result = sanitizeFilename('CON');
      expect(result).toContain('episode_');
      expect(result).not.toBe('CON');
    });

    it('should limit filename length', () => {
      const longName = 'A'.repeat(300);
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe('createEpisodeProject', () => {
    it('should create episode project folder structure', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const projectPath = await createEpisodeProject(1, 'The Signal');

      expect(fs.mkdir).toHaveBeenCalled();
      expect(projectPath).toContain('Episode_01');
      expect(projectPath).toContain('The_Signal');
    });

    it('should sanitize episode title', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const projectPath = await createEpisodeProject(2, 'Episode: The Beginning');

      // The colon in the title should be sanitized (but the path separator might be : on some systems)
      // Check that the folder name part doesn't contain colons
      const folderName = path.basename(projectPath);
      expect(folderName).not.toContain(':');
      expect(folderName).toContain('Episode_');
    });

    it('should create all required folders', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await createEpisodeProject(1, 'Test');

      // Should create main folder + 8 subfolders (recursive creates might count differently)
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.mkdir.mock.calls.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('organizeSwarmUIImages', () => {
    const mockImages: EnhancedImagePath[] = [
      {
        normalizedPath: 'E:/SwarmUI/Output/local/raw/2025-01-20/image1.png',
        exists: true,
        sceneNumber: 1,
        beatId: 's1-b1',
        format: 'cinematic',
        metadata: {
          prompt: 'Test prompt',
          model: 'flux1-dev-fp8',
          dimensions: { width: 1920, height: 1080 },
          parameters: { steps: 20, cfgScale: 7, seed: 123 },
        },
      },
      {
        normalizedPath: 'E:/SwarmUI/Output/local/raw/2025-01-20/image2.png',
        exists: true,
        sceneNumber: 1,
        beatId: 's1-b1',
        format: 'vertical',
        metadata: {
          prompt: 'Test prompt',
          model: 'flux1-dev-fp8',
          dimensions: { width: 1080, height: 1920 },
          parameters: { steps: 20, cfgScale: 7, seed: 456 },
        },
      },
    ];

    it('should organize images into DaVinci project structure', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['Episode_01_Test'] as any);
      // Mock folderExists check (uses fs.stat) - first call checks episode folder, subsequent calls check subfolders
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // Episode folder exists
        .mockResolvedValue({ isDirectory: () => true } as any); // All subfolders exist
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      const result = await organizeSwarmUIImages(mockImages, 1, 'Test');

      expect(result.success).toBe(true);
      expect(result.organizedImages.length).toBe(2);
      expect(fs.copyFile).toHaveBeenCalledTimes(2);
    });

    it('should handle missing images gracefully', async () => {
      const imagesWithMissing: EnhancedImagePath[] = [
        {
          ...mockImages[0],
          exists: false,
        },
        mockImages[1],
      ];

      vi.mocked(fs.readdir).mockResolvedValue(['Episode_01_Test'] as any);
      // Mock folderExists check (uses fs.stat) - first call checks episode folder, subsequent calls check subfolders
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // Episode folder exists
        .mockResolvedValue({ isDirectory: () => true } as any); // All subfolders exist
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      const result = await organizeSwarmUIImages(imagesWithMissing, 1, 'Test');

      expect(result.failedImages.length).toBe(1);
      expect(result.organizedImages.length).toBe(1);
    });

    it('should generate correct filenames with version numbers', async () => {
      const multipleImages: EnhancedImagePath[] = [
        mockImages[0],
        { ...mockImages[0], normalizedPath: 'image2.png' },
        { ...mockImages[0], normalizedPath: 'image3.png' },
      ];

      vi.mocked(fs.readdir).mockResolvedValue(['Episode_01_Test'] as any);
      // Mock folderExists check (uses fs.stat) - first call checks episode folder, subsequent calls check subfolders
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ isDirectory: () => true } as any) // Episode folder exists
        .mockResolvedValue({ isDirectory: () => true } as any); // All subfolders exist
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      const result = await organizeSwarmUIImages(multipleImages, 1, 'Test');

      expect(result.organizedImages[0].filename).toContain('v01');
      expect(result.organizedImages[1].filename).toContain('v02');
      expect(result.organizedImages[2].filename).toContain('v03');
    });
  });

  describe('getProjectDirectoryStructure', () => {
    it('should return project structure for existing episode', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['Episode_01_Test'] as any);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      const structure = await getProjectDirectoryStructure(1);

      expect(structure.isValid).toBe(true);
      expect(structure.episodeNumber).toBe(1);
    });

    it('should return invalid structure for non-existent episode', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const structure = await getProjectDirectoryStructure(99);

      expect(structure.isValid).toBe(false);
      expect(structure.errors).toBeDefined();
    });
  });
});

