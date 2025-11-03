# Location Override Extraction Issue - Investigation Report

## Problem Statement

When extracting context from the `storyteller-dev` database, the correct location overrides are not being used. The database contains 8 active records in `character_location_contexts` with proper `swarmui_prompt_override` values, but the extraction appears to be using incorrect overrides.

## Database Structure

### Character Location Contexts Table
- **Table**: `character_location_contexts`
- **Key Field**: `swarmui_prompt_override` (TEXT)
- **Foreign Keys**: 
  - `character_id` → `characters.id`
  - `location_arc_id` → `location_arcs.id`

### Active Records
- **8 active records** with detailed character visual descriptions
- Daniel O'Brien: 3 records (tactical mode, medical facility, safehouse)
- Cat Mitchell: 2 records (medical facility, safehouse)
- Lara: 1 record (basic template)

### Location Artifacts Table
- **Table**: `location_artifacts`
- **24 active records** with `swarmui_prompt_fragment`
- Medical facility artifacts
- Safehouse artifacts

## Root Cause Analysis

### Issue 1: String Matching Instead of ID Matching

The frontend code in `roadmapService.ts` (lines 145-148) filters character appearances by **location name string matching**:

```typescript
const characterAppearances = characterLocationData.filter(charLoc => 
  charLoc.location_name === roadmapScene.location_name ||
  charLoc.location_name === tacticalOverride
);
```

**Problem**: This approach is fragile because:
- Location names might have variations or typos
- Multiple locations could have similar names
- The database uses UUID relationships (`location_arc_id`), not name matching

**Correct Approach**: The backend API should match by `location_arc_id` UUID, not by name string.

### Issue 2: Backend API Query Logic

The actual extraction happens in the StoryTeller backend API at:
- **Endpoint**: `/api/v1/scene-context/extract-episode-context`
- **File**: `app/api/v1/endpoints/location_arcs.py` (mentioned by user)
- **Service**: `app/services/swarmui_prompt_generator.py` (mentioned by user)

The backend should be querying with this structure:

```sql
SELECT 
  clc.id,
  clc.character_id,
  c.name as character_name,
  clc.location_arc_id,
  la.id as location_arc_id,
  la.name as location_name,
  clc.temporal_context,
  clc.age_at_context,
  clc.physical_description,
  clc.clothing_description,
  clc.hair_description,
  clc.demeanor_description,
  clc.swarmui_prompt_override,
  clc.lora_weight_adjustment
FROM character_location_contexts clc
JOIN characters c ON clc.character_id = c.id
JOIN location_arcs la ON clc.location_arc_id = la.id
WHERE c.story_id = $1
ORDER BY clc.created_at;
```

Then, when building scene contexts, it should match by `location_arc_id`, not by name:

```python
# CORRECT: Match by location_arc_id
character_appearances = [
  ctx for ctx in character_location_contexts
  if ctx.location_arc_id == scene_location.location_arc_id
]

# INCORRECT: Matching by name (current issue)
character_appearances = [
  ctx for ctx in character_location_contexts
  if ctx.location_name == scene_location.name
]
```

## Expected Database Query Structure

### Correct Query for Scene Context

When extracting episode context for a specific scene, the backend should:

1. **Get the scene's location_arc_id** from the roadmap or scene data
2. **Match character contexts by location_arc_id**:
   ```sql
   SELECT clc.*
   FROM character_location_contexts clc
   WHERE clc.location_arc_id = $1  -- Scene's location_arc_id
     AND clc.character_id IN (
       SELECT id FROM characters WHERE story_id = $2
     )
   ```

3. **Include all required fields**:
   - `swarmui_prompt_override` (CRITICAL - must be included)
   - `physical_description`
   - `clothing_description`
   - `hair_description`
   - `demeanor_description`
   - `lora_weight_adjustment`

## Database Connection

- **Database Name**: `storyteller-dev`
- **Connection**: Should use `DATABASE_URL` environment variable
- **Expected Format**: `postgresql+asyncpg://username:password@host:port/storyteller_dev`

## Verification Steps

To verify the correct data is being extracted:

1. **Check Backend Query**: Verify the backend is using `location_arc_id` matching, not name matching
2. **Verify Database Connection**: Ensure backend connects to `storyteller-dev` database
3. **Check Response Structure**: Verify the API response includes:
   ```json
   {
     "episode": {
       "scenes": [
         {
           "scene_number": 1,
           "characters": [
             {
               "name": "Catherine 'Cat' Mitchell",
               "location_context": {
                 "swarmui_prompt_override": "Catherine 'Cat' Mitchell as field investigator..."
               }
             }
           ]
         }
       ]
     }
   }
   ```

## Frontend Code Impact

The frontend code in this repository:
- **`contextService.ts`**: Calls the backend API (correct - no changes needed)
- **`databaseContextService.ts`**: Uses simulated data (not used in production)
- **`roadmapService.ts`**: Has location matching logic (only used if backend unavailable)

**Note**: The frontend expects the backend API to return the correct structure. The issue is in the backend extraction logic, not the frontend.

## Recommended Fix

### Backend API Fix (Required)

Update `app/api/v1/endpoints/location_arcs.py` or `app/services/swarmui_prompt_generator.py` to:

1. **Use location_arc_id for matching**:
   ```python
   # Get location_arc_id for the scene
   scene_location = get_scene_location(scene_number)
   location_arc_id = scene_location.location_arc_id
   
   # Match character contexts by location_arc_id
   character_contexts = db.query(
     CharacterLocationContext
   ).join(
     Character
   ).filter(
     CharacterLocationContext.location_arc_id == location_arc_id,
     Character.story_id == story_id
   ).all()
   ```

2. **Ensure swarmui_prompt_override is included**:
   ```python
   for ctx in character_contexts:
     character_appearance = {
       "character_name": ctx.character.name,
       "location_context": {
         "swarmui_prompt_override": ctx.swarmui_prompt_override,  # MUST include
         "physical_description": ctx.physical_description,
         "clothing_description": ctx.clothing_description,
         "demeanor_description": ctx.demeanor_description,
         "lora_weight_adjustment": ctx.lora_weight_adjustment
       }
     }
   ```

3. **Verify database connection**: Ensure using `storyteller-dev` database:
   ```python
   # Check database connection
   db_config = {
     "database": "storyteller_dev",  # Not "storyteller" or other name
     # ... other config
   }
   ```

## Testing

After fixing the backend:

1. **Test API Response**: Call `/api/v1/scene-context/extract-episode-context` and verify:
   - Character contexts are matched correctly
   - `swarmui_prompt_override` values are present and correct
   - Overrides match the location_arc_id for each scene

2. **Verify in Frontend**: 
   - Fetch context using "Fetch Context" button
   - Check browser console for structure logs
   - Verify character contexts appear in scenes with correct overrides

## Related Files

- **Backend API**: `app/api/v1/endpoints/location_arcs.py`
- **Backend Service**: `app/services/swarmui_prompt_generator.py`
- **Frontend Context Service**: `services/contextService.ts`
- **Database Schema**: `story_configuration_db_schema.json`

