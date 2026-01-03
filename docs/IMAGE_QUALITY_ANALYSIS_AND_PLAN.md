# Image Quality Analysis and Implementation Plan

**Date**: 2025-11-24  
**Status**: Analysis Complete - Implementation Plan Ready  
**Purpose**: Address image quality issues identified in production

---

## Executive Summary

Analysis of the codebase reveals **three critical gaps** preventing optimal image quality:

1. **Negative Prompts Not Being Sent to SwarmUI API** ❌
   - Negative prompts are defined in system instructions but never sent to the API
   - SwarmUI service calls don't include `negative_prompt` parameter

2. **Location-Specific Negative Prompts Not Implemented** ❌
   - Document exists (`LOCATION_SPECIFIC_NEGATIVE_PROMPT_ANOMALIES.md`) but no code implementation
   - NHIA Facility 7 anomalies (damaged areas, server rooms, records room) not handled

3. **Beat Narrative Lighting Extraction Service Exists But Not Used** ⚠️
   - `beatNarrativeProcessor.ts` service exists with proper logic
   - **NOT being called** in `promptGenerationService.ts` or `qwenPromptService.ts`
   - System instructions mention it, but code doesn't use it

---

## Detailed Analysis

### 1. Negative Prompts Missing from API Calls

#### Current State
- **System Instructions**: Both `promptGenerationService.ts` and `qwenPromptService.ts` include negative prompt in system instructions (line 327 and 127)
- **SwarmUI Service**: `swarmUIService.ts` does NOT send negative prompts to API
  - `generateImageInSwarmUI()` (line 500-555): No `negative_prompt` parameter
  - `generateContextEnhancedImage()` (line 563-626): No `negative_prompt` parameter
  - `generateImages()` (line 266-392): No `negative_prompt` parameter

#### Impact
- **High**: Negative prompts are critical for preventing artifacts, cartoon styles, and unwanted elements
- Images may contain: blurry faces, extra limbs, cartoon/anime styles, bright cheerful colors, fantasy elements

#### Standard Negative Prompt (from docs)
```
blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy, artificial appearance, oversaturated, childish style, background characters, faces hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive special effects
```

---

### 2. Location-Specific Negative Prompts Not Implemented

