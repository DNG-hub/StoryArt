# ARCHITECT MEMO: FLUX Prompt Generation Engine — Error Report & Directives
**From:** Creative Director / Prompt Engineering Review
**To:** Batch FLUX Rendering Engine Architect
**Re:** Critical prompt generation failures in Gemini's beat-to-prompt interpretation layer
**Date:** 2026-02-07
**Priority:** HIGH — These errors are producing unusable renders at batch scale

---

## 1. EXECUTIVE SUMMARY

The current Gemini-driven prompt generation layer is producing prompts that FLUX cannot reliably render. The failures fall into three categories:

1. **Scene continuity loss** — characters and vehicles disappear between sequential beats
2. **Attention budget misallocation** — prompts spend tokens on invisible micro-details instead of composition-critical elements
3. **FLUX-incompatible language** — narrative/story phrasing that FLUX's T5 encoder cannot interpret as visual instructions

This memo documents each failure class with before/after examples, provides mandatory rules for the prompt generation layer, and introduces cinematography directives that must be embedded in the generation logic.

---

## 2. FAILURE CLASS 1: SCENE CONTINUITY LOSS

### The Problem
Gemini treats each narrative beat as an isolated prompt request. When a beat focuses on one character's dialogue or internal state, Gemini drops all other persistent scene elements — other characters, vehicles, environmental anchors.

### Example — Dinghy Motorcycle Sequence
**Scene context:** Cat and Daniel are BOTH riding the Dinghy motorcycle through Georgia at night. They remain on the bike for the entire sequence until they explicitly dismount.

**Beat:** *"It's a PSYOP," she said, shifting her weight as the Dinghy's tires bit into a patch of loose gravel.*

**Gemini produced:**
```
close-up shot, shallow depth of field, JRUMLV woman field operative (athletic build,
wearing skin-tight matte charcoal-black Aegis adaptive biosuit with subtle geometric
sensor patterns, integrated biometric monitors on forearms, reinforced joints at knees
and elbows...) speaking into comms, shifting weight as dinghy's tires bite into loose
gravel...
```

**What went wrong:**
- Daniel completely disappeared — he is DRIVING the motorcycle she is ON
- The motorcycle itself is barely mentioned and buried at the end of the prompt
- Cat is described as "speaking into comms" — she is speaking to Daniel who is RIGHT IN FRONT OF HER
- Close-up shot selected, which cannot show the motorcycle, the gravel, the second rider, or the environment

### MANDATORY RULE: Scene Continuity Carry-Forward

```
RULE: When generating sequential beats within the same scene, ALL persistent
elements carry forward until the narrative EXPLICITLY changes them.

- If characters are on a vehicle in beat 1, they are on that vehicle in ALL
  subsequent beats until the text says they stopped/dismounted/exited.

- If two characters are present in the scene, BOTH appear in every prompt
  unless one explicitly leaves.

- Vehicle/location anchors persist in every prompt of the sequence.

- VALIDATION CHECK: Before finalizing any prompt, ask: "What would a camera
  literally see right now?" If the answer includes another character, a vehicle,
  or a location element — it MUST be in the prompt.
```

### Continuity Carry-Forward Implementation

The engine must maintain a **scene state object** that persists across beats:

```json
{
  "scene_id": "ep2_s3",
  "persistent_elements": {
    "vehicle": "matte-black armored motorcycle (The Dinghy)",
    "vehicle_state": "in_motion",
    "characters_present": ["Cat", "Daniel"],
    "character_positions": {
      "Daniel": "front/driving",
      "Cat": "behind/passenger"
    },
    "gear_state": "HELMET_DOWN",
    "location": "Georgia forest road at night",
    "lighting": "cold moonlight, blue LED underglow from suits"
  },
  "carry_until": "explicit_dismount_or_scene_change"
}
```

Every beat prompt MUST include elements from `persistent_elements` unless the beat narrative explicitly overrides them. A beat about Cat's dialogue does NOT clear `Daniel` from `characters_present`.

---

## 3. FAILURE CLASS 2: ATTENTION BUDGET MISALLOCATION

### The Problem
FLUX.1-dev uses a T5 text encoder with approximately 200 useful tokens of attention. The current prompts waste 60-70% of this budget on micro-details that FLUX cannot render, while starving the composition-critical elements that determine whether the image is usable.

### Example — Dual Rider Motorcycle Scene

**Gemini produced (per character, ~50 tokens EACH):**
```
HSCEIA man field operative (6'2" imposing muscular build, wearing skin-tight matte
charcoal-black Aegis adaptive biosuit with tactical sensor arrays, integrated weapon
mounting points on thighs and back, reinforced armor plates at chest and shoulders,
combat webbing with ammunition pouches, wearing matte black Wraith tactical helmet
with raised transparent visor exposing face, helmet has angular aggressive design
with side-mounted sensors, M4 carbine held at tactical ready position, M4 carbine
on tactical sling across chest)
```

