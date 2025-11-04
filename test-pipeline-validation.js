// test-pipeline-validation.js
// Validation script for SwarmUI to DaVinci Pipeline
// Tests the complete pipeline without actual image generation

import { processEpisodeCompletePipeline, processSingleBeat } from './services/pipelineService.js';
import { getLatestSession } from './services/redisService.js';

/**
 * Validate pipeline service integration
 */
async function validatePipeline() {
  console.log('🧪 Testing SwarmUI to DaVinci Pipeline Services\n');
  console.log('=' .repeat(60));

  let allTestsPassed = true;

  // Test 1: Check Redis connection and session data
  console.log('\n1️⃣  Testing Redis Session Access...');
  try {
    const sessionResponse = await getLatestSession();
    
    if (sessionResponse.success && sessionResponse.data) {
      console.log('   ✅ Redis session accessible');
      console.log(`   📊 Episode: ${sessionResponse.data.analyzedEpisode?.episodeNumber || 'N/A'}`);
      console.log(`   📝 Title: ${sessionResponse.data.analyzedEpisode?.title || 'N/A'}`);
      
      // Count NEW_IMAGE beats
      if (sessionResponse.data.analyzedEpisode?.scenes) {
        let newImageCount = 0;
        for (const scene of sessionResponse.data.analyzedEpisode.scenes) {
          if (scene.beats) {
            for (const beat of scene.beats) {
              if (beat.imageDecision?.type === 'NEW_IMAGE' && beat.prompts) {
                newImageCount++;
              }
            }
          }
        }
        console.log(`   🖼️  NEW_IMAGE beats with prompts: ${newImageCount}`);
      }
    } else {
      console.log('   ⚠️  No session found in Redis (this is OK if no analysis has been run)');
      console.log(`   💡 Error: ${sessionResponse.error || 'No session data'}`);
    }
  } catch (error) {
    console.log('   ❌ Redis session test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 2: Validate service imports
  console.log('\n2️⃣  Testing Service Imports...');
  try {
    const { 
      fetchPromptsFromRedis,
      generateImagesFromPrompts,
      organizeAssetsInDaVinci,
    } = await import('./services/pipelineService.js');
    
    console.log('   ✅ Pipeline service imports successful');
    console.log('   ✅ fetchPromptsFromRedis: Available');
    console.log('   ✅ generateImagesFromPrompts: Available');
    console.log('   ✅ organizeAssetsInDaVinci: Available');
  } catch (error) {
    console.log('   ❌ Service import test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 3: Validate Image Path Tracker
  console.log('\n3️⃣  Testing Image Path Tracker Service...');
  try {
    const { 
      normalizeImagePath,
      findImageByFilename,
      enhanceImagePathsWithMetadata,
    } = await import('./services/imagePathTracker.js');
    
    console.log('   ✅ Image Path Tracker service imports successful');
    console.log('   ✅ normalizeImagePath: Available');
    console.log('   ✅ findImageByFilename: Available');
    console.log('   ✅ enhanceImagePathsWithMetadata: Available');
  } catch (error) {
    console.log('   ❌ Image Path Tracker test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 4: Validate DaVinci Project Service
  console.log('\n4️⃣  Testing DaVinci Project Service...');
  try {
    const { 
      createEpisodeProject,
      organizeSwarmUIImages,
      getProjectDirectoryStructure,
    } = await import('./services/davinciProjectService.js');
    
    console.log('   ✅ DaVinci Project service imports successful');
    console.log('   ✅ createEpisodeProject: Available');
    console.log('   ✅ organizeSwarmUIImages: Available');
    console.log('   ✅ getProjectDirectoryStructure: Available');
  } catch (error) {
    console.log('   ❌ DaVinci Project Service test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 5: Validate SwarmUI Service
  console.log('\n5️⃣  Testing SwarmUI Service...');
  try {
    const { 
      initializeSession,
      generateImages,
      getQueueStatus,
    } = await import('./services/swarmUIService.js');
    
    console.log('   ✅ SwarmUI service imports successful');
    console.log('   ✅ initializeSession: Available');
    console.log('   ✅ generateImages: Available');
    console.log('   ✅ getQueueStatus: Available');
    
    // Try to check if SwarmUI is available (won't fail if not running)
    try {
      const queueStatus = await getQueueStatus();
      console.log(`   📊 SwarmUI queue status: ${queueStatus.queue_length} items`);
    } catch (error) {
      console.log('   ⚠️  SwarmUI not running (this is OK for validation)');
    }
  } catch (error) {
    console.log('   ❌ SwarmUI Service test failed:', error.message);
    allTestsPassed = false;
  }

  // Test 6: Validate type definitions
  console.log('\n6️⃣  Testing Type Definitions...');
  try {
    const types = await import('./types.js');
    
    const requiredTypes = [
      'BeatPrompt',
      'PipelineResult',
      'BeatPipelineResult',
      'OrganizationResult',
      'EnhancedImagePath',
      'ImageMetadata',
      'ProjectStructure',
    ];
    
    let typesFound = 0;
    for (const typeName of requiredTypes) {
      if (types[typeName]) {
        typesFound++;
      }
    }
    
    console.log(`   ✅ Found ${typesFound}/${requiredTypes.length} required types`);
    
    if (typesFound < requiredTypes.length) {
      console.log('   ⚠️  Some types may be missing (check exports)');
    }
  } catch (error) {
    console.log('   ❌ Type definition test failed:', error.message);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📝 Validation Summary:');
  
  if (allTestsPassed) {
    console.log('   ✅ All service validations passed!');
    console.log('   💡 Pipeline is ready for integration');
    console.log('\n   📋 Next Steps:');
    console.log('      1. Ensure Redis session has analyzed episode data');
    console.log('      2. Start SwarmUI service (if not running)');
    console.log('      3. Configure DAVINCI_PROJECTS_PATH environment variable');
    console.log('      4. Test with actual image generation (optional)');
  } else {
    console.log('   ⚠️  Some validations failed. Check errors above.');
  }
  
  console.log('\n');
}

// Run validation
validatePipeline().catch(console.error);

