# DATA LOCATOR
## Quick Reference for Prompt Component Sources

**Purpose:** Map "what we need" to "where to find it"
**Status:** Iterative - grows as we validate sources

---

## CHARACTER DATA

### Trigger Word
```
Table: characters
Field: lora_trigger
Example: "JRUMLV woman"
Query: SELECT lora_trigger FROM characters WHERE name = 'Cat Mitchell'
```

### LoRA Configuration
```
Table: characters
Fields: lora_name, lora_weight, rendering_model
Default weight: 1.0
```

### Physical Description (Base)
```
Table: characters
Fields: age, build, hair color, eye color, distinguishing features
Note: These are the invariant physical traits
```

### Context-Aware Appearance
```
Table: character_location_contexts
Fields:
  - physical_description
  - clothing_description
  - hair_description
  - demeanor_description
  - swarmui_prompt_override (use VERBATIM if exists)
  - clothing_segment
  - lora_weight_adjustment
Filter: character_id + location_arc_id + temporal_context
```

---

## GEAR FRAGMENTS

### Fragment Types
```
Table: gear_fragments
Field: fragment_type

Types:
  BASE_SUIT     - Core clothing/suit description
  HAIR          - Hairstyle variants
  HELMET        - Helmet states (universal)
  ACCESSORY     - Weapons, props, gear
  SUIT_UP       - Complete suit-up prompts
  SUIT_PRESENT  - Suit displayed not worn
```

### Fragment Lookup
```
Table: gear_fragments
Fields:
  - prompt_fragment (the actual text)
  - segment_syntax (SwarmUI segment directive)
  - priority (assembly order)
  - is_active
  - character_id (NULL = universal)

Query pattern:
SELECT prompt_fragment, segment_syntax, priority
FROM gear_fragments
WHERE story_id = ?
  AND (character_id = ? OR character_id IS NULL)
  AND fragment_type = ?
  AND is_active = true
ORDER BY priority ASC
```

---

## LOCATION DATA

### Location Base Info
```
Table: location_arcs
Fields:
  - name
  - description
  - location_type (SPECIFIC, GENERAL, CONTEXT)
  - atmosphere_category (PROFESSIONAL, INTIMATE, TACTICAL, etc.)
  - visual_description
  - key_features
  - is_field_op (determines gear state)
```

### Location Artifacts (Shorthand Components)
```
Table: location_artifacts
Fields:
  - artifact_name
  - artifact_type (STRUCTURAL, LIGHTING, ATMOSPHERIC, PROP)
  - swarmui_prompt_fragment (ready-to-use text)
  - always_present (filter for defaults)

Query for location shorthand:
-- Get 2-3 structural anchors
SELECT swarmui_prompt_fragment
FROM location_artifacts
WHERE location_arc_id = ?
  AND artifact_type = 'STRUCTURAL'
  AND always_present = true
LIMIT 3

-- Get lighting signature
SELECT swarmui_prompt_fragment
FROM location_artifacts
WHERE location_arc_id = ?
  AND artifact_type = 'LIGHTING'
  AND always_present = true
LIMIT 1

-- Get atmosphere
SELECT swarmui_prompt_fragment
FROM location_artifacts
WHERE location_arc_id = ?
  AND artifact_type = 'ATMOSPHERIC'
  AND always_present = true
LIMIT 1
```

---

## BEAT INPUT DATA (Primary Source - StoryArt/StorySwarm)

### Redis Session (Beat-Only Mode)

**Location:** Redis key `storyart:session:{timestamp}`

**Access:**
```python
import redis
r = redis.Redis(host='localhost', port=6382, decode_responses=True)
session = json.loads(r.get('storyart:session:latest'))
```

### Beat Director Fields (INPUT TO PROMPT GENERATION)

```
Path: session['analyzedEpisode']['scenes'][N]['beats'][M]

Fields:
  - beatId: "s1-b1"
  - beat_script_text: "narrative content..."
  - cameraAngleSuggestion: "Medium shot on Cat, then push in..."
  - characterPositioning: "Cat standing, facing the monitor bank"
  - locationAttributes: ["converted semi-trailer", "medical monitors"]
  - visualSignificance: "High" | "Medium" | "Low"
  - imageDecision: {type: "NEW_IMAGE" | "REUSE_IMAGE", reason: "..."}
  - emotional_tone: "tense anticipation"
  - characters: ["Cat"]
  - setting: "Mobile Medical Base interior"
```

### Session Metadata
```
Path: session root

Fields:
  - promptMode: "storyswarm" (indicates beat-only mode)
  - storyUuid: "59f64b1e-726a-439d-a6bc-0dfefcababdb"
  - retrievalMode: "database"
  - selectedLLM: "gemini"
```

