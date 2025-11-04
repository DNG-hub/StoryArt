# Redis Session Data Format and Versioning Guide

## Overview

This document describes the structure, format, and versioning system for Redis session data used by StoryArt. Understanding this format is essential for extracting data for automated image generation workflows.

## Storage Architecture

### Redis Key Structure

**Session Key Format:**
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

### Versioning System

Sessions are versioned using **timestamp-based keys** and a **Redis Sorted Set** for indexing:

1. **Primary Storage:** Each session is stored as a separate Redis key with a unique timestamp
2. **Index Storage:** A Redis Sorted Set (`storyart:sessions:index`) tracks all sessions
   - **Score:** Timestamp (used for sorting)
   - **Value:** Session key (e.g., `storyart:session:1704067200000`)
3. **Retrieval:** The latest session is retrieved by querying the sorted set with `REV: true` (reverse order)

**Redis Commands:**
```redis
# Save session
SETEX storyart:session:1704067200000 604800 '{"scriptText":"...","episodeContext":"...",...}'

# Add to index
ZADD storyart:sessions:index 1704067200000 storyart:session:1704067200000

# Get latest session key
ZRANGE storyart:sessions:index 0 0 REV

# Get session data
GET storyart:session:1704067200000
```

### TTL (Time To Live)

- **Redis TTL:** 7 days (604,800 seconds)
- **Purpose:** Automatic cleanup of old sessions
- **Format:** `SETEX key 604800 value`

### Fallback Storage

If Redis is unavailable, sessions are stored in:
1. **In-memory Map** (server-side fallback)
2. **localStorage** (client-side fallback)

## Data Structure

### SwarmUIExportData Interface

**Note:** The actual data structure saved to Redis differs from the TypeScript interface definition. The following reflects the actual implementation:

```typescript
interface SwarmUIExportData {
  scriptText: string;           // The episode script/narrative text
  episodeContext: string;        // JSON string of episode context
  storyUuid: string;            // Story UUID from database
  analyzedEpisode: AnalyzedEpisode;  // Complete beat analysis
  // Note: prompts are stored in analyzedEpisode.scenes[].beats[].prompts (not as separate array)
}
```

**Current Implementation:**
- `prompts` **ARE saved** to Redis as part of `analyzedEpisode.beats[].prompts`
- Each beat contains a `prompts` object with `cinematic` and `vertical` SwarmUI prompts
- Prompts are saved when you run analysis + prompt generation, then click "Save"
- This allows StoryTeller to read prompts directly from Redis for image generation
- If prompts are missing, they can be regenerated using the analysis data

### Field Descriptions

#### 1. `scriptText` (string)
- **Purpose:** The raw episode script/narrative text used for analysis
- **Format:** Plain text with scene markers (e.g., `EPISODE: 1`, `SCENE 1`)
- **Usage:** Used as input for beat analysis and prompt generation
- **Example:**
```
EPISODE: 1
TITLE: The Signal

SCENE 1
INT. NHIA FACILITY 7 - DAY

Dust motes danced in the shafts of sunlight...
```

#### 2. `episodeContext` (string)
- **Purpose:** JSON string containing episode metadata, character details, and location information
- **Format:** JSON string (must be parsed to access)
- **Structure:** See `EnhancedEpisodeContext` interface below
- **Usage:** Provides character LORA triggers, location descriptions, artifacts for prompt generation
- **Source:** Either from `constants.ts` (manual mode) or database API (database mode)

#### 3. `storyUuid` (string)
- **Purpose:** Unique identifier for the story in the database
- **Format:** UUID v4 format
- **Example:** `59f64b1e-726a-439d-a6bc-0dfefcababdb`
- **Usage:** Used to fetch database context for episode
- **Validation:** Must be valid UUID format (checked on restore)

