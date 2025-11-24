# Guide: How StoryTeller Can Access StoryArt Redis Sessions

## Overview

This document provides instructions for StoryTeller to access episodes stored by StoryArt in Redis. StoryArt uses a different Redis database and key structure than StoryTeller, which is why StoryTeller cannot see StoryArt sessions by default.

## Critical Configuration Differences

### Redis Database

**StoryArt uses Redis Database 0** (standardized for stability)
**StoryTeller uses Redis Database 1** (based on your investigation)

**This is the primary reason StoryTeller cannot see StoryArt sessions** - they're stored in different databases!

### Key Structure

**StoryArt Session Keys:**
```
storyart:session:{timestamp}
```

**StoryTeller Export Keys (for comparison):**
```
swarmui:exports:recent  (sorted set)
```

## Accessing a Specific Episode

### Episode Details
- **Date:** Nov 4, 2025, 10:39:01 AM
- **Episode:** Episode 1: The Signal
- **Story UUID:** 59f64b1e...
- **Scenes:** 4

### Step 1: Calculate the Timestamp

The timestamp format is Unix milliseconds (JavaScript `Date.now()`).

**For Nov 4, 2025, 10:39:01 AM:**

**Option A: Using Node.js/JavaScript**
```javascript
const date = new Date('2025-11-04T10:39:01'); // Local time
// OR if timezone is known:
const date = new Date('2025-11-04T10:39:01-05:00'); // EST example
const timestamp = date.getTime();
console.log(timestamp); // e.g., 1762281541000
```

**Option B: Using Python**
```python
from datetime import datetime
import time

# Assuming local timezone or specify timezone
date = datetime(2025, 11, 4, 10, 39, 1)
timestamp_ms = int(date.timestamp() * 1000)
print(timestamp_ms)
```

**Option C: Manual Calculation**
- Unix timestamp for Nov 4, 2025, 10:39:01 AM (local time) ≈ `1762281541000` (milliseconds)
- **Note:** Exact value depends on timezone. Use the calculation methods above for accuracy.

### Step 2: Connect to Redis Database 0

**Using Redis CLI:**
```bash
redis-cli -n 0
```

**Using Python (redis-py):**
```python
import redis

# Connect to Redis database 0 (StoryArt's database)
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
```

**Using Node.js (redis):**
```javascript
import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379/0'  // Database 0
});

await client.connect();
```

### Step 3: Access the Session

**Redis Key:**
```
storyart:session:1762281541000
```
*(Replace with actual timestamp calculated in Step 1)*

**Using Redis CLI:**
```bash
# Connect to database 0
redis-cli -n 0

# Get the session data
GET storyart:session:1762281541000

# Or check if it exists first
EXISTS storyart:session:1762281541000
```

**Using Python:**
```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Get session data
session_key = f"storyart:session:1762281541000"
session_data = r.get(session_key)

if session_data:
    session = json.loads(session_data)
    print(f"Episode: {session.get('analyzedEpisode', {}).get('title', 'Unknown')}")
    print(f"Story UUID: {session.get('storyUuid', 'Unknown')}")
    print(f"Scenes: {len(session.get('analyzedEpisode', {}).get('scenes', []))}")
else:
    print("Session not found")
```

**Using Node.js:**
```javascript
import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379/0'
});

await client.connect();

const timestamp = 1762281541000; // Replace with actual timestamp
const sessionKey = `storyart:session:${timestamp}`;
const sessionData = await client.get(sessionKey);

if (sessionData) {
  const session = JSON.parse(sessionData);
  console.log(`Episode: ${session.analyzedEpisode?.title || 'Unknown'}`);
  console.log(`Story UUID: ${session.storyUuid || 'Unknown'}`);
  console.log(`Scenes: ${session.analyzedEpisode?.scenes?.length || 0}`);
} else {
  console.log('Session not found');
}
```

## Finding the Session by Date

If you don't know the exact timestamp, you can search the index:

### Step 1: Query the Index

**Redis Sorted Set Index:**
```
storyart:sessions:index
```

