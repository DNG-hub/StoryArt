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
          visual_description: character.visual_description,
          // Multi-phase support (v0.20): phase labels and triggers for beat analysis
          available_phases: (character.location_contexts || [])
            .reduce((phases: any[], context: any) => {
              const phaseLabel = context.context_phase || 'default';
              // Avoid duplicate phases
              if (!phases.some(p => p.phase === phaseLabel)) {
                phases.push({
                  phase: phaseLabel,
                  trigger: context.phase_trigger_text || null
                });
              }
              return phases;
            }, [])
        })) || [],
        scenes: fullContext.episode.scenes.map((scene: any) => ({
          scene_number: scene.scene_number,
          scene_title: scene.scene_title,
          character_appearances: (scene.character_appearances || []).map((appearance: any) => ({
            character_name: appearance.character_name,
            available_phases: (appearance.phases || [appearance.location_context])
              .map((phase: any) => ({
                phase: phase.context_phase || 'default',
                trigger: phase.phase_trigger_text || null
              }))
              .reduce((unique: any[], phase: any) => {
                if (!unique.some(p => p.phase === phase.phase)) {
                  unique.push(phase);
                }
                return unique;
              }, [])
          })),
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

// ============================================================================
// Per-Scene Script Splitting (eliminates chunk-and-merge duplication bug)
// ============================================================================

export interface SceneScript {
  sceneNumber: number;
  title: string;
  text: string;
}

/**
 * Splits a standardized episode script into individual scenes by ===SCENE=== markers.
 * Used for per-scene analysis to prevent duplicate scene entries from chunk merging.
 */
export function splitScriptByScenes(scriptText: string): SceneScript[] {
  const scenes: SceneScript[] = [];
  const sceneHeaderPattern = /===\s*SCENE\s+(\d+)\s*:\s*(.+?)\s*===/gi;

  const matches = [...scriptText.matchAll(sceneHeaderPattern)];

  if (matches.length === 0) {
    return [{
      sceneNumber: 1,
      title: 'Full Script',
      text: scriptText
    }];
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sceneNumber = parseInt(match[1], 10);
    const title = match[2].trim();
    const startIndex = match.index!;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : scriptText.length;
    const text = scriptText.substring(startIndex, endIndex).trim();
    scenes.push({ sceneNumber, title, text });
  }

  return scenes;
}

/**
 * Extracts episode number and title from the script header.
 */
export function parseEpisodeHeader(scriptText: string): { episodeNumber: number; title: string } {
  const headerMatch = scriptText.match(/EPISODE:\s*(\d+)\s+TITLE:\s*(.+?)(?:\s*===|\n|$)/i);
  if (headerMatch) {
    return {
      episodeNumber: parseInt(headerMatch[1], 10),
      title: headerMatch[2].trim()
    };
  }
  const epMatch = scriptText.match(/EPISODE:\s*(\d+)/i);
  return {
    episodeNumber: epMatch ? parseInt(epMatch[1], 10) : 1,
    title: 'Unknown Episode'
  };
}

/**
 * Compacts Episode Context JSON for a single scene.
 * Includes all episode-level characters but only the specific scene's location/artifacts.
 */
export function compactSceneContext(fullContextJson: string, sceneNumber: number): string {
  try {
    const fullContext = JSON.parse(fullContextJson);
    if (!fullContext.episode || !Array.isArray(fullContext.episode.scenes)) {
      return compactEpisodeContext(fullContextJson);
    }

    const sceneCtx = fullContext.episode.scenes.find(
      (s: any) => s.scene_number === sceneNumber
    );

    if (!sceneCtx) {
      console.warn(`compactSceneContext: Scene ${sceneNumber} not found in context, falling back to full episode`);
      return compactEpisodeContext(fullContextJson);
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
        scenes: [{
          scene_number: sceneCtx.scene_number,
          scene_title: sceneCtx.scene_title,
          location: {
            name: sceneCtx.location?.name,
            visual_description: sceneCtx.location?.visual_description,
            artifacts: (sceneCtx.location?.artifacts || []).map((artifact: any) => ({
              name: artifact.name,
              prompt_fragment: artifact.prompt_fragment
            }))
          }
        }]
      }
    };
    return JSON.stringify(compact, null, 2);
  } catch (error) {
    console.error("Failed to compact scene context:", error);
    return fullContextJson;
  }
}

/**
 * Escapes RegExp special characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces occurrences of character names or aliases with their base trigger within a prompt string.
 * Each name occurrence is replaced only ONCE to prevent duplicate triggers.
 * Triggers are never quoted and duplicate consecutive triggers are removed.
 * 
 * IMPORTANT: This function should ALWAYS substitute character names with triggers, even when
 * the name appears in an override. The override text may contain the character name, but
 * we still need to replace it with the LORA trigger for proper model recognition.
 */
export function applyLoraTriggerSubstitution(
  prompt: string,
  characterContexts: Array<{ character_name: string; aliases: string[]; base_trigger: string }>
): string {
  if (!characterContexts || characterContexts.length === 0) {
    console.warn('applyLoraTriggerSubstitution: No character contexts provided');
    return prompt;
  }
  
  let substituted = prompt;
  let totalReplacements = 0;
  
  // Debug: Log what we're looking for
  console.log(`🔍 LORA Substitution: Searching for ${characterContexts.length} character(s) in prompt`);
  characterContexts.forEach(({ character_name, aliases, base_trigger }) => {
    console.log(`   - "${character_name}" (aliases: ${aliases.join(', ')}) -> "${base_trigger}"`);
  });
  console.log(`   Prompt preview: "${prompt.substring(0, 100)}..."`);
  
  // Process each character context
  characterContexts.forEach(({ character_name, aliases = [], base_trigger }) => {
    if (!character_name || !base_trigger) {
      return; // Skip invalid entries
    }

    // CRITICAL: Check if the prompt already contains this LORA trigger
    // If it does, the prompt came from a database swarmui_prompt_override and should NOT be modified
    if (substituted.includes(base_trigger)) {
      console.log(`LORA Substitution: Skipping "${character_name}" - trigger "${base_trigger}" already present in prompt (likely from database override)`);
      return; // Skip this character - prompt already has the trigger
    }

    // Build list of all names to match, prioritizing full name over aliases
    // This ensures "Catherine Mitchell" is replaced before "Cat" to avoid partial matches
    const allNames = [character_name, ...aliases].filter(name => name && name.trim().length > 0);
    
    // Also split multi-word names into individual words for better matching
    // This helps catch "Catherine" when the full name "Catherine Mitchell" doesn't match
    const nameWords: string[] = [];
    allNames.forEach(name => {
      nameWords.push(name); // Full name first
      const words = name.split(/\s+/).filter(w => w.length > 2); // Individual words (length > 2 to avoid false positives)
      words.forEach(word => {
        if (!nameWords.includes(word)) {
          nameWords.push(word);
        }
      });
    });
    
    // Process names in order of specificity (longer names first to avoid partial matches)
    const sortedNames = nameWords.sort((a, b) => b.length - a.length);
    
    // Track what we've already replaced to avoid double-replacement
    const replacedPositions = new Set<string>();
    
    sortedNames.forEach(name => {
      const originalName = name;
      const nameWithoutQuotes = name.replace(/['"]/g, '');
      const escapedName = escapeRegExp(nameWithoutQuotes);
      
      // Check if this name appears in the prompt (case-insensitive)
      const promptLower = substituted.toLowerCase();
      const nameLower = nameWithoutQuotes.toLowerCase();
      
      if (!promptLower.includes(nameLower)) {
        // Name doesn't appear in prompt, skip
        return;
      }
      
      // Pattern 1: Full name with word boundaries (handles "Catherine Mitchell" or "Cat")
      const pattern1 = `\\b${escapedName}\\b`;
      
      // Pattern 2: Name with quotes on both sides (handles "Catherine" or 'Cat')
      const pattern2 = `["']${escapedName}["']`;
      
      // Pattern 3: Name with quote on one side (handles "Catherine or Cat")
      const pattern3 = `["']${escapedName}\\b|\\b${escapedName}["']`;
      
      // Pattern 4: Case-insensitive match WITH word boundaries
      // Fixed: Added word boundaries to prevent matching "Cat" inside "Catches"
      const pattern4 = `\\b${escapedName}\\b`;
      
      // Try patterns in order
      const patterns: Array<{ pattern: string; removeQuotes: boolean; description: string }> = [
        { pattern: pattern1, removeQuotes: false, description: 'word boundary' },
        { pattern: pattern2, removeQuotes: true, description: 'quoted' },
        { pattern: pattern3, removeQuotes: true, description: 'partial quoted' },
        { pattern: pattern4, removeQuotes: false, description: 'case-insensitive' },
      ];
      
      patterns.forEach(({ pattern, removeQuotes, description }, idx) => {
        try {
          const regex = new RegExp(pattern, 'gi');
          const matches = [...substituted.matchAll(regex)];
          
          // Process matches in reverse order to maintain positions
          for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            const matchText = match[0];
            const startPos = match.index!;
            const endPos = startPos + matchText.length;
            const positionKey = `${startPos}-${endPos}`;
            
            // Skip if already replaced
            if (replacedPositions.has(positionKey)) {
              continue;
            }
            
            // Check if match still contains the character name (not already replaced with trigger)
            const matchLower = matchText.toLowerCase();
            const nameLower = nameWithoutQuotes.toLowerCase();
            
            // Only replace if the match contains the character name
            // Also check it doesn't already contain the trigger
            const containsName = matchLower.includes(nameLower);
            const containsTrigger = matchLower.includes(base_trigger.toLowerCase());
            
            if (containsName && !containsTrigger) {
              // Replace this match
              const before = substituted;
              substituted = substituted.substring(0, startPos) + base_trigger + substituted.substring(endPos);
              
              // Mark this position as replaced
              replacedPositions.add(positionKey);
              
              totalReplacements++;
              console.log(`✅ LORA Substitution: Replaced "${originalName}" (${matchText}) with "${base_trigger}" using ${description} pattern`);
              
              // Log the context around the replacement
              const contextStart = Math.max(0, startPos - 30);
              const contextEnd = Math.min(substituted.length, startPos + base_trigger.length + 30);
              const context = substituted.substring(contextStart, contextEnd);
              console.log(`   Context: "...${context}..."`);
            }
          }
        } catch (e) {
          console.warn(`LORA Substitution: Invalid pattern for "${originalName}": ${pattern}`, e);
        }
      });
    });
  });
  
  // Step 2: Remove duplicate consecutive triggers
  // This handles cases where a trigger might appear multiple times in a row
  const allTriggers = characterContexts.map(c => c.base_trigger).filter(t => t && t.trim().length > 0);
  allTriggers.forEach(trigger => {
    // Escape the trigger for regex
    const escapedTrigger = escapeRegExp(trigger);
    // Match 2+ consecutive occurrences of the trigger (with optional whitespace/punctuation between)
    const duplicatePattern = new RegExp(`(${escapedTrigger})(?:\\s*["']?\\s*${escapedTrigger})+`, 'gi');
    
    const before = substituted;
    substituted = substituted.replace(duplicatePattern, trigger);
    
    if (before !== substituted) {
      console.log(`LORA Substitution: Removed duplicate consecutive triggers: "${trigger}"`);
    }
  });
  
  // Step 3: Remove quoted triggers (e.g., "JRUMLV woman" should be just JRUMLV woman)
  allTriggers.forEach(trigger => {
    const escapedTrigger = escapeRegExp(trigger);
    // Match trigger with quotes around it
    const quotedPattern = new RegExp(`["']${escapedTrigger}["']`, 'gi');
    
    const before = substituted;
    substituted = substituted.replace(quotedPattern, trigger);
    
    if (before !== substituted) {
      console.log(`LORA Substitution: Removed quotes around trigger: "${trigger}"`);
    }
  });
  
  if (totalReplacements === 0) {
    console.warn(`LORA Substitution: No replacements made for character names: ${characterContexts.map(c => c.character_name).join(', ')}`);
    console.log(`LORA Substitution: Prompt preview: ${prompt.substring(0, 200)}...`);
  } else {
    console.log(`LORA Substitution: Total replacements made: ${totalReplacements}`);
  }
  
  return substituted;
}