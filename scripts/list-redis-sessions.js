/**
 * List Redis Sessions Script
 *
 * Lists all available sessions in Redis with details
 *
 * Usage:
 *   node scripts/list-redis-sessions.js
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const SESSION_KEY_PREFIX = 'storyart:session:';
const SESSION_INDEX_KEY = 'storyart:sessions:index';

const client = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}/0`
});

async function listSessions() {
  console.log('📋 Listing all Redis sessions\n');

  try {
    // Connect to Redis
    console.log('📡 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected to Redis\n');

    // Get all sessions from index
    const sessionKeys = await client.zRange(SESSION_INDEX_KEY, 0, -1, { REV: true });

    if (sessionKeys.length === 0) {
      console.log('ℹ️  No sessions found in Redis');
      return;
    }

    console.log(`Found ${sessionKeys.length} session(s):\n`);
    console.log('='.repeat(80));

    for (let i = 0; i < sessionKeys.length; i++) {
      const sessionKey = sessionKeys[i];
      const timestamp = parseInt(sessionKey.replace(SESSION_KEY_PREFIX, ''));
      const date = new Date(timestamp);

      // Get session data
      const sessionData = await client.get(sessionKey);

      if (!sessionData) {
        console.log(`${i + 1}. ${sessionKey}`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Date: ${date.toLocaleString()}`);
        console.log(`   ⚠️  No data found\n`);
        continue;
      }

      let session;
      try {
        session = JSON.parse(sessionData);
      } catch (error) {
        console.log(`${i + 1}. ${sessionKey}`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Date: ${date.toLocaleString()}`);
        console.log(`   ❌ Failed to parse JSON\n`);
        continue;
      }

      // Display session info
      const episodeNumber = session.analyzedEpisode?.episodeNumber || 'Unknown';
      const episodeTitle = session.analyzedEpisode?.title || 'Unknown';
      const sceneCount = session.analyzedEpisode?.scenes?.length || 0;
      const storyUuid = session.storyUuid || 'Not set';

      console.log(`${i + 1}. ${i === 0 ? '⭐ LATEST' : '   '} ${sessionKey}`);
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Date: ${date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}`);
      console.log(`   Episode: Episode ${episodeNumber}: ${episodeTitle}`);
      console.log(`   Scenes: ${sceneCount}`);
      console.log(`   Story UUID: ${storyUuid.substring(0, 8)}...`);

      // Count beats with prompts
      let totalBeats = 0;
      let beatsWithPrompts = 0;

      if (session.analyzedEpisode?.scenes) {
        for (const scene of session.analyzedEpisode.scenes) {
          if (scene.beats) {
            totalBeats += scene.beats.length;
            beatsWithPrompts += scene.beats.filter(beat => beat.prompts).length;
          }
        }
      }

      console.log(`   Beats: ${totalBeats} total, ${beatsWithPrompts} with prompts`);

      // Check for the specific character description issue
      let hasOldDescription = false;
      if (session.analyzedEpisode?.scenes) {
        for (const scene of session.analyzedEpisode.scenes) {
          if (scene.beats) {
            for (const beat of scene.beats) {
              if (beat.prompts?.cinematic?.prompt) {
                if (beat.prompts.cinematic.prompt.includes('JRUMLV woman (dark brown ponytail, form fitting white cotton halter top, lean athletic build)')) {
                  hasOldDescription = true;
                  break;
                }
              }
            }
          }
          if (hasOldDescription) break;
        }
      }

      if (hasOldDescription) {
        console.log(`   ⚠️  Contains old character description - needs fixing!`);
      }

      console.log('');
    }

    console.log('='.repeat(80));
    console.log('\nTo edit a specific session, run:');
    console.log('  TIMESTAMP=<timestamp> npm run edit:character-description');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

listSessions().catch(console.error);