**Using Redis CLI:**
```bash
redis-cli -n 0

# List all sessions (reverse chronological - newest first)
ZRANGE storyart:sessions:index 0 -1 REV WITHSCORES

# This returns:
# 1) "storyart:session:1762281541000"  (session key)
# 2) "1762281541000"                  (timestamp score)
# 3) "storyart:session:1762281540999"  (next session)
# 4) "1762281540999"                  (next timestamp)
# ...
```

**Using Python:**
```python
import redis
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Get all sessions with scores
sessions = r.zrange('storyart:sessions:index', 0, -1, withscores=True, desc=True)

target_date = datetime(2025, 11, 4, 10, 39, 1)
target_timestamp = int(target_date.timestamp() * 1000)

# Find closest match
for session_key, timestamp in sessions:
    # Convert timestamp to date for comparison
    session_date = datetime.fromtimestamp(timestamp / 1000)
    if abs((session_date - target_date).total_seconds()) < 60:  # Within 1 minute
        print(f"Found: {session_key}")
        print(f"Timestamp: {timestamp}")
        print(f"Date: {session_date}")
        break
```

### Step 2: Extract Session Data

Once you have the session key, retrieve the full data:

```python
session_data = r.get(session_key)
session = json.loads(session_data)

# Access episode information
episode = session.get('analyzedEpisode', {})
print(f"Episode Number: {episode.get('episodeNumber')}")
print(f"Title: {episode.get('title')}")
print(f"Scenes: {len(episode.get('scenes', []))}")

# Access story information
print(f"Story UUID: {session.get('storyUuid')}")

# Access script text
print(f"Script Preview: {session.get('scriptText', '')[:200]}...")
```

## Using StoryArt API Endpoints

StoryArt provides REST API endpoints that StoryTeller can call:

### Base URL
- Default: `http://localhost:7802` (StoryArt Redis API)
- Alternative: `http://localhost:8000` (StoryTeller API if integrated)

### Endpoints

#### 1. Get Latest Session
```bash
curl http://localhost:7802/api/v1/session/latest
```

#### 2. Get Session by Timestamp
```bash
curl http://localhost:7802/api/v1/session/1762281541000
```

#### 3. List All Sessions
```bash
curl http://localhost:7802/api/v1/session/list
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "scriptText": "...",
    "storyUuid": "59f64b1e-...",
    "analyzedEpisode": {
      "episodeNumber": 1,
      "title": "The Signal",
      "scenes": [...]
    },
    ...
  },
  "storage": "redis"
}
```

## Important Notes

### TTL (Time To Live)

- **StoryArt sessions expire after 7 days**
- If the session is older than 7 days, it may have been automatically deleted
- Check TTL: `TTL storyart:session:{timestamp}` (returns seconds remaining, or -2 if expired)

### Database Selection

**Critical:** Always specify database 0 when connecting to Redis:
```bash
redis-cli -n 0  # Database 0
```

If you connect without `-n 0`, you'll be in database 0 by default, but if you've been using database 1, you need to explicitly switch.

### Key Differences from StoryTeller

| Feature | StoryArt | StoryTeller |
|---------|----------|-------------|
| Redis Database | 0 | 1 |
| Key Prefix | `storyart:session:` | `swarmui:exports:` |
| Index Key | `storyart:sessions:index` | `swarmui:exports:recent` |
| TTL | 7 days (synchronized) | Varies (may have orphaned entries) |

## Troubleshooting

### Session Not Found

1. **Check database:** Ensure you're querying database 0
   ```bash
   redis-cli -n 0
   ```

2. **Check if session exists:**
   ```bash
   EXISTS storyart:session:1762281541000
   ```

3. **Check TTL:**
   ```bash
   TTL storyart:session:1762281541000
   ```
   - Returns `-2` if key doesn't exist
   - Returns `-1` if key exists but has no TTL
   - Returns positive number (seconds remaining) if key exists with TTL

4. **Search index:**
   ```bash
   ZRANGE storyart:sessions:index 0 -1 REV WITHSCORES
   ```

### Wrong Timestamp

