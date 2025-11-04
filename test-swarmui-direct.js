/**
 * Direct SwarmUI API Test
 * Tests the SwarmUI API endpoints directly (bypassing TypeScript compilation)
 * 
 * Usage: node test-swarmui-direct.js
 */

const SWARMUI_API_BASE_URL = process.env.SWARMUI_API_URL || process.env.VITE_SWARMUI_API_URL || "http://localhost:7801";

console.log('🧪 Testing SwarmUI API Directly');
console.log(`📍 SwarmUI API URL: ${SWARMUI_API_BASE_URL}\n`);
console.log('='.repeat(60));

// Helper function to make API calls
async function apiCall(endpoint, body = {}) {
  try {
    const response = await fetch(`${SWARMUI_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Network error: SwarmUI is not accessible at ${SWARMUI_API_BASE_URL}`);
    }
    throw error;
  }
}

// Test 1: Check SwarmUI Availability
async function testAvailability() {
  console.log('\n1️⃣ Testing SwarmUI Availability...');
  try {
    const result = await apiCall('/API/GetNewSession');
    console.log('✅ SwarmUI is accessible and responding');
    console.log(`   Version: ${result.version || 'unknown'}`);
    console.log(`   Server ID: ${result.server_id || 'unknown'}`);
    return result.session_id;
  } catch (error) {
    console.log(`❌ SwarmUI is not accessible: ${error.message}`);
    console.log(`   Make sure SwarmUI is running on ${SWARMUI_API_BASE_URL}`);
    return null;
  }
}

// Test 2: Initialize Session (again for explicit test)
async function testInitializeSession() {
  console.log('\n2️⃣ Testing Initialize Session...');
  try {
    const result = await apiCall('/API/GetNewSession');
    console.log('✅ Session initialized successfully');
    console.log(`   Session ID: ${result.session_id}`);
    return result.session_id;
  } catch (error) {
    console.log(`❌ Failed to initialize session: ${error.message}`);
    return null;
  }
}

// Test 3: Get Queue Status
async function testGetQueueStatus() {
  console.log('\n3️⃣ Testing Get Queue Status...');
  try {
    const result = await apiCall('/API/GetQueueStatus');
    console.log('✅ Queue status retrieved successfully');
    console.log(`   Queue Length: ${result.queue_length || 0}`);
    console.log(`   Current Generation: ${result.current_generation || 'None'}`);
    return result;
  } catch (error) {
    console.log(`❌ Failed to get queue status: ${error.message}`);
    return null;
  }
}

// Test 4: Get Generation Statistics
async function testGetGenerationStatistics() {
  console.log('\n4️⃣ Testing Get Generation Statistics...');
  try {
    const result = await apiCall('/API/GetStats');
    console.log('✅ Generation statistics retrieved successfully');
    console.log(`   Total Generations: ${result.total_generations || 0}`);
    console.log(`   Average Generation Time: ${result.average_generation_time || 0}s`);
    return result;
  } catch (error) {
    console.log(`❌ Failed to get generation statistics: ${error.message}`);
    return null;
  }
}

// Test 5: Generate Images (optional - takes time)
async function testGenerateImages(sessionId) {
  if (!sessionId) {
    console.log('\n5️⃣ Skipping generateImages() test - no session ID');
    return null;
  }

  console.log('\n5️⃣ Testing Generate Images...');
  console.log('   ⚠️  This will actually generate an image (may take 1-2 minutes)');
  
  try {
    const testPrompt = "(Wide shot:1.3), (Cat walking:1.2), wide shot of a cat walking through debris, post-apocalyptic setting";
    console.log(`   Prompt: "${testPrompt.substring(0, 60)}..."`);
    console.log('   Generating 1 image...');
    
    const result = await apiCall('/API/Generate', {
      session_id: sessionId,
      prompt: testPrompt,
      images_count: 1
    });
    
    console.log('✅ Image generation request sent successfully');
    console.log(`   Image Paths Returned: ${result.image_paths?.length || 0}`);
    if (result.image_paths && result.image_paths.length > 0) {
      result.image_paths.forEach((path, index) => {
        console.log(`   Path ${index + 1}: ${path}`);
      });
    } else {
      console.log('   Note: Image paths may be empty if generation is still in queue');
    }
    return result;
  } catch (error) {
    console.log(`❌ Failed to generate images: ${error.message}`);
    return null;
  }
}

// Main test runner
async function runTests() {
  let sessionId = null;
  let allTestsPassed = true;

  // Test 1: Availability
  sessionId = await testAvailability();
  if (!sessionId) {
    console.log('\n❌ SwarmUI is not available. Please start SwarmUI and try again.');
    process.exit(1);
  }

  // Test 2: Initialize Session
  const initSessionId = await testInitializeSession();
  if (!initSessionId) {
    allTestsPassed = false;
  }

  // Test 3: Queue Status
  const queueStatus = await testGetQueueStatus();
  if (!queueStatus) {
    allTestsPassed = false;
  }

  // Test 4: Statistics
  const stats = await testGetGenerationStatistics();
  if (!stats) {
    allTestsPassed = false;
  }

  // Test 5: Generate Images (optional - only if --generate flag is passed)
  if (process.argv.includes('--generate')) {
    await testGenerateImages(sessionId);
  } else {
    console.log('\n5️⃣ Skipping image generation test');
    console.log('   💡 To test image generation, run: node test-swarmui-direct.js --generate');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📝 Test Summary:');
  console.log(`   ✅ SwarmUI Availability: ${sessionId ? 'PASS' : 'FAIL'}`);
  console.log(`   ${initSessionId ? '✅' : '❌'} Session Initialization: ${initSessionId ? 'PASS' : 'FAIL'}`);
  console.log(`   ${queueStatus ? '✅' : '❌'} Queue Status: ${queueStatus ? 'PASS' : 'FAIL'}`);
  console.log(`   ${stats ? '✅' : '❌'} Generation Statistics: ${stats ? 'PASS' : 'FAIL'}`);
  
  if (allTestsPassed && sessionId) {
    console.log('\n✅ All basic tests passed!');
    console.log('💡 The SwarmUI service implementation should work correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Test the TypeScript service in browser console');
  console.log('   2. Or open test-swarmui.html in your browser');
  console.log('   3. Continue with Task 2.0 (Image Path Tracker Service)');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

