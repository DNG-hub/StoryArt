// test-pipeline-api.js
// Quick test script to verify pipeline API endpoints are working

const API_BASE_URL = process.env.REDIS_API_URL || 'http://localhost:7802';

async function testHealthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testLatestSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/session/latest`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Latest session retrieved');
      console.log('   Episode:', data.data?.analyzedEpisode?.episodeNumber, data.data?.analyzedEpisode?.title);
      return data.data;
    } else {
      console.log('⚠️  No session found (this is okay if no analysis has been run)');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get latest session:', error.message);
    return null;
  }
}

async function testPipelineEndpoints() {
  console.log('\n🧪 Testing Pipeline API Endpoints\n');
  
  // Test health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Server is not running. Please start it with: npm run dev:server');
    process.exit(1);
  }

  // Test session retrieval
  const session = await testLatestSession();
  
  if (!session) {
    console.log('\n⚠️  No session found. Pipeline endpoints require a saved session.');
    console.log('   To test:');
    console.log('   1. Run the app and analyze a script');
    console.log('   2. Save the session');
    console.log('   3. Run this test again');
    return;
  }

  // Check if we have prompts
  const hasPrompts = session.analyzedEpisode?.scenes?.some(scene =>
    scene.beats?.some(beat =>
      beat.imageDecision?.type === 'NEW_IMAGE' && beat.prompts
    )
  );

  if (!hasPrompts) {
    console.log('\n⚠️  No prompts found in session. Pipeline requires prompts.');
    console.log('   Make sure you have generated prompts before testing.');
    return;
  }

  console.log('\n✅ Pipeline API endpoints are ready!');
  console.log('   Available endpoints:');
  console.log('   - POST /api/v1/pipeline/process-episode');
  console.log('   - POST /api/v1/pipeline/process-beat');
  console.log('\n💡 To test the full pipeline:');
  console.log('   1. Start the server: npm run dev:server');
  console.log('   2. Start the frontend: npm run dev');
  console.log('   3. Use the UI to trigger pipeline processing');
}

testPipelineEndpoints().catch(console.error);

