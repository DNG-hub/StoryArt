// utils.ts
import type { AnalyzedEpisode, BeatAnalysis, ReuseImageDecision } from './types';

export function parseEpisodeNumber(scriptText: string): number | null {
  const match = scriptText.match(/^EPISODE:\s*(\d+)/im);
  if (match && match[1]) {
    const episodeNumber = parseInt(match[1], 10);
    return isNaN(episodeNumber) ? null : episodeNumber;
  }
  return null;
}

/**
 * Compacts the full episode context JSON to a smaller, visually-focused version.
 * This reduces the token count sent to the Gemini API to prevent context window errors.
 * @param fullContextJson The original, detailed episode context JSON string.
 * @returns A compacted JSON string containing only visually relevant information.
 */
export function compactEpisodeContext(fullContextJson: string): string {
  try {
    const fullContext = JSON.parse(fullContextJson);
    if (!fullContext.episode || !Array.isArray(fullContext.episode.scenes)) {
        return fullContextJson; // Return original if structure is not as expected
    }

    const compact = {
      episode: {
        episode_number: fullContext.episode.episode_number,
        episode_title: fullContext.episode.episode_title,
        characters: fullContext.episode.characters?.map((character: any) => ({
          character_name: character.character_name,
          aliases: character.aliases,
          base_trigger: character.base_trigger,
          visual_description: character.visual_description
        })) || [],
        scenes: fullContext.episode.scenes.map((scene: any) => ({
          scene_number: scene.scene_number,
          scene_title: scene.scene_title,
          location: {
            name: scene.location?.name,
            visual_description: scene.location?.visual_description,
            artifacts: (scene.location?.artifacts || []).map((artifact: any) => ({
              name: artifact.name,
              prompt_fragment: artifact.prompt_fragment
            }))
          }
        }))
      }
    };
    return JSON.stringify(compact, null, 2);
  } catch (error) {
    console.error("Failed to compact episode context:", error);
    // If compaction fails for any reason, return the original string to avoid breaking the flow.
    return fullContextJson;
  }
}

/**
 * Post-processes the AI analysis to fix and populate human-readable labels.
 * This ensures that the `reuseSourceBeatLabel` is always correct and present.
 * It now trims whitespace from IDs to handle minor AI formatting inconsistencies.
 * @param analysis The raw analysis object from the Gemini API.
 * @returns The processed analysis object with corrected labels.
 */
export function postProcessAnalysis(analysis: AnalyzedEpisode): AnalyzedEpisode {
    const beatMap = new Map<string, string>();
  
    // First, create a map of all beat IDs to their human-readable labels
    analysis.scenes.forEach(scene => {
      scene.beats.forEach((beat) => {
        const beatLabel = `Scene ${scene.sceneNumber}, Beat ${beat.beatId}`;
        if (beat.beatId) {
            beatMap.set(beat.beatId.trim(), beatLabel);
        }
      });
    });
  
    // Now, iterate through and fix the reuse labels
    analysis.scenes.forEach(scene => {
      scene.beats.forEach(beat => {
        if (beat.imageDecision.type === 'REUSE_IMAGE') {
          const decision = beat.imageDecision as ReuseImageDecision;
          if (decision.reuseSourceBeatId) {
              const sourceLabel = beatMap.get(decision.reuseSourceBeatId.trim());
              // If the lookup fails, include the original ID for debugging purposes.
              decision.reuseSourceBeatLabel = sourceLabel || `Unknown Source (ID: ${decision.reuseSourceBeatId})`;
          } else {
              decision.reuseSourceBeatLabel = 'Unknown Source (ID missing)';
          }
        }
      });
    });
  
    return analysis;
}

/**
 * Escapes RegExp special characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces occurrences of character names or aliases with their base trigger within a prompt string.
 */
export function applyLoraTriggerSubstitution(
  prompt: string,
  characterContexts: Array<{ character_name: string; aliases: string[]; base_trigger: string }>
): string {
  let substituted = prompt;
  characterContexts.forEach(({ character_name, aliases = [], base_trigger }) => {
    const names = [character_name, ...aliases];
    const pattern = names.map(name => `\\b${escapeRegExp(name)}\\b`).join('|');
    const regex = new RegExp(pattern, 'gi');
    substituted = substituted.replace(regex, base_trigger);
  });
  return substituted;
}