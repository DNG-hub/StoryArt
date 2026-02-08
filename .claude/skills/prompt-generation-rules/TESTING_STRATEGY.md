# TESTING STRATEGY FOR PROMPT GENERATION SKILL

**Created:** 2026-01-30
**Purpose:** Define testing approach for iterative skill validation

---

## 1. TESTING PHILOSOPHY

**Recommendation: Ad Hoc Scripts First, Then In-App Integration**

| Phase | Approach | When to Use |
|-------|----------|-------------|
| **Phase 1** | Ad hoc Python scripts | Initial iteration, component testing |
| **Phase 2** | Minimal test JSON | Full pipeline validation |
| **Phase 3** | In-app integration | Production deployment |

### Why Ad Hoc First

1. **Faster feedback** - No app startup, direct function calls
2. **Isolated testing** - Test components without dependencies
3. **Easier debugging** - Direct output inspection
4. **Iterative refinement** - Change and re-run in seconds

---

## 2. MINIMAL TEST SUBSET

### Episode 2 Test Matrix

Episode 2 provides perfect coverage of all gear paths:

| Scene | Title | gear_context | Path | Test Purpose |
|-------|-------|--------------|------|--------------|
| 1 | The Seven Dots | off_duty | SIMPLE | Basic trigger substitution, location artifacts |
| 2 | The Red Line | suit_up | FULL | Gear fragment assembly, no helmet |
| 3 | The Breadcrumb | field_op | FULL | Full gear + helmet states |
| 4 | The Abandoned Clinic | field_op | FULL | Field op, different location |

### Required Test Beats (Minimum Viable)

**Beat 1.1 - Single Character Off-Duty (SIMPLE_PATH)**
```
Scene: 1 (The Seven Dots)
Characters: Cat only
Gear: off_duty
Location: MMB
Expected: swarmui_prompt_override used verbatim, no gear logic
```

**Beat 1.2 - Dual Character Off-Duty (SIMPLE_PATH)**
```
Scene: 1 (The Seven Dots)
Characters: Cat + Daniel
Gear: off_duty
Location: MMB
Expected: Both overrides, dual face segments
```

**Beat 2.1 - Suit-Up Stage (FULL_PATH, no helmet)**
```
Scene: 2 (The Red Line)
Characters: Cat (suit-up pose)
Gear: suit_up
Location: MMB
Expected: SUIT_UP gear fragments, hair visible, face segment
```

**Beat 3.1 - Field Op with Helmet Off (FULL_PATH)**
```
Scene: 3 (The Breadcrumb)
Characters: Daniel
Gear: field_op
Helmet: OFF
Expected: Aegis suit fragments, hair visible, face segment
```

**Beat 3.2 - Field Op with Helmet Visor Down (FULL_PATH)**
```
Scene: 3 (The Breadcrumb)
Characters: Cat
Gear: field_op
Helmet: ON_VISOR_DOWN
Expected: Aegis suit, NO hair, NO face segment
```

**Beat 4.1 - Environment Only (No Character)**
```
Scene: 4 (The Abandoned Clinic)
Characters: None
Gear: N/A
Location: Derelict Medical Clinic
Expected: Environment template, location artifacts, no segments
```

---

## 3. AD HOC TEST SCRIPT STRUCTURE

### Script Location
```
scripts/prompt_generation_tests/
├── test_trigger_substitution.py
├── test_gear_fragment_assembly.py
├── test_location_artifacts.py
├── test_full_pipeline.py
└── test_data/
    └── episode_2_minimal_test.json
```

### Test Script Template
```python
"""
Ad hoc test for [COMPONENT]
Run: python scripts/prompt_generation_tests/test_[component].py
"""
import json
from pathlib import Path

# Import the service being tested
from app.services.[service] import [Service]

def test_[function]():
    """Test [specific behavior]"""

    # Load test data
    test_data = json.loads(Path("test_data/episode_2_minimal_test.json").read_text())

    # Execute function
    result = [function_call]

    # Validate result
    assert [condition], f"Expected [x], got {result}"

    # Print for visual inspection
    print(f"SUCCESS: {result}")

if __name__ == "__main__":
    test_[function]()
```

### Expected Test Output