#### 4. `analyzedEpisode` (AnalyzedEpisode)
- **Purpose:** Complete beat-by-beat analysis of the episode
- **Format:** JSON object
- **Structure:**
```typescript
interface AnalyzedEpisode {
  episodeNumber: number;
  title: string;
  scenes: AnalyzedScene[];
}

interface AnalyzedScene {
  sceneNumber: number;
  title: string;
  metadata: SceneMetadata;
  beats: BeatAnalysis[];
}

interface BeatAnalysis {
  beatId: string;
  core_action: string;
  beat_script_text: string;
  emotional_tone: string;
  visual_anchor: string;
  locationAttributes: string[];
  cameraAngleSuggestion?: string;
  characterPositioning?: string;
  prompts?: {                    // ✅ PROMPTS ARE SAVED HERE
    cinematic: SwarmUIPrompt;    // 16:9 cinematic prompt
    vertical: SwarmUIPrompt;     // 9:16 vertical prompt
  };
}
```

#### 5. `prompts` (Nested in BeatAnalysis - ✅ SAVED)
- **Purpose:** Generated SwarmUI prompts for each beat
- **Location:** `analyzedEpisode.scenes[].beats[].prompts`
- **Format:** Object with cinematic and vertical prompts
- **Structure:**
```typescript
// Prompts are nested inside each beat:
beat.prompts = {
  cinematic: SwarmUIPrompt,  // 16:9 aspect ratio
  vertical: SwarmUIPrompt    // 9:16 aspect ratio
}

interface SwarmUIPrompt {
  prompt: string;      // The actual prompt text (e.g., "(facing camera:1.2), wide shot...")
  model: string;       // Model name (e.g., "flux1-dev")
  width: number;       // Image width (e.g., 1024)
  height: number;      // Image height (e.g., 576 for 16:9)
  steps: number;       // Generation steps (e.g., 28)
  cfgscale: number;    // CFG scale (e.g., 7.0)
  seed: number;        // Random seed (e.g., -1)
}
```

**Access Pattern for StoryTeller:**
```typescript
// To get prompts for all beats:
const session = await getSessionFromRedis(timestamp);
session.analyzedEpisode.scenes.forEach(scene => {
  scene.beats.forEach(beat => {
    if (beat.prompts) {
      // Use beat.prompts.cinematic for 16:9 images
      // Use beat.prompts.vertical for 9:16 images
      generateImage(beat.prompts.cinematic);
    }
  });
});
```

### How StoryTeller Uses Prompts for Image Generation

**Why Prompts Are Saved:**
1. **Direct Image Generation:** StoryTeller can read prompts directly from Redis and send them to SwarmUI without regeneration
2. **Consistency:** Saved prompts ensure the same images are generated across sessions
3. **Performance:** No need to regenerate prompts (which requires AI API calls) every time images are needed
4. **Version Control:** Each saved session has its specific prompts, allowing StoryTeller to generate images from any version

**Workflow:**
1. **StoryArt** generates prompts and saves them to Redis (nested in `analyzedEpisode.beats[].prompts`)
2. **StoryTeller** reads the session from Redis using the timestamp
3. **StoryTeller** extracts prompts from each beat and sends them to SwarmUI for image generation
4. **Result:** Images are generated using the exact prompts that were created during analysis

**Example: StoryTeller Code to Extract Prompts:**
```typescript
// Get session from Redis
const session = await redis.get(`storyart:session:${timestamp}`);
const data = JSON.parse(session);

// Extract all prompts for image generation
const imageGenerationQueue = [];
data.analyzedEpisode.scenes.forEach(scene => {
  scene.beats.forEach(beat => {
    if (beat.prompts && beat.prompts.cinematic) {
      // Queue cinematic (16:9) image
      imageGenerationQueue.push({
        beatId: beat.beatId,
        prompt: beat.prompts.cinematic,
        aspectRatio: '16:9'
      });
    }
    if (beat.prompts && beat.prompts.vertical) {
      // Queue vertical (9:16) image
      imageGenerationQueue.push({
        beatId: beat.beatId,
        prompt: beat.prompts.vertical,
        aspectRatio: '9:16'
      });
    }
  });
});

// Send to SwarmUI
for (const item of imageGenerationQueue) {
  await swarmUI.generateImage(item.prompt);
}
```

