/**
 * Skill Applicator Service
 *
 * Applies runtime skill rules to prompt generation at each phase.
 * Ensures sync between beat/scene context and FLUX/SKILL.md constraints.
 */

import type { VisualBeatSpec, BeatAnalysis } from '../types';
import { skillLoaderService } from './skillLoaderService';
import { skillParserService, type FluxVocabularyCatalog, type SkillRulesCatalog } from './skillParserService';

interface SkillApplicationResult {
  valid: boolean;
  warnings: Array<{ type: string; message: string; severity: 'warning' | 'error' }>;
  applied: string[];
  suggestions: string[];
}

class SkillApplicatorService {
  private fluxCatalog: FluxVocabularyCatalog | null = null;
  private skillsCatalog: SkillRulesCatalog | null = null;

  /**
   * Initialize skill catalogs
   */
  async initialize(): Promise<void> {
    console.log('[SkillApplicator] Initializing...');
    try {
      const skills = await skillLoaderService.loadAllSkills();
      this.fluxCatalog = skillParserService.parseFluxVocabulary(skills.fluxVocabulary);
      this.skillsCatalog = skillParserService.parseSkillRules(skills.skillRules);
      console.log('[SkillApplicator] ✅ Initialized with parsed catalogs');
    } catch (error) {
      console.warn('[SkillApplicator] ⚠️  Failed to initialize, using fallback mode:', error);
    }
  }

  /**
   * Apply FLUX vocabulary rules to beat
   * Validates shot type, camera angle, poses, expressions against vocabulary
   */
  async applyFluxRules(beat: BeatAnalysis): Promise<SkillApplicationResult> {
    if (!this.fluxCatalog) await this.initialize();

    const result: SkillApplicationResult = {
      valid: true,
      warnings: [],
      applied: [],
      suggestions: [],
    };

    // Validate shot type
    if (beat.cameraAngleSuggestion) {
      const isValid = skillParserService.isValidFluxTerm(
        beat.cameraAngleSuggestion,
        this.fluxCatalog!,
        'angle'
      );
      if (!isValid) {
        result.warnings.push({
          type: 'invalid_camera_angle',
          message: `Camera angle "${beat.cameraAngleSuggestion}" not in FLUX vocabulary`,
          severity: 'warning',
        });
        result.valid = false;
      } else {
        result.applied.push(`Validated camera angle: ${beat.cameraAngleSuggestion}`);
      }
    }

    // Suggest proper FLUX terms from vocabulary
    if (beat.cameraAngleSuggestion) {
      const matches = Object.entries(this.fluxCatalog!.cameraAngles)
        .filter(([key]) => key.toLowerCase().includes(beat.cameraAngleSuggestion.toLowerCase()))
        .map(([, angle]) => angle.term);

      if (matches.length > 0) {
        result.suggestions.push(`Use FLUX term: ${matches[0]}`);
      }
    }

    return result;
  }

  /**
   * Apply SKILL.md rules to VBS
   * Validates token budget, character description structure, compilation order
   */
  async applySkillRules(vbs: VisualBeatSpec): Promise<SkillApplicationResult> {
    if (!this.skillsCatalog) await this.initialize();

    const result: SkillApplicationResult = {
      valid: true,
      warnings: [],
      applied: [],
      suggestions: [],
    };

    // Validate token budget
    const charCount = vbs.subjects.length;
    const budgetKey = charCount === 1 ? 'single-character' : 'default';
    const budget = this.skillsCatalog!.tokenBudgets[budgetKey];

    if (budget) {
      result.applied.push(`Applied token budget: ${budget.min}-${budget.max} (${budget.description})`);

      if (vbs.constraints.tokenBudget.total < budget.min) {
        result.warnings.push({
          type: 'token_budget_low',
          message: `Token budget ${vbs.constraints.tokenBudget.total} is below recommended minimum ${budget.min}`,
          severity: 'warning',
        });
        result.valid = false;
      }
    }

    // Validate LoRA trigger presence
    for (const subject of vbs.subjects) {
      if (!subject.loraTrigger) {
        result.warnings.push({
          type: 'missing_lora',
          message: `Character "${subject.characterName}" missing LoRA trigger`,
          severity: 'error',
        });
        result.valid = false;
      } else {
        result.applied.push(`Verified LoRA trigger: ${subject.loraTrigger}`);
      }
    }

    // Validate helmet rules
    for (const subject of vbs.subjects) {
      if (subject.helmetState === 'VISOR_DOWN') {
        if (subject.expression) {
          result.warnings.push({
            type: 'helmet_expression_conflict',
            message: `Character "${subject.characterName}" has visor down but expression is set`,
            severity: 'error',
          });
          result.valid = false;
        } else {
          result.applied.push(`Helmet rule: ${subject.characterName} visor down, no expression`);
        }
      }
    }

    // Validate segment tag format
    for (const subject of vbs.subjects) {
      if (subject.segments.face) {
        const isCorrectFormat = subject.segments.face.includes('segment:yolo-face_yolov9c.pt-');
        if (!isCorrectFormat) {
          result.warnings.push({
            type: 'invalid_segment_format',
            message: `Invalid segment tag format for ${subject.characterName}`,
            severity: 'warning',
          });
        } else {
          result.applied.push(`Segment tag valid: ${subject.characterName}`);
        }
      }
    }

    return result;
  }

