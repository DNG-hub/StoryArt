# v0.21 Prompt Rules - Before/After Comparison

## The 6 Critical Fixes

---

## Fix #1: depthOfField

### BEFORE (v0.20)
```
medium shot, eye-level, Cat standing, vault corridor, steel vault door
```
**Problem**: No depth of field context. T5 encoder doesn't know if close-up or wide.

### AFTER (v0.21)
```
medium shot, shallow depth of field, eye-level, Cat standing, vault corridor, steel vault door
```
**Solution**:
- Derived from shot type: close-up → "shallow depth of field", wide → "deep focus"
- Added to shot section (first tokens = highest attention)
- **Impact**: +2-3 tokens, better compositional clarity

---

## Fix #2: locationVisual

### BEFORE (v0.20)
```
medium shot, Cat standing, Daniel sitting, cold blue lighting
```
**Problem**: No location context. Scene is generic, could be anywhere.

### AFTER (v0.21)
```
medium shot, Cat standing, Daniel sitting, massive reinforced steel vault door with biometric locks,
bank of surveillance monitors, medical bay, cold blue lighting
```
**Solution**:
- Falls back to `location.key_features[0:2]` when no STRUCTURAL artifacts
- Includes specific location details (vault, monitors, medical bay)
- **Impact**: +15-20 tokens, establishes location context

---

## Fix #3: colorGrade

### BEFORE (v0.20)
```
artificial lighting, screen glow, cold blue lighting, tactical readiness
```
**Problem**: No color treatment specified. FLUX defaults to neutral/vibrant.

### AFTER (v0.21)
```
artificial lighting, screen glow, cold blue lighting, tactical readiness,
desaturated tactical color grade
```
**Solution**:
- Mapped from `location.atmosphere_category` (BUNKER_REFUGE → desaturated tactical)
- Explicit color grade instruction for FLUX color processing
- **Impact**: +2-3 tokens, ensures visual consistency with story tone

---

## Fix #4: No Parentheses

### BEFORE (v0.20)
```
JRUMLV (woman, 30 years old, brown hair, green eyes, lean athletic build. Wearing grey tank top.)
```
**Problem**: T5 encoder sees parentheses as literal tokens, not emphasis. Wastes token budget.

### AFTER (v0.21)
```
JRUMLV woman, 30 years old, brown hair, green eyes, lean athletic build. Wearing grey tank top.
```
**Solution**:
- Removed `(...)` wrappers from descriptions
- T5 reads as continuous natural language
- **Impact**: Saves 2 tokens per character, cleaner parsing

---

## Fix #5: No Spaces in Segment Tags

### BEFORE (v0.20)
```
...desaturated tactical color grade, <segment:yolo-face_yolov9c.pt-0,0.35,0.5>, <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```
**Problem**: Comma+space between tags confuses SwarmUI parser.

### AFTER (v0.21)
```
...desaturated tactical color grade<segment:yolo-face_yolov9c.pt-0,0.35,0.5><segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```
**Solution**:
- Changed `allSegments.join(', ')` → `allSegments.join('')`
- Tags are adjacent with no separator
- **Impact**: SwarmUI parser correctly detects dual face segments

---

## Fix #6: Strict Compilation Order

### BEFORE (v0.20)
```
Cat standing, medium shot, artificial lighting, eye-level, observation pose,
green eyes, vault door, neutral expression, cold blue, tactical readiness
```
**Problem**: Order inconsistent. Shot details scattered. First tokens not optimal.