**If Prompts Are Missing:**
- StoryTeller can check if `beat.prompts` exists
- If missing, StoryTeller can trigger prompt regeneration using the analysis data
- The `analyzedEpisode` contains all the data needed to regenerate prompts (character info, locations, beat analysis)

### Episode Context Structure

When `episodeContext` is parsed, it contains:

```typescript
interface EnhancedEpisodeContext {
  episode: {
    episode_number: number;
    episode_title: string;
    episode_summary: string;
    story_context: string;
    narrative_tone: string;
    core_themes: string;
    characters: CharacterContext[];
    scenes: SceneContext[];
  }
}

interface CharacterContext {
  character_name: string;      // e.g., "Catherine 'Cat' Mitchell"
  aliases: string[];           // e.g., ["Cat", "Catherine", "Mitchell"]
  base_trigger: string;        // LORA trigger (e.g., "JRUMLV woman")
  visual_description: string;
  location_contexts: CharacterLocationContext[];
}

interface CharacterLocationContext {
  location_name: string;
  physical_description: string;
  clothing_description: string;
  hair_description: string;
  demeanor_description: string;
  temporal_context: string;
  swarmui_prompt_override?: string;  // CRITICAL: Override for prompt generation
  lora_weight_adjustment?: number;
}

interface SceneContext {
  scene_number: number;
  scene_title: string;
  scene_summary: string;
  location: {
    id: string;
    name: string;
    visual_description: string;  // CRITICAL: Detailed location description
    artifacts: ArtifactContext[];
  };
  characters: CharacterAppearance[];  // Characters in this scene
}
```

## API Endpoints

### 1. Save Session

**Endpoint:** `POST /api/v1/session/save`

**Request Body:**
```json
{
  "scriptText": "...",
  "episodeContext": "{...}",
  "storyUuid": "59f64b1e-726a-439d-a6bc-0dfefcababdb",
  "analyzedEpisode": { ... },
  "prompts": [ ... ]  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session saved successfully",
  "sessionKey": "storyart:session:1704067200000",
  "storage": "redis" | "memory"
}
```

### 2. Get Latest Session

**Endpoint:** `GET /api/v1/session/latest`

**Response:**
```json
{
  "success": true,
  "data": {
    "scriptText": "...",
    "episodeContext": "{...}",
    "storyUuid": "...",
    "analyzedEpisode": { ... },
    "prompts": [ ... ]
  },
  "storage": "redis" | "memory" | "localStorage"
}
```

### 3. Get Session by Timestamp

**Endpoint:** `GET /api/v1/session/:timestamp`

**Response:**
```json
{
  "success": true,
  "data": {
    "scriptText": "...",
    "episodeContext": "{...}",
    "storyUuid": "...",
    "analyzedEpisode": { ... }
  },
  "storage": "redis" | "memory"
}
```

### 4. List All Sessions

**Endpoint:** `GET /api/v1/session/list`

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "timestamp": 1704067200000,
      "scriptText": "...",
      "storyUuid": "...",
      "analyzedEpisode": {
        "episodeNumber": 1,
        "title": "The Signal",
        "scenes": [ ... ]
      }
    }
  ],
  "count": 5
}
```

## Extracting Data for Auto Image Generation

### Step 1: Retrieve Session Data

```javascript
// Get latest session
const response = await fetch('http://localhost:7802/api/v1/session/latest');
const { data } = await response.json();

// Or get specific session by timestamp
const timestamp = 1704067200000;
const response = await fetch(`http://localhost:7802/api/v1/session/${timestamp}`);
const { data } = await response.json();
```

### Step 2: Parse Episode Context

```javascript
const episodeContext = JSON.parse(data.episodeContext);
const { episode } = episodeContext;

