/**
 * Check Location Descriptions
 *
 * Analyzes episode context to see what location descriptions exist
 * and whether they're being used in prompts
 *
 * Usage:
 *   node scripts/check-location-descriptions.js
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
  console.log(`\n📋 Analyzing location descriptions: ${sessionKey}\n`);

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

  if (!episodeContext.episode) {
    console.log('❌ No episode object in episodeContext');
    return;
  }

  const episode = episodeContext.episode;
  console.log('📊 LOCATION ANALYSIS');
  console.log('='.repeat(80));
  console.log(`Episode ${episode.episode_number}: ${episode.episode_title}`);
  console.log(`Total Scenes: ${episode.scenes?.length || 0}\n`);

  let scenesWithLocations = 0;
  let scenesWithVisualDesc = 0;
  let scenesWithArtifacts = 0;
  let scenesWithAtmosphere = 0;

  // Check each scene's location
  if (episode.scenes && Array.isArray(episode.scenes)) {
    episode.scenes.forEach((scene, index) => {
      console.log(`🎬 SCENE ${scene.scene_number}: ${scene.scene_title || 'Untitled'}`);

      if (scene.location) {
        scenesWithLocations++;
        const loc = scene.location;

        console.log(`   Location Name: ${loc.name || 'Unknown'}`);
        console.log(`   Location ID: ${loc.id || 'None'}`);

        // Check visual_description
        if (loc.visual_description && loc.visual_description.trim().length > 0) {
          console.log(`   ✅ Has visual_description (${loc.visual_description.length} chars)`);
          console.log(`      Preview: "${loc.visual_description.substring(0, 100)}..."`);
          scenesWithVisualDesc++;
        } else {
          console.log(`   ❌ NO visual_description`);
        }

        // Check atmosphere
        if (loc.atmosphere && loc.atmosphere.trim().length > 0) {
          console.log(`   ✅ Has atmosphere: "${loc.atmosphere.substring(0, 60)}..."`);
          scenesWithAtmosphere++;
        } else {
          console.log(`   ⚠️  No atmosphere`);
        }

        // Check artifacts
        if (loc.artifacts && Array.isArray(loc.artifacts) && loc.artifacts.length > 0) {
          console.log(`   ✅ Has ${loc.artifacts.length} artifact(s)`);
          loc.artifacts.forEach((artifact, i) => {
            if (i < 3) { // Show first 3
              console.log(`      - ${artifact.artifact_name || 'Unnamed'}`);
              if (artifact.swarmui_prompt_fragment) {
                console.log(`        Fragment: "${artifact.swarmui_prompt_fragment.substring(0, 60)}..."`);
              }
            }
          });
          if (loc.artifacts.length > 3) {
            console.log(`      ... and ${loc.artifacts.length - 3} more`);
          }
          scenesWithArtifacts++;
        } else {
          console.log(`   ⚠️  No artifacts`);
        }

        // Check other fields
        if (loc.geographical_location) {
          console.log(`   Geographical: ${loc.geographical_location}`);
        }
        if (loc.time_period) {
          console.log(`   Time Period: ${loc.time_period}`);
        }

      } else {
        console.log(`   ❌ NO LOCATION DATA`);
      }

      console.log('');
    });
  }

  // Now check if location descriptions are actually used in prompts
  console.log('='.repeat(80));
  console.log('🔍 CHECKING PROMPT USAGE');
  console.log('='.repeat(80));

  if (!session.analyzedEpisode || !session.analyzedEpisode.scenes) {
    console.log('⚠️  No analyzed episode data to check prompts');
    return;
  }

  // Sample first few prompts to see what location details are included
  let promptSamples = 0;
  for (const scene of session.analyzedEpisode.scenes) {
    if (promptSamples >= 5) break;
    if (!scene.beats || scene.beats.length === 0) continue;

    for (const beat of scene.beats) {
      if (promptSamples >= 5) break;

      if (beat.prompts?.cinematic?.prompt) {
        const prompt = beat.prompts.cinematic.prompt;
        console.log(`\nSample Prompt (Scene ${scene.sceneNumber}, Beat ${beat.beatId}):`);
        console.log(`"${prompt.substring(0, 300)}..."\n`);
        promptSamples++;
      }
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total scenes: ${episode.scenes?.length || 0}`);
  console.log(`Scenes with location data: ${scenesWithLocations}`);
  console.log(`Scenes with visual_description: ${scenesWithVisualDesc}`);
  console.log(`Scenes with atmosphere: ${scenesWithAtmosphere}`);
  console.log(`Scenes with artifacts: ${scenesWithArtifacts}`);
  console.log('');

  if (scenesWithVisualDesc === 0) {
    console.log('❌ CRITICAL: NO LOCATION VISUAL DESCRIPTIONS FOUND!');
    console.log('   This means prompts cannot describe the environment properly.');
    console.log('   The AI has no location context to work with.');
    console.log('');
    console.log('   Possible causes:');
    console.log('   1. Episode context fetched in MANUAL mode (no database connection)');
    console.log('   2. Database location_arcs table missing visual_description data');
    console.log('   3. Backend API not including visual_description in response');
    console.log('   4. Location matching failed (wrong location_arc_id)');
  } else if (scenesWithVisualDesc < scenesWithLocations) {
    console.log('⚠️  WARNING: Some scenes missing location visual descriptions');
    console.log(`   ${scenesWithLocations - scenesWithVisualDesc} location(s) lack visual_description`);
  } else {
    console.log('✅ All scenes have location visual descriptions!');
  }
}

async function main() {
  console.log('🔍 Location Description Checker\n');

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
