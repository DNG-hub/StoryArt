# StoryTeller Redis Session Integration Guide

## Problem
StoryArt sessions are saved to Redis, but StoryTeller cannot see them.

## Root Cause
StoryArt and StoryTeller may be:
1. Using different Redis instances
2. Using different Redis database numbers
3. Using different key prefixes
4. StoryTeller needs API endpoint configuration

---

## Step 1: Verify Redis Connection Settings

### Check StoryArt's Redis Configuration

**File:** `server.js`

**Current Settings:**
```javascript
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';
```

**Environment Variable:**
```bash
REDIS_URL=redis://localhost:6379/0
```

**Check what Redis StoryArt is using:**
1. Open your terminal where `server.js` is running
2. Look for the startup message:
   ```
   ✅ Redis connected successfully
   ```
3. Note the Redis URL from your `.env` file or environment

### Check StoryTeller's Redis Configuration

**Location:** StoryTeller's configuration files (usually `.env` or config files)

**What to look for:**
- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_DB` or `REDIS_DATABASE`

---

## Step 2: Ensure Same Redis Instance

### Option A: Use StoryTeller's Redis (Recommended)

If StoryTeller has its own Redis instance, configure StoryArt to use it:

1. **Find StoryTeller's Redis connection string:**
   - Check StoryTeller's `.env` file
   - Look for `REDIS_URL` or Redis connection settings
   - Example: `redis://localhost:6379/1` (note the database number)

2. **Update StoryArt's `.env` file:**
   ```env
   # Use StoryTeller's Redis instance
   REDIS_URL=redis://localhost:6379/1
   ```
   ⚠️ **Important:** Note the database number (the `/1` at the end)

3. **Restart StoryArt's server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Start it again
   node server.js
   ```

### Option B: Use Separate Redis Databases

If you want to keep them separate but on the same instance:

**StoryArt (current):**
```env
REDIS_URL=redis://localhost:6379/0
```

**StoryTeller:**
```env
REDIS_URL=redis://localhost:6379/1
```

**Note:** This means they won't see each other's data. You need to use the SAME database number for them to see each other.

---

## Step 3: Verify Redis Keys Are Visible

### Check Redis Keys Directly

**Option 1: Using Redis CLI**
```bash
# Connect to Redis
redis-cli

# List all StoryArt session keys
KEYS storyart:session:*

# Check the session index
ZRANGE storyart:sessions:index 0 -1 REV

# Get a specific session
GET storyart:session:1762209046962
```

**Option 2: Using Browser**
Open this URL in your browser:
```
http://localhost:7802/api/v1/session/list
```

This should return JSON with all sessions.

---

## Step 4: Configure StoryTeller to Read Sessions

### Option A: StoryTeller Reads from Same Redis

If StoryTeller has code to read sessions, ensure it:
1. Uses the same Redis connection string
2. Uses the same key prefix: `storyart:session:`
3. Uses the same index key: `storyart:sessions:index`

### Option B: StoryTeller Uses API Endpoint

If StoryTeller should read via API:

1. **Configure StoryTeller to use StoryArt's API:**
   ```env
   VITE_REDIS_API_URL=http://localhost:7802/api/v1
   # or
   STORYART_API_URL=http://localhost:7802/api/v1
   ```

2. **Available Endpoints:**
   - `GET /api/v1/session/list` - List all sessions
   - `GET /api/v1/session/latest` - Get latest session
   - `GET /api/v1/session/:timestamp` - Get specific session

---

## Step 5: Test the Connection

### Test Script

Create a test file `test-redis-connection.js`:

```javascript
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';
const client = createClient({ url: redisUrl });

await client.connect();

// Check StoryArt keys
const keys = await client.keys('storyart:session:*');
console.log(`Found ${keys.length} StoryArt sessions`);

// Check index
const index = await client.zRange('storyart:sessions:index', 0, -1, { REV: true });
console.log(`Index contains ${index.length} entries`);

// Get a session
if (keys.length > 0) {
  const data = await client.get(keys[0]);
  console.log('Sample session:', JSON.parse(data).scriptText.substring(0, 50));
}

await client.quit();
```

Run it:
```bash
node test-redis-connection.js
```

---

## Step 6: Common Issues and Solutions

### Issue 1: "No sessions found"
**Solution:** Check if Redis is actually connected:
```bash
# Check server.js logs for:
✅ Redis connected successfully
```

### Issue 2: "Different Redis instances"
**Solution:** Ensure both use the same `REDIS_URL`:
```env
# In StoryArt .env
REDIS_URL=redis://localhost:6379/0

# In StoryTeller .env (must match database number)
REDIS_URL=redis://localhost:6379/0
```

### Issue 3: "StoryTeller can't connect to API"
**Solution:** Check CORS and port:
- StoryArt API runs on port 7802 (or `REDIS_API_PORT`)
- Ensure StoryTeller can access `http://localhost:7802`

### Issue 4: "Sessions saved but not visible"
**Solution:** Check Redis database number:
- StoryArt might be using database 0
- StoryTeller might be using database 1
- They need to use the same number

---

## Step 7: Verification Checklist

✅ [ ] StoryArt's `server.js` shows "Redis connected successfully"
✅ [ ] StoryArt's `.env` has `REDIS_URL` set
✅ [ ] StoryTeller's `.env` has `REDIS_URL` set
✅ [ ] Both use the same Redis host and port
✅ [ ] Both use the same Redis database number (the `/N` at the end)
✅ [ ] Redis keys are visible: `KEYS storyart:session:*`
✅ [ ] API endpoint works: `http://localhost:7802/api/v1/session/list`
✅ [ ] StoryTeller is configured to read from the same Redis or API endpoint

---

## Quick Diagnostic Commands

```bash
# 1. Check if Redis is running
redis-cli ping
# Should return: PONG

# 2. Check StoryArt's Redis connection
redis-cli
> KEYS storyart:*
# Should show: storyart:session:* keys

# 3. Check which database StoryArt is using
# Look at server.js startup logs or .env file
# REDIS_URL=redis://localhost:6379/0  <- the /0 is database 0

# 4. Test API endpoint
curl http://localhost:7802/api/v1/session/list
# Should return JSON with sessions
```

---

## Next Steps

1. **Identify StoryTeller's Redis configuration**
2. **Update StoryArt's `.env` to match** (if using same Redis)
3. **Restart StoryArt's server**
4. **Verify sessions are visible** using the test commands above
5. **Configure StoryTeller** to read from the same Redis or API endpoint

If you need help with a specific step, share:
- StoryTeller's Redis configuration
- Error messages from StoryTeller
- Output from the diagnostic commands above


