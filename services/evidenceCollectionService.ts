/**
 * Evidence Collection Service (Phase B - Task 5.0)
 *
 * Tracks metrics for Phase B enhancements to provide evidence of improvement:
 * - Prompt richness (character count, narrative elements)
 * - A/B comparison (enhanced vs baseline)
 * - Generation metadata (success rates, token usage, timing)
 * - Metrics export to JSON
 *
 * Usage:
 *   const collector = new EvidenceCollector();
 *   collector.startSession('Episode 1 - Task 5.0 Testing');
 *   collector.trackPromptGeneration(beatId, promptData);
 *   await collector.exportMetrics('./metrics/phase-b-metrics-2025-11-28.json');
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Types for evidence collection
export interface PromptRichnessMetrics {
  beatId: string;
  cinematicLength: number;
  verticalLength: number;
  marketingVerticalLength: number;
  narrativeElements: {
    themeKeywords: string[];
    emotionalDescriptors: string[];
    compositionKeywords: string[];
    lightingKeywords: string[];
  };
  richness Score: number; // 0-100 scale
}

export interface ABComparisonData {
  beatId: string;
  baselinePrompt?: string; // Optional: for when we have baseline to compare
  enhancedCinematic: string;
  enhancedVertical: string;
  enhancedMarketingVertical: string;
  lengthDelta?: number; // Difference from baseline
  narrativeElementsAdded?: number; // Count of new narrative elements
}

export interface GenerationMetadata {
  beatId: string;
  storyContextAvailable: boolean;
  storyContextUsed: boolean;
  tokenUsage: {
    baseSystemInstruction: number;
    enhancedSystemInstruction: number;
    delta: number;
    percentageIncrease: number;
  };
  generationTime: number; // milliseconds
  success: boolean;
  error?: string;
}

export interface SessionMetrics {
  sessionId: string;
  sessionName: string;
  timestamp: string;
  storyId?: string;
  episodeNumber?: number;
  totalBeats: number;
  successfulGenerations: number;
  failedGenerations: number;
  promptRichness: PromptRichnessMetrics[];
  abComparisons: ABComparisonData[];
  metadata: GenerationMetadata[];
  summary: {
    averageRichnessScore: number;
    averageCinematicLength: number;
    averageVerticalLength: number;
    averageMarketingLength: number;
    contextInjectionSuccessRate: number;
    averageTokenDelta: number;
    averageGenerationTime: number;
    totalThemeKeywords: number;
    totalEmotionalDescriptors: number;
    totalCompositionKeywords: number;
  };
}

// Keyword dictionaries for narrative element detection
const NARRATIVE_KEYWORDS = {
  themes: [
    'truth', 'survival', 'professional', 'boundaries', 'moral', 'tension',
    'investigation', 'determination', 'duty', 'loyalty', 'sacrifice',
    'redemption', 'justice', 'corruption', 'betrayal'
  ],
  emotions: [
    'intensely', 'focused', 'alert', 'determined', 'exhausted', 'conflicted',
    'vulnerable', 'protective', 'wary', 'desperate', 'resolute', 'haunted',
    'concerned', 'calculating', 'defiant', 'weary'
  ],
  composition: [
    'Rule of Thirds', 'third of frame', 'leading lines', 'depth', 'layering',
    'negative space', 'foreground', 'background', 'focal point', 'visual hierarchy'
  ],
  lighting: [
    'rim light', 'rim lighting', 'eye light', 'dramatic shadows', 'high contrast',
    'shadow', 'illumination', 'backlight', 'edge light'
  ]
};

export class EvidenceCollector {
  private sessionId: string;
  private sessionName: string;
  private sessionTimestamp: string;
  private storyId?: string;
  private episodeNumber?: number;

  private promptRichness: PromptRichnessMetrics[] = [];
  private abComparisons: ABComparisonData[] = [];
  private metadata: GenerationMetadata[] = [];

  private sessionStartTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionName = 'Untitled Session';
    this.sessionTimestamp = new Date().toISOString();
    this.sessionStartTime = Date.now();
  }

  /**
   * Start a new evidence collection session
   */
  startSession(sessionName: string, storyId?: string, episodeNumber?: number): void {
    this.sessionName = sessionName;
    this.storyId = storyId;
    this.episodeNumber = episodeNumber;
    this.sessionTimestamp = new Date().toISOString();
    this.sessionStartTime = Date.now();

    console.log(`\n[Evidence Collection] Session started: ${sessionName}`);
    console.log(`   Session ID: ${this.sessionId}`);
    console.log(`   Timestamp: ${this.sessionTimestamp}`);
    if (storyId) console.log(`   Story ID: ${storyId}`);
    if (episodeNumber) console.log(`   Episode: ${episodeNumber}`);
    console.log('');
  }

  /**
   * Track a prompt generation for evidence collection
   */
  trackPromptGeneration(
    beatId: string,
    promptData: {
      cinematic: string;
      vertical: string;
      marketingVertical: string;
      baselinePrompt?: string;
    },
    metadataInfo: {
      storyContextAvailable: boolean;
      storyContextUsed: boolean;
      tokenUsage?: {
        baseSystemInstruction: number;
        enhancedSystemInstruction: number;
        delta: number;
        percentageIncrease: number;
      };
      generationTime: number;
      success: boolean;
      error?: string;
    }
  ): void {
    // Track prompt richness
    const richness = this.analyzePromptRichness(beatId, promptData);
    this.promptRichness.push(richness);

    // Track A/B comparison
    const comparison = this.createABComparison(beatId, promptData);
    this.abComparisons.push(comparison);

    // Track metadata
    const metadata: GenerationMetadata = {
      beatId,
      storyContextAvailable: metadataInfo.storyContextAvailable,
      storyContextUsed: metadataInfo.storyContextUsed,
      tokenUsage: metadataInfo.tokenUsage || {
        baseSystemInstruction: 0,
        enhancedSystemInstruction: 0,
        delta: 0,
        percentageIncrease: 0
      },
      generationTime: metadataInfo.generationTime,
      success: metadataInfo.success,
      error: metadataInfo.error
    };
    this.metadata.push(metadata);

    console.log(`[Evidence] Tracked ${beatId}: richness=${richness.richnessScore.toFixed(1)}, length=${promptData.cinematic.length}chars`);
  }

  /**
   * Analyze prompt richness and count narrative elements
   */
  private analyzePromptRichness(
    beatId: string,
    promptData: { cinematic: string; vertical: string; marketingVertical: string }
  ): PromptRichnessMetrics {
    const allText = `${promptData.cinematic} ${promptData.vertical} ${promptData.marketingVertical}`.toLowerCase();

    // Detect narrative elements
    const themeKeywords = NARRATIVE_KEYWORDS.themes.filter(keyword =>
      allText.includes(keyword.toLowerCase())
    );
    const emotionalDescriptors = NARRATIVE_KEYWORDS.emotions.filter(keyword =>
      allText.includes(keyword.toLowerCase())
    );
    const compositionKeywords = NARRATIVE_KEYWORDS.composition.filter(keyword =>
      allText.includes(keyword.toLowerCase())
    );
    const lightingKeywords = NARRATIVE_KEYWORDS.lighting.filter(keyword =>
      allText.includes(keyword.toLowerCase())
    );

    // Calculate richness score (0-100)
    // Based on: length, narrative elements, composition techniques, lighting
    const lengthScore = Math.min(30, (promptData.marketingVertical.length / 1000) * 30);
    const narrativeScore = Math.min(25, (themeKeywords.length + emotionalDescriptors.length) * 2.5);
    const compositionScore = Math.min(25, compositionKeywords.length * 5);
    const lightingScore = Math.min(20, lightingKeywords.length * 4);

    const richnessScore = lengthScore + narrativeScore + compositionScore + lightingScore;

    return {
      beatId,
      cinematicLength: promptData.cinematic.length,
      verticalLength: promptData.vertical.length,
      marketingVerticalLength: promptData.marketingVertical.length,
      narrativeElements: {
        themeKeywords,
        emotionalDescriptors,
        compositionKeywords,
        lightingKeywords
      },
      richnessScore
    };
  }

  /**
   * Create A/B comparison data
   */
  private createABComparison(
    beatId: string,
    promptData: {
      cinematic: string;
      vertical: string;
      marketingVertical: string;
      baselinePrompt?: string;
    }
  ): ABComparisonData {
    const lengthDelta = promptData.baselinePrompt
      ? promptData.marketingVertical.length - promptData.baselinePrompt.length
      : undefined;

    // Count narrative elements in enhanced vs baseline
    const narrativeElementsAdded = promptData.baselinePrompt
      ? this.countNarrativeElementsAdded(promptData.baselinePrompt, promptData.marketingVertical)
      : undefined;

    return {
      beatId,
      baselinePrompt: promptData.baselinePrompt,
      enhancedCinematic: promptData.cinematic,
      enhancedVertical: promptData.vertical,
      enhancedMarketingVertical: promptData.marketingVertical,
      lengthDelta,
      narrativeElementsAdded
    };
  }

  /**
   * Count how many new narrative elements were added in enhanced prompt
   */
  private countNarrativeElementsAdded(baseline: string, enhanced: string): number {
    const baselineLower = baseline.toLowerCase();
    const enhancedLower = enhanced.toLowerCase();

    let addedCount = 0;
    const allKeywords = [
      ...NARRATIVE_KEYWORDS.themes,
      ...NARRATIVE_KEYWORDS.emotions,
      ...NARRATIVE_KEYWORDS.composition,
      ...NARRATIVE_KEYWORDS.lighting
    ];

    for (const keyword of allKeywords) {
      const keywordLower = keyword.toLowerCase();
      const inBaseline = baselineLower.includes(keywordLower);
      const inEnhanced = enhancedLower.includes(keywordLower);

      if (!inBaseline && inEnhanced) {
        addedCount++;
      }
    }

    return addedCount;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(): SessionMetrics['summary'] {
    const totalBeats = this.promptRichness.length;

    if (totalBeats === 0) {
      return {
        averageRichnessScore: 0,
        averageCinematicLength: 0,
        averageVerticalLength: 0,
        averageMarketingLength: 0,
        contextInjectionSuccessRate: 0,
        averageTokenDelta: 0,
        averageGenerationTime: 0,
        totalThemeKeywords: 0,
        totalEmotionalDescriptors: 0,
        totalCompositionKeywords: 0
      };
    }

    const avgRichness = this.promptRichness.reduce((sum, r) => sum + r.richnessScore, 0) / totalBeats;
    const avgCinematic = this.promptRichness.reduce((sum, r) => sum + r.cinematicLength, 0) / totalBeats;
    const avgVertical = this.promptRichness.reduce((sum, r) => sum + r.verticalLength, 0) / totalBeats;
    const avgMarketing = this.promptRichness.reduce((sum, r) => sum + r.marketingVerticalLength, 0) / totalBeats;

    const successfulContext = this.metadata.filter(m => m.storyContextUsed).length;
    const contextSuccessRate = (successfulContext / totalBeats) * 100;

    const avgTokenDelta = this.metadata.reduce((sum, m) => sum + m.tokenUsage.delta, 0) / totalBeats;
    const avgGenTime = this.metadata.reduce((sum, m) => sum + m.generationTime, 0) / totalBeats;

    const totalThemes = this.promptRichness.reduce((sum, r) =>
      sum + r.narrativeElements.themeKeywords.length, 0
    );
    const totalEmotions = this.promptRichness.reduce((sum, r) =>
      sum + r.narrativeElements.emotionalDescriptors.length, 0
    );
    const totalComposition = this.promptRichness.reduce((sum, r) =>
      sum + r.narrativeElements.compositionKeywords.length, 0
    );

    return {
      averageRichnessScore: avgRichness,
      averageCinematicLength: Math.round(avgCinematic),
      averageVerticalLength: Math.round(avgVertical),
      averageMarketingLength: Math.round(avgMarketing),
      contextInjectionSuccessRate: contextSuccessRate,
      averageTokenDelta: Math.round(avgTokenDelta),
      averageGenerationTime: Math.round(avgGenTime),
      totalThemeKeywords: totalThemes,
      totalEmotionalDescriptors: totalEmotions,
      totalCompositionKeywords: totalComposition
    };
  }

  /**
   * Export metrics to JSON file
   */
  async exportMetrics(outputPath?: string): Promise<string> {
    const summary = this.calculateSummary();

    const metrics: SessionMetrics = {
      sessionId: this.sessionId,
      sessionName: this.sessionName,
      timestamp: this.sessionTimestamp,
      storyId: this.storyId,
      episodeNumber: this.episodeNumber,
      totalBeats: this.promptRichness.length,
      successfulGenerations: this.metadata.filter(m => m.success).length,
      failedGenerations: this.metadata.filter(m => !m.success).length,
      promptRichness: this.promptRichness,
      abComparisons: this.abComparisons,
      metadata: this.metadata,
      summary
    };

    // Determine output path
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const defaultPath = `./metrics/phase-b-metrics-${dateStr}.json`;
    const finalPath = outputPath || defaultPath;

    // Ensure directory exists
    const dir = join(process.cwd(), 'metrics');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Write to file
    const fullPath = join(process.cwd(), finalPath);
    await writeFile(fullPath, JSON.stringify(metrics, null, 2), 'utf-8');

    console.log(`\n[Evidence Collection] Metrics exported to: ${finalPath}`);
    console.log(`   Total beats: ${metrics.totalBeats}`);
    console.log(`   Successful: ${metrics.successfulGenerations}`);
    console.log(`   Failed: ${metrics.failedGenerations}`);
    console.log(`   Average richness score: ${summary.averageRichnessScore.toFixed(1)}/100`);
    console.log(`   Context injection success: ${summary.contextInjectionSuccessRate.toFixed(1)}%`);
    console.log('');

    return fullPath;
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const summary = this.calculateSummary();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     [Evidence Collection] SESSION SUMMARY                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Session: ${this.sessionName}`);
    console.log(`Total Beats: ${this.promptRichness.length}`);
    console.log(`Success Rate: ${this.metadata.filter(m => m.success).length}/${this.metadata.length}`);
    console.log('');
    console.log('📊 Prompt Richness:');
    console.log(`   Average Richness Score: ${summary.averageRichnessScore.toFixed(1)}/100`);
    console.log(`   Average Cinematic Length: ${summary.averageCinematicLength} chars`);
    console.log(`   Average Vertical Length: ${summary.averageVerticalLength} chars`);
    console.log(`   Average Marketing Length: ${summary.averageMarketingLength} chars`);
    console.log('');
    console.log('📊 Narrative Elements:');
    console.log(`   Theme Keywords: ${summary.totalThemeKeywords} total`);
    console.log(`   Emotional Descriptors: ${summary.totalEmotionalDescriptors} total`);
    console.log(`   Composition Keywords: ${summary.totalCompositionKeywords} total`);
    console.log('');
    console.log('📊 Generation Metadata:');
    console.log(`   Context Injection Success: ${summary.contextInjectionSuccessRate.toFixed(1)}%`);
    console.log(`   Average Token Delta: ${summary.averageTokenDelta} tokens`);
    console.log(`   Average Generation Time: ${summary.averageGenerationTime}ms`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════\n');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session-${timestamp}-${random}`;
  }

  /**
   * Get current metrics (for inspection)
   */
  getMetrics(): {
    promptRichness: PromptRichnessMetrics[];
    abComparisons: ABComparisonData[];
    metadata: GenerationMetadata[];
    summary: SessionMetrics['summary'];
  } {
    return {
      promptRichness: this.promptRichness,
      abComparisons: this.abComparisons,
      metadata: this.metadata,
      summary: this.calculateSummary()
    };
  }
}