**What went wrong:**
- "tactical sensor arrays" — FABRICATED. Not in canonical Aegis description.
- "integrated weapon mounting points on thighs and back" — FABRICATED.
- "combat webbing with ammunition pouches" — FABRICATED. Aegis is a biosuit, not military BDUs.
- "reinforced armor plates at chest and shoulders" — PARTIALLY CORRECT but over-described.
- "angular aggressive design with side-mounted sensors" — subjective/narrative language.
- "M4 carbine held at tactical ready position, M4 carbine on tactical sling across chest" — M4 mentioned TWICE.
- ~50 tokens on ONE character, leaving almost nothing for the motorcycle, environment, and composition.
- Result: FLUX renders two heavily-detailed standing figures and forgets the motorcycle entirely.

### MANDATORY RULE: Token Budget Allocation

```
RULE: Total prompt MUST stay under 200 tokens. Budget allocation:

  COMPOSITION & POSITIONING:  ~30 tokens (20%)  ← THIS IS THE MOST IMPORTANT
  CHARACTER 1 DESCRIPTION:    ~35 tokens (20%)
  CHARACTER 2 DESCRIPTION:    ~35 tokens (20%)
  VEHICLE/LOCATION:           ~30 tokens (15%)
  LIGHTING & ATMOSPHERE:      ~25 tokens (15%)
  SEGMENT TAGS:               ~15 tokens (10%)

  COMPOSITION COMES FIRST. If the prompt doesn't establish WHO is WHERE
  doing WHAT in the first 30 tokens, FLUX will improvise — and it will
  be wrong.
```

### MANDATORY RULE: Canonical Descriptions Only

```
RULE: Character and gear descriptions must come VERBATIM from the canonical
reference. The prompt generator MUST NOT fabricate, embellish, or improvise
gear details.

FORBIDDEN (fabricated):
- "tactical sensor arrays"
- "integrated weapon mounting points"
- "combat webbing with ammunition pouches"
- "angular aggressive design"
- "subtle geometric sensor patterns"
- "integrated biometric monitors on forearms"
- "reinforced joints at knees and elbows"

CANONICAL (use these):
- "skin-tight matte charcoal-black Aegis suit with hexagonal weave pattern"
- "vacuum-sealed second-skin fit"
- "smooth latex-like surface with zero wrinkles"
- "molded armored bust panels with [COLOR] LED underglow" (Cat)
- "molded chest armor plates with [COLOR] LED underglow" (Daniel)
- "Wraith helmet fully sealed with dark opaque visor" (visor down)
- "matte charcoal angular faceplate, sensor array active" (helmet detail)
- "ribbed reinforcement panels at joints and spine" (detailed shots only)

The Aegis suit is a BIOSUIT, not military tactical gear. It molds to the
body like a second skin. NEVER use: tactical vest, cargo pockets, loose
fitting, BDU, fatigues, combat webbing, ammunition pouches.
```

### MANDATORY RULE: Abbreviation by Shot Type

```
RULE: Suit description length scales with shot proximity.

CLOSE-UP (face/detail shot):
  Full canonical description permitted — material, texture, LED color,
  mesh underlayer, ribbed reinforcement.

MEDIUM SHOT (waist up):
  Standard description — suit color, hexagonal weave, helmet state,
  LED underglow, primary accessory (medical kit or M4).

WIDE SHOT (full body + environment):
  Abbreviated — "skin-tight matte charcoal-black Aegis suit with
  hexagonal weave pattern and sealed Wraith helmet"
  (~15 tokens per character, leaving budget for composition)

EXTREME WIDE (establishing):
  Minimal — "matching matte-black tactical suits and sealed helmets"
  (~8 tokens for both characters combined)
```

---

## 4. FAILURE CLASS 3: FLUX-INCOMPATIBLE LANGUAGE

### The Problem
FLUX's T5 encoder processes natural language descriptions of visual scenes. It does NOT understand narrative language, emotional states, story context, or abstract concepts. When the prompt contains these, FLUX either ignores them (wasting tokens) or misinterprets them (producing artifacts).

### Examples of FLUX-Incompatible Language

