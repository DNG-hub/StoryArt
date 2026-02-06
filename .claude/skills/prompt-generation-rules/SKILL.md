# IMAGE PROMPT GENERATION RULES
## Skill Definition v0.17

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

### 16.9 FLUX Prompt Template

```
[shot type] of a [TRIGGER] ([age], [2-3 physical details not in LoRA], [clothing]), [action phrase], [observable expression], in [location shorthand], [lighting], [atmosphere word] <segment>
```

#### Example: Cat Mitchell (FLUX Optimized)

```
medium shot of a JRUMLV woman (28 years old, dark brown hair in tactical bun, green eyes with gold flecks, athletic build, wearing olive tactical vest over form-fitting shirt, dual holsters) kneeling to examine twisted rebar with gloved hand, intense clinical focus, in collapsed concrete corridor with dust motes floating in harsh diagonal sunbeams, desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

---

### 16.10 Quick Reference: Z-IMAGE vs FLUX

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

### 16.11 Failure Mode Quick Reference

| Symptom | Cause |
|---------|-------|
| Grain | Semantic overload |
| Plastic skin | Over-smoothing or high LoRA weight |
| Identity drift | Prompt contradicts LoRA |
| Illustration look | Narrative language in prompt |

---

### 16.12 Location Description Compaction

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

### 16.13 Preposition Rules

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

### 16.14 Compacting Strategies

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

### 16.15 Parentheses Grouping (Attribute Containment)

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

### 16.16 Key Takeaway

**Strip out everything the camera can't see:**

1. No backstory
2. No emotions explained (only expressions described)
3. No cultural/ethnic labels (only visual traits)
4. No narrative importance
5. Let the LoRA handle identity; prompt handles pose/environment/lighting

**The core principle transfers to both pipelines:** Describe what a camera sees, not what a narrator knows. FLUX just gives you more linguistic flexibility in how you describe it.

---

## TODO / FUTURE WORK

| Item | Priority | Notes |
|------|----------|-------|
| Build ComfyUI character templates | HIGH | single, dual, triple, group |
| Train location style LoRAs | MEDIUM | MMB, Facility 7, Atlanta ruins, safehouse |
| Define zimage segment handling | MEDIUM | May not use YOLO face segments |
| Test zimage multi-character workflows | MEDIUM | Cat + Chen, Daniel + Webb combinations |
| Validate prompt length limit (200 tokens) | LOW | Rule exists but enforcement unclear |
| Test weighted syntax rules | LOW | Some templates use weights - clarify when acceptable |

---

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
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
