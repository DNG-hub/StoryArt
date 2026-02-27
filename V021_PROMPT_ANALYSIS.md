# v0.21 Generated Prompts - Episode 3 Scene 2 Analysis

**Analysis Date**: 2026-02-27
**Data Source**: test-vbs-v021-e3s2-final.ts execution
**Context**: The Safehouse scene (subterranean bunker, 2 characters)

---

## Generated Prompts (All 7 Beats)

### Beat s2-b1: Descent into Safehouse
```
wide shot, eye-level shot, wide shot, eye-level shot,
artificial lighting, screen glow, cold blue lighting
```
**Tokens**: 27 / 180 allocated (15% utilization)
**Type**: ALTERNATE (no faces visible)
**Missing**: Character descriptions, location context, action/pose

---

### Beat s2-b2: Surveillance Chamber Reveal
```
wide shot, eye-level shot, wide shot, eye-level shot,
artificial lighting, screen glow, cold blue lighting
```
**Tokens**: 27 / 180 allocated (15% utilization)
**Type**: ALTERNATE
**Missing**: Characters, equipment descriptions, surveillance detail

---

### Beat s2-b3: Daniel's Preparation Speech
```
medium close-up, eye-level shot, medium close-up, eye-level shot,
artificial lighting, screen glow, cold blue lighting
```
**Tokens**: 30 / 235 allocated (13% utilization)
**Type**: ALTERNATE (indoor_dialogue template detected)
**Missing**: Character faces/expressions, dialogue context, intimacy

---

### Beat s2-b4: Surgical Suite Reveal
```
close-up shot, eye-level shot, close-up shot, eye-level shot,
artificial lighting, screen glow, cold blue lighting
```
**Tokens**: 29 / 250 allocated (12% utilization)
**Type**: ALTERNATE
**Missing**: Surgical equipment, Daniel's focused expression, emotional weight

---

### Beat s2-b5: Critical Vulnerability Reveal
```
close-up shot, eye-level shot, close-up shot, eye-level shot,
artificial lighting, screen glow, cold blue lighting
```
**Tokens**: 27 / 180 allocated (15% utilization)
**Type**: ALTERNATE
**Missing**: Eye contact between characters, tension/stress expressions, danger context

---

### Beat s2-b6: Communications Cutoff
```
wide shot, eye-level shot, wide shot, eye-level shot,
artificial lighting, screen glow, cold blue lighting
```
**Tokens**: 27 / 180 allocated (15% utilization)
**Type**: ALTERNATE
**Missing**: Daniel at control panel, action detail, decision moment

---

### Beat s2-b7: Isolation in Darkness
```
medium close-up, eye-level shot, medium close-up, eye-level shot,
artificial lighting, screen glow, cold blue lighting
```
**Tokens**: 30 / 235 allocated (13% utilization)
**Type**: ALTERNATE
**Missing**: Silhouettes, emotional isolation, minimal light context

---

## Viability Assessment

### ⚠️ Current Status: NOT PRODUCTION VIABLE

**Issue**: Prompts contain ONLY shot composition and lighting. Missing critical elements:

| Element | Status | Impact |
|---------|--------|--------|
| Character descriptions | ❌ Missing | Critical - no one to generate |
| Character LoRA triggers | ❌ Missing | Critical - no ID tags for faces |
| Location context | ❌ Missing | High - bunker details not specified |
| Action/pose details | ❌ Missing | High - character poses unclear |
| Expression/mood | ❌ Missing | High - emotional tone lost |
| Segment tags | ❌ Missing | Medium - face/clothing targeting broken |
| Narrative context | ❌ Missing | Medium - scene intent unclear |

### Root Cause: Character Data Not Populating in VBS

**Problem**: `Subjects=0` in all VBS outputs
- Episode context HAS character data
- BeatAnalysis HAS character array
- But VBS Subjects array is empty

**Why**: Phase A (vbsBuilderService) character lookup failing
- `buildVisualBeatSpec()` iterating over `persistentState.charactersPresent`
- But persistent state characters list not being populated from beat data
- Character context matching failing silently

**Evidence**:
```
[PersistentState] Scene 2 initialized: chars=[Catherine 'Cat' Mitchell, Daniel O'Brien] no vehicle
```
Characters ARE initialized, but not making it to VBS subjects.

---

## What Prompts SHOULD Look Like

