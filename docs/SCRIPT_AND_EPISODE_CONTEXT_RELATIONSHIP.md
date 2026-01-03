# Script Text and Episode Context JSON Relationship

## Overview

When using **Database Mode** in StoryArt, there is a specific relationship between:
1. **Script Text** (narrative in the textarea)
2. **Episode Context JSON** (fetched from the database)

---

## The Relationship

### 1. **Script Text → Episode Number Extraction**

The script text is analyzed to extract the **episode number**:

```typescript
// From App.tsx, line 413
const episodeNumber = parseEpisodeNumber(scriptText);
```

**How it works:**
- The script must start with `EPISODE: X` (e.g., `EPISODE: 1`)
- The `parseEpisodeNumber()` function extracts this number
- This episode number is used to fetch the corresponding context from the database

**Example:**
```
EPISODE: 1
TITLE: The Signal

SCENE 1
INT. NHIA FACILITY 7 - DAY
...
```
→ Extracts: `episodeNumber = 1`

---

### 2. **Episode Number + Story UUID → Database Query**

Once the episode number is extracted, it's combined with the **Story UUID** to fetch episode context:

```typescript
// From App.tsx, line 418
const contextData = await getEpisodeContext(storyUuid, episodeNumber);
```

**API Call:**
- **Endpoint**: `POST /api/v1/scene-context/extract-episode-context`
- **Parameters**:
  - `story_id`: The Story UUID (e.g., `59f64b1e-...`)
  - `episode_number`: The extracted episode number (e.g., `1`)

---

### 3. **What the Episode Context JSON Contains**

The episode context JSON provides **visual and contextual metadata** that supplements the narrative:

#### **Story-Level Context:**
- `story_context`: Overall story background
- `narrative_tone`: The tone of the story
- `core_themes`: Main themes

#### **Character Data:**
- `character_name`: Character names
- `aliases`: Alternative names
- `base_trigger`: LORA trigger words (e.g., `"JRUMLV woman"`)
- `visual_description`: How characters look
- `location_context`: Character appearance in specific locations

#### **Location Data:**
- `location.name`: Location name
- `location.visual_description`: How the location looks
- `location.atmosphere`: Mood/atmosphere
- `location.artifacts`: Visual elements and props
  - `artifact_name`: Name of the artifact
  - `prompt_fragment`: Text to include in image prompts
  - `artifact_type`: Type (PROP, STRUCTURAL, LIGHTING, etc.)

#### **Scene Data:**
- `scene_number`: Scene number
- `scene_title`: Scene title
- `scene_summary`: Scene summary
- `location`: Location details for the scene
- `character_appearances`: Characters in the scene

---

### 4. **How They Work Together**

#### **Script Text (Narrative):**
- **Purpose**: Contains the **"what happens"** - the actual story narrative
- **Content**: Dialogue, action lines, scene descriptions, character actions
- **Example**: 
  ```
  Cat moved with a practiced economy, her boots crunching on pulverized concrete.
  ```

#### **Episode Context JSON (Metadata):**
- **Purpose**: Contains the **"how it looks"** - visual and contextual information
- **Content**: Character appearances, location visuals, artifacts, atmosphere
- **Example**:
  ```json
  {
    "character_name": "Catherine \"Cat\" Mitchell",
    "visual_description": "A woman in her early 30s with an athletic build...",
    "base_trigger": "JRUMLV woman"
  }
  ```

---

## The Analysis Process

When you click **"Generate with 4 locations"** (or "Analyze Script"):

1. **Script Analysis**:
   - The AI reads the script text to understand the narrative
   - It segments the script into beats
   - It identifies scenes, characters, actions, dialogue

2. **Context Integration**:
   - The AI uses the episode context JSON to understand:
     - **Who** the characters are (from character data)
     - **What** they look like (from visual descriptions)
     - **Where** scenes take place (from location data)
     - **What** visual elements are present (from artifacts)

3. **Beat Generation**:
   - Each beat is created with:
     - Narrative content from the **script text**
     - Visual context from the **episode context JSON**
     - Location attributes from the **episode context JSON**
     - Character descriptions from the **episode context JSON**

4. **Prompt Generation**:
   - Prompts are generated using:
     - Beat narrative (from script)
     - Character visual descriptions (from context)
     - Location visual descriptions (from context)
     - Artifact prompt fragments (from context)
     - LORA triggers (from context)

---

## Key Points

### **Script Text is the Source of Truth for:**
- ✅ What happens in the story
- ✅ Dialogue
- ✅ Action sequences
- ✅ Narrative flow
- ✅ Scene structure

### **Episode Context JSON is the Source of Truth for:**
- ✅ Character appearances
- ✅ Location visuals
- ✅ Visual artifacts and props
- ✅ Atmosphere and mood
- ✅ LORA trigger words
- ✅ Story themes and tone

### **They Work Together:**
- The script tells the AI **what** is happening
- The context tells the AI **how** it should look
- Together, they enable accurate visual prompt generation

---

## Example Flow

1. **User pastes script:**
   ```
   EPISODE: 1
   TITLE: The Signal
   
   SCENE 1
   INT. NHIA FACILITY 7 - DAY
   
   Cat moved through the debris...
   ```

2. **System extracts:**
   - Episode number: `1`
   - Story UUID: `59f64b1e-...` (from input field)

3. **System fetches context:**
   - Calls API with `story_id` and `episode_number`
   - Receives episode context JSON with:
     - Character: Cat Mitchell (visual description, LORA trigger)
     - Location: NHIA Facility 7 (visual description, artifacts)
     - Scene data for Scene 1

4. **AI Analysis:**
   - Reads script: "Cat moved through the debris"
   - Uses context: Cat is "JRUMLV woman", 30s, athletic build, tactical gear
   - Uses context: Location has "pulverized concrete debris" artifact
   - Generates beat with both narrative and visual context

5. **Prompt Generation:**
   - Combines beat narrative with character visuals and location artifacts
   - Creates prompt: `"JRUMLV woman, 32, dark brown tactical bun, green eyes, wearing tactical field gear, moving through pulverized concrete debris, scattered construction materials, flickering emergency lights..."`

---

## Database Mode vs. Manual Mode

### **Database Mode:**
- ✅ Automatically fetches episode context from StoryTeller database
- ✅ Uses Story UUID and episode number to query
- ✅ Provides rich, structured visual data
- ✅ Updates automatically when database changes

### **Manual Mode:**
- ✅ User manually pastes episode context JSON
- ✅ Can use default/fallback context
- ✅ Useful when database is unavailable
- ✅ Allows custom context for testing

---

## Summary

**The script text and episode context JSON are complementary:**

- **Script Text** = The narrative story (what happens)
- **Episode Context JSON** = The visual metadata (how it looks)

The script provides the **story structure and narrative content**, while the episode context provides the **visual and contextual information** needed to generate accurate image prompts. Together, they enable StoryArt to create visually consistent, story-accurate image generation prompts.



