# IMAGE PROMPT GENERATION RULES
## Skill Definition v0.19

**Purpose:** Constrain and govern the programmatic generation of SwarmUI image prompts.
**Authority:** This skill supersedes all prior prompt generation documentation.
**Scope:** Story-agnostic rules with Cat & Daniel as reference implementation.
**Status:** Draft - Iterating through validation

---

## 1. TARGET OUTPUT STRUCTURES

### 1.1 Character Beat (Primary Template)

For beats featuring characters with LoRAs:

```
[SHOT_TYPE] of a [TRIGGER] ([CHARACTER_DESCRIPTION]) [ACTION], [EXPRESSION], in [LOCATION_SHORTHAND], [LIGHTING], [ATMOSPHERE] <clothing_segment> <face_segment>
```

### 1.2 Environment-Only Beat (No Characters)

For establishing shots, evidence macro, atmosphere shots:

```
[SHOT_TYPE] of [SUBJECT_DESCRIPTION], in [LOCATION_SHORTHAND], [LIGHTING], [ATMOSPHERE]
```

**Examples:**
- `macro shot of twisted steel rebar molten and curled inward, in bombed hospital corridor, harsh forensic lighting, volumetric dust`
- `establishing shot of skeletal building remains against orange sky, in Atlanta ruins, golden hour silhouettes, haunted atmosphere`
- `close shot of terminal screen with green text flickering, in server vault, cold blue screen glow, tech-horror`

### 1.3 Character Without LoRA

For background characters or characters without trained LoRAs:

```
[SHOT_TYPE] of a [GENERIC_DESCRIPTION] [ACTION], [EXPRESSION], in [LOCATION_SHORTHAND], [LIGHTING], [ATMOSPHERE]
```

**Note:** No trigger word, no face segment. Use generic descriptors like "a soldier", "a medical technician", "a hooded figure".

### Position Rules (Character Beat)

| Pos | Component | Required | Source Type | Notes |
|-----|-----------|----------|-------------|-------|
| 1 | Shot Type | YES | `beat.styleGuide.camera` | Pre-computed from beat analysis |
| 2 | Trigger | IF LoRA | Database | `Character.lora_trigger` exact match |
| 3 | Character Description | YES | Database | GearFragment + Context assembly |
| 4 | Action | YES | `beat.fluxPose` or LLM | Carries over between beats |
| 5 | Expression | IF face visible | `beat.fluxExpression` or LLM | Skip if helmet visor down |
| 6 | Location Shorthand | YES | Database | 2-3 STRUCTURAL artifacts max |
| 7 | Lighting | YES | `beat.styleGuide.lighting` | Pre-computed lighting direction |
| 8 | Atmosphere | YES | `beat.styleGuide.atmosphere` | Environmental mood keywords |
| 9 | Clothing Segment | IF defined | Database | Bound to description |
| 10 | Face Segment | IF face visible | Database | Only when face is visible |

### 1.4 StyleGuide Field Mapping (NEW)

Each beat includes a `styleGuide` object with pre-computed cinematic direction:

| StyleGuide Field | Usage | Example |
|------------------|-------|---------|
| `styleGuide.camera` | Shot type at START of prompt | "close-up shot, shallow depth of field" |
| `styleGuide.lighting` | Lighting direction at END before segments | "dramatic rim light" |
| `styleGuide.environmentFX` | Visual effects | "volumetric dust, desaturated color grade" |
| `styleGuide.atmosphere` | Environmental mood | "tense", "clinical", "post-apocalyptic" |

**Priority Chain for Shot Type:**
1. `beat.fluxShotType` (FLUX-validated) → highest priority
2. `beat.suggestedShotType` (variety-adjusted) → if variety rules applied
3. `beat.cameraAngleSuggestion` (original) → fallback

**Example Beat with StyleGuide:**
```json
{
  "beatId": "s1-b2",
  "beat_script_text": "Cat examines the terminal...",
  "styleGuide": {
    "camera": "close-up shot, shallow depth of field",
    "lighting": "cold blue screen glow, dramatic rim light",
    "environmentFX": "volumetric dust",
    "atmosphere": "tense, investigative"
  },
  "fluxExpression": "analytical gaze, focused intensity",
  "fluxPose": "leaning forward, examining screen"
}
```

**Resulting Prompt:**
```
close-up shot, JRUMLV woman (30 years old, dark brown hair, practical ponytail, green eyes, lean athletic build, wearing tactical vest) leaning forward examining screen, analytical gaze focused intensity, server room terminal banks, cold blue screen glow dramatic rim light, volumetric dust <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

---

## 2. DATA SOURCES

### 2.1 Database Tables (Source of Truth)

| Component | Table | Field(s) |
|-----------|-------|----------|
| Trigger | `characters` | `lora_trigger` |
| LoRA Weight | `characters` | `lora_weight` |
| Character Base | `characters` | age, build, physical attributes |
| Gear Fragments | `gear_fragments` | `prompt_fragment`, `segment_syntax`, `fragment_type`, `priority` |
| Location Context | `character_location_contexts` | `clothing_description`, `hair_description`, `swarmui_prompt_override` |
| Location Anchors | `location_artifacts` | `swarmui_prompt_fragment` where `artifact_type=STRUCTURAL` |
| Lighting | `location_artifacts` | `swarmui_prompt_fragment` where `artifact_type=LIGHTING` |
| Atmosphere | `location_artifacts` | `swarmui_prompt_fragment` where `artifact_type=ATMOSPHERIC` |

### 2.2 GearFragment Types

| Type | Purpose | Character-Specific |
|------|---------|-------------------|
| `BASE_SUIT` | Core suit/clothing description | YES |
| `HAIR` | Hairstyle variants | YES |
| `HELMET` | Helmet states | NO (universal) |
| `ACCESSORY` | Weapons, gear, props | YES |
| `SUIT_UP` | Complete suit-up stage prompts | YES |
| `SUIT_PRESENT` | Suit displayed but not worn | YES |

### 2.3 LocationArtifact Types

| Type | Purpose | Pick Count |
|------|---------|------------|
| `STRUCTURAL` | Physical anchors (walls, debris, equipment) | 2-3 max |
| `LIGHTING` | Light source and quality | 1 |
| `ATMOSPHERIC` | Environmental effects, mood | 1 |
| `PROP` | Scene-specific objects | As needed |

---

## 3. ASSEMBLY RULES

### 3.0 Story-Level Efficiency Check (RUN FIRST)

**This skill is story-agnostic.** Not all stories have tactical gear systems.

**Before processing an episode, determine applicable rule sets:**

```
STORY-LEVEL CHECK:
├─ Does story have characters with gear_fragments?
│   ├─ NO → Mark story as SIMPLE_PATH (skip all gear logic for all episodes)
│   └─ YES → Continue to episode check
│
EPISODE-LEVEL CHECK:
├─ Which characters appear in this episode?
│   ├─ None with gear systems → SIMPLE_PATH for episode
│   └─ Some with gear systems → Check scene-by-scene
│
SCENE-LEVEL CHECK:
├─ gear_context for this scene?
│   ├─ off_duty / null → SIMPLE_PATH for scene
│   └─ suit_up / field_op → FULL_PATH for scene
```

**Rule Sets by Path:**

| Path | Applies | Skip |
|------|---------|------|
| **SIMPLE_PATH** | Trigger substitution, location artifacts, segments | Gear fragments, helmet states, hair suppression, alert levels |
| **FULL_PATH** | All rules | Nothing |

**Cat & Daniel Story:**
- Episodes 1-75: Mix of SIMPLE and FULL depending on scene
- Scenes at MMB (off_duty): SIMPLE_PATH
- Scenes in field (field_op): FULL_PATH
- Scenes with Webb/Chen/2K only: SIMPLE_PATH (no gear systems)

**Other Stories:**
- If no `gear_fragments` table entries → SIMPLE_PATH for entire story
- Gear logic is an EXTENSION, not a requirement

### 3.1 Character Description Assembly

**Order** (by GearFragment.priority, ascending):

1. Base physical (age, build, features) from Character model
2. Hair state from GearFragment type=HAIR (skip if helmet ON)
3. Clothing/Gear from GearFragment type=BASE_SUIT or swarmui_prompt_override
4. Accessories from GearFragment type=ACCESSORY

**Format:**
```
([age] years old, [hair], [eyes], [build], wearing [clothing], [accessories])
```

**Override Rule:** If `CharacterLocationContext.swarmui_prompt_override` exists, use it VERBATIM. Do not modify, paraphrase, or "improve."

### 3.2 Location Shorthand Assembly

**CONSTRAINT:** Maximum 5 elements total.

**Formula:**
```
[2-3 STRUCTURAL anchors] + [1 LIGHTING signature] + [1 ATMOSPHERE word]
```

**Selection:** Use artifacts where `always_present=True` for the location.

**Format:**
```
in [anchor1] with [anchor2], [lighting], [atmosphere]
```

### 3.3 Segment Syntax Rules

- ONLY include for frames containing human faces
- ALWAYS place at END of prompt
- NO SPACES in segment syntax
- Post-processing MUST re-inject segments (LLMs may strip them)

**Format:**
```
<segment:yolo-face_yolov9c.pt-INDEX,CREATIVITY,THRESHOLD>
```

**Default Values:**
- INDEX: 0 (leftmost face), 1 (second from left), etc.
- CREATIVITY: 0.35
- THRESHOLD: 0.5

**Single Character:**
```
<segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

**Dual Character (specify left/right in prompt text):**
```
<segment:yolo-face_yolov9c.pt-0,0.35,0.5>TRIGGER1 <segment:yolo-face_yolov9c.pt-1,0.35,0.5>TRIGGER2
```

### 3.4 Clothing Segment Binding

**Rule:** Character description and clothing segment are a BOUND UNIT. They travel together.

When `CharacterLocationContext.swarmui_prompt_override` exists:
- Use the override text VERBATIM for description
- Use `CharacterLocationContext.clothing_segment` for the segment
- These are pre-validated pairs - do not mix/match

When assembling from GearFragments:
- Each GearFragment may have its own `segment_syntax`
- The assembled description uses the segment from the PRIMARY clothing fragment

**Format in prompt:**
```
... wearing [clothing_description] ... <segment:clothing_text,0.4,0.5>
```

**Example binding:**
| Description | Segment |
|-------------|---------|
| `skin-tight matte charcoal-black Aegis suit with hexagonal weave` | `<segment:bodysuit,0.4,0.5>` |
| `olive-drab plate carrier vest over olive green long-sleeve top` | `<segment:tactical vest,0.4,0.5>` |

### 3.5 Gear Fragment Selection Logic

**EFFICIENCY GATE - Check First:**

Before running gear/helmet/hair logic, check if it's applicable:

```
1. Does this CHARACTER have gear fragments defined?
   ├─ NO → SKIP all gear logic, use simple character description
   └─ YES → Continue to step 2

2. Does this SCENE have tactical gear_context?
   ├─ gear_context = off_duty → SKIP helmet/hair suppression logic
   ├─ gear_context = suit_up → RUN gear fragment assembly
   ├─ gear_context = field_op → RUN full gear + helmet + hair suppression
   └─ gear_context = null → SKIP, use swarmui_prompt_override as-is
```

**Characters WITH Gear Systems (Cat & Daniel story):**
- Catherine "Cat" Mitchell - Aegis suit, helmet states
- Daniel O'Brien - Aegis suit, helmet states

**Characters WITHOUT Gear Systems (use simple path):**
- Webb, Chen, 2K, Preacher, supporting characters
- Any character without `gear_fragments` entries

**Locations that TRIGGER Gear Logic:**
- `is_field_op = true` on LocationArc
- gear_context explicitly set in scene metadata

**FAST PATH (No Gear Logic):**
- Use `swarmui_prompt_override` directly
- No helmet state checking
- No hair suppression
- No gear fragment assembly

**FULL PATH (Gear Logic Required):**

```
1. What is the GEAR CONTEXT? (from roadmap_metadata or scene analysis)
   ├─ OFF_DUTY → Use civilian/casual fragments
   ├─ SUIT_UP → Use suit-up stage fragments
   ├─ FIELD_OP → Use Aegis suit fragments + alert level color
   └─ STEALTH → Use subdued/dark mode fragments

2. What is the HELMET STATE?
   ├─ OFF → Include HAIR fragment, include face segment
   ├─ IN_HAND → Include HAIR fragment, include face segment
   ├─ ATTACHED_TO_VEHICLE → Include HAIR fragment, include face segment
   ├─ ON_VISOR_UP → NO hair, include face segment (face visible)
   └─ ON_VISOR_DOWN → NO hair, NO face segment (face hidden)

3. What is the SUIT ALERT LEVEL? (for FIELD_OP only)
   ├─ NORMAL → Blue glow from hexagonal seams
   ├─ WARNING → Amber glow from hexagonal seams
   └─ DANGER → Red glow from hexagonal seams
```

**Face Visibility Matrix:**

| Helmet State | Hair in Prompt | Face Segment Needed |
|--------------|----------------|---------------------|
| Off | YES | YES |
| In hand | YES | YES |
| Attached to motorcycle | YES | YES |
| On, visor UP | NO | YES |
| On, visor DOWN | NO | NO |

### 3.6 Helmet State Descriptions

| State | GearFragment Key | Description |
|-------|------------------|-------------|
| `HELMET_OFF` | No helmet fragment | Character without helmet |
| `HELMET_IN_HAND` | `helmet_carried` | `Wraith helmet tucked under arm` |
| `HELMET_ON_VEHICLE` | `helmet_attached` | `Wraith helmet attached to motorcycle` |
| `HELMET_VISOR_UP` | `helmet_visor_up` | `Wraith helmet with polarized visor raised` |
| `HELMET_VISOR_DOWN` | `helmet_visor_down` | `Wraith helmet with polarized visor down, face hidden` |

### 3.6.1 Helmet Fragment Database Columns (NEW)

**Table:** `character_location_contexts`

Helmet fragments are stored directly in the database for LLM scene discernment. The LLM selects the appropriate fragment based on beat narrative context.

**New Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `helmet_fragment_off` | TEXT | Hair/face description when helmet is off |
| `helmet_fragment_visor_up` | TEXT | Helmet with visor raised - face visible, no hair |
| `helmet_fragment_visor_down` | TEXT | Helmet with visor down - face hidden, no hair |
| `face_segment_rule` | TEXT | `ALWAYS` \| `IF_FACE_VISIBLE` \| `NEVER` |

**Populated For:** Cat and Daniel tactical mode contexts only (Aegis suit wearers).

**Fragment Values:**

| Character | Fragment | Value |
|-----------|----------|-------|
| **Cat** | `helmet_fragment_off` | `dark brown hair, practical ponytail, face visible` |
| **Cat** | `helmet_fragment_visor_up` | `Wraith tactical helmet visor raised, angular matte black shell fully encasing head, face visible, no hair visible` |
| **Cat** | `helmet_fragment_visor_down` | `Wraith tactical helmet visor down, angular black visor completely covering face, aerodynamic matte black shell, no hair visible, face hidden` |
| **Daniel** | `helmet_fragment_off` | `stark white military-cut hair, face visible` |
| **Daniel** | `helmet_fragment_visor_up` | `Wraith tactical helmet visor raised, angular matte black shell fully encasing head, face visible, no hair visible` |
| **Daniel** | `helmet_fragment_visor_down` | `Wraith tactical helmet visor down, angular black visor completely covering face, aerodynamic matte black shell, no hair visible, face hidden` |

**LLM Selection Logic:**

The LLM reads the beat narrative and selects the appropriate helmet fragment:

| Beat Narrative Example | LLM Selects | Face Segment |
|------------------------|-------------|--------------|
| "Cat seals her helmet visor" | `helmet_fragment_visor_down` | NO |
| "Daniel raises his visor to speak" | `helmet_fragment_visor_up` | YES |
| "They left helmets on the bike" | `helmet_fragment_off` | YES |
| "Cat's helmet HUD flickers" | `helmet_fragment_visor_down` | NO |
| "He removes his helmet" | `helmet_fragment_off` | YES |

**Face Segment Rule Application:**

| `face_segment_rule` | Behavior |
|---------------------|----------|
| `ALWAYS` | Always include `<segment:yolo-face...>` |
| `IF_FACE_VISIBLE` | Include face segment only if helmet is OFF or visor is UP |
| `NEVER` | Never include face segment (e.g., establishing shots) |

**Prompt Assembly:**

```
[Base swarmui_prompt_override] + [Selected helmet_fragment_*] + [Face segment if applicable]
```

**Example Assembled Prompt (Visor Down):**
```
JRUMLV woman (30 years old, lean athletic build) in tactical mode, wearing skin-tight zero-wrinkle black Aegis tactical bodysuit... Wraith tactical helmet visor down, angular black visor completely covering face, aerodynamic matte black shell, no hair visible, face hidden
```
*Note: NO face segment appended because visor is down.*

**HUD POV Shots (Special Case):**

When beat describes character SEEING through HUD (readouts, targeting data, threat indicators), use first-person POV:

**Template:**
```
first-person POV through Wraith helmet visor, holographic HUD overlay showing [DATA_TYPE], reflective black visor edges visible, [ENVIRONMENT] visible through HUD display
```

**Rules:**
- NO character visible - this is what they SEE
- NO YOLO face segment (no face in frame)
- Use when beat describes: HUD readouts, targeting data, threat indicators, system status

**Example:**
```
first-person POV through Wraith helmet visor, holographic HUD overlay showing biometric scan data, reflective black visor edges visible, bombed corridor visible through amber-tinted display
```

### 3.6.2 Hair Fragment Selection Logic

**Table:** `gear_fragments` (fragment_type = 'HAIR')

Hair fragments are selected based on helmet state AND location context. The helmet state takes priority.

**Available Hair Fragments (Cat):**

| Fragment Key | Display Name | Prompt Fragment | Context |
|--------------|--------------|-----------------|---------|
| `combat_hair_cat` | Combat (Ponytail) | `dark brown hair pulled back in quick low ponytail at nape of neck secured with black scrunchy` | Default tactical, helmet off |
| `combat_hair_cat_tucked` | Combat (Tucked) | `dark brown hair in low ponytail tucked into suit collar` | Pre-helmet seal, visor-up compatible |
| `casual_hair_cat_down` | Casual (Down) | `dark brown hair loose and down with natural waves flowing freely` | Safehouse, off-duty, relaxed |
| `formal_hair_cat_updo` | Formal (Updo) | `dark brown hair in elegant updo with sleek professional styling` | Chen's Spa, Klepstein's, formal events |
| `stealth_hair_cat_cap` | Stealth (Cap) | `dark brown hair hidden under tactical cap` | Urban Market, covert ops |

**Available Hair Fragments (Daniel):**

| Fragment Key | Display Name | Prompt Fragment | Context |
|--------------|--------------|-----------------|---------|
| `combat_hair_daniel` | Combat Hair | `stark white military-cut hair` | Always (no variation needed) |

**Hair Selection Decision Tree:**

