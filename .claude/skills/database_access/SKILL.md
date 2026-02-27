---
name: Database Access Skill
description: Access and query the StoryTeller development database (PostgreSQL) and StoryArt session cache (Redis)
---

# StoryTeller Database Access Skill

This skill provides unified access to:
- **PostgreSQL** (`storyteller_dev`): Story metadata, characters, scenes, image review records
- **Redis** (port 6382): StoryArt session data, beats, image generation batches

## 1. PostgreSQL Access

### Option A: Python Helper Script (Recommended)
Use the included script to run queries immediately. It handles authentication for you.

```bash
# General Syntax
python .claude/skills/database_access/scripts/quick_query.py "YOUR SQL QUERY"

# Example: Get all Project Names
python .claude/skills/database_access/scripts/quick_query.py "SELECT title FROM stories"
```

### Option B: Connection Credentials (Manual)
If you need to configure an external tool (like DBeaver or PGAdmin):

| Parameter | Value |
|-----------|-------|
| **Host** | `localhost` |
| **Port** | `5439` (Docker mapped port) |
| **Database** | `storyteller_dev` |
| **User** | `storyteller_user` |
| **Password** | `StoryTeller2024Dev!` |
| **URL** | `postgresql://storyteller_user:StoryTeller2024Dev!@localhost:5439/storyteller_dev` |

### Option C: MCP Tool (If Configured)
If your environment has the `postgres-storyteller` MCP server active (see `cursor-mcp-config.json`), you can ask the agent:
> "Use the database MCP to select the top 5 scenes."

## 2. Redis Access (StoryArt Sessions)

StoryArt uses Redis to cache generation session data including beats, prompts, and image batches.

### Redis Query Script

```bash
# List all StoryArt sessions
python .claude/skills/database_access/scripts/redis_query.py sessions

# Get session details
python .claude/skills/database_access/scripts/redis_query.py session 1769321342004

# Get beats for a session
python .claude/skills/database_access/scripts/redis_query.py beats 1769321342004

# Get image batches
python .claude/skills/database_access/scripts/redis_query.py images 1769321342004

# Search any Redis key
python .claude/skills/database_access/scripts/redis_query.py key 'storyart:*'
```

### Redis Connection Credentials

| Parameter | Value |
|-----------|-------|
| **Host** | `localhost` |
| **Port** | `6382` |
| **DB** | `0` |

### Redis Key Structure

StoryArt session data follows this pattern:
```
storyart:session:{session_id}:metadata    # Hash: episode, story info
storyart:session:{session_id}:beats       # List: beat data with prompts
storyart:session:{session_id}:image_batches  # List: generated images
```

## 3. Image Review System

The image review workflow spans both databases. Use the dedicated helper script for common operations.

### Image Review Query Script

```bash
# List all review sessions with export status
python .claude/skills/database_access/scripts/image_review_query.py sessions

# Get detailed session info (beats per scene, export status)
python .claude/skills/database_access/scripts/image_review_query.py session <session_id>

# Find the latest session for an episode
python .claude/skills/database_access/scripts/image_review_query.py episode 2

# IMPORTANT: Verify session matches current DB content
# Checks if scenes were updated after session was created
python .claude/skills/database_access/scripts/image_review_query.py verify <session_id>

# Get beats and image counts for a session
python .claude/skills/database_access/scripts/image_review_query.py beats <session_id>

# Check DaVinci export status
python .claude/skills/database_access/scripts/image_review_query.py exported <session_id>

# Get scene content from database
python .claude/skills/database_access/scripts/image_review_query.py scene 2 1
```

### Common Issue: Stale Session Data

**Problem:** Image review session has old narrative text because scenes were updated after session was created.

**Detection:**
```bash
python .claude/skills/database_access/scripts/image_review_query.py verify <session_id>
```

**Resolution Options:**
1. Delete session and recreate from current Redis data
2. Use session as-is if image prompts are still valid

### PostgreSQL Tables

**`image_review_sessions`**: Review session records
- `id`: Session UUID
- `episode_number`: Episode number
- `story_id`: Story UUID
- `total_images`: Count of images
- `created_at`: When created

**`image_review_items`**: Individual image records
- `id`: Item UUID
- `session_id`: Parent session
- `beat_id`: Beat identifier (e.g., "s1-b1")
- `scene_number`: Scene number
- `image_path`: Current file path (updated on DaVinci export)
- `original_prompt`: Generation prompt

### Raw SQL Queries (if needed)

```bash
# List all image review sessions
python .claude/skills/database_access/scripts/quick_query.py "
SELECT id, episode_number, story_name, total_images, created_at
FROM image_review_sessions
ORDER BY created_at DESC"

# Get image counts by scene for a session
python .claude/skills/database_access/scripts/quick_query.py "
SELECT scene_number, COUNT(*) as image_count
FROM image_review_items
WHERE session_id = 'your-session-uuid'
GROUP BY scene_number
ORDER BY scene_number"

# Find images for a specific beat
python .claude/skills/database_access/scripts/quick_query.py "
SELECT beat_id, image_path
FROM image_review_items
WHERE session_id = 'your-session-uuid' AND beat_id = 's1-b1'"

# Check if images have been exported to DaVinci
python .claude/skills/database_access/scripts/quick_query.py "
SELECT beat_id, image_path
FROM image_review_items
WHERE image_path LIKE '%DaVinci_Projects%'
LIMIT 10"
```