| Gemini Wrote | Problem | FLUX-Compatible Replacement |
|---|---|---|
| "fused together by the speed and suits" | Metaphor — FLUX may literally try to fuse the bodies | "woman pressed tight against man's back" |
| "speaking into comms" | She's talking to Daniel beside her | "woman leaning toward man's shoulder" or omit (can't photograph speech) |
| "shifting weight as dinghy's tires bite into loose gravel" | Mixed narrative + visual | "woman lifting off motorcycle seat, gravel spraying from rear tire" |
| "sharp, confident expression" + "stoic expression" | Two expressions on one character | Pick ONE: "focused forward gaze" |
| "post-collapse atmosphere" | Abstract concept | "overgrown ruins, cracked asphalt, rusted vehicles" |
| "in motion, artificial lighting, screen glow" | Contradictory — outdoor night scene has no screens | Remove — use "moonlight" and "LED underglow" |

### MANDATORY RULE: Camera-Observable Only

```
RULE: Every element in the prompt must be something a camera can directly
photograph at the moment of capture.

CAN PHOTOGRAPH:
- Body position ("woman gripping man's waist")
- Physical objects ("matte-black motorcycle", "gravel road")
- Light sources ("moonlight", "blue LED underglow")
- Material properties ("hexagonal weave pattern", "matte charcoal-black")
- Environmental elements ("dense forest", "rusted vehicles", "kudzu")

CANNOT PHOTOGRAPH:
- Emotions ("confident", "terrified", "conflicted")
  → Replace with observable expression: "tight jaw", "narrowed eyes", "clenched fists"
- Story context ("post-Collapse", "PSYOP", "hunting a ghost")
  → Replace with visual result: "abandoned overgrown environment"
- Sound ("speaking", "engine roar", "gravel crunching")
  → Replace with visual evidence: "mouth open mid-sentence", "motion blur", "gravel spraying"
- Internal states ("aware of his body beneath the suit")
  → Omit entirely
- Abstract atmosphere ("tense", "dangerous", "intimate")
  → Replace with lighting/environment: "harsh shadows", "debris field", "close proximity"
```

---

## 5. FLUX-SPECIFIC RENDERING RULES

These rules reflect how FLUX.1-dev actually processes prompts and MUST be encoded in the generation logic:

### 5A. Subject-First Ordering
FLUX gives the most weight to what appears first in the prompt. The primary visual subject MUST lead.

```
WRONG:  "dark forest road at night, cold moonlight, two riders on motorcycle..."
         (FLUX renders a forest. Motorcycle is an afterthought.)

RIGHT:  "man and woman riding together on matte-black motorcycle on dark forest
         road at night, cold moonlight..."
         (FLUX renders the motorcycle with riders. Forest is context.)
```

### 5B. Spatial Relationships Must Be Explicit
FLUX has weak spatial reasoning. Vague positioning = random placement.

```
WRONG:  "HSCEIA man in front and JRUMLV woman behind"
         (Ambiguous — in front of what? Behind what?)

RIGHT:  "HSCEIA man driving the motorcycle with JRUMLV woman seated behind
         him arms wrapped around his waist"
         (Physical relationship explicitly described.)
```

### 5C. No Prompt Weighting
Parenthetical weights `(concept:1.5)` do NOT work on FLUX. The T5 encoder ignores them. Do not include them.

### 5D. No Negative Prompts
FLUX does not support negative prompts. Quality control must happen through positive description specificity, not negative exclusion.

### 5E. Natural Language Over Keywords
FLUX's T5 encoder understands sentences better than comma-separated tag lists.

```
WRONG:  "matte black, motorcycle, two riders, night, forest, moonlight, motion blur"

RIGHT:  "two riders on a matte-black motorcycle speeding through a dark forest
         road at night with moonlight filtering through trees and motion blur
         on the road edges"
```

### 5F. Prompt Length Sweet Spot
40-80 tokens for the core composition. Total prompt under 200 tokens including segment tags. Beyond 200 tokens, FLUX begins losing coherence on later elements.

---

## 6. HELMET STATE LOGIC — ZERO TOLERANCE

The prompt generator is producing helmet state errors. These are not suggestions — they are hard rules.

```
RULE: Helmet state is determined by scene context, NOT by "wanting to show the face."

RIDING AT SPEED (any speed above walking):
  → Visor DOWN. No exceptions.
  → No hair description. Hair is tucked into suit collar.
  → No face segment tags.

STANDING/STATIONARY IN FIELD:
  → Visor UP (default) — face visible, hair visible below helmet.
  → Face segment tags included.

COMBAT/BREACH:
  → HUD ACTIVE — visor shows tactical data.
  → No hair. No face segment.

STEALTH/INFILTRATION:
  → Visor DOWN — sealed for noise/light discipline.
  → No hair. No face segment.

CRITICAL: When visor is DOWN, the prompt MUST NOT contain:
  - Any hair description (color, style, length)
  - Any facial expression
  - Any face segment tag
  - "exposing face" or "showing face" or "visor raised"
  
VIOLATION: Gemini generated "raised transparent visor exposing face" for a scene
where characters are riding at 80mph at night through hostile territory. This is
physically nonsensical and wastes token budget on face details that shouldn't exist.
```

