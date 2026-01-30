/**
 * Search for specific text in all prompts
 *
 * Usage:
 *   SEARCH_TEXT="text to find" node scripts/search-text-in-prompts.js
 *   TIMESTAMP=1234567890 SEARCH_TEXT="text" node scripts/search-text-in-prompts.js
 *
 * Environment Variables:
 *   SEARCH_TEXT - Text to search for (required)
 *   TIMESTAMP - Specific session timestamp (default: latest)
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const TIMESTAMP = process.env.TIMESTAMP || null;
const SEARCH_TEXT = process.env.SEARCH_TEXT || process.argv[2];

const SESSION_KEY_PREFIX = 'storyart:session:';
const SESSION_INDEX_KEY = 'storyart:sessions:index';

const client = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}/0`
});

async function getLatestSessionKey() {
  const latestSessions = await client.zRange(SESSION_INDEX_KEY, 0, 0, { REV: true });
  if (latestSessions.length === 0) {
    throw new Error('No sessions found in Redis');
  }
  return latestSessions[0];
}

async function searchSession(sessionKey, searchText) {
  console.log(`\n🔍 Searching for: "${searchText}"\n`);

  const sessionData = await client.get(sessionKey);
  if (!sessionData) {
    console.log('❌ Session data not found');
    return;
  }

  let session;
  try {
    session = JSON.parse(sessionData);
  } catch (error) {
    console.log('❌ Failed to parse session JSON:', error.message);
    return;
  }

  if (!session.analyzedEpisode || !session.analyzedEpisode.scenes) {
    console.log('⚠️  No analyzed episode data found');
    return;
  }

  console.log(`Episode ${session.analyzedEpisode.episodeNumber}: ${session.analyzedEpisode.title}`);
  console.log(`Scenes: ${session.analyzedEpisode.scenes.length}\n`);

  let totalMatches = 0;
  let beatsWithMatches = 0;
  const matchesByPromptType = {
    cinematic: 0,
    vertical: 0,
    marketingVertical: 0
  };

  // Search through all scenes and beats
  for (const scene of session.analyzedEpisode.scenes) {
    if (!scene.beats || scene.beats.length === 0) continue;

    for (const beat of scene.beats) {
      let beatHasMatch = false;

      // Check all prompt types
      const promptTypes = ['cinematic', 'vertical', 'marketingVertical'];

      for (const promptType of promptTypes) {
        if (beat.prompts && beat.prompts[promptType] && beat.prompts[promptType].prompt) {
          const prompt = beat.prompts[promptType].prompt;

          if (prompt.includes(searchText)) {
            totalMatches++;
            matchesByPromptType[promptType]++;
            beatHasMatch = true;

            // Show first 5 matches with context
            if (totalMatches <= 5) {
              console.log(`Match ${totalMatches}:`);
              console.log(`  Scene ${scene.sceneNumber} - Beat ${beat.beatId} - ${promptType.toUpperCase()}`);

              // Show context around the match
              const matchIndex = prompt.indexOf(searchText);
              const contextStart = Math.max(0, matchIndex - 50);
              const contextEnd = Math.min(prompt.length, matchIndex + searchText.length + 50);
              const context = prompt.substring(contextStart, contextEnd);

              console.log(`  Context: ...${context}...`);
              console.log('');
            }
          }
        }
      }

      if (beatHasMatch) {
        beatsWithMatches++;
      }
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total matches found: ${totalMatches}`);
  console.log(`Beats with matches: ${beatsWithMatches}`);
  console.log('');
  console.log('Matches by prompt type:');
  console.log(`  Cinematic (16:9):        ${matchesByPromptType.cinematic}`);
  console.log(`  Vertical (9:16):         ${matchesByPromptType.vertical}`);
  console.log(`  Marketing Vertical:      ${matchesByPromptType.marketingVertical}`);
  console.log('');

  if (totalMatches > 5) {
    console.log(`(Showing first 5 matches only. Total: ${totalMatches})`);
  }
}

async function main() {
  if (!SEARCH_TEXT) {
    console.error('❌ SEARCH_TEXT environment variable or argument is required');
    console.error('Usage: SEARCH_TEXT="text to find" node scripts/search-text-in-prompts.js');
    console.error('   or: node scripts/search-text-in-prompts.js "text to find"');
    process.exit(1);
  }

  console.log('🔍 Prompt Text Search\n');

  try {
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

      await searchSession(sessionKey, SEARCH_TEXT);
    } else {
      console.log('🔍 Finding latest session...');
      sessionKey = await getLatestSessionKey();
      console.log(`✅ Found latest session: ${sessionKey}\n`);

      await searchSession(sessionKey, SEARCH_TEXT);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

main().catch(console.error);
