#!/usr/bin/env node
/**
 * Test Redis Connection Strategy
 * 
 * This script tests the Redis connection using environment variables
 * from .env file (REDIS_HOST, REDIS_PORT, REDIS_URL)
 * 
 * Usage:
 *   node test-redis-connection-strategy.js
 * 
 * Environment Variables Expected:
 *   REDIS_HOST (default: localhost)
 *   REDIS_PORT (default: 6379, but .env has 6382)
 *   REDIS_URL (optional, overrides HOST/PORT)
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

console.log('🧪 Testing Redis Connection Strategy\n');
console.log('=' .repeat(60));

// Display environment variables (without sensitive data)
console.log('\n📋 Environment Variables:');
console.log(`   REDIS_HOST: ${process.env.REDIS_HOST || '(not set, using default: localhost)'}`);
console.log(`   REDIS_PORT: ${process.env.REDIS_PORT || '(not set, using default: 6379)'}`);
console.log(`   REDIS_URL: ${process.env.REDIS_URL ? '***SET***' : '(not set)'}`);

// Build Redis URL using same logic as server.js
let redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT || '6379';
  
  // Build Redis URL from components (always use database 0)
  redisUrl = `redis://${redisHost}:${redisPort}/0`;
  console.log(`\n🔧 Building Redis URL from components:`);
  console.log(`   Host: ${redisHost}`);
  console.log(`   Port: ${redisPort}`);
  console.log(`   Database: 0 (enforced for StoryArt)`);
} else {
  console.log(`\n🔧 Using REDIS_URL from environment`);
  
  // Ensure database 0 (same logic as server.js)
  const urlMatch = redisUrl.match(/^(redis:\/\/[^\/]+)\/(\d+)$/);
  if (urlMatch) {
    const originalDb = parseInt(urlMatch[2], 10);
    if (originalDb !== 0) {
      redisUrl = `${urlMatch[1]}/0`;
      console.warn(`   ⚠️  Overriding database ${originalDb} to 0 (StoryArt standard)`);
    }
  } else if (!redisUrl.includes('/')) {
    redisUrl = `${redisUrl}/0`;
    console.log(`   Adding database 0 to URL`);
  }
}

console.log(`\n🔗 Final Redis URL: ${redisUrl}`);

// Test connection
async function testConnection() {
  const client = createClient({
    url: redisUrl
  });

  client.on('error', (err) => {
    console.error('\n❌ Redis Client Error:', err.message);
    process.exit(1);
  });

  client.on('connect', () => {
    console.log('\n✅ Redis connection established');
  });

  try {
    console.log('\n🔄 Attempting to connect...');
    await client.connect();
    
    console.log('✅ Successfully connected to Redis!');
    
    // Test basic operations
    console.log('\n🧪 Testing Redis operations:');
    
    // Test PING
    const pingResult = await client.ping();
    console.log(`   PING: ${pingResult}`);
    
    // Test SET/GET
    const testKey = 'storyart:test:connection';
    await client.set(testKey, 'test-value', { EX: 10 }); // 10 second TTL
    console.log(`   SET ${testKey}: OK`);
    
    const testValue = await client.get(testKey);
    console.log(`   GET ${testKey}: ${testValue}`);
    
    // Test database selection
    const info = await client.info('keyspace');
    console.log(`   INFO keyspace: ${info ? 'OK' : 'N/A'}`);
    
    // Test sorted set (like session index)
    const testIndexKey = 'storyart:test:index';
    await client.zAdd(testIndexKey, { score: Date.now(), value: 'test-entry' });
    console.log(`   ZADD ${testIndexKey}: OK`);
    
    const indexEntries = await client.zRange(testIndexKey, 0, -1, { REV: true });
    console.log(`   ZRANGE ${testIndexKey}: ${indexEntries.length} entries`);
    
    // Cleanup test keys
    await client.del(testKey);
    await client.del(testIndexKey);
    console.log('   Cleanup: Test keys deleted');
    
    // Check for existing StoryArt sessions
    console.log('\n📊 Checking for existing StoryArt sessions:');
    const sessionIndex = 'storyart:sessions:index';
    const sessionCount = await client.zCard(sessionIndex);
    console.log(`   Sessions in index: ${sessionCount}`);
    
    if (sessionCount > 0) {
      const latestSessions = await client.zRange(sessionIndex, 0, 4, { REV: true });
      console.log(`   Latest session keys: ${latestSessions.slice(0, 3).join(', ')}`);
    }
    
    await client.quit();
    console.log('\n✅ Connection test completed successfully!');
    console.log('\n' + '='.repeat(60));
    console.log('✅ Redis connection strategy is working correctly');
    console.log('✅ Server.js should be able to connect using this configuration');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Is Redis running?');
      console.error(`   - Is Redis listening on ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}?`);
      console.error('   - Check Redis configuration and firewall settings');
    } else if (error.message.includes('WRONGPASS')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Redis password authentication failed');
      console.error('   - Check REDIS_URL or add password to connection string');
    }
    
    await client.quit().catch(() => {});
    process.exit(1);
  }
}

// Run test
testConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



