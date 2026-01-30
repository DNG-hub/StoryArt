/**
 * Search Character Descriptions Script
 *
 * Searches for all instances of character descriptions in prompts
 * to identify what variations exist
 *
 * Usage:
 *   node scripts/search-character-descriptions.js
 *
 * Environment Variables:
 *   TIMESTAMP - Specific session timestamp to search (default: latest)
 *   CHARACTER - Character trigger to search for (default: JRUMLV woman)
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const TIMESTAMP = process.env.TIMESTAMP || null;
const CHARACTER = process.env.CHARACTER || 'JRUMLV woman';

const SESSION_KEY_PREFIX = 'storyart:session:';
const SESSION_INDEX_KEY = 'storyart:sessions:index';

const client = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}/0`
});

let stats = {
  totalBeats: 0,
  beatsWithCharacter: 0,
  promptsWithCharacter: 0,
  descriptions: new Map() // Map of description -> count
};

async function getLatestSessionKey() {
  const latestSessions = await client.zRange(SESSION_INDEX_KEY, 0, 0, { REV: true });
  if (latestSessions.length === 0) {
    throw new Error('No sessions found in Redis');
  }
  return latestSessions[0];
}

function extractCharacterDescription(prompt, character) {
  // Find the character trigger in the prompt
  const characterIndex = prompt.indexOf(character);
  if (characterIndex === -1) return null;

  // Look for the opening parenthesis after the character name
  const startIndex = prompt.indexOf('(', characterIndex);
  if (startIndex === -1) return character; // No description in parentheses

  // Find the matching closing parenthesis
  let depth = 1;
  let endIndex = startIndex + 1;
  while (endIndex < prompt.length && depth > 0) {
    if (prompt[endIndex] === '(') depth++;
    if (prompt[endIndex] === ')') depth--;
    endIndex++;
  }

  if (depth !== 0) return character; // Unbalanced parentheses

  // Extract the full character with description
  return prompt.substring(characterIndex, endIndex);
}

async function searchSession(sessionKey) {
  console.log(`\n🔍 Searching session: ${sessionKey}`);

  const sessionData = await client.get(sessionKey);
  if (!sessionData) {
    console.log('   ❌ Session data not found');
    return;
  }

  let session;
  try {
    session = JSON.parse(sessionData);
  } catch (error) {
    console.log('   ❌ Failed to parse session JSON:', error.message);
    return;
  }

  if (!session.analyzedEpisode || !session.analyzedEpisode.scenes) {
    console.log('   ⚠️  No analyzed episode data found');
    return;
  }

  console.log(`   Episode ${session.analyzedEpisode.episodeNumber}: ${session.analyzedEpisode.title}`);
  console.log(`   Scenes: ${session.analyzedEpisode.scenes.length}\n`);

  // Search through all scenes and beats
  for (const scene of session.analyzedEpisode.scenes) {
    if (!scene.beats || scene.beats.length === 0) continue;

    for (const beat of scene.beats) {
      stats.totalBeats++;
      let beatHasCharacter = false;

      // Check all prompt types
      const promptTypes = ['cinematic', 'vertical', 'marketingVertical'];

      for (const promptType of promptTypes) {
        if (beat.prompts && beat.prompts[promptType] && beat.prompts[promptType].prompt) {
          const prompt = beat.prompts[promptType].prompt;

          if (prompt.includes(CHARACTER)) {
            stats.promptsWithCharacter++;
            beatHasCharacter = true;

            // Extract the full character description
            const description = extractCharacterDescription(prompt, CHARACTER);

            if (description) {
              const count = stats.descriptions.get(description) || 0;
              stats.descriptions.set(description, count + 1);

              // Show first few occurrences in detail
              if (count < 5) {
                console.log(`   Scene ${scene.sceneNumber} - Beat ${beat.beatId} - ${promptType.toUpperCase()}`);
                console.log(`      "${description}"`);

                // Show context (50 chars before and after)
                const descIndex = prompt.indexOf(description);
                const contextStart = Math.max(0, descIndex - 50);
                const contextEnd = Math.min(prompt.length, descIndex + description.length + 50);
                const context = prompt.substring(contextStart, contextEnd);
                console.log(`      Context: ...${context}...`);
                console.log('');
              }
            }
          }
        }
      }

      if (beatHasCharacter) {
        stats.beatsWithCharacter++;
      }
    }
  }
}

async function main() {
  console.log(`🔍 Searching for character: "${CHARACTER}"\n`);

  try {
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected to Redis\n');

    let sessionKey;

    if (TIMESTAMP) {
      sessionKey = `${SESSION_KEY_PREFIX}${TIMESTAMP}`;
      console.log(`🎯 Using specific session: ${sessionKey}\n`);

      const exists = await client.exists(sessionKey);
      if (!exists) {
        console.log(`❌ Session not found: ${sessionKey}`);
        return;
      }

      await searchSession(sessionKey);
    } else {
      console.log('🔍 Finding latest session...');
      sessionKey = await getLatestSessionKey();
      console.log(`✅ Found latest session: ${sessionKey}\n`);

      await searchSession(sessionKey);
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total beats:                 ${stats.totalBeats}`);
    console.log(`Beats with "${CHARACTER}":    ${stats.beatsWithCharacter}`);
    console.log(`Prompts with "${CHARACTER}":  ${stats.promptsWithCharacter}`);
    console.log('');
    console.log('Description variations found:');
    console.log('='.repeat(80));

    // Sort descriptions by count (descending)
    const sortedDescriptions = Array.from(stats.descriptions.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedDescriptions.forEach(([description, count], index) => {
      console.log(`\n${index + 1}. Count: ${count}`);
      console.log(`   "${description}"`);
    });

    if (sortedDescriptions.length > 1) {
      console.log('\n⚠️  Multiple description variations found!');
      console.log('   You may want to standardize these descriptions.');
    } else if (sortedDescriptions.length === 1) {
      console.log('\n✅ All descriptions are consistent!');
    } else {
      console.log(`\nℹ️  No instances of "${CHARACTER}" found in prompts.`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

main().catch(console.error);
