# Quick Access: Episode 1: The Signal (Nov 4, 2025, 10:39:01 AM)

## Episode Details
- **Date:** Nov 4, 2025, 10:39:01 AM
- **Episode:** Episode 1: The Signal
- **Story UUID:** 59f64b1e...
- **Scenes:** 4

## Critical: Database Difference

**StoryArt uses Redis Database 0**  
**StoryTeller uses Redis Database 1**

This is why StoryTeller cannot see StoryArt sessions - they're in different databases!

## Quick Access Methods

### Method 1: Redis CLI (Fastest)

```bash
# Connect to Redis database 0 (StoryArt's database)
redis-cli -n 0

# Get the session directly by timestamp
GET storyart:session:1762281541000

# Or check if it exists first
EXISTS storyart:session:1762281541000

# Check TTL (time remaining before expiration)
TTL storyart:session:1762281541000
```

**Note:** If the timestamp doesn't work, search the index:
```bash
# List all sessions (newest first)
ZRANGE storyart:sessions:index 0 -1 REV WITHSCORES

# This will show all session keys with their timestamps
# Look for one near Nov 4, 2025, 10:39:01 AM
```

### Method 2: StoryArt API (Recommended)

```bash
# Get session by timestamp
curl http://localhost:7802/api/v1/session/1762281541000

# Or list all sessions and find it
curl http://localhost:7802/api/v1/session/list
```

### Method 3: Python Script

```python
import redis
import json

# Connect to Redis database 0
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Get session
session_key = "storyart:session:1762281541000"
session_data = r.get(session_key)

if session_data:
    session = json.loads(session_data)
    print(f"Episode: {session['analyzedEpisode']['title']}")
    print(f"Story UUID: {session['storyUuid']}")
    print(f"Scenes: {len(session['analyzedEpisode']['scenes'])}")
else:
    print("Session not found - may have expired (7 day TTL)")
```

### Method 4: Find by Date (if timestamp unknown)

```python
import redis
import json
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Target date
target_date = datetime(2025, 11, 4, 10, 39, 1)
target_timestamp = int(target_date.timestamp() * 1000)

# Search index
sessions = r.zrange('storyart:sessions:index', 0, -1, withscores=True, desc=True)

for session_key, timestamp in sessions:
    session_date = datetime.fromtimestamp(timestamp / 1000)
    if abs((session_date - target_date).total_seconds()) < 60:  # Within 1 minute
        print(f"Found: {session_key}")
        print(f"Timestamp: {timestamp}")
        
        # Get full session
        session_data = r.get(session_key)
        if session_data:
            session = json.loads(session_data)
            print(f"Episode: {session['analyzedEpisode']['title']}")
            print(f"Story UUID: {session['storyUuid']}")
            break
```

## Redis Key Structure

**Session Key:**
```
storyart:session:1762281541000
```

**Index Key:**
```
storyart:sessions:index
```

## Important Notes

1. **Database:** Must use database 0 (`-n 0` in redis-cli)

2. **TTL:** Sessions expire after 7 days. If older, check TTL:
   ```bash
   redis-cli -n 0 TTL storyart:session:1762281541000
   ```
   - Returns `-2` if expired/deleted
   - Returns positive number (seconds) if still active

3. **Timestamp:** The timestamp `1762281541000` is calculated for Nov 4, 2025, 10:39:01 AM in Pacific Standard Time (GMT-8). If you're in a different timezone, recalculate:
   ```javascript
   const date = new Date('2025-11-04T10:39:01-08:00'); // PST
   console.log(date.getTime()); // 1762281541000
   ```

## Verification

After retrieving the session, verify it matches:
- Episode Number: 1
- Title: "The Signal"
- Story UUID starts with: 59f64b1e
- Scene count: 4

## Full Documentation

For complete details, see: `docs/STORYTELLER_ACCESS_STORYART_REDIS.md`