```
1. Is HELMET ON? (visor up or visor down)
   ├─ YES → SUPPRESS hair fragment entirely (hair hidden under helmet)
   └─ NO → Continue to location selection

2. What is the LOCATION CONTEXT?
   ├─ Field Op (tactical) → Use `combat_hair_cat` (ponytail with scrunchie)
   ├─ Suit-up phase → Use `combat_hair_cat_tucked` (pre-seal)
   ├─ Safehouse/Lair → Use `casual_hair_cat_down` (loose)
   ├─ Formal venue (Spa, Klepstein's) → Use `formal_hair_cat_updo` (elegant)
   ├─ Urban covert (Market, stealth) → Use `stealth_hair_cat_cap` (hidden)
   └─ Default/Unknown → Use `combat_hair_cat` (ponytail)
```

**Hair Suppression Matrix:**

| Helmet State | Include Hair Fragment? | Hair Fragment Used |
|--------------|------------------------|-------------------|
| OFF | YES | Location-appropriate |
| IN_HAND | YES | Location-appropriate |
| ATTACHED_TO_VEHICLE | YES | Location-appropriate |
| ON_VISOR_UP | NO | None (hidden under helmet) |
| ON_VISOR_DOWN | NO | None (hidden under helmet) |

**Location-to-Hair Mapping:**

| Location Arc | Cat Hair Fragment | Rationale |
|--------------|-------------------|-----------|
| Dragon's Lair (Safehouse) | `casual_hair_cat_down` | Relaxed, safe environment |
| Chen's Rejuvenation Spa | `formal_hair_cat_updo` | Undercover as client |
| Klepstein's | `formal_hair_cat_updo` | Formal venue |
| Urban Market | `stealth_hair_cat_cap` | Covert reconnaissance |
| Abandoned Mall | `combat_hair_cat` | Tactical operation |
| Any Field Op | `combat_hair_cat` | Default tactical |
| Pre-helmet seal | `combat_hair_cat_tucked` | Preparing for helmet |

**Integration with Helmet Fragments:**

When helmet is OFF, the `helmet_fragment_off` column can include hair, but the HAIR gear fragment provides more flexibility:

```
Prompt Assembly Order:
1. Base character description (swarmui_prompt_override)
2. IF helmet ON: Use helmet_fragment_visor_up/down (no hair)
3. IF helmet OFF: Add hair fragment from gear_fragments based on location
4. Add face segment if applicable
```

**Example Prompts:**

*Helmet OFF at Safehouse:*
```
JRUMLV woman (30 years old, lean athletic build) wearing casual clothes, dark brown hair loose and down with natural waves flowing freely, relaxed expression
```

*Helmet OFF at Field Op:*
```
JRUMLV woman (30 years old, lean athletic build) in tactical mode, wearing Aegis bodysuit, dark brown hair pulled back in quick low ponytail at nape of neck secured with black scrunchy
```

*Helmet ON (visor up):*
```
JRUMLV woman (30 years old, lean athletic build) in tactical mode, wearing Aegis bodysuit, Wraith tactical helmet visor raised, angular matte black shell fully encasing head, face visible, no hair visible
```

*Helmet ON (visor down):*
```
JRUMLV woman (30 years old, lean athletic build) in tactical mode, wearing Aegis bodysuit, Wraith tactical helmet visor down, angular black visor completely covering face, aerodynamic matte black shell, no hair visible, face hidden
```


### 3.6.3 Dingy (Motorcycle) Appearance States

**Vehicle:** The Dingy - Cat and Daniel's shared electric motorcycle

The Dingy has **two distinct visual appearances** depending on context. This is an intentional camouflage system, NOT continuity error.

**Appearance States:**

| State | Context | Visual Description |
|-------|---------|-------------------|
| `PARKED_CAMOUFLAGE` | Parked at MMB, Safehouse, or any static location | Rusty salvage job, weathered frame, mismatched panels, deliberately neglected appearance, not worth stealing, dust-covered, dented fenders |
| `IN_USE_SLEEK` | Being ridden by any character | Sleek modern electric motorcycle, aerodynamic fairings, matte black finish, silent electric drive, styled for speed, no exhaust pipes, streamlined profile |

**LLM Selection Logic:**

The LLM reads the beat narrative and selects the appropriate appearance:

| Beat Narrative Example | Appearance State |
|------------------------|-----------------|
| "The motorcycle sits outside the MMB" | `PARKED_CAMOUFLAGE` |
| "Cat approaches her parked bike" | `PARKED_CAMOUFLAGE` |
| "Daniel accelerates through the streets" | `IN_USE_SLEEK` |
| "Cat weaves between abandoned cars" | `IN_USE_SLEEK` |
| "They dismount at the safehouse" | Transition: was `IN_USE_SLEEK`, now parking |
| "The Dingy leans against the wall, rusted" | `PARKED_CAMOUFLAGE` |

**Continuity Rules (CRITICAL):**

1. **Singular Vehicle:** There is only ONE Dingy. Never show two motorcycles in any scene.

2. **Rider Configurations:**
   | Configuration | Description |
   |---------------|-------------|
   | Daniel alone | Daniel riding solo |
   | Cat alone | Cat riding solo |
   | Both together | Daniel driving, Cat passenger (always this arrangement) |

3. **Paired Rider Continuity:** If a scene begins with both Cat and Daniel on the Dingy:
   - They remain together on the bike until explicitly separated
   - Separation only occurs when returning to MMB/Safehouse OR narrative explicitly states one stays behind
   - Never show one character alone on the Dingy if they departed together without explanation

**Prompt Fragments:**

```
# PARKED_CAMOUFLAGE
rusty weathered motorcycle, mismatched body panels, dust-covered, dented fenders, salvage aesthetic, parked

# IN_USE_SLEEK
sleek matte black electric motorcycle, aerodynamic fairings, streamlined profile, in motion, silent electric drive
```

**Anti-Pattern Detection:**

| Error | Correct |
|-------|---------|
| "rusty motorcycle speeding through streets" | Use `IN_USE_SLEEK` when in motion |
| "sleek motorcycle parked at MMB" | Use `PARKED_CAMOUFLAGE` when stationary |
| "Two motorcycles in the scene" | Only ONE Dingy exists |
| "Cat driving with Daniel passenger" | Daniel always drives when both present |

### 3.6.4 Helmet State Inference (Context-Based Detection)

**ZERO-TOLERANCE HELMET STATE RULES (from Architect Memo):**

```
RULE: Helmet state is determined by scene context, NOT by "wanting to show the face."

RIDING AT SPEED (any speed above walking):
  \u2192 Visor DOWN. No exceptions.
  \u2192 No hair description. Hair is tucked into suit collar.
  \u2192 No face segment tags.

STANDING/STATIONARY IN FIELD:
  \u2192 Visor UP (default) \u2014 face visible, hair visible below helmet.
  \u2192 Face segment tags included.

COMBAT/BREACH:
  \u2192 HUD ACTIVE \u2014 visor shows tactical data.
  \u2192 No hair. No face segment.

STEALTH/INFILTRATION:
  \u2192 Visor DOWN \u2014 sealed for noise/light discipline.
  \u2192 No hair. No face segment.

CRITICAL: When visor is DOWN, the prompt MUST NOT contain:
  - Any hair description (color, style, length)
  - Any facial expression
  - Any face segment tag
  - "exposing face" or "showing face" or "visor raised"
```

**Service:** `services/beatTypeService.ts` - `detectHelmetState()` and `inferHelmetFromContext()`

**Purpose:** When beat narrative doesn't explicitly mention helmet/visor state, infer the correct state from context.

**Priority Order:**
1. **Explicit mentions** (highest) - "visor down", "raises visor", "helmet off"
2. **Context inference** - Scene actions imply helmet state
3. **Default** - null (no helmet assumption)

#### VISOR_DOWN Inference Patterns (Face Hidden, No Hair, NO YOLO Face Segment)

| Pattern | Example | Reason |
|---------|---------|--------|
| HUD/display mention | "Cat's HUD shows targeting data" | Viewing through sealed visor |
| Riding Dingy at speed | "Daniel accelerates through the streets" | Safety requires sealed helmet |
| Flying/airborne | "Cat soars between buildings" | Airborne in suit requires seal |
| Active combat | "firefight in the corridor" | Combat protocol: visor down |
| High-speed tactical | "speeds through the highway" | High-speed requires seal |
| Hostile environment | "radiation warning, toxic fumes" | Environmental hazard seal |

#### VISOR_UP Inference Patterns (Face Visible, No Hair, INCLUDE YOLO Face Segment)

| Pattern | Example | Reason |
|---------|---------|--------|
| Speaking in tactical gear | "Cat says to Daniel..." | Visor raised for communication |
| Stopped at Dingy | "The Dingy stops, they dismount" | Stationary allows visor up |
| Visual assessment | "Cat scans the perimeter" | Visual assessment (not HUD) |
| Arrival in tactical gear | "Daniel enters the building" | Arriving, not in active combat |
| Field briefing | "Cat briefs the team" | Communication requires open visor |
| Pre-mission prep | "suiting up, checking gear" | Prep phase, visor still up |
| Mounting Dingy | "Cat mounts the Dingy" | Before departure, visor up |

#### Complete Helmet/Hair/Face Matrix

| Helmet State | Hair Fragment? | Which Hair? | YOLO Face Segment? |
|--------------|----------------|-------------|-------------------|
| **OFF** | YES | Location-based | YES |
| **IN_HAND** | YES | Location-based | YES |
| **ON_VEHICLE** | YES | Location-based | YES |
| **null** (not mentioned) | YES | Location-based | YES |
| **VISOR_UP** | NO | (hidden under helmet) | YES |
| **VISOR_DOWN** | NO | (hidden under helmet) | NO |

#### Implementation Flow

```
detectHelmetState(beatDescription, gearContext)
├─ 1. Check explicit patterns (detectHelmetStateExplicit)
│    ├─ "visor down" → VISOR_DOWN
│    ├─ "visor up/raised" → VISOR_UP
│    ├─ "helmet in hand" → IN_HAND
│    └─ "without helmet" → OFF
├─ 2. If no explicit match → inferHelmetFromContext(desc, gearContext)
│    ├─ Check VISOR_DOWN patterns (HUD, speed, combat, hazard)
│    └─ Check VISOR_UP patterns (speaking, stopped, arrival)
└─ 3. Return null if no inference possible
```

#### Console Logging

The system logs helmet/hair/face decisions for debugging:

```
[HelmetInference] Inferred VISOR_DOWN: Riding Dingy at speed implies helmet sealed
[Helmet] s2-b5: VISOR_DOWN - hair suppressed, face hidden

[HelmetInference] Inferred VISOR_UP: Speaking in tactical gear implies visor raised
[Helmet] s2-b8: VISOR_UP - hair suppressed, face visible (include YOLO)

[Helmet] s1-b2: not worn - hair: casual_hair_cat_down, face visible (include YOLO)
```

#### Integration with Prompt Generation

The `hairContext` object passed to LLM includes:

```typescript
hairContext: {
  helmetState: 'VISOR_DOWN' | 'VISOR_UP' | 'OFF' | 'IN_HAND' | 'ON_VEHICLE' | null,
  hairSuppressed: boolean,        // true for VISOR_UP and VISOR_DOWN
  hairFragment?: string,          // Location-appropriate hair text (when not suppressed)
  includeFaceSegment: boolean,    // false ONLY for VISOR_DOWN
  reason: string                  // Explanation for logging/debugging
}
```

### 3.7 Character Trigger Substitution (CRITICAL)

**Service:** `app/services/character_trigger_substitution_service.py`

**Purpose:** Replace character names with LoRA triggers using robust word boundary detection.

**MUST BE PRESERVED** - This service handles complex edge cases that simple regex cannot:

#### Key Capabilities

| Feature | Implementation |
|---------|----------------|
| Word boundaries | Uses `(?<!\w)` and `(?!\w)` instead of `\b` to handle apostrophes |
| Longest-first matching | Sorts by length to prevent "Cat" replacing before "Cat Mitchell" |
| Quoted nickname handling | Parses `Catherine "Cat" Mitchell` and matches all variations |
| Case-insensitive | All matches are case-insensitive |
| Possessive preservation | "HSCEIA man's equipment" preserved as natural grammar |
| Caching | Per-story mapping cache to avoid repeated DB queries |

#### Name Variations Extracted

For `Catherine "Cat" Mitchell`:
```
[
    'Catherine "Cat" Mitchell',  # Full quoted (highest priority - matched FIRST)
    'Catherine Mitchell',         # Full name without quotes
    'Cat Mitchell',               # Nickname + last
    'Cat',                        # Nickname alone
    'Catherine'                   # First name alone
]
```

#### Why NOT Simple `\b` Word Boundary

The `\b` word boundary **fails with apostrophes**:
- `\bO'Brien\b` doesn't match correctly
- `(?<!\w)O'Brien(?!\w)` works properly

#### Critical Regex Pattern

```python
# For non-quoted names - handles apostrophes correctly
pattern = r'(?<!\w)' + escaped_name + r'(?!\w)'

# For quoted names - flexible spacing around quotes
pattern = rf'(?<!\w){first_escaped}\s*{quote_escaped}{nickname_escaped}{quote_escaped}\s*{last_escaped}(?!\w)'
```

#### Application Point

Trigger substitution is applied:
1. **In StoryArtContextService** - to all `swarmui_prompt_override` fields before sending to StoryArt
2. **During prompt generation** - as a final pass to catch any character names that slipped through

#### Historical Bug Reference

**Why not simple regex:** Word boundary on "Cat" caused "Catches" to become "JRUMLVches" in early implementations.

---

## 4. BEAT DATA INPUT (From StoryArt/StorySwarm)

### 4.1 Input Source

Beat analysis (StoryArt) already provides director/cinematographer suggestions. **Do not re-derive from narrative.**

**Beat Data Fields Available:**
```json
{
  "beatId": "s1-b1",
  "beat_script_text": "narrative content...",
  "cameraAngleSuggestion": "Medium shot on Cat, then push in on monitor",
  "characterPositioning": "Cat standing, facing the monitor bank",
  "locationAttributes": ["converted semi-trailer interior", "medical monitors"],
  "visualSignificance": "High",
  "imageDecision": {"type": "NEW_IMAGE", "reason": "..."},
  "emotional_tone": "tense anticipation"
}
```

### 4.2 LLM Refiner Role (Not Deriver)

The LLM acts as **Cinematographer Refiner** - translating beat suggestions into FLUX-optimal terms.

**Input:** Beat director fields (already analyzed)
**Output:** FLUX-validated equivalents with variety

**Role is to:**
1. Map `cameraAngleSuggestion` → FLUX shot type vocabulary
2. Map `characterPositioning` → FLUX pose/action vocabulary
3. Extract expression from `emotional_tone` → FLUX expression vocabulary
4. Add cinematographic variety WITHOUT going avant-garde

### 4.3 Variety Guidelines (Retention vs Accessibility)

**Goal:** Visual variety keeps viewers engaged. Same shot types become monotonous.

**ALLOWED Variety (Accessible):**
| Category | Safe Variations |
|----------|-----------------|
| Shot Size | Alternate between medium, medium close-up, cowboy shot |
| Angle | Mix eye-level with occasional low/high angle for emphasis |
| Positioning | Vary three-quarter view, front view, slight profile |
| Lighting Direction | Rotate between front, side, rim lighting |

**AVOID (Avant-Garde):**
| Category | Avoid Unless Narratively Justified |
|----------|-----------------------------------|
| Extreme angles | worm's-eye, bird's-eye (only for specific dramatic purpose) |
| Disorienting | Dutch angle (only for horror/unease moments) |
| Abstract framing | Extreme close-ups of non-facial elements (save for evidence shots) |
| Unusual poses | Contorted or unnatural positions |

**Variety Rhythm:**
```
Scene of 4 beats:
  Beat 1: Establishing/wide → medium shot
  Beat 2: Conversation → medium close-up, three-quarter view
  Beat 3: Tension rise → cowboy shot, low angle
  Beat 4: Climax → close-up, front view, dramatic lighting
```

### 4.4 Translation Mapping

**Camera Angle Suggestions → FLUX Terms:**

| Beat Suggestion | FLUX Translation |
|-----------------|------------------|
| "Medium shot on Cat" | `medium shot` |
| "Close-up" | `close-up shot` or `medium close-up` |
| "Wide shot" | `wide shot` |
| "Two-shot" | `medium shot` + dual character template |
| "Push in on monitor" | `close-up shot` (static image, no camera movement) |
| "Over the shoulder" | `medium shot` + positioning "from behind [character]" |
| "Low angle" | `low angle shot` |
| "POV" | `close-up shot` + subject-focused framing |

**Character Positioning → FLUX Pose/Action:**

| Beat Suggestion | FLUX Translation |
|-----------------|------------------|
| "standing, facing the monitor" | `standing tall, facing away` or `examining monitor` |
| "Cat and Daniel facing each other" | `facing each other, eye contact` |
| "kneeling by debris" | `kneeling to examine` |
| "back to back" | `back to back, covering angles` |
| "seated at workstation" | `seated at terminal` |

**Emotional Tone → FLUX Expression:**

| Beat Tone | FLUX Expression |
|-----------|-----------------|
| "tense anticipation" | `alert expression, eyes scanning` |
| "clinical focus" | `intense focus, analytical gaze` |
| "suppressed fear" | `suppressed fear, tense expression` |
| "professional calm" | `stoic expression, neutral` |
| "vulnerable moment" | `soft expression, guard lowered` |
| "determination" | `determined expression, jaw set` |

### 4.5 Carryover State

**Action** and **Expression** persist beat-to-beat until beat data shows change.

```
BeatState {
  current_action: string | null
  current_expression: string | null
  last_updated_beat: int
  source_beat_id: string | null
}
```

**Rules:**
1. If new beat has different `characterPositioning` → update action
2. If new beat has different `emotional_tone` → update expression
3. If beat fields are empty/unchanged → use CARRYOVER
4. State resets at scene boundary (each scene starts fresh)
5. `processEpisodeWithState()` is called ONCE by the orchestrator on the fully assembled AnalyzedEpisode (all scenes combined), NOT by individual provider functions

### 4.6 Refiner Prompt Template

```
You are a cinematographer refining beat direction into FLUX-optimized prompt terms.

BEAT DATA:
- Camera Suggestion: {cameraAngleSuggestion}
- Character Positioning: {characterPositioning}
- Emotional Tone: {emotional_tone}
- Location Attributes: {locationAttributes}
- Visual Significance: {visualSignificance}

PREVIOUS STATE:
- Action: {previous_action or "None established"}
- Expression: {previous_expression or "None established"}

SCENE CONTEXT:
- Beat number in scene: {beat_number} of {total_beats}
- Character: {character_name}
- Location: {location_name}

VARIETY GUIDANCE:
- If this is beat 1, prefer establishing framing (medium/wide)
- If this is mid-scene, vary from previous beat's shot type
- If this is climax beat, consider closer framing or dramatic angle
- Avoid repeating exact same shot type as previous beat

Using ONLY terms from the FLUX validated vocabulary, output JSON:

{
  "shot_type": "[FLUX term - consider variety]",
  "camera_angle": "[FLUX angle term or 'eye-level' default]",
  "action": "[FLUX pose term or CARRYOVER]",
  "expression": "[FLUX expression term or CARRYOVER]",
  "lighting_adjustment": "[FLUX lighting term or DEFAULT]",
  "variety_note": "[brief explanation of choice]"
}
```

### 4.7 Variety Tracking

