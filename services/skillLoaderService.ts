/**
 * Skill Loader Service
 *
 * Dynamically loads and caches skill markdown files at runtime.
 * Provides single source of truth for prompt generation rules.
 *
 * Skills loaded:
 * - FLUX_VOCABULARY.md: Validated FLUX vocabulary
 * - SKILL.md: Main prompt generation rules
 * - CINEMATOGRAPHER_RULES.md: Phase B LLM instruction
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface SkillCache {
  fluxVocabulary: string;
  skillRules: string;
  cinematographerRules: string;
  loadedAt: Date;
}

class SkillLoaderService {
  private cache: SkillCache | null = null;
  private skillsBaseDir = path.join(process.cwd(), '.claude', 'skills', 'prompt-generation-rules');
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Load all skills from disk (with caching)
   */
  async loadAllSkills(): Promise<SkillCache> {
    // Return cached version if still valid
    if (this.cache && Date.now() - this.cache.loadedAt.getTime() < this.cacheExpiry) {
      return this.cache;
    }

    console.log('[SkillLoader] Loading skill files...');

    try {
      const [fluxVocab, skillRules, cinematographer] = await Promise.all([
        this.loadSkill('FLUX_VOCABULARY.md'),
        this.loadSkill('SKILL.md'),
        this.loadSkill('CINEMATOGRAPHER_RULES.md'),
      ]);

      this.cache = {
        fluxVocabulary: fluxVocab,
        skillRules,
        cinematographerRules: cinematographer,
        loadedAt: new Date(),
      };

      console.log('[SkillLoader] ✅ All skills loaded successfully');
      return this.cache;
    } catch (error) {
      console.error('[SkillLoader] ❌ Failed to load skills:', error);
      throw new Error(`Failed to load skills: ${error}`);
    }
  }

  /**
   * Load individual skill file
   */
  private async loadSkill(filename: string): Promise<string> {
    const filepath = path.join(this.skillsBaseDir, filename);
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      console.log(`[SkillLoader] ✅ Loaded ${filename} (${content.length} chars)`);
      return content;
    } catch (error) {
      console.warn(`[SkillLoader] ⚠️  Could not load ${filename}:`, error);
      return '';
    }
  }

  /**
   * Get just the FLUX vocabulary skill
   */
  async getFluxVocabularySkill(): Promise<string> {
    const skills = await this.loadAllSkills();
    return skills.fluxVocabulary;
  }

  /**
   * Get just the main SKILL.md
   */
  async getSkillRules(): Promise<string> {
    const skills = await this.loadAllSkills();
    return skills.skillRules;
  }

  /**
   * Get CINEMATOGRAPHER rules for Phase B
   */
  async getCinematographerRules(): Promise<string> {
    const skills = await this.loadAllSkills();
    return skills.cinematographerRules;
  }

  /**
   * Clear cache to force reload
   */
  clearCache(): void {
    this.cache = null;
    console.log('[SkillLoader] Cache cleared');
  }
}

export const skillLoaderService = new SkillLoaderService();
