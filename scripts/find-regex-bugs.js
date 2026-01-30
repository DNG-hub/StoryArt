/**
 * Find Regex Replacement Bugs
 *
 * Finds instances where "Cat" was incorrectly replaced with "JRUMLV woman"
 * in the middle of words (e.g., "Catches" -> "JRUMLV womanches")
 *
 * Usage:
 *   node scripts/find-regex-bugs.js
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const TIMESTAMP = process.env.TIMESTAMP || null;

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

async function findBugs(sessionKey) {
  console.log(`\n🔍 Searching for regex replacement bugs...\n`);

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

  const bugPatterns = [
    {
      name: '"JRUMLV woman" + lowercase letter',
      regex: /JRUMLV woman[a-z]/g,
      description: '"Cat" replaced in middle of word (e.g., "Catches" -> "JRUMLV womanches")'
    },
    {
      name: '"HSCEIA man" + lowercase letter',
      regex: /HSCEIA man[a-z]/g,
      description: '"Dan" or "Daniel" replaced in middle of word'
    },
    {
      name: 'Trigger + lowercase (any trigger)',
      regex: /(JRUMLV|HSCEIA|webbman|2kwoman|ghost_v1|preacher_v1|liam_o'brien_v1|maria_santos_v1|rei_klepstein_v1|chen chen) (woman|man|v1)[a-z]/gi,
      description: 'Any trigger word replacement bug'
    }
  ];

  const foundBugs = [];

  // Search through all scenes and beats
  for (const scene of session.analyzedEpisode.scenes) {
    if (!scene.beats || scene.beats.length === 0) continue;

    for (const beat of scene.beats) {
      const promptTypes = ['cinematic', 'vertical', 'marketingVertical'];

      for (const promptType of promptTypes) {
        if (beat.prompts && beat.prompts[promptType] && beat.prompts[promptType].prompt) {
          const prompt = beat.prompts[promptType].prompt;

          for (const pattern of bugPatterns) {
            const matches = prompt.match(pattern.regex);

            if (matches) {
              matches.forEach(match => {
                foundBugs.push({
                  scene: scene.sceneNumber,
                  beat: beat.beatId,
                  promptType,
                  match,
                  pattern: pattern.name,
                  context: getContext(prompt, match)
                });
              });
            }
          }
        }
      }
    }
  }

  // Display results
  console.log('='.repeat(80));
  console.log('🐛 REGEX BUGS FOUND');
  console.log('='.repeat(80));

  if (foundBugs.length === 0) {
    console.log('✅ No regex replacement bugs found!');
    return;
  }

  console.log(`Found ${foundBugs.length} instance(s) of regex replacement bugs:\n`);

  foundBugs.forEach((bug, index) => {
    console.log(`${index + 1}. Scene ${bug.scene} - Beat ${bug.beat} - ${bug.promptType.toUpperCase()}`);
    console.log(`   Bug: "${bug.match}"`);
    console.log(`   Context: ...${bug.context}...`);
    console.log('');
  });

  // Summary by pattern
  console.log('='.repeat(80));
  console.log('📊 SUMMARY BY PATTERN');
  console.log('='.repeat(80));

  const byPattern = {};
  foundBugs.forEach(bug => {
    if (!byPattern[bug.pattern]) {
      byPattern[bug.pattern] = [];
    }
    byPattern[bug.pattern].push(bug.match);
  });

  Object.entries(byPattern).forEach(([pattern, matches]) => {
    console.log(`\n${pattern}:`);
    console.log(`  Total: ${matches.length} instance(s)`);

    // Count unique matches
    const uniqueMatches = [...new Set(matches)];
    uniqueMatches.forEach(match => {
      const count = matches.filter(m => m === match).length;
      console.log(`    "${match}" - ${count} time(s)`);
    });
  });
}

function getContext(text, match) {
  const matchIndex = text.indexOf(match);
  if (matchIndex === -1) return match;

  const contextStart = Math.max(0, matchIndex - 40);
  const contextEnd = Math.min(text.length, matchIndex + match.length + 40);

  return text.substring(contextStart, contextEnd);
}

async function main() {
  console.log('🐛 Regex Replacement Bug Finder\n');

  try {
    console.log('📡 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected to Redis\n');

    let sessionKey;

    if (TIMESTAMP) {
      sessionKey = `${SESSION_KEY_PREFIX}${TIMESTAMP}`;
      const exists = await client.exists(sessionKey);
      if (!exists) {
        console.log(`❌ Session not found: ${sessionKey}`);
        return;
      }
    } else {
      console.log('🔍 Finding latest session...');
      sessionKey = await getLatestSessionKey();
      console.log(`✅ Found latest session: ${sessionKey}\n`);
    }

    await findBugs(sessionKey);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

main().catch(console.error);
