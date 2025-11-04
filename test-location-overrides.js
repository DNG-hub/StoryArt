// Test script to verify location override extraction from database
// Usage: node test-location-overrides.js [storyId] [episodeNumber]

import { writeFileSync } from 'fs';

(async () => {
  const BASE_URL = process.env.VITE_STORYTELLER_API_URL || 'http://localhost:8000';
  const [ , , storyIdArg, episodeNumberArg] = process.argv;
  const storyId = storyIdArg || process.env.VITE_CAT_DANIEL_STORY_ID || '59f64b1e-726a-439d-a6bc-0dfefcababdb';
  const episodeNumber = Number(episodeNumberArg) || 1;

  console.log('='.repeat(80));
  console.log('LOCATION OVERRIDE EXTRACTION TEST');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Story ID: ${storyId}`);
  console.log(`Episode Number: ${episodeNumber}`);
  console.log('');

  try {
    // 1) Authenticate
    console.log('Step 1: Authenticating...');
    const loginUrl = `${BASE_URL}/api/v1/auth/dev-login-working?user_type=production`;
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!loginRes.ok) {
      console.error('❌ Authentication failed:', loginRes.status, loginRes.statusText);
      const errorText = await loginRes.text();
      console.error('Error details:', errorText);
      process.exit(1);
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('✅ Authentication successful');
    console.log('');

    // 2) Request episode context
    console.log('Step 2: Requesting episode context...');
    const contextUrl = `${BASE_URL}/api/v1/scene-context/extract-episode-context`;
    const ctxRes = await fetch(contextUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        story_id: storyId, 
        episode_number: episodeNumber 
      }),
    });

    if (!ctxRes.ok) {
      console.error('❌ Context request failed:', ctxRes.status, ctxRes.statusText);
      const errorText = await ctxRes.text();
      console.error('Error details:', errorText);
      process.exit(1);
    }

    console.log('✅ Context request successful');
    console.log('');

    const ctxData = await ctxRes.json();
    
    if (!ctxData.success || !ctxData.data) {
      console.error('❌ Invalid response structure');
      console.log('Response:', JSON.stringify(ctxData, null, 2));
      process.exit(1);
    }

    const episodeData = ctxData.data.episode;

    // 3) Analyze the response structure
    console.log('='.repeat(80));
    console.log('RESPONSE STRUCTURE ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    // Episode-level info
    console.log('📋 EPISODE INFO:');
    console.log(`  Episode Number: ${episodeData.episode_number}`);
    console.log(`  Episode Title: ${episodeData.episode_title}`);
    console.log(`  Scene Count: ${episodeData.scenes?.length || 0}`);
    console.log(`  Character Count (top-level): ${episodeData.characters?.length || 0}`);
    console.log('');

    // Analyze each scene
    if (episodeData.scenes && Array.isArray(episodeData.scenes)) {
      console.log('='.repeat(80));
      console.log('SCENE-BY-SCENE ANALYSIS');
      console.log('='.repeat(80));
      console.log('');

      episodeData.scenes.forEach((scene, sceneIdx) => {
        console.log(`\n🎬 SCENE ${scene.scene_number}: ${scene.scene_title || 'Untitled'}`);
        console.log(`   Location: ${scene.location?.name || 'Unknown'}`);
        console.log(`   Location ID: ${scene.location?.id || 'N/A'}`);
        console.log('');

        // Check for characters in this scene
        const sceneCharacters = scene.characters || [];
        const characterAppearances = scene.character_appearances || [];

        console.log(`   Character Data Sources:`);
        console.log(`     - scene.characters[]: ${sceneCharacters.length} entries`);
        console.log(`     - scene.character_appearances[]: ${characterAppearances.length} entries`);
        console.log('');

        if (sceneCharacters.length > 0) {
          console.log('   📝 Characters in scene.characters[]:');
          sceneCharacters.forEach((char, charIdx) => {
            console.log(`      ${charIdx + 1}. ${char.name || 'Unnamed'}`);
            console.log(`         Base Trigger: ${char.base_trigger || 'N/A'}`);
            
            // Check for location_context
            if (char.location_context) {
              console.log(`         ✅ HAS location_context`);
              console.log(`            Location: ${char.location_context.location_name || 'N/A'}`);
              console.log(`            Physical: ${char.location_context.physical_description ? '✅' : '❌'}`);
              console.log(`            Clothing: ${char.location_context.clothing_description ? '✅' : '❌'}`);
              console.log(`            Demeanor: ${char.location_context.demeanor_description ? '✅' : '❌'}`);
              
              if (char.location_context.swarmui_prompt_override) {
                console.log(`            ✅ HAS swarmui_prompt_override`);
                const override = char.location_context.swarmui_prompt_override;
                const preview = override.length > 100 ? override.substring(0, 100) + '...' : override;
                console.log(`            Override Preview: "${preview}"`);
              } else {
                console.log(`            ❌ MISSING swarmui_prompt_override`);
              }
              
              if (char.location_context.lora_weight_adjustment) {
                console.log(`            LORA Weight: ${char.location_context.lora_weight_adjustment}`);
              }
            } else {
              console.log(`         ❌ NO location_context`);
            }
            console.log('');
          });
        }

        if (characterAppearances.length > 0) {
          console.log('   📝 Characters in scene.character_appearances[]:');
          characterAppearances.forEach((appearance, appIdx) => {
            console.log(`      ${appIdx + 1}. ${appearance.character_name || 'Unnamed'}`);
            
            if (appearance.location_context) {
              console.log(`         ✅ HAS location_context`);
              console.log(`            Location: ${appearance.location_context.location_name || 'N/A'}`);
              
              if (appearance.location_context.swarmui_prompt_override) {
                console.log(`            ✅ HAS swarmui_prompt_override`);
                const override = appearance.location_context.swarmui_prompt_override;
                const preview = override.length > 100 ? override.substring(0, 100) + '...' : override;
                console.log(`            Override Preview: "${preview}"`);
              } else {
                console.log(`            ❌ MISSING swarmui_prompt_override`);
              }
            } else {
              console.log(`         ❌ NO location_context`);
            }
            console.log('');
          });
        }

        if (sceneCharacters.length === 0 && characterAppearances.length === 0) {
          console.log('   ⚠️  NO CHARACTER DATA FOUND IN THIS SCENE');
        }
      });
    } else {
      console.log('❌ No scenes array found in response');
    }

    // Top-level characters analysis
    if (episodeData.characters && Array.isArray(episodeData.characters)) {
      console.log('');
      console.log('='.repeat(80));
      console.log('TOP-LEVEL CHARACTERS ANALYSIS');
      console.log('='.repeat(80));
      console.log('');

      episodeData.characters.forEach((char, charIdx) => {
        console.log(`${charIdx + 1}. ${char.character_name || 'Unnamed'}`);
        console.log(`   Base Trigger: ${char.base_trigger || 'N/A'}`);
        
        if (char.location_contexts && Array.isArray(char.location_contexts)) {
          console.log(`   Location Contexts: ${char.location_contexts.length}`);
          char.location_contexts.forEach((locCtx, locIdx) => {
            console.log(`      ${locIdx + 1}. Location: ${locCtx.location_name || 'N/A'}`);
            if (locCtx.swarmui_prompt_override) {
              console.log(`         ✅ HAS swarmui_prompt_override`);
              const preview = locCtx.swarmui_prompt_override.length > 80 
                ? locCtx.swarmui_prompt_override.substring(0, 80) + '...' 
                : locCtx.swarmui_prompt_override;
              console.log(`         Preview: "${preview}"`);
            } else {
              console.log(`         ❌ MISSING swarmui_prompt_override`);
            }
          });
        } else {
          console.log(`   ❌ NO location_contexts array`);
        }
        console.log('');
      });
    }

    // 4) Summary and recommendations
    console.log('');
    console.log('='.repeat(80));
    console.log('SUMMARY & RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log('');

    let totalOverrides = 0;
    let scenesWithOverrides = 0;

    episodeData.scenes?.forEach(scene => {
      const sceneChars = scene.characters || [];
      const sceneApps = scene.character_appearances || [];
      let sceneHasOverride = false;

      [...sceneChars, ...sceneApps].forEach(char => {
        const locCtx = char.location_context || char;
        if (locCtx.swarmui_prompt_override) {
          totalOverrides++;
          sceneHasOverride = true;
        }
      });

      if (sceneHasOverride) scenesWithOverrides++;
    });

    console.log(`📊 Statistics:`);
    console.log(`   Total Scenes: ${episodeData.scenes?.length || 0}`);
    console.log(`   Scenes with Overrides: ${scenesWithOverrides}`);
    console.log(`   Total Character Overrides Found: ${totalOverrides}`);
    console.log('');

    if (totalOverrides === 0) {
      console.log('⚠️  WARNING: No location overrides found in any scene!');
      console.log('   This suggests the backend is not properly extracting');
      console.log('   character_location_contexts.swarmui_prompt_override from the database.');
      console.log('');
      console.log('   Check:');
      console.log('   1. Backend is querying character_location_contexts table');
      console.log('   2. Matching by location_arc_id (not location name)');
      console.log('   3. Including swarmui_prompt_override in response');
    } else if (scenesWithOverrides < episodeData.scenes?.length) {
      console.log('⚠️  WARNING: Some scenes are missing location overrides!');
      console.log('   This suggests incomplete data matching in the backend.');
    } else {
      console.log('✅ All scenes have location overrides - extraction looks correct!');
    }

    // Save full response to file for detailed inspection
    try {
      const outputFile = `episode-context-response-${Date.now()}.json`;
      writeFileSync(outputFile, JSON.stringify(ctxData, null, 2));
      console.log('');
      console.log(`💾 Full response saved to: ${outputFile}`);
    } catch (fsError) {
      console.log('');
      console.log('⚠️  Could not save response file:', fsError.message);
      console.log('   Response data is logged above for inspection');
    }

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
})();

