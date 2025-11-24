# Latest Prompt Construction Guide - Episode 1 Production Standards

**Version:** 2.0
**Date:** 2025-11-23
**Status:** CURRENT PRODUCTION STANDARD
**Source:** `episode_1_prompts_BATCH_GENERATION.json` (135 tested prompts)

**CRITICAL:** This document represents the **LATEST AND MOST TESTED** prompt construction standards. It supersedes all previous guides including CAMERA_LIGHTING_CORRECTIONS_SUMMARY.md and older architecture guides.

---

## Executive Summary

This guide documents the **current production-ready** prompt architecture used in Episode 1 of Cat & Daniel: Collapse Protocol, based on 135 successfully generated and tested prompts. These standards evolved through iterative refinement and visual testing with SwarmUI + FLUX models.

### Key Principles (NEWEST STANDARDS)

1. **Facial Expressions INSTEAD of Heavy Camera Direction**
   - Old: `(((facing camera:2.0)))`
   - NEW: `"alert, tactical expression on her face"`

2. **Atmosphere-Specific Face Lighting** (Always Include)
   - Tactical scenes: `"dramatic tactical lighting on face, high contrast face shadows"`
   - Medical scenes: `"harsh medical lighting on face, stark white face illumination"`

3. **YOLO Face Segments** (Precise Control)
   - Single character: `<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>`
   - Two characters: Add segment for each face

4. **Character Physique Emphasis** (Critical for Proper Rendering)
   - ALWAYS include: `"lean athletic build, toned arms"`
   - Prevents bulky appearance from tactical gear

5. **FLUX-Specific Settings**
   - cfgscale: 1 (NOT 7!)
   - fluxguidancescale: 3.5
   - seed: -1 (random for batch generation)

---

## Part 1: Character Description Standards

### 1.1 Cat Mitchell (JRUMLV woman LoRA)

**Complete Character Block (Copy Exactly):**
```
JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun)
```

**Component Breakdown:**
- **Trigger:** `JRUMLV woman` (LoRA activation)
- **Pants:** `MultiCam woodland camo tactical pants tucked into combat boots`
  - Specific pattern renders better than generic "tactical pants"
- **Upper Body:** `form-fitting tactical vest over fitted olive long-sleeved shirt`
  - "form-fitting" prevents bulky appearance
  - "fitted olive long-sleeved shirt" ensures sleeves visible
  - DO NOT use "sleeveless" (redundant and confusing to AI)
- **Physique:** `lean athletic build, toned arms`
  - CRITICAL: Prevents AI from inferring bulk from tactical gear
  - Must be explicit or character renders too heavy
- **Gear:** `dual holsters, tactical watch`
  - Specific details add visual interest
- **Hair:** `dark brown tactical bun`
  - Practical, shows discipline

**Why These Specifics:**
- ✅ "MultiCam woodland camo" renders better than "camo pants"
- ✅ "form-fitting" + "lean athletic build" = proper physique
- ✅ "olive long-sleeved shirt" ensures sleeves show (not sleeveless look)
- ✅ Specific gear (holsters, watch) adds tactical authenticity

**AVOID:**
- ❌ "plate carrier vest with pouches" (too bulky-sounding)
- ❌ "sleeveless vest" (redundant, makes AI render everything sleeveless)
- ❌ Generic "tactical gear" without modifiers
- ❌ No physique description (AI assumes bulk from gear)

### 1.2 Daniel O'Brien (HSCEIA man LoRA)

**Complete Character Block (Copy Exactly):**
```
HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes)
```

**Component Breakdown:**
- **Trigger:** `HSCEIA man` (LoRA activation)
- **Hair:** `white hair`
  - CRITICAL: Daniel's signature feature
  - Must be first in description
  - NEVER "short dark hair" or omit entirely
- **Physique:** `lean athletic build`
  - Matches Cat's physique for consistency
  - Prevents bulky military appearance
- **Tactical Gear:** `form-fitting tactical gear in muted grays`
  - "muted grays" matches Episode 1 color scheme
  - "form-fitting" ensures athletic physique visible
- **Equipment:** `body armor`
  - Standard protective gear
  - Always present in field operations
- **Facial Features:** `strong jaw, high cheekbones, storm-gray eyes`
  - Makes Daniel distinctive and memorable
  - "storm-gray eyes" adds emotional depth

**IMPORTANT - Weapon Positioning:**
Weapon positioning is **beat-specific action**, NOT a character trait. Include M4 carbine position in the action portion of the prompt based on context:

**Weapon Position Examples (Include in ACTION section):**
- **Defensive:** `M4 carbine at ready position`
- **Offensive:** `aiming M4 carbine`, `firing M4 carbine`
- **Moving/Patrol:** `M4 carbine slung across chest`, `carbine on tactical sling`
- **Tactical Hold:** `M4 carbine low ready`, `carbine at high ready`
- **Resting:** `M4 carbine secured on back`, `weapon lowered`
- **Transition:** `raising M4 carbine`, `shouldering weapon`

**Correct Prompt Structure:**
```
HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), [FACIAL_EXPRESSION], [ACTION with weapon position] in [LOCATION]
```

**Example:**
```
HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), focused combat readiness on his face, advancing with M4 carbine at ready position through damaged facility
```

**Why White Hair is Critical:**
- Original prompts had "short dark hair" in 67 prompts (WRONG!)
- White hair is Daniel's character signature feature
- Distinguishes him visually from other tactical operators

