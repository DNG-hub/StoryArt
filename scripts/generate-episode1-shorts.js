/**
 * Generate Episode 1 YouTube Shorts
 * 
 * Standalone script to process all 10 pre-written YouTube Shorts from markdown files.
 * 
 * Usage:
 *   npm run generate-shorts
 * 
 * This script:
 * 1. Parses youtube_shorts_creation_plan.md
 * 2. Parses swarmui_parameters_mapping.md (optional)
 * 3. Generates all images through SwarmUI
 * 4. Organizes images in DaVinci structure
 * 5. Saves session to Redis
 */

// Note: This script uses dynamic import for ES modules
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { generateVideoShortsFromMarkdown } from '../services/videoShort/videoShortService.js';

// Load environment variables from .env file (MUST be first)
dotenv.config();

// Verify environment variables are loaded
console.log('📋 Environment Check:');
console.log(`   REDIS_HOST: ${process.env.REDIS_HOST || 'localhost (default)'}`);
console.log(`   REDIS_PORT: ${process.env.REDIS_PORT || '6379 (default)'}`);
console.log(`   REDIS_URL: ${process.env.REDIS_URL ? '***SET***' : '(not set)'}`);
console.log('');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('📋 Starting YouTube Shorts Generation for Episode 1\n');
  
  const planPath = join(__dirname, '../shorts/youtube_shorts_creation_plan.md');
  const paramsPath = join(__dirname, '../shorts/swarmui_parameters_mapping.md');
  
  const options = {
    episodeNumber: 1,
    episodeTitle: 'The Signal',
    storyId: 'episode-1-shorts',
    imagesPerMoment: 1, // Generate 1 image per segment
    batchSize: 4, // Process 4 segments in parallel
    useDaVinciOrganization: true
  };
  
  const startTime = Date.now();
  
  try {
    const result = await generateVideoShortsFromMarkdown(
      planPath,
      paramsPath,
      options,
      (progress) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (progress.stage === 'generating' && progress.total > 0) {
          const percent = Math.round((progress.completed / progress.total) * 100);
          const rate = progress.completed > 0 ? (progress.completed / ((Date.now() - startTime) / 1000)).toFixed(2) : '0';
          const remaining = progress.completed > 0 && rate > 0 
            ? Math.round((progress.total - progress.completed) / rate)
            : 0;
          
          process.stdout.write(
            `\r[${progress.stage.toUpperCase()}] ${percent}% | ${progress.completed}/${progress.total} | ${elapsed}s | ~${remaining}s remaining | ${progress.message}`
          );
        } else {
          console.log(`\n[${progress.stage.toUpperCase()}] ${progress.message}`);
        }
      }
    );
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n\n✅ Generation complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Episode: ${result.episode.episodeNumber} - ${result.episode.episodeTitle}`);
    console.log(`   - Moments: ${result.episode.moments.length}`);
    console.log(`   - Images generated: ${result.imageResults.filter(r => r.success).length}`);
    console.log(`   - Total time: ${totalTime}s`);
    console.log(`   - Session key: ${result.sessionKey}`);
    
    if (result.daVinciPath) {
      console.log(`\n📁 Images organized in DaVinci structure:`);
      console.log(`   ${result.daVinciPath}`);
      console.log(`   - 01_Assets/Images/ShortForm/`);
    }
    
    console.log('\n🎬 Next steps:');
    console.log('   1. Review generated images in DaVinci project folder');
    console.log('   2. Import images into DaVinci Resolve timeline');
    console.log('   3. Add audio, text overlays, and transitions');
    console.log('   4. Export as YouTube Shorts (9:16, <60 seconds)');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();