---

## 7. CINEMATOGRAPHY & DIRECTORIAL INSTRUCTIONS

These directives MUST be encoded in the prompt generation logic as standing rules.

### 7A. Cat as Visual Anchor — Director's Standing Note

Cat is the visual center of gravity in this series. The cinematographer treats her the way a great DP shoots an action heroine — powerful, capable, and physically compelling in equal measure.

**Framing priorities (when scene permits):**

- **Silhouette and shape** — The Aegis suit is skin-tight for a reason. Frame to show her athletic hourglass figure, defined waist, and curves. The suit does the work — no exaggeration needed.

- **From behind / three-quarter rear** — When she's moving, leading, or in action, rear and three-quarter angles naturally emphasize her shape in the suit (hips, waist-to-shoulder ratio, athletic posture). This is the DEFAULT angle for motorcycle scenes and walking-away shots.

- **Low angle** — Shooting slightly upward emphasizes her stature, strength, and silhouette against environment. Use for power moments and action beats.

- **Face as emotional anchor** — When her face is visible (visor up or off-duty), it is the most important element. Green eyes, focused intensity, intelligence. She earns the camera's attention through presence, not posing.

- **Bust/chest framing** — The Aegis suit's molded armored bust panels with LED underglow are a designed visual feature of the suit. Medium shots naturally include this. Always integrated with action or environment, never gratuitous.

- **In motion** — Cat is most visually striking when active: climbing, running, shifting weight, bracing, examining. Static glamour shots break character.

**What this is NOT:**
- Not pin-up posing — she never poses for the camera
- Not at odds with the story — her femininity serves characterization, not decoration
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

### 7B. Dual Character Composition

When both Cat and Daniel appear:
- Daniel typically camera-LEFT (larger frame, protective positioning)
- Cat typically camera-RIGHT (analytical, observing)
- On motorcycle: Daniel FRONT (driving), Cat BEHIND (passenger)
- Interaction space between them tells the relationship story
- Both faces must be in frame for dual YOLO face segments (visor-up scenes only)

### 7C. Scene Type → Shot Selection

| Scene Type | Primary Shot | Cat Framing Priority |
|---|---|---|
| Vehicle/motorcycle | Wide or medium from low rear angle | Her figure on the bike, shape emphasized |
| Investigation/evidence | Close-up or medium | Face + hands, analytical intensity |
| Character emotional moment | Medium close-up | Face as emotional anchor, eyes |
| Action/combat | Wide or medium | Full body in motion, athletic silhouette |
| Establishing/location | Extreme wide | Small figures against vast environment |
| Stealth/infiltration | Wide, deep focus | Silhouette against dark spaces |
| Suit-up sequence | Medium, shallow focus | Suit conforming to body, vulnerability |

### 7D. When to Choose Which Angle

```
DECISION TREE FOR CAMERA ANGLE:

Is Cat's face visible (visor up/off-duty)?
  YES → Face is the anchor. Medium close-up or close-up. Eye level or slight low angle.
  NO (visor down) →
    Is she in motion?
      YES → Rear three-quarter or side angle. Wide or medium shot. Her silhouette is the image.
      NO → Low angle looking up. Her shape against environment/sky.
    Is she on the motorcycle?
      YES → Low rear three-quarter angle. Both riders visible. Her figure wrapped around Daniel.
      NO → Follow motion direction. Frame to show waist-hip-shoulder ratio.
```

---

## 8. SEGMENT TAG RULES

Face segment tags are ONLY applied when faces are visible. The prompt generator must follow this logic exactly:

| Condition | Segment Tags |
|---|---|
| Single character, visor UP or OFF_DUTY | `<segment:yolo-face_yolov9c.pt-0,0.35,0.5>` |
| Single character, visor DOWN or HUD | NO segment tags |
| Dual characters, BOTH visors UP | `<segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>` |
| Dual characters, ONE visor up | Single segment for the visible face only |
| Dual characters, BOTH visors DOWN | NO segment tags |
| Optional clothing refinement | `<segment:description,0.5,0.5>` (CLIP-based) |

**Syntax rules:**
- NO spaces within segment syntax
- `-0` = leftmost face in frame, `-1` = second from left
- Segment tags go at the END of the prompt, after all visual description
- Creativity: `0.35` | Threshold: `0.5` (project standard)

---

## 9. MODEL SELECTION RULE (NEW)

Not every scene should be rendered with FLUX. The prompt generation engine should flag scenes for alternate model rendering when appropriate:

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

---

## 10. CORRECTED PROMPT EXAMPLES

### Example A — Motorcycle Ride (Both Helmets Down)