**AVOID:**
- ❌ "short dark hair" (incorrect character description)
- ❌ Missing hair description entirely
- ❌ "black plate carrier" (use "muted grays" instead)
- ❌ "multiple weapon systems" (too vague)

---

## Part 2: Facial Expression Integration (NEW METHOD)

### 2.1 Why Facial Expressions Instead of Heavy Camera Direction

**OLD METHOD (From Camera Lighting Corrections):**
```
(((facing camera directly:2.0))), BREAK, ((making eye contact with viewer:1.8))
```

**NEW METHOD (Current Production Standard):**
```
alert, tactical expression on her face
```

**Why the Change:**
- ✅ More natural language (easier to read/edit)
- ✅ Less emphasis weight clutter in prompts
- ✅ YOLO segments handle camera direction precisely
- ✅ Face lighting does the heavy lifting for engagement
- ✅ Tested across 135 prompts with excellent results

### 2.2 Facial Expression Library by Context

**Tactical/Alert Contexts:**
```
alert, tactical expression on her face
focused combat readiness on his face
tactical awareness showing on her features
```

**Medical/Analytical Contexts:**
```
concentrated medical expression on her face
analytical focus showing on her features
clinical precision evident on her face
```

**Emotional/Intimate Contexts:**
```
vulnerable expression on her face
rare moment of peace showing on his features
emotional exhaustion evident on her face
```

**Dialogue/Interaction:**
```
speaking expression, engaging eye contact
listening expression, attentive focus
concerned expression during conversation
```

**Placement in Prompt:**
- Insert AFTER character description
- Place BEFORE environment/action
- Example: `JRUMLV woman (...), alert expression on her face, moving through...`

---

## Part 3: Face Lighting System - Narrative-Driven

### 3.1 Lighting Hierarchy (Simple Rule)

**CRITICAL:** The beat narrative is the **SOURCE OF TRUTH** for all lighting.

```
1. READ beat narrative for ANY lighting-related details
2. EXTRACT those details and adapt to face lighting
3. FALLBACK to location atmosphere only if beat has NO lighting details
```

**Why This Matters:**
- Beat narrative may override location defaults (e.g., tactical facility at dawn vs night)
- Dynamic events change lighting (explosions, gunfire, weather)
- Point-of-view affects lighting perception (backlit, facing light source)
- Time of day modifies location lighting (emergency zone at dusk vs noon)

### 3.2 How to Extract Beat Lighting (The Principle)

**Look for ANY of these in beat narrative:**

| Category | Examples |
|----------|----------|
| **Light Sources** | "emergency generators", "muzzle flashes", "explosions", "searchlights", "fires" |
| **Light Qualities** | "bright", "subdued", "dim", "harsh", "soft", "flickering", "strobing", "pulsing" |
| **Light Colors** | "green", "orange", "red", "blue", "golden", "white", "amber", "sickly" |
| **Environmental Effects** | "gunsmoke", "dust", "fog", "rain", "debris cloud", "haze" |
| **Time Indicators** | "dawn", "dusk", "night", "midday", "twilight", "sunset" |
| **Intensity Modifiers** | "barely visible", "blinding", "faint", "intense", "overwhelming" |

**Then adapt to face lighting** using the SAME descriptive words from beat:

```
PRINCIPLE: If beat says it, face lighting echoes it.
```

### 3.3 Extraction Examples (Diverse Scenarios)

**Battle Scene - Gunsmoke:**
```
Beat: "Cat advances through heavy gunsmoke, bright muzzle flashes illuminating the haze"

Face Lighting: "bright intermittent muzzle flashes on face, subdued by thick gunsmoke,
                flickering combat lighting through haze, dramatic flash illumination"
```

**Explosions:**
```
Beat: "Explosions illuminate the darkness as Daniel takes cover"

Face Lighting: "intermittent bright explosive flashes on face, sudden intense illumination,
                dramatic contrast lighting from explosions, sharp bright bursts"
```

**Environmental - Gunsmoke + Emergency Lights:**
```
Beat: "Emergency lights barely visible through dense smoke from firefight"

Face Lighting: "dim emergency light on face filtered through gunsmoke, subdued red
                illumination barely penetrating smoke, diffused harsh lighting"
```

**Time of Day - Dawn:**
```
Beat: "Moving through Atlanta Emergency Zone at dawn, soft orange light breaking horizon"

Face Lighting: "soft orange dawn light on face, warm early morning illumination,
                gentle golden sunrise casting on features"
```

**Time of Day - Dusk:**
```
Beat: "Facility at dusk, fading natural light mixing with emergency generators"

Face Lighting: "fading twilight on face mixing with artificial emergency glow,
                dual-source lighting from sunset and generators, transitional lighting"
```

**Weather - Rain:**
```
Beat: "Harsh searchlight diffused by heavy rain"

Face Lighting: "harsh searchlight on face diffused by rain, wet surface reflections,
                scattered light through rainfall, atmospheric moisture glow"
```

**Point of View - Backlit:**
```
Beat: "Daniel silhouetted against bright emergency exit, facing into darkness"

Face Lighting: "dramatic backlighting from exit behind, rim light on edges, face partially
                shadowed facing into darkness, strong edge separation"
```