// Extract character LORA triggers
const characterTriggers = episode.characters.map(char => ({
  name: char.character_name,
  trigger: char.base_trigger,
  aliases: char.aliases
}));

// Extract location descriptions
const locations = episode.scenes.map(scene => ({
  sceneNumber: scene.scene_number,
  locationName: scene.location.name,
  visualDescription: scene.location.visual_description,
  artifacts: scene.location.artifacts
}));
```

### Step 3: Extract Beat Analysis

```javascript
const { analyzedEpisode } = data;

// Iterate through scenes and beats
analyzedEpisode.scenes.forEach(scene => {
  scene.beats.forEach(beat => {
    console.log(`Beat ${beat.beatId}:`);
    console.log(`  Action: ${beat.core_action}`);
    console.log(`  Visual Anchor: ${beat.visual_anchor}`);
    console.log(`  Emotional Tone: ${beat.emotional_tone}`);
    console.log(`  Location Attributes: ${beat.locationAttributes.join(', ')}`);
  });
});
```

### Step 4: Extract Character Context for Scenes

```javascript
const episodeContext = JSON.parse(data.episodeContext);

episodeContext.episode.scenes.forEach(scene => {
  const sceneNumber = scene.scene_number;
  const locationName = scene.location.name;
  
  // Get characters in this scene
  const characters = scene.characters || [];
  
  characters.forEach(char => {
    const locationContext = char.location_context;
    
    // Check for tactical override
    if (locationContext?.swarmui_prompt_override) {
      console.log(`Scene ${sceneNumber} - ${char.character_name}:`);
      console.log(`  Override: ${locationContext.swarmui_prompt_override}`);
      console.log(`  LORA Weight: ${locationContext.lora_weight_adjustment || 1.0}`);
    }
  });
});
```

### Step 5: Use Generated Prompts (if available)

```javascript
if (data.prompts && data.prompts.length > 0) {
  data.prompts.forEach(beatPrompt => {
    const { beatId, cinematic, vertical } = beatPrompt;
    
    console.log(`Beat ${beatId}:`);
    console.log(`  Cinematic (${cinematic.width}x${cinematic.height}): ${cinematic.prompt}`);
    console.log(`  Vertical (${vertical.width}x${vertical.height}): ${vertical.prompt}`);
    
    // Generate images using SwarmUI API
    await generateImage(cinematic);
    await generateImage(vertical);
  });
}
```

### Step 6: Generate Prompts if Not Available

If `prompts` are not in the session data, you can generate them:

```javascript
import { generateHierarchicalSwarmUiPrompts } from './services/promptGenerationService';

const episodeContextJson = data.episodeContext;
const styleConfig = {
  model: 'flux1-dev',
  cinematicAspectRatio: '16:9',
  verticalAspectRatio: '9:16'
};

