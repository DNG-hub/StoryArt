# Redis Database Migration Guide

## Overview

This guide explains how to migrate StoryArt sessions from Redis database 1 to database 0, ensuring all sessions are stored in the standard database location.

## Why Migrate?

Since StoryArt now **always uses database 0** for stability, any existing sessions in database 1 need to be migrated to ensure they're accessible.

## Migration Script

**Location:** `scripts/migrate-redis-database-1-to-0.js`

**What it does:**
- Connects to both Redis database 0 and database 1
- Finds all StoryArt sessions in database 1
- Copies each session to database 0 (preserving TTL)
- Migrates the session index sorted set
- Verifies the migration
- **Does NOT delete data from database 1** (safety first)

## Usage

### Dry Run (Recommended First Step)

Test the migration without making any changes:

```bash
# Using npm script
npm run migrate:redis:1-to-0:dry-run

# Or directly
DRY_RUN=true tsx scripts/migrate-redis-database-1-to-0.js
```

**Output:**
- Shows all sessions that would be migrated
- Shows what the index would look like
- **No actual changes are made**

### Actual Migration

Once you've verified the dry run looks correct:

```bash
# Using npm script
npm run migrate:redis:1-to-0

# Or directly
tsx scripts/migrate-redis-database-1-to-0.js
```

### Custom Redis Connection

If your Redis is not on `localhost:6379`, use environment variables:

```bash
REDIS_HOST=your-redis-host REDIS_PORT=6382 tsx scripts/migrate-redis-database-1-to-0.js
```

## What Gets Migrated

### 1. Session Keys
- All keys matching `storyart:session:*`
- TTL (time-to-live) is preserved
- If a session already exists in database 0, it's skipped

### 2. Session Index
- The sorted set `storyart:sessions:index`
- All entries are added to database 0's index
- Existing entries in database 0 are merged (not overwritten)

## Example Output

```
🔄 Starting Redis Database Migration: Database 1 → Database 0

📡 Connecting to Redis...
✅ Connected to database 1
✅ Connected to database 0

🔍 Step 1: Finding all sessions in database 1...
   Found 5 session keys

📦 Step 2: Migrating sessions to database 0...
   ✅ storyart:session:1704067200000 migrated (TTL: 604800s)
   ✅ storyart:session:1704067201000 migrated (TTL: 604800s)
   ✅ storyart:session:1704067202000 migrated (TTL: 604800s)
   ✅ storyart:session:1704067203000 migrated (TTL: 604800s)
   ✅ storyart:session:1704067204000 migrated (TTL: 604800s)

   Summary: 5 migrated, 0 skipped, 0 failed

📊 Step 3: Migrating session index...
   Found 5 index entries
   ✅ Index entry storyart:session:1704067200000 (score: 1704067200000) added
   ✅ Index entry storyart:session:1704067201000 (score: 1704067201000) added
   ✅ Index entry storyart:session:1704067202000 (score: 1704067202000) added
   ✅ Index entry storyart:session:1704067203000 (score: 1704067203000) added
   ✅ Index entry storyart:session:1704067204000 (score: 1704067204000) added

   Index: 5 entries migrated

✅ Step 4: Verifying migration...
   Database 0 now has:
   - 5 session keys
   - 5 index entries

📊 Migration Summary:
   Sessions found in database 1: 5
   Sessions migrated: 5
   Sessions skipped: 0
   Sessions failed: 0
   Index entries migrated: 5

✅ Migration complete!

⚠️  Note: Data in database 1 has NOT been deleted.
   If you want to clean up database 1, you can run:
   redis-cli -n 1 DEL storyart:session:*
   redis-cli -n 1 DEL storyart:sessions:index

🔌 Disconnected from Redis

✅ Script completed successfully
```

## Safety Features

### 1. Dry Run Mode
- Test the migration without making changes
- See exactly what would be migrated
- Verify the migration plan before executing

### 2. No Data Deletion
- The script **never deletes** data from database 1
- You can run the migration multiple times safely
- Manual cleanup required if you want to remove database 1 data

### 3. Skip Existing Sessions
- If a session already exists in database 0, it's skipped
- Prevents overwriting newer data with older data
- Preserves data integrity

### 4. Error Handling
- Continues migrating even if one session fails
- Reports all errors at the end
- Does not stop on first error

## After Migration

### Verify Migration

Check that sessions are now in database 0:

```bash
# Connect to database 0
redis-cli -n 0

# List all StoryArt sessions
KEYS storyart:session:*

# Check the index
ZRANGE storyart:sessions:index 0 -1 REV WITHSCORES
```

### Test StoryArt

1. Restart StoryArt server (if running)
2. Use the "Browse & Restore" button in the UI
3. Verify all sessions are visible
4. Test restoring a session

### Optional: Clean Up Database 1

**⚠️ Only do this after verifying migration is successful!**

```bash
# Connect to database 1
redis-cli -n 1

# Delete all StoryArt session keys
KEYS storyart:session:* | xargs redis-cli -n 1 DEL

# Delete the index
DEL storyart:sessions:index

# Or use the MULTI command for atomic deletion
redis-cli -n 1
> MULTI
> KEYS storyart:session:* | xargs DEL
> DEL storyart:sessions:index
> EXEC
```

## Troubleshooting

### Error: "Connection refused"

**Problem:** Redis is not running or wrong host/port

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# Verify host and port
REDIS_HOST=localhost REDIS_PORT=6379 tsx scripts/migrate-redis-database-1-to-0.js
```

### Error: "No sessions found in database 1"

**Problem:** Either:
- Sessions are already in database 0
- Sessions were never in database 1
- Sessions expired (TTL ran out)

**Solution:**
```bash
# Check what's in database 1
redis-cli -n 1 KEYS storyart:*

# Check what's in database 0
redis-cli -n 0 KEYS storyart:*
```

### Error: "Sessions skipped - already exists in database 0"

**Problem:** Sessions were already migrated or exist in both databases

**Solution:** This is normal and safe. The script skips existing sessions to prevent overwriting.

### Migration Shows Errors

**Problem:** Some sessions failed to migrate

**Solution:**
1. Check the error messages in the summary
2. Verify the specific session keys that failed
3. Check if the sessions are corrupted or expired
4. You can manually copy failed sessions if needed

## Manual Migration (Alternative)

If the script doesn't work for your setup, you can manually migrate:

```bash
# Connect to database 1
redis-cli -n 1

# Get all session keys
KEYS storyart:session:*

# For each session key, copy it:
# 1. Get the data
GET storyart:session:1704067200000

# 2. Get the TTL
TTL storyart:session:1704067200000

# 3. Switch to database 0
SELECT 0

# 4. Set the data (with TTL if > 0)
SETEX storyart:session:1704067200000 604800 "{...data...}"

# 5. Add to index
ZADD storyart:sessions:index 1704067200000 storyart:session:1704067200000
```

## Related Documentation

- `docs/STORYART_SESSION_RESTORE_EXPLANATION.md` - How StoryArt sessions work
- `docs/ENVIRONMENT_CONFIGURATION.md` - Redis configuration
- `server.js` - StoryArt server implementation

## Support

If you encounter issues:
1. Run with `DRY_RUN=true` first to see what would happen
2. Check the error messages in the summary
3. Verify Redis connection and permissions
4. Check that both databases are accessible