**Beat:** *"They were a single fused organism of matte-black carbon fiber and hexagonal weave, tearing through the Georgia darkness at eighty miles per hour."*

**WRONG (what Gemini produced):**
```
medium full shot, shallow depth of field, HSCEIA man field operative (6'2" imposing
muscular build, wearing skin-tight matte charcoal-black Aegis adaptive biosuit with
tactical sensor arrays, integrated weapon mounting points on thighs and back,
reinforced armor plates at chest and shoulders, combat webbing with ammunition
pouches, wearing matte black Wraith tactical helmet with raised transparent visor
exposing face...) [~100 tokens on characters alone, motorcycle buried at end]
```

**RIGHT:**
```
wide shot from low front three-quarter angle, HSCEIA man and JRUMLV woman riding
together on matte-black armored motorcycle with aggressive angular lines and
reinforced carbon-fiber frame speeding down dark forest road at night, he drives
in front wearing skin-tight matte charcoal-black Aegis suit with hexagonal weave
and sealed Wraith helmet with dark visor, she presses against his back arms locked
around his waist in matching Aegis suit with molded armored bust panels with blue
LED underglow and sealed Wraith helmet, skeletal trees and moonlight streaking past
in motion blur, cold blue underglow from suit seams reflecting off frame
```

### Example B — Cat Dialogue Beat (Continuity Maintained)

**Beat:** *"It's a PSYOP," she said, shifting her weight as the Dinghy's tires bit into a patch of loose gravel.*

**WRONG (what Gemini produced):**
```
close-up shot, JRUMLV woman field operative speaking into comms... [Daniel missing,
motorcycle barely mentioned, wrong shot type]
```

**RIGHT:**
```
medium shot from low rear three-quarter angle, JRUMLV woman in skin-tight matte
charcoal-black Aegis suit with hexagonal weave pattern and sealed Wraith helmet
lifting off motorcycle seat and shifting weight to one side while gripping HSCEIA
man driving in front on matte-black armored motorcycle, gravel spraying from rear
tire, dark Georgia forest road at night, cold moonlight, blue LED underglow from
suit seams catching gravel dust, desaturated tactical color grade
```

### Example C — Dismount Scene (Face Becomes Visible)

**Beat:** *"He offered a hand to Cat... His gloved hand locked onto hers with controlled strength."*

**RIGHT:**
```
medium shot, HSCEIA man in skin-tight matte charcoal-black Aegis suit with hexagonal
weave standing beside matte-black armored motorcycle, Wraith helmet visor raised
showing face, gloved hand gripping the hand of JRUMLV woman stepping off rear seat,
matching Aegis suit with molded armored bust panels with blue LED underglow, her
Wraith helmet visor raised, debris on ground including bleached toys and brass casings,
abandoned suburban street at night, cold moonlight, cyan glow from suit collar seams,
desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
<segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

---

## 11. IMPLEMENTATION CHECKLIST

For every prompt generated, the engine must validate:

- [ ] Scene state object checked — all persistent elements present
- [ ] Token budget respected — composition leads, under 200 total
- [ ] Character descriptions from CANONICAL source only — no fabrication
- [ ] Helmet state matches scene context — speed/combat/stealth logic applied
- [ ] Hair suppressed when visor down — ZERO TOLERANCE
- [ ] No face segments when visor down
- [ ] Camera angle selected per cinematography directives
- [ ] Cat framing directive applied when she is in frame
- [ ] Subject-first ordering — primary visual subject leads the prompt
- [ ] Natural language construction — sentences, not tag lists
- [ ] No narrative language — camera-observable only
- [ ] No prompt weighting — FLUX ignores it
- [ ] No negative prompts — FLUX doesn't support them
- [ ] Segment tags at END of prompt
- [ ] Model recommendation flag set (FLUX vs ALTERNATE)

---

---

# PART II — GENERAL GUIDANCE: HOW FLUX SEES THE WORLD

The rules above fix specific errors. This section explains WHY those errors happen at a model level, and provides decision frameworks the engine needs when encountering scenes not explicitly covered above.

---

## 12. HOW FLUX ATTENTION ACTUALLY WORKS

FLUX.1-dev uses a **T5-XXL text encoder** (not CLIP). Understanding how T5 processes prompts explains nearly every rendering failure.

### 12A. T5 Is a Language Model, Not a Tag Parser

CLIP (used in SD 1.5, SDXL) was trained on image-caption pairs — short, keyword-dense captions like "a photo of a cat on a table." It treats commas as separators between independent concepts and gives roughly equal weight to each tag.

T5 was trained on **natural language tasks** — it understands grammar, sentence structure, subject-verb-object relationships, and semantic hierarchy. This means:

```
FLUX UNDERSTANDS:
  "A woman in a black suit riding behind a man on a motorcycle"
  → T5 parses: woman (subject) → in suit (modifier) → riding behind (spatial) → man (second subject) → on motorcycle (shared object)

