// services/__tests__/edgeCases.test.ts
// Edge case handling tests for Task 9.0

import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../davinciProjectService';

describe('Edge Case Handling', () => {
  describe('9.2 Windows Filename Compatibility', () => {
    it('should replace colons with underscores in format names', () => {
      // Format names like "16:9" should become "16_9"
      const filename1 = 'beat_16:9_cinematic.png';
      const sanitized = sanitizeFilename(filename1);
      
      expect(sanitized).not.toContain(':');
      expect(sanitized).toContain('16_9');
    });

    it('should handle invalid Windows filename characters', () => {
      const invalidChars = '<>:"|?*\\/';
      const testName = `Episode_01_Test${invalidChars}Invalid`;
      const sanitized = sanitizeFilename(testName);
      
      expect(sanitized).not.toMatch(/[<>:"|?*\\/]/);
      expect(sanitized).toContain('Episode_01_Test');
    });

    it('should replace spaces with underscores', () => {
      const withSpaces = 'Episode 01 The Signal';
      const sanitized = sanitizeFilename(withSpaces);
      
      expect(sanitized).not.toContain(' ');
      expect(sanitized).toContain('_');
    });

    it('should handle reserved Windows names', () => {
      const reservedName = 'CON';
      const sanitized = sanitizeFilename(reservedName);
      
      expect(sanitized).not.toBe('CON');
      expect(sanitized).toContain('episode_');
    });

    it('should limit filename length', () => {
      const longName = 'A'.repeat(300);
      const sanitized = sanitizeFilename(longName);
      
      expect(sanitized.length).toBeLessThanOrEqual(200);
    });

    it('should handle multiple consecutive invalid characters', () => {
      const testName = 'Episode<>:"|?*\\/Test';
      const sanitized = sanitizeFilename(testName);
      
      expect(sanitized).not.toMatch(/[<>:"|?*\\/]/);
      expect(sanitized).not.toMatch(/_{3,}/); // No more than 2 consecutive underscores
    });

    it('should handle empty strings', () => {
      const sanitized = sanitizeFilename('');
      
      expect(sanitized).toBeTruthy();
      expect(sanitized).toContain('episode_');
    });
  });
});