Each test should print:
1. **Input summary** - What data was provided
2. **Output prompt** - The generated prompt
3. **Validation** - Pass/fail with reason
4. **Debug info** - Intermediate JSON (when verbose)

---

## 4. TEST DATA FORMAT

### Minimal Test JSON Schema

```json
{
  "test_suite": "Episode 2 Minimal Test",
  "story_id": "59f64b1e-726a-439d-a6bc-0dfefcababdb",
  "episode_number": 2,
  "test_beats": [
    {
      "test_id": "single_character_off_duty",
      "scene_number": 1,
      "beat_number": 1,
      "test_purpose": "SIMPLE_PATH - single character with override",
      "input": {
        "characters": ["Cat"],
        "gear_context": "off_duty",
        "location": "Mobile Medical Base",
        "cameraAngleSuggestion": "Medium shot on Cat",
        "characterPositioning": "seated at terminal",
        "emotional_tone": "analytical focus"
      },
      "expected": {
        "path_taken": "SIMPLE",
        "trigger_present": "JRUMLV woman",
        "hair_in_prompt": true,
        "face_segment_present": true,
        "clothing_segment_present": true,
        "gear_fragments_used": false
      }
    }
  ]
}
```

---

## 5. VALIDATION CHECKLIST

### For Each Test Beat

- [ ] Correct trigger word substituted
- [ ] Correct path taken (SIMPLE vs FULL)
- [ ] Hair present/absent based on helmet state
- [ ] Face segment present/absent based on visibility
- [ ] Clothing segment matches description
- [ ] Location shorthand from artifacts (not verbose)
- [ ] Shot type from FLUX vocabulary
- [ ] Prompt under 500 tokens
- [ ] Segments at END of prompt

### Path-Specific Checks

**SIMPLE_PATH:**
- [ ] swarmui_prompt_override used verbatim
- [ ] No gear fragment assembly called
- [ ] No helmet state checking

**FULL_PATH:**
- [ ] Gear fragments assembled by priority
- [ ] Helmet state determines hair/face
- [ ] Alert level color applied (if field_op)

---

## 6. ITERATION WORKFLOW

```
1. Run ad hoc test
2. Inspect output (visual + assertions)
3. If FAIL:
   a. Check which validation failed
   b. Update skill rule or service code
   c. Re-run test
4. If PASS:
   a. Add to regression suite
   b. Move to next test case
5. When all ad hoc tests pass:
   a. Create minimal test JSON
   b. Run full pipeline test
   c. Integrate into app
```

---

## 7. INTEGRATION MILESTONES

### Milestone 1: Component Tests Pass
- [ ] Trigger substitution works for all characters
- [ ] Gear fragment assembly works for Cat and Daniel
- [ ] Location artifact selection works for MMB
- [ ] FLUX vocabulary validation works

### Milestone 2: Full Pipeline Tests Pass
- [ ] SIMPLE_PATH end-to-end works
- [ ] FULL_PATH end-to-end works
- [ ] Dual character prompts work
- [ ] Environment-only prompts work

### Milestone 3: In-App Integration
- [ ] StoryArt context service provides correct data
- [ ] Prompt generator produces correct output
- [ ] SwarmUI accepts generated prompts
- [ ] Generated images match expectations

---

## 8. DATA SOURCE VALIDATION

Before running tests, verify data exists in database:

```sql
-- Check Cat's trigger
SELECT name, lora_trigger FROM characters WHERE name ILIKE '%cat%mitchell%';
-- Expected: JRUMLV woman

-- Check Daniel's trigger
SELECT name, lora_trigger FROM characters WHERE name ILIKE '%daniel%';
-- Expected: HSCEIA man

-- Check Cat's location contexts exist
SELECT loc.name, clc.swarmui_prompt_override
FROM character_location_contexts clc
JOIN location_arcs loc ON clc.location_arc_id = loc.id
JOIN characters c ON clc.character_id = c.id
WHERE c.name ILIKE '%cat%mitchell%';

-- Check gear fragments exist
SELECT fragment_type, COUNT(*)
FROM gear_fragments
GROUP BY fragment_type;
```

---

## CHANGELOG

| Date | Change |
|------|--------|
| 2026-01-30 | Initial testing strategy document |
