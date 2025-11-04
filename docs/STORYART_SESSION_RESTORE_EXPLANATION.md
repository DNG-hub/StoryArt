# StoryArt Session Restore & Browse System - Technical Documentation

## Overview

This document explains how StoryArt's session restore and browse functionality works, particularly for the StoryTeller Architect who needs to understand why versions may not be found in Redis.

## Architecture

### Redis Key Structure

**StoryArt Session Keys:**
```
storyart:session:{timestamp}
```

**Example:**
```
storyart:session:1704067200000
```

- **Prefix:** `storyart:session:`
- **Timestamp:** Unix timestamp in milliseconds (JavaScript `Date.now()`)
- **Format:** `{SESSION_KEY_PREFIX}{timestamp}`

### Index System

**Sorted Set Index:**
```
storyart:sessions:index
```

- **Score:** Timestamp (Unix milliseconds)
- **Value:** Full session key (e.g., `storyart:session:1704067200000`)
- **Purpose:** Enables fast retrieval of latest session and session listing

### TTL (Time To Live)

**Redis TTL:** 7 days (604,800 seconds = 604,800,000 milliseconds)

**Implementation:**
```javascript
// server.js line 91
await redisClient.setEx(sessionKey, 86400 * 7, sessionValue); // 7 days TTL
await redisClient.zAdd(SESSION_INDEX_KEY, { score: timestamp, value: sessionKey });
```

**Key Points:**
- Both the session data AND the index entry expire after 7 days
- When TTL expires, Redis automatically deletes both the key and the sorted set entry
- **No orphaned timestamps remain** - the index is cleaned up automatically

## Data Flow

### 1. Saving a Session

```javascript
// Client-side: services/redisService.ts
await saveSessionToRedis(sessionData);

// Server-side: server.js
POST /api/v1/session/save
```

**Process:**
1. Generate timestamp: `Date.now()` (e.g., `1704067200000`)
2. Create session key: `storyart:session:1704067200000`
3. Store session data with TTL: `SETEX storyart:session:1704067200000 604800 {...}`
4. Add to index: `ZADD storyart:sessions:index 1704067200000 storyart:session:1704067200000`

### 2. Retrieving Latest Session

```javascript
// Client-side: services/redisService.ts
await getLatestSession();

// Server-side: server.js
GET /api/v1/session/latest
```

**Process:**
1. Query sorted set in reverse order: `ZRANGE storyart:sessions:index 0 0 REV`
2. Get the session key (e.g., `storyart:session:1704067200000`)
3. Retrieve data: `GET storyart:session:1704067200000`
4. Return parsed JSON

### 3. Listing All Sessions

```javascript
// Client-side: services/redisService.ts
await getSessionList();

// Server-side: server.js
GET /api/v1/session/list
```

**Process:**
1. Query sorted set: `ZRANGE storyart:sessions:index 0 -1 REV`
2. For each session key, retrieve metadata (scriptText, storyUuid, analyzedEpisode)
3. Return array of `SessionListItem` objects with timestamps

### 4. Restoring by Timestamp

```javascript
// Client-side: services/redisService.ts
await getSessionByTimestamp(timestamp);

// Server-side: server.js
GET /api/v1/session/:timestamp
```

**Process:**
1. Construct session key: `storyart:session:{timestamp}`
2. Retrieve data: `GET storyart:session:{timestamp}`
3. Return parsed JSON

## Why Versions May Not Be Found

### Issue: TTL Expiration

**Problem:** If a session is older than 7 days, Redis automatically deletes:
1. The session data key (`storyart:session:{timestamp}`)
2. The index entry in the sorted set (`storyart:sessions:index`)

**Result:** 
- Both the data AND the index entry are gone
- No orphaned timestamps remain
- The session cannot be retrieved by any method

### Comparison with StoryTeller's Approach

Based on your investigation, StoryTeller appears to be using:

**Different Key Structure:**
```
swarmui:exports:recent  (sorted set)
```

**Issue Observed:**
- Timestamps remain in the sorted set (scores)
- But the actual export data has expired/deleted
- This creates orphaned index entries

**Why This Happens:**
- StoryTeller may be using separate TTLs for data vs. index
- Or the index TTL is longer than the data TTL
- Or the index has no TTL at all

### StoryArt's Solution

**Synchronized TTL:**
- Both data and index expire together
- No orphaned entries
- Cleaner Redis state

**Trade-off:**
- Sessions older than 7 days are permanently lost
- But this prevents confusion from orphaned entries

## Fallback Mechanisms

### 1. Memory Storage (Server-side)

If Redis is unavailable:
```javascript
// server.js - In-memory Map fallback
const memoryStorage = new Map();
const memorySessionIndex = [];
```

- Sessions stored in Node.js process memory
- Lost on server restart
- No persistence

### 2. localStorage (Client-side)

