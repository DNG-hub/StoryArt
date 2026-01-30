/**
 * Bulk Edit Multiple Character Descriptions Script
 *
 * Finds and replaces multiple variations of incorrect JRUMLV woman descriptions
 *
 * Usage:
 *   npm run edit:character:multi
 *
 * Or with specific timestamp:
 *   TIMESTAMP=1737725000000 npm run edit:character:multi
 *
 * Dry run (preview changes without applying):
 *   DRY_RUN=true npm run edit:character:multi
 *
 * Environment Variables:
 *   REDIS_HOST - Redis host (default: localhost)
 *   REDIS_PORT - Redis port (default: 6379)
 *   TIMESTAMP - Specific session timestamp to edit (default: latest)
 *   DRY_RUN - If set to 'true', preview changes without applying
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const TIMESTAMP = process.env.TIMESTAMP || null;
const DRY_RUN = process.env.DRY_RUN === 'true';

const SESSION_KEY_PREFIX = 'storyart:session:';
const SESSION_INDEX_KEY = 'storyart:sessions:index';

// The correct description to replace ALL variations with
const CORRECT_DESCRIPTION = 'JRUMLV woman (combat camo pants, form fitting white cotton halter top, ponytail hairstyle, small stud earrings)';

// Array of incorrect descriptions to find and replace
const FIND_PATTERNS = [
  'JRUMLV woman (dark brown tactical bun)',
  'JRUMLV woman (dark brown ponytail, green eyes with gold flecks, lean athletic build, toned arms, wearing form fitting white cotton halter top)',
  'JRUMLV woman (ponytail, form fitting halter top, lean build)',
  'JRUMLV woman (form fitting halter top, ponytail, lean build)',
  'JRUMLV woman (dark brown tactical bun, lean athletic build)'
];

const client = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}/0`
});

let stats = {
  sessionsProcessed: 0,
  beatsChecked: 0,
  beatsModified: 0,
  promptsModified: 0,
  patternCounts: new Map(), // Track how many of each pattern we found
  errors: []
};

// Initialize pattern counts
FIND_PATTERNS.forEach(pattern => {
  stats.patternCounts.set(pattern, 0);
});

async function getLatestSessionKey() {
  // Get the latest session from the sorted set
  const latestSessions = await client.zRange(SESSION_INDEX_KEY, 0, 0, { REV: true });

  if (latestSessions.length === 0) {
    throw new Error('No sessions found in Redis');
  }

  return latestSessions[0];
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function editSession(sessionKey) {
  console.log(`\n📝 Processing session: ${sessionKey}`);

  // Get session data
  const sessionData = await client.get(sessionKey);

  if (!sessionData) {
    console.log('   ❌ Session data not found');
    return;
  }

  // Parse session data
  let session;
  try {
    session = JSON.parse(sessionData);
  } catch (error) {
    console.log('   ❌ Failed to parse session JSON:', error.message);
    stats.errors.push(`Failed to parse ${sessionKey}: ${error.message}`);
    return;
  }

  // Check if analyzedEpisode exists
  if (!session.analyzedEpisode || !session.analyzedEpisode.scenes) {
    console.log('   ⚠️  No analyzed episode data found');
    return;
  }

  console.log(`   Episode ${session.analyzedEpisode.episodeNumber}: ${session.analyzedEpisode.title}`);
  console.log(`   Scenes: ${session.analyzedEpisode.scenes.length}\n`);

  let sessionModified = false;

  // Iterate through scenes and beats
  for (const scene of session.analyzedEpisode.scenes) {
    if (!scene.beats || scene.beats.length === 0) {
      continue;
    }

    for (const beat of scene.beats) {
      stats.beatsChecked++;
      let beatModified = false;

      // Check if beat has prompts
      if (beat.prompts) {
        // Check all prompt types
        const promptTypes = ['cinematic', 'vertical', 'marketingVertical'];

        for (const promptType of promptTypes) {
          if (beat.prompts[promptType] && beat.prompts[promptType].prompt) {
            const originalPrompt = beat.prompts[promptType].prompt;
            let newPrompt = originalPrompt;
            let foundPattern = null;

            // Try to find and replace each pattern
            for (const pattern of FIND_PATTERNS) {
              if (newPrompt.includes(pattern)) {
                foundPattern = pattern;
                const regex = new RegExp(escapeRegex(pattern), 'g');
                newPrompt = newPrompt.replace(regex, CORRECT_DESCRIPTION);

                // Track which pattern we found
                const currentCount = stats.patternCounts.get(pattern) || 0;
                stats.patternCounts.set(pattern, currentCount + 1);

                break; // Only replace one pattern per prompt
              }
            }

            if (newPrompt !== originalPrompt && foundPattern) {
              console.log(`     🔍 Beat ${beat.beatId} - ${promptType.toUpperCase()} - Found pattern:`);
              console.log(`        Pattern: "${foundPattern}"`);

              // Show context around the change
              const patternIndex = originalPrompt.indexOf(foundPattern);
              const contextStart = Math.max(0, patternIndex - 30);
              const contextEnd = Math.min(originalPrompt.length, patternIndex + foundPattern.length + 30);

              console.log(`        Before: ...${originalPrompt.substring(contextStart, contextEnd)}...`);

              const newPatternIndex = newPrompt.indexOf(CORRECT_DESCRIPTION);
              const newContextStart = Math.max(0, newPatternIndex - 30);
              const newContextEnd = Math.min(newPrompt.length, newPatternIndex + CORRECT_DESCRIPTION.length + 30);

              console.log(`        After:  ...${newPrompt.substring(newContextStart, newContextEnd)}...`);

              beat.prompts[promptType].prompt = newPrompt;
              stats.promptsModified++;
              beatModified = true;
            }
          }
        }
      }

      if (beatModified) {
        stats.beatsModified++;
        sessionModified = true;
      }
    }
  }

  // Save modified session back to Redis
  if (sessionModified) {
    if (!DRY_RUN) {
      // Get original TTL
      const ttl = await client.ttl(sessionKey);

      // Save updated session
      const updatedSessionData = JSON.stringify(session);

      if (ttl > 0) {
        await client.setEx(sessionKey, ttl, updatedSessionData);
      } else {
        await client.set(sessionKey, updatedSessionData);
      }

      console.log(`\n   ✅ Session updated in Redis`);
    } else {
      console.log(`\n   🔍 DRY RUN - Changes would be applied`);
    }

    stats.sessionsProcessed++;
  } else {
    console.log(`\n   ℹ️  No changes needed for this session`);
  }
}

async function main() {
  console.log('🔧 Bulk Edit Multiple Character Descriptions Script\n');
  console.log('Finding and replacing the following patterns:');
  FIND_PATTERNS.forEach((pattern, index) => {
    console.log(`  ${index + 1}. "${pattern}"`);
  });
  console.log('');
  console.log('Replace with:');
  console.log(`  "${CORRECT_DESCRIPTION}"`);
  console.log('');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected to Redis\n');

    let sessionKey;

    if (TIMESTAMP) {
      // Use specific timestamp
      sessionKey = `${SESSION_KEY_PREFIX}${TIMESTAMP}`;
      console.log(`🎯 Using specific session: ${sessionKey}\n`);

      // Check if session exists
      const exists = await client.exists(sessionKey);
      if (!exists) {
        console.log(`❌ Session not found: ${sessionKey}`);
        console.log('\nAvailable sessions:');
        const allSessions = await client.zRange(SESSION_INDEX_KEY, 0, -1, { REV: true });
        allSessions.forEach((key, index) => {
          const timestamp = key.replace(SESSION_KEY_PREFIX, '');
          const date = new Date(parseInt(timestamp));
          console.log(`  ${index + 1}. ${key} (${date.toLocaleString()})`);
        });
        return;
      }

      await editSession(sessionKey);
    } else {
      // Get latest session
      console.log('🔍 Finding latest session...');
      sessionKey = await getLatestSessionKey();
      console.log(`✅ Found latest session: ${sessionKey}\n`);

      await editSession(sessionKey);
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Sessions processed:   ${stats.sessionsProcessed}`);
    console.log(`Beats checked:        ${stats.beatsChecked}`);
    console.log(`Beats modified:       ${stats.beatsModified}`);
    console.log(`Prompts modified:     ${stats.promptsModified}`);

    console.log('\nPattern replacements:');
    FIND_PATTERNS.forEach((pattern, index) => {
      const count = stats.patternCounts.get(pattern) || 0;
      const shortPattern = pattern.length > 60 ? pattern.substring(0, 57) + '...' : pattern;
      console.log(`  ${index + 1}. "${shortPattern}"`);
      console.log(`     → Replaced ${count} instance(s)`);
    });

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(error => console.log(`   ${error}`));
    }

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN - No changes were applied to Redis');
      console.log('   Run without DRY_RUN=true to apply changes');
    } else if (stats.sessionsProcessed > 0) {
      console.log('\n✅ Changes saved to Redis');
      console.log('   You can now reload the session in the Session Browser');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    stats.errors.push(error.message);
  } finally {
    // Disconnect
    await client.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

main().catch(console.error);
