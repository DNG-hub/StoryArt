# Refactor: Narrative Field Removal & Hierarchical Prompts Default

## Date: Current Session

## Overview
Two major refactoring changes were implemented to streamline the codebase and simplify the user interface:
1. Removed redundant "narrative" field - now using `scriptText` exclusively
2. Made hierarchical prompts the default (removed feature flag checkbox)

---

## Change 1: Narrative Field Consolidation

### Problem
The application maintained two separate input fields for similar content:
- **"Script"** textarea - contained the episode script/narrative
- **"Narrative"** textarea - contained the same content (redundant)

Both fields were being saved to Redis and could become out of sync, causing confusion and maintenance overhead.

### Solution
Removed the separate `narrative` field and consolidated everything to use `scriptText` exclusively.

### Files Modified

#### `App.tsx`
- **Removed** `narrative` state: `const [narrative, setNarrative] = useState<string>('')`
- **Removed** `narrative` and `setNarrative` props from Dashboard component
- **Updated** Redis session save to exclude `narrative` field:
  ```typescript
  await saveSessionToRedis({
    scriptText,
    episodeContext,
    storyUuid,
    analyzedEpisode: processedResult,
  });
  ```
- **Updated** Redis session restore to not restore `narrative` field
- **Updated** auto-restore on mount to exclude `narrative`

#### `components/InputPanel.tsx`
- **Removed** "Narrative" textarea from UI
- **Removed** `narrative` and `setNarrative` props from InputPanel component
- **Removed** narrative-related props from StyleConfigPanel

#### `constants.ts`
- `DEFAULT_SCRIPT` now contains the narrative prose content (previously `DEFAULT_NARRATIVE`)
- Format includes `EPISODE: 1`, `TITLE: The Signal`, and `SCENE X` markers for proper parsing
- Compatible with `parseEpisodeNumber()` utility function

### Impact
- ✅ Single source of truth for episode script/narrative content
- ✅ Simplified UI (one less input field)
- ✅ Reduced state management complexity
- ✅ No breaking changes - `scriptText` was already the primary field

---

## Change 2: Hierarchical Prompts as Default

### Problem
Hierarchical prompts were behind a feature flag checkbox ("Enable Hierarchical Prompts") that defaulted to `false`. This created unnecessary friction:
- Users had to manually enable the feature
- The checkbox added UI complexity
- Hierarchical prompts are now the proven, preferred approach

### Solution
Made hierarchical prompts the default and only option by:
1. Removing the feature flag state
2. Always calling `generateHierarchicalSwarmUiPrompts()`
3. Removing the checkbox from the UI

### Files Modified

#### `App.tsx`
- **Removed** `useHierarchicalPrompts` state: `const [useHierarchicalPrompts, setUseHierarchicalPrompts] = useState<boolean>(false)`
- **Removed** `useHierarchicalPrompts` and `setUseHierarchicalPrompts` props from Dashboard component
- **Updated** prompt generation to always use hierarchical:
  ```typescript
  // Always use hierarchical prompt generation (default and only option)
  const promptsResult = await generateHierarchicalSwarmUiPrompts(
    processedResult, 
    episodeContext, 
    styleConfig, 
    retrievalMode, 
    storyUuid
  );
  ```
- **Removed** import of `generateSwarmUiPrompts` (still exists internally for fallback)
- **Changed** to only import `generateHierarchicalSwarmUiPrompts`

#### `components/InputPanel.tsx`
- **Removed** "Enable Hierarchical Prompts" checkbox from `StyleConfigPanel`
- **Removed** `useHierarchicalPrompts` and `onUseHierarchicalPromptsChange` props from:
  - `StyleConfigPanel` component
  - `InputPanel` component props

### Impact
- ✅ Simplified UI (one less checkbox)
- ✅ Reduced state management complexity
- ✅ Users always get the best prompt generation experience
- ✅ No breaking changes - hierarchical prompts fall back gracefully when data is unavailable

---

## Technical Notes

### Script Format Validation
The `DEFAULT_SCRIPT` format was validated to ensure compatibility:
- Starts with `EPISODE: 1` header (parsed by `parseEpisodeNumber()`)
- Includes `TITLE: The Signal`
- Uses standardized `SCENE X` markers
- Contains narrative prose (not screenplay format)
- Compatible with `analyzeScript()` function

### Backward Compatibility
- Old Redis sessions with `narrative` field will still restore (field is simply ignored)
- Hierarchical prompts have graceful fallback when hierarchical location data is unavailable
- Non-hierarchical `generateSwarmUiPrompts()` still exists internally for fallback scenarios

---

## Testing Recommendations

1. **Script Persistence:**
   - Verify script text persists after browser refresh
   - Verify Redis session restore works correctly
   - Verify auto-restore on page load works

2. **Hierarchical Prompts:**
   - Verify prompts generate successfully
   - Verify fallback behavior when hierarchical data unavailable
   - Verify prompts include hierarchical context when available

3. **UI Simplification:**
   - Verify no console errors
   - Verify all inputs still function correctly
   - Verify style configuration panel is cleaner

---

## Related Files

### Modified Files:
- `App.tsx` - State management and prompt generation
- `components/InputPanel.tsx` - UI component removal
- `constants.ts` - DEFAULT_SCRIPT format update

### Unchanged but Relevant:
- `services/promptGenerationService.ts` - Contains both prompt generation functions
- `services/redisService.ts` - Session save/restore (handles missing fields gracefully)
- `utils.ts` - `parseEpisodeNumber()` utility (validated compatible)

---

## Migration Notes

**For Developers:**
- Any code referencing `narrative` state should now use `scriptText`
- Any code checking `useHierarchicalPrompts` should be removed (always true)
- Script format must include `EPISODE: X` header for proper parsing

**For Users:**
- No migration needed - changes are transparent
- Script content is now only in "Script" field
- Hierarchical prompts are always enabled (better results)