FLUX DOES NOT UNDERSTAND WELL:
  "woman, black suit, motorcycle, man, riding, behind, night, forest"
  → T5 sees disconnected fragments. No clear subject hierarchy. Random composition.
```

**Implication for the engine:** Prompts must be grammatically coherent sentences, not comma-separated tag lists. T5 builds a semantic tree from the sentence — subjects, modifiers, spatial relationships, and context. Break the grammar and you break the tree.

### 12B. The Attention Decay Curve

T5 does NOT give equal weight to all tokens. Attention follows a decay curve:

```
Token Position:   1-30    31-80    81-150    151-200    200+
Attention Weight: ████    ███░     ██░░░     █░░░░░     ░░░░░░
Effect:           STRONG  GOOD     MODERATE  WEAK       IGNORED
```

**What this means practically:**

| Token Position | What to Put Here |
|---|---|
| 1-30 | **THE IMAGE** — primary subject, composition, spatial relationship. If FLUX only rendered these 30 tokens, would the image be recognizable? |
| 31-80 | Character details — gear, clothing, posture. This is where canonical suit descriptions go. |
| 81-150 | Environment, lighting, atmosphere. These shape the mood but don't define the composition. |
| 151-200 | Color grade, technical quality, segment tags. Fine-tuning, not structure. |
| 200+ | Effectively ignored. Tokens past 200 contribute almost nothing to the render. |

**This is why the motorcycle disappeared in Gemini's prompts.** Two characters at 50 tokens each = 100 tokens of character before the motorcycle is even mentioned. By the time FLUX reaches "sleek matte black electric motorcycle," it's already committed to rendering two standing figures.

### 12C. Subject Primacy — The First Noun Wins

FLUX gives disproportionate weight to the first concrete noun it encounters. This noun becomes the "anchor" of the image.

```
"HSCEIA man field operative, 6'2" imposing muscular build..."
  → FLUX anchors on: MAN. Renders a man. Everything else is decoration.

"matte-black armored motorcycle with two riders..."
  → FLUX anchors on: MOTORCYCLE. Renders a motorcycle. Riders are placed ON it.
```

**Rule:** The first noun in the prompt determines what FLUX thinks the image IS. If the scene is about two people on a motorcycle, the motorcycle leads. If the scene is about Cat's expression while examining evidence, Cat leads. If the scene is an abandoned suburb, the suburb leads.

```
DECISION: What is this image OF?
  → A motorcycle scene? Motorcycle first.
  → A character moment? Character first.
  → A location reveal? Location first.
  → A piece of evidence? The object first.

Then attach everything else as modifiers and spatial context.
```

### 12D. Semantic Coherence — FLUX Trusts Sentences

T5 builds relationships between concepts based on sentence grammar. Use this:

```
STRONG RELATIONSHIP (T5 links these concepts):
  "woman seated behind man on motorcycle gripping his waist"
  → T5 builds: woman → behind → man → on → motorcycle → gripping → his waist
  → All concepts are linked in a single dependency chain.

WEAK RELATIONSHIP (T5 sees these as separate):
  "woman in black suit, man in black suit, motorcycle, riding"
  → T5 builds: woman → suit | man → suit | motorcycle | riding
  → Four independent fragments. FLUX doesn't know who rides what.
```

**Rule:** Concepts that MUST appear together in the image must be linked in the same sentence. Spatial relationships ("behind," "beside," "on top of," "gripping") are the glue. Every character must be grammatically connected to their position in the scene.

### 12E. Why Fabricated Details Are Destructive

When Gemini invents "tactical sensor arrays" or "integrated biometric monitors on forearms," it's not just inaccurate — it actively damages the render:

1. **Wasted attention budget** — each fabricated phrase consumes 3-5 tokens of the attention curve for details FLUX will render as generic noise
2. **Semantic confusion** — T5 tries to reconcile "biometric monitors on forearms" with "skin-tight suit with hexagonal weave." These are conflicting visual concepts (monitors = raised boxes; skin-tight = smooth surface). FLUX compromises by rendering neither cleanly.
3. **Detail hallucination** — when FLUX can't resolve a specific detail, it renders SOMETHING in that area. That something is usually an artifact — a blob, a seam, an extra strap — that wasn't requested.

**Rule:** Only describe what exists in the canonical reference. If a detail isn't documented, it doesn't exist. Silence is better than fabrication.

---

## 13. DECISION FRAMEWORKS — WHEN NO STYLEGUIDE IS PROVIDED

The StoryArt beat analysis system provides a `styleGuide` JSON with camera, lighting, environmentFX, and atmosphere recommendations. But many scenes will arrive without one. The engine must make autonomous cinematography decisions.

### 13A. The Three-Question Framework

For any beat without a styleGuide, answer these three questions:

```
QUESTION 1: What is the SUBJECT of this image?
  → Determines what leads the prompt (first 30 tokens)
  → Determines shot type (wide for location, close for face, medium for action)

