/**
 * v0.18 Validation Test - Episode 2 Scenes 2-4 (Aegis Suit Scenes)
 *
 * Regenerates prompts for the Aegis Suit / motorcycle scenes using the
 * updated v0.18 pipeline with:
 * - Scene persistent state tracking
 * - Scene type template detection
 * - Post-generation validation (token budget, continuity, canonical terms)
 * - Updated Gemini system instruction
 *
 * Uses real session data from Redis and database character contexts.
 *
 * Usage: npx tsx scripts/test-v018-aegis-scenes.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { generateSwarmUiPrompts } from '../services/promptGenerationService';
import { processEpisodeWithFullContext, type FullyProcessedBeat } from '../services/beatStateService';
import type { AnalyzedEpisode, EpisodeStyleConfig } from '../types';
import * as fs from 'fs';

const SESSION_FILE = 'E:/REPOS/StoryArt/temp_session.json';

async function run() {
    console.log('==============================================================');
    console.log('v0.18 VALIDATION - Episode 2 Scenes 2-4 (Aegis/Motorcycle)');
    console.log('==============================================================\n');

    // Load real session data
    if (!fs.existsSync(SESSION_FILE)) {
        console.error('Session file not found. Run the Redis export first.');
        process.exit(1);
    }

    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const fullEpisode: AnalyzedEpisode = session.analyzedEpisode;
    const episodeContext: string = session.episodeContext;
    const storyId: string = session.storyUuid;

    // Filter to scenes 2-4 only
    const filteredEpisode: AnalyzedEpisode = {
        ...fullEpisode,
        scenes: fullEpisode.scenes.filter(s => s.sceneNumber >= 2 && s.sceneNumber <= 4)
    };

    const totalBeats = filteredEpisode.scenes.reduce((sum, s) => sum + s.beats.length, 0);
    console.log(`Scenes: ${filteredEpisode.scenes.map(s => `${s.sceneNumber} (${s.title}, ${s.beats.length} beats)`).join(', ')}`);
    console.log(`Total beats: ${totalBeats}`);
    console.log(`Story ID: ${storyId}`);
    console.log(`Retrieval mode: database`);
    console.log('');

    // Step 1: Process through beat state service (persistent state + templates)
    console.log('--- Step 1: Beat State Processing (Persistent State + Templates) ---\n');

    const episodeOptions: Record<number, { timeOfDay?: string | null; intensity?: number; pacing?: string; arcPhase?: string | null }> = {
        2: { timeOfDay: 'night_interior', intensity: 6, pacing: 'measured', arcPhase: 'RISING' },
        3: { timeOfDay: 'night_exterior', intensity: 7, pacing: 'brisk', arcPhase: 'RISING' },
        4: { timeOfDay: 'deep_night_exterior', intensity: 8, pacing: 'brisk', arcPhase: 'CLIMAX' }
    };

    const processed = processEpisodeWithFullContext(filteredEpisode, { sceneOverrides: episodeOptions });

    // Show persistent state and template for first few beats of each scene
    for (const scene of processed.episode.scenes) {
        console.log(`Scene ${scene.sceneNumber}: ${scene.title}`);
        const beatsToShow = Math.min(3, scene.beats.length);
        for (let i = 0; i < beatsToShow; i++) {
            const fb = scene.beats[i] as FullyProcessedBeat;
            const ps = fb.scenePersistentState;
            const tmpl = fb.sceneTemplate;
            console.log(`  ${fb.beatId}:`);
            if (ps) {
                console.log(`    [PersistentState] vehicle=${ps.vehicle || 'none'}, vehicleState=${ps.vehicleState || 'n/a'}, chars=[${ps.charactersPresent.join(',')}]`);
            }
            if (tmpl) {
                console.log(`    [Template] ${tmpl.templateType} - ${tmpl.templateReason}`);
            }
            console.log(`    [Shot] ${fb.fluxShotType} | [Angle] ${fb.fluxCameraAngle}`);
        }
        if (scene.beats.length > 3) {
            console.log(`    ... (${scene.beats.length - 3} more beats)`);
        }
        console.log('');
    }

    // Step 2: Generate prompts with updated Gemini system instruction
    console.log('--- Step 2: Gemini Prompt Generation (v0.18 system instruction) ---\n');

    const styleConfig: EpisodeStyleConfig = {
        model: 'flux1-dev-fp8',
        cinematicAspectRatio: '16:9',
        verticalAspectRatio: '9:16'
    };

    let lastProgress = '';
    const results = await generateSwarmUiPrompts(
        filteredEpisode,
        episodeContext,
        styleConfig,
        'database',
        storyId,
        'gemini',
        (message: string) => {
            // Only print scene-level progress, not per-beat
            if (message !== lastProgress && (message.includes('Scene') || message.includes('complete') || message.includes('Verif'))) {
                console.log(`  [Progress] ${message}`);
                lastProgress = message;
            }
        }
    );

    // Step 3: Show results with validation
    console.log('\n--- Step 3: Results with Validation ---\n');

    let totalTokenWarnings = 0;
    let totalContinuityWarnings = 0;
    let totalCanonicalWarnings = 0;
    let totalAlternateRecs = 0;
    let totalVisorViolations = 0;

    for (const result of results) {
        const v = result.validation;
        const hasIssues = v && (v.tokenBudgetExceeded || v.missingCharacters.length > 0 || v.missingVehicle || v.forbiddenTermsFound.length > 0 || v.visorViolation || v.modelRecommendation === 'ALTERNATE');

        if (hasIssues) {
            console.log(`${result.beatId}:`);
            if (v!.tokenBudgetExceeded) {
                console.log(`  [TOKEN BUDGET EXCEEDED] ${v!.tokenCount} tokens (limit: 200)`);
                totalTokenWarnings++;
            }
            if (v!.missingCharacters.length > 0) {
                console.log(`  [CONTINUITY] Missing characters: ${v!.missingCharacters.join(', ')}`);
                totalContinuityWarnings++;
            }
            if (v!.missingVehicle) {
                console.log(`  [CONTINUITY] Vehicle missing from prompt`);
                totalContinuityWarnings++;
            }
            if (v!.forbiddenTermsFound.length > 0) {
                console.log(`  [CANONICAL] Forbidden terms: ${v!.forbiddenTermsFound.join(', ')}`);
                totalCanonicalWarnings++;
            }
            if (v!.visorViolation) {
                console.log(`  [VISOR] Visor state violation detected`);
                totalVisorViolations++;
            }
            if (v!.modelRecommendation === 'ALTERNATE') {
                console.log(`  [MODEL] Recommend ALTERNATE: ${v!.modelRecommendationReason}`);
                totalAlternateRecs++;
            }
        }
    }

    // Step 4: Summary
    console.log('\n==============================================================');
    console.log('VALIDATION SUMMARY');
    console.log('==============================================================');
    console.log(`Total prompts generated: ${results.length}`);
    console.log(`Token budget exceeded:   ${totalTokenWarnings} / ${results.length}`);
    console.log(`Continuity warnings:     ${totalContinuityWarnings}`);
    console.log(`Canonical violations:    ${totalCanonicalWarnings}`);
    console.log(`Visor violations:        ${totalVisorViolations}`);
    console.log(`ALTERNATE model recs:    ${totalAlternateRecs}`);
    console.log('');

    // Show a few sample prompts (first beat of each scene)
    console.log('--- Sample Prompts (first beat of each scene) ---\n');
    const sceneFirstBeats = new Set<number>();
    for (const result of results) {
        const sceneNum = parseInt(result.beatId.split('-')[0].replace('s', ''));
        if (!sceneFirstBeats.has(sceneNum)) {
            sceneFirstBeats.add(sceneNum);
            console.log(`${result.beatId}:`);
            const prompt = result.cinematic?.prompt || '(no prompt)';
            console.log(`  ${prompt.substring(0, 300)}${prompt.length > 300 ? '...' : ''}`);
            if (result.validation) {
                console.log(`  [tokens: ${result.validation.tokenCount}, template: ${result.validation.sceneTemplate?.templateType || 'n/a'}]`);
            }
            console.log('');
        }
    }

    console.log('==============================================================');
    console.log('TEST COMPLETE');
    console.log('==============================================================');
}

run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
