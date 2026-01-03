# Quality Evaluation Rubric for AI-Generated Image Prompts

**Purpose:** Objectively measure prompt quality improvements from Phase B enhancements
**Created:** 2025-11-26
**Version:** 1.0

---

## Evaluation Dimensions

Each prompt is scored on 4 dimensions using a 1-10 scale. Final quality score is the average of all 4 dimensions.

---

### 1. Technical Quality (1-10)

**What it measures:** Prompt construction, parameter accuracy, syntax correctness

| Score | Criteria |
|-------|----------|
| 1-2 | Broken syntax, missing required parameters, invalid model specifications |
| 3-4 | Valid syntax but poor parameter choices, inconsistent formatting |
| 5-6 | Correct syntax and parameters, basic technical competence |
| 7-8 | Well-structured, appropriate parameters, good technical practices |
| 9-10 | Excellent structure, optimal parameters, follows all production standards |

**Key Indicators:**
- ✅ Shot type at start (e.g., "medium shot of a...")
- ✅ Correct LoRA triggers (JRUMLV woman, HSCEIA man)
- ✅ Flux-specific parameters (cfgscale: 1, fluxguidancescale: 3.5)
- ✅ Appropriate dimensions (1344x768 cinematic, 1088x1920 vertical)
- ✅ Facial expression integration
- ✅ Atmosphere-specific lighting

**Example Scoring:**

**Score 3-4:**
```
JRUMLV woman in tactical gear at facility
```
*Too minimal, missing shot type, no facial expression, no lighting*

**Score 7-8:**
```
medium shot of a JRUMLV woman (tactical field gear, combat boots), alert expression on her face, dramatic tactical lighting on face, high contrast face shadows, moving through bombed-out facility interior
```
*Good technical structure, includes key elements*

**Score 9-10:**
```
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters), alert, tactical expression on her face, moving through server room interior with pulverized concrete debris and scattered construction materials, dramatic tactical lighting on face, high contrast face shadows, flickering red emergency lights and glowing biohazard symbols on the walls, rows of server racks with blinking status lights, volumetric dust creating shafts of light, desaturated color grade, <segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```
*Excellent: shot type, detailed character, location artifacts, lighting, YOLO segments*

---

### 2. Narrative Depth (1-10)

**What it measures:** How well the prompt captures story context, character development, thematic elements

| Score | Criteria |
|-------|----------|
| 1-2 | Generic description with no story context, could be any character in any setting |
| 3-4 | Basic character/location identification but no narrative specificity |
| 5-6 | Some story elements present (character role, location purpose) but shallow |
| 7-8 | Clear narrative context, character state, location significance evident |
| 9-10 | Rich narrative integration: themes visible, character arc apparent, story world evident |

**Key Indicators:**
- ✅ Character demeanor reflects story moment (alert vs. vulnerable vs. determined)
- ✅ Location details support narrative (abandoned vs. operational, post-collapse evidence)
- ✅ Relationship dynamics visible (professional distance, tension, trust)
- ✅ Thematic elements present (survival, truth vs. lies, duty vs. desire)
- ✅ Story-specific details (medical ethics, military precision, moral complexity)

**Example Scoring:**

**Score 3-4:**
```
woman in tactical gear in a facility
```
*No narrative depth, generic*

**Score 7-8:**
```
JRUMLV woman, alert and focused investigator, examining anomalous blast patterns with determination, in abandoned CDC data center showing evidence of chaotic evacuation
```
*Character role clear (investigator), location purpose evident (CDC, evacuation), narrative moment present (examining anomaly)*

**Score 9-10:**
```
JRUMLV woman, skeptical medical investigator with dawning realization on her face, driven by pursuit of truth despite official narrative suppression, kneeling in blast crater examining twisted steel rebar with high-tech scanner emitting blue laser grid showing anomalous energy signature contradicting official story, intense focus in her eyes with slight furrowing of brow suggesting internal conflict between data and authority, in abandoned CDC archive and data center now ghost town of sterile server rooms with emergency lights casting long shadows down silent corridors and abandoned terminals hinting at chaotic evacuation, professional boundaries maintained despite growing awareness of larger conspiracy
```
*Rich narrative: character motivation (truth seeker), internal conflict (data vs. authority), thematic elements (truth vs. official narrative), story-specific context (CDC, conspiracy), relationship dynamics (professional boundaries)*

