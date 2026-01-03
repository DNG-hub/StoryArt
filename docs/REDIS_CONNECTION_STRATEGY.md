# Redis Connection Strategy

## Overview

StoryArt now supports multiple methods for configuring Redis connection, with proper priority ordering and environment variable support.

## Configuration Priority

The Redis connection follows this priority order:

1. **`REDIS_URL`** (highest priority) - Full Redis connection string
   - Example: `redis://localhost:6382/0`
   - If database number is specified and not 0, it will be overridden to 0 (StoryArt standard)

2. **`REDIS_HOST` + `REDIS_PORT`** - Individual components
   - `REDIS_HOST` (default: `localhost`)
   - `REDIS_PORT` (default: `6379`, but can be set to `6382` in .env)
   - Automatically builds: `redis://{REDIS_HOST}:{REDIS_PORT}/0`

3. **Default fallback** - `redis://localhost:6379/0`

## Environment Variables

### Required/Recommended Variables

```env
# Option 1: Full URL (takes priority)
REDIS_URL=redis://localhost:6382/0

# Option 2: Individual components (if REDIS_URL not set)
REDIS_HOST=localhost
REDIS_PORT=6382
```

### Notes

- **Database 0 is enforced**: StoryArt always uses Redis database 0 for stability
- **REDIS_URL takes priority**: If both `REDIS_URL` and `REDIS_HOST`/`REDIS_PORT` are set, `REDIS_URL` is used
- **Database override**: If `REDIS_URL` specifies a different database, it will be overridden to 0 with a warning

## Implementation

### Server.js (`server.js`)

```javascript
const initializeRedis = async () => {
  // Priority: REDIS_URL > REDIS_HOST + REDIS_PORT > defaults
  let redisUrl = process.env.REDIS_URL;
  
  // If REDIS_URL is not provided, build it from individual components
  if (!redisUrl) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    
    // Build Redis URL from components
    redisUrl = `redis://${redisHost}:${redisPort}/0`;
  }
  
  // Ensure database 0 (always enforced)
  // ... (database override logic)
  
  redisClient = createClient({ url: redisUrl });
  await redisClient.connect();
};
```

## Testing

### Test Script

Run the connection test:

```bash
npm run test:redis
```

This script:
- ✅ Loads environment variables from `.env`
- ✅ Tests connection priority (REDIS_URL > HOST/PORT > defaults)
- ✅ Verifies Redis operations (PING, SET/GET, sorted sets)
- ✅ Checks for existing StoryArt sessions
- ✅ Validates database 0 is being used

### Expected Output

```
🧪 Testing Redis Connection Strategy
📋 Environment Variables:
   REDIS_HOST: (not set, using default: localhost)
   REDIS_PORT: 6382
   REDIS_URL: ***SET***

🔗 Final Redis URL: redis://localhost:6382/0

✅ Successfully connected to Redis!
✅ Redis connection strategy is working correctly
```

## Current Configuration (from .env)

Based on testing:
- **REDIS_PORT**: `6382` ✅
- **REDIS_URL**: Set (taking priority) ✅
- **Database**: `0` (enforced) ✅
- **Connection**: Working ✅

## Verification

### Check Current Configuration

When server starts, you should see:

```
📊 Building Redis URL from environment variables:
   REDIS_HOST: localhost
   REDIS_PORT: 6382
📊 StoryArt Redis Configuration: redis://localhost:6382/0
📊 Using Redis database 0 (standard for StoryArt)
✅ Redis connected successfully
✅ Redis database 0 is active
```

### Existing Sessions

The test found **5 existing sessions** in Redis:
- Latest: `storyart:session:1762281541919`
- Previous: `storyart:session:1762209046962`
- Previous: `storyart:session:1762207131675`
- (and 2 more)

## Troubleshooting

### Connection Fails

1. **Check Redis is running:**
   ```bash
   redis-cli -p 6382 ping
   ```

2. **Verify environment variables:**
   ```bash
   npm run test:redis
   ```

3. **Check firewall/network:**
   - Ensure port 6382 is accessible
   - Check Redis bind configuration

### Wrong Port

If connection uses wrong port:
1. Check `.env` file has `REDIS_PORT=6382`
2. Verify `REDIS_URL` doesn't override it (if `REDIS_URL` is set, it takes priority)
3. Restart server: `npm run dev:server`

### Database Mismatch

StoryArt always uses database 0. If you see warnings:
```
⚠️  REDIS_URL specified database 1, but StoryArt uses database 0. Overriding to database 0 for stability.
```

This is expected behavior - StoryArt enforces database 0 for consistency.

## Migration Notes

### Previous Behavior

- Only supported `REDIS_URL`
- Defaulted to `localhost:6379`
- No support for individual `REDIS_HOST`/`REDIS_PORT`

### Current Behavior

- Supports `REDIS_URL` (priority)
- Supports `REDIS_HOST` + `REDIS_PORT` (fallback)
- Reads from `.env` file via `dotenv.config()`
- Always enforces database 0
- Enhanced logging for debugging

## Related Files

- `server.js` - Main Redis connection logic
- `test-redis-connection-strategy.js` - Connection test script
- `.env` - Environment configuration (REDIS_PORT=6382)
- `docs/ENVIRONMENT_CONFIGURATION.md` - Full environment documentation



