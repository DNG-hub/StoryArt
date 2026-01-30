/**
 * StorySwarm Output Validator
 *
 * Validates that StorySwarm correctly wrote prompts back to Redis session.
 * Checks format compliance and StoryArt compatibility.
 *
 * Usage:
 *   node scripts/validate-storyswarm-output.js
 *   node scripts/validate-storyswarm-output.js --timestamp 1738195200000
 */

import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function validateStorySwarmOutput(customTimestamp) {
  const client = createClient({ url: REDIS_URL });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    // Determine which session to check
    let sessionKey;
    let session;

    if (customTimestamp) {
      sessionKey = `session:${customTimestamp}`;
      const sessionData = await client.get(sessionKey);
      if (!sessionData) {
        console.error(`❌ Session not found: ${sessionKey}`);
        process.exit(1);
      }
      session = JSON.parse(sessionData);
    } else {
      // Check latest session
      const latestData = await client.get('session:latest');
      if (!latestData) {
        console.error('❌ No latest session found in Redis');
        process.exit(1);
      }
      session = JSON.parse(latestData);
      sessionKey = `session:${session.timestamp}`;
    }

    console.log(`\n📋 Validating Session: ${sessionKey}`);
    console.log(`   Story UUID: ${session.storyUuid}`);
    console.log(`   Episode: ${session.analyzedEpisode.episodeNumber}`);
    console.log(`   Prompt Mode: ${session.promptMode}`);

    // Validation checks
    const validations = [];
    let hasErrors = false;

    // Check 1: Prompt mode should be 'storyswarm'
    if (session.promptMode === 'storyswarm') {
      validations.push({ check: 'Prompt Mode', status: '✅', message: 'storyswarm' });
    } else {
      validations.push({ check: 'Prompt Mode', status: '❌', message: `Expected 'storyswarm', got '${session.promptMode}'` });
      hasErrors = true;
    }

    // Check 2: Analyze beats for prompts
    let totalBeats = 0;
    let beatsWithPrompts = 0;
    let beatsWithCinematic = 0;
    let beatsWithVertical = 0;

    session.analyzedEpisode.scenes.forEach((scene, sceneIdx) => {
      scene.beats.forEach((beat, beatIdx) => {
        totalBeats++;

        if (beat.prompts && typeof beat.prompts === 'object') {
          if (beat.prompts.cinematic) {
            beatsWithCinematic++;
            beatsWithPrompts++;
          }
          if (beat.prompts.vertical) {
            beatsWithVertical++;
          }
        }
      });
    });

    // Check 3: All beats should have prompts
    if (beatsWithPrompts === totalBeats && beatsWithPrompts > 0) {
      validations.push({ check: 'Beat Prompts', status: '✅', message: `${beatsWithPrompts}/${totalBeats} beats have prompts` });
    } else if (beatsWithPrompts === 0) {
      validations.push({ check: 'Beat Prompts', status: '❌', message: `No prompts found (0/${totalBeats})` });
      hasErrors = true;
    } else {
      validations.push({ check: 'Beat Prompts', status: '⚠️', message: `Partial prompts (${beatsWithPrompts}/${totalBeats})` });
      hasErrors = true;
    }

    // Check 4: Cinematic prompts
    if (beatsWithCinematic === totalBeats && beatsWithCinematic > 0) {
      validations.push({ check: 'Cinematic Prompts', status: '✅', message: `${beatsWithCinematic}/${totalBeats} beats` });
    } else {
      validations.push({ check: 'Cinematic Prompts', status: '❌', message: `${beatsWithCinematic}/${totalBeats} beats` });
      hasErrors = true;
    }

    // Check 5: Vertical prompts (optional but recommended)
    if (beatsWithVertical === totalBeats && beatsWithVertical > 0) {
      validations.push({ check: 'Vertical Prompts', status: '✅', message: `${beatsWithVertical}/${totalBeats} beats` });
    } else if (beatsWithVertical === 0) {
      validations.push({ check: 'Vertical Prompts', status: '⚠️', message: `None found (vertical is optional)` });
    } else {
      validations.push({ check: 'Vertical Prompts', status: '⚠️', message: `${beatsWithVertical}/${totalBeats} beats` });
    }

    // Check 6: Prompt format validation
    let promptFormatValid = true;
    const promptSamples = [];

    session.analyzedEpisode.scenes.forEach((scene, sceneIdx) => {
      scene.beats.forEach((beat, beatIdx) => {
        if (beat.prompts && beat.prompts.cinematic) {
          const prompt = beat.prompts.cinematic;

          // Check for required components
          const hasCharacterTrigger = /JRUMLV woman|M45N1 man|HSCEIA man/i.test(prompt);
          const hasLoraTag = /<lora:[^>]+>/i.test(prompt);
          const hasSegmentTag = /<segment:[^>]+>/i.test(prompt);

          if (!hasCharacterTrigger || !hasLoraTag || !hasSegmentTag) {
            promptFormatValid = false;
          }

          // Store sample for display
          if (promptSamples.length < 2) {
            promptSamples.push({
              beatId: beat.beatId,
              prompt: prompt.substring(0, 150) + '...',
              hasCharacterTrigger,
              hasLoraTag,
              hasSegmentTag
            });
          }
        }
      });
    });

    if (promptFormatValid && beatsWithPrompts > 0) {
      validations.push({ check: 'Prompt Format', status: '✅', message: 'Contains character triggers, LoRA tags, and segment tags' });
    } else if (beatsWithPrompts === 0) {
      validations.push({ check: 'Prompt Format', status: '❌', message: 'Cannot validate - no prompts found' });
      hasErrors = true;
    } else {
      validations.push({ check: 'Prompt Format', status: '❌', message: 'Missing required tags' });
      hasErrors = true;
    }

    // Display validation results
    console.log('\n📊 Validation Results:');
    validations.forEach(v => {
      console.log(`   ${v.status} ${v.check}: ${v.message}`);
    });

    // Display sample prompts
    if (promptSamples.length > 0) {
      console.log('\n📝 Sample Prompts:');
      promptSamples.forEach(sample => {
        console.log(`\n   Beat: ${sample.beatId}`);
        console.log(`   Prompt: ${sample.prompt}`);
        console.log(`   - Character trigger: ${sample.hasCharacterTrigger ? '✅' : '❌'}`);
        console.log(`   - LoRA tag: ${sample.hasLoraTag ? '✅' : '❌'}`);
        console.log(`   - Segment tag: ${sample.hasSegmentTag ? '✅' : '❌'}`);
      });
    }

    // Final verdict
    console.log('\n' + '='.repeat(60));
    if (hasErrors) {
      console.log('❌ VALIDATION FAILED - StorySwarm output has issues');
      console.log('\n💡 Common Issues:');
      console.log('   1. Prompts not written back to Redis');
      console.log('   2. Incorrect JSON structure (check beat.prompts object)');
      console.log('   3. Missing required tags (character trigger, LoRA, segment)');
      console.log('\n📖 See docs/STORYSWARM_INTEGRATION_PLAN_V2.md for format specs');
      process.exit(1);
    } else {
      console.log('✅ VALIDATION PASSED - StorySwarm output is StoryArt-compatible');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Load session in StoryArt UI');
      console.log('   2. Review generated prompts');
      console.log('   3. Trigger "Create All Images" workflow');
      console.log('   4. Scale up to full episode testing');
    }

  } catch (error) {
    console.error('❌ Error validating session:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const timestampArg = args.find(arg => arg.startsWith('--timestamp='));
const customTimestamp = timestampArg ? parseInt(timestampArg.split('=')[1]) : null;

// Run validation
validateStorySwarmOutput(customTimestamp);