To prevent monotony, track recent choices:

```
SceneVarietyState {
  recent_shot_types: string[]      // Last 3 shot types used
  recent_angles: string[]          // Last 3 angles used
  beat_count: int
}
```

**Anti-Monotony Rules:**
1. Do not use same shot type more than 2 beats in a row
2. Vary camera angle at least every 3 beats
3. If `visualSignificance: "High"`, use more dramatic framing
4. If `visualSignificance: "Low"`, simpler framing is acceptable

### 4.8 Per-Scene Analysis Pipeline (v0.16)

Beat analysis is orchestrated by `multiProviderAnalysisService.ts:analyzeScriptWithProvider()` using a **per-scene architecture** that eliminates duplicate scene entries caused by the legacy chunk-and-merge approach.

**Pipeline Flow:**

```
Full Episode Script + Episode Context JSON
         ↓
┌─────────────────────────────────────────────────────────┐
│  1. splitScriptByScenes()          [utils.ts]           │
│     Splits by ===SCENE N: Title=== markers              │
│     Returns SceneScript[] (one entry per scene)         │
│                                                         │
│  2. parseEpisodeHeader()           [utils.ts]           │
│     Extracts episode number + title from script header  │
│                                                         │
│  3. Per-scene parallel analysis    [Promise.all]        │
│     For EACH scene:                                     │
│     ├─ compactSceneContext() → scene-specific context    │
│     │  (all characters + only THIS scene's location)    │
│     ├─ Prefix scene instruction to script text          │
│     │  "[SCENE ANALYSIS MODE: Scene N of M...]"         │
│     └─ analyzeFullScript() → provider routing           │
│        (Gemini / Qwen / Claude / OpenAI)                │
│                                                         │
│  4. Assembly                                            │
│     ├─ Sort scenes by sceneNumber                       │
│     ├─ Combine into single AnalyzedEpisode              │
│     └─ processEpisodeWithState() on full episode        │
│                                                         │
│  5. Output: Single AnalyzedEpisode → Redis session      │
└─────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**

| Decision | Rationale |
|----------|-----------|
| Split by scene markers, not word count | Prevents scenes from straddling chunk boundaries |
| Scene-specific context (`compactSceneContext`) | Reduces tokens per call; only sends relevant location/artifacts |
| Parallel analysis (`Promise.all`) | All 4 scenes analyzed concurrently for speed |
| `processEpisodeWithState` called once on assembled result | Carryover state computed correctly across the full episode |
| Fallback to full-script if no markers detected | Backwards compatibility with unstructured scripts |

**Scene Marker Format (Required):**
```
===SCENE 1: The Title===
[scene content]

===SCENE 2: Another Title===
[scene content]
```

**BeatId Convention:** Each scene's beats use format `sN-bY` where N = scene number, Y = sequential beat within that scene (e.g., `s1-b1`, `s2-b3`). The scene instruction prefix enforces this during per-scene analysis.

**What This Means for Prompt Generation:**
- Beat data arriving in Redis sessions now has EXACTLY one entry per scene (no duplicates)
- Scene numbers are deterministic (sorted by marker order)
- Beat IDs within each scene are sequential and correctly prefixed
- All downstream prompt generation rules (Sections 1-3) consume this data unchanged

---

## 5. FLUX VOCABULARY (Validated Terms)

### 5.1 Shot Types (HIGH RELIABILITY)

```
extreme close-up, close-up shot, intimate close-up shot, medium close-up,
medium shot, upper-body portrait, cowboy shot, medium full shot,
full body shot, complete figure shot, standing full body shot,
wide shot, extreme wide shot, establishing shot, macro shot,
forensic shot, silhouette shot, portrait photograph
```

### 5.2 Camera Angles (MEDIUM-HIGH RELIABILITY)

```
eye-level shot, low angle shot, high angle shot, worm's-eye view,
bird's-eye view, overhead shot, Dutch angle, front view, side view,
profile, three-quarter view, back view
```

### 5.3 Pose Descriptions (HIGH RELIABILITY)

```
standing tall, standing at attention, standing with arms crossed,
standing guard, kneeling to examine, crouching, rifle raised,
scanning perimeter, examining [object], seated at terminal,
leaning against wall, reaching toward, holding [object]
```

### 5.4 Expression Keywords (HIGH RELIABILITY)

```
neutral expression, intense focus, analytical gaze, alert expression,
stoic expression, determined expression, concerned expression,
suppressed fear, confident expression, soft expression, guard lowered,
eyes scanning, averted eyes, jaw set
```

### 5.5 Lighting (HIGH RELIABILITY)

**Quality:**
```
soft lighting, harsh lighting, dramatic lighting, natural lighting,
studio lighting, volumetric lighting
```

**Direction:**
```
rim lighting, side lighting, backlit, front lighting, overhead lighting
```

**Color:**
```
golden hour, blue hour, cold blue lighting, warm amber lighting,
candlelight, neon lighting, clinical white lighting
```

---

## 5A. T5 ATTENTION MODEL

FLUX.1-dev uses a **T5-XXL text encoder** (not CLIP). Understanding how T5 processes prompts explains nearly every rendering failure.

### 5A.1 T5 Is a Language Model, Not a Tag Parser

CLIP (used in SD 1.5, SDXL) was trained on image-caption pairs \u2014 short, keyword-dense captions like "a photo of a cat on a table." It treats commas as separators between independent concepts and gives roughly equal weight to each tag.

T5 was trained on **natural language tasks** \u2014 it understands grammar, sentence structure, subject-verb-object relationships, and semantic hierarchy. This means:

```
FLUX UNDERSTANDS:
  "A woman in a black suit riding behind a man on a motorcycle"
  \u2192 T5 parses: woman (subject) \u2192 in suit (modifier) \u2192 riding behind (spatial) \u2192 man (second subject) \u2192 on motorcycle (shared object)

FLUX DOES NOT UNDERSTAND WELL:
  "woman, black suit, motorcycle, man, riding, behind, night, forest"
  \u2192 T5 sees disconnected fragments. No clear subject hierarchy. Random composition.
```

**Implication for the engine:** Prompts must be grammatically coherent sentences, not comma-separated tag lists. T5 builds a semantic tree from the sentence \u2014 subjects, modifiers, spatial relationships, and context. Break the grammar and you break the tree.

### 5A.2 The Attention Decay Curve

T5 does NOT give equal weight to all tokens. Attention follows a decay curve:

```
Token Position:   1-30    31-80    81-150    151-200    200+
Attention Weight: STRONG  GOOD     MODERATE  WEAK       IGNORED
```

**What this means practically:**

| Token Position | What to Put Here |
|---|---|
| 1-30 | **THE IMAGE** \u2014 primary subject, composition, spatial relationship. If FLUX only rendered these 30 tokens, would the image be recognizable? |
| 31-80 | Character details \u2014 gear, clothing, posture. This is where canonical suit descriptions go. |
| 81-150 | Environment, lighting, atmosphere. These shape the mood but don't define the composition. |
| 151-200 | Color grade, technical quality, segment tags. Fine-tuning, not structure. |
| 200+ | Effectively ignored. Tokens past 200 contribute almost nothing to the render. |

**This is why the motorcycle disappeared in Gemini's prompts.** Two characters at 50 tokens each = 100 tokens of character before the motorcycle is even mentioned. By the time FLUX reaches "sleek matte black electric motorcycle," it's already committed to rendering two standing figures.

### 5A.3 Subject Primacy \u2014 The First Noun Wins

FLUX gives disproportionate weight to the first concrete noun it encounters. This noun becomes the "anchor" of the image.

```
"HSCEIA man field operative, 6'2" imposing muscular build..."
  \u2192 FLUX anchors on: MAN. Renders a man. Everything else is decoration.

"matte-black armored motorcycle with two riders..."
  \u2192 FLUX anchors on: MOTORCYCLE. Renders a motorcycle. Riders are placed ON it.
```

**Rule:** The first noun in the prompt determines what FLUX thinks the image IS. If the scene is about two people on a motorcycle, the motorcycle leads. If the scene is about Cat's expression while examining evidence, Cat leads. If the scene is an abandoned suburb, the suburb leads.

```
DECISION: What is this image OF?
  \u2192 A motorcycle scene? Motorcycle first.
  \u2192 A character moment? Character first.
  \u2192 A location reveal? Location first.
  \u2192 A piece of evidence? The object first.

Then attach everything else as modifiers and spatial context.
```

### 5A.4 Semantic Coherence \u2014 FLUX Trusts Sentences

T5 builds relationships between concepts based on sentence grammar. Use this:

```
STRONG RELATIONSHIP (T5 links these concepts):
  "woman seated behind man on motorcycle gripping his waist"
  \u2192 T5 builds: woman \u2192 behind \u2192 man \u2192 on \u2192 motorcycle \u2192 gripping \u2192 his waist
  \u2192 All concepts are linked in a single dependency chain.

WEAK RELATIONSHIP (T5 sees these as separate):
  "woman in black suit, man in black suit, motorcycle, riding"
  \u2192 T5 builds: woman \u2192 suit | man \u2192 suit | motorcycle | riding
  \u2192 Four independent fragments. FLUX doesn't know who rides what.
```

**Rule:** Concepts that MUST appear together in the image must be linked in the same sentence. Spatial relationships ("behind," "beside," "on top of," "gripping") are the glue. Every character must be grammatically connected to their position in the scene.

### 5A.5 Why Fabricated Details Are Destructive

When the LLM invents "tactical sensor arrays" or "integrated biometric monitors on forearms," it's not just inaccurate \u2014 it actively damages the render:

1. **Wasted attention budget** \u2014 each fabricated phrase consumes 3-5 tokens of the attention curve for details FLUX will render as generic noise
2. **Semantic confusion** \u2014 T5 tries to reconcile "biometric monitors on forearms" with "skin-tight suit with hexagonal weave." These are conflicting visual concepts (monitors = raised boxes; skin-tight = smooth surface). FLUX compromises by rendering neither cleanly.
3. **Detail hallucination** \u2014 when FLUX can't resolve a specific detail, it renders SOMETHING in that area. That something is usually an artifact \u2014 a blob, a seam, an extra strap \u2014 that wasn't requested.

**Rule:** Only describe what exists in the canonical reference. If a detail isn't documented, it doesn't exist. Silence is better than fabrication.

---

## 6. VALIDATION RULES

### 6.1 Beat Type Detection

First, determine beat type:

| Condition | Beat Type | Template |
|-----------|-----------|----------|
| Character with LoRA, face visible | CHARACTER_WITH_FACE | Full template with face segment |
| Character with LoRA, face hidden | CHARACTER_NO_FACE | Template without face segment |
| Character without LoRA | CHARACTER_GENERIC | Generic description, no segments |
| No character (object/environment) | ENVIRONMENT_ONLY | Environment template |

### 6.2 Pre-Assembly Validation

**For CHARACTER_WITH_FACE:**
| Check | Action on Failure |
|-------|-------------------|
| Character has `lora_trigger` | ABORT - cannot generate |
| Clothing segment bound to description | WARN - segment may not match |
| Location has STRUCTURAL artifact | WARN, use location.name |
| Location has LIGHTING artifact | WARN, use "natural lighting" |
| Shot type in vocabulary | ABORT - invalid term |
| Helmet state determined | WARN - default to OFF |

**For ENVIRONMENT_ONLY:**
| Check | Action on Failure |
|-------|-------------------|
| Subject description exists | ABORT - nothing to show |
| Location has STRUCTURAL artifact | WARN, use location.name |
| Shot type in vocabulary | ABORT - invalid term |

### 6.3 Post-Assembly Validation

| Check | Action on Failure |
|-------|-------------------|
| Segments at END of prompt | AUTO-FIX - move to end |
| No spaces in segment syntax | AUTO-FIX - remove spaces |
| Trigger exact match (if present) | ABORT - mismatch |
| Prompt < 500 tokens | WARN - may lose fidelity |
| Face segment only when face visible | AUTO-FIX - remove if helmet down |
| Clothing segment matches description | WARN - potential mismatch |

---

## 7. INTERMEDIATE JSON FORMAT

For development auditability (can be disabled after validation):

```json
{
  "metadata": {
    "story_id": "uuid",
    "episode": 1,
    "scene": 1,
    "beat": 1,
    "beat_id": "s1-b1",
    "beat_type": "CHARACTER_WITH_FACE",
    "character": "Cat Mitchell",
    "timestamp": "ISO8601"
  },
  "beat_input": {
    "cameraAngleSuggestion": "Medium shot on Cat, facing monitor",
    "characterPositioning": "Cat standing, facing the monitor bank",
    "emotional_tone": "tense anticipation",
    "locationAttributes": ["converted semi-trailer interior", "medical monitors"],
    "visualSignificance": "High"
  },
  "refinement": {
    "shot_type": {
      "input": "Medium shot on Cat",
      "output": "medium shot",
      "source": "llm_refiner",
      "vocabulary_validated": true
    },
    "camera_angle": {
      "input": null,
      "output": "three-quarter view",
      "source": "llm_refiner",
      "variety_reason": "Beat 1 of 4, establishing framing"
    },
    "action": {
      "input": "Cat standing, facing the monitor bank",
      "output": "standing tall, examining monitor",
      "source": "llm_refiner",
      "carryover": false
    },
    "expression": {
      "input": "tense anticipation",
      "output": "alert expression, eyes scanning",
      "source": "llm_refiner",
      "carryover": false
    }
  },
  "gear_state": {
    "gear_context": "FIELD_OP",
    "helmet_state": "OFF",
    "suit_alert_level": "NORMAL",
    "face_visible": true
  },
  "database_components": {
    "trigger": {
      "value": "JRUMLV woman",
      "source": "characters.lora_trigger"
    },
    "character_description": {
      "value": "(28 years old, dark brown tactical bun...)",
      "source": "gear_fragments + character_location_contexts",
      "fragments_used": ["BASE_SUIT_cat_tactical", "HAIR_cat_bun"],
      "override_used": false
    },
    "location": {
      "anchors": ["cramped vehicle interior", "holographic displays"],
      "source": "location_artifacts",
      "beat_attributes_used": ["converted semi-trailer interior", "medical monitors"]
    },
    "lighting": {
      "value": "blue monitor glow",
      "source": "location_artifacts",
      "override": false
    },
    "atmosphere": {
      "value": "clinical",
      "source": "location_artifacts"
    },
    "clothing_segment": {
      "value": "<segment:tactical vest,0.4,0.5>",
      "source": "character_location_contexts.clothing_segment",
      "bound_to_description": true
    },
    "face_segment": {
      "value": "<segment:yolo-face_yolov9c.pt-0,0.35,0.5>",
      "source": "gear_fragments.segment_syntax",
      "included": true,
      "reason": "face_visible=true"
    }
  },
  "variety_tracking": {
    "scene_beat_number": 1,
    "scene_total_beats": 4,
    "recent_shot_types": [],
    "recent_angles": [],
    "monotony_avoided": true
  },
  "assembled_prompt": "medium shot, three-quarter view of a JRUMLV woman (28 years old, dark brown tactical bun...) standing tall examining monitor, alert expression eyes scanning, in cramped vehicle interior with holographic displays, blue monitor glow, clinical <segment:tactical vest,0.4,0.5> <segment:yolo-face_yolov9c.pt-0,0.35,0.5>"
}
```

### Environment-Only Beat Example

```json
{
  "metadata": {
    "story_id": "uuid",
    "episode": 1,
    "scene": 1,
    "beat": 3,
    "beat_type": "ENVIRONMENT_ONLY",
    "character": null,
    "timestamp": "ISO8601"
  },
  "gear_state": null,
  "components": {
    "shot_type": {
      "value": "macro shot",
      "source": "llm_cinematographer",
      "vocabulary_validated": true
    },
    "subject_description": {
      "value": "twisted steel rebar molten and curled inward",
      "source": "llm_cinematographer"
    },
    "location": {
      "anchors": ["bombed hospital corridor", "forensic markers"],
      "source": "location_artifacts"
    },
    "lighting": {
      "value": "harsh forensic lighting",
      "source": "location_artifacts"
    },
    "atmosphere": {
      "value": "clinical precision",
      "source": "location_artifacts"
    }
  },
  "assembled_prompt": "macro shot of twisted steel rebar molten and curled inward, in bombed hospital corridor with forensic markers, harsh forensic lighting, clinical precision"
}
```

---

## 8. DUAL CHARACTER RULES

### 8.1 Positioning

- Always specify "on left" / "on right" in prompt text
- YOLO indexes: `-0` = leftmost, `-1` = second from left

### 8.2 Template

```
[shot type] of a [TRIGGER1] ([desc1]) on left and a [TRIGGER2] ([desc2]) on right, [interaction], in [location], [lighting], [atmosphere] <segment:yolo-face_yolov9c.pt-0,0.35,0.5>[TRIGGER1] <segment:yolo-face_yolov9c.pt-1,0.35,0.5>[TRIGGER2]
```

### 8.3 Relationship Keywords

| Stage | Visual Keywords |
|-------|-----------------|
| Professional Tension | standing apart, separated by debris |
| Tactical Partnership | back to back, covering angles |
| Emotional Moment | facing each other, eye contact |
| Silent Understanding | parallel positioning, working in tandem |

### 8.4 Cat as Visual Anchor — Director's Standing Note

Cat is the visual center of gravity in this series. The cinematographer treats her the way a great DP shoots an action heroine \u2014 powerful, capable, and physically compelling in equal measure.

**Framing priorities (when scene permits):**

- **Silhouette and shape** \u2014 The Aegis suit is skin-tight for a reason. Frame to show her athletic hourglass figure, defined waist, and curves. The suit does the work \u2014 no exaggeration needed.

- **From behind / three-quarter rear** \u2014 When she's moving, leading, or in action, rear and three-quarter angles naturally emphasize her shape in the suit (hips, waist-to-shoulder ratio, athletic posture). This is the DEFAULT angle for motorcycle scenes and walking-away shots.

- **Low angle** \u2014 Shooting slightly upward emphasizes her stature, strength, and silhouette against environment. Use for power moments and action beats.

- **Face as emotional anchor** \u2014 When her face is visible (visor up or off-duty), it is the most important element. Green eyes, focused intensity, intelligence. She earns the camera's attention through presence, not posing.

- **Bust/chest framing** \u2014 The Aegis suit's molded armored bust panels with LED underglow are a designed visual feature of the suit. Medium shots naturally include this. Always integrated with action or environment, never gratuitous.

- **In motion** \u2014 Cat is most visually striking when active: climbing, running, shifting weight, bracing, examining. Static glamour shots break character.

**What this is NOT:**
- Not pin-up posing \u2014 she never poses for the camera
- Not at odds with the story \u2014 her femininity serves characterization, not decoration
- The camera finds her compelling BECAUSE she's a capable protagonist, not despite it

**Gear state interaction with framing:**

| Gear State | Framing Priority |
|---|---|
| OFF_DUTY (halter, tactical pants) | Natural body shape visible, casual confidence. Face is primary anchor. |
| AEGIS SUIT, visor up | Suit emphasizes every contour. Face + body shape balanced. |
| AEGIS SUIT, visor down | Silhouette becomes EVERYTHING. Shape of her body against environment IS the image. |
| HELMET DOWN on motorcycle | Rear/three-quarter angle, her figure wrapped around Daniel's back, curves of the suit catching light. |

**Shot type guidance for Cat-focused framing:**

| Desired Emphasis | Shot + Angle |
|---|---|
| Full silhouette/shape | Wide shot, low angle or rear three-quarter |
| Waist/hips in motion | Medium shot from behind or side |
| Bust + face + authority | Medium close-up, slight low angle |
| Face/expression only | Close-up, eye level |
| Athletic action | Wide or medium, dynamic angle following motion |

### 8.5 Camera Angle Decision Tree (Cat in Frame)

When Cat is in the frame, use this decision tree for camera angle selection:

```
DECISION TREE FOR CAMERA ANGLE:

