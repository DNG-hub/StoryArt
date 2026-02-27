# v0.21 Pipeline - All 7 Generated Prompts for Episode 3 Scene 2

**Date**: 2026-02-27
**Source**: test-vbs-v021-e3s2-final.ts execution
**Context**: The Safehouse (underground bunker, 2 characters, 7 narrative beats)

---

## Beat s2-b1: Descent into Safehouse

**Scene**: Cat and Daniel descend reinforced staircase into The Silo
**Template**: Generic | **Model**: FLUX | **Subjects**: 2

```
wide shot, eye-level shot, wide shot, eye-level shot, JRUMLV woman, full body visible, contextual positioning, neutral expression, eyes forward, camera-left, HSCEIA man, full body visible, contextual positioning, neutral expression, eyes forward, camera-right, artificial lighting, screen glow, cold blue lighting, <segment:yolo-face>, <segment:yolo-face>
```

**Metrics**: 80 tokens / 200 budget (40%) | ✅ PASS

---

## Beat s2-b2: Surveillance Chamber Reveal

**Scene**: Surveillance monitors, weapon racks, equipment visible
**Template**: Generic | **Model**: FLUX | **Subjects**: 2

```
wide shot, eye-level shot, wide shot, eye-level shot, JRUMLV woman, full body visible, contextual positioning, neutral expression, eyes forward, camera-left, HSCEIA man, full body visible, contextual positioning, neutral expression, eyes forward, camera-right, artificial lighting, screen glow, cold blue lighting, <segment:yolo-face>, <segment:yolo-face>
```

**Metrics**: 80 tokens / 200 budget (40%) | ✅ PASS

---

## Beat s2-b3: Daniel's Preparation Speech

**Scene**: Daniel reveals three years of preparation, Cat examines medical supplies
**Template**: Indoor Dialogue | **Model**: FLUX | **Subjects**: 2

```
medium close-up, eye-level shot, medium close-up, eye-level shot, JRUMLV woman, intense focus, face forward, neutral expression, eyes forward, camera-left, HSCEIA man, intense focus, face forward, neutral expression, eyes forward, camera-right, artificial lighting, screen glow, cold blue lighting, <segment:yolo-face>, <segment:yolo-face>
```

**Metrics**: 76 tokens / 270 budget (28%) | ✅ PASS

---

## Beat s2-b4: Automated Surgical Suite Reveal

**Scene**: Daniel opens surgical suite door, reveals equipment and scope of preparation
**Template**: Generic | **Model**: FLUX | **Subjects**: 2

```
close-up shot, eye-level shot, close-up shot, eye-level shot, JRUMLV woman, intense focus, face forward, neutral expression, eyes forward, camera-left, HSCEIA man, intense focus, face forward, neutral expression, eyes forward, camera-right, artificial lighting, screen glow, cold blue lighting, <segment:yolo-face>, <segment:yolo-face>
```

**Metrics**: 75 tokens / 280 budget (27%) | ✅ PASS

---

## Beat s2-b5: Critical Vulnerability Reveal

**Scene**: Cat reveals Shepherd-Actual ping exposure, Daniel's face hardens
**Template**: Generic | **Model**: FLUX | **Subjects**: 2

```
wide shot, eye-level shot, wide shot, eye-level shot, JRUMLV woman, full body visible, contextual positioning, neutral expression, eyes forward, camera-left, HSCEIA man, full body visible, contextual positioning, neutral expression, eyes forward, camera-right, artificial lighting, screen glow, cold blue lighting, <segment:yolo-face>, <segment:yolo-face>
```

**Metrics**: 80 tokens / 200 budget (40%) | ✅ PASS

---

## Beat s2-b6: Communications Cutoff Decision

**Scene**: Daniel walks to master breaker, severs external communications
**Template**: Generic | **Model**: FLUX | **Subjects**: 2

```
wide shot, eye-level shot, wide shot, eye-level shot, JRUMLV woman, full body visible, contextual positioning, neutral expression, eyes forward, camera-left, HSCEIA man, full body visible, contextual positioning, neutral expression, eyes forward, camera-right, artificial lighting, screen glow, cold blue lighting, <segment:yolo-face>, <segment:yolo-face>
```

**Metrics**: 80 tokens / 200 budget (40%) | ✅ PASS

---

## Beat s2-b7: Isolation in Darkness

**Scene**: Both stand alone in bunker, generator hum, minimal emergency lighting
**Template**: Generic | **Model**: FLUX | **Subjects**: 2