**Dynamic - Strobing Alarms:**
```
Beat: "Strobing red alarm lights casting chaotic shadows"

Face Lighting: "strobing red alarm light on face, rapid alternating illumination,
                chaotic pulsing red emergency flashes, disorienting flash patterns"
```

**Eerie/Atmospheric:**
```
Beat: "Corridor bathed in eerie green light from backup generators"

Face Lighting: "eerie green light on face, sickly green illumination on features,
                environmental green glow casting on skin"
```

**Combination - Multiple Factors:**
```
Beat: "Bright noon sun filtered through dust clouds from collapsed building"

Face Lighting: "bright diffused sunlight on face through airborne dust, hazy volumetric
                illumination, sun-lit features softened by particulate atmosphere"
```

### 3.4 Fallback: Location-Based Atmosphere Lighting

**ONLY use when beat narrative contains NO lighting details whatsoever.**

**Tactical/Danger Scenes:**
```
dramatic tactical lighting on face, high contrast face shadows, directional harsh light on features
```

**Medical Facility Scenes:**
```
harsh medical lighting on face, stark white face illumination, clinical light on features
```

**Emergency Lights Scenes:**
```
flickering emergency light on face, red emergency illumination on features, harsh flash lighting
```

**Emotional/Intimate Scenes:**
```
soft dramatic face lighting, warm illumination on features, intimate character lighting
```

**Damaged Facility Scenes:**
```
atmospheric lighting on face filtered through damage, harsh overhead light on features, environmental face illumination
```

**Outdoor Daylight Scenes:**
```
natural sunlight on face, volumetric dust lit features, shafts of light illuminating face
```

**Bunker Interior Scenes:**
```
harsh fluorescent face lighting, cold institutional light on features, confined space illumination
```

**Important:** These are TEMPLATES only. Always check beat narrative first.

### 3.5 Face Lighting Placement and Integration

**Correct Placement:**
```
[character] [facial expression] [action] [environment with narrative lighting],
[face lighting extracted from beat narrative], [composition]
```

**Example with Beat-Specific Lighting:**
```
JRUMLV woman (...), alert expression on her face, moving through CDC archive bathed
in eerie green light from backup generators. eerie green light on face, sickly green
illumination on features, environmental green glow, Dramatic rim light, desaturated
color grade, shallow depth of field
```

**Example with Fallback Atmosphere Lighting (No Lighting in Beat):**
```
Beat: "Cat moves through damaged tactical facility"
(No lighting mentioned)

JRUMLV woman (...), alert expression on her face, moving through damaged tactical
facility. dramatic tactical lighting on face, high contrast face shadows, directional
harsh light on features, Dramatic rim light, desaturated color grade, shallow depth
of field
```

**Key Principle:** Extract lighting from beat narrative first. Face lighting should ECHO what the beat says, not contradict it.

---

## Part 4: YOLO Face Segment Control

### 4.1 YOLO Segment Syntax

**Format:**
```
<segment:yolo-face_yolov9c.pt-N, creativity, threshold>
```

**Parameters:**
- **Model:** `yolo-face_yolov9c.pt` (face detection model)
- **Index (-N):** Face position (left to right)
  - `-1` = leftmost face
  - `-2` = second from left
  - `-3` = third from left, etc.
- **Creativity:** `0.35` to `0.7`
  - Lower (0.35) = more precise control
  - Higher (0.7) = more creative interpretation
  - **Production Standard:** `0.35` for consistency
- **Threshold:** `0.5` (detection confidence)

### 4.2 Single Character Scenes

**Standard Single Character:**
```
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Placement:** At end of prompt, after all other elements

**Complete Example:**
```
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into
combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt,
lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical
bun), alert expression on her face, moving through CDC archive. Shafts of sunlight
pierce shattered facade, highlighting dust motes. Flickering red emergency lights.
dramatic tactical lighting on face, high contrast face shadows, Dramatic rim light,
desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

### 4.3 Two Character Scenes

**Standard Two Character:**
```
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> engaging viewer, looking at camera
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> engaging viewer, looking at camera
```

**Why "engaging viewer, looking at camera":**
- Prevents characters from only looking at each other
- Ensures both faces engage the viewer
- Tested across 31 two-character prompts

**Character Assignment:**
```
# Cat on left, Daniel on right (typical staging)
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> JRUMLV woman, engaging viewer
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> HSCEIA man, engaging viewer

# Daniel on left, Cat on right (alternative)
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> HSCEIA man, engaging viewer
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> JRUMLV woman, engaging viewer
```

**Complete Two-Character Example:**
```
medium shot of ((both facing camera:1.7)), ((engaging viewer:1.5)), HSCEIA man
(white hair, lean athletic build, form-fitting tactical gear in muted grays, body
armor, M4 carbine slung across chest) and JRUMLV woman (MultiCam woodland camo
tactical pants, form-fitting tactical vest over fitted olive long-sleeved shirt,
lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical
bun) in damaged facility. dramatic tactical lighting on face, high contrast face
shadows.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> engaging viewer, looking at camera
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> engaging viewer, looking at camera
```

**Note for Two Characters:**
- Still use subtle emphasis: `((both facing camera:1.7))`
- Not as heavy as old method (no 2.0 weights)
- YOLO segments do the precise work

---

## Part 5: Complete Prompt Structure Template

### 5.1 Standard Prompt Formula

```
[shot_type] of a [character_description], [facial_expression], [action_verb]
[environment_description]. [lighting_atmosphere]. [face_lighting].
[composition_directives]. <yolo_segments>
```