Is Cat's face visible (visor up/off-duty)?
  YES \u2192 Face is the anchor. Medium close-up or close-up. Eye level or slight low angle.
  NO (visor down) \u2192
    Is she in motion?
      YES \u2192 Rear three-quarter or side angle. Wide or medium shot. Her silhouette is the image.
      NO \u2192 Low angle looking up. Her shape against environment/sky.
    Is she on the motorcycle?
      YES \u2192 Low rear three-quarter angle. Both riders visible. Her figure wrapped around Daniel.
      NO \u2192 Follow motion direction. Frame to show waist-hip-shoulder ratio.
```

When Cat is NOT in the frame (Daniel solo, empty scene, supporting characters), use the standard Subject \u2192 Shot Type matrix from Section 20 (Decision Frameworks).


---

## 9. MODIFICATION PROTOCOL

### Requires Skill Update

- Adding/removing component positions
- Changing assembly order
- Adding validation rules
- Modifying carryover behavior

### Requires Code Change Only

- Adding values to FLUX vocabulary
- Adding locations/characters to database
- Adjusting segment parameters

### Requires Both

- Adding new artifact types
- Changing intermediate JSON schema
- Modifying cinematographer prompt

---

## 10. CONTINUITY STATE INTEGRATION

### 10.1 State Sources for Visual Translation

Image prompts must reflect narrative state. Pull from:

| State Type | Source | Visual Impact |
|------------|--------|---------------|
| **Physical Position** | Scene exit_state | Pose, staging |
| **Gear Status** | Scene metadata / gear_context | Clothing fragments |
| **Injury Status** | Character state snapshot | Visible wounds, fatigue |
| **Emotional Baseline** | emotional_tone from beat | Expression keywords |
| **Time of Day** | Scene metadata | Lighting choice |
| **Active Artifacts** | Scene props | Objects in frame |

### 10.2 Entry/Exit State Format

**Scene Handoff (from previous scene):**
```
- Location: [Precise location]
- Time: [Time of day]
- Physical States: [Character]: [State]
- Emotional States: [Character]: [State]
- Immediate Tension: [Unresolved NOW]
```

**Map to Visual:**
- Physical States → Pose, injuries, fatigue
- Emotional States → Expression keywords
- Time → Lighting (dawn, midday, dusk, night)
- Location → STRUCTURAL artifacts

### 10.3 Episode State Snapshot (Scene 4)

After scene 4, a full snapshot is created with:
- **Visual Vibe** - 1-sentence aesthetic summary for image generation

**Use Visual Vibe** to set overall tone/color grade for episode images.

### 10.4 Scene Persistent State

The engine must maintain a **scene persistent state object** that carries forward across beats within the same scene. This prevents characters, vehicles, and environmental anchors from disappearing when a beat focuses on one character's dialogue or internal state.

**ScenePersistentState JSON Schema:**

```json
{
  "scene_id": "ep2_s3",
  "persistent_elements": {
    "vehicle": "matte-black armored motorcycle (The Dinghy)",
    "vehicleState": "in_motion",
    "charactersPresent": ["Cat", "Daniel"],
    "characterPositions": {
      "Daniel": "front/driving",
      "Cat": "behind/passenger"
    },
    "gearState": "HELMET_DOWN",
    "location": "Georgia forest road at night",
    "lighting": "cold moonlight, blue LED underglow from suits"
  },
  "carry_until": "explicit_dismount_or_scene_change"
}
```

**RULE: All persistent elements carry forward until the narrative EXPLICITLY changes them.**

- If characters are on a vehicle in beat 1, they are on that vehicle in ALL subsequent beats until the text says they stopped/dismounted/exited.
- If two characters are present in the scene, BOTH appear in every prompt unless one explicitly leaves.
- Vehicle/location anchors persist in every prompt of the sequence.
- A beat about Cat's dialogue does NOT clear Daniel from `charactersPresent`.

**VALIDATION CHECK:** Before finalizing any prompt, ask: "What would a camera literally see right now?" If the answer includes another character, a vehicle, or a location element \u2014 it MUST be in the prompt.

**Implementation:** `beatStateService.ts:initializePersistentState()`, `updatePersistentState()`

**Example \u2014 Motorcycle Sequence Carry-Forward:**

Beat 1: "They roared down the Georgia backroad..." \u2192 Both characters, motorcycle, in motion established.
Beat 2: "It's a PSYOP, she said..." \u2192 Cat speaks, but Daniel is STILL driving, motorcycle is STILL moving. All persistent elements remain.
Beat 3: "Daniel glanced at the mirror..." \u2192 Daniel acts, Cat still behind him, motorcycle still in motion.

Every beat prompt MUST include elements from `persistent_elements` unless the beat narrative explicitly overrides them.


---

## 11. ARC PHASE VISUAL MAPPING

### 11.1 Arc Phase Model

```
DORMANT → RISING → CLIMAX → FALLING → RESOLVED
```

| Phase | Visual Intensity | Framing Tendency |
|-------|------------------|------------------|
| **DORMANT** | Neutral, background | Standard shots, no drama |
| **RISING** | Building tension | Tighter framing, more angles |
| **CLIMAX** | Maximum intensity | Close-ups, dramatic lighting |
| **FALLING** | Consequences | Softer, reflective framing |
| **RESOLVED** | Closure | Wide shots, peaceful lighting |

### 11.2 Phase-Aware Shot Selection

When `visualSignificance: "High"` AND arc in CLIMAX:
- Prefer close-up, intimate close-up
- Use dramatic lighting (rim, harsh contrast)
- Consider low angle for power moments

When arc in RISING:
- Build variety (medium → medium close-up → cowboy)
- Increase tension with tighter framing over beats

When arc in FALLING:
- Softer lighting (soft, natural)
- More breathing room (medium shot, wide)

### 11.3 Arc Intensity Score

From ArcPhaseCalculator:
```
priority = base_hierarchy + phase_adjustment + proximity_boost
```

High priority arcs (7+) → More dramatic visual treatment
Low priority arcs (3-) → Standard visual treatment

---

## 11A. SCENE INTENSITY & PACING (YouTube Optimization)

### 11A.1 YouTube Scene Structure (Standalone Video Model)

Each of the 4 scenes per episode is a **standalone 15-20 minute YouTube video**. Every scene has its own complete tension arc:

| Phase | Timing | Beats | Purpose |
|-------|--------|-------|---------|
| Hook | 0:00-0:30 | 1-2 | Provocative opening image |
| Setup | 0:30-3:00 | 5-10 | Establish scene + stakes |
| Build | 3:00-7:30 | 12-18 | Rising tension, escalating visuals |
| Peak | 7:30-8:00 | 1-2 | Tension peak (AD BREAK) |
| Reset | 8:00-10:00 | 5-8 | Post-break re-engagement |
| Develop | 10:00-15:00 | 12-18 | Core revelations + conflicts |
| Climax | 15:00-18:00 | 8-12 | Emotional peak |
| Resolve | 18:00-20:00 | 3-6 | Resolution or cliffhanger |

**Scene targets:** 45-60 beats, 37-50 NEW_IMAGE, 15-30 sec per beat, 2.5-4 images/min

### 11A.2 Scene Role → Visual Treatment

| Role | Shot Preference | Lighting | Pacing |
|------|-----------------|----------|--------|
| `setup_hook` | Wide/establishing → medium | Natural, setting mood | Measured, let viewer absorb |
| `development` | Mixed variety | Standard | Dialog-driven |
| `escalation` | Tightening over scene | Building contrast | Increasing tempo |
| `climax` | Close-ups, dramatic angles | High contrast, dramatic | Rapid or deliberate pause |
| `resolution` | Widening out | Softer, calming | Slow, breathing room |

### 11A.3 Intensity Arc → Visual Intensity

| Intensity Arc | Range | Shot Types | Lighting | Expressions |
|---------------|-------|------------|----------|-------------|
| `calm` | 1-3 | Wide, medium | Soft, natural | Neutral, relaxed |
| `building` | 4-6 | Medium, cowboy | Standard | Alert, focused |
| `peak` | 7-9 | Close-up, low angle | Dramatic, rim | Intense, determined |
| `falling` | 4-6 | Medium, wide | Soft, warm | Reflective, tired |
| `resolved` | 1-3 | Wide | Peaceful | Soft, content |

### 11A.4 Ad Break Rule (8-Minute Mark - ALL Scenes)

**Every scene is its own YouTube video, so ALL scenes get an ad break near the 8-minute mark (~46% through the video).**

When `is_ad_break_scene: true` (always):
1. The ad break beat is at ~46% through the scene (beat ~23 of 50)
2. The beat at/near this moment should be:
   - Slightly LOWER intensity than surrounding beats
   - A "breath" moment (character reaction, revelation landing)
   - NOT mid-action or mid-dialog
3. Visual treatment for ad break beat:
   - Medium or medium close-up (not extreme)
   - Soft or standard lighting (not dramatic)
   - Expression: realization, contemplation, shock settling

**Example:**
```
Beat at 7:45: Cat realizes Ghost knew her service number
- Shot: medium close-up
- Lighting: blue monitor glow (soft)
- Expression: shock settling into realization
- Pose: standing still, processing

[AD BREAK OCCURS HERE]

Beat at 8:15: Cat snaps back to action
- Shot: medium shot
- Lighting: blue monitor glow
- Expression: determined
- Pose: turning to Daniel
```

### 11A.5 Emotional Intensity → Visual Mapping

Use `emotional_intensity` (1-10) from scene data:

| Intensity | Visual Treatment |
|-----------|------------------|
| 1-2 | Establishing/atmospheric, no character drama |
| 3-4 | Standard character shots, neutral |
| 5-6 | Building tension, tighter framing |
| 7-8 | Peak dramatic, close-ups, dramatic lighting |
| 9-10 | Maximum intensity, intimate close-ups, harsh lighting |

### 11A.6 Pacing → Shot Duration Hint

| Pacing | Visual Implication |
|--------|-------------------|
| `slow` | Lingering shots, wide framing, contemplative |
| `measured` | Standard variety, balanced |
| `brisk` | More cuts implied, tighter framing |
| `frenetic` | Extreme close-ups, action poses, dramatic angles |

**Note:** While we generate static images, pacing influences shot TYPE selection. Frenetic pacing = more dynamic poses/angles.

---

## 11B. VISUAL HOOKS (3-Second Retention Strategy)

### 11B.1 The Problem

YouTube data shows **50-60% of viewers drop off in the first 3 seconds**. Target: **70%+ hook rate**.

For serial episodic content, we CANNOT:
- Start every episode with narrative drama (breaks story flow)
- Add artificial cliffhangers at every scene start
- Manufacture tension in calm/resolved scenes

### 11B.2 The Solution: Visual Hooks

**Principle:** The FIRST IMAGE can be visually provocative even when the narrative is calm.

Visual hooks create curiosity WITHOUT changing the story:
- Suggest intimacy or tension that may or may not come
- Show character in intriguing pose/state
- Create visual "open loops" (unexplained elements)
- Imply more will be revealed

### 11B.3 CRITICAL: Hook Requires Cinematic Judgment

**Hooks are NOT templates.** They require analyzing the ENTIRE scene/episode to find what can be teased without revealing.

**The Hook Discovery Process:**

```
1. SCAN the full scene/episode content
   - What happens later that could be hinted at?
   - What emotional peaks occur?
   - What reveals or surprises exist?

2. IDENTIFY hook-worthy elements
   - A confrontation that happens mid-scene
   - A vulnerability that emerges later
   - An object that becomes significant
   - A relationship moment that develops

3. DETERMINE what's available in Beat 1 context
   - Which characters are present?
   - What location/gear state are we in?
   - What can be shown without spoiling?

4. CRAFT hook that "grabs but does not reveal"
   - Tease the later moment visually
   - Create curiosity without answering it
   - Promise something the scene will deliver
```

### 11B.4 Context-Dependent Hook Selection

**Not all hooks are available in all contexts:**

| Context | Available Hooks | NOT Available |
|---------|-----------------|---------------|
| MMB off-duty | Casual clothing, vulnerability, intimacy | Tactical gear |
| Field op | Tactical tension, action freeze, danger | Casual intimacy |
| Environment-only | Mystery object, unexplained damage, atmosphere | Character poses |
| Single character | Internal moment, gaze, pose | Relationship tension |
| Dual character | Positioning, eye contact, proximity | Solo vulnerability |

### 11B.5 Visual Hook Types (Examples, Not Rules)

| Hook Type | Description | When Contextually Appropriate |
|-----------|-------------|-------------------------------|
| **Provocative Pose** | Character in suggestive position | When clothing/location permits |
| **Intimate Framing** | Close-up suggesting vulnerability | Character-focused, safe moment |
| **Unexplained Element** | Something in frame raises questions | When scene has mystery/reveal |
| **Action Freeze** | Caught mid-motion | When action occurs later |
| **Tension Between** | Two characters, unresolved positioning | When relationship develops in scene |
| **Environmental Dread** | Location shot with ominous element | No-character or establishing shots |
| **Object Focus** | Significant item, unclear purpose | When object matters to plot |

### 11B.6 Example: Deriving Hook from Scene Content

**Scene:** Cat and Daniel in MMB, reviewing evidence. Mid-scene, Cat discovers something that shakes her. Daniel comforts her (rare vulnerability).

**Hook Discovery:**
1. SCAN: Emotional peak = Cat's distress + Daniel's comfort
2. IDENTIFY: The comfort moment is hook-worthy
3. DETERMINE: Beat 1 is calm evidence review, both in MMB casual wear
4. CRAFT: Opening image hints at the intimacy to come

**Hook Options (all valid for this context):**
- Cat at terminal, Daniel visible in background watching her (foreshadows his attention)
- Medium shot of both, positioning suggests closeness despite "just working"
- Cat's expression shows micro-tension viewer can't yet explain

**NOT appropriate for this scene:**
- Cat in tactical gear (wrong gear_context)
- Action pose (no action in scene)
- Provocative halter shot (if she's not wearing one in this scene)

### 11B.7 Example: Environment-Only Hook

**Scene:** Opens on abandoned clinic exterior. No characters visible in Beat 1.

**Hook Discovery:**
1. SCAN: Scene involves finding disturbing evidence inside
2. IDENTIFY: The clinic holds dark secrets
3. DETERMINE: Beat 1 is establishing shot, no characters
4. CRAFT: Environment itself must hook

**Hook Options:**
- Broken window with something barely visible inside
- Sign with text that raises questions
- Lighting that feels wrong (too clinical for abandoned building)
- Small detail that will matter later (vehicle tracks, symbol)

### 11B.8 Hook + Intensity Interaction (Guidance, Not Formula)

| Scene Intensity | Hook Effort | Reasoning |
|-----------------|-------------|-----------|
| `calm` (1-3) | **Higher** | Narrative won't carry; visual must compensate |
| `building` (4-6) | **Medium** | Enhance what's already building |
| `peak` (7-9) | **Lower** | Narrative drama does the work |
| `falling` (4-6) | **Medium** | Maintain engagement through reflection |
| `resolved` (1-3) | **Higher** | Prevent drop-off in quiet moments |

### 11B.9 Cold Open Patterns (Tools, Not Requirements)

These TV-inspired patterns are AVAILABLE when contextually appropriate:

**Pattern A: Flash-Forward Tease**
- Show image from LATER in episode as Beat 1
- Requires: Something visually striking happens later
- Risk: May feel gimmicky if overused

**Pattern B: Unexplained Visual**
- Beat 1 contains element that raises questions
- Requires: Element is explained later in scene/episode
- Risk: Must actually deliver explanation

**Pattern C: Character Contrast**
- Character shown in unexpected state
- Requires: Scene justifies/explains the state
- Risk: Don't break character for shock value

### 11B.10 Implementation Guidance

**For LLM/Prompt Generator:**

```
BEFORE generating Beat 1 prompt:

1. Read full scene narrative/beats
2. Identify: What's the most visually interesting moment in this scene?
3. Ask: Can Beat 1 hint at that moment without spoiling it?
4. Check: Is the hint consistent with Beat 1's context (location, characters, gear)?
5. Generate: Hook that grabs attention AND fits the scene reality

