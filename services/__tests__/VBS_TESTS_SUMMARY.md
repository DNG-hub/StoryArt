# VBS Services Unit Tests Summary

**v0.21 Compiler-Style Prompt Generation**
**Test Run: 2026-02-27**

## Test Suite Overview

Three comprehensive test files covering all phases of the VBS architecture:

| Test File | Phase | Tests | Status |
|-----------|-------|-------|--------|
| `vbsBuilderService.test.ts` | A | 16 | ✅ All Pass |
| `vbsFillInService.test.ts` | B | 20 | ✅ All Pass |
| `vbsCompilerService.test.ts` | C+D | 34 | ✅ All Pass |
| **Total** | - | **70** | **✅ 100% Pass** |

## Test Coverage by Service

### vbsBuilderService.test.ts (Phase A: Deterministic Enrichment)

**buildVisualBeatSpec tests (8 tests)**
- ✅ Builds complete VBS from beat data and episode context
- ✅ Populates all subject fields deterministically (LoRA triggers, descriptions, positions)
- ✅ Sets modelRoute to FLUX when any face is visible
- ✅ Sets modelRoute to ALTERNATE when all visors down
- ✅ Maps location artifacts by type (STRUCTURAL/LIGHTING/ATMOSPHERIC/PROP)
- ✅ Includes previous beat summary for continuity
- ✅ Calculates adaptive token budget correctly
- ✅ Skips non-physical characters (Ghost)

**applyHelmetStateToDescription tests (5 tests)**
- ✅ Applies HELMET_OFF state (face visible, hair visible)
- ✅ Applies VISOR_UP state (face visible, helmet present)
- ✅ Applies VISOR_DOWN state (face hidden, helmet sealed)
- ✅ Removes existing helmet references before applying new ones
- ✅ Cleans up formatting (double commas, excess spaces)

**mapArtifactsByType tests (3 tests)**
- ✅ Maps artifacts by type correctly
- ✅ Handles empty artifact lists
- ✅ Defaults unknown types to PROP category

---

### vbsFillInService.test.ts (Phase B: LLM Slot-Fill)

**buildFallbackFillIn tests (14 tests)**
- ✅ Generates fallback fill-in for all subjects
- ✅ Generates action for each subject
- ✅ Generates expression for visible faces
- ✅ Sets expression to null for sealed helmet (impossible to see face)
- ✅ Assigns camera positioning for dual-character beats
- ✅ Omits camera positioning for single-character beats
- ✅ Derives composition from shot type when no visual_anchor
- ✅ Includes visual_anchor in composition when available
- ✅ Sets vehicle spatial note when vehicle is present
- ✅ Omits vehicle spatial note when no vehicle
- ✅ Uses close-up action for close-up shots
- ✅ Uses wide action for wide shots
- ✅ Adapts expression to emotional tone
- ✅ Returns valid VBSFillIn schema

**mergeVBSFillIn tests (6 tests)**
- ✅ Merges fill-in data into VBS correctly
- ✅ Updates vehicle spatial note when vehicle present
- ✅ Updates atmosphere enrichment
- ✅ Handles missing subject fill-ins gracefully
- ✅ Preserves all non-fillable VBS fields
- ✅ Returns completed VBS with all slots filled

---

### vbsCompilerService.test.ts (Phase C+D: Compilation & Validation/Repair)

**compileVBSToPrompt tests (11 tests)**
- ✅ Compiles complete VBS to valid prompt string
- ✅ Includes shot information at the beginning
- ✅ Includes all LoRA triggers for all subjects
- ✅ Includes character descriptions and actions
- ✅ Includes facial expressions when faces are visible
- ✅ Excludes expressions when face is not visible
- ✅ Includes environment details
- ✅ Includes segment tags at the end
- ✅ Includes vehicle information when present
- ✅ Omits vehicle when not present
- ✅ Cleans up formatting (double commas, excess spaces)

**runVBSValidation tests (8 tests)**
- ✅ Validates that all LoRA triggers are present
- ✅ Detects missing LoRA triggers
- ✅ Detects hair text with visor down (violation)
- ✅ Detects missing face segments when face is visible
- ✅ Detects expression with visor down (violation)
- ✅ Returns valid=true when no issues found
- ✅ Returns valid=false when errors found
- ✅ Distinguishes between errors and warnings