If the timestamp doesn't match, try:
1. Calculate timestamp for different timezones (UTC vs local)
2. Search index for timestamps near the target date
3. Use API endpoint to list all sessions and find by date

### Connection Issues

If Redis connection fails:
1. Verify Redis is running: `redis-cli ping`
2. Check Redis URL/port configuration
3. Verify network access between StoryTeller and Redis server

## Example: Complete Python Script

```python
#!/usr/bin/env python3
"""
StoryArt Redis Session Access Script for StoryTeller
"""
import redis
import json
from datetime import datetime

def find_storyart_session(target_date_str, story_uuid_prefix=None):
    """
    Find and retrieve a StoryArt session by date.
    
    Args:
        target_date_str: Date string in format 'YYYY-MM-DD HH:MM:SS'
        story_uuid_prefix: Optional story UUID prefix to filter (e.g., '59f64b1e')
    
    Returns:
        Session data dictionary or None
    """
    # Connect to Redis database 0 (StoryArt's database)
    r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    
    # Parse target date
    target_date = datetime.strptime(target_date_str, '%Y-%m-%d %H:%M:%S')
    target_timestamp = int(target_date.timestamp() * 1000)
    
    print(f"Searching for session near: {target_date_str}")
    print(f"Target timestamp: {target_timestamp}")
    
    # Get all sessions from index
    sessions = r.zrange('storyart:sessions:index', 0, -1, withscores=True, desc=True)
    
    print(f"Found {len(sessions)} total sessions in index")
    
    # Find closest match
    best_match = None
    best_diff = float('inf')
    
    for session_key, timestamp in sessions:
        session_date = datetime.fromtimestamp(timestamp / 1000)
        time_diff = abs((session_date - target_date).total_seconds())
        
        if time_diff < best_diff:
            best_diff = time_diff
            best_match = (session_key, timestamp, session_date)
    
    if not best_match:
        print("No sessions found in index")
        return None
    
    session_key, timestamp, session_date = best_match
    print(f"\nBest match:")
    print(f"  Key: {session_key}")
    print(f"  Timestamp: {timestamp}")
    print(f"  Date: {session_date}")
    print(f"  Time difference: {best_diff:.0f} seconds")
    
    # Retrieve full session data
    session_data = r.get(session_key)
    
    if not session_data:
        print(f"\n⚠️  Session key exists in index but data not found (may have expired)")
        return None
    
    session = json.loads(session_data)
    
    # Filter by story UUID if provided
    if story_uuid_prefix:
        story_uuid = session.get('storyUuid', '')
        if not story_uuid.startswith(story_uuid_prefix):
            print(f"\n⚠️  Story UUID mismatch: {story_uuid[:8]}... (expected {story_uuid_prefix}...)")
            return None
    
    # Display session info
    print(f"\n✅ Session found:")
    print(f"  Story UUID: {session.get('storyUuid', 'Unknown')}")
    
    episode = session.get('analyzedEpisode', {})
    print(f"  Episode: {episode.get('episodeNumber', 'Unknown')} - {episode.get('title', 'Unknown')}")
    print(f"  Scenes: {len(episode.get('scenes', []))}")
    
    return session

# Example usage
if __name__ == '__main__':
    # Find session for Nov 4, 2025, 10:39:01 AM
    session = find_storyart_session(
        '2025-11-04 10:39:01',
        story_uuid_prefix='59f64b1e'
    )
    
    if session:
        print("\n✅ Session retrieved successfully!")
        # Access full session data
        print(f"Script text length: {len(session.get('scriptText', ''))} characters")
    else:
        print("\n❌ Session not found")
```

## Summary

To access the StoryArt episode "Episode 1: The Signal" from Nov 4, 2025, 10:39:01 AM:

1. **Connect to Redis Database 0** (not database 1)
2. **Calculate timestamp:** `1762281541000` (exact value depends on timezone)
3. **Query key:** `storyart:session:1762281541000`
4. **Or search index:** `storyart:sessions:index`

**Quick Command:**
```bash
redis-cli -n 0 GET storyart:session:1762281541000
```

Or use the StoryArt API:
```bash
curl http://localhost:7802/api/v1/session/1762281541000
```