DO NOT:
- Apply template without checking context
- Use provocative pose if character isn't dressed for it
- Promise something scene doesn't deliver
- Break character personality for shock value
- Use same hook pattern every episode
```

### 11B.11 The "Grab But Not Reveal" Principle

**Every hook must satisfy BOTH conditions:**

1. **GRAB** - Creates enough curiosity that viewer stays past 3 seconds
2. **NOT REVEAL** - Doesn't spoil what makes the scene worth watching

**Test:** If the hook image answers all questions, it fails. If it raises no questions, it fails.

---

## 12. CHARACTER EXPRESSION TELLS

### 12.1 Deception Tells (Physical)

When character is concealing truth, add subtle physical tells:

| Character | Deception Tell | Visual Translation |
|-----------|----------------|-------------------|
| Daniel | Eyes avert, jaw clenches | `averted eyes, jaw set` |
| Cat | Clinical mask, over-precise | `neutral expression, intense focus` |
| Webb | Controlled stillness | `stoic expression, unnaturally still` |

### 12.2 Character-Specific Expression Vocabulary

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

---

## 13. LOCATION ATMOSPHERE MAPPING

### 13.1 Location → Sensory Palette

Each location has a sensory palette affecting visual mood:

| Location | Primary Senses | Visual Translation |
|----------|----------------|-------------------|
| **NHIA Facility 7** | Dust, ozone, clinical | `volumetric dust, cold blue lighting` |
| **Server Vault** | Hum, cold blue glow | `amber pulse, cold blue glow` |
| **MMB Interior** | Antiseptic, cramped | `blue monitor glow, clinical` |
| **Safehouse** | Tactical tension | `dim lamp light, screen glow` |
| **Atlanta Ruins** | Decay, openness | `golden hour, volumetric fog` |

### 13.2 Time of Day → Lighting Override

| Time | Lighting Keywords |
|------|-------------------|
| Pre-dawn | `blue hour, cold light` |
| Morning | `soft natural lighting, warm` |
| Midday | `harsh overhead, high contrast` |
| Golden hour | `golden hour, warm amber` |
| Dusk | `blue hour, fading light` |
| Night (interior) | `artificial lighting, screen glow` |
| Night (exterior) | `moonlight, deep shadows` |

**Data Flow Requirement:**
- The `time_of_day` field MUST be extracted from Episode Context JSON (`scene.time_of_day`)
- Extraction function: `extractSceneOverrides()` in `promptGenerationService.ts`
- Passed to: `processEpisodeWithFullContext(episode, { sceneOverrides })` in `beatStateService.ts`
- Applied in: `buildSceneVisualContext()` → `getLightingForTimeOfDay()` in `fluxVocabularyService.ts`

**Episode Context JSON Structure:**
```json
{
  "episode": {
    "scenes": [
      {
        "scene_number": 1,
        "time_of_day": "night",
        ...
      }
    ]
  }
}
```

### 13.3 Sensory-to-Visual Translation (Establishing Shots)

For establishing shots where beat describes abstract sensory experiences, translate to camera-observable visuals:

| Beat Describes | Translate To |
|----------------|--------------|
| "silence", "quiet" | `still air, motionless equipment, undisturbed dust` |
| "pressurized", "heavy" | `cramped tight space, low ceiling, close walls` |
| "thick air" | `visible dust particles suspended in air, hazy atmosphere` |
| "tension" | `harsh shadows, high contrast lighting, stark emptiness` |
| "cold/sterile" | `clinical white surfaces, sharp edges, antiseptic gleam` |
| "oppressive" | `looming walls, narrow corridor, ceiling pressing down` |
| "abandoned" | `dust-covered surfaces, cobwebs, scattered debris` |
| "ominous" | `deep shadows, single light source, silhouettes` |

**Rule:** Abstract feelings → Camera-observable physical elements. The camera cannot see "tension" but can see "harsh shadows."

---

## APPENDIX A: CHARACTER TRIGGERS REFERENCE

### FLUX LoRAs (SwarmUI Route)

| Character | FLUX Trigger | Status |
|-----------|--------------|--------|
| Cat Mitchell | `JRUMLV woman` | VALIDATED |
| Daniel O'Brien | `HSCEIA man` | VALIDATED |
| Dr. Sarah Chen | `[TBD - FLUX trigger unknown]` | NEEDS LOOKUP |

### zimage LoRAs (ComfyUI Route)

| Character | zimage Trigger | Notes |
|-----------|----------------|-------|
| Cat Mitchell | `JRUMLV woman` | Same as FLUX |
| Daniel O'Brien | `daveman` | **DIFFERENT** from FLUX |
| Dr. Sarah Chen | `chen chen` | zimage only |
| Colonel Marcus Webb | `webbman` | zimage only |
| Teresa "2K" Cristina | `2kwoman` | zimage only |

### Routing Quick Reference

```
Chen, Webb, or 2K present? → zimage/ComfyUI
Only Cat/Daniel?           → FLUX/SwarmUI
No characters?             → FLUX/SwarmUI (default)
```

> **NOTE:** Daniel has DIFFERENT triggers per route. Cat has SAME trigger for both.

### Gear States

| State | Description |
|-------|-------------|
| OFF_DUTY | Camo pants, olive t-shirt, no armor |
| SUIT_UP | Aegis suit vacuum-sealed, calibration pose |
| FIELD_OP | Full Aegis with color glow (BLUE/AMBER/RED) |
| CIVILIAN | Non-tactical, relaxed |

### Gear Context Enum (PostgreSQL - Case Sensitive!)

```
off_duty
suit_up
field_op
STEALTH
```

---

## APPENDIX B: WASTED TOKEN PATTERNS

Avoid these non-visual descriptive patterns:

```
off-duty in
in mobile medical base
in safehouse
in facility
at location
standing in
located at
currently in
```

These waste prompt tokens without adding visual information.

---

---

---

## 14. YOUTUBE MONETIZATION COMPLIANCE (Anti-Slop)

### 14.1 YouTube July 2025 Policy Summary

YouTube renamed "repetitious content" to **"inauthentic content"** - content that is mass-produced with minimal human input.

**Flagged for Demonetization:**
- Image slideshows with minimal narrative/commentary
- AI voiceover over static images with no human input
- Near-duplicate videos with minimal variation
- Content easily replicable at scale

**Remains Monetizable:**
- AI as a TOOL (human creative direction)
- Content with editorial value, commentary, transformation
- Unique storytelling reflecting creator's ideas

### 14.2 Beat Duration Guidelines (Visual Moment Model)

A beat = one visual moment (one camera composition). Each scene is a standalone 15-20 min video.

| Format | Min Beat Duration | Max Beat Duration | Images per Minute | Beats per Scene |
|--------|-------------------|-------------------|-------------------|-----------------|
| Standalone scene (15-20 min) | 15 seconds | 30 seconds | 2.5-4 | 45-60 |
| Shorts (60 sec) | 2 seconds | 15 seconds | 4-30 | N/A |

**Calculation:**
```
17.5-minute scene (avg) = 1050 seconds
Target beats: 45-60 (visual moments)
Average beat: 17.5-23 seconds on screen
NEW_IMAGE: 37-50 per scene
REUSE_IMAGE: 8-15 per scene (never 2+ consecutive)
```

### 14.3 Anti-Slop Quality Indicators

To ensure monetization eligibility, beat/prompt generation must:

| Indicator | Implementation |
|-----------|----------------|
| **Visual Variety** | No identical shots in sequence; vary framing, angle, lighting |
| **Narrative Purpose** | Each beat advances story or character; no padding |
| **Character Animation** | Expressions and poses change; not static faces |
| **Scene Progression** | Location artifacts vary within scene; not copy-paste backgrounds |
| **Editorial Intent** | Beat director fields show human creative decisions |

### 14.4 Beat Generation Anti-Monotony Rules

1. **No consecutive identical shot types** - vary framing beat-to-beat
2. **Expression must change** if emotional tone changes
3. **Pose/action must change** every 2-3 beats minimum
4. **Location elements rotate** - don't show same artifact combo repeatedly
5. **Lighting can shift** within scene for dramatic effect

### 14.5 Image Decision Logic

Each beat has `imageDecision` field:

| Type | Meaning | Count per Scene | Visual Change Required |
|------|---------|-----------------|------------------------|
| `NEW_IMAGE` | Generate new image (default) | 37-50 | Full new composition |
| `REUSE_IMAGE` | Use existing image | 8-15 | None (pan/zoom in video) |
| `NO_IMAGE` | No visual | 0-2 max | Extremely rare |

**Rules:**
- `REUSE_IMAGE` should not exceed 2 consecutive beats
- `NEW_IMAGE` for ANY new framing, expression change, angle, action, or subject
- `REUSE_IMAGE` ONLY when composition is truly identical

### 14.6 Transition Rules for Static-Image Video Format

These rules govern how images are held and transitioned in the final DaVinci Resolve video:

| Hold Type | Duration | Usage |
|-----------|----------|-------|
| Standard hold | 15-25 sec | Normal voiceover narration |
| Dramatic hold | 25-35 sec | Slow zoom/pan applied in post |
| Rapid sequence | 8-15 sec | Action beats (max 3-4 consecutive) |
| Max hold | 40 sec | Absolute maximum for any single image |

**Anti-Slideshow Rules:**
1. REUSE_IMAGE never more than 2 consecutive beats
2. Never 3 consecutive beats with same framing/angle
3. At least 2-3 environment beats per scene (no characters - establishing/atmosphere)
4. Action beats with `visualSignificance: "High"` are candidates for 5-10 sec video clip insertion (rare, 2-5 per scene max)

### 14.7 Visual Moment Split Rules

When decomposing script into beats, use these rules to determine beat boundaries:

| Scenario | Result |
|----------|--------|
| Screen/UI close-up + character reaction | 2 beats |
| Character A speaks + Character B responds | 2 beats |
| Same character, different action/expression | 2 beats |
| Wide establishing + character entry | 2 beats |
| Object focus + character holding it | 2 beats |

**Rule of thumb:** If you could imagine the editor cutting to a different camera angle, it is a separate beat.

---

---

## 15. IMAGE GENERATION ROUTING (FLUX vs zimage)

### 15.1 Routing Decision Tree

```
FOR each scene/beat:
  characters_present = get_characters_in_beat()

  IF any character IN ['Chen', 'Webb', '2K']:
      route = ZIMAGE (ComfyUI)
  ELSE IF characters IN ['Cat', 'Daniel'] only:
      route = FLUX (SwarmUI)
  ELSE IF no_characters (environment only):
      route = FLUX (SwarmUI)  # Default
```

### 15.2 Route Summary

| Characters Present | Route | System |
|-------------------|-------|--------|
| Cat alone | FLUX | SwarmUI |
| Daniel alone | FLUX | SwarmUI |
| Cat + Daniel | FLUX | SwarmUI |
| Chen alone | zimage | ComfyUI |
| Webb alone | zimage | ComfyUI |
| 2K alone | zimage | ComfyUI |
| Cat + Chen | zimage | ComfyUI |
| Daniel + Webb | zimage | ComfyUI |
| Any combo with Chen/Webb/2K | zimage | ComfyUI |
| Environment only (no characters) | FLUX | SwarmUI |

### 15.3 LoRA Triggers by Route

**FLUX Route (SwarmUI):**

| Character | FLUX Trigger |
|-----------|--------------|
| Cat Mitchell | `JRUMLV woman` |
| Daniel O'Brien | `HSCEIA man` |

**zimage Route (ComfyUI):**

| Character | zimage Trigger |
|-----------|----------------|
| Cat Mitchell | `JRUMLV woman` | *(same as FLUX)* |
| Daniel O'Brien | `daveman` | *(different from FLUX)* |
| Dr. Sarah Chen | `chen chen` |
| Colonel Marcus Webb | `webbman` |
| Teresa "2K" Cristina | `2kwoman` |

### 15.4 ComfyUI Template System (STUB - Future Build)

ComfyUI workflows will use templates based on scene composition:

**Character Templates:**
| Template | Use Case |
|----------|----------|
| `single_character.json` | One character in frame |
| `dual_character.json` | Two characters |
| `triple_character.json` | Three characters |
| `group_scene.json` | 4+ characters |

**Style LoRA Templates (Future):**

Location-specific style LoRAs that replace verbose location descriptions:

| Style LoRA | Replaces |
|------------|----------|
| `mmb_interior_style` | MMB location artifacts/description |
| `facility7_style` | NHIA Facility 7 atmosphere |
| `atlanta_ruins_style` | Post-collapse urban decay |
| `safehouse_style` | Tactical safehouse interior |

**Usage:** Instead of location shorthand in prompt, apply style LoRA to ComfyUI workflow.

### 15.5 Prompt Differences by Route

**FLUX Prompt (SwarmUI):**
```
[SHOT_TYPE] of a [TRIGGER] ([CHARACTER_DESCRIPTION]) [ACTION],
[EXPRESSION], in [LOCATION_SHORTHAND], [LIGHTING], [ATMOSPHERE]
<clothing_segment> <face_segment>
```

**zimage Prompt (ComfyUI):**
```
[SHOT_TYPE] of a [TRIGGER] ([CHARACTER_DESCRIPTION]) [ACTION],
[EXPRESSION], [LIGHTING]

# Location handled by style LoRA in workflow
# Segments handled differently in ComfyUI (TBD)
```

### 15.6 Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| FLUX/SwarmUI routing | **ACTIVE** | Current production path |
| zimage triggers | **DEFINED** | Triggers documented above |
| ComfyUI templates | **STUB** | Templates not yet built |
| Style LoRAs | **PLANNED** | Concept defined, not trained |
| Segment handling (zimage) | **TBD** | May differ from FLUX approach |

---

## 16. CAMERA REALISM PRINCIPLE (Z-IMAGE & FLUX)

### 16.1 Core Principle

> **"Z-Image is a camera, not a narrator."**

A prompt must describe ONLY what a camera can directly observe. If a detail cannot be verified visually by a photographer at the moment of capture, it **MUST NOT** be in the prompt.

**Violation causes:** Grain, noise, loss of photorealism, illustration-like output.

This principle applies to BOTH Z-Image and FLUX pipelines, with FLUX allowing specific relaxations documented below.

---

### 16.2 What to Include vs. Exclude

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Physical appearance (general) | Psychology |
| Lighting conditions | Backstory |
| Pose | Symbolism |
| Environment | Cultural analysis |
| Clothing (brief, non-symbolic) | Narrative interpretation |
| Camera framing | Moral/emotional explanation |
| Observable expressions | Internal states |

---

### 16.3 Implicit Over Explicit Rule

When a concept can be inferred visually, **imply it, don't declare it:**

| Concept | ✅ CORRECT | ❌ INCORRECT |
|---------|-----------|--------------|
| Age | "young woman" | "16 years old" |
| Emotion | "neutral expression, intense gaze" | "defiance visible in eyes" |
| Heritage | "warm brown skin, dark wavy hair" | "Cabocla heritage" |
| Importance | omit | "poster girl, secrets held within" |

**FLUX Exception:** Age can be explicit in FLUX (e.g., "28 years old" works fine).

---

### 16.4 No Semantic Stacking Rule

Do NOT stack multiple abstract descriptors in one clause:

**❌ FORBIDDEN stacking:**
- age + ethnicity + culture
- emotion + symbolism + narrative role
- identity + moral state

Each added abstraction increases noise probability.

**FLUX Exception:** Moderate stacking of **visual traits only** is acceptable:
```
35 years old Irish-American man with short white hair and gray eyes
```
This works in FLUX because of its T5 language encoder. BUT: Keep to visual descriptors, not backstory.

---

### 16.5 LoRA Interaction Rules

#### Rule 1: LoRA Authority

If a LoRA is loaded, it is the **authoritative source** for:
- Facial structure
- Age range
- Skin tone
- Hair type

**DO NOT** restate these traits in the prompt. Prompt/LoRA conflict causes grain and identity drift.

#### Rule 2: LoRA Weight Limits

| LoRA Type | Weight Range |
|-----------|--------------|
| Character | 0.8 – 1.0 |
| Skin/Photo | 0.15 – 0.35 |
| Style | ≤ 0.3 |

---

### 16.6 CFG Settings by Pipeline

| Pipeline | Recommended CFG |
|----------|-----------------|
| Z-Image Turbo | 1 – 2 |
| Z-Image Standard | ≤ 5.5 |
| FLUX | 1 – 3.5 |

**Never compensate for semantic overload with higher CFG** — it amplifies noise.

---

### 16.7 Z-IMAGE Prompt Template

```
photo of a [TRIGGER] [minimal physical details not covered by LoRA], [pose], [clothing - brief], [environment - brief], [lighting]
```

#### Example: Cat Mitchell (Z-Image Compliant)

**❌ NON-COMPLIANT (narrative language):**
```
photo of a JRUMLV woman (28 years old, field medic haunted by loss, analytical mind hiding deep trauma, former CDC researcher, green eyes that have seen too much death, wearing tactical gear that represents her transformation from healer to survivor)
```

**✅ Z-IMAGE COMPLIANT:**
```
photo of a JRUMLV woman, dark brown hair in tactical bun, wearing olive tactical vest over fitted shirt, kneeling, examining debris, neutral expression with intense gaze, collapsed concrete corridor, harsh diagonal lighting
```

#### Example: Daniel O'Brien (Z-Image Compliant)

**✅ Z-IMAGE COMPLIANT:**
```
photo of a HSCEIA man, short white hair, wearing tactical vest with rifle slung, standing in doorway, stoic expression, backlit with rim lighting, volumetric dust
```

---

### 16.8 FLUX Exceptions to Z-IMAGE Rules

FLUX's superior language understanding allows these relaxations:

#### 1. Age Can Be Explicit

| Z-Image | FLUX |
|---------|------|
| ❌ "28 years old" | ✅ "28 years old" works fine |
| ✅ "young woman" | ✅ "young woman" also works |

#### 2. Natural Language Is Preferred

Z-Image: Keyword-focused, minimal
FLUX: Responds better to flowing natural descriptions:

```
# Z-Image style (still works, but not optimal for FLUX)
woman, brown hair, tactical bun, green eyes, kneeling, examining debris, harsh lighting

# FLUX-optimized (natural language)
a woman with dark brown hair in a tactical bun and green eyes, kneeling to examine debris with intense focus, harsh diagonal lighting casting sharp shadows
```

#### 3. Emotional States Can Be More Explicit

| Z-Image | FLUX |
|---------|------|
| ❌ "defiance in eyes" | ✅ "determined expression" |
| ✅ "neutral expression, intense gaze" | ✅ "intense analytical gaze" |

FLUX understands emotional descriptors better — just keep them **observable** (what the face/body shows), not **internal** (what the character feels).

**Still avoid:** "haunted by past trauma" (internal state)
**Use instead:** "haunted expression" or "weary eyes" (visible)

#### 4. Light Context Is Tolerated

Z-Image: Strictly forbids story language
FLUX: Can handle light contextual framing:

```
a field medic examining blast damage in a bombed hospital corridor
```

The word "field medic" gives FLUX context that influences posture/demeanor without breaking photorealism.

**Still avoid:** Full backstory, symbolism, moral explanations

---


### 16.9 FLUX-Incompatible Language

FLUX's T5 encoder processes natural language descriptions of visual scenes. It does NOT understand narrative language, emotional states, story context, or abstract concepts. When the prompt contains these, FLUX either ignores them (wasting tokens) or misinterprets them (producing artifacts).

**CAN PHOTOGRAPH (include in prompts):**
- Body position ("woman gripping man's waist")
- Physical objects ("matte-black motorcycle", "gravel road")
- Light sources ("moonlight", "blue LED underglow")
- Material properties ("hexagonal weave pattern", "matte charcoal-black")
- Environmental elements ("dense forest", "rusted vehicles", "kudzu")

**CANNOT PHOTOGRAPH (exclude from prompts):**
- Emotions ("confident", "terrified", "conflicted") \u2192 Replace with observable expression: "tight jaw", "narrowed eyes", "clenched fists"
- Story context ("post-Collapse", "PSYOP", "hunting a ghost") \u2192 Replace with visual result: "abandoned overgrown environment"
- Sound ("speaking", "engine roar", "gravel crunching") \u2192 Replace with visual evidence: "mouth open mid-sentence", "motion blur", "gravel spraying"
- Internal states ("aware of his body beneath the suit") \u2192 Omit entirely
- Abstract atmosphere ("tense", "dangerous", "intimate") \u2192 Replace with lighting/environment: "harsh shadows", "debris field", "close proximity"

**Narrative \u2192 Visual Translation Table:**

| Narrative Language | Problem | FLUX-Compatible Replacement |
|---|---|---|
| "fused together by the speed and suits" | Metaphor \u2014 FLUX may literally try to fuse the bodies | "woman pressed tight against man's back" |
| "speaking into comms" | She's talking to Daniel beside her | "woman leaning toward man's shoulder" or omit (can't photograph speech) |
| "shifting weight as dinghy's tires bite into loose gravel" | Mixed narrative + visual | "woman lifting off motorcycle seat, gravel spraying from rear tire" |
| "sharp, confident expression" + "stoic expression" | Two expressions on one character | Pick ONE: "focused forward gaze" |
| "post-collapse atmosphere" | Abstract concept | "overgrown ruins, cracked asphalt, rusted vehicles" |
| "in motion, artificial lighting, screen glow" | Contradictory \u2014 outdoor night scene has no screens | Remove \u2014 use "moonlight" and "LED underglow" |

### 16.10 FLUX Prompt Template

```
[shot type] of a [TRIGGER] ([age], [2-3 physical details not in LoRA], [clothing]), [action phrase], [observable expression], in [location shorthand], [lighting], [atmosphere word] <segment>
```

#### Example: Cat Mitchell (FLUX Optimized)

```
medium shot of a JRUMLV woman (28 years old, dark brown hair in tactical bun, green eyes with gold flecks, athletic build, wearing olive tactical vest over form-fitting shirt, dual holsters) kneeling to examine twisted rebar with gloved hand, intense clinical focus, in collapsed concrete corridor with dust motes floating in harsh diagonal sunbeams, desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

