# StorySwarm Fast Test Cycle Guide

## Overview

This guide shows how to test StorySwarm integration **without running through the full StoryArt UI**, enabling rapid iteration during development.

## Two Testing Approaches

### Approach 1: Direct Redis Injection (Fastest)
**Time**: ~5 seconds
**Cost**: Zero LLM calls
**Use Case**: Testing Redis read/write, format validation

### Approach 2: StoryArt UI (Full Pipeline)
**Time**: ~60 seconds
**Cost**: 2 LLM calls (beat analysis + prompt generation)
**Use Case**: End-to-end integration testing

---

## Approach 1: Direct Redis Injection

### Step 1: Inject Test Session

```bash
# Navigate to StoryArt directory
cd E:\REPOS\storyart

# Inject minimal test session (1 scene, 1 beat)
node scripts/inject-test-session-to-redis.js
```

**Output**:
```
✅ Connected to Redis
✅ Test session injected: session:1738195200000
✅ Set as latest session

📋 Session Details:
   Timestamp: 1738195200000
   Story UUID: 59f64b1e-726a-439d-a6bc-0dfefcababdb
   Episode: 2
   Scenes: 1
   Total Beats: 1
   Prompt Mode: storyswarm

🔍 StorySwarm Instructions:
1. Fetch session:
   GET http://localhost:8000/api/v1/session/1738195200000
   OR
   GET http://localhost:8000/api/v1/session/latest
```

### Step 2: StorySwarm Processes Session

**In StorySwarm repository:**

```bash
# Option A: Direct Redis read (Python example)
import redis
import json

client = redis.Redis(host='localhost', port=6379)
session = json.loads(client.get('session:latest'))

# Extract beat for processing
beat = session['analyzedEpisode']['scenes'][0]['beats'][0]
narrative = beat['narrativeText']
character = beat['primaryCharacter']

# Generate prompt using 6-agent pipeline
prompt = await generate_prompt(narrative, character)

# Write back to Redis
beat['prompts'] = {
    'cinematic': prompt,
    'vertical': prompt  # Optional
}

client.set(f"session:{session['timestamp']}", json.dumps(session))
```

**Option B: HTTP API (if backend running)**

```bash
# Fetch session
curl http://localhost:8000/api/v1/session/latest > session.json

# Process (StorySwarm logic here)
# ...

# Write back
curl -X PUT http://localhost:8000/api/v1/session/1738195200000 \
  -H "Content-Type: application/json" \
  -d @updated_session.json
```

### Step 3: Validate Output

```bash
# In StoryArt directory
node scripts/validate-storyswarm-output.js
```

**Expected Output**:
```
✅ Connected to Redis
📋 Validating Session: session:1738195200000

📊 Validation Results:
   ✅ Prompt Mode: storyswarm
   ✅ Beat Prompts: 1/1 beats have prompts
   ✅ Cinematic Prompts: 1/1 beats
   ✅ Vertical Prompts: 1/1 beats
   ✅ Prompt Format: Contains character triggers, LoRA tags, and segment tags

📝 Sample Prompts:
   Beat: ep2_sc1_bt1
   Prompt: JRUMLV woman 28 years old in white halter-neck midi dress...
   - Character trigger: ✅
   - LoRA tag: ✅
   - Segment tag: ✅

============================================================
✅ VALIDATION PASSED - StorySwarm output is StoryArt-compatible
```

### Step 4: Verify in StoryArt UI

1. Open StoryArt: `http://localhost:5173`
2. Click "Browse Sessions"
3. Load latest session
4. Verify prompts appear in UI
5. Test "Create All Images" workflow

---

## Approach 2: Full UI Pipeline

### Step 1: Prepare Episode Context

**Use existing Episode 2 context:**
```bash
# In StoryArt UI
1. Toggle "Database Retrieval" mode
2. Select Episode 2 from dropdown
3. Episode context auto-loads
```

**Or use minimal manual context:**
```json
{
  "episodeNumber": 2,
  "episodeTitle": "Test Episode",
  "characters": [
    {
      "name": "Cat",
      "base_trigger": "JRUMLV woman",
      "lora_model": "JRU_Cat_v3_e14.safetensors",
      "lora_weight": 0.9
    }
  ],
  "locations": [
    {
      "name": "Mobile Medical Base",
      "visual_description": "Converted semi-trailer with medical equipment"
    }
  ]
}
```

### Step 2: Minimal Script Text

```
SCENE 1: TEST SCENE

INT. MOBILE MEDICAL BASE - DAY

Cat analyzes holographic data. The interface flickers with anomalies.
```

### Step 3: Run Beat Analysis

1. Toggle **"StorySwarm"** mode
2. Select **Gemini** LLM
3. Click **"Analyze Script"**
4. Wait for: "✅ StorySwarm notification sent successfully"

### Step 4: StorySwarm Processing

**StorySwarm fetches and processes:**
```bash
# In StorySwarm
python main.py --mode redis --timestamp latest
```

### Step 5: Verify in StoryArt

1. Click "Browse Sessions"
2. Reload latest session
3. Verify prompts generated
4. Test image generation

---

## Test Session Format

### Input (Before StorySwarm)

```json
{
  "timestamp": 1738195200000,
  "promptMode": "storyswarm",
  "analyzedEpisode": {
    "scenes": [
      {
        "beats": [
          {
            "beatId": "ep2_sc1_bt1",
            "narrativeText": "Cat analyzes data...",
            "primaryCharacter": "Cat",
            "prompts": {}  // EMPTY
          }
        ]
      }
    ]
  }
}
```

