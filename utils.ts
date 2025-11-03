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
 * Handles quoted names, partial matches, and various quote styles.
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
  
  characterContexts.forEach(({ character_name, aliases = [], base_trigger }) => {
    if (!character_name || !base_trigger) {
      return; // Skip invalid entries
    }
    
    // Capture aliases for use in inner loops
    const characterAliases = aliases;
    
    // Build list of all names to match (full name + aliases)
    const allNames = [character_name, ...characterAliases].filter(name => name && name.trim().length > 0);
    
    allNames.forEach(name => {
      const originalName = name;
      // Remove quotes from the name for matching (we'll handle quotes in patterns)
      const nameWithoutQuotes = name.replace(/['"]/g, '');
      const escapedName = escapeRegExp(nameWithoutQuotes);
      const escapedNameWithQuotes = escapeRegExp(name);
      
      // Strategy: Try multiple patterns to catch all variations
      
      // Pattern 1: Full name with word boundaries (handles "Catherine Mitchell" or "Cat")
      // This catches names without quotes
      const pattern1 = `\\b${escapedName}\\b`;
      
      // Pattern 2: Name with quotes on both sides (handles "Catherine" or 'Cat')
      const pattern2 = `["']${escapedName}["']`;
      
      // Pattern 3: Name with quote on one side (handles "Catherine or Cat")
      const pattern3 = `["']${escapedName}\\b|\\b${escapedName}["']`;
      
      // Pattern 4: Full name with embedded quotes (handles "Catherine 'Cat' Mitchell" or "Catherine "Cat" Mitchell")
      // Match the name as-is with any quote style - create a pattern that allows either quote type
      let pattern4 = '';
      if (name.includes("'") || name.includes('"')) {
        // Replace quotes with a regex character class pattern that matches either quote type
        // We'll construct this as a regex pattern, not a string replacement
        const nameParts = name.split(/(['"])/); // Split on quotes but keep them
        const patternParts: string[] = [];
        
        for (let i = 0; i < nameParts.length; i++) {
          const part = nameParts[i];
          if (part === "'" || part === '"') {
            // Quote character - use character class to match either quote type
            patternParts.push("['\"]");
          } else if (part.length > 0) {
            // Text part - escape it
            patternParts.push(escapeRegExp(part));
          }
        }
        
        pattern4 = patternParts.join('');
      }
      
      // Pattern 5: Direct match for "Catherine "Cat" Mitchell" style (quoted middle name)
      // This specifically handles the case where the name appears as: "Catherine "Cat" Mitchell"
      // by matching the pattern: Name "Alias" Surname
      let pattern5 = '';
      if (character_name.includes("'") || character_name.includes('"')) {
        const parts = character_name.split(/['"]/).map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 3) {
          // Pattern: "Catherine "Cat" Mitchell" or 'Catherine 'Cat' Mitchell'
          pattern5 = `${escapeRegExp(parts[0])}\\s*["']${escapeRegExp(parts[1])}["']\\s*${escapeRegExp(parts[2])}`;
        }
      }
      
      // Pattern 6: Match each word in a multi-word name individually, but only if it's a known alias
      // This catches "Catherine", "Cat", "Mitchell" separately, but only if they're in the aliases list
      // This prevents false positives (e.g., replacing "cat" the animal when we mean "Cat" the person)
      const words = nameWithoutQuotes.split(/\s+/).filter(w => w.length > 1);
      words.forEach(word => {
        // Only replace if this word is either:
        // 1. The full character name contains this word AND it's a substantial part (not just a common word)
        // 2. It's explicitly in the aliases list
        const isAlias = characterAliases.some(alias => alias.toLowerCase() === word.toLowerCase());
        const isSubstantialPart = word.length > 3 || isAlias; // Only replace short words if they're aliases
        
        if (isAlias || isSubstantialPart) {
          const escapedWord = escapeRegExp(word);
          // Use word boundary but also check it's not part of another word
          const wordPattern = `\\b${escapedWord}\\b`;
          const regex = new RegExp(wordPattern, 'gi');
          const before = substituted;
          substituted = substituted.replace(regex, base_trigger);
          if (before !== substituted) {
            totalReplacements++;
            console.log(`LORA Substitution: Replaced word "${word}" from "${originalName}" with "${base_trigger}"`);
          }
        }
      });
      
      // Try full name patterns
      const patterns: string[] = [pattern1, pattern2, pattern3];
      if (pattern4 && pattern4 !== escapedName) {
        patterns.push(pattern4);
      }
      if (pattern5) {
        patterns.push(pattern5);
      }
      
      patterns.forEach((pattern, idx) => {
        try {
          const regex = new RegExp(pattern, 'gi');
          const before = substituted;
          substituted = substituted.replace(regex, base_trigger);
          if (before !== substituted) {
            totalReplacements++;
            console.log(`LORA Substitution: Replaced "${originalName}" with "${base_trigger}" (pattern ${idx + 1})`);
          }
        } catch (e) {
          console.warn(`LORA Substitution: Invalid pattern ${idx + 1} for "${originalName}": ${pattern}`, e);
        }
      });
    });
    
    // Special handling for character names with embedded quotes like "Catherine 'Cat' Mitchell"
    // Split and match each part individually
    if (character_name.includes("'") || character_name.includes('"')) {
      const nameParts = character_name.split(/['"]/).map(part => part.trim()).filter(part => part.length > 1);
      
      nameParts.forEach(part => {
        const escapedPart = escapeRegExp(part);
        const partPattern = `\\b${escapedPart}\\b`;
        const partRegex = new RegExp(partPattern, 'gi');
        const before = substituted;
        substituted = substituted.replace(partRegex, base_trigger);
        if (before !== substituted) {
          totalReplacements++;
          console.log(`LORA Substitution: Replaced partial name "${part}" with "${base_trigger}"`);
        }
      });
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