If Redis API is unavailable:
```javascript
// services/redisService.ts
localStorage.setItem('storyart-latest-session', JSON.stringify(sessionData));
```

- Persists across browser sessions
- Limited to single browser/device
- ~5-10MB storage limit

## API Endpoints

### Save Session
```
POST /api/v1/session/save
Body: { scriptText, episodeContext, storyUuid, analyzedEpisode, ... }
Response: { success: true, sessionKey, storage: 'redis' | 'memory' }
```

### Get Latest Session
```
GET /api/v1/session/latest
Response: { success: true, data: {...}, storage: 'redis' | 'memory' | 'localStorage' }
```

### List All Sessions
```
GET /api/v1/session/list
Response: { success: true, sessions: [{ timestamp, scriptText, storyUuid, ... }], count: N }
```

### Get Session by Timestamp
```
GET /api/v1/session/:timestamp
Response: { success: true, data: {...}, storage: 'redis' | 'memory' }
```

## UI Components

### Browse & Restore Button

**Location:** `components/InputPanel.tsx` (lines 496-520)

**Functionality:**
- Opens `SessionBrowser` modal
- Displays all available sessions
- Allows selection and restoration

**State Management:**
- `isRestoring` - Shows loading spinner
- `restoreSuccess` - Shows green checkmark
- `restoreError` - Shows error message

### Session Browser Modal

**Location:** `components/SessionBrowser.tsx`

**Functionality:**
- Fetches session list via `getSessionList()`
- Displays sessions sorted by timestamp (newest first)
- Auto-selects latest session
- Allows restoration of selected session

**Process:**
1. User clicks "Browse & Restore"
2. Modal opens and loads sessions
3. User selects a session (or uses auto-selected latest)
4. User clicks "Restore Selected Session"
5. Calls `getSessionByTimestamp(timestamp)`
6. Restores session data to UI

## Troubleshooting Missing Versions

### Scenario: Version Created on Nov 3, 2025, 02:30:46 PM Not Found

**Possible Causes:**

1. **TTL Expired (Most Likely)**
   - Session was created more than 7 days ago
   - Redis automatically deleted the data
   - **Solution:** Check if the session is within the 7-day window

2. **Wrong Redis Database**
   - StoryArt defaults to database 0 (`redis://localhost:6379/0`)
   - StoryTeller's database is **configurable** via `REDIS_URL` environment variable
   - StoryTeller does NOT always use database 1 - it depends on configuration
   - **Solution:** Verify Redis database number in both systems' `.env` files
   - **Critical:** Both must use the SAME database number to see each other's data

3. **Different Key Prefix**
   - StoryArt uses `storyart:session:`
   - StoryTeller may use `swarmui:exports:` or different prefix
   - **Solution:** Check Redis keys with `KEYS *session*` or `KEYS *export*`

4. **Redis Connection Issues**
   - Server not connected to Redis
   - Using memory fallback instead
   - **Solution:** Check server logs for Redis connection status

### Diagnostic Commands

**Check Redis Connection:**
```bash
redis-cli PING
```

**List All StoryArt Sessions:**
```bash
redis-cli KEYS "storyart:session:*"
```

**Check Index:**
```bash
redis-cli ZRANGE storyart:sessions:index 0 -1 REV
```

**Check TTL of Specific Session:**
```bash
redis-cli TTL storyart:session:1704067200000
# Returns: -2 (expired) or seconds remaining
```

**Get Session Data:**
```bash
redis-cli GET storyart:session:1704067200000
```

## Redis Database Configuration

### StoryArt Standard: Database 0 (Fixed)

**StoryArt ALWAYS uses Redis database 0 for stability and consistency.**

- **Fixed Database:** 0 (`redis://localhost:6379/0`)
- **Purpose:** Ensures stable, predictable behavior across all deployments
- **Implementation:** `server.js` enforces database 0, even if `REDIS_URL` specifies a different database
- **Logging:** Server logs clearly show which database is being used on startup

**Configuration:**
```env
# StoryArt .env (optional - database 0 is used by default)
REDIS_URL=redis://localhost:6379/0
```

**Behavior:**
- If `REDIS_URL` is not set: Uses `redis://localhost:6379/0`
- If `REDIS_URL` specifies database 0: Uses that database
- If `REDIS_URL` specifies a different database: **Overrides to database 0** with a warning
- **Result:** StoryArt always uses database 0, ensuring stable operation

**Server Logs:**
```
📊 StoryArt Redis Configuration: redis://localhost:6379/0
📊 Using Redis database 0 (standard for StoryArt)
✅ Redis connected successfully
✅ Redis database 0 is active
```

### StoryTeller Configuration
- **Database Number:** **Configurable** - depends on `REDIS_URL` configuration
- **Common Examples:**
  - Database 0: `redis://localhost:6379/0` (same as StoryArt - **RECOMMENDED**)
  - Database 1: `redis://localhost:6379/1` (if configured separately)
  - Database 2: `redis://localhost:6379/2` (if using multiple databases)
