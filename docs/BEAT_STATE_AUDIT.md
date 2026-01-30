# Beat State Implementation Audit

## SKILL.md Rules vs Current Implementation

**Date:** 2026-01-30
**Purpose:** Gap analysis between SKILL.md requirements and beatStateService implementation

---

## IMPLEMENTED (in beatStateService.ts)

| Section | Rule | Status | Notes |
|---------|------|--------|-------|
| 4.5 | Action carryover between beats | DONE | Carries `characterPositioning` |
| 4.5 | Expression carryover between beats | DONE | Carries `emotional_tone` |
| 4.5 | Scene boundary state reset | DONE | State resets per scene |
| 4.7 | Shot type monotony detection | DONE | Flags 3+ same shots |
| 4.7 | Alternative shot suggestion | PARTIAL | Basic alternatives only |

---

## NOT IMPLEMENTED (Critical Gaps)

### 1. FLUX Vocabulary Validation (Section 5)

**Issue:** We detect monotony but don't validate that terms are FLUX-compliant.

| Vocabulary Type | Terms Defined | Currently Validated |
|-----------------|---------------|---------------------|
| Shot Types | 17 terms | NO |
| Camera Angles | 12 terms | NO |
| Pose Descriptions | 20+ terms | NO |
| Expression Keywords | 14 categories | PARTIAL (basic mapping) |
| Lighting | 18 terms | NO |
| View Directions | 8 terms | NO |
| Gaze Directions | 11 terms | NO |

**Required:**
- Map input terms to closest FLUX vocabulary match
- Reject/warn on non-FLUX terms
- Expose validated vocabulary for prompt generation

---

### 2. Time of Day -> Lighting (Section 13.2)

**Issue:** Scene `time_of_day` should override lighting selection.

| Time | Expected Lighting Keywords |
|------|----------------------------|
| Pre-dawn | `blue hour, cold light` |
| Morning | `soft natural lighting, warm` |
| Midday | `harsh overhead, high contrast` |
| Golden hour | `golden hour, warm amber` |
| Dusk | `blue hour, fading light` |
| Night (interior) | `artificial lighting, screen glow` |
| Night (exterior) | `moonlight, deep shadows` |

**Required:**
- Accept `time_of_day` from scene metadata
- Apply lighting override based on time
- Pass to prompt generation

---

### 3. Scene Intensity & Pacing (Section 11A.3-11A.6)

**Issue:** Scene `intensity_arc` and `pacing` should affect visual treatment.

| Intensity Arc | Shot Types | Lighting | Expressions |
|---------------|------------|----------|-------------|
| `calm` (1-3) | Wide, medium | Soft, natural | Neutral, relaxed |
| `building` (4-6) | Medium, cowboy | Standard | Alert, focused |
| `peak` (7-9) | Close-up, low angle | Dramatic, rim | Intense, determined |
| `falling` (4-6) | Medium, wide | Soft, warm | Reflective, tired |
| `resolved` (1-3) | Wide | Peaceful | Soft, content |

| Pacing | Visual Implication |
|--------|-------------------|
| `slow` | Wide framing, contemplative |
| `measured` | Standard variety, balanced |
| `brisk` | Tighter framing |
| `frenetic` | Extreme close-ups, action poses, dramatic angles |

**Required:**
- Accept `intensity_arc` and `pacing` from scene metadata
- Adjust shot type preferences based on intensity
- Adjust expression defaults based on pacing

---

### 4. YouTube 8-4-4-3 Format (Section 11A.1-11A.2)

**Issue:** Scene roles should affect visual treatment.

| Scene | Timing | Role | Shot Preference | Pacing |
|-------|--------|------|-----------------|--------|
| 1 | 0-8min | setup_hook | Wide/establishing → medium | Measured |
| 2 | 8-12min | development | Mixed variety | Dialog-driven |
| 3 | 12-16min | escalation | Tightening over scene | Increasing |
| 4 | 16-19min | climax/resolution | Close-ups, dramatic | Rapid or pause |

**Beat Count Guidelines:**
- 19-minute episode = 1140 seconds
- Target: 30-60 beats (varies by scene complexity)
- Average beat: 19-38 seconds

**Required:**
- Validate beat count per scene
- Apply scene role visual treatment
- Handle ad break moment (Scene 1 near 8 min)

---

### 5. Arc Phase Visual Mapping (Section 11.1-11.3)

**Issue:** Story arc phase should affect framing intensity.

| Phase | Visual Intensity | Framing Tendency |
|-------|------------------|------------------|
| DORMANT | Neutral, background | Standard shots |
| RISING | Building tension | Tighter framing |
| CLIMAX | Maximum intensity | Close-ups, dramatic |
| FALLING | Consequences | Softer, reflective |
| RESOLVED | Closure | Wide shots, peaceful |