const prompts = await generateHierarchicalSwarmUiPrompts(
  data.analyzedEpisode,
  episodeContextJson,
  styleConfig,
  'manual',  // or 'database'
  data.storyUuid,
  'gemini',  // or other LLM provider
  (message) => console.log(message)  // progress callback
);
```

## Key Data Points for Image Generation

### 1. Character LORA Triggers
- **Location:** `episodeContext.episode.characters[].base_trigger`
- **Usage:** Replace character names in prompts with LORA triggers
- **Example:** `"Catherine 'Cat' Mitchell"` → `"JRUMLV woman"`

### 2. Location Visual Descriptions
- **Location:** `episodeContext.episode.scenes[].location.visual_description`
- **Usage:** Detailed location descriptions for prompts
- **Critical:** Always use `visual_description` over generic location names

### 3. Location Artifacts
- **Location:** `episodeContext.episode.scenes[].location.artifacts[]`
- **Usage:** Visual elements from `swarmui_prompt_fragment` field
- **Example:** `"flickering red emergency lights and glowing biohazard symbols on the walls"`

### 4. Character Location Overrides
- **Location:** `episodeContext.episode.scenes[].characters[].location_context.swarmui_prompt_override`
- **Usage:** Complete character visual description for specific location
- **Priority:** If present, use this INSTEAD of base character description

### 5. Beat Analysis Data
- **Location:** `analyzedEpisode.scenes[].beats[]`
- **Usage:** Core action, visual anchor, emotional tone for prompt generation
- **Fields:**
  - `core_action`: What's happening in the beat
  - `visual_anchor`: Main visual focus
  - `emotional_tone`: Mood/atmosphere
  - `locationAttributes`: Scene-specific visual elements

## Session Versioning Best Practices

### 1. Always Use Latest Session
```javascript
// Get the most recent session
const latestSession = await getLatestSession();
```

### 2. Store Timestamp for Future Reference
```javascript
const sessionData = {
  ...data,
  savedAt: new Date(timestamp).toISOString()
};
```

### 3. Check Session Completeness
```javascript
function validateSession(session) {
  const required = ['scriptText', 'episodeContext', 'storyUuid', 'analyzedEpisode'];
  return required.every(field => session[field] !== undefined);
}
```

### 4. Handle Missing Prompts
```javascript
if (!session.prompts || session.prompts.length === 0) {
  // Generate prompts on-demand
  const prompts = await generatePrompts(session);
}
```

## Example: Complete Auto Image Generation Workflow

```javascript
async function autoGenerateImages() {
  // 1. Get latest session
  const response = await fetch('http://localhost:7802/api/v1/session/latest');
  const { data } = await response.json();
  
  // 2. Validate session
  if (!data.scriptText || !data.analyzedEpisode) {
    throw new Error('Invalid session data');
  }
  
  // 3. Parse episode context
  const episodeContext = JSON.parse(data.episodeContext);
  
  // 4. Generate prompts if not available
  let prompts = data.prompts;
  if (!prompts || prompts.length === 0) {
    prompts = await generateHierarchicalSwarmUiPrompts(
      data.analyzedEpisode,
      data.episodeContext,
      { model: 'flux1-dev', cinematicAspectRatio: '16:9', verticalAspectRatio: '9:16' },
      'manual',
      data.storyUuid,
      'gemini'
    );
  }
  
  // 5. Generate images for each beat
  for (const beatPrompt of prompts) {
    const { beatId, cinematic, vertical } = beatPrompt;
    
    // Generate cinematic image
    const cinematicImage = await generateImageInSwarmUI(cinematic);
    
    // Generate vertical image
    const verticalImage = await generateImageInSwarmUI(vertical);
    
    console.log(`✅ Generated images for beat ${beatId}`);
  }
}
```

## Troubleshooting

### Session Not Found
- Check if timestamp is valid: `!isNaN(timestamp)`
- Verify Redis connection: `GET /health`
- Check localStorage fallback (client-side only)

### Invalid UUID
- Validate `storyUuid` format: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Use fallback: `import.meta.env.VITE_CAT_DANIEL_STORY_ID`

### Missing Episode Context
- Check if `episodeContext` is a JSON string (parse it)
- Verify database connection if using database mode
- Fallback to `constants.ts` DEFAULT_EPISODE_CONTEXT

### Character Context Not Found
- Check `episodeContext.episode.scenes[].characters[]`
- Also check `episodeContext.episode.scenes[].character_appearances[]`
- Verify `base_trigger` is present for LORA substitution

## Related Files

- **Backend:** `server.js` - Redis session API implementation
- **Frontend Service:** `services/redisService.ts` - Client-side session management
- **Types:** `types.ts` - TypeScript interfaces for session data
- **Documentation:** `docs/REDIS_SESSION_RESTORE_PRD.md` - PRD for session restore feature