---

### 16.11 Quick Reference: Z-IMAGE vs FLUX

| Aspect | Z-Image Rule | FLUX Exception |
|--------|--------------|----------------|
| Age | Implicit only ("young woman") | Explicit OK ("28 years old") |
| Semantic stacking | Forbidden | Moderate OK (visual traits only) |
| Language style | Keyword-focused | Natural language preferred |
| Emotion words | Expression only | Emotion + expression OK |
| Context | None | Light context OK ("field medic") |
| CFG | 1-2 (Turbo) / ≤5.5 (Standard) | 1-3.5 |
| LoRA conflict | Forbidden | Forbidden (same) |
| Backstory | Forbidden | Forbidden (same) |
| Photography terms | Helpful | Very helpful |
| Shot types | Limited | Highly reliable |

---

### 16.12 Failure Mode Quick Reference

| Symptom | Cause |
|---------|-------|
| Grain | Semantic overload |
| Plastic skin | Over-smoothing or high LoRA weight |
| Identity drift | Prompt contradicts LoRA |
| Illustration look | Narrative language in prompt |

---

### 16.13 Location Description Compaction

Location descriptions often contain narrative elements invisible to the camera. Apply systematic elimination:

#### Elimination Analysis Example

**Original (54 words):**
```
in a former CDC satellite facility that was bombed during faction fighting, with collapsed ceiling panels hanging by wires, shattered glass and overturned medical equipment scattered across tiled floors covered in dust and ash, emergency backup lights casting harsh shadows, exposed rebar and concrete, clinical white walls now gray with soot, skeletal fluorescent
```

| Original Phrase | Verdict | Reason |
|-----------------|---------|--------|
| `in a` | ❌ CUT | Preposition + article |
| `former` | ❌ CUT | Camera can't see "former" |
| `CDC satellite facility` | ❌ CUT | Narrative context — camera sees building, not affiliation |
| `that was` | ❌ CUT | Filler |
| `bombed` | ✅ KEEP | Implies destruction aesthetic |
| `during faction fighting` | ❌ CUT | Backstory — camera can't see "who" bombed it |
| `with` | ❌ CUT | Preposition |
| `collapsed ceiling panels` | ✅ KEEP | Strong visual anchor |
| `hanging by wires` | ⚠️ OPTIONAL | Vivid but adds words |
| `shattered glass` | ✅ KEEP | Good texture detail |
| `and overturned medical equipment` | ❌ CUT | Redundant — one debris type enough |
| `scattered across` | ❌ CUT | Implied by context |
| `tiled floors covered in` | ❌ CUT | Verbose |
| `dust and ash` | ⚠️ SIMPLIFY | → `dust` (ash is redundant) |
| `emergency backup lights` | ✅ KEEP | → `emergency lights` |
| `casting harsh shadows` | ⚠️ SIMPLIFY | → `harsh shadows` (casting implied) |
| `exposed rebar and concrete` | ✅ KEEP | → `exposed rebar` (concrete implied) |
| `clinical white walls now gray with soot` | ❌ CUT | "now" = temporal narrative, "clinical white" = what it *was* |
| `skeletal fluorescent` | ✅ KEEP | Great shorthand (add "fixtures") |

**Compacted (17 words):**
```
bombed corridor, collapsed ceiling panels, shattered glass, exposed rebar, skeletal fluorescent fixtures, emergency lights, harsh shadows, dust haze
```

**Location Shorthand (12 words):**
```
collapsed corridor, twisted rebar, shattered glass, flickering emergency lights, volumetric dust
```

#### What Was Actually Lost?

**Nothing the camera could see.**

| Cut Element | Why It Doesn't Matter |
|-------------|----------------------|
| "CDC satellite facility" | FLUX doesn't know what CDC looks like — it sees "corridor" |
| "faction fighting" | Invisible backstory |
| "former" | Temporal — camera sees present state |
| "overturned medical equipment" | One debris type is enough; glass + rebar = destruction |
| "tiled floors" | Implied by "corridor" |
| "clinical white walls now gray" | Camera sees gray — can't see what it "used to be" |

---

### 16.14 Preposition Rules

FLUX's T5 encoder understands natural language, so it can infer some relationships — but prepositions defining **spatial relationships** are often critical.

#### Prepositions You Can Often Drop

**"of" (Ownership/Description):**
```
# Verbose
photo of a woman with hair of dark brown color

# Compact (works fine)
photo, woman, dark brown hair
```

**"a/an" (Articles):**
```
# Verbose
a woman wearing a tactical vest holding a rifle

# Compact (works fine)
woman wearing tactical vest holding rifle
```

**"in" (When Environment is Obvious):**
```
# Verbose
standing in collapsed corridor

# Compact (usually works)
standing, collapsed corridor
```

**"with" (Attributes):**
```
# Verbose
woman with green eyes with athletic build

# Compact (works fine)
woman, green eyes, athletic build
```

#### Prepositions You MUST Keep

**Spatial Position: "on left" / "on right":**
```
# CRITICAL for dual characters
HSCEIA man on left and JRUMLV woman on right

# ❌ BROKEN - FLUX won't know positioning
HSCEIA man left JRUMLV woman right
```

**Directional: "facing" / "toward" / "at":**
```
# Necessary for gaze/orientation
looking at camera
facing right
turned toward debris

# ❌ AMBIGUOUS
looking camera  (looking like a camera? looking at?)
```

**Attachment: "on" / "across" / "over" (Clothing/Gear):**
```
# Clear
vest over shirt, rifle slung across chest

# ❌ AMBIGUOUS
vest shirt rifle slung chest
```

**Lighting Direction: "from" / "through":**
```
# Clear
light streaming through broken ceiling
rim lighting from behind

# ❌ BROKEN
light streaming broken ceiling (streaming what?)
rim lighting behind (behind what?)
```

#### Preposition Quick Reference

| Preposition | Drop? | Reason |
|-------------|-------|--------|
| `of` | ✅ Often | "photo of a" → "photo," |
| `a/an` | ✅ Usually | Articles rarely needed |
| `with` (attributes) | ✅ Usually | "woman with brown hair" → "woman, brown hair" |
| `in` (environment) | ⚠️ Sometimes | Works if context is clear |
| `on left/right` | ❌ Never | Critical for positioning |
| `at` (gaze) | ❌ Never | "looking at viewer" needs it |
| `facing` | ❌ Never | Orientation marker |
| `over/under` | ❌ Never | Layering needs clarity |
| `across/slung` | ❌ Never | Attachment position |
| `from/through` | ❌ Never | Light direction |

---

### 16.15 Compacting Strategies

#### Use Commas as Implicit "with/and"

```
# Verbose
woman with dark brown hair and green eyes and athletic build wearing tactical vest

# Compact
woman, dark brown hair, green eyes, athletic build, tactical vest
```

#### Use Participles Instead of "is/are + preposition"

```
# Verbose
woman who is standing in the doorway

# Compact
woman standing doorway
```

#### Compound Adjectives

```
# Verbose
hair in a tactical bun

# Compact
tactical-bun hair
# Or just
tactical bun
```

#### Drop "photo of a" Entirely

```
# Verbose
photo of a JRUMLV woman standing...

# Compact
JRUMLV woman standing...
```

FLUX knows it's generating an image — you don't need to tell it.

#### Full Compaction Example

**Original (61 words):**
```
medium shot of a JRUMLV woman (28 years old, with dark brown hair in a tactical bun, with green eyes with gold flecks, with a fit athletic build, wearing MultiCam tactical pants tucked into combat boots, wearing a tactical vest with pouches over an olive shirt) kneeling to examine debris, with an intense clinical focus, in a collapsed corridor, with flickering emergency lights
```

**Compacted (41 words):**
```
medium shot, JRUMLV woman (28 years old, dark brown tactical bun, green eyes gold flecks, athletic build, MultiCam tactical pants tucked into combat boots, tactical vest over olive shirt) kneeling examining debris, intense clinical focus, collapsed corridor, flickering emergency lights
```

**What Was Dropped:**
- "of a" → comma
- "with" (attributes) → comma
- "hair in a" → just "tactical bun"
- "with an" → nothing
- "in a" (environment)

**Token savings:** 33% reduction with zero visual information loss.

---

### 16.16 Parentheses Grouping (Attribute Containment)

Parentheses act as logical grouping for FLUX and **prevent attribute bleed** between characters.

#### Why Delimiters Help

| Benefit | Explanation |
|---------|-------------|
| **Attribute containment** | Keeps "green eyes" attached to the woman, not the environment |
| **Dual character clarity** | Essential when two characters have different attributes |
| **Prompt readability** | Easier to edit/maintain |
| **LoRA association** | Groups modifiers with the trigger |

#### Prompt Anatomy

```
[shot type], [TRIGGER (character attributes)] [action], [expression], [LOCATION BODY], [lighting] <segment>
                    ↑                                                      ↑
              PARENTHESES                                               BODY
           (character only)                                    (environment, lighting)
```

#### What Goes Where

| PARENTHESES (Character) | BODY (Scene) |
|-------------------------|--------------|
| Age | Location anchor elements |
| Hair | Lighting source |
| Eyes | Lighting quality |
| Build | Atmosphere word |
| Clothing | Props NOT held by character |
| Gear worn | Environmental detail |

**Parentheses = noun modifiers (attributes OF the character)**
**Body = scene context (where the character IS)**

#### Structure Template

```
[shot], TRIGGER (age, hair, eyes, build, clothing) [action], [expression], [location], [lighting] <segment>
```

| Section | Content | Example |
|---------|---------|---------|
| **Shot** | Framing | `medium shot,` |
| **Trigger + Parens** | Character identity | `JRUMLV woman (28 years old, tactical bun, green eyes, athletic build, tactical vest over olive shirt)` |
| **Action** | What they're doing | `kneeling examining debris,` |
| **Expression** | Face/demeanor | `intense clinical focus,` |
| **Location** | Environment shorthand | `collapsed corridor, exposed rebar,` |
| **Lighting** | Light source/quality | `flickering emergency lights, volumetric dust` |
| **Segment** | Face refinement | `<segment:yolo-face_yolov9c.pt-0,0.35,0.5>` |

#### Single Character — Optional but Tidy

```
# Without parens (works fine)
JRUMLV woman, 28 years old, tactical bun, green eyes, tactical vest, kneeling

# With parens (cleaner)
JRUMLV woman (28 years old, tactical bun, green eyes, tactical vest) kneeling
```

#### Dual Characters — ESSENTIAL

```
# ❌ WITHOUT PARENS — Attribute bleed risk
HSCEIA man, 35 years old, white hair, gray eyes, tactical vest on left and JRUMLV woman, 28 years old, brown hair, green eyes on right

# ✅ WITH PARENS — Clear grouping
HSCEIA man (35 years old, white hair, gray eyes, tactical vest) on left and JRUMLV woman (28 years old, brown hair, green eyes, tactical vest) on right
```

Without parentheses, FLUX might give the woman white hair or the man green eyes.

#### Complete Single Character Example

```
medium shot, JRUMLV woman (28 years old, dark brown tactical bun, green eyes, athletic build, tactical vest over olive shirt, dual holsters) kneeling examining twisted rebar, intense clinical focus, collapsed corridor, exposed rebar, shattered glass, flickering emergency lights, volumetric dust, harsh shadows <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

**Visual Breakdown:**
```
medium shot,                                          ← SHOT TYPE
JRUMLV woman (                                        ← TRIGGER
  28 years old,                                       ┐
  dark brown tactical bun,                            │
  green eyes,                                         ├─ PARENTHESES (character)
  athletic build,                                     │
  tactical vest over olive shirt,                     │
  dual holsters                                       ┘
)
kneeling examining twisted rebar,                     ← ACTION
intense clinical focus,                               ← EXPRESSION
collapsed corridor,                                   ┐
exposed rebar,                                        ├─ BODY (location)
shattered glass,                                      ┘
flickering emergency lights,                          ┐
volumetric dust,                                      ├─ BODY (lighting/atmosphere)
harsh shadows                                         ┘
<segment:yolo-face_yolov9c.pt-0,0.35,0.5>            ← SEGMENT (end)
```

#### Dual Character Example

```
medium shot, HSCEIA man (35, white hair, gray eyes, tactical vest, rifle slung) on left and JRUMLV woman (28, tactical bun, green eyes, tactical vest) on right, professional distance, eye contact, bombed server room, black server monoliths, cold blue emergency glow <segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

**Structure:**
```
CHAR 1 (attributes) on left and CHAR 2 (attributes) on right, [interaction], [location body], [lighting] <segments>
```

#### Quick Rules

| Do | Don't |
|----|-------|
| `TRIGGER (attributes)` | `TRIGGER (attributes,)` ← trailing comma |
| Separate expression from age | `32 years old relaxed` ← combined |
| Use parentheses for dual scenes | Free-form attributes for two characters |
| Keep clothing inside parens | Split clothing outside parens |
| Commas between attributes | `and` between every attribute |

#### Delimiter Rules

| Delimiter | Use | Avoid |
|-----------|-----|-------|
| **Parentheses `()`** | Character attribute grouping | — |
| **Brackets `[]`** | ❌ Conflicts with SwarmUI syntax | `[random]` ranges |
| **Angle brackets `<>`** | Reserved for segments/LoRAs | `<segment:>` `<lora:>` |

---

### 16.17 Key Takeaway

**Strip out everything the camera can't see:**

1. No backstory
2. No emotions explained (only expressions described)
3. No cultural/ethnic labels (only visual traits)
4. No narrative importance
5. Let the LoRA handle identity; prompt handles pose/environment/lighting

**The core principle transfers to both pipelines:** Describe what a camera sees, not what a narrator knows. FLUX just gives you more linguistic flexibility in how you describe it.

---
---

## 17. TOKEN BUDGET ALLOCATION (v0.19 — Adaptive)

### 17.1 Adaptive Budget Table

Token budget is calculated **per beat** based on shot type, character count, and helmet state. Replaces the fixed 200-token hard limit from v0.18.

| Shot Type | 1 Char (no helmet) | 1 Char (helmet) | 2 Chars (no helmets) | 2 Chars (helmets) |
|-----------|--------------------|-----------------|--------------------|-------------------|
| close-up | 250 | 245 | 280 | 270 |
| medium shot | 220 | 215 | 260 | 250 |
| wide shot | 180 | 175 | 200 | 190 |
| extreme wide | 150 | 145 | 170 | 160 |
| establishing | 150 | — | — | — |

### 17.2 Budget Modifiers

- **Helmet sealed**: -30 tokens (no hair ~15, no face ~10, no eye color ~5), +25 reinvested into suit detail = net -5 per helmeted character
- **Vehicle in scene**: +20 tokens to total (motorcycle description + spatial arrangement)

### 17.3 Per-Section Allocation

Budget is split across sections. The `composition` section (first ~30 tokens) is always allocated — it has the highest T5 attention.

```
  COMPOSITION:   ~30 tokens (constant)  <- HIGHEST T5 ATTENTION
  CHARACTER 1:   varies by shot type (close: 45%, medium: 35%, wide: 22%)
  CHARACTER 2:   varies (close: ~93% of char1, medium: ~92%, wide: ~89%)
  ENVIRONMENT:   varies (close: 28%, medium: 35%, wide: 45%)
  ATMOSPHERE:    remaining tokens
  SEGMENT TAGS:  ~15 tokens (constant, not counted in T5 budget)
```

### 17.4 Core Composition Sweet Spot

COMPOSITION COMES FIRST. The first ~30 tokens define WHO is WHERE doing WHAT. Character details go in tokens 31-80 (GOOD attention zone). Beyond the adaptive budget, T5 loses coherence.

### 17.5 Override-Aware Character Injection

When a character is missing from Gemini's output, post-processing injects their **condensed** `swarmui_prompt_override` at the attention-optimal position (token 31-80 zone, after first character description). Override condensation by shot type:

| Shot Type | Strategy | ~Output Tokens |
|-----------|----------|---------------|
| close-up | Full override with all details | 70-160 |
| medium shot | Core appearance + suit, drop trailing accessories | 40-80 |
| wide shot | Trigger + suit color + helmet state only | 20-30 |
| extreme wide | Trigger + "matte-black tactical suit" | 8-12 |

**Implementation:** `promptGenerationService.ts:calculateAdaptiveTokenBudget()`, `condenseOverrideForShot()`, `injectMissingCharacterOverrides()`

---

## 18. CANONICAL DESCRIPTIONS

### 18.1 Forbidden Fabrication Terms

The prompt generator MUST NOT fabricate, embellish, or improvise gear details. The following terms are **FORBIDDEN** (fabricated by LLMs, not in canonical reference):

- "tactical sensor arrays"
- "weapon mounting points"
- "combat webbing"
- "ammunition pouches"
- "geometric sensor patterns"
- "biometric monitors"
- "reinforced joints"

### 18.2 Canonical Aegis Terms (Use These)

- "skin-tight matte charcoal-black Aegis suit with hexagonal weave pattern"
- "vacuum-sealed second-skin fit"
- "smooth latex-like surface with zero wrinkles"
- "molded armored bust panels with [COLOR] LED underglow" (Cat)
- "molded chest armor plates with [COLOR] LED underglow" (Daniel)
- "Wraith helmet fully sealed with dark opaque visor" (visor down)
- "matte charcoal angular faceplate, sensor array active" (helmet detail)
- "ribbed reinforcement panels at joints and spine" (detailed shots only)

### 18.3 Aegis Identity Rule

The Aegis suit is a **BIOSUIT**, not military tactical gear. It molds to the body like a second skin.

**NEVER use:** tactical vest, cargo pockets, loose fitting, BDU, fatigues, combat webbing, ammunition pouches.

### 18.4 Abbreviation by Shot Type

Suit description length scales with shot proximity:

| Shot Type | Description Level | Token Budget per Character |
|---|---|---|
| **CLOSE-UP** (face/detail shot) | Full canonical description \u2014 material, texture, LED color, mesh underlayer, ribbed reinforcement | Full |
| **MEDIUM SHOT** (waist up) | Standard \u2014 suit color, hexagonal weave, helmet state, LED underglow, primary accessory (medical kit or M4) | Standard |
| **WIDE SHOT** (full body + environment) | Abbreviated \u2014 "skin-tight matte charcoal-black Aegis suit with hexagonal weave pattern and sealed Wraith helmet" | ~15 tokens |
| **EXTREME WIDE** (establishing) | Minimal \u2014 "matching matte-black tactical suits and sealed helmets" | ~8 tokens (both characters combined) |

**Implementation:** `promptGenerationService.ts:validateCanonicalDescriptions()`

---

## 19. FLUX RENDERING RULES

These rules reflect how FLUX.1-dev actually processes prompts and MUST be encoded in the generation logic.

### 19.1 Subject-First Ordering