QUESTION 2: What is the MOOD of this scene?
  → Determines lighting recipe and color grade
  → Determines depth of field

QUESTION 3: Where is the CAMERA?
  → Determines angle (low, eye level, high, behind, side)
  → Apply Cat visual anchor directive if she's in frame
```

### 13B. Subject → Shot Type Decision Matrix

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

### 13C. Mood → Lighting Decision Matrix

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

### 13D. Camera Angle → Cat Directive Integration

When Cat is in the frame and no styleGuide specifies the angle:

```
Is Cat's face visible?
  YES → She is the emotional anchor.
    Is this an emotional/dialogue beat?
      YES → Medium close-up, eye level or slight low angle. Face leads.
      NO → Medium shot, slight low angle. Bust + face + authority framing.

  NO (visor down) → Her silhouette is the image.
    Is she in motion?
      YES → Rear three-quarter or side angle. Medium or wide shot.
           Emphasize her figure in the suit against the environment.
      NO → Low angle looking up. Shape against sky/background.
    Is she on the Dinghy?
      YES → Low rear three-quarter. Her figure wrapped around Daniel's back.
      NO → Frame to show waist-hip-shoulder ratio in the suit.
```

When Cat is NOT in the frame (Daniel solo, empty scene, supporting characters), use the standard Subject → Shot Type matrix from 13B.

---

## 14. SCENE TYPE TEMPLATES

These are reusable prompt skeletons for recurring scene types. The engine should match the incoming beat to a template, then fill in the specifics from the canonical references.

### 14A. VEHICLE — Motorcycle (The Dinghy)

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
| helmet_state | See Section 6 |

**Riding beats → always visor DOWN, no face segments.**

**Example (filled):**
```
wide shot from low rear three-quarter angle, matte-black armored motorcycle with aggressive angular lines and reinforced carbon-fiber frame speeding on dark forest road, HSCEIA man driving in front in skin-tight matte charcoal-black Aegis suit with hexagonal weave and sealed Wraith helmet with dark visor, JRUMLV woman pressed against his back arms wrapped around his waist in matching Aegis suit with molded armored bust panels with blue LED underglow and sealed Wraith helmet, dense Georgia forest with kudzu, cold moonlight through canopy, blue underglow from suit seams, desaturated tactical color grade
```

---

### 14B. INDOOR DIALOGUE — Safehouse / Command Center / Medical

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
- Faces visible → face segments for both
- OFF_DUTY gear state (unless they suited up and haven't changed)

**Example (Dan's Safehouse):**
```
medium shot, shallow depth of field, HSCEIA man standing at investigation board with city maps and surveillance photos pinned to wall on left and JRUMLV woman seated at communications desk on right, tense expressions, safehouse apartment with reinforced windows and monitor screens glowing blue, warm work light mixed with blue monitor glow, desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

---

### 14C. COMBAT / BREACH

**When to use:** Active firefight, door breach, tactical engagement.

**Template:**
```
[shot] from [angle], [character_1] [combat_action] in [full_suit_description]
with [weapon_state] and [helmet_HUD_state], [character_2_if_present]
[combat_action], [environment], [lighting], [color_grade]
```

**Key rules:**
- Helmet HUD ACTIVE — no faces, no hair, no face segments
- LED underglow: RED (active combat) or AMBER (elevated threat)
- Action verbs: breaching, firing, taking cover, advancing, clearing room
- Wide or medium shot to show spatial context
- Deep focus — everything sharp

**Example (Warehouse Breach):**
```
wide shot from low angle, HSCEIA man breaching rusted steel door in skin-tight matte charcoal-black Aegis suit with hexagonal weave and molded chest armor plates with red LED underglow, Wraith helmet with HUD display on visor, M4 carbine raised, JRUMLV woman stacked behind him in matching Aegis suit with red LED underglow and sealed Wraith helmet, vast warehouse interior with industrial skylights and rusted shelving, harsh tactical flashlight beam cutting through dust haze, warm amber and orange danger accents with high contrast shadows
```

---

### 14D. STEALTH / INFILTRATION

**When to use:** Covert movement through hostile territory, sneaking, reconnaissance.

**Template:**
```
[shot] from [angle], [character(s)] moving tactically through [environment],
[suit_description] with [helmet_DOWN], [stealth_posture], [lighting],
[color_grade]
```