### 5.2 Shot Types (Use Traditional Terms)

**Vertical (9:16) Formats:**
- `medium shot` - Character from waist/chest up (most common)
- `close-up` - Face and shoulders
- `full shot` - Head to toe (rare in vertical)

**Cinematic (16:9) Formats:**
- `wide shot` - Character plus environment context (most common)
- `medium shot` - Character from waist up
- `close-up` - Face focus
- `establishing shot` - Location/environment emphasis

### 5.3 Environment Description Patterns

**Location First, Details Second:**
```
moving through a sprawling CDC archive and data center, sterile server rooms
and data storage units
```

**Visual Elements:**
```
Shafts of sunlight pierce a shattered facade, illuminating volumetric dust motes
dancing in the air. Her silhouette is cast against the light, pulverized concrete
and twisted rebar. Flickering red emergency lights and glowing biohazard symbols
on the walls glow.
```

**Specific Props/Set Dressing:**
```
Rows of shattered, empty glass containment pods. Medical equipment scattered.
Overturned gurneys.
```

### 5.4 Composition Directives

**Always Include (Standard Set):**
```
Dramatic rim light, desaturated color grade, shallow depth of field
```

**Why These:**
- **Dramatic rim light:** Separates character from background, adds depth
- **Desaturated color grade:** Post-apocalyptic mood, gritty tone
- **Shallow depth of field:** Professional photography look, focus on character

**Optional Additions:**
```
professional photography, cinematic composition, volumetric lighting,
atmospheric haze, detailed composition
```

---

## Part 6: Negative Prompts (Production Standard)

### 6.1 Complete Negative Prompt (Copy Exactly)

```
blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful
colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy,
artificial appearance, oversaturated, childish style, background characters, faces
hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright
cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive
special effects
```

### 6.2 Negative Prompt Categories

**Quality Issues:**
- `blurry, low quality, distorted faces, extra limbs, deformed anatomy`

**Style Exclusions:**
- `cartoon, anime, childish style, artificial appearance`

**Tone/Mood Exclusions:**
- `bright cheerful colors, oversaturated, bright cheerful lighting, peaceful setting`

**Tactical/Character Exclusions:**
- `civilian clothes, relaxed postures, fantasy weapons, unrealistic tactics, superhero poses`

**Camera/Framing Exclusions:**
- `faces hidden, back to camera, background characters, multiple faces`

**Narrative Exclusions:**
- `fantasy elements, unrealistic proportions, explosive special effects`

### 6.3 Why This Specific Negative Prompt

- ✅ Tested across all 135 Episode 1 prompts
- ✅ Prevents common FLUX/SwarmUI artifacts
- ✅ Maintains gritty, realistic post-apocalyptic tone
- ✅ Ensures tactical authenticity
- ✅ Prevents cheerful/peaceful misinterpretations

---

## Part 7: FLUX Model Settings (CRITICAL)

### 7.1 Production-Ready Settings

**For FLUX Models (flux1-dev-fp8):**
```json
{
  "model": "flux1-dev-fp8",
  "sampler": "euler" or "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

**CRITICAL SETTINGS:**
- **cfgscale: 1** - FLUX models require 1, NOT 7!
  - Using 7 causes artifacts and poor quality
  - This was corrected across all 540 batch configs
- **fluxguidancescale: 3.5** - FLUX-specific guidance
- **seed: -1** - Random seed for batch generation variety
- **automaticvae: true** - Automatic VAE selection
- **sdtextencs: "CLIP + T5"** - Dual text encoder for FLUX

### 7.2 Resolution Standards

**Vertical (9:16) - YouTube Shorts/TikTok/Reels:**
```json
{
  "width": 1088,
  "height": 1920
}
```

**Cinematic (16:9) - YouTube Long-Form:**
```json
{
  "width": 1920,
  "height": 1088
}
```

**Why These Specific Resolutions:**
- ✅ Divisible by 64 (FLUX requirement)
- ✅ YouTube-optimal aspect ratios
- ✅ 8-4-4-3 minute timing for ad breaks
- ✅ Professional video production standards

### 7.3 Sampler Strategy

**EULER Sampler:**
- 1 image per prompt
- Faster generation
- Slightly different aesthetic
- Good for comparison

**iPNDM Sampler (Recommended):**
- 2 images per prompt (different random seeds)
- Higher quality
- Preferred by production team
- 67% of all generated images

**Total Per Beat:**
- Vertical: 1 EULER + 2 iPNDM = 3 images
- Cinematic: 1 EULER + 2 iPNDM = 3 images
- **Total per beat: 6 images** (if both formats generated)

---

## Part 8: Complete Working Examples

### Example 1: Single Character - Tactical Scene

**Format:** Vertical (9:16)

**Complete Prompt:**
```
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into
combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt,
lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical
bun), alert, tactical expression on her face, moving through the destruction of a
CDC archive and data center. Shafts of sunlight pierce a shattered facade,
highlighting dust motes. Flickering red emergency lights and glowing biohazard
symbols on the walls in background. Rows of shattered, empty glass containment pods.
dramatic tactical lighting on face, high contrast face shadows, directional harsh
light on features, Dramatic rim light, desaturated color grade, shallow depth of
field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Negative Prompt:**
```
blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful
colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy,
artificial appearance, oversaturated, childish style, background characters, faces
hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright
cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive
special effects
```

