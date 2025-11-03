# Fix: Database Context Counting Logic

## Date: Current Session

## Overview
Fixed incorrect counting logic for "Character Contexts" and "Tactical Overrides" in the database context quality indicator. The parsing logic was expecting a different data structure than what the database API actually returns.

---

## Problem Statement

### Symptoms
When using database mode to gather episode context, the UI displayed incorrect counts:
- **Character Contexts: 0** (should have shown 2)
- **Tactical Overrides: 0** (should have shown 2)

### Root Cause Analysis

The counting logic in `components/InputPanel.tsx` had two structural mismatches:

#### Issue 1: Character Contexts Location
**Expected Structure (Incorrect):**
```typescript
context.episode?.characters[] // Top-level array
char.location_contexts[]      // Plural, array
```

**Actual Database Structure:**
```json
{
  "episode": {
    "scenes": [
      {
        "characters": [
          {
            "location_context": { ... }  // Singular, object
          }
        ]
      }
    ]
  }
}
```

#### Issue 2: Tactical Overrides Location
**Expected Structure (Incorrect):**
```typescript
scene.location?.tactical_override_location  // Location-level boolean
```

**Actual Database Structure:**
```json
{
  "characters": [
    {
      "location_context": {
        "swarmui_prompt_override": "...",
        "lora_weight_adjustment": 1.3
      }
    }
  ]
}
```

Tactical override indicators are stored at the **character level** within `location_context`, not at the location level.

---

## Solution

### Files Modified

#### `components/InputPanel.tsx`

**Before:**
```typescript
const characterContexts = context.episode?.characters?.reduce((total: number, char: any) => 
  total + (char.location_contexts?.length || 0), 0) || 0;

const tacticalOverrides = context.episode?.scenes?.filter((scene: any) => 
  scene.location?.tactical_override_location).length || 0;
```

**After:**
```typescript
// Characters are nested in scenes, and location_context is a single object (not array)
const characterContexts = context.episode?.scenes?.reduce((total: number, scene: any) => 
  total + (scene.characters?.filter((char: any) => char.location_context).length || 0), 0) || 0;

// Tactical overrides: check if characters have swarmui_prompt_override or lora_weight_adjustment
// (these indicate location-specific tactical customization)
const tacticalOverrides = context.episode?.scenes?.reduce((total: number, scene: any) => {
  const charactersWithOverrides = scene.characters?.filter((char: any) => 
    char.location_context?.swarmui_prompt_override || 
    char.location_context?.lora_weight_adjustment
  ).length || 0;
  return total + charactersWithOverrides;
}, 0) || 0;
```

### Changes Summary

1. **Character Contexts Counting:**
   - Changed from top-level `episode.characters[]` to nested `episode.scenes[].characters[]`
   - Changed from checking `location_contexts.length` (array) to checking if `location_context` exists (object)
   - Now correctly counts characters with location context data across all scenes

2. **Tactical Overrides Counting:**
   - Changed from location-level `tactical_override_location` boolean
   - To character-level checks for `swarmui_prompt_override` or `lora_weight_adjustment`
   - These fields indicate location-specific tactical customization for characters

---

## Data Structure Reference

### Actual Database Structure

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
              "physical_description": "...",
              "clothing_description": "...",
              "swarmui_prompt_override": "...",
              "lora_weight_adjustment": 1.3
            }
          }
        ],
        "location": {
          "artifacts": [...]
        }
      }
    ]
  }
}
```

**Key Points:**
- Characters are **nested within scenes**, not at episode level
- `location_context` is a **singular object**, not a plural array
- Tactical overrides are indicated by character-level fields, not location-level

---

## Testing

### Test Case 1: Sample Data Provided
**Input:**
- 4 scenes
- Scene 1: 1 character with location_context
- Scene 2: 1 character with location_context  
- Scene 3: 0 characters
- Scene 4: 0 characters

**Expected Results:**
- Character Contexts: **2** ✓
- Tactical Overrides: **2** ✓ (both characters have swarmui_prompt_override and lora_weight_adjustment)

### Test Case 2: Edge Cases
- Scenes with no characters: Correctly counts 0
- Characters without location_context: Correctly excluded
- Characters with partial override data: Counted if either field exists

---

## Impact

### User Experience
- ✅ Database context quality indicator now shows accurate counts
- ✅ Users can correctly assess context richness
- ✅ Better visibility into character location-specific customizations

### Code Quality
- ✅ Parsing logic matches actual database structure
- ✅ More robust handling of nested data structures
- ✅ Clearer comments explaining the data structure

---

## Related Files

### Modified:
- `components/InputPanel.tsx` - Database context counting logic

### Related (Unchanged but Referenced):
- `services/databaseContextService.ts` - Generates the database structure
- `services/contextService.ts` - Fetches episode context from API
- `types.ts` - Type definitions for episode context structures

---

## Migration Notes

**For Developers:**
- When working with database episode context, always check the actual API response structure
- Character data is nested in `episode.scenes[].characters[]`, not `episode.characters[]`
- `location_context` is singular (object), not plural (array)
- Tactical overrides are character-level, not location-level

**For Users:**
- No migration needed - fix is transparent
- Counts will now be accurate when using database mode
- Quality indicator will correctly show "rich" context when appropriate