FLUX gives the most weight to what appears first in the prompt. The primary visual subject MUST lead.

```
WRONG:  "dark forest road at night, cold moonlight, two riders on motorcycle..."
         (FLUX renders a forest. Motorcycle is an afterthought.)

RIGHT:  "man and woman riding together on matte-black motorcycle on dark forest
         road at night, cold moonlight..."
         (FLUX renders the motorcycle with riders. Forest is context.)
```

### 19.2 Explicit Spatial Relationships

FLUX has weak spatial reasoning. Vague positioning = random placement.

```
WRONG:  "HSCEIA man in front and JRUMLV woman behind"
         (Ambiguous \u2014 in front of what? Behind what?)

RIGHT:  "HSCEIA man driving the motorcycle with JRUMLV woman seated behind
         him arms wrapped around his waist"
         (Physical relationship explicitly described.)
```

### 19.3 No Prompt Weighting

Parenthetical weights `(concept:1.5)` do NOT work on FLUX. The T5 encoder ignores them. Do not include them.

### 19.4 No Negative Prompts

FLUX does not support negative prompts. Quality control must happen through positive description specificity, not negative exclusion.

### 19.5 Natural Language Over Keywords

FLUX's T5 encoder understands sentences better than comma-separated tag lists.

```
WRONG:  "matte black, motorcycle, two riders, night, forest, moonlight, motion blur"

RIGHT:  "two riders on a matte-black motorcycle speeding through a dark forest
         road at night with moonlight filtering through trees and motion blur
         on the road edges"
```

### 19.6 Prompt Length Sweet Spot

40-80 tokens for the core composition. Total prompt under 200 tokens including segment tags. Beyond 200 tokens, FLUX begins losing coherence on later elements.

---

## 20. DECISION FRAMEWORKS

When no `styleGuide` is provided with the beat, the engine must make autonomous cinematography decisions using these frameworks.

### 20.1 The Three-Question Framework

For any beat without a styleGuide, answer these three questions:

```
QUESTION 1: What is the SUBJECT of this image?
  \u2192 Determines what leads the prompt (first 30 tokens)
  \u2192 Determines shot type (wide for location, close for face, medium for action)

QUESTION 2: What is the MOOD of this scene?
  \u2192 Determines lighting recipe and color grade
  \u2192 Determines depth of field

QUESTION 3: Where is the CAMERA?
  \u2192 Determines angle (low, eye level, high, behind, side)
  \u2192 Apply Cat visual anchor directive if she's in frame
```

### 20.2 Subject \u2192 Shot Type Decision Matrix

| Subject of the Image | Default Shot | Default Angle | Depth |
|---|---|---|---|
| Character's face/reaction | Close-up or medium close-up | Eye level | Shallow |
| Character's full body action | Medium or wide | Low angle for power, eye level for neutral | Deep focus for action, shallow for character |
| Two characters interacting | Medium shot | Eye level or slight low | Shallow |
| Two characters on vehicle | Wide shot | Low rear three-quarter (if Cat in frame) | Deep focus |
| Location/environment | Extreme wide or wide | Eye level or high angle for overview | Deep focus |
| Object/evidence | Close-up or macro | Eye level or overhead | Shallow |
| Character silhouette | Wide shot | Low angle against sky/light source | Deep focus |
| HUD/screen content | Close-up or POV | Eye level | Shallow |

### 20.3 Mood \u2192 Lighting Decision Matrix

| Narrative Mood | Lighting Recipe | Color Grade |
|---|---|---|
| Tense investigation | harsh overhead fluorescent, cold blue emergency lighting | `cold blue forensic lighting, clinical white highlights` |
| Tactical movement | mixed artificial sources, minimal ambient | `desaturated tactical color grade, muted greens and grays` |
| Night exterior ops | cold moonlight, deep shadows, suit LED as accent | `cold blue rim lighting, deep shadows, minimal ambient` |
| Emotional vulnerability | single warm light source, soft shadows | `warm amber lighting, soft shadows, muted earth tones` |
| Combat/danger | harsh directional light, high contrast, red/amber accents | `warm amber and orange danger accents, high contrast shadows` |
| Horror/supernatural | sickly or unnatural light, deep blacks | `sickly green undertones, harsh contrast, deep black shadows` |
| Corporate threat | even overhead, clinical, too-clean | `cool neutral tones, polished reflections, even clinical lighting` |
| Hope/rebuilding | natural daylight, bright, warm | `natural warm lighting, gentle contrast` |

### 20.4 Camera Angle \u2192 Cat Directive Integration

When Cat is in the frame and no styleGuide specifies the angle:

```
Is Cat's face visible?
  YES \u2192 She is the emotional anchor.
    Is this an emotional/dialogue beat?
      YES \u2192 Medium close-up, eye level or slight low angle. Face leads.
      NO \u2192 Medium shot, slight low angle. Bust + face + authority framing.

  NO (visor down) \u2192 Her silhouette is the image.
    Is she in motion?
      YES \u2192 Rear three-quarter or side angle. Medium or wide shot.
           Emphasize her figure in the suit against the environment.
      NO \u2192 Low angle looking up. Shape against sky/background.
    Is she on the Dinghy?
      YES \u2192 Low rear three-quarter. Her figure wrapped around Daniel's back.
      NO \u2192 Frame to show waist-hip-shoulder ratio in the suit.
```

When Cat is NOT in the frame (Daniel solo, empty scene, supporting characters), use the standard Subject \u2192 Shot Type matrix from 20.2.

---

## 21. SCENE TYPE TEMPLATES

These are reusable prompt skeletons for recurring scene types. The engine should match the incoming beat to a template, then fill in the specifics from the canonical references.

### 21A. VEHICLE \u2014 Motorcycle (The Dinghy)

**When to use:** Any beat where characters are riding or interacting with the motorcycle.

**Template:**
```
[shot] from [angle], [vehicle description] [vehicle_state] on [road_surface],
[character_1_position] in [suit_abbreviated] and [helmet_state],
[character_2_position] in [suit_abbreviated] and [helmet_state],
[environment], [lighting], [color_grade]
```

**Variables:**

| Variable | Options |
|---|---|
| shot | `wide shot` (default), `medium shot` (closer character focus) |
| angle | `low rear three-quarter angle` (default when Cat present), `low front angle`, `side angle` |
| vehicle description | `matte-black armored motorcycle with aggressive angular lines and reinforced carbon-fiber frame` |
| vehicle_state | `speeding`, `sliding on gravel`, `stopped`, `idling`, `leaning into turn` |
| road_surface | `dark forest road`, `cracked asphalt`, `loose gravel road`, `flooded ditch`, `old logging trail` |
| character_1_position | `[TRIGGER] man driving in front` |
| character_2_position | `[TRIGGER] woman seated behind him [physical_contact]` |
| physical_contact | `arms wrapped around his waist`, `gripping his waist tightly`, `pressed against his back`, `lifting off seat` |
| suit_abbreviated | `skin-tight matte charcoal-black Aegis suit with hexagonal weave pattern` |
| helmet_state | See Section 3.6.4 |

**Riding beats \u2192 always visor DOWN, no face segments.**

**Example (filled):**
```
wide shot from low rear three-quarter angle, matte-black armored motorcycle with aggressive angular lines and reinforced carbon-fiber frame speeding on dark forest road, HSCEIA man driving in front in skin-tight matte charcoal-black Aegis suit with hexagonal weave and sealed Wraith helmet with dark visor, JRUMLV woman pressed against his back arms wrapped around his waist in matching Aegis suit with molded armored bust panels with blue LED underglow and sealed Wraith helmet, dense Georgia forest with kudzu, cold moonlight through canopy, blue underglow from suit seams, desaturated tactical color grade
```

### 21B. INDOOR DIALOGUE \u2014 Safehouse / Command Center / Medical

**When to use:** Two characters talking in an interior location, planning, arguing, sharing information.

**Template:**
```
[shot], [depth], [character_1] [position_in_room] [action/posture],
[expression], and [character_2] [position_in_room] [action/posture],
[expression], [location_visual_condensed], [lighting], [color_grade]
<segment_tags>
```

