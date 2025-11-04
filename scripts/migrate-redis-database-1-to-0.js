/**
 * Redis Database Migration Script
 * 
 * Migrates all StoryArt sessions from Redis database 1 to database 0
 * 
 * Usage:
 *   node scripts/migrate-redis-database-1-to-0.js
 * 
 * Environment Variables:
 *   REDIS_URL - Redis connection URL (default: redis://localhost:6379)
 *   DRY_RUN - If set to 'true', only shows what would be migrated without making changes
 */

import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const DRY_RUN = process.env.DRY_RUN === 'true';

const SESSION_KEY_PREFIX = 'storyart:session:';
const SESSION_INDEX_KEY = 'storyart:sessions:index';

// Create clients for both databases
const clientDb0 = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}/0`
});

const clientDb1 = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}/1`
});

let stats = {
  sessionsFound: 0,
  sessionsMigrated: 0,
  sessionsSkipped: 0,
  sessionsFailed: 0,
  indexEntries: 0,
  indexMigrated: 0,
  errors: []
};

async function migrateDatabase() {
  console.log('🔄 Starting Redis Database Migration: Database 1 → Database 0\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Connect to both databases
    console.log('📡 Connecting to Redis...');
    await clientDb1.connect();
    console.log('✅ Connected to database 1');
    
    await clientDb0.connect();
    console.log('✅ Connected to database 0\n');

    // Step 1: Find all session keys in database 1
    console.log('🔍 Step 1: Finding all sessions in database 1...');
    const sessionKeys = await clientDb1.keys(`${SESSION_KEY_PREFIX}*`);
    stats.sessionsFound = sessionKeys.length;
    console.log(`   Found ${sessionKeys.length} session keys\n`);

    if (sessionKeys.length === 0) {
      console.log('ℹ️  No sessions found in database 1. Nothing to migrate.');
      return;
    }

    // Step 2: Migrate each session
    console.log('📦 Step 2: Migrating sessions to database 0...');
    for (const key of sessionKeys) {
      try {
        // Get session data from database 1
        const sessionData = await clientDb1.get(key);
        
        if (!sessionData) {
          console.log(`   ⚠️  Skipping ${key} - data not found`);
          stats.sessionsSkipped++;
          continue;
        }

        // Parse to get TTL
        const ttl = await clientDb1.ttl(key);
        
        // Check if session already exists in database 0
        const existsInDb0 = await clientDb0.exists(key);
        
        if (existsInDb0) {
          console.log(`   ⏭️  Skipping ${key} - already exists in database 0`);
          stats.sessionsSkipped++;
          continue;
        }

        // Copy to database 0
        if (!DRY_RUN) {
          if (ttl > 0) {
            // Session has TTL, preserve it
            await clientDb0.setEx(key, ttl, sessionData);
          } else if (ttl === -1) {
            // Session has no expiration
            await clientDb0.set(key, sessionData);
          } else {
            // Session expired (ttl === -2), but we'll still copy it
            await clientDb0.set(key, sessionData);
          }
        }
        
        console.log(`   ✅ ${key} ${DRY_RUN ? '(would be)' : ''} migrated ${ttl > 0 ? `(TTL: ${ttl}s)` : ''}`);
        stats.sessionsMigrated++;
      } catch (error) {
        console.error(`   ❌ Failed to migrate ${key}:`, error.message);
        stats.sessionsFailed++;
        stats.errors.push({ key, error: error.message });
      }
    }

    console.log(`\n   Summary: ${stats.sessionsMigrated} migrated, ${stats.sessionsSkipped} skipped, ${stats.sessionsFailed} failed\n`);

    // Step 3: Migrate the index sorted set
    console.log('📊 Step 3: Migrating session index...');
    const indexExists = await clientDb1.exists(SESSION_INDEX_KEY);
    
    if (indexExists) {
      // Get all keys from the index (without scores first to check structure)
      const indexKeys = await clientDb1.zRange(SESSION_INDEX_KEY, 0, -1, { REV: true });
      stats.indexEntries = indexKeys.length;
      console.log(`   Found ${indexKeys.length} index entries`);

      if (indexKeys.length > 0) {
        // Check existing index in database 0
        const existingIndexEntries = await clientDb0.zRange(SESSION_INDEX_KEY, 0, -1, { REV: true });
        
        if (existingIndexEntries.length > 0) {
          console.log(`   ⚠️  Database 0 already has ${existingIndexEntries.length} index entries`);
          console.log('   ℹ️  Merging index entries...');
        }

        // For each key, get its score and migrate
        for (const key of indexKeys) {
          try {
            // Get the score for this key in database 1
            const score = await clientDb1.zScore(SESSION_INDEX_KEY, key);
            
            if (score === null) {
              console.error(`   ❌ No score found for ${key} in index`);
              stats.errors.push({ key, error: 'No score found in index' });
              continue;
            }
            
            // Validate key format
            if (!key || !key.toString().startsWith(SESSION_KEY_PREFIX)) {
              console.error(`   ❌ Invalid key format: "${key}"`);
              stats.errors.push({ key, error: `Invalid key format: ${key}` });
              continue;
            }
            
            // Check if this key exists in database 0 (we migrated it)
            const keyExists = await clientDb0.exists(key);
            
            if (!DRY_RUN) {
              // Add to index (will update if already exists)
              await clientDb0.zAdd(SESSION_INDEX_KEY, { score: score, value: key });
            }
            
            if (keyExists) {
              console.log(`   ✅ Index entry ${key} (score: ${score}) ${DRY_RUN ? '(would be)' : ''} added`);
            } else {
              console.log(`   ⚠️  Index entry ${key} (score: ${score}) added but key doesn't exist in database 0`);
            }
            stats.indexMigrated++;
          } catch (error) {
            console.error(`   ❌ Error processing ${key}:`, error.message);
            stats.errors.push({ key, error: error.message });
          }
        }
      }
    } else {
      console.log('   ℹ️  No index found in database 1');
    }

    console.log(`\n   Index: ${stats.indexMigrated} entries ${DRY_RUN ? '(would be)' : ''} migrated\n`);

    // Step 4: Verify migration
    console.log('✅ Step 4: Verifying migration...');
    const db0Keys = await clientDb0.keys(`${SESSION_KEY_PREFIX}*`);
    const db0IndexSize = await clientDb0.zCard(SESSION_INDEX_KEY);
    
    console.log(`   Database 0 now has:`);
    console.log(`   - ${db0Keys.length} session keys`);
    console.log(`   - ${db0IndexSize} index entries\n`);

    // Step 5: Summary
    console.log('📊 Migration Summary:');
    console.log(`   Sessions found in database 1: ${stats.sessionsFound}`);
    console.log(`   Sessions migrated: ${stats.sessionsMigrated}`);
    console.log(`   Sessions skipped: ${stats.sessionsSkipped}`);
    console.log(`   Sessions failed: ${stats.sessionsFailed}`);
    console.log(`   Index entries migrated: ${stats.indexMigrated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n   ⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach(({ key, error }) => {
        console.log(`      - ${key}: ${error}`);
      });
    }

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN COMPLETE - No changes were made');
      console.log('   To perform the actual migration, run without DRY_RUN=true');
    } else {
      console.log('\n✅ Migration complete!');
      console.log('\n⚠️  Note: Data in database 1 has NOT been deleted.');
      console.log('   If you want to clean up database 1, you can run:');
      console.log('   redis-cli -n 1 DEL storyart:session:*');
      console.log('   redis-cli -n 1 DEL storyart:sessions:index');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    // Disconnect clients
    await clientDb1.quit();
    await clientDb0.quit();
    console.log('\n🔌 Disconnected from Redis');
  }
}

// Run migration
migrateDatabase()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

