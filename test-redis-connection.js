// Test Redis Connection and Verify Sessions
// Run with: node test-redis-connection.js

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';

console.log('🔍 Testing Redis Connection...\n');
console.log(`Redis URL: ${redisUrl}\n`);

const client = createClient({ url: redisUrl });

client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
  process.exit(1);
});

try {
  await client.connect();
  console.log('✅ Connected to Redis\n');

  // Check StoryArt keys
  console.log('📋 Checking StoryArt session keys...');
  const keys = await client.keys('storyart:session:*');
  console.log(`   Found ${keys.length} session keys\n`);

  // Check index
  console.log('📋 Checking session index...');
  const index = await client.zRange('storyart:sessions:index', 0, -1, { REV: true });
  console.log(`   Index contains ${index.length} entries\n`);

  if (keys.length > 0) {
    console.log('📋 Sample session data:');
    const sampleKey = keys[0];
    const data = await client.get(sampleKey);
    const session = JSON.parse(data);
    
    console.log(`   Key: ${sampleKey}`);
    console.log(`   Timestamp: ${session.timestamp}`);
    console.log(`   Story UUID: ${session.storyUuid}`);
    console.log(`   Script Preview: ${session.scriptText?.substring(0, 50)}...`);
    console.log(`   Has Analyzed Episode: ${!!session.analyzedEpisode}`);
    
    if (session.analyzedEpisode) {
      const sceneCount = session.analyzedEpisode.scenes?.length || 0;
      const beatCount = session.analyzedEpisode.scenes?.reduce((sum, scene) => 
        sum + (scene.beats?.length || 0), 0) || 0;
      console.log(`   Scenes: ${sceneCount}`);
      console.log(`   Beats: ${beatCount}`);
      
      // Check for prompts
      const hasPrompts = session.analyzedEpisode.scenes?.some(scene => 
        scene.beats?.some(beat => beat.prompts)
      );
      console.log(`   Has Prompts: ${hasPrompts ? '✅ Yes' : '❌ No'}`);
    }
    console.log('');
  }

  // Check Redis database number
  const dbInfo = await client.configGet('databases');
  console.log(`📊 Redis Info:`);
  console.log(`   Current database: ${redisUrl.split('/').pop() || '0'}`);
  console.log(`   Total databases: ${dbInfo.databases || 'unknown'}\n`);

  // List all session timestamps
  if (index.length > 0) {
    console.log('📋 Session Timestamps (newest first):');
    index.slice(0, 5).forEach((key, i) => {
      const timestamp = key.replace('storyart:session:', '');
      const date = new Date(parseInt(timestamp));
      console.log(`   ${i + 1}. ${timestamp} - ${date.toLocaleString()}`);
    });
    if (index.length > 5) {
      console.log(`   ... and ${index.length - 5} more`);
    }
    console.log('');
  }

  console.log('✅ Redis connection test complete!\n');

  // Recommendations
  console.log('💡 To make StoryTeller see these sessions:');
  console.log('   1. Ensure StoryTeller uses the same REDIS_URL');
  console.log('   2. Check the database number matches (the /0 in redis://localhost:6379/0)');
  console.log('   3. Or configure StoryTeller to use: http://localhost:7802/api/v1/session/list');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await client.quit();
}


