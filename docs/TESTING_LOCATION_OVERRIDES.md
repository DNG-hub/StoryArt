# Testing Location Override Extraction and Usage

This document explains how to test and verify that location overrides are being correctly extracted from the database and used in prompt generation.

## Test Script

A comprehensive test script has been created: `test-location-overrides.js`

### Running the Test

```bash
node test-location-overrides.js [storyId] [episodeNumber]
```

**Default values:**
- `storyId`: Uses `VITE_CAT_DANIEL_STORY_ID` from `.env` or defaults to `59f64b1e-726a-439d-a6bc-0dfefcababdb`
- `episodeNumber`: Defaults to `1`

**Example:**
```bash
node test-location-overrides.js 59f64b1e-726a-439d-a6bc-0dfefcababdb 1
```

### What the Test Script Does

1. **Authenticates** with the StoryTeller API
2. **Requests episode context** from `/api/v1/scene-context/extract-episode-context`
3. **Analyzes the response structure**:
   - Episode-level information
   - Scene-by-scene breakdown
   - Character data sources (both `scene.characters[]` and `scene.character_appearances[]`)
   - Location override detection
4. **Reports statistics**:
   - Total scenes
   - Scenes with overrides
   - Total character overrides found
5. **Saves full response** to a JSON file for detailed inspection

### Expected Output

#### ✅ Success Case (Overrides Present)

```
================================================================================
RESPONSE STRUCTURE ANALYSIS
================================================================================

📋 EPISODE INFO:
  Episode Number: 1
  Episode Title: The Signal
  Scene Count: 4
  Character Count (top-level): 2

================================================================================
SCENE-BY-SCENE ANALYSIS
================================================================================

🎬 SCENE 1: Ground Zero
   Location: NHIA Facility 7
   Location ID: 6fb2e29b-5b6e-4a91-990b-b6ce489afdea

   Character Data Sources:
     - scene.characters[]: 1 entries
     - scene.character_appearances[]: 0 entries

   📝 Characters in scene.characters[]:
      1. Catherine "Cat" Mitchell
         ✅ HAS location_context
            Location: NHIA Facility 7
            Physical: ✅
            Clothing: ✅
            Demeanor: ✅
            ✅ HAS swarmui_prompt_override
            Override Preview: "Catherine 'Cat' Mitchell as field investigator, 32, dark brown tactical bun..."

================================================================================
SUMMARY & RECOMMENDATIONS
================================================================================

📊 Statistics:
   Total Scenes: 4
   Scenes with Overrides: 4
   Total Character Overrides Found: 6

✅ All scenes have location overrides - extraction looks correct!
```

#### ⚠️ Warning Case (Missing Overrides)

```
⚠️  WARNING: No location overrides found in any scene!
   This suggests the backend is not properly extracting
   character_location_contexts.swarmui_prompt_override from the database.

   Check:
   1. Backend is querying character_location_contexts table
   2. Matching by location_arc_id (not location name)
   3. Including swarmui_prompt_override in response
```

## Frontend Console Logging

The frontend now includes enhanced logging to help debug override usage:

### 1. Context Fetching (`contextService.ts`)

When you click "Fetch Context" button, the browser console will show:

```
📋 StoryTeller API Response Structure: { ... }

🔍 LOCATION OVERRIDE ANALYSIS:
   ✅ Scene 1: Catherine "Cat" Mitchell has override
      "Catherine 'Cat' Mitchell as field investigator, 32, dark brown tactical..."
   ✅ Scene 1: Daniel O'Brien has override
      "Daniel O'Brien in full tactical mode, 35, 6'2", stark white..."
   ⚠️  Scene 2: 1 character(s) but NO overrides found
```

### 2. Prompt Generation (`promptGenerationService.ts`)

When generating prompts, the console will show:

```
🔍 PROMPT GENERATION: Analyzing location overrides in episode context...
   ✅ Scene 1: Catherine "Cat" Mitchell
      Override will be used: "Catherine 'Cat' Mitchell as field investigator, 32, dark brown tactical..."
   ✅ Scene 1: Daniel O'Brien
      Override will be used: "Daniel O'Brien in full tactical mode, 35, 6'2", stark white..."

🔍 PROMPT GENERATION: Checking for location overrides before LORA substitution...
   Scene 1: 2 character(s) with overrides available
   Scene 2: 1 character(s) with overrides available
```

## What to Look For

### In the Test Script Output

1. **Scene Structure**: Each scene should show:
   - Location name and ID
   - Character data in either `scene.characters[]` or `scene.character_appearances[]`

2. **Override Detection**: Each character should show:
   - ✅ `HAS location_context`
   - ✅ `HAS swarmui_prompt_override`
   - Preview of the override text

3. **Statistics**: Should show:
   - All scenes have overrides
   - Total overrides matches expected count (8 active records in database)

### In Browser Console (Context Fetch)

1. **Response Structure**: Should show:
   - Scene count matches expected
   - Characters found in scenes

2. **Override Analysis**: Should show:
   - ✅ for each character with an override
   - ⚠️ warning for characters without overrides

### In Browser Console (Prompt Generation)

1. **Override Detection**: Should log:
   - Which scenes have overrides
   - Character names with overrides
   - Preview of override text

2. **Override Usage**: The AI should be instructed to use these overrides (see system instructions in `promptGenerationService.ts`)

## Expected Data Flow

```
Database (storyteller-dev)
  ↓
Backend API (/api/v1/scene-context/extract-episode-context)
  ↓ Query with location_arc_id matching
  ↓
Frontend (contextService.ts)
  ↓ Logs structure and overrides
  ↓
Episode Context JSON
  ↓ Stored in state
  ↓
Prompt Generation (promptGenerationService.ts)
  ↓ Parses context, detects overrides
  ↓
AI System Instructions
  ↓ Tells AI to use swarmui_prompt_override
  ↓
Generated Prompts
  ↓ Should contain override text (not base_trigger)
```

## Troubleshooting

### Issue: No Overrides in Test Script Output

**Possible Causes:**
1. Backend not querying `character_location_contexts` table
2. Backend matching by location name instead of `location_arc_id`
3. Backend not including `swarmui_prompt_override` in response
4. Database connection issues

**Check:**
- Backend logs for SQL queries
- Database connection string (should be `storyteller-dev`)
- Query structure matches expected format

### Issue: Overrides Present but Not Used in Prompts

**Possible Causes:**
1. AI not finding override in expected location
2. System instructions not clear enough
3. Override path incorrect (characters nested differently)

**Check:**
- Browser console for "Override will be used" messages
- Generated prompt text (should contain override, not base_trigger)
- System instruction format matches actual data structure

### Issue: Wrong Overrides Being Used

**Possible Causes:**
1. Location matching logic incorrect
2. Multiple contexts for same character/location
3. Wrong scene-to-location mapping

**Check:**
- Test script output shows correct location IDs
- Scene location matches character context location
- Database has correct `location_arc_id` relationships

## Next Steps After Testing

1. **If Overrides Are Missing**: Fix backend extraction logic
2. **If Overrides Present but Wrong**: Fix location matching logic
3. **If Overrides Present but Not Used**: Verify system instructions and data structure match

## Related Files

- **Test Script**: `test-location-overrides.js`
- **Context Service**: `services/contextService.ts` (enhanced logging)
- **Prompt Generation**: `services/promptGenerationService.ts` (enhanced logging)
- **Documentation**: `docs/LOCATION_OVERRIDE_EXTRACTION_ISSUE.md`