### Quick Access Pattern
```python
# Get latest session
session_index = r.get('storyart:sessions:index')
latest_key = json.loads(session_index)[-1]  # Most recent

# Get all beats from scene 1
session = json.loads(r.get(latest_key))
scene_1_beats = session['analyzedEpisode']['scenes'][0]['beats']

# Extract director info from first beat
beat = scene_1_beats[0]
camera = beat.get('cameraAngleSuggestion', '')
positioning = beat.get('characterPositioning', '')
tone = beat.get('emotional_tone', '')
```

---

## SCENE/BEAT DATA (Database - Roadmap)

### Roadmap Scene
```
Table: roadmap_scenes
Fields:
  - scene_number
  - scene_title
  - scene_description
  - characters (who appears)
  - locations
  - mood
  - time_of_day
  - entry_state
  - exit_state
  - roadmap_metadata (JSONB - visual hints + intensity)
```

### Visual Hints in Roadmap Metadata
```
Field: roadmap_scenes.roadmap_metadata

Expected keys:
  - gear_context: "off_duty" | "suit_up" | "field_op" | "stealth"
  - suit_alert_level: "normal" | "warning" | "danger"
  - camera_angles: suggested shots
  - visual_composition_hints
  - lighting_directives
```

---

## INTENSITY & PACING DATA (YouTube Optimization)

### YouTube Episode Structure (8-4-4-3 Minutes)

The 19-minute episode format is optimized for YouTube ad placement:

```
Scene 1: 0-8 minutes   (setup_hook, ad break at ~8 min)
Scene 2: 8-12 minutes  (development)
Scene 3: 12-16 minutes (development/escalation)
Scene 4: 16-19 minutes (climax/resolution)
```

### Roadmap JSON Schema Additions (REQUIRED)

Add these fields to each scene in season JSON files:

```json
{
  "scene_number": 1,
  "scene_title": "The Seven Dots",

  // NEW: Intensity & Pacing Fields
  "scene_role": "setup_hook",           // setup_hook | development | escalation | climax | resolution
  "target_duration_minutes": 8,          // 8 for scene 1, 4 for scenes 2-3, 3 for scene 4
  "scene_timing": "0-8min",              // Human-readable timing window
  "is_ad_break_scene": true,             // Scene 1 only - natural pause at 8-min mark
  "ad_break_moment": "Cat realizes Ghost knew her service number",  // Specific dramatic pause point

  "intensity_arc": "building",           // calm | building | peak | falling | resolved
  "emotional_intensity": 6,              // 1-10 scale (visual drama level)
  "conflict_level": 4,                   // 1-10 scale (character conflict)
  "pacing": "measured",                  // slow | measured | brisk | frenetic

  // Existing fields...
  "gear_context": "off_duty",
  "ad_break_cliffhanger": "As Cat opens a file..."
}
```

### Scene Role Definitions

| Role | Position | Purpose | Visual Treatment |
|------|----------|---------|------------------|
| `setup_hook` | Scene 1 | Establish world, hook viewer | Establishing shots, character intros |
| `development` | Scene 2-3 | Build tension, advance plot | Mixed framing, dialog-heavy |
| `escalation` | Scene 3 | Raise stakes before climax | Tighter framing, more angles |
| `climax` | Scene 4 | Peak dramatic moment | Close-ups, dramatic lighting |
| `resolution` | Scene 4 | Resolve or cliffhanger | Depends on episode type |

### Intensity Arc Definitions

| Arc | Intensity Range | Visual Implication |
|-----|-----------------|-------------------|
| `calm` | 1-3 | Soft lighting, wider shots, neutral expressions |
| `building` | 4-6 | Standard variety, building tension in framing |
| `peak` | 7-9 | Dramatic lighting, close-ups, intense expressions |
| `falling` | 4-6 | Softer post-climax, reflective |
| `resolved` | 1-3 | Wide shots, peaceful lighting |

### Ad Break Paradigm (8-Minute Rule)

**Purpose:** YouTube inserts mid-roll ads. A natural dramatic pause at 8 minutes:
- Prevents jarring ad insertion mid-action
- Gives viewers a "breath" before ad
- Increases watch-through rate

**Implementation:**
1. Scene 1 MUST have `is_ad_break_scene: true`
2. Scene 1 MUST have `ad_break_moment` describing the pause point
3. Beat generation should create a natural "breath" beat near 8-min mark
4. Visual: This beat should be slightly lower intensity than surrounding beats

### Database Fields (scenes table)

```
Table: scenes
Fields for intensity (already exist, need population):
  - emotional_intensity: Integer (1-10)
  - conflict_level: Integer (1-10)
  - pacing_score: Integer (1-10)
  - scene_role: String (setup_hook, development, climax, resolution)
  - target_duration_minutes: Integer
  - scene_timing: String (0-8min, 8-12min, etc.)
  - is_ad_break_scene: Boolean
```