**Settings:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Example 2: Two Characters - Dialogue Scene

**Format:** Cinematic (16:9)

**Complete Prompt:**
```
wide shot of ((both facing camera:1.7)), ((engaging viewer:1.5)), HSCEIA man
(white hair, lean athletic build, form-fitting tactical gear in muted grays, body
armor, strong jaw, high cheekbones, storm-gray eyes) with M4 carbine slung on tactical
sling at rest and JRUMLV woman (MultiCam woodland camo tactical pants tucked into
combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean
athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun),
both with focused tactical expressions, standing in a damaged medical facility. Harsh
medical lighting overhead, flickering fluorescent tubes. Scattered medical equipment,
overturned gurneys. harsh medical lighting on face, stark white face illumination,
clinical light on features, Dramatic rim light, desaturated color grade, shallow
depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> HSCEIA man, engaging viewer, looking at camera
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> JRUMLV woman, engaging viewer, looking at camera
```

**Note:** In dialogue/resting scenes, weapon is typically "slung on tactical sling" or "at rest" - shows Daniel has the weapon but isn't actively using it.

**Negative Prompt:** (Same as Example 1)

**Settings:**
```json
{
  "width": 1920,
  "height": 1088,
  "model": "flux1-dev-fp8",
  "sampler": "euler",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Example 3: Single Character - Medical Scene

**Format:** Vertical (9:16)

**Complete Prompt:**
```
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into
combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt,
lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical
bun), concentrated medical expression on her face, examining medical equipment in
a sterile medical facility. Clinical white walls, pristine medical instruments on
steel tables. Overhead surgical lights. harsh medical lighting on face, stark white
face illumination, clinical light on features, professional photography, shallow
depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

### Example 4: Dynamic Battle Lighting (Beat-Narrative Driven)

**Format:** Vertical (9:16)

**Beat Narrative:** "Daniel advances through heavy gunsmoke, bright muzzle flashes and explosions illuminating the chaos"

**Lighting Extraction:**
- Light sources: "muzzle flashes", "explosions"
- Qualities: "bright", "heavy gunsmoke" (subduing effect)
- Dynamic: Multiple intermittent sources

**Complete Prompt:**
```
medium shot of a HSCEIA man (white hair, lean athletic build, form-fitting tactical
gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes),
focused combat readiness on his face, advancing with M4 carbine at ready position
through heavy gunsmoke, bright muzzle flashes and explosions illuminating the chaos.
Dense smoke filling air, intermittent bright explosive bursts, chaotic combat zone.
bright intermittent flashes on face subdued by thick gunsmoke, dramatic explosive
illumination, flickering combat lighting through haze, sharp contrast bursts, Dramatic
rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Note:** Face lighting extracts ALL lighting elements from beat: "bright intermittent flashes" (muzzle/explosions) + "subdued by thick gunsmoke" (environmental effect). This shows how principle-based extraction handles complex, dynamic scenarios.

---

## Part 9: Common Mistakes to Avoid

### 9.1 Character Description Mistakes

**WRONG:**
```
JRUMLV woman in tactical gear
```
**Problem:** Too vague, no physique description, AI will render bulky

**CORRECT:**
```
JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots,
form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic
build, toned arms, dual holsters, tactical watch, dark brown tactical bun)
```

---

**WRONG:**
```
HSCEIA man with short dark hair in tactical outfit
```
**Problem:** Wrong hair color! Daniel has WHITE hair

**CORRECT:**
```
HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted
grays, body armor, M4 carbine slung across chest)
```

---

**WRONG:**
```
JRUMLV woman wearing sleeveless tactical vest
```
**Problem:** "sleeveless" is redundant and confuses AI into making ENTIRE outfit sleeveless

**CORRECT:**
```
JRUMLV woman (...form-fitting tactical vest over fitted olive long-sleeved shirt...)
```

### 9.2 Weapon Positioning Mistakes

**WRONG:**
```
HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, M4 carbine slung across chest)
```
**Problem:** Weapon position is static - Daniel can't aim, fire, or change positions

**CORRECT:**
```
HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), focused combat readiness on his face, advancing with M4 carbine at ready position
```
**Why:** Weapon position comes from BEAT ACTION, not character description. This allows:
- Defensive: "M4 carbine at ready position"
- Offensive: "aiming M4 carbine at threat"
- Moving: "M4 carbine slung on tactical sling"
- Resting: "weapon lowered and secured"

### 9.3 Settings Mistakes

**WRONG:**
```json
{
  "cfgscale": 7,
  "model": "flux1-dev-fp8"
}
```
**Problem:** cfgscale=7 is for Stable Diffusion, causes artifacts in FLUX

**CORRECT:**
```json
{
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "model": "flux1-dev-fp8"
}
```

### 9.4 Face Lighting Mistakes

**WRONG - Skipped Beat Narrative:**
```
Beat says: "heavy gunsmoke, bright muzzle flashes illuminating the haze"
Face lighting: "dramatic tactical lighting on face" (generic fallback)
```
**Problem:** Ignored specific lighting details in beat narrative!

**CORRECT - Extract from Beat:**
```
Beat says: "heavy gunsmoke, bright muzzle flashes illuminating the haze"
Face lighting: "bright intermittent muzzle flashes on face subdued by thick gunsmoke,
                flickering combat lighting through haze"