**Required:**
- Accept `arc_phase` from context
- Adjust visual intensity multiplier
- Modify shot selection based on phase

---

### 6. Character-Specific Expression Vocabulary (Section 12.2)

**Issue:** Each character has unique expression patterns.

**Cat Mitchell (Clinical/Analytical):**
- Default: `analytical gaze, intense focus`
- Stressed: `suppressed fear, clinical mask`
- Vulnerable: `soft expression, guard lowered`

**Daniel O'Brien (Tactical/Guarded):**
- Default: `stoic expression, alert`
- Protective: `protective stance, watchful`
- Haunted: `averted eyes, suppressed emotion`

**2K (Terse/Reserved):**
- Default: `guarded expression, calculating`
- Trust moment: `subtle softening, eye contact`

**Required:**
- Map character name to expression vocabulary
- Apply character-specific defaults
- Override only when beat explicitly specifies different tone

---

### 7. Visual Hooks (Section 11B)

**Issue:** Beat 1 should have enhanced visual interest for retention.

**Hook Types:**
- Provocative Pose
- Intimate Framing
- Unexplained Element
- Action Freeze
- Tension Between
- Environmental Dread
- Object Focus

**Required:**
- Flag Beat 1 as `is_hook_beat`
- Suggest hook-appropriate framing
- Consider scene intensity for hook effort

---

### 8. Helmet State / Hair Suppression (Section 3.5-3.6)

**Issue:** Gear context affects what's visible.

| Helmet State | Hair in Prompt | Face Segment |
|--------------|----------------|--------------|
| Off | YES | YES |
| In hand | YES | YES |
| On, visor UP | NO | YES |
| On, visor DOWN | NO | NO |

**Required:**
- Accept `helmet_state` from beat/scene
- Suppress hair fragments when helmet on
- Suppress face segment when visor down

---

### 9. Beat Duration Validation (Section 14.2)

**Issue:** Beats should have reasonable duration.

| Format | Min Duration | Max Duration | Images/Min |
|--------|--------------|--------------|------------|
| Long-form (19 min) | 15 sec | 5 min | 4-12 |
| Shorts (60 sec) | 2 sec | 15 sec | 4-30 |

**Required:**
- Validate beat count produces reasonable durations
- Warn if too many/few beats for scene length

---

### 10. Anti-Monotony Beyond Shot Type (Section 14.4)

**Issue:** We only check shot type repetition.

**Additional Rules:**
1. Expression must change if emotional tone changes
2. Pose/action must change every 2-3 beats minimum
3. Location elements rotate (don't show same artifacts repeatedly)
4. Lighting can shift within scene for dramatic effect

**Required:**
- Track expression changes
- Track pose/action changes
- Flag beats that violate additional monotony rules

---

## PRIORITY ORDER FOR IMPLEMENTATION

| Priority | Component | Reason |
|----------|-----------|--------|
| 1 | FLUX Vocabulary Validation | Core quality - invalid terms = bad prompts |
| 2 | Time of Day Lighting | Already in scene metadata, easy win |
| 3 | Scene Intensity/Pacing | High visual impact |
| 4 | Character-Specific Expressions | Improves character consistency |
| 5 | Arc Phase Mapping | Enhances dramatic pacing |
| 6 | YouTube Beat Count Validation | Quality assurance |
| 7 | Visual Hooks | Retention optimization |
| 8 | Helmet/Hair Suppression | Already partially in promptGen |
| 9 | Extended Anti-Monotony | Polish |

---

## PROPOSED ARCHITECTURE

```
beatStateService.ts (current)
├── Carryover state tracking
└── Basic variety tracking

sceneContextService.ts (NEW)
├── Time of day -> lighting mapping
├── Scene role -> visual treatment
├── Intensity arc -> shot preferences
├── Pacing -> framing guidance
└── Beat count validation

fluxVocabularyService.ts (NEW)
├── Vocabulary constants (from FLUX_VOCABULARY.md)
├── Term validation
├── Closest-match mapping
└── Term suggestion for invalid inputs

characterExpressionService.ts (NEW)
├── Character-specific expression defaults
├── Emotional tone -> FLUX expression mapping
└── Deception tells (physical)

visualHookService.ts (NEW)
├── Hook type selection based on scene content
├── Beat 1 enhancement
└── Hook + intensity interaction
```

---

## NEXT STEPS

1. Create `fluxVocabularyService.ts` with validated term constants
2. Extend `beatStateService.ts` to use FLUX vocabulary
3. Create `sceneContextService.ts` for scene-level visual rules
4. Create `characterExpressionService.ts` for character-specific defaults
5. Add comprehensive tests for each service
6. Integration test with Episode 2 data