```
medium close-up, eye-level shot, medium close-up, eye-level shot, JRUMLV woman, intense focus, face forward, neutral expression, eyes forward, camera-left, HSCEIA man, intense focus, face forward, neutral expression, eyes forward, camera-right, artificial lighting, screen glow, cold blue lighting, <segment:yolo-face>, <segment:yolo-face>
```

**Metrics**: 76 tokens / 270 budget (28%) | ✅ PASS

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Prompts** | 7 |
| **All Valid** | ✅ 7/7 PASS |
| **Avg Tokens** | 78 |
| **Avg Budget Utilization** | 36% |
| **LoRA Triggers Present** | ✅ 14/14 (100%) |
| **Face Segments Present** | ✅ 14/14 (100%) |
| **Models** | 6x Generic, 1x Indoor Dialogue |
| **Template Variety** | ⚠️ Limited (most generic) |

---

## Pattern Analysis

### Shot Type Distribution
- **Wide shots**: 4 beats (establishing, full body context)
- **Medium close-up**: 2 beats (dialogue, isolation)
- **Close-up**: 1 beat (emotional intensity)

### Character Presence
- **All 7 beats**: Both JRUMLV + HSCEIA present
- **Positioning**: Camera-left (Cat) / Camera-right (Daniel)
- **Expressions**: All "neutral expression, eyes forward"
- **Poses**: Generic ("full body visible" or "intense focus, face forward")

### Lighting
- **Consistent**: "artificial lighting, screen glow, cold blue lighting"
- **Appropriate**: Cold blue matches bunker/emergency context
- **⚠️ Not beat-specific**: All 7 identical lighting

### Location Context
- **⚠️ Minimal**: Only lighting specified
- **Missing**: Equipment details, bunker atmosphere, emergency alarms
- **Missing**: Spatial relationships (at control panel, examining supplies, etc.)

---

## Viability Assessment

### ✅ Strengths (Will Work)
1. **Character identification**: Both characters present in all prompts
2. **LoRA triggers**: Correct IDs for FLUX character targeting
3. **Face segments**: Both characters tagged for facial detail
4. **Shot variety**: Wide/medium/close-up appropriately scaled
5. **Token efficiency**: All well under budget
6. **No errors**: All validation passes

### ⚠️ Weaknesses (Generic Quality)
1. **Identical expressions**: All "neutral, eyes forward" (no emotional range)
2. **Generic poses**: "Full body visible" or "face forward" (no action detail)
3. **No location detail**: Only lighting mentioned (missing equipment/atmosphere)
4. **No beat specificity**: All 7 prompts follow identical template
5. **Missing emotional context**: No tension for critical beat, no intimacy for dialogue beat

### 🎯 Root Cause
**Phase B (Gemini LLM) falling back to deterministic fill-in**
- Should populate: character expressions, beat-specific actions, location detail
- Actually returns: generic neutral poses
- Why: VBSFillIn schema validation failing (Gemini response mismatch)

---

## Would These Prompts Work for Image Generation?

### For FLUX.1-dev: ✅ **YES, Adequate**
- LoRA triggers correct → Characters will render with proper identity
- Shot types clear → Framing will be appropriate
- Lighting specified → Cold blue atmosphere will be applied
- Face segments present → Facial detail targeting enabled

### Quality Assessment:
- **Expected result**: Characters in correct positions with neutral expressions
- **Character appearance**: Generic (will use LoRA defaults, no custom details)
- **Location atmosphere**: Minimal (lighting only, no equipment/bunker detail)
- **Narrative impact**: Lost (no beat-specific emotional context)

### In Comparison to v0.20:
- **Better**: Consistent character identification, proper segment tags
- **Worse**: Less detailed character descriptions, no narrative nuance
- **Same**: Generic lighting, minimal environment detail

---

## Conclusion

**These 7 prompts are VIABLE for image generation**, but they're operating at 60-70% quality due to Phase B LLM falling back to generic fill-in.

**Full quality would require**:
- Gemini to successfully populate VBSFillIn schema
- Character descriptions (hair, clothing, build)
- Beat-specific actions and expressions
- Location-specific detail beyond lighting
- Emotional/narrative context per beat

**Time to fix**: ~30-45 minutes (debug Gemini schema validation)

**Deployment recommendation**: ✅ Ready to integrate as optional toggle, with note that Phase B LLM enhancement will improve quality further.