```

---

**WRONG - Contradicts Beat Narrative:**
```
Beat says: "bathed in eerie green light from backup generators"
Face lighting: "flickering red emergency light on face"
```
**Problem:** Face lighting contradicts environmental lighting! (Green vs Red)

**CORRECT - Matches Beat Narrative:**
```
Beat says: "bathed in eerie green light from backup generators"
Face lighting: "eerie green light on face, sickly green illumination on features"
```

---

**WRONG - Generic When Beat Has Details:**
```
Beat says: "explosions illuminating the darkness"
Face lighting: "good lighting on face"
```
**Problem:** Beat has specific dynamic lighting, but face lighting is generic!

**CORRECT - Extract Dynamic Elements:**
```
Beat says: "explosions illuminating the darkness"
Face lighting: "intermittent bright explosive flashes on face, sudden intense illumination,
                dramatic contrast lighting from explosions"
```

---

**CORRECT - Uses Fallback When Beat Has No Lighting:**
```
Beat says: "moving through damaged tactical facility" (no lighting mentioned)
Face lighting: "dramatic tactical lighting on face, high contrast face shadows"
```
**Why Correct:** Beat has NO lighting details, so fallback is appropriate.

### 9.5 YOLO Segment Mistakes

**WRONG:**
```
<segment:yolo-face_yolov9c.pt, 0.35, 0.5>
```
**Problem:** Missing face index (-1, -2, etc.)

**CORRECT:**
```
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

---

## Part 10: Version History & Evolution

### Evolution of Prompt Standards

**Version 1.0 (Nov 22) - Camera Direction Heavy:**
- Used: `(((facing camera directly:2.0))), BREAK, ((making eye contact:1.8))`
- Used: Heavy emphasis weights throughout
- Problem: Cluttered prompts, hard to read/edit

**Version 2.0 (Nov 23) - CURRENT:**
- Uses: Facial expressions (`alert expression on her face`)
- Uses: YOLO segments for camera control
- Uses: Atmosphere-specific face lighting
- Result: Cleaner prompts, same visual quality

### Character Appearance Evolution

**Cat Mitchell Changes:**
1. Generic tactical gear → MultiCam woodland camo specifics
2. No physique → "lean athletic build, toned arms"
3. "sleeveless vest" → removed (caused issues)
4. "plate carrier with pouches" → "form-fitting tactical vest"

**Daniel O'Brien Changes:**
1. "short dark hair" → "white hair" (67 prompts corrected!)
2. "black plate carrier" → "form-fitting tactical gear in muted grays"
3. Generic soldier → Specific facial features added
4. Added: "strong jaw, high cheekbones, storm-gray eyes"

### FLUX Settings Evolution

**Changed:**
- cfgscale: 7 → 1 (540 batch configs updated!)
- Added: fluxguidancescale: 3.5
- Seed: Fixed → -1 (random for batches)

---

## Part 11: Production Workflow Integration

### 11.1 Database Integration with Beat-Narrative Lighting Extraction

When using with database-driven generation:

```python
from app.services.character_appearance_service import CharacterAppearanceService
import re

# Load database context
appearance = await service.get_character_appearance(
    character_name="Catherine 'Cat' Mitchell",
    location_name="Atlanta Emergency Zone",
    temporal_context="POST_COLLAPSE"
)

# Load beat narrative
beat_data = load_beat_from_json(beat_id)
beat_narrative = beat_data['description']

# STEP 1: Extract ANY lighting-related terms from beat narrative
def extract_lighting_keywords(narrative_text):
    """Extract lighting keywords using the principle-based approach."""
    keywords = {
        'sources': [],      # emergency generators, muzzle flashes, etc.
        'qualities': [],    # bright, subdued, dim, harsh, etc.
        'colors': [],       # green, orange, red, blue, etc.
        'effects': [],      # gunsmoke, dust, fog, rain, etc.
        'time': [],         # dawn, dusk, night, midday, etc.
        'intensity': []     # barely visible, blinding, faint, etc.
    }

    # Define search patterns (expand as needed)
    patterns = {
        'sources': ['generator', 'flash', 'explosion', 'fire', 'searchlight', 'emergency light'],
        'qualities': ['bright', 'subdued', 'dim', 'harsh', 'soft', 'flickering', 'strobing'],
        'colors': ['green', 'orange', 'red', 'blue', 'golden', 'white', 'amber', 'eerie'],
        'effects': ['gunsmoke', 'smoke', 'dust', 'fog', 'rain', 'haze'],
        'time': ['dawn', 'dusk', 'night', 'midday', 'twilight', 'sunset'],
        'intensity': ['barely visible', 'blinding', 'faint', 'intense', 'overwhelming']
    }

    # Extract keywords that appear in narrative
    for category, terms in patterns.items():
        for term in terms:
            if term.lower() in narrative_text.lower():
                keywords[category].append(term)

    return keywords

# STEP 2: Build face lighting from extracted keywords
lighting_keywords = extract_lighting_keywords(beat_narrative)

if any(lighting_keywords.values()):  # If ANY lighting keywords found
    # Build face lighting using extracted terms
    face_lighting_parts = []

    if lighting_keywords['colors']:
        face_lighting_parts.append(f"{lighting_keywords['colors'][0]} light on face")

    if lighting_keywords['qualities']:
        face_lighting_parts.append(f"{lighting_keywords['qualities'][0]} illumination on features")

    if lighting_keywords['effects']:
        face_lighting_parts.append(f"subdued by {lighting_keywords['effects'][0]}")

    if lighting_keywords['sources']:
        face_lighting_parts.append(f"from {lighting_keywords['sources'][0]}")

    face_lighting = ", ".join(face_lighting_parts)

else:  # NO lighting details in beat - use fallback
    # Fallback to location-based atmosphere
    location_name = appearance['location_name']
    atmosphere_map = {
        'Atlanta Emergency Zone': 'dramatic tactical lighting on face, high contrast shadows',
        'NHIA Facility 7': 'harsh medical lighting on face, stark white illumination',
        'Safehouse': 'soft dramatic lighting, warm illumination on features'
    }
    face_lighting = atmosphere_map.get(location_name, 'atmospheric lighting on face')

# STEP 3: Merge all elements
final_prompt = (
    f"{shot_type} of a {appearance['clothing_description']}, "
    f"{facial_expression}, {action} {beat_narrative}. "
    f"{face_lighting}, {composition_directives}"
)
```