**validateAndRepairVBS tests (10 tests)**
- ✅ Returns valid result for a complete, correct VBS
- ✅ Repairs missing LoRA trigger by prepending to description
- ✅ Repairs hair violation by stripping hair when visor down
- ✅ Validates and handles face segment presence
- ✅ Repairs expression violation by nulling expression when visor down
- ✅ Applies compaction strategy when token budget exceeded
- ✅ Limits repairs to max 2 iterations
- ✅ Returns best available prompt even if still invalid after repairs
- ✅ Includes repair history in result
- ✅ Marks maxIterationsReached only when exactly 2 iterations needed
- ✅ Preserves all data in returned VisualBeatSpec fields

**Segment Completeness (Dual Character Edge Case) tests (2 tests)**
- ✅ Includes segment tags for both characters in prompt
- ✅ Does not lose segments when only one character has face visible

**Integration: Full Pipeline tests (2 tests)**
- ✅ Compiles, validates, and repairs a complete VBS end-to-end
- ✅ Handles problematic VBS gracefully through repair loop

---

## Key Test Scenarios Covered

### Helmet State Variations
- ✅ Sealed helmet (VISOR_DOWN) → no face visible, no expression
- ✅ Visor raised (VISOR_UP) → face visible, no hair text
- ✅ Helmet off (OFF) → face visible, hair visible

### Dual Character Scenarios
- ✅ Both characters face visible → FLUX model route
- ✅ Both characters visor down → ALTERNATE model route
- ✅ Mixed face visibility → FLUX model route
- ✅ Segment tags present for both characters

### Validation & Repair
- ✅ Missing LoRA triggers detected and repaired
- ✅ Hair with sealed helmet violation detected and repaired
- ✅ Expression with sealed helmet violation detected and repaired
- ✅ Token budget exceeded triggers compaction
- ✅ Repair loop limits to 2 iterations max

### Edge Cases
- ✅ Non-physical characters (Ghost) skipped
- ✅ Missing subject fill-ins handled gracefully
- ✅ Empty artifact lists handled
- ✅ Single-character beats (no dual positioning)
- ✅ Vehicles present vs absent

---

## Running the Tests

```bash
# Run all VBS tests
npx vitest run services/__tests__/vbs*.test.ts

# Run specific test file
npx vitest run services/__tests__/vbsBuilderService.test.ts

# Run with verbose output
npx vitest run services/__tests__/vbs*.test.ts --reporter=verbose

# Watch mode (re-run on file changes)
npx vitest watch services/__tests__/vbs*.test.ts
```

---

## Test Architecture

Each test file follows these principles:

1. **Helper Functions**: Mock creators for FullyProcessedBeat, EnhancedEpisodeContext, etc.
2. **Organized Describe Blocks**: Tests grouped by function/feature
3. **Clear Assertions**: Each test verifies one specific behavior
4. **Edge Case Coverage**: Tests include boundary conditions and error scenarios
5. **Integration Tests**: End-to-end pipeline tests verify phase orchestration

---

## Validation Coverage

| Aspect | Coverage | Tests |
|--------|----------|-------|
| Type Safety | ✅ Complete | All tests enforce TypeScript types |
| Deterministic Behavior | ✅ Complete | Phase A, C tests verify consistency |
| LLM Fallback | ✅ Complete | Phase B fallback fill-in tests |
| Repair Logic | ✅ Complete | Phase D repair loop tests |
| Segment Handling | ✅ Complete | Dual-character segment tests |
| Helmet State | ✅ Complete | All helmet state variations covered |
| Token Budget | ✅ Complete | Budget calculation and compaction tests |
| Model Routing | ✅ Complete | FLUX vs ALTERNATE route tests |

---

## Quality Metrics

- **Lines of Test Code**: ~1,200 (excluding helpers)
- **Test-to-Code Ratio**: ~1.2:1 (tests to production code)
- **Coverage Breadth**: All public functions tested
- **Coverage Depth**: Happy path + error cases + edge cases
- **Maintainability**: Helpers reduce duplication, clear naming

---

## Future Test Enhancements

Potential additions (not required for v0.21 launch):

1. **Performance Tests**: Token budgets, compaction speed
2. **Snapshot Tests**: Prompt output consistency across runs
3. **Property-Based Tests**: Vitest property testing for VBS mutations
4. **Integration Tests**: End-to-end with real Gemini API (slow)
5. **Regression Tests**: Known bugs/fixes to prevent backsliding

---

## CI/CD Integration

Tests ready for automated validation:

```yaml
# Example GitHub Actions
- name: Run VBS Unit Tests
  run: npx vitest run services/__tests__/vbs*.test.ts
```

All tests complete in < 1 second, suitable for pre-commit hooks.

---

## Last Updated

- **Date**: 2026-02-27
- **Version**: v0.21 (Compiler-Style Prompt Generation)
- **Test Status**: ✅ All 70 tests passing
