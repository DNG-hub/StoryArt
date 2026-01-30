/**
 * Direct Redis Session Injector for StorySwarm Testing
 *
 * Injects a minimal test session directly into Redis to bypass StoryArt UI workflow.
 * Use this for fast iteration during StorySwarm integration testing.
 *
 * Usage:
 *   node scripts/inject-test-session-to-redis.js
 *   node scripts/inject-test-session-to-redis.js --timestamp 1738195200000
 */

import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Minimal test session - 1 scene, 1 beat
const TEST_SESSION = {
  timestamp: Date.now(),
  scriptText: `SCENE 1: IMPOSSIBLE DATA

INT. MOBILE MEDICAL BASE - DAY

Cat's fingers fly across the holographic interface. Data streams cascade around her as she cross-references the anomaly against known patterns. Every algorithm she runs comes back with the same impossible result.`,

  episodeContext: JSON.stringify({
    "episodeNumber": 2,
    "episodeTitle": "The Ghost in the Machine",
    "storyTitle": "Cat and Daniel: Collapse Protocol",
    "characters": [
      {
        "name": "Cat",
        "base_trigger": "JRUMLV woman",
        "age": 28,
        "lora_model": "JRU_Cat_v3_e14.safetensors",
        "lora_weight": 0.9
      }
    ],
    "locations": [
      {
        "name": "Mobile Medical Base",
        "visual_description": "Converted semi-trailer interior with reinforced metal walls, portable medical equipment, and multiple holographic displays showing tactical data"
      }
    ]
  }),

  storyUuid: "59f64b1e-726a-439d-a6bc-0dfefcababdb",

  analyzedEpisode: {
    episodeNumber: 2,
    episodeTitle: "The Ghost in the Machine",
    totalScenes: 1,
    scenes: [
      {
        sceneNumber: 1,
        title: "Impossible Data",
        location: "Mobile Medical Base",
        timeOfDay: "Day",
        totalBeats: 1,
        beats: [
          {
            beatId: "ep2_sc1_bt1",
            beatNumber: 1,
            description: "Cat analyzing holographic data at terminal",
            narrativeText: "Cat's fingers fly across the holographic interface. Data streams cascade around her as she cross-references the anomaly against known patterns. Every algorithm she runs comes back with the same impossible result.",
            primaryCharacter: "Cat",
            secondaryCharacters: [],
            emotionalTone: "Focused, frustrated",
            suggestedCameraAngle: "Medium shot",
            lighting: "Clinical blue glow from monitors",
            visualElements: [
              "Holographic interface",
              "Data streams",
              "Medical monitors",
              "Reinforced walls"
            ],
            // NO PROMPTS - StorySwarm will generate these
            prompts: {}
          }
        ]
      }
    ]
  },

  promptMode: 'storyswarm',  // Critical flag
  retrievalMode: 'manual',
  selectedLLM: 'gemini'
};

async function injectTestSession(customTimestamp) {
  const client = createClient({ url: REDIS_URL });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    // Use custom timestamp or current time
    const timestamp = customTimestamp || TEST_SESSION.timestamp;
    const sessionKey = `session:${timestamp}`;

    // Update timestamp in session object
    const session = { ...TEST_SESSION, timestamp };

    // Save session to Redis
    await client.set(sessionKey, JSON.stringify(session));
    console.log(`✅ Test session injected: ${sessionKey}`);

    // Also set as latest session
    await client.set('session:latest', JSON.stringify(session));
    console.log('✅ Set as latest session');

    // Display session info
    console.log('\n📋 Session Details:');
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Story UUID: ${session.storyUuid}`);
    console.log(`   Episode: ${session.analyzedEpisode.episodeNumber}`);
    console.log(`   Scenes: ${session.analyzedEpisode.scenes.length}`);
    console.log(`   Total Beats: ${session.analyzedEpisode.scenes[0].beats.length}`);
    console.log(`   Prompt Mode: ${session.promptMode}`);

    console.log('\n🔍 StorySwarm Instructions:');
    console.log('1. Fetch session:');
    console.log(`   GET http://localhost:8000/api/v1/session/${timestamp}`);
    console.log('   OR');
    console.log(`   GET http://localhost:8000/api/v1/session/latest`);
    console.log('');
    console.log('2. Process beat and generate prompt');
    console.log('');
    console.log('3. Write prompt back to Redis:');
    console.log('   UPDATE session.analyzedEpisode.scenes[0].beats[0].prompts = {');
    console.log('     cinematic: "your generated prompt",');
    console.log('     vertical: "your vertical prompt"');
    console.log('   }');
    console.log('');
    console.log('4. Verify StoryArt can read updated session');

    console.log('\n✅ Test session ready for StorySwarm processing');

  } catch (error) {
    console.error('❌ Error injecting test session:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const timestampArg = args.find(arg => arg.startsWith('--timestamp='));
const customTimestamp = timestampArg ? parseInt(timestampArg.split('=')[1]) : null;

// Run injection
injectTestSession(customTimestamp);
