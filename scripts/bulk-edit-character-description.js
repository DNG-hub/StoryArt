/**
 * Bulk Edit Character Description Script
 *
 * Finds and replaces incorrect JRUMLV woman description across all beats in Redis session
 *
 * Usage:
 *   npm run edit:character-description
 *
 * Or with specific timestamp:
 *   TIMESTAMP=1737725000000 npm run edit:character-description
 *
 * Dry run (preview changes without applying):
 *   DRY_RUN=true npm run edit:character-description
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

// The incorrect and correct descriptions
const FIND_TEXT = 'JRUMLV woman (dark brown ponytail, form fitting white cotton halter top, lean athletic build)';
const REPLACE_TEXT = 'JRUMLV woman (combat camo pants, form fitting white cotton halter top, ponytail hairstyle, small stud earrings)';

const client = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}/0`
});

let stats = {
  sessionsProcessed: 0,
  beatsChecked: 0,
  beatsModified: 0,
  promptsModified: 0,
  errors: []
};

async function getLatestSessionKey() {
  // Get the latest session from the sorted set
  const latestSessions = await client.zRange(SESSION_INDEX_KEY, 0, 0, { REV: true });

  if (latestSessions.length === 0) {
    throw new Error('No sessions found in Redis');
  }

  return latestSessions[0];
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
    console.log(`   Scene ${scene.sceneNumber}: ${scene.title}`);

    if (!scene.beats || scene.beats.length === 0) {
      console.log(`     No beats found\n`);
      continue;
    }

    for (const beat of scene.beats) {
      stats.beatsChecked++;
      let beatModified = false;

      // Check if beat has prompts
      if (beat.prompts) {
        // Check cinematic prompt
        if (beat.prompts.cinematic && beat.prompts.cinematic.prompt) {
          const originalPrompt = beat.prompts.cinematic.prompt;

          if (originalPrompt.includes(FIND_TEXT)) {
            const newPrompt = originalPrompt.replace(new RegExp(FIND_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), REPLACE_TEXT);

            console.log(`     🔍 Beat ${beat.beatId} - CINEMATIC - Found incorrect description`);
            console.log(`        Before: ...${originalPrompt.substring(originalPrompt.indexOf(FIND_TEXT) - 20, originalPrompt.indexOf(FIND_TEXT) + FIND_TEXT.length + 20)}...`);
            console.log(`        After:  ...${newPrompt.substring(newPrompt.indexOf(REPLACE_TEXT) - 20, newPrompt.indexOf(REPLACE_TEXT) + REPLACE_TEXT.length + 20)}...`);

            beat.prompts.cinematic.prompt = newPrompt;
            stats.promptsModified++;
            beatModified = true;
          }
        }

        // Check vertical prompt (if exists)
        if (beat.prompts.vertical && beat.prompts.vertical.prompt) {
          const originalPrompt = beat.prompts.vertical.prompt;

          if (originalPrompt.includes(FIND_TEXT)) {
            const newPrompt = originalPrompt.replace(new RegExp(FIND_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), REPLACE_TEXT);

            console.log(`     🔍 Beat ${beat.beatId} - VERTICAL - Found incorrect description`);
            console.log(`        Before: ...${originalPrompt.substring(originalPrompt.indexOf(FIND_TEXT) - 20, originalPrompt.indexOf(FIND_TEXT) + FIND_TEXT.length + 20)}...`);
            console.log(`        After:  ...${newPrompt.substring(newPrompt.indexOf(REPLACE_TEXT) - 20, newPrompt.indexOf(REPLACE_TEXT) + REPLACE_TEXT.length + 20)}...`);

            beat.prompts.vertical.prompt = newPrompt;
            stats.promptsModified++;
            beatModified = true;
          }
        }

        // Check marketingVertical prompt (if exists)
        if (beat.prompts.marketingVertical && beat.prompts.marketingVertical.prompt) {
          const originalPrompt = beat.prompts.marketingVertical.prompt;

          if (originalPrompt.includes(FIND_TEXT)) {
            const newPrompt = originalPrompt.replace(new RegExp(FIND_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), REPLACE_TEXT);

            console.log(`     🔍 Beat ${beat.beatId} - MARKETING - Found incorrect description`);
            console.log(`        Before: ...${originalPrompt.substring(originalPrompt.indexOf(FIND_TEXT) - 20, originalPrompt.indexOf(FIND_TEXT) + FIND_TEXT.length + 20)}...`);
            console.log(`        After:  ...${newPrompt.substring(newPrompt.indexOf(REPLACE_TEXT) - 20, newPrompt.indexOf(REPLACE_TEXT) + REPLACE_TEXT.length + 20)}...`);

            beat.prompts.marketingVertical.prompt = newPrompt;
            stats.promptsModified++;
            beatModified = true;
          }
        }
      }

      if (beatModified) {
        stats.beatsModified++;
        sessionModified = true;
      }
    }

    console.log('');
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

      console.log(`   ✅ Session updated in Redis`);
    } else {
      console.log(`   🔍 DRY RUN - Changes would be applied`);
    }

    stats.sessionsProcessed++;
  } else {
    console.log(`   ℹ️  No changes needed for this session`);
  }
}

async function main() {
  console.log('🔧 Bulk Edit Character Description Script\n');
  console.log('Find:    ' + FIND_TEXT);
  console.log('Replace: ' + REPLACE_TEXT + '\n');

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
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Sessions processed:   ${stats.sessionsProcessed}`);
    console.log(`Beats checked:        ${stats.beatsChecked}`);
    console.log(`Beats modified:       ${stats.beatsModified}`);
    console.log(`Prompts modified:     ${stats.promptsModified}`);

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