---

### 3. Emotional Impact (1-10)

**What it measures:** Ability to convey mood, atmosphere, character emotional state visually

| Score | Criteria |
|-------|----------|
| 1-2 | No emotional content, flat description |
| 3-4 | Minimal emotional cues, atmosphere unclear |
| 5-6 | Basic mood established, some emotional indicators |
| 7-8 | Strong emotional tone, clear character state, effective atmosphere |
| 9-10 | Powerful emotional resonance, layered mood, complex character emotion, visceral atmosphere |

**Key Indicators:**
- ✅ Facial expressions convey complex emotion (not just "alert" but "skeptical determination")
- ✅ Body language suggests psychological state (guarded stance, protective posture)
- ✅ Lighting creates mood (harsh medical, dramatic tactical, soft vulnerable)
- ✅ Environmental details enhance emotion (silence, shadows, chaos remnants)
- ✅ Tension/conflict visible (suppressed attraction, professional distance, moral weight)

**Example Scoring:**

**Score 3-4:**
```
woman in tactical gear standing in facility
```
*No emotional content*

**Score 7-8:**
```
JRUMLV woman, alert expression on her face, tense shoulders and guarded stance, in eerie silent facility with emergency lights casting ominous shadows, dramatic tactical lighting creating high contrast on her face
```
*Clear emotional state (alert, tense, guarded), atmospheric mood (eerie, ominous), lighting supports emotion*

**Score 9-10:**
```
JRUMLV woman, concentrated skeptical expression with dawning realization on her face, subtle vulnerability breaking through professional mask, slight furrowing of brow suggesting internal conflict between instinct and training, tense but not rigid posture reflecting controlled wariness, in oppressively silent abandoned facility where emergency lights cast long foreboding shadows down sterile corridors creating sense of isolation and wrongness, volumetric dust particles suspended in air catching light like frozen time at moment of evacuation, harsh clinical lighting battling dramatic shadows creating visual tension mirroring her internal struggle, desaturated color grade emphasizing bleak atmosphere except for scanner's blue light as only hope/truth source
```
*Complex layered emotion (skepticism + realization + vulnerability + conflict), rich atmospheric detail (oppressive silence, frozen time, visual tension), lighting as metaphor (truth light vs. shadows), multiple emotional registers*

---

### 4. Marketing Appeal (1-10)

**What it measures:** Thumbnail-worthiness, hook potential, viral-ability, compositional drama

| Score | Criteria |
|-------|----------|
| 1-2 | Unmarketable, no visual interest, poor composition |
| 3-4 | Minimal interest, weak composition, no hook |
| 5-6 | Acceptable but forgettable, basic composition |
| 7-8 | Strong visual interest, good composition, has hook potential |
| 9-10 | Highly marketable, dramatic composition, multiple hooks, thumbnail-perfect |

**Key Indicators:**
- ✅ Rule of Thirds composition (focal points at power points)
- ✅ Leading lines (draws eye to subject)
- ✅ High contrast (pops in thumbnail)
- ✅ Clear focal point (immediate visual hierarchy)
- ✅ Dramatic action or revelation moment (click-worthy)
- ✅ Emotional intensity in face (human connection)
- ✅ Visual hooks (glowing elements, weapons, technology, mystery)

**Example Scoring:**

**Score 3-4:**
```
woman standing in facility
```
*No marketing appeal, static composition*

**Score 7-8:**
```
medium shot of JRUMLV woman examining glowing anomaly with intense focus, dramatic lighting creating high contrast, Rule of Thirds composition with her face and glowing scanner as focal points
```
*Good composition, visual hook (glowing anomaly), dramatic lighting, clear focal points*

