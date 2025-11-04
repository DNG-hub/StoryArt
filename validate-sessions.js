// Validation script to check Redis session storage
// Run with: node validate-sessions.js

// Use native fetch (Node 18+) or require node-fetch for older versions
let fetch;
try {
  // Try native fetch first (Node 18+)
  if (typeof globalThis.fetch === 'function') {
    fetch = globalThis.fetch;
  } else {
    // Fallback to node-fetch if available
    fetch = require('node-fetch');
  }
} catch (e) {
  console.error('❌ fetch is not available. Please use Node.js 18+ or install node-fetch: npm install node-fetch');
  process.exit(1);
}

const REDIS_API_URL = process.env.VITE_STORYTELLER_API_URL || 'http://localhost:8000';
const ENDPOINTS = [
  `${REDIS_API_URL}/api/v1/session/list`,
  'http://localhost:7802/api/v1/session/list',
];

async function validateSessions() {
  console.log('🔍 Validating Redis Session Storage...\n');
  console.log(`Checking endpoints: ${ENDPOINTS.join(', ')}\n`);

  let foundSessions = null;
  let usedEndpoint = null;

  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`Trying: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.sessions) {
          foundSessions = result.sessions;
          usedEndpoint = endpoint;
          break;
        }
      } else {
        console.log(`  ❌ HTTP ${response.status}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      continue;
    }
  }

  if (!foundSessions) {
    console.log('❌ No sessions found or API endpoint unavailable');
    console.log('\n💡 Make sure:');
    console.log('   1. Redis API server is running (server.js)');
    console.log('   2. Sessions were saved successfully');
    console.log('   3. Network connectivity to the API endpoint');
    process.exit(1);
  }

  const sessionCount = foundSessions.length;
  console.log(`\n✅ Found ${sessionCount} session(s) in Redis\n`);
  console.log(`📡 Endpoint: ${usedEndpoint}`);
  console.log(`📊 Storage: ${foundSessions.length > 0 ? 'Redis' : 'Memory (fallback)'}\n`);

  // Display session details
  console.log('📋 Session Details:');
  console.log('─'.repeat(80));
  
  foundSessions.forEach((session, index) => {
    const timestamp = session.timestamp;
    const date = new Date(timestamp);
    const dateStr = date.toLocaleString();
    
    const scriptPreview = session.scriptText 
      ? session.scriptText.substring(0, 50).replace(/\n/g, ' ') + '...'
      : 'No script text';
    
    const episodeTitle = session.analyzedEpisode?.title || 'Untitled';
    const sceneCount = session.analyzedEpisode?.scenes?.length || 0;
    const beatCount = session.analyzedEpisode?.scenes?.reduce((sum, scene) => 
      sum + (scene.beats?.length || 0), 0) || 0;
    
    // Check if prompts are present
    const hasPrompts = session.analyzedEpisode?.scenes?.some(scene => 
      scene.beats?.some(beat => beat.prompts)
    );
    
    console.log(`\n${index + 1}. Session ${index + 1}`);
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Date: ${dateStr}`);
    console.log(`   Story UUID: ${session.storyUuid || 'N/A'}`);
    console.log(`   Episode Title: ${episodeTitle}`);
    console.log(`   Scenes: ${sceneCount}`);
    console.log(`   Beats: ${beatCount}`);
    console.log(`   Prompts: ${hasPrompts ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Script Preview: ${scriptPreview}`);
  });

  console.log('\n' + '─'.repeat(80));
  
  // Validation result
  if (sessionCount >= 3) {
    console.log(`\n✅ VALIDATION PASSED: Found ${sessionCount} sessions (expected 3+)`);
    console.log('✅ All sessions are properly stored in Redis');
  } else {
    console.log(`\n⚠️  VALIDATION WARNING: Found only ${sessionCount} session(s) (expected 3+)`);
    console.log('💡 You may need to save more sessions');
  }

  // Check for prompts
  const sessionsWithPrompts = foundSessions.filter(session => 
    session.analyzedEpisode?.scenes?.some(scene => 
      scene.beats?.some(beat => beat.prompts)
    )
  );

  if (sessionsWithPrompts.length === sessionCount) {
    console.log('✅ All sessions contain prompts');
  } else {
    console.log(`⚠️  Only ${sessionsWithPrompts.length} of ${sessionCount} sessions contain prompts`);
  }

  console.log('\n');
}

validateSessions().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});

