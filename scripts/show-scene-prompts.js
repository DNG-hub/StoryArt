/**
 * Show prompts for a specific scene
 *
 * Usage:
 *   node scripts/show-scene-prompts.js <scene_number>
 *
 * Environment Variables:
 *   TIMESTAMP - Specific session timestamp (default: latest)
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const TIMESTAMP = process.env.TIMESTAMP || null;
const SCENE_NUMBER = parseInt(process.argv[2]);

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

async function showScenePrompts(sessionKey, sceneNumber) {
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

  const scene = session.analyzedEpisode.scenes.find(s => s.sceneNumber === sceneNumber);

  if (!scene) {
    console.log(`❌ Scene ${sceneNumber} not found`);
    console.log(`Available scenes: ${session.analyzedEpisode.scenes.map(s => s.sceneNumber).join(', ')}`);
    return;
  }

  console.log(`\n🎬 SCENE ${scene.sceneNumber}: ${scene.title}`);
  console.log('='.repeat(80));
  console.log(`Beats: ${scene.beats?.length || 0}\n`);

  if (!scene.beats || scene.beats.length === 0) {
    console.log('No beats in this scene');
    return;
  }

  scene.beats.forEach((beat, index) => {
    if (beat.prompts?.cinematic?.prompt) {
      console.log(`\nBeat ${beat.beatId}:`);
      console.log('-'.repeat(80));
      console.log(beat.prompts.cinematic.prompt);
      console.log('');
    }
  });
}

async function main() {
  if (!SCENE_NUMBER || isNaN(SCENE_NUMBER)) {
    console.error('❌ Scene number required');
    console.error('Usage: node scripts/show-scene-prompts.js <scene_number>');
    process.exit(1);
  }

  console.log(`\n🔍 Scene ${SCENE_NUMBER} Prompts\n`);

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
      sessionKey = await getLatestSessionKey();
    }

    await showScenePrompts(sessionKey, SCENE_NUMBER);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