**Key rules:**
- Both characters must be in the prompt even if beat focuses on one speaking
- Position them in the room relative to environmental anchors (desk, screens, doorway)
- Faces visible \u2192 face segments for both
- OFF_DUTY gear state (unless they suited up and haven't changed)

**Example (Dan's Safehouse):**
```
medium shot, shallow depth of field, HSCEIA man standing at investigation board with city maps and surveillance photos pinned to wall on left and JRUMLV woman seated at communications desk on right, tense expressions, safehouse apartment with reinforced windows and monitor screens glowing blue, warm work light mixed with blue monitor glow, desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

### 21C. COMBAT / BREACH

**When to use:** Active firefight, door breach, tactical engagement.

**Template:**
```
[shot] from [angle], [character_1] [combat_action] in [full_suit_description]
with [weapon_state] and [helmet_HUD_state], [character_2_if_present]
[combat_action], [environment], [lighting], [color_grade]
```

**Key rules:**
- Helmet HUD ACTIVE \u2014 no faces, no hair, no face segments
- LED underglow: RED (active combat) or AMBER (elevated threat)
- Action verbs: breaching, firing, taking cover, advancing, clearing room
- Wide or medium shot to show spatial context
- Deep focus \u2014 everything sharp

**Example (Warehouse Breach):**
```
wide shot from low angle, HSCEIA man breaching rusted steel door in skin-tight matte charcoal-black Aegis suit with hexagonal weave and molded chest armor plates with red LED underglow, Wraith helmet with HUD display on visor, M4 carbine raised, JRUMLV woman stacked behind him in matching Aegis suit with red LED underglow and sealed Wraith helmet, vast warehouse interior with industrial skylights and rusted shelving, harsh tactical flashlight beam cutting through dust haze, warm amber and orange danger accents with high contrast shadows
```

### 21D. STEALTH / INFILTRATION

**When to use:** Covert movement through hostile territory, sneaking, reconnaissance.

**Template:**
```
[shot] from [angle], [character(s)] moving tactically through [environment],
[suit_description] with [helmet_DOWN], [stealth_posture], [lighting],
[color_grade]
```

**Key rules:**
- Helmet visor DOWN \u2014 sealed for noise/light discipline
- LED underglow: BLUE (standard) \u2014 not red, they're hiding
- Low light, deep shadows, minimal ambient
- Deep focus \u2014 environment is as important as characters
- Posture keywords: crouching, low profile, flowing between cover, pressed against wall

**Example (Suburban Necropolis):**
```
wide shot, two figures in skin-tight matte charcoal-black Aegis suits with hexagonal weave moving tactically through abandoned suburban street, sealed Wraith helmets with dark visors, man in front with sidearm at low ready flowing between cover, woman following checking medical pouch, dead houses with dark windows and overgrown yards on both sides, child's bicycle on ground with bleached streamers, cold moonlight casting long shadows, blue LED underglow faintly visible at suit seams, desaturated blue-gray color grade
```

### 21E. ESTABLISHING / ENVIRONMENT

**When to use:** Scene opening, new location reveal, transition between scenes.

**Template:**
```
extreme wide establishing shot, [location_visual_description],
[characters_tiny_in_frame_if_present], [environmental_storytelling_detail],
[lighting], [atmosphere], [color_grade]
```

**Key rules:**
- Characters are SMALL in frame \u2014 minimal description needed
- Location visual leads the prompt (first 30 tokens)
- Deep focus, everything sharp
- Environmental storytelling: abandoned objects, decay markers, nature reclaiming
- No face segments even if characters present (too small in frame)

**Example (Atlanta Emergency Zone):**
```
extreme wide establishing shot, downtown Atlanta medical district transformed into militarized emergency zone, concrete barriers and weapon scanners, makeshift triage tents between abandoned CDC vehicles, Georgia Dome collapsed section in distance, graffiti marking faction territories on hospital walls, two small figures in matte black suits approaching armed checkpoint, harsh daylight filtered through dust haze, desaturated tactical color grade
```

### 21F. SUIT-UP SEQUENCE

**When to use:** Characters donning or calibrating their Aegis suits before a mission.

**Template \u2014 Calibration (most common visual beat):**
```
medium shot, shallow depth of field, [character] standing motionless in
[full_suit_detail_description] vacuum-sealed to body, hexagonal weave pattern,
soft blue diagnostic light pulsing from seams, [hair_visible], [expression],
[other_character_action_if_present], tactical preparation area with equipment
racks, blue diagnostic lighting, [color_grade] <segment_tags>
```

**Key rules:**
- This is a CHARACTER scene \u2014 suit detail can be FULL because it IS the subject
- Hair visible (no helmet during calibration)
- Face segments YES
- If both characters present: Cat motionless during calibration, Daniel deliberately averted/busy
- Soft blue diagnostic glow is the signature lighting
- Shallow depth of field to focus on suit detail

**Example (Dual Suit-Up):**
```
medium shot, shallow depth of field, JRUMLV woman standing motionless in skin-tight matte charcoal-black Aegis adaptive undersuit vacuum-sealed to athletic body with hexagonal weave pattern and semi-transparent mesh visible at seams, molded armored bust panels with soft blue diagnostic light pulsing from hexagonal seams, dark brown hair in low ponytail, eyes forward, and HSCEIA man on left with back turned in matching Aegis suit stark white military-cut hair jaw clenched hands field-stripping sidearm, tactical preparation area, blue diagnostic lighting, desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

### 21G. GHOST MANIFESTATION

**When to use:** Screens displaying Ghost messages, environmental digital disturbance, bioluminescent fungal growth.

**Template:**
```
[shot], [screen/surface showing ghost content], [character_reaction_if_present],
[location], [eerie_lighting], [supernatural_color_grade] <segment_tags_if_face_visible>
```

**Key rules:**
- Ghost has NO physical body \u2014 represent through environment
- Screen content: "I AM EVERYONE WHO DIED", cascading data, cyan text
- Environmental: flickering monitors, lights stuttering, equipment glitching
- Later episodes: bioluminescent fungal growth on surfaces
- Color: cyan, sickly green, digital blue
- If character reacting: face visible, face segment included

**Example (HUD Rewrite):**
```
close-up POV shot through helmet visor, amber HUD display dissolving and being replaced by single glowing cyan line drawing a new route across dark landscape, topographic data fading like smoke, cyan text fragments visible at edges, dark forest visible through visor, eerie digital blue glow, sickly green undertones with harsh contrast
```

---

## 22. TEMPLATE SELECTION LOGIC

The engine should match each incoming beat to a template using this decision tree:

```
Does the beat involve a vehicle in motion?
  YES \u2192 21A (Vehicle)

Is the beat set in an interior with dialogue/planning?
  YES \u2192 21B (Indoor Dialogue)

Does the beat involve active combat or breach?
  YES \u2192 21C (Combat/Breach)

Does the beat involve covert movement?
  YES \u2192 21D (Stealth/Infiltration)

Is this a new location reveal or scene transition?
  YES \u2192 21E (Establishing)

Does the beat involve donning or calibrating gear?
  YES \u2192 21F (Suit-Up)

Does the beat involve Ghost communication or digital anomaly?
  YES \u2192 21G (Ghost Manifestation)

None of the above?
  \u2192 Use the Three-Question Framework (Section 20.1) to build from scratch.
```

**Implementation:** `beatStateService.ts:detectSceneTemplate()`

---

## 23. MODEL RECOMMENDATION

Not every scene should be rendered with FLUX. The prompt generation engine should flag scenes for alternate model rendering when appropriate.

```
RULE: If ALL characters in the frame have visors DOWN (no faces visible),
the scene is a candidate for alternate model rendering (Z-Image/SD).

REASON: FLUX's primary advantage is LoRA-driven face consistency via
the JRUMLV/HSCEIA triggers. When no faces are visible, this advantage
is nullified, and FLUX's weakness at complex spatial compositions
(multiple people on vehicles, dynamic action poses) becomes a liability.

SD-based models (Z-Image, Juggernaut XL) handle complex compositions
better due to:
- Negative prompt support (can exclude "single rider", "dismounted")
- Prompt weighting (can boost "two riders on motorcycle:1.3")
- Stronger spatial reasoning from training data distribution

FLAG FORMAT:
{
  "model_recommendation": "FLUX" | "ALTERNATE",
  "reason": "faces_visible" | "no_faces_complex_composition",
  "faces_visible": true | false
}
```

**Implementation:** `promptGenerationService.ts:determineModelRecommendation()`


## Section 24: v0.21 Compiler-Style Prompt Generation (VBS Architecture)

### Overview

v0.21 moves from the LLM-centric v0.20 approach ("ask Gemini to write the prompt") to a **compiler-style pipeline** where the LLM fills only specific slots that cannot be set deterministically from the database.

**Core insight:** The current approach asks the LLM to write full FLUX prompt strings from beat data, which fails because:
- Gemini invents character appearance details instead of using database overrides
- Post-processing injection fights the generated output (regex "second comma" insertion, hair suppression wars)
- Batching 12 beats together breaks intra-scene continuity (visual anchors and beat transitions are lost)
- `visual_anchor` — the director's intent — is completely unused
- Story-specific names (Cat, Daniel, Ghost, Dinghy) are hardcoded throughout the 2300-line system instruction
- Validation only logs warnings; no repair — failures are invisible to users

### Architecture: Four-Phase Pipeline

```
Phase A: Deterministic Enrichment     → Build VBS from DB + beatStateService
Phase B: LLM Fill-In (restricted)     → Fill only action/expression/composition
Phase C: Deterministic Compilation    → Assemble final prompt from completed VBS
Phase D: Validate + Repair Loop       → Run validators; repair VBS and recompile if needed
```

All four phases are **completely deterministic in structure**. Only Phase B calls an LLM, and it receives a pre-built VBS with schema constraints.

### The Visual Beat Spec (VBS)

The VBS is the central intermediate representation — a single inspectable object containing all visual information for one beat.

**Phase A builds:** Character LoRA triggers, appearances (helmet-adjusted), location, artifacts, shot type, camera angle, vehicle state, token budget, segment policies.

**Phase B fills:** Action, expression, composition (from visual_anchor), atmosphere enrichment, vehicle spatial note.

**Phase C compiles:** Deterministic assembly into final FLUX prompt string.

**Phase D repairs:** Validates for missing LoRA triggers, helmet violations, face segments, token budget; auto-repairs VBS and recompiles.

```typescript
interface VisualBeatSpec {
  beatId: string;
  templateType: 'vehicle' | 'indoor_dialogue' | 'combat' | ... ;
  modelRoute: 'FLUX' | 'ALTERNATE'; // Decision: any face visible?

  shot: { shotType, cameraAngle, composition }; // composition filled by LLM

  subjects: [{ // All characters
    characterName, loraTrigger, description, // From DB
    action, expression, position, // action/expr filled by LLM
    faceVisible, helmetState, segments
  }],

  environment: { anchors, lighting, atmosphere, props, fx }, // From DB

  vehicle?: { description, spatialNote }, // spatialNote filled by LLM

  constraints: { tokenBudget, segmentPolicy, compactionDropOrder },
  previousBeatSummary, persistentStateSnapshot
}
```

### Files Involved

| File | Phase | Purpose |
|------|-------|---------|
| `vbsBuilderService.ts` | A | `buildVisualBeatSpec()` — deterministic enrichment from DB context |
| `vbsFillInService.ts` | B | `fillVBSWithLLM()` — multi-provider LLM call with focused system instruction |
| `vbsCompilerService.ts` | C+D | `compileVBSToPrompt()`, `validateAndRepairVBS()` — compilation and validation/repair |
| `promptGenerationService.ts` | Orchestrator | `generateSwarmUiPromptsV021()` — routes to v0.21 when `promptVersion: 'v021'` |
| `CINEMATOGRAPHER_RULES.md` | B Reference | LLM system instruction — focuses on translating visual_anchor, writing camera-observable action/expression |

### Phase A: Deterministic Enrichment

**Function:** `buildVisualBeatSpec(beat, episodeContext, persistentState, sceneNumber, previousBeatVBS)`

1. Look up character in scene context; get current phase (v0.20 multi-phase support)
2. Apply helmet state to description (swap in `helmet_fragment_off/visor_up/visor_down`)
3. Extract segment tags from description
4. Determine `faceVisible` from helmet state
5. Map location artifacts by type (STRUCTURAL/LIGHTING/ATMOSPHERIC/PROP)
6. Determine `modelRoute`: FLUX if any `faceVisible: true`, else ALTERNATE
7. Calculate adaptive token budget (reuses v0.19 logic)
8. Build `previousBeatSummary` from prior VBS for continuity
9. Return completed VBS with all deterministic fields populated; action/expression/composition slots empty

**Result:** A complete VBS object with ~8 of 10 slots filled; 3 slots await Phase B LLM.

### Phase B: LLM Fill-In

**Function:** `fillVBSWithLLM(partialVBS, beatAnalysis, selectedLLM)`

**System instruction:** ~400 tokens from `CINEMATOGRAPHER_RULES.md`
- Focus: Translate `visual_anchor` to FLUX spatial composition language
- Write camera-observable action (pose/movement, no psychology)
- Write camera-observable expression (facial features only, null if face hidden)
- Write beat-specific atmosphere detail (not generic location)
- Strict rules: Never invent appearance, never invent location, zero story names

**LLM input:** Partial VBS serialized as JSON + beat_script_text + visual_anchor + emotional_tone

**LLM output schema:** VBSFillIn with 5 fields
```typescript
interface VBSFillIn {
  shotComposition: string; // From visual_anchor
  subjectFillIns: [{
    characterName: string;
    action: string;
    expression: string | null;
    dualPositioning?: 'camera-left' | 'camera-right';
  }];
  vehicleSpatialNote?: string;
  atmosphereEnrichment?: string;
}
```

**Multi-provider:** Uses `multiProviderAnalysisService.callMultiProviderLLM()` — supports Gemini, Qwen, GLM, DeepSeek, xAI, OpenAI, OpenRouter. Falls back to deterministic `buildFallbackFillIn()` if LLM fails.

**Result:** Completed VBS with all 10 slots filled.

### Phase C: Deterministic Compilation

**Function:** `compileVBSToPrompt(vbs)`

Pure TypeScript, no API calls. Assembles prompt in fixed order:
1. Shot type, camera angle, composition
2. For each subject: `[loraTrigger] (description) action, expression, position,`
3. Environment anchors, lighting, atmosphere, FX, props
4. Vehicle description and spatial note
5. All segment tags (collected from all subjects)

Example output:
```
medium shot, over-the-shoulder, close on face with motion blur,
JRUMLV (23-year-old woman, dark hair, visor up, Aegis suit) vaulting over crate with body rotating,
brow furrowed determined expression,
concrete warehouse pillars, harsh overhead fluorescents with shadows,
dust particles swirling in light shaft, desaturated color grade,
<segment:clothes-aegis>, <segment:yolo-face>
```

**Result:** Final FLUX prompt string, ready for image generation.

### Phase D: Validate + Repair Loop

**Function:** `validateAndRepairVBS(vbs)`

Runs 2 validation + repair iterations max:

**Checks:**
1. All LoRA triggers present for all subjects
2. Hair text + VISOR_DOWN violation (impossible: can't see hair if visor sealed)
3. Face segments present when `faceVisible: true`
4. Token count within budget
5. Expression text + VISOR_DOWN violation (impossible: can't see expression if visor sealed)

**Repairs** (if issues found):
1. Missing LoRA trigger → Prepend to subject description
2. Hair + sealed helmet → Strip hair phrases
3. Missing face segment → Inject segment tag
4. Expression + sealed helmet → Null the expression
5. Token budget exceeded → Apply compaction strategy (priority-aware drop order)

**Compaction strategy** (when budget exceeded):
1. Drop `vehicle.spatialNote`
2. Drop `environment.props`
3. Drop `environment.fx`
4. Truncate `environment.atmosphere`
5. Further condense `subjects[1].description`

**Result:** VBSValidationResult with repairsApplied list, final prompt, and validation status.

### Continuity: Sequential Beat Processing

Beats are processed **one at a time** (not batched like v0.20's 12-beat chunks):
- Each beat has access to `previousBeatSummary` from the prior compiled VBS
- ScenePersistentState carries forward character phases, vehicle state, gear state
- No information is lost between beats; continuity is maintained by design

### Routing: v0.20 vs v0.21

In `promptGenerationService.ts`:

```typescript
export const generateSwarmUiPrompts = async (
    analyzedEpisode, episodeContextJson, styleConfig,
    retrievalMode, storyId, provider, onProgress,
    promptVersion: 'v020' | 'v021' = 'v020'  // ← NEW PARAM
);
```

- `promptVersion: 'v020'` → Uses existing `generateSwarmUiPromptsWithGemini()` (default)
- `promptVersion: 'v021'` → Uses new `generateSwarmUiPromptsV021()` orchestrator

Existing v0.20 code paths are **completely unchanged**; v0.21 is parallel implementation.

### Key Improvements Over v0.20

| Problem | v0.20 | v0.21 |
|---------|-------|-------|
| LLM invents appearance | Full prompt generation → LLM hallucinates | VBS schema → structurally impossible |
| Post-processing fights output | Regex injection for missing LoRA | No post-processing; compilation complete by construction |
| Batching breaks continuity | 12 beats together → loss of visual_anchor per beat | Sequential processing → every beat aware of prior |
| visual_anchor unused | Brief input, ignored by LLM | Primary input → drives `shotComposition` |
| System instruction bloat | 2300 lines, story-specific | ~400 lines, fully story-agnostic |
| Story names hardcoded | System instruction full of "Cat", "Daniel" | Zero story names in instruction or code |
| Single-character segment bug | Only last character gets segments | All subjects processed in compiler loop |
| Hair suppression regex wars | Post-processing battles LLM output | `helmet_fragment_*` applied deterministically in Phase A |
| Validation only logs | "Log warnings, never block" | "Repair first, then log if repair fails" |
| No per-beat artifact mapping | Generic location artifacts | Typed mapping: STRUCTURAL/LIGHTING/ATMOSPHERIC/PROP |

### Example: One Beat (v0.21 Flow)

**Input beat:** `s2-b5: "Cat vaults over crate, spinning to face Daniel."`

**Phase A: Build VBS**
- Template: combat
- Model route: FLUX (both characters face visible)
- Shot: medium shot, over-shoulder, (composition: empty for LLM)
- Subjects: Cat (JRUMLV, visor up, face visible), Daniel (HSCEIA, visor up, face visible)
- Environment: warehouse, concrete pillars, harsh fluorescents, dust shadows
- Constraints: tokenBudget 260, segmentPolicy IF_FACE_VISIBLE

**Phase B: LLM Fill-In**
- Input: visual_anchor "explosive movement, close on Cat's face"
- LLM returns: composition "close on Cat's face with motion blur, over-shoulder shows Daniel", Cat.action "vaulting, body rotating", Cat.expression "brow furrowed, intense eyes", Daniel.action "standing alert", atmosphereEnrichment "dust swirling"

**Phase C: Compile**
```
medium shot, over-the-shoulder, close on Cat's face with motion blur over-shoulder shows Daniel,
JRUMLV (Cat description) vaulting body rotating, brow furrowed intense eyes,
HSCEIA (Daniel description) standing alert,
concrete pillars, harsh overhead fluorescents, dust swirling,
<segment:yolo-face>, <segment:clothes>
```

**Phase D: Validate & Repair**
- ✓ All LoRA triggers present
- ✓ No helmet violations
- ✓ Token count 185 < budget 260
- ✓ Result: valid

**Output:** BeatPrompts with cinematic SwarmUIPrompt, vbs attached for debugging, validation result.

### Testing & Verification

See plan document "Verification" section for test cases:
- Unit test `vbsCompilerService` with mock VBS
- Baseline comparison against Redis-cached v0.20 e3s2 results
- Segment completeness for dual-character beats
- visual_anchor fidelity (shotComposition reflects beat's visual_anchor)
- Helmet state regression (sealed helmet → no hair, proper fragment, no expression)
- Repair loop test (manually corrupt VBS, verify repair)
- LLM fallback test (simulate failure, verify deterministic fallback)

### Configuration & Deployment

**No configuration required.** v0.21 is opt-in via `promptVersion` parameter:

```typescript
// Use v0.21
const prompts = await generateSwarmUiPrompts(
    episode, context, style, 'manual', storyId, 'gemini',
    onProgress, 'v021'  // ← Opt into v0.21
);
```

Default remains v0.20 for backward compatibility.

---

## TODO / FUTURE WORK

| Item | Priority | Notes |
|------|----------|-------|
| Build ComfyUI character templates | HIGH | single, dual, triple, group |
| Train location style LoRAs | MEDIUM | MMB, Facility 7, Atlanta ruins, safehouse |
| Define zimage segment handling | MEDIUM | May not use YOLO face segments |
| Test zimage multi-character workflows | MEDIUM | Cat + Chen, Daniel + Webb combinations |
| Validate prompt length limit (200 tokens) | COMPLETED | Replaced with adaptive budgets in v0.19 (Section 17). Per-beat calculation via `calculateAdaptiveTokenBudget()` |
| Test weighted syntax rules | LOW | Some templates use weights - clarify when acceptable |

---

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
| 0.21 | 2026-02-27 | **Compiler-Style Prompt Generation (VBS Architecture).** New four-phase pipeline: (A) Deterministic enrichment builds VBS from DB context, (B) LLM fills only action/expression/composition slots (focused ~400-token system instruction, zero story names), (C) Deterministic compilation assembles prompt, (D) Validate+repair loop with max 2 iterations. Central Visual Beat Spec type carries all beat visual data. Beats processed sequentially (not batched) for per-beat location awareness. `buildVisualBeatSpec()` applies helmet state, maps artifacts by type, sets all appearance data. `fillVBSWithLLM()` translates visual_anchor to composition, uses multi-provider support. `compileVBSToPrompt()` deterministic assembly, no post-processing. `validateAndRepairVBS()` auto-fixes missing LoRA triggers, helmet violations, face segments, token budget. New services: `vbsBuilderService.ts`, `vbsFillInService.ts`, `vbsCompilerService.ts`. New documentation: `CINEMATOGRAPHER_RULES.md`. New param `promptVersion: 'v020' | 'v021' = 'v020'` to `generateSwarmUiPrompts()`. v0.20 path unchanged; v0.21 parallel implementation. Section 24 (this document). |
| 0.19 | 2026-02-08 | **Adaptive Token Budgets & Override-Aware Character Injection.** Replaced fixed 200-token hard limit with per-beat adaptive budgets based on shot type, character count, helmet state, and vehicle presence (Section 17 rewritten). New functions: `calculateAdaptiveTokenBudget()`, `condenseOverrideForShot()`, `injectMissingCharacterOverrides()`. Character injection now uses condensed `swarmui_prompt_override` content inserted at attention-optimal position (token 31-80 zone) instead of weak "nearby" phrases appended at end. Gemini system instruction updated with adaptive budget ranges. `TokenBudget` type added. Validation uses adaptive limits. |
| 0.18 | 2026-02-07 | **FLUX Prompt Engine Architect Memo integration.** Added: T5 Attention Model (5A), Scene Persistent State (10.4), Token Budget (17), Canonical Descriptions (18), FLUX Rendering Rules (19), Decision Frameworks (20), Scene Type Templates (21), Template Selection Logic (22), Model Recommendation (23). Strengthened: Helmet zero-tolerance (3.6.4), Dual character rules with Cat as Visual Anchor (8.4-8.5), Camera Realism with FLUX-incompatible language (16.9). |
| 0.17 | 2026-02-06 | **Visual Moment Rewrite.** Beat definition changed from "narrative unit" (45-90 sec, 2-5 sentences) to "visual moment" (15-30 sec, one camera composition). Target 45-60 beats per scene (was 15-20). NEW_IMAGE target 37-50/scene (was 11-15). YouTube format changed: each scene is standalone 15-20 min video (was 8-4-4-3 model). Ad break applies to ALL scenes at ~46% (8 min mark). Added cinematographic direction requirement (FLUX-validated shot type + angle + depth + lighting in `cameraAngleSuggestion`). Added Section 14.6 (Transition Rules for Static-Image Video), Section 14.7 (Visual Moment Split Rules). Updated Section 11A.1 (standalone scene model + tension arc phases), 11A.4 (ad break all scenes), 14.2 (beat duration), 14.5 (image decision targets). Updated `geminiService.ts`, `multiProviderAnalysisService.ts`, `qwenService.ts` system instructions and schemas. Updated `fluxVocabularyService.ts` SCENE_ROLE_TREATMENT.beatCountRange to [45,60]. Updated `sceneContextService.ts` isAdBreakScene (always true), estimateAdBreakBeat (0.46). |
| 0.16 | 2026-02-05 | Added Section 4.8 (Per-Scene Analysis Pipeline). Documented architectural change from chunk-and-merge to per-scene analysis in `multiProviderAnalysisService.ts`. Scripts now split by `===SCENE N: Title===` markers via `splitScriptByScenes()`, each scene analyzed independently with scene-specific context via `compactSceneContext()`, all scenes run in parallel via `Promise.all`, assembled into single `AnalyzedEpisode`. `processEpisodeWithState()` moved from individual provider functions (geminiService, qwenService) to orchestrator, called once on full assembled episode. Updated Section 4.5 rule 4 (state resets at scene boundary, not episode boundary) and added rule 5 (orchestrator-level carryover state). Eliminated duplicate scene entries and out-of-order scene bugs caused by word-count chunking. |
| 0.15 | 2026-02-03 | Added Section 3.6.4 (Helmet State Inference). Context-based detection when beat doesn't explicitly mention helmet. VISOR_DOWN inference: HUD mentions, riding Dingy at speed, flying/airborne, active combat, high-speed movement, hostile environment. VISOR_UP inference: speaking in tactical gear, stopped at Dingy, visual assessment, arrival, field briefing, pre-mission prep. Complete helmet/hair/face matrix. `hairContext.includeFaceSegment` for YOLO face segment control. Reduced batch size from 20 to 12 beats. Added JSON parsing recovery for truncated LLM responses. |
| 0.14 | 2026-02-03 | Added Section 3.6.2 (Hair Fragment Selection Logic). New hair fragments in gear_fragments table: casual_hair_cat_down, formal_hair_cat_updo, stealth_hair_cat_cap. Hair selection decision tree based on helmet state and location context. Hair suppression matrix (suppress when helmet ON). Location-to-hair mapping table. Example prompts for all states. Renumbered Dingy section to 3.6.3. |
| 0.13 | 2026-01-31 | Fixed Section 13.2 (Time of Day Lighting) data flow. Added extractSceneOverrides() function to parse time_of_day from Episode Context JSON. Updated processEpisodeWithFullContext() call to pass sceneOverrides. Documented data flow: Episode Context → extractSceneOverrides → processEpisodeWithFullContext → buildSceneVisualContext → getLightingForTimeOfDay. Bug fix: night scenes were rendering as day because time_of_day was not being extracted and passed to beat processing pipeline. |
| 0.12 | 2026-01-30 | Added Section 3.6.1 (Helmet Fragment Database Columns). New columns: helmet_fragment_off, helmet_fragment_visor_up, helmet_fragment_visor_down, face_segment_rule. LLM scene discernment for helmet state selection. Fragment values for Cat and Daniel. Face segment rule application (ALWAYS, IF_FACE_VISIBLE, NEVER). Prompt assembly example with visor down (no face segment). |
| 0.11 | 2026-01-30 | Added Section 16.15 (Parentheses Grouping). Attribute containment with parentheses to prevent FLUX attribute bleed. Prompt anatomy: TRIGGER (character) vs BODY (scene). What goes where table. Single vs dual character examples. Essential for dual characters. Delimiter rules (parens yes, brackets no, angle brackets reserved). Quick rules: no trailing commas, separate expression from age. |
| 0.10 | 2026-01-30 | Added Section 16.12-16.14 (Prompt Compaction Rules). Location description elimination analysis with 54→12 word example. Preposition rules: which to drop (of, a/an, with) vs keep (on left/right, at, facing, over, from/through). Compacting strategies: commas as implicit connectors, participles, compound adjectives, dropping "photo of a". Full compaction example with 33% token savings. |
| 0.9 | 2026-01-30 | Added Section 16 (Camera Realism Principle). Z-IMAGE core rules: camera-observable only, no psychology/backstory/symbolism, implicit over explicit, no semantic stacking, LoRA authority, CFG limits. FLUX exceptions: explicit age OK, natural language preferred, moderate stacking OK, light context tolerated. Prompt templates for both pipelines. Failure mode reference. |
| 0.8 | 2026-01-30 | Added Section 15 (Image Generation Routing). FLUX/SwarmUI vs zimage/ComfyUI decision tree. Daniel has different triggers per route (HSCEIA man vs daveman). ComfyUI template system stub. Style LoRA concept for locations. Updated Appendix A with full trigger reference. |
| 0.7 | 2026-01-30 | Added Section 11B (Visual Hooks for 3-second retention). Revised to emphasize CINEMATIC JUDGMENT over templates. Hook Discovery Process (scan, identify, determine, craft). Context-dependent hook selection. Examples as guidance not rules. "Grab But Not Reveal" principle. |
| 0.6 | 2026-01-30 | Added Section 14 (YouTube monetization compliance, anti-slop quality indicators, beat duration guidelines, anti-monotony rules, image decision logic). |
| 0.5 | 2026-01-30 | Added Section 3.0 (story-level efficiency check), Section 3.7 (trigger substitution service documentation), Section 11A (scene intensity/pacing for YouTube 8-4-4-3 format, ad break rule). Updated DATA_LOCATOR with intensity schema. |
| 0.4 | 2026-01-30 | Added continuity state integration (entry/exit states, visual vibe). Arc phase visual mapping. Character expression tells and deception indicators. Location atmosphere mapping. Time of day lighting overrides. Clarified FLUX vs zimage triggers. Added TODO section. |
| 0.3 | 2026-01-30 | Refactored to consume beat data as input (not re-derive). Added LLM Refiner role, translation mappings, variety guidelines for retention. Anti-monotony rules. Updated intermediate JSON with beat_input and refinement sections. |
| 0.2 | 2026-01-30 | Added beat type templates (environment-only, no-LoRA), clothing segment binding, gear fragment selection logic, helmet state matrix |
| 0.1 | 2026-01-30 | Initial draft from whitepaper analysis |