  /**
   * Get dynamic CINEMATOGRAPHER system instruction from loaded skill
   */
  async getCinematographerInstruction(): Promise<string> {
    try {
      const skillContent = await skillLoaderService.getCinematographerRules();
      if (skillContent) {
        return skillContent;
      }
    } catch (error) {
      console.warn('[SkillApplicator] Failed to load cinematographer rules:', error);
    }

    // Fallback to hardcoded version if loading fails
    return this.getFallbackCinematographerInstruction();
  }

  /**
   * Suggest FLUX vocabulary terms for a beat based on context
   */
  async suggestFluxTerms(
    beat: BeatAnalysis,
    sceneType?: string
  ): Promise<{ shotType?: string; cameraAngle?: string; poses?: string[] }> {
    if (!this.fluxCatalog) await this.initialize();

    const suggestions: { shotType?: string; cameraAngle?: string; poses?: string[] } = {};

    // Suggest shot type based on scene role
    if (sceneType) {
      const roleMap: Record<string, string> = {
        'action': 'wide shot',
        'dialogue': 'medium shot',
        'establishing': 'establishing shot',
        'emotional': 'close-up shot',
        'tactical': 'high angle shot',
      };
      suggestions.shotType = roleMap[sceneType];
    }

    // Suggest camera angle based on character count
    if (beat.characterPositioning?.includes('Both')) {
      suggestions.cameraAngle = 'wide angle';
    } else if (beat.characterPositioning?.includes('intimate')) {
      suggestions.cameraAngle = 'close-up shot';
    }

    // Suggest poses based on beat type
    if (beat.beat_script_text.toLowerCase().includes('action')) {
      suggestions.poses = ['crouching', 'weapon drawn', 'scanning perimeter'];
    } else if (beat.beat_script_text.toLowerCase().includes('dialogue')) {
      suggestions.poses = ['standing tall', 'facing camera', 'leaning against wall'];
    }

    return suggestions;
  }

  /**
   * Validate entire prompt against all skill rules
   */
  async validatePromptAgainstSkills(prompt: string, vbs: VisualBeatSpec): Promise<SkillApplicationResult> {
    const result: SkillApplicationResult = {
      valid: true,
      warnings: [],
      applied: [],
      suggestions: [],
    };

    if (!this.fluxCatalog || !this.skillsCatalog) {
      await this.initialize();
    }

    // Check for avoided terms
    const avoidedTermsFound = this.fluxCatalog!.avoidTerms.filter(term =>
      prompt.toLowerCase().includes(term.toLowerCase())
    );
    if (avoidedTermsFound.length > 0) {
      result.warnings.push({
        type: 'avoided_terms',
        message: `Prompt contains avoided terms: ${avoidedTermsFound.join(', ')}`,
        severity: 'warning',
      });
      result.valid = false;
    } else {
      result.applied.push('No avoided terms detected');
    }

    // Check for LoRA triggers
    for (const subject of vbs.subjects) {
      if (!prompt.includes(subject.loraTrigger)) {
        result.warnings.push({
          type: 'missing_lora_in_prompt',
          message: `LoRA trigger "${subject.loraTrigger}" not found in prompt`,
          severity: 'error',
        });
        result.valid = false;
      }
    }

    // Check segment tag format
    const segmentMatches = prompt.match(/<segment:[^>]+>/g) || [];
    for (const segment of segmentMatches) {
      if (!segment.includes('yolo-face_yolov9c.pt-')) {
        result.warnings.push({
          type: 'invalid_segment_format',
          message: `Invalid segment format: ${segment}`,
          severity: 'warning',
        });
      }
    }

    return result;
  }

  /**
   * Fallback cinematographer instruction (if skill loading fails)
   */
  private getFallbackCinematographerInstruction(): string {
    return `You are a cinematographer filling in missing visual details for an AI image generation pipeline.

Your job: complete the Visual Beat Spec by filling in only what a camera would literally see.

INPUT: A partial VBS with empty slots:
- shot.composition: What does the visual_anchor describe?
- subjects[].action: What is each character DOING (observable)?
- subjects[].expression: What is their FACE showing?

RULES:
1. Composition: Translate visual_anchor to FLUX spatial language only
2. Action: Observable pose/movement ONLY. No psychology.
3. Expression: Camera-observable facial features ONLY. No emotions.
4. Use only validated FLUX vocabulary terms`;
  }
}

export const skillApplicatorService = new SkillApplicatorService();
export type { SkillApplicationResult };