**Key rules:**
- Helmet visor DOWN — sealed for noise/light discipline
- LED underglow: BLUE (standard) — not red, they're hiding
- Low light, deep shadows, minimal ambient
- Deep focus — environment is as important as characters
- Posture keywords: crouching, low profile, flowing between cover, pressed against wall

**Example (Suburban Necropolis):**
```
wide shot, two figures in skin-tight matte charcoal-black Aegis suits with hexagonal weave moving tactically through abandoned suburban street, sealed Wraith helmets with dark visors, man in front with sidearm at low ready flowing between cover, woman following checking medical pouch, dead houses with dark windows and overgrown yards on both sides, child's bicycle on ground with bleached streamers, cold moonlight casting long shadows, blue LED underglow faintly visible at suit seams, desaturated blue-gray color grade
```

---

### 14E. ESTABLISHING / ENVIRONMENT

**When to use:** Scene opening, new location reveal, transition between scenes.

**Template:**
```
extreme wide establishing shot, [location_visual_description],
[characters_tiny_in_frame_if_present], [environmental_storytelling_detail],
[lighting], [atmosphere], [color_grade]
```

**Key rules:**
- Characters are SMALL in frame — minimal description needed
- Location visual leads the prompt (first 30 tokens)
- Deep focus, everything sharp
- Environmental storytelling: abandoned objects, decay markers, nature reclaiming
- No face segments even if characters present (too small in frame)

**Example (Atlanta Emergency Zone):**
```
extreme wide establishing shot, downtown Atlanta medical district transformed into militarized emergency zone, concrete barriers and weapon scanners, makeshift triage tents between abandoned CDC vehicles, Georgia Dome collapsed section in distance, graffiti marking faction territories on hospital walls, two small figures in matte black suits approaching armed checkpoint, harsh daylight filtered through dust haze, desaturated tactical color grade
```

---

### 14F. SUIT-UP SEQUENCE

**When to use:** Characters donning or calibrating their Aegis suits before a mission.

**Template — Calibration (most common visual beat):**
```
medium shot, shallow depth of field, [character] standing motionless in
[full_suit_detail_description] vacuum-sealed to body, hexagonal weave pattern,
soft blue diagnostic light pulsing from seams, [hair_visible], [expression],
[other_character_action_if_present], tactical preparation area with equipment
racks, blue diagnostic lighting, [color_grade] <segment_tags>
```

**Key rules:**
- This is a CHARACTER scene — suit detail can be FULL because it IS the subject
- Hair visible (no helmet during calibration)
- Face segments YES
- If both characters present: Cat motionless during calibration, Daniel deliberately averted/busy
- Soft blue diagnostic glow is the signature lighting
- Shallow depth of field to focus on suit detail

**Example (Dual Suit-Up):**
```
medium shot, shallow depth of field, JRUMLV woman standing motionless in skin-tight matte charcoal-black Aegis adaptive undersuit vacuum-sealed to athletic body with hexagonal weave pattern and semi-transparent mesh visible at seams, molded armored bust panels with soft blue diagnostic light pulsing from hexagonal seams, dark brown hair in low ponytail, eyes forward, and HSCEIA man on left with back turned in matching Aegis suit stark white military-cut hair jaw clenched hands field-stripping sidearm, tactical preparation area, blue diagnostic lighting, desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5> <segment:yolo-face_yolov9c.pt-1,0.35,0.5>
```

---

### 14G. GHOST MANIFESTATION

**When to use:** Screens displaying Ghost messages, environmental digital disturbance, bioluminescent fungal growth.

**Template:**
```
[shot], [screen/surface showing ghost content], [character_reaction_if_present],
[location], [eerie_lighting], [supernatural_color_grade] <segment_tags_if_face_visible>
```

**Key rules:**
- Ghost has NO physical body — represent through environment
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

## 15. TEMPLATE SELECTION LOGIC

The engine should match each incoming beat to a template using this decision tree:

```
Does the beat involve a vehicle in motion?
  YES → 14A (Vehicle)
  
Is the beat set in an interior with dialogue/planning?
  YES → 14B (Indoor Dialogue)

Does the beat involve active combat or breach?
  YES → 14C (Combat/Breach)

Does the beat involve covert movement?
  YES → 14D (Stealth/Infiltration)

Is this a new location reveal or scene transition?
  YES → 14E (Establishing)

Does the beat involve donning or calibrating gear?
  YES → 14F (Suit-Up)

Does the beat involve Ghost communication or digital anomaly?
  YES → 14G (Ghost Manifestation)

None of the above?
  → Use the Three-Question Framework (Section 13A) to build from scratch.
```

---

*End of memo. Part I covers specific error correction. Part II provides the general principles and templates needed to handle any scene the engine encounters. Both parts are mandatory reading for the prompt generation layer.*