#### Current State
- **Documentation**: `LOCATION_SPECIFIC_NEGATIVE_PROMPT_ANOMALIES.md` fully describes the problem
- **Code**: No service exists to detect location context and apply conditional negative prompts
- **Problem**: NHIA Facility 7 has three distinct areas with conflicting requirements:
  1. **Damaged Areas**: Need negatives to prevent pristine appearance
  2. **Pristine Server Rooms**: Need different negatives (rooms ARE pristine, but shouldn't show debris)
  3. **Records Room**: Paper litter is INTENTIONAL, so paper/litter negatives must be EXCLUDED

#### Detection Keywords Needed
- **NHIA Facility 7**: "CDC archive", "CDC data center", "nhia facility", "facility 7"
- **Records Room**: "records room", "record room", "paper room", "filing room", "paper littering", "paper scattered"
- **Server Room**: "server room", "server rooms", "server racks", "data center", "data archive", "intact server", "blinking status lights"

#### Impact
- **High**: Location-specific visual requirements not met
- Server rooms may appear damaged when they should be pristine
- Records room may not show intentional paper litter
- Damaged areas may appear too pristine

---

### 3. Beat Narrative Lighting Extraction Not Used

#### Current State
- **Service Exists**: `services/beatNarrativeProcessor.ts` has complete implementation:
  - `extractLightingKeywords()` - Extracts lighting from beat narrative
  - `buildFaceLightingFromBeat()` - Builds face lighting from keywords
  - `processBeatNarrativeForLighting()` - Main function with fallback logic
  - `hasLightingDetails()` - Checks if beat has lighting details

- **NOT Imported/Used**: 
  - `promptGenerationService.ts`: Does NOT import or use `beatNarrativeProcessor`
  - `qwenPromptService.ts`: Does NOT import or use `beatNarrativeProcessor`
  - System instructions mention beat-narrative lighting, but code relies on AI to extract it

#### Impact
- **Medium-High**: AI may not consistently extract lighting from beat narratives
- Face lighting may be generic when beat has specific lighting details
- Lighting color/quality mismatches between beat and face lighting

#### Example (from docs)
```
Beat: "heavy gunsmoke, bright muzzle flashes illuminating the haze"
Expected Face Lighting: "bright intermittent muzzle flashes on face, subdued by thick gunsmoke"
Current: AI may generate generic "dramatic tactical lighting on face"
```

---

## Implementation Plan

### Phase 1: Add Negative Prompts to SwarmUI API Calls (Priority: HIGH)

#### Tasks
1. **Update `SwarmUIPrompt` type** (`types.ts`)
   - Add optional `negativePrompt?: string` field

2. **Update `swarmUIService.ts`**
   - Add `negative_prompt` parameter to all API calls:
     - `generateImageInSwarmUI()` - Add to request body
     - `generateContextEnhancedImage()` - Add to request body
     - `generateImages()` - Add to request body (if SwarmUI native API supports it)

3. **Update prompt generation services**
   - `promptGenerationService.ts`: Include negative prompt in generated prompts
   - `qwenPromptService.ts`: Include negative prompt in generated prompts
   - Use standard negative prompt from docs

4. **Update pipeline service**
   - `pipelineService.ts`: Pass negative prompts through to SwarmUI calls

#### Files to Modify
- `types.ts` - Add `negativePrompt` to `SwarmUIPrompt`
- `services/swarmUIService.ts` - Add negative prompt to API calls
- `services/promptGenerationService.ts` - Include negative prompt in response
- `services/qwenPromptService.ts` - Include negative prompt in response
- `services/pipelineService.ts` - Pass negative prompts through

#### Estimated Effort
- **Time**: 2-3 hours
- **Risk**: Low (additive change, doesn't break existing functionality)
- **Testing**: Generate images with/without negative prompts, compare quality

---

### Phase 2: Implement Location-Specific Negative Prompts (Priority: HIGH)

#### Tasks
1. **Create `locationAwareNegativePromptService.ts`**
   - Function: `buildLocationSpecificNegativePrompt(prompt: string, locationContext?: LocationContext): string`
   - Detection logic (priority order):
     1. Check for Records Room keywords (highest priority)
     2. Check for Server Room keywords
     3. Check for NHIA Facility 7 keywords
     4. Default to standard negative prompt

2. **Negative Prompt Variations**
   - **Damaged Areas** (default):
     ```
     Base negative + "debris, trash, wadded paper, litter, garbage, pristine facility, new equipment, clean environment, undamaged building, bright cheerful lighting"
     ```
   - **Server Rooms**:
     ```
     Base negative + "debris, trash, wadded paper, litter, garbage, damaged equipment, broken servers, collapsed infrastructure"
     ```
   - **Records Room**:
     ```
     Base negative + "pristine facility, new equipment, clean environment, undamaged building, bright cheerful lighting, organized files, neat filing system"
     ```

3. **Integration Points**
   - `swarmUIService.ts`: Call location-aware service before API calls
   - `pipelineService.ts`: Extract location context from prompts/beats
   - Use location information from episode context or beat analysis

4. **Testing**
   - Test with NHIA Facility 7 prompts (all three area types)
   - Verify server rooms appear pristine
   - Verify records room shows intentional paper litter
   - Verify damaged areas appear damaged

#### Files to Create
- `services/locationAwareNegativePromptService.ts` - New service

#### Files to Modify
- `services/swarmUIService.ts` - Integrate location-aware negative prompts
- `services/pipelineService.ts` - Extract location context
- `types.ts` - Add location context types if needed

#### Estimated Effort
- **Time**: 4-6 hours
- **Risk**: Medium (new logic, needs thorough testing)
- **Testing**: Generate images for all three NHIA Facility 7 area types, compare results

---

### Phase 3: Integrate Beat Narrative Lighting Extraction (Priority: MEDIUM-HIGH)

#### Tasks
1. **Update `promptGenerationService.ts`**
   - Import: `import { processBeatNarrativeForLighting } from './beatNarrativeProcessor';`
   - Extract face lighting from beat narrative BEFORE sending to AI
   - Pass extracted lighting to AI in system instructions or beat data
   - Use fallback to location atmosphere if beat has no lighting

2. **Update `qwenPromptService.ts`**
   - Same changes as above

3. **Update System Instructions**
   - Modify instructions to use pre-extracted lighting when available
   - AI should prioritize provided lighting over extracting it

4. **Testing**
   - Test with beats that have lighting details (gunsmoke, muzzle flashes, etc.)
   - Test with beats that have no lighting details (should use fallback)
   - Verify face lighting matches beat narrative lighting

#### Files to Modify
- `services/promptGenerationService.ts` - Integrate beat narrative processor
- `services/qwenPromptService.ts` - Integrate beat narrative processor

#### Estimated Effort
- **Time**: 2-3 hours
- **Risk**: Low (service already exists, just needs integration)
- **Testing**: Compare face lighting in generated prompts with/without extraction

---

## Implementation Priority

### Immediate (This Week)
1. ✅ **Phase 1: Add Negative Prompts to API** (2-3 hours)
   - Highest impact, lowest risk
   - Will immediately improve image quality

### High Priority (Next Week)
2. ✅ **Phase 2: Location-Specific Negative Prompts** (4-6 hours)
   - Addresses documented NHIA Facility 7 anomalies
   - Critical for location accuracy

3. ✅ **Phase 3: Beat Narrative Lighting Extraction** (2-3 hours)
   - Improves lighting consistency
   - Service already exists, just needs integration

---

## Testing Strategy

### Phase 1 Testing
- Generate images with standard negative prompt
- Compare with images generated without negative prompt
- Verify: No cartoon/anime styles, no extra limbs, no bright cheerful colors

### Phase 2 Testing
- Generate images for NHIA Facility 7:
  - Damaged area prompt
  - Server room prompt (should be pristine)
  - Records room prompt (should show paper litter)
- Compare results with expected visual requirements

### Phase 3 Testing
- Generate prompts for beats with lighting details
- Verify face lighting matches beat narrative
- Test fallback behavior for beats without lighting

---

## Success Criteria

### Phase 1
- ✅ Negative prompts included in all SwarmUI API calls
- ✅ Images show improved quality (no artifacts, correct style)
- ✅ No breaking changes to existing functionality

### Phase 2
- ✅ Server rooms appear pristine (not damaged)
- ✅ Records room shows intentional paper litter
- ✅ Damaged areas appear damaged (not pristine)
- ✅ Detection logic correctly identifies location types

### Phase 3
- ✅ Face lighting extracted from beat narratives
- ✅ Face lighting matches beat narrative lighting details
- ✅ Fallback works when beat has no lighting details

---

## Related Documents

- `docs/UPDATED_PROMPT_STANDARDS.md` - Production prompt standards
- `docs/BEAT_NARRATIVE_PROMPT_STANDARDS.md` - Beat-narrative lighting standards
- `docs/LOCATION_SPECIFIC_NEGATIVE_PROMPT_ANOMALIES.md` - Location-specific requirements
- `services/beatNarrativeProcessor.ts` - Existing lighting extraction service

---

## Next Steps

1. **Review this plan** with team
2. **Start with Phase 1** (negative prompts to API) - quick win
3. **Implement Phase 2** (location-specific) - addresses documented issues
4. **Complete Phase 3** (beat narrative lighting) - improves consistency
5. **Test all phases** with production prompts
6. **Document results** and update standards

---

**End of Analysis and Plan**

