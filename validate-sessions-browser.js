// Browser Console Validation Script
// Paste this into your browser console (F12) to validate Redis sessions
// Then call: validateSessions()

async function validateSessions() {
  console.log('🔍 Validating Redis Session Storage...\n');
  
  const endpoints = [
    'http://localhost:8000/api/v1/session/list',
    'http://localhost:7802/api/v1/session/list',
  ];

  let foundSessions = null;
  let usedEndpoint = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint}...`);
      
      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch((fetchError) => {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout (5s) - server may not be running');
        }
        throw fetchError;
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.sessions) {
          foundSessions = result.sessions;
          usedEndpoint = endpoint;
          console.log(`✅ Connected to: ${endpoint}\n`);
          break;
        } else {
          console.log(`  ⚠️  API returned success:false - ${result.error || 'Unknown error'}\n`);
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.log(`  ❌ HTTP ${response.status}: ${errorText.substring(0, 100)}\n`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`  ⏱️  Timeout: ${error.message}\n`);
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log(`  ❌ Network Error: Cannot connect to ${endpoint}\n`);
        console.log(`     Make sure server.js is running on port 8000\n`);
      } else {
        console.log(`  ❌ Error: ${error.message}\n`);
      }
      continue;
    }
  }

  if (!foundSessions) {
    console.log('❌ No sessions found or API endpoint unavailable');
    console.log('\n💡 Make sure:');
    console.log('   1. Redis API server is running (server.js)');
    console.log('   2. Sessions were saved successfully');
    console.log('   3. Network connectivity to the API endpoint');
    return;
  }

  const sessionCount = foundSessions.length;
  console.log(`✅ Found ${sessionCount} session(s) in Redis\n`);
  console.log(`📡 Endpoint: ${usedEndpoint}\n`);

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
  
  const result = {
    count: sessionCount,
    sessions: foundSessions,
    allHavePrompts: sessionsWithPrompts.length === sessionCount,
    validationPassed: sessionCount >= 3
  };
  
  console.log('📊 Validation Summary:', result);
  return result;
}

// Auto-run when pasted (but also expose function for manual calling)
console.log('✅ Validation script loaded!');
console.log('Type: validateSessions() to run validation');
console.log('Or just wait a moment for auto-run...\n');

// Auto-run after a short delay to ensure console is ready
setTimeout(() => {
  validateSessions().catch(err => {
    console.error('❌ Validation failed:', err);
  });
}, 100);

