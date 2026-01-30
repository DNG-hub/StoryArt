/**
 * Check Episode Context for Overrides
 *
 * Analyzes a Redis session to see if swarmui_prompt_override data is present
 * in the episode context
 *
 * Usage:
 *   node scripts/check-episode-context-overrides.js
 *
 * Environment Variables:
 *   TIMESTAMP - Specific session timestamp to check (default: latest)
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

async function checkSession(sessionKey) {
  console.log(`\n📋 Analyzing session: ${sessionKey}\n`);

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

  // Check episode context
  if (!session.episodeContext) {
    console.log('❌ No episodeContext field in session');
    return;
  }

  let episodeContext;
  try {
    episodeContext = JSON.parse(session.episodeContext);
  } catch (error) {
    console.log('❌ Failed to parse episodeContext JSON:', error.message);
    return;
  }

  console.log('📊 EPISODE CONTEXT ANALYSIS');
  console.log('='.repeat(80));

  if (!episodeContext.episode) {
    console.log('❌ No episode object in episodeContext');
    return;
  }

  const episode = episodeContext.episode;
  console.log(`Episode ${episode.episode_number}: ${episode.episode_title}`);
  console.log(`Total Scenes: ${episode.scenes?.length || 0}`);
  console.log('');

  let totalScenesWithOverrides = 0;
  let totalCharactersWithOverrides = 0;
  let totalCharactersWithoutOverrides = 0;

  // Analyze each scene
  if (episode.scenes && Array.isArray(episode.scenes)) {
    episode.scenes.forEach((scene, sceneIndex) => {
      console.log(`🎬 SCENE ${scene.scene_number}: ${scene.scene_title || 'Untitled'}`);
      console.log(`   Location: ${scene.location?.name || 'Unknown'}`);

      let sceneHasOverrides = false;

      // Check scene.characters array
      if (scene.characters && Array.isArray(scene.characters)) {
        console.log(`   📝 scene.characters: ${scene.characters.length} character(s)`);

        scene.characters.forEach((char, charIndex) => {
          const hasOverride = char.location_context?.swarmui_prompt_override;

          if (hasOverride && hasOverride.trim().length > 0) {
            console.log(`      ✅ ${char.character_name || 'Unknown'}`);
            console.log(`         Override: "${hasOverride.substring(0, 80)}..."`);
            totalCharactersWithOverrides++;
            sceneHasOverrides = true;
          } else {
            console.log(`      ⚠️  ${char.character_name || 'Unknown'} - NO OVERRIDE`);
            totalCharactersWithoutOverrides++;
          }
        });
      }

      // Check scene.character_appearances array
      if (scene.character_appearances && Array.isArray(scene.character_appearances)) {
        console.log(`   📝 scene.character_appearances: ${scene.character_appearances.length} character(s)`);

        scene.character_appearances.forEach((char, charIndex) => {
          const hasOverride = char.location_context?.swarmui_prompt_override;

          if (hasOverride && hasOverride.trim().length > 0) {
            console.log(`      ✅ ${char.character_name || 'Unknown'}`);
            console.log(`         Override: "${hasOverride.substring(0, 80)}..."`);
            totalCharactersWithOverrides++;
            sceneHasOverrides = true;
          } else {
            console.log(`      ⚠️  ${char.character_name || 'Unknown'} - NO OVERRIDE`);
            totalCharactersWithoutOverrides++;
          }
        });
      }

      if (!scene.characters && !scene.character_appearances) {
        console.log(`   ⚠️  No character data in this scene`);
      }

      if (sceneHasOverrides) {
        totalScenesWithOverrides++;
      }

      console.log('');
    });
  }

  // Check episode-level characters
  console.log('📚 EPISODE-LEVEL CHARACTERS');
  console.log('='.repeat(80));

  if (episode.characters && Array.isArray(episode.characters)) {
    episode.characters.forEach(char => {
      console.log(`Character: ${char.character_name || 'Unknown'}`);
      console.log(`  Base Trigger: ${char.base_trigger || 'None'}`);
      console.log(`  Location Contexts: ${char.location_contexts?.length || 0}`);

      if (char.location_contexts && Array.isArray(char.location_contexts)) {
        char.location_contexts.forEach(locCtx => {
          const hasOverride = locCtx.swarmui_prompt_override;
          if (hasOverride && hasOverride.trim().length > 0) {
            console.log(`    ✅ ${locCtx.location_name}`);
            console.log(`       Override: "${hasOverride.substring(0, 60)}..."`);
          } else {
            console.log(`    ⚠️  ${locCtx.location_name} - NO OVERRIDE`);
          }
        });
      }
      console.log('');
    });
  } else {
    console.log('⚠️  No episode-level characters array');
  }

  // Summary
  console.log('');
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total scenes: ${episode.scenes?.length || 0}`);
  console.log(`Scenes with overrides: ${totalScenesWithOverrides}`);
  console.log(`Characters with overrides: ${totalCharactersWithOverrides}`);
  console.log(`Characters WITHOUT overrides: ${totalCharactersWithoutOverrides}`);
  console.log('');

  if (totalCharactersWithoutOverrides > 0) {
    console.log('⚠️  WARNING: Some characters are missing swarmui_prompt_override');
    console.log('   This means the AI will generate descriptions on its own,');
    console.log('   which can lead to truncated, rearranged, or inconsistent descriptions.');
    console.log('');
    console.log('   Possible causes:');
    console.log('   1. Episode context was fetched in MANUAL mode (not database mode)');
    console.log('   2. Backend API did not include overrides in response');
    console.log('   3. Database does not have overrides for this episode/location');
    console.log('   4. Location matching failed (wrong location_arc_id)');
  } else if (totalCharactersWithOverrides > 0) {
    console.log('✅ All characters have swarmui_prompt_override defined!');
    console.log('   The override system is working correctly.');
  } else {
    console.log('⚠️  No characters found with override data.');
  }
}

async function main() {
  console.log('🔍 Episode Context Override Checker\n');

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

      await checkSession(sessionKey);
    } else {
      console.log('🔍 Finding latest session...');
      sessionKey = await getLatestSessionKey();
      console.log(`✅ Found latest session: ${sessionKey}\n`);

      await checkSession(sessionKey);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

main().catch(console.error);