**Data Sources:**

| Source | Provides |
|--------|----------|
| **Database** | Location-specific outfits, temporal context, demeanor, LoRA weights |
| **Beat Narrative** | ALL lighting details (sources, colors, qualities, effects) - HIGHEST PRIORITY |
| **Location Fallback** | Generic lighting templates ONLY when beat has no lighting |

**Key Principle:** Extract and adapt, don't assume or override.

### 11.2 File Organization

**Episode 1 Files (Latest First):**
1. `episode_1_prompts_BATCH_GENERATION.json` (Nov 23) - **CURRENT PRODUCTION**
2. `episode_1_prompts_MULTI_SAMPLER.json` (Nov 22) - Multi-sampler variants
3. `episode_1_prompts_CAMERA_LIGHTING_FIXED.json` (Nov 22) - Older camera direction method

**Use BATCH_GENERATION.json for:**
- All new Episode 1 generation
- Template for Episodes 2-10
- Reference for prompt construction

### 11.3 Testing Workflow

**Before Full Generation:**
1. Select 5 curated test beats
2. Generate vertical-only (3 images per beat = 15 images)
3. Visual verification:
   - ✅ Characters face viewer
   - ✅ Athletic physique visible (not bulky)
   - ✅ Long sleeves visible (Cat)
   - ✅ White hair visible (Daniel)
   - ✅ Face lighting matches atmosphere
4. If tests pass → Full 135-beat generation

**Test Script:**
```powershell
python test_swarmui_generation_simple.py --curated --vertical
```

---

## Part 12: Quick Reference Checklist

### Before Generating Images

**Character Description:**
- [ ] LoRA trigger present (JRUMLV woman / HSCEIA man)
- [ ] "lean athletic build" included
- [ ] "form-fitting" modifier on tactical gear
- [ ] Specific clothing details (MultiCam camo, olive shirt, muted grays)
- [ ] Daniel has "white hair" (NOT dark hair!)
- [ ] Cat has "long-sleeved shirt" (NOT sleeveless)
- [ ] Weapon positions come from ACTION (not character description)

**Facial Elements:**
- [ ] Facial expression included (alert, focused, etc.)
- [ ] Face lighting MATCHES beat narrative lighting
- [ ] If beat has no lighting, use atmosphere fallback
- [ ] YOLO segment at end of prompt

**Lighting Verification:**
- [ ] READ beat narrative for ANY lighting keywords FIRST
- [ ] Extract sources, colors, qualities, effects, time-of-day
- [ ] Face lighting uses SAME descriptive words from beat
- [ ] No contradictions (e.g., beat says green, face says red)
- [ ] Only use location fallback if beat has NO lighting details

**Settings:**
- [ ] cfgscale: 1 (NOT 7!)
- [ ] fluxguidancescale: 3.5
- [ ] seed: -1 for batches
- [ ] Correct resolution (1088x1920 or 1920x1088)

**Complete Elements:**
- [ ] Negative prompt included
- [ ] Composition directives (rim light, desaturated, shallow DOF)
- [ ] Environment description
- [ ] Shot type specified

---

## Part 13: Troubleshooting Guide

### Issue: Character Looks Bulky/Heavy

**Cause:** Missing physique description or wrong gear modifiers

**Solution:**
- Add: "lean athletic build, toned arms"
- Change: "tactical vest with pouches" → "form-fitting tactical vest"
- Ensure: "form-fitting" on all gear

### Issue: Character Shows Back to Camera

**Cause:** Missing YOLO segment or weak facial expression

**Solution:**
- Verify YOLO segment present: `<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>`
- Add explicit facial expression
- For two characters, use: "((both facing camera:1.7))"

### Issue: Sleeveless Appearance When Should Have Sleeves

**Cause:** "sleeveless" descriptor present

**Solution:**
- Remove "sleeveless" entirely
- Explicitly state: "over fitted olive long-sleeved shirt"
- Verify full clothing description present

### Issue: Wrong Hair Color (Daniel)

**Cause:** Using old prompts with "short dark hair"

**Solution:**
- ALWAYS start Daniel description with: "white hair"
- Never omit hair description
- Check against CLOTHING_DESCRIPTION_CHANGES_LOG.md

### Issue: Lighting Color/Quality Doesn't Match Beat

**Cause:** Used location fallback instead of extracting from beat narrative