### Episode Context Integration

**StoryArtContextService must include:**
```python
scene_context = {
    # Existing...
    "time_of_day": scene.time_of_day,
    "gear_context": scene.gear_context,

    # NEW: Intensity fields
    "scene_role": scene.scene_role or roadmap_scene.roadmap_metadata.get("scene_role"),
    "target_duration_minutes": scene.target_duration_minutes,
    "scene_timing": scene.scene_timing,
    "is_ad_break_scene": scene.is_ad_break_scene,
    "intensity_arc": roadmap_scene.roadmap_metadata.get("intensity_arc"),
    "emotional_intensity": scene.emotional_intensity,
    "pacing": roadmap_scene.pacing
}
```

---

## STORY CONTEXT

### Story Configuration
```
Table: stories
Fields:
  - id (story_id - filter everything by this)
  - title
  - tone
  - genre
```

---

## QUICK LOOKUP PATTERNS

### "I need Cat's appearance in tactical gear"
```sql
SELECT gf.prompt_fragment, gf.segment_syntax
FROM gear_fragments gf
JOIN characters c ON gf.character_id = c.id
WHERE c.name = 'Cat Mitchell'
  AND gf.fragment_type = 'BASE_SUIT'
  AND gf.is_active = true
```

### "I need the MMB location shorthand"
```sql
SELECT la.artifact_type, la.swarmui_prompt_fragment
FROM location_artifacts la
JOIN location_arcs loc ON la.location_arc_id = loc.id
WHERE loc.name = 'Mobile Medical Base'
  AND la.always_present = true
```

### "I need Cat's trigger word"
```sql
SELECT lora_trigger FROM characters WHERE name ILIKE '%cat%mitchell%'
```

### "I need segment syntax for dual characters"
```sql
SELECT c.name, gf.segment_syntax
FROM gear_fragments gf
JOIN characters c ON gf.character_id = c.id
WHERE gf.segment_syntax IS NOT NULL
  AND gf.is_active = true
```

---

## FILE LOCATIONS

### Models (Schema Definitions)
```
app/models/character.py
app/models/gear_fragment.py
app/models/character_location_context.py
app/models/location_arc.py
app/models/location_artifact.py
app/models/roadmap.py (RoadmapScene)
```

### Services (Business Logic)
```
app/services/swarmui_prompt_generator.py - Main prompt generation
app/services/character_appearance_service.py - Character lookup
app/services/gear_fragment_service.py - Fragment assembly
```

### Reference Documents
```
CatandDaniel/workflow/Gemini Format Roadmap/
  - Season 1.json, 2.json, 3.json (roadmap data)
  - Gemini Story Bible.txt (story context)
```

---

---

## CONTINUITY STATE DATA

### Scene Entry/Exit States
```
Table: roadmap_scenes
Fields:
  - entry_state (TEXT) - Scene's starting narrative state
  - exit_state (TEXT) - Scene's ending narrative state
  - character_state_updates (JSONB) - Character emotional/relationship changes
  - context_tags (ARRAY) - Searchable narrative tags

Table: scenes (generated content)
Fields:
  - entry_state
  - exit_state
  - character_state_updates
  - context_tags
```

### Episode State Snapshots
```
Table: episode_state_snapshots (if exists)
OR derived from Living Story State service

Fields to extract:
  - visual_vibe - 1-sentence aesthetic summary
  - character_states - Physical/emotional/location per character
  - active_threads - Unresolved tensions
  - time_of_day - For lighting
```

### Arc Phase Data
```
Table: plot_arcs
Fields:
  - activation_episode
  - peak_episode
  - resolution_episode
  - status (DORMANT, RISING, CLIMAX, FALLING, RESOLVED)

Service: ArcPhaseCalculator
  - get_arc_phases_for_episode(story_id, episode)
  - Returns: {arc_id: {phase, progress, priority}}
```

### Living Story State (Dynamic)
```
API: GET /api/v1/stories/{story_id}/living-state?target_episode=N

Returns:
  - series_anchors (fixed)
  - current_state (dynamic)
    - active_arcs with phase info
    - character_knowledge
    - relationship_states
    - unresolved_cliffhangers
  - next_episode_guidance (computed)
```

---

## CHANGELOG

| Date | Addition |
|------|----------|
| 2026-01-30 | Added Intensity & Pacing Data section (YouTube 8-4-4-3 format, ad break paradigm, scene roles, intensity arcs) |
| 2026-01-30 | Added Continuity State Data section (entry/exit states, arc phases, living story state) |
| 2026-01-30 | Added Beat Input Data section (Redis/StoryArt source for director fields) |
| 2026-01-30 | Initial mapping from model analysis |