**Score 9-10:**
```
medium shot of JRUMLV woman in center-left power point, kneeling in blast crater examining twisted steel rebar with high-tech scanner emitting dramatic blue laser grid (leading lines toward her face), scanner's readout showing anomalous energy signature in bright contrasting blue against desaturated environment (visual hook), concentrated skeptical expression with dawning realization on her face (emotional hook - "what did she discover?"), grime-streaked face with dust particles illuminated in air creating atmospheric depth, dramatic tactical lighting on face creating high contrast face shadows for thumbnail pop, volumetric dust creating shafts of light forming leading lines, Rule of Thirds composition with her face at top-right intersection and scanner readout at bottom-left intersection creating visual tension and balance, desaturated color grade with scanner's blue light as only vibrant color accent drawing eye immediately (color as focal point strategy), background shows abandoned server racks creating depth and context without competing with subject, overall composition creates compelling thumbnail with clear subject, multiple visual hooks (what is she finding? why the shock? what's glowing?), and dramatic lighting/contrast for social media feeds
```
*Exceptional marketing appeal: Rule of Thirds explicitly applied, multiple visual hooks (glowing scanner, shocked expression, mysterious anomaly), leading lines, dramatic contrast for thumbnail, color strategy (desaturated + accent), emotional hook (revelation expression creates curiosity), compositional balance, social media optimized*

---

## Scoring Guidelines

### How to Evaluate

1. **Score each dimension independently** (don't let one dimension influence another)
2. **Use half-points if needed** (e.g., 7.5 if between 7 and 8)
3. **Compare to examples** above for calibration
4. **Be consistent** across all prompts being evaluated

### Calculating Final Score

```
Final Score = (Technical + Narrative + Emotional + Marketing) / 4
```

**Example:**
- Technical: 8
- Narrative: 7
- Emotional: 9
- Marketing: 8
- **Final: 8.0/10**

### Interpretation

| Final Score | Interpretation |
|-------------|----------------|
| 1-3 | Poor quality - significant problems |
| 4-5 | Below average - needs improvement |
| 6-7 | Acceptable - functional but basic |
| 7-8 | Good - solid quality |
| 8-9 | Excellent - high quality |
| 9-10 | Outstanding - exceptional |

---

## Baseline vs. Enhanced Comparison

### Baseline (Current System - No Episode Context)

**Expected scores:** 6-7 range
- Technical: 7-8 (good production standards already)
- Narrative: 5-6 (beat-level context only, limited narrative depth)
- Emotional: 6-7 (character demeanor from location contexts)
- Marketing: 6-7 (basic composition, limited hooks)

### Enhanced (Phase B - With Story Context)

**Target scores:** 7.8+ range (20% improvement)
- Technical: 7-8 (maintained)
- Narrative: 7-8 (**+2 points** - thematic depth, story framework)
- Emotional: 7-8 (**+1 point** - tone guidance enriches atmosphere)
- Marketing: 7-8 (**+1 point** - theme-based hooks, narrative appeal)

### Success Criteria

**Primary Goal Achieved If:**
- Final score improves by ≥20% (6.5 → 7.8+) OR
- Narrative dimension improves by ≥2 points (5.5 → 7.5+)

---

## Prompt Richness Metrics (Automated)

In addition to manual quality scoring, track these automated metrics:

### Character Count
- **Baseline expected:** ~200-250 characters
- **Enhanced target:** 260-325+ characters (30% increase)

### Narrative Element Count
Count occurrences of:
- Theme keywords (truth, survival, duty, desire, redemption, integrity, etc.)
- Emotional descriptors (skeptical, determined, vulnerable, conflicted, etc.)
- Story-specific terms (medical ethics, military honor, collapse, conspiracy, etc.)
- Relationship indicators (professional distance, suppressed tension, trust, etc.)

**Baseline expected:** 2-3 narrative elements per prompt
**Enhanced target:** 4-6+ narrative elements per prompt (50%+ increase)

---

## Usage

### For Baseline Measurement (Task 1.2)

1. Generate 10 prompts with current system
2. Score each on all 4 dimensions
3. Calculate average final score
4. Count automated metrics (char count, narrative elements)
5. Save as `baseline-measurements.json`

### For Phase B Validation (Task 6.4)

1. Generate 10 prompts with enhanced system (same beats as baseline)
2. Score each on all 4 dimensions
3. Calculate average final score
4. Compare to baseline
5. Determine if ≥20% improvement achieved

---

**Version:** 1.0
**Created:** 2025-11-26
**Status:** Ready for Use
