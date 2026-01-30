# StoryArt Scripts

Utility scripts for StoryArt development, testing, and integration.

## StorySwarm Integration Testing

### inject-test-session-to-redis.js

**Purpose**: Inject minimal test session directly into Redis without running StoryArt UI.

**Usage**:
```bash
# Inject with current timestamp
node scripts/inject-test-session-to-redis.js

# Inject with specific timestamp
node scripts/inject-test-session-to-redis.js --timestamp=1738195200000
```

**What it does**:
- Creates minimal session (1 scene, 1 beat)
- Sets `promptMode: 'storyswarm'`
- Saves to Redis with key `session:{timestamp}`
- Sets as latest session
- Displays StorySwarm processing instructions

**Use case**: Fast iteration during StorySwarm development - bypasses UI workflow.

---

### validate-storyswarm-output.js

**Purpose**: Validate that StorySwarm correctly wrote prompts back to Redis.

**Usage**:
```bash
# Validate latest session
node scripts/validate-storyswarm-output.js

# Validate specific session
node scripts/validate-storyswarm-output.js --timestamp=1738195200000
```

**What it checks**:
- ✅ Prompt mode is 'storyswarm'
- ✅ All beats have prompts
- ✅ Prompts contain character triggers (JRUMLV woman, M45N1 man)
- ✅ Prompts contain LoRA tags (`<lora:...>`)
- ✅ Prompts contain segment tags (`<segment:...>`)
- ✅ Format is StoryArt-compatible

**Exit codes**:
- `0`: Validation passed
- `1`: Validation failed

**Use case**: Automated testing, CI/CD validation.

---

## Other Scripts

### list-redis-sessions.js

List all sessions currently in Redis with metadata.

```bash
node scripts/list-redis-sessions.js
```

---

### search-text-in-prompts.js

Search for specific text patterns in generated prompts.

```bash
node scripts/search-text-in-prompts.js --pattern="white halter"
```

---

### show-scene-prompts.js

Display all prompts for a specific scene.

```bash
node scripts/show-scene-prompts.js --scene=1
```

---

## Testing Workflow

### Fast Test Cycle (Recommended)

```bash
# 1. Inject test session (5 seconds)
node scripts/inject-test-session-to-redis.js

# 2. StorySwarm processes session (run in StorySwarm repo)
cd ../StorySwarm
python process_redis_session.py --latest

# 3. Validate output (2 seconds)
cd ../storyart
node scripts/validate-storyswarm-output.js
```

**Total time**: ~17 seconds per iteration

### Full Integration Test

```bash
# 1. Run through StoryArt UI
# - Toggle StorySwarm mode
# - Analyze script
# - Wait for notification

# 2. Validate output
node scripts/validate-storyswarm-output.js

# 3. Verify in UI
# - Browse sessions
# - Load latest
# - Check prompts
```

---

## Requirements

All scripts require:
- **Node.js**: v18+ (ES modules support)
- **Redis**: Running on localhost:6379 (or set REDIS_URL env var)
- **Dependencies**: `redis` package (installed via npm)

Install dependencies:
```bash
npm install
```

---

## Documentation

See comprehensive testing guide:
- `docs/STORYSWARM_FAST_TEST_CYCLE.md` - Complete testing workflow
- `docs/BACKEND_API_REQUIREMENTS.md` - Backend API specifications
- `docs/AUTOMATION_INTEGRATION_GUIDE.md` - Automation pipeline guide

---

## Troubleshooting

**Redis connection failed**:
```bash
# Check Redis status
redis-cli ping
# Expected: PONG

# Start Redis
redis-server
```

**Session not found**:
```bash
# List all sessions
redis-cli KEYS "session:*"

# Get latest session
redis-cli GET "session:latest"
```

**Validation failed**:
```bash
# Check session structure
redis-cli GET "session:latest" | jq '.'

# Check specific beat prompts
redis-cli GET "session:latest" | jq '.analyzedEpisode.scenes[0].beats[0].prompts'
```

---

## Contributing

When adding new scripts:
1. Use ES modules (`import`/`export`)
2. Add JSDoc comments
3. Include usage examples
4. Update this README
5. Add error handling
6. Support `--help` flag