### Output (After StorySwarm)

```json
{
  "timestamp": 1738195200000,
  "promptMode": "storyswarm",
  "analyzedEpisode": {
    "scenes": [
      {
        "beats": [
          {
            "beatId": "ep2_sc1_bt1",
            "narrativeText": "Cat analyzes data...",
            "primaryCharacter": "Cat",
            "prompts": {
              "cinematic": "JRUMLV woman 28 years old in white halter-neck midi dress with gold accents, focused expression as she analyzes tactical data on holographic display... <lora:JRU_Cat_v3_e14:0.9> <segment:yolo-face_yolov9c.pt-0,0.35,0.5>",
              "vertical": "JRUMLV woman 28 years old... [9:16 version]"
            }
          }
        ]
      }
    ]
  }
}
```

---

## Common Issues and Solutions

### Issue 1: Redis Connection Failed

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Check if Redis is running
redis-cli ping
# Expected: PONG

# Start Redis (Windows)
redis-server

# Start Redis (Docker)
docker run -d -p 6379:6379 redis
```

### Issue 2: Session Not Found

**Symptom**: `❌ Session not found: session:1738195200000`

**Solution**:
```bash
# List all sessions
redis-cli KEYS "session:*"

# Check latest session
redis-cli GET "session:latest"

# Re-inject test session
node scripts/inject-test-session-to-redis.js
```

### Issue 3: Validation Failed - No Prompts

**Symptom**: `❌ Beat Prompts: No prompts found (0/1)`

**Solution**:
```bash
# Check if StorySwarm wrote back to Redis
redis-cli GET "session:latest" | jq '.analyzedEpisode.scenes[0].beats[0].prompts'

# Expected: { "cinematic": "...", "vertical": "..." }
# If null, StorySwarm didn't write back correctly
```

### Issue 4: Prompt Format Invalid

**Symptom**: `❌ Prompt Format: Missing required tags`

**Solution**:

Required prompt components:
1. **Character trigger**: `JRUMLV woman` or `M45N1 man`
2. **LoRA tag**: `<lora:JRU_Cat_v3_e14:0.9>`
3. **Segment tag**: `<segment:yolo-face_yolov9c.pt-0,0.35,0.5>`

Example valid prompt:
```
JRUMLV woman 28 years old in white halter-neck midi dress, analyzing holographic data in medical base interior. Clinical blue lighting from monitors. Medium shot. <lora:JRU_Cat_v3_e14:0.9> <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

---

## Performance Comparison

| Method | Time | LLM Calls | Cost | Use Case |
|--------|------|-----------|------|----------|
| Direct Redis Injection | 5 sec | 0 | $0 | Format testing, Redis validation |
| UI Single Beat | 30 sec | 2 | ~$0.01 | Quick integration test |
| UI Full Scene (4 beats) | 60 sec | 5 | ~$0.05 | Realistic testing |
| UI Full Episode (48 beats) | 10 min | 50+ | ~$0.50 | Production validation |

**Recommendation**: Use Direct Redis Injection for initial development, then scale to UI testing once format is validated.

---

## Iteration Workflow

### Fast Iteration (Development)

```bash
# 1. Inject test session (5 sec)
node scripts/inject-test-session-to-redis.js

# 2. StorySwarm processes (10 sec)
cd ../StorySwarm
python process_redis_session.py --latest

# 3. Validate output (2 sec)
cd ../storyart
node scripts/validate-storyswarm-output.js

# Total: ~17 seconds per iteration
```

### Full Integration Test (QA)

```bash
# 1. Run through StoryArt UI
# - Toggle StorySwarm mode
# - Analyze minimal script
# - Wait for notification (60 sec)

# 2. StorySwarm processes
# - Polls Redis for new session
# - Generates prompts
# - Writes back (30 sec)

# 3. Verify in StoryArt
# - Browse sessions
# - Load latest
# - Check prompts
# - Test image generation (varies)

# Total: ~90 seconds + image generation time
```

---

## Advanced: Custom Test Scenarios

### Multi-Character Scene

```bash
# Inject session with Cat AND Ghost
node scripts/inject-test-session-to-redis.js --scenario multi-character
```

### Location Override Test

```bash
# Test MMB → Office Professional mapping
node scripts/inject-test-session-to-redis.js --scenario location-override
```

### Helmet Hair Suppression Test

```bash
# Test ZERO TOLERANCE helmet hair rule
node scripts/inject-test-session-to-redis.js --scenario helmet-check
```

---

## Next Steps

1. **Validate Redis Access**: Run `inject-test-session-to-redis.js`
2. **StorySwarm Development**: Implement Redis read → process → write
3. **Validation**: Run `validate-storyswarm-output.js`
4. **UI Verification**: Load session in StoryArt and test images
5. **Scale Up**: Move from 1 beat → 4 beats → full episode

---

## Support

**For Issues**:
- Redis connection: Check Redis server status
- Session format: See `types.ts` for `SwarmUIExportData` interface
- Prompt format: See `docs/STORYSWARM_INTEGRATION_PLAN_V2.md`

**For Questions**:
- StoryArt team: Frontend/Redis integration
- StorySwarm team: Prompt generation pipeline