## 4. Story Query Tool (General Purpose)

The `story_query.py` script provides comprehensive access to narratives, roadmaps, characters, and locations.

### Stories
```bash
python .claude/skills/database_access/scripts/story_query.py stories              # List all stories
python .claude/skills/database_access/scripts/story_query.py story <story_id>     # Get story details
```

### Narratives (Generated Scenes)
```bash
python .claude/skills/database_access/scripts/story_query.py scenes <episode>     # List scenes for episode
python .claude/skills/database_access/scripts/story_query.py scene <ep> <scene>   # Get full scene content
python .claude/skills/database_access/scripts/story_query.py narrative <episode>  # Get full episode narrative
```

### Roadmaps (Generation Plans - StoryTeller -> StoryArt Knowledge Transfer)
```bash
python .claude/skills/database_access/scripts/story_query.py roadmaps             # List all roadmaps
python .claude/skills/database_access/scripts/story_query.py roadmap <episode>    # Get episode roadmap
python .claude/skills/database_access/scripts/story_query.py beats <ep> <scene>   # Get scene roadmap details
```

### Characters
```bash
python .claude/skills/database_access/scripts/story_query.py characters           # List all characters
python .claude/skills/database_access/scripts/story_query.py character <name>     # Get character details
python .claude/skills/database_access/scripts/story_query.py appearance <name>    # Get appearance contexts
```

The `appearance` command shows:
- Base description
- Physical descriptions by temporal context
- Clothing descriptions
- Hair descriptions
- SwarmUI prompt overrides (used for image generation)

### Locations
```bash
python .claude/skills/database_access/scripts/story_query.py locations            # List all locations
python .claude/skills/database_access/scripts/story_query.py location <name>      # Get location details
```

### Examples
```bash
# Get Episode 2 scene content
python .claude/skills/database_access/scripts/story_query.py scene 2 1

# Get Cat's appearance contexts for image generation
python .claude/skills/database_access/scripts/story_query.py appearance Cat

# Get roadmap details for a scene (entry/exit state, gear context)
python .claude/skills/database_access/scripts/story_query.py beats 2 2

# Get full episode narrative text
python .claude/skills/database_access/scripts/story_query.py narrative 2
```

## 5. Database Schema Overview

### Core Tables
*   **`stories`**: The root object. Contains `title`, `description`, `current_episode_number`.
*   **`users`**: System users. Linked to stories via `user_id`.

### Narrative Structure
*   **`characters`**: Character profiles (`name`, `role`, `description`).
*   **`plot_arcs`**: High-level narrative arcs (`title`, `status`, `resolution_status`).
*   **`locations`**: Settings and environments.
*   **`scenes`**: The generated narrative content.
    *   `episode_number`, `scene_number`
    *   `title`, `content` (the text), `status`.

### Roadmap System (The Brain)
These tables drive the AI generation workflow:
*   **`roadmaps`**: Master plan for a story season.
*   **`roadmap_episodes`**: High-level episode plans (`mood`, `theme`).
*   **`roadmap_scenes`**: Detailed scene beats. PRE-GENERATION instructions.
    *   `key_revelations`, `plot_beat`, `characters_present`.

### Content Hub (The Output)
*   **`content_hub_submissions`**: Completed scenes submitted for production.
*   **`content_hub_logs`**: Audit trail of generation/submission events.

### Image Review (StoryArt Integration)
*   **`image_review_sessions`**: Review session metadata.
*   **`image_review_items`**: Individual images with paths and prompts.

## 6. Common Queries

**Check Generation Progress:**
```sql
SELECT episode_number, scene_number, status
FROM roadmap_scenes
WHERE is_active = true
ORDER BY episode_number, scene_number;
```

**Find Scenes with Specific Characters:**
```sql
SELECT title, episode_number
FROM scenes
WHERE 'Cat' = ANY(characters);
```

**View Most Recent Roadmap:**
```sql
SELECT id, season_number, total_episodes, created_at
FROM roadmaps
ORDER BY created_at DESC LIMIT 1;
```

**Get Scene Content for Episode:**
```sql
SELECT scene_number, title, LEFT(content, 200) as preview
FROM scenes
WHERE story_id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'
  AND episode_number = 2
ORDER BY scene_number;
```

## 7. Workflow Integration

### StoryArt -> PostgreSQL -> DaVinci Flow

1. **Generate Images (StoryArt)**
   - Creates Redis session with beats and prompts
   - Images stored in SwarmUI output folder

2. **Create Review Session**
   - Copies Redis data to PostgreSQL `image_review_sessions/items`
   - Tracks image paths and prompts

3. **Export to DaVinci**
   - Moves images to organized DaVinci folders
   - Updates `image_path` in PostgreSQL
   - Generates `beat_images.json` for DaVinci import

### Find Matching Data Across Systems

```bash
# 1. Find Redis session for Episode 2
python .claude/skills/database_access/scripts/redis_query.py sessions

# 2. Check if PostgreSQL session exists
python .claude/skills/database_access/scripts/quick_query.py "
SELECT id, total_images FROM image_review_sessions WHERE episode_number = 2"

# 3. Verify beat data matches
python .claude/skills/database_access/scripts/redis_query.py beats <redis_session_id>
```