- **To Check:** Look at StoryTeller's `.env` file for `REDIS_URL` or `REDIS_DB`

### Important: Database Number Must Match

**For StoryArt and StoryTeller to share data:**
- **StoryArt ALWAYS uses database 0** (fixed)
- **StoryTeller must also use database 0** to see StoryArt's sessions
- If StoryTeller uses a different database, they won't see each other's data

**Recommended Configuration (Data Sharing Enabled):**

```env
# StoryArt .env (optional - database 0 is default)
REDIS_URL=redis://localhost:6379/0

# StoryTeller .env (MUST use database 0 to match StoryArt)
REDIS_URL=redis://localhost:6379/0
```

**Alternative Configuration (Separate Databases - No Data Sharing):**

```env
# StoryArt .env (always database 0)
REDIS_URL=redis://localhost:6379/0

# StoryTeller .env (different database - won't see StoryArt data)
REDIS_URL=redis://localhost:6379/1
```

**⚠️ Note:** If StoryTeller uses database 1 or any other database, it will NOT see StoryArt's sessions because StoryArt always uses database 0. To enable data sharing, configure StoryTeller to also use database 0.

## Recommendations for StoryTeller

### 1. Synchronize TTLs

**Problem:** Timestamps remain but data is gone

**Solution:** Use the same TTL for both data and index:
```javascript
// Save with TTL
await redisClient.setEx(exportKey, TTL_SECONDS, exportData);

// Add to index with same expiration time
await redisClient.zAdd('swarmui:exports:recent', { 
  score: timestamp, 
  value: exportKey 
});

// Set TTL on sorted set (if supported by your Redis version)
await redisClient.expire('swarmui:exports:recent', TTL_SECONDS);
```

### 2. Clean Up Orphaned Entries

**Problem:** Sorted set contains timestamps for expired data

**Solution:** Periodic cleanup script:
```javascript
// Get all entries from sorted set
const entries = await redisClient.zRange('swarmui:exports:recent', 0, -1);

for (const exportKey of entries) {
  // Check if data still exists
  const exists = await redisClient.exists(exportKey);
  if (!exists) {
    // Remove orphaned index entry
    await redisClient.zRem('swarmui:exports:recent', exportKey);
  }
}
```

### 3. Use Consistent Key Structure

**Recommendation:** Adopt StoryArt's pattern:
```
storyteller:export:{timestamp}        // Data key
storyteller:exports:index             // Index sorted set
```

### 4. Implement Fallback Storage

**Recommendation:** Add localStorage or file-based backup:
- Store exports to filesystem as JSON
- Use Redis as primary, filesystem as backup
- Implement restore from filesystem if Redis data missing

## Integration Notes

### For StoryTeller Architect

**StoryArt's Session Format:**
```typescript
interface SwarmUIExportData {
  scriptText: string;
  episodeContext: string;
  storyUuid: string;
  analyzedEpisode: AnalyzedEpisode;
  // ... other fields
}
```

**Key Differences:**
1. **TTL Strategy:** StoryArt uses synchronized TTL (data + index expire together)
2. **Key Prefix:** `storyart:session:` vs `swarmui:exports:`
3. **Index Name:** `storyart:sessions:index` vs `swarmui:exports:recent`
4. **Cleanup:** Automatic (via TTL) vs manual cleanup needed

**To Find StoryArt Sessions:**
```bash
# Connect to the correct database (check StoryArt's .env for REDIS_URL)
# If StoryArt uses database 0:
redis-cli -n 0 KEYS "storyart:session:*"

# If StoryArt uses database 1:
redis-cli -n 1 KEYS "storyart:session:*"

# Or connect and switch database:
redis-cli
> SELECT 0  # or SELECT 1, depending on StoryArt's configuration
> KEYS "storyart:session:*"
> ZRANGE storyart:sessions:index 0 -1 REV WITHSCORES
```

**⚠️ Important:** Make sure you're querying the correct database number that StoryArt is using. Check StoryArt's `.env` file or `server.js` for the `REDIS_URL` value.

## Summary

**StoryArt's Approach:**
- ✅ Synchronized TTL prevents orphaned entries
- ✅ Clean Redis state
- ✅ Simple key structure
- ❌ Sessions older than 7 days are permanently lost

**StoryTeller's Issue:**
- ❌ Orphaned timestamps in sorted set
- ❌ Data expired but index remains
- ❌ Confusion when trying to restore

**Solution:**
1. Implement synchronized TTLs
2. Add cleanup script for orphaned entries
3. Consider longer TTL if needed (but document expiration)
4. Implement fallback storage (filesystem backup)

---

**Last Updated:** November 2025
**Author:** StoryArt Development Team
**Contact:** See project documentation for support