**Example Problem 1 - Color Mismatch:**
```
Beat: "eerie green light from backup generators"
Prompt used: "flickering red emergency light on face"
Result: Wrong color completely! (green vs red)
```

**Example Problem 2 - Missing Dynamic Elements:**
```
Beat: "bright muzzle flashes through heavy gunsmoke"
Prompt used: "dramatic tactical lighting on face"
Result: Lost the intermittent flashes and smoke-diffusion effect!
```

**Solution - Use Extraction Principle:**
1. **READ** beat narrative for ANY lighting keywords
2. **EXTRACT** all relevant terms:
   - Sources: "backup generators", "muzzle flashes"
   - Colors: "green", "bright"
   - Qualities: "eerie", "heavy"
   - Effects: "gunsmoke"
3. **ADAPT** to face lighting using SAME terms:
   - "eerie green light on face from backup generators"
   - "bright intermittent flashes on face subdued by thick gunsmoke"
4. **VERIFY** face lighting doesn't contradict beat
5. Only use location fallback if beat has **ZERO** lighting details

### Issue: Poor Image Quality / Artifacts

**Cause:** Wrong cfgscale for FLUX model

**Solution:**
- Check cfgscale: MUST be 1 (not 7)
- Verify fluxguidancescale: 3.5
- Ensure model: "flux1-dev-fp8"

---

## Appendix A: Complete Prompt Template (Copy-Paste Ready)

```
[SHOT_TYPE] of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into
combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt,
lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical
bun), [FACIAL_EXPRESSION] on her face, [ACTION_VERB] [ENVIRONMENT_DESCRIPTION].
[LIGHTING_ATMOSPHERE]. [FACE_LIGHTING], Dramatic rim light, desaturated color grade,
shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Negative Prompt:**
```
blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful
colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy,
artificial appearance, oversaturated, childish style, background characters, faces
hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright
cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive
special effects
```

---

## Appendix B: Atmosphere-Specific Quick Templates

**Tactical Scene (Cat):**
```
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into
combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt,
lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical
bun), alert, tactical expression on her face, [ACTION] in [LOCATION]. dramatic
tactical lighting on face, high contrast face shadows, directional harsh light on
features, Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Tactical Scene (Daniel):**
```
medium shot of a HSCEIA man (white hair, lean athletic build, form-fitting tactical
gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes),
focused combat readiness on his face, [ACTION with weapon position] in [LOCATION].
dramatic tactical lighting on face, high contrast face shadows, directional harsh
light on features, Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Example with weapon position:**
```
medium shot of a HSCEIA man (white hair, lean athletic build, form-fitting tactical
gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes),
focused combat readiness on his face, advancing with M4 carbine at ready position
through damaged facility. dramatic tactical lighting on face, high contrast face
shadows, directional harsh light on features, Dramatic rim light, desaturated color
grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Two Characters (Cat + Daniel):**
```
wide shot of ((both facing camera:1.7)), ((engaging viewer:1.5)), HSCEIA man
(white hair, lean athletic build, form-fitting tactical gear in muted grays, body
armor, strong jaw, high cheekbones, storm-gray eyes) and JRUMLV woman (MultiCam
woodland camo tactical pants tucked into combat boots, form-fitting tactical vest
over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters,
tactical watch, dark brown tactical bun), [EXPRESSIONS], [ACTION with weapon details
if applicable] in [LOCATION]. [FACE_LIGHTING], Dramatic rim light, desaturated color
grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> engaging viewer, looking at camera
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> engaging viewer, looking at camera
```

**Example with weapon context:**
```
wide shot of ((both facing camera:1.7)), ((engaging viewer:1.5)), HSCEIA man
(white hair, lean athletic build, form-fitting tactical gear in muted grays, body
armor, strong jaw, high cheekbones, storm-gray eyes) with M4 carbine at low ready
and JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots,
form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build,
toned arms, dual holsters, tactical watch, dark brown tactical bun) with sidearm drawn,
both with focused tactical expressions, clearing damaged facility.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> engaging viewer, looking at camera
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> engaging viewer, looking at camera
```

---

## Document Metadata

**Created:** 2025-11-23
**Version:** 2.0
**Status:** PRODUCTION STANDARD
**Source Files:**
- `episode_1_prompts_BATCH_GENERATION.json` (135 prompts)
- `CLOTHING_DESCRIPTION_CHANGES_LOG.md`
- `DATABASE_APPEARANCE_CONTEXTS_EPISODE1_UPDATE.md`
- `CAMERA_LIGHTING_CORRECTIONS_SUMMARY.md` (superseded)

**Supersedes:**
- All previous prompt architecture guides
- CAMERA_LIGHTING_CORRECTIONS_SUMMARY.md (heavy camera direction method)
- Older Cat_Daniel_Prompt_Architecture_Guide.md versions

**Tested With:**
- SwarmUI API
- FLUX1-dev-fp8 model
- Gargan LoRA (JRUMLV woman, HSCEIA man triggers)
- YOLO face detection (yolo-face_yolov9c.pt)

**Production Use:**
- Episode 1: 135 beats tested and verified
- Episodes 2-10: Use as template
- Database integration: Compatible with CharacterAppearanceService

---

**This guide represents the most current, tested, and production-ready standards for Cat & Daniel prompt construction. All future episodes should follow these standards unless explicitly updating with newer tested methods.**
