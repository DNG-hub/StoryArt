# Location-Specific Negative Prompt Anomalies

**Date**: 2025-11-24  
**Status**: Discussion Document  
**Related**: StoryTeller Vertical Generation Implementation  
**Purpose**: Document location anomalies and generate discussion on StoryArt integration

---

## Executive Summary

During implementation of vertical image generation in StoryTeller, we discovered that **NHIA Facility 7** contains **three distinct areas** with conflicting visual requirements. A single negative prompt cannot handle all three areas correctly. This document describes the anomalies and proposes integration strategies for StoryArt.

---

## The Problem: Location Anomalies

### NHIA Facility 7 - Three Distinct Areas

NHIA Facility 7 is a partially collapsed government medical facility that contains:

1. **Damaged Areas** (Default)
   - Collapsed sections, debris, emergency lighting, shattered containment pods
   - **Requires**: Negative prompts to prevent pristine appearance

2. **Pristine Server Rooms** (Anomaly #1)
   - Intact, climate-controlled, protected by blast-resistant construction
   - **Requires**: Different negatives - server rooms ARE pristine, but shouldn't show debris

3. **Records Room** (Anomaly #2)
   - Paper littering floors and walls is **INTENTIONAL** part of scene
   - **Requires**: Paper/litter negatives must be EXCLUDED (paper is part of the scene)

### The Conflict

**Standard Approach (Doesn't Work):**
```
Base negative prompt + "debris, trash, wadded paper, litter, garbage, pristine facility..."
```

**Problem:**
- ✅ Works for damaged areas
- ❌ **Fails for server rooms**: Prevents pristine appearance (but server rooms ARE pristine)
- ❌ **Fails for records room**: Prevents paper litter (but paper litter is INTENTIONAL)

---

## Current StoryTeller Implementation

### Detection Logic

**Priority Order:**
1. Check for **Records Room** keywords (highest priority)
2. Check for **Server Room** keywords
3. Default to **Damaged Area** handling

### Negative Prompt Variations

**For DAMAGED AREAS** (default):
```
Base negative + "debris, trash, wadded paper, litter, garbage, pristine facility, 
new equipment, clean environment, undamaged building, bright cheerful lighting"
```
*Purpose: Prevent pristine appearance in damaged sections*

**For SERVER ROOMS**:
```
Base negative + "debris, trash, wadded paper, litter, garbage, damaged equipment, 
broken servers, collapsed infrastructure"
```
*Purpose: Server rooms ARE pristine, so don't add "pristine facility" negatives. 
But still prevent debris/damage in the pristine server room itself.*

**For RECORDS ROOM**:
```
Base negative + "pristine facility, new equipment, clean environment, undamaged building, 
bright cheerful lighting, organized files, neat filing system"
```
*Purpose: Paper litter is INTENTIONAL - DON'T add paper/litter negatives. 
But still prevent pristine appearance and organized filing systems.*

### Detection Keywords

**NHIA Facility 7 Detection:**
- "CDC archive", "CDC data center", "nhia facility", "facility 7"

**Records Room Keywords:**
- "records room", "record room", "paper room", "filing room"
- "paper littering", "paper scattered", "paper on floor", "paper on walls"
- "scattered documents", "littered with paper"

**Server Room Keywords:**
- "server room", "server rooms", "server racks", "data center"
- "data archive", "archive chamber", "intact server", "blinking status lights"
- "climate-controlled", "backup power", "server banks", "data storage"

---

## StoryArt Integration Discussion

### Current StoryArt State

**Questions to Answer:**
1. Does StoryArt currently have location-specific negative prompt handling?
2. Where in the StoryArt pipeline should this logic be applied?
3. How does StoryArt extract location information from prompts?
4. Does StoryArt have a similar prompt modification service?

### Proposed Integration Approaches

#### Approach 1: Service Layer Integration

**Location**: StoryArt service layer (if exists) or prompt processing pipeline

**Implementation:**
- Create `LocationAwareNegativePromptService` in StoryArt
- Integrate with existing prompt processing pipeline
- Apply conditional negative prompts before SwarmUI generation

**Pros:**
- ✅ Centralized logic
- ✅ Reusable across all StoryArt generation types
- ✅ Easy to test and maintain

**Cons:**
- ⚠️ Requires service layer refactoring
- ⚠️ May need to modify existing prompt pipeline

#### Approach 2: Prompt Enhancement Hook

**Location**: StoryArt prompt enhancement/processing hooks

**Implementation:**
- Add location detection to prompt enhancement phase
- Apply conditional negative prompts as enhancement step
- Integrate with existing `Latest_Prompt_Suggestions.md` standards

**Pros:**
- ✅ Minimal changes to existing code
- ✅ Works with current StoryArt architecture
- ✅ Can be added as optional enhancement

**Cons:**
- ⚠️ May duplicate logic if StoryTeller also uses this
- ⚠️ Need to ensure consistency between systems

#### Approach 3: Database-Driven Configuration

**Location**: StoryArt database/configuration system

**Implementation:**
- Store location-specific negative prompt rules in database
- Query location context from story database
- Apply rules based on location hierarchy

**Pros:**
- ✅ Dynamic configuration (no code changes for new locations)
- ✅ Can be managed through StoryArt UI
- ✅ Supports complex location hierarchies

**Cons:**
- ⚠️ Requires database schema changes
- ⚠️ More complex implementation
- ⚠️ Performance considerations (database queries)

#### Approach 4: Shared Service Library

**Location**: Shared library between StoryTeller and StoryArt

**Implementation:**
- Extract negative prompt logic to shared service
- Both StoryTeller and StoryArt use same service
- Ensures consistency across systems

**Pros:**
- ✅ Single source of truth
- ✅ Consistent behavior across systems
- ✅ Easier maintenance

**Cons:**
- ⚠️ Requires shared codebase/library structure
- ⚠️ May need to refactor both systems
- ⚠️ Dependency management complexity

---

## Integration Questions for Discussion

### 1. Architecture Questions

**Q1.1**: Where does StoryArt currently process negative prompts?
- [ ] Service layer
- [ ] Prompt enhancement pipeline
- [ ] SwarmUI integration layer
- [ ] Other: _______________

**Q1.2**: Does StoryArt have a prompt modification service similar to StoryTeller's `PromptModifierService`?
- [ ] Yes, location: _______________
- [ ] No, needs to be created
- [ ] Partial implementation

**Q1.3**: How does StoryArt extract location information from prompts?
- [ ] Keyword matching (like StoryTeller)
- [ ] Database lookup
- [ ] AI analysis
- [ ] Other: _______________

### 2. Implementation Questions

**Q2.1**: Should StoryArt use the same detection keywords as StoryTeller?
- [ ] Yes, for consistency
- [ ] No, StoryArt should have its own keywords
- [ ] Hybrid: Base keywords shared, StoryArt-specific extensions

**Q2.2**: Should negative prompt logic be:
- [ ] Hardcoded in StoryArt code
- [ ] Database-driven (configurable)
- [ ] Configuration file (JSON/YAML)
- [ ] Hybrid approach

**Q2.3**: Should StoryArt support location hierarchies?
- [ ] Yes, full hierarchy support (e.g., "NHIA Facility 7 > Server Room")
- [ ] No, flat location detection only
- [ ] Partial: Major locations only

### 3. Consistency Questions

**Q3.1**: Should StoryArt and StoryTeller use identical negative prompts?
- [ ] Yes, must be identical for consistency
- [ ] No, StoryArt can have variations
- [ ] Base prompts shared, StoryArt-specific additions

**Q3.2**: How should we handle new location anomalies discovered in the future?
- [ ] Code changes required
- [ ] Database configuration update
- [ ] Configuration file update
- [ ] AI-driven detection

**Q3.3**: Should negative prompt rules be versioned?
- [ ] Yes, track changes over time
- [ ] No, always use latest rules
- [ ] Per-story versioning

### 4. Testing Questions

**Q4.1**: How should we test location-specific negative prompts?
- [ ] Unit tests with sample prompts
- [ ] Integration tests with real prompts
- [ ] Visual validation (compare generated images)
- [ ] All of the above

**Q4.2**: Should we maintain a test suite of known location anomalies?
- [ ] Yes, regression test suite
- [ ] No, test as needed
- [ ] Document only, no automated tests

---

## Recommended Integration Strategy

### Phase 1: Analysis (Current)
- ✅ Document anomalies (this document)
- [ ] Analyze StoryArt prompt processing pipeline
- [ ] Identify integration points
- [ ] Review existing negative prompt handling

### Phase 2: Design
- [ ] Choose integration approach (from options above)
- [ ] Design service/component architecture
- [ ] Define API/interface contracts
- [ ] Create integration plan

### Phase 3: Implementation
- [ ] Implement location detection
- [ ] Implement conditional negative prompt logic
- [ ] Add tests
- [ ] Update documentation

### Phase 4: Validation
- [ ] Test with NHIA Facility 7 prompts
- [ ] Validate all three area types
- [ ] Compare results with StoryTeller
- [ ] User acceptance testing

---

## Code Reference

### StoryTeller Implementation

**File**: `generate_vertical_with_modifiers_db.py`  
**Method**: `build_location_specific_negative_prompt()`  
**Lines**: 263-330

**Key Logic:**
```python
# Priority order:
1. Check for records room keywords
2. Check for server room keywords  
3. Default to damaged area handling
```

### Detection Keywords Reference

**NHIA Facility 7:**
```python
nhia_keywords = [
    "cdc archive", "cdc data center", 
    "nhia facility", "facility 7"
]
```

**Records Room:**
```python
records_room_keywords = [
    "records room", "record room", "paper room", "filing room",
    "paper littering", "paper scattered", "paper on floor", 
    "paper on walls", "scattered documents", "littered with paper"
]
```

**Server Room:**
```python
server_room_keywords = [
    "server room", "server rooms", "server racks", "data center",
    "data archive", "archive chamber", "intact server", 
    "blinking status lights", "climate-controlled", "backup power",
    "server banks", "data storage"
]
```

---

## Future Considerations

### Other Potential Anomalies

**Questions:**
1. Are there other locations with similar anomalies?
2. Should we proactively scan for location-specific requirements?
3. How do we discover new anomalies before they cause issues?

### Scalability

**Questions:**
1. How many location-specific rules can we maintain?
2. Should we use AI to detect location context instead of keywords?
3. Can we learn from generated images to refine negative prompts?

### Maintenance

**Questions:**
1. Who maintains location-specific negative prompt rules?
2. How do we document new location requirements?
3. Should this be part of story/location metadata in database?

---

## Next Steps

1. **Review this document** with StoryArt team
2. **Answer discussion questions** to guide implementation
3. **Choose integration approach** based on StoryArt architecture
4. **Create implementation plan** with specific tasks
5. **Implement and test** location-specific negative prompt handling

---

## Related Documents

- **StoryTeller**: `PRD Tasks/VERTICAL_GENERATION_SUBSTITUTION_FIX_PLAN.md`
- **StoryTeller**: `generate_vertical_with_modifiers_db.py` (implementation)
- **StoryArt**: `docs/VERTICAL_PROMPT_GUIDELINES.md` (existing guidelines)
- **StoryArt**: `docs/BEAT_NARRATIVE_PROMPT_STANDARDS.md` (prompt standards)

---

**End of Document**

*This document is intended to generate discussion and guide implementation decisions. Please add comments, questions, and proposed solutions.*