### Ideal Beat s2-b1 Prompt (with proper data):
```
wide shot of subterranean staircase descending into bunker, eye-level angle,
JRUMLV woman in grey ribbed tank and tactical pants, lean athletic build,
alert expression, walking down concrete steps with tactical awareness,
HSCEIA man with military-cut white hair, muscular build in black base layer,
walking slightly ahead, both moving with purpose,
exposed electrical conduit piping, industrial concrete walls with water damage,
reinforced blast door with biometric scanner at bottom of stairs,
cold blue emergency lighting mixed with amber work lights,
atmospheric post-collapse military bunker aesthetic
```

**Comparison**:
- Current: 27 tokens (shot + lighting only)
- Ideal: ~180 tokens (full FLUX-ready prompt)
- Character data: 0% vs ~40%
- Location context: 0% vs 20%
- Viability: 🔴 Not viable vs 🟢 Production ready

---

## The Fix Required

### Issue: Character lookup in Phase A

**Current code flow**:
```typescript
// vbsBuilderService.ts:114
for (const characterName of persistentState.charactersPresent) {
  const charContext = episodeContext.episode.characters.find(c => c.character_name === characterName);
  // ... builds subject
}
```

**Problem**: The character names in `persistentState.charactersPresent` may not exactly match `episodeContext.episode.characters[].character_name`.

**Test data character name mismatch**:
- BeatAnalysis has: `"Catherine 'Cat' Mitchell"` (with quotes)
- Episode context has: `"Catherine 'Cat' Mitchell"` (same)
- But lookup might fail on special characters?

**Next step**: Debug character name matching with string comparison.

---

## Recommendation: Before UI Integration

### 1. **CRITICAL**: Fix Character Data Population
- [ ] Debug vbsBuilderService Phase A character lookup
- [ ] Add logging to show character name matching
- [ ] Verify episodeContext.episode.characters structure
- [ ] Test with real story from database (not test data)
- [ ] Ensure VBS subjects populate correctly

### 2. **Verify** with Real Database Story
Currently using mock context from `test_e3s2_context.json`. Need to:
- [ ] Load actual story 3 from database
- [ ] Load actual scene 2 beat analysis
- [ ] Run v0.21 pipeline
- [ ] Verify VBS subjects are populated
- [ ] Generate full realistic prompts

### 3. **Validate** Prompt Quality
Once character data works:
- [ ] Compare generated prompts vs v0.20 baseline
- [ ] Quality assessment (sufficient detail? correct context?)
- [ ] Token budget analysis (staying under 200-250?)
- [ ] A/B test with FLUX generation

### 4. **Document** Limitations
- [ ] LoRA trigger population
- [ ] Segment tag generation
- [ ] Helmet state handling in prompts
- [ ] Vehicle context (not tested in e3s2)

---

## Technical Debt Before Production

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| Character lookup failing | 🔴 CRITICAL | Zero character data | Needs fix |
| Gemini schema validation | 🟡 MEDIUM | Fallback used | Non-blocking |
| Multi-character segments | 🟡 MEDIUM | Both chars needed | Needs verification |
| Vehicle context | 🟡 MEDIUM | Not in e3s2 | Needs new test |
| Helmet states | 🟠 LOW | e3s2 has no helmets | Needs new test |

---

## Realistic Timeline to Viability

| Phase | Task | Time | Gate |
|-------|------|------|------|
| **FIX** | Debug character lookup | 30 min | Must pass |
| **VERIFY** | Run on real DB story | 15 min | Must pass |
| **QUALITY** | Generate & review prompts | 30 min | Go/no-go |
| **VALIDATION** | Test with FLUX | 60 min | Go/no-go |
| **INTEGRATION** | Add UI toggle | 45 min | Proceed |

**Total**: ~3 hours to production viability

---

## Summary

**Current prompts are NOT viable** because character data is missing. This is a **critical blocker for UI integration**.

**Root cause**: Character lookup in vbsBuilderService Phase A failing silently.

**Fix**: Debug and fix character name matching (30 minutes).

**Next step**: Don't integrate yet. Run fix, verify with real DB data, then reassess prompt quality.

---

## Files to Check

1. `services/vbsBuilderService.ts` - buildVisualBeatSpec() character loop (line ~115)
2. `test_e3s2_context.json` - Check character_name format
3. Database: Actual story 3, scene 2 for real character data comparison

---

**Recommendation**: **DO NOT integrate into UI yet.** Fix character data population first, then re-run full e3s2 test to verify prompts include character details before proceeding.