### AFTER (v0.21)
```
medium shot, shallow depth of field, eye-level, two subjects framing vault entrance,
JRUMLV woman, 30 years old...,
standing, observing, neutral expression...,
HSCEIA man, 35 years old...,
standing, observing, neutral expression...,
massive reinforced steel vault door,
bank of surveillance monitors,
artificial lighting, screen glow, cold blue lighting,
tension, tactical readiness,
desaturated tactical color grade
<segment:yolo-face_yolov9c.pt-0,0.35,0.5><segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

**Solution**: Strict 11-step compilation order:
1. [shot_type], [depth_of_field], [camera_angle], [composition]
2. [character_1_loRA], [description], [action], [expression], [position]
3. [character_2_loRA], [description], [action], [expression], [position]
4. [location_visual] ← NEW
5. [anchors]
6. [lighting]
7. [atmosphere]
8. [fx]
9. [props]
10. [vehicle]
11. [color_grade] ← NEW
12. <segment_tags>

**Impact**: T5 encoder sees most important tokens first (shot context + characters before environmental details)

---

## Complete Example: Wide Shot, 2 Characters

### v0.20 OUTPUT (~73 tokens)
```
Cat observing, Daniel standing, vault corridor, artificial lighting, cold blue,
tactical readiness. <segment:yolo-face_yolov9c.pt-0,0.35,0.5>, <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

### v0.21 OUTPUT (~167 tokens)
```
wide shot, deep focus, eye-level, two subjects framing vault entrance,
JRUMLV woman, 30 years old, brown hair in loose practical ponytail,
green eyes with gold flecks, lean athletic build with toned midriff visible.
Wearing a fitted grey ribbed tank top and tactical pants falling loosely over combat boots.,
standing, observing, neutral expression, eyes forward, camera-left,
HSCEIA man, 35 years old, 6'2" imposing muscular build, stark white military-cut hair,
green eyes. Wearing a black long-sleeve fitted base layer with sleeves stretched over muscular biceps
and MultiCam woodland camouflage tactical pants.,
standing, observing, neutral expression, eyes forward, camera-right,
massive reinforced steel vault door with biometric locks,
bank of surveillance monitors, medical bay with automated surgical suite,
artificial lighting, screen glow, cold blue lighting,
tension, tactical readiness,
desaturated tactical color grade
<segment:yolo-face_yolov9c.pt-0,0.35,0.5><segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

### Comparison

| Aspect | v0.20 | v0.21 | Improvement |
|--------|-------|-------|------------|
| Shot context | basic | shot + depth + angle | ✅ Better framing |
| Character descriptions | minimal | full with clothing | ✅ Rich detail |
| Location context | none | specific location | ✅ Scene grounding |
| Color treatment | implicit | explicit | ✅ Visual consistency |
| Segment format | broken | correct | ✅ SwarmUI compatible |
| Token efficiency | wasteful | optimized | ✅ Better budget use |
| Total tokens | 73 | 167 | ✅ Target range: 140-182 |

---

## Implementation Files

### Modified
- `types.ts`: Added `locationVisual`, `colorGrade` to VBSEnvironment
- `services/vbsBuilderService.ts`: Added fallback chain, depthOfField logic, location visual & color grade
- `services/vbsCompilerService.ts`: Removed parentheses, fixed segment join, strict order

### Testing
- ✅ vbsBuilderService.test.ts: 24/24 passing
- ✅ vbsCompilerService.test.ts: 34/34 passing
- ✅ test-prompt-rules-validation.ts: 8/8 checks passing

---

## Metrics

**Source State (v0.20)**
- Average tokens per beat: ~73
- Missing elements: depthOfField, locationVisual, colorGrade
- Segment format: Broken (`, ` separator)
- Parentheses: Present (wasteful)
- Compilation order: Inconsistent

**End State (v0.21)**
- Average tokens per beat: ~167 (target: 140-182)
- Missing elements: ✅ FIXED
- Segment format: ✅ Correct (no separator)
- Parentheses: ✅ REMOVED
- Compilation order: ✅ STRICT 11-STEP

**Improvement**: +130% token utilization, 100% of gaps fixed

---

## Validation

All tests passing ✅
- TypeScript: No new errors
- Unit tests: 58/58 passing
- Prompt rules validation: 8/8 checks passing
- Integration: Mock and real context both working

**Status: PRODUCTION READY**

---

**Date**: 2026-02-27
**Version**: v0.21
**Status**: ✅ Complete & Validated
