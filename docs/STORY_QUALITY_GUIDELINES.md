# Story Quality Guidelines for AI Image Generation

**Purpose:** Guide story creators in developing rich story intelligence data that enhances AI-generated image quality
**Audience:** Story authors, narrative designers, content creators
**Last Updated:** 2025-11-26

---

## Overview

This is a **new process** - the first time connecting StoryTeller story intelligence with StoryArt image generation. These guidelines are based on learnings from analyzing the "Cat & Daniel: Collapse Protocol" story and designing the Episode Context Enhancement (Phases B/A/C).

As we discover what works and what doesn't, these guidelines will evolve. Your feedback and observations are critical to improving the process.

---

## Core Principle: Rich Context Creates Rich Images

**The more narrative intelligence you provide, the better the AI-generated images will be.**

AI image generation quality is directly proportional to:
1. **Thematic depth** - Specific, actionable themes
2. **Tonal clarity** - Clear guidance on atmosphere and mood
3. **Narrative specificity** - Concrete details, not abstract concepts
4. **Character development tracking** - Evolution over time
5. **Plot structure awareness** - Arc progression and episode relationships

---

## Story Intelligence Data Requirements

### 1. Story Context (Required)

**Field:** `stories.story_context`
**Minimum Length:** 50 characters
**Recommended Length:** 300-700 characters
**Purpose:** Provides overarching narrative framework for AI image generation

#### Quality Criteria

**Poor Example (Too Short):**
```
A post-apocalyptic story about survival and trust.
```
**Why it fails:** Too vague, no specific guidance for visual storytelling

**Good Example (Cat & Daniel - 671 chars):**
```
All character relationships exist within a framework of survival and trust in a
post-collapse medical dystopia. The central dynamic between Cat and Daniel
exemplifies professional boundaries constraining deep emotional connection -
their bond is built on mutual respect, shared trauma, and unspoken attraction
that must remain suppressed for the mission's success. Secondary relationships
should reflect the moral complexities of the collapsed world: former colleagues
may now be enemies, allies may have hidden agendas, and trust is earned through
action, not words. Sexual tension should simmer beneath professional interactions
but never compromise tactical decisions.
```
**Why it works:**
- Establishes clear world context (post-collapse medical dystopia)
- Defines core relationship dynamics (professional boundaries, suppressed attraction)
- Provides character interaction guidelines (action earns trust, tension vs. tactical decisions)
- Gives AI specific visual/emotional cues (simmering tension, moral complexity)

#### What to Include

1. **World Context:**
   - Setting type (dystopian, fantasy, contemporary, etc.)
   - Core situation (collapse, war, mystery, etc.)
   - Governing rules or constraints

2. **Relationship Framework:**
   - Primary relationship dynamics
   - Power structures
   - Trust/conflict patterns

3. **Emotional Tone Guidance:**
   - How emotions are expressed
   - Constraints on emotion (e.g., suppressed, overt, complex)
   - Tension sources

4. **Visual Implications:**
   - How the world affects appearance (professional gear, scars, etc.)
   - How relationships show visually (proximity, body language)

#### Common Mistakes to Avoid

- **Too Short:** "A sci-fi story about soldiers" - no actionable detail
- **Too Abstract:** "Explores themes of humanity" - AI can't visualize abstractions
- **List of Facts:** "Set in 2045. Has robots. War happened." - disconnected elements
- **Only Plot Summary:** Describing what happens instead of the narrative framework

---

### 2. Narrative Tone (Required)

**Field:** `stories.narrative_tone`
**Minimum Length:** 20 characters
**Recommended Length:** 150-350 characters
**Purpose:** Guides atmosphere, dialogue style, and visual mood

#### Quality Criteria

**Poor Example (Too Vague):**
```
Dark and serious.
```
**Why it fails:** No specific direction for balancing elements or creating atmosphere

**Good Example (Cat & Daniel - 329 chars):**
```
Maintain a tense, thriller atmosphere with medical and military authenticity.
Balance action sequences with quieter character moments that reveal emotional
depth. Use clipped, efficient dialogue during danger and allow vulnerability
only in safe moments. The tone should feel grounded and realistic despite the
dystopian setting.
```
**Why it works:**
- Specifies genre (tense thriller)
- Provides authenticity requirements (medical and military)
- Balances elements (action vs. quiet character moments)
- Guides dialogue style (clipped during danger, vulnerable in safe moments)
- Establishes realism as priority despite fantastical setting

#### What to Include

1. **Primary Atmosphere:**
   - Genre feel (thriller, mystery, adventure, etc.)
   - Emotional temperature (tense, hopeful, bleak, etc.)

2. **Authenticity Requirements:**
   - Technical domains (medical, military, scientific, etc.)
   - Research or realism priorities

3. **Balance Guidance:**
   - Action vs. character moments
   - Tension vs. relief
   - External vs. internal conflict

4. **Dialogue Style:**
   - Formality level
   - Situational variation (danger vs. safety)
   - Emotional expression constraints

5. **Visual Mood Implications:**
   - Lighting (harsh, dim, clinical, etc.)
   - Color palette (desaturated, high contrast, etc.)
   - Composition style (tight, claustrophobic, expansive, etc.)

#### Common Mistakes to Avoid

- **Single Adjective:** "Gritty" - too vague
- **Contradictory:** "Light-hearted and terrifying" - confuses AI
- **Only Dialogue:** Focuses on writing style without visual implications
- **No Context:** Doesn't specify when/where tone applies

---

### 3. Core Themes (Required)

**Field:** `stories.core_themes`
**Minimum Length:** 20 characters
**Recommended Length:** 150-300 characters
**Purpose:** Provides thematic anchors for visual symbolism and emotional resonance

#### Quality Criteria

**Poor Example (Generic):**
```
Love, hope, sacrifice
```
**Why it fails:** One-word themes with no nuance or visual implications

**Good Example (Cat & Daniel - 267 chars):**
```
Core themes: Truth vs. survival, duty vs. desire, redemption through action,
the cost of integrity in a corrupt system, found family bonds forged through
adversity, the intersection of medical ethics and military honor, healing as
both physical and emotional journey.
```
**Why it works:**
- **Opposing themes** create visual tension (truth vs. survival, duty vs. desire)
- **Action-oriented** themes suggest visual moments (redemption through action)
- **Specific contexts** tie themes to story world (medical ethics, military honor)
- **Nuanced expressions** avoid cliché (found family through adversity, not just "family")
- **Metaphorical depth** creates symbolic opportunities (healing physical + emotional)

#### What to Include

1. **Opposing Themes (Conflict):**
   - Truth vs. survival
   - Duty vs. desire
   - Individual vs. system
   - These create visual tension and dramatic compositions

2. **Action-Oriented Themes:**
   - Redemption **through action** (shows in images)
   - Bonds **forged through adversity** (visualizable moments)
   - Not abstract concepts like "love" or "hope"

3. **Story-Specific Themes:**
   - Medical ethics (shows in clinical settings, moral choices)
   - Military honor (shows in tactical gear, command presence)
   - Specific to your world, not generic

4. **Metaphorical Themes:**
   - Healing as physical + emotional (shows in scars, medical scenes, emotional moments)
   - Cost of integrity (shows in wear, damage, moral weight)

#### Theme Construction Formula

**Format:** `[Concept A] vs. [Concept B]` or `[Concept] through [Method]` or `The [abstract] of [concrete]`

**Examples:**
- "Trust earned through action, not words" (actionable)
- "The weight of command in a leaderless world" (visual metaphor)
- "Survival at the cost of humanity" (visual contradiction)

#### Common Mistakes to Avoid

- **Single Words:** "Loyalty" - no depth or visual implication
- **Too Many:** Listing 15 themes - dilutes focus
- **All Abstract:** "Hope, love, justice" - can't visualize abstractions
- **No Tension:** All positive or all negative - no dramatic visual opportunities

---

## Plot Arc Intelligence (For Phase A)

### 4. Plot Arc Episode Tracking

**Table:** `plot_arcs`
**Required Fields:** `activation_episode`, `peak_episode`, `resolution_episode`

**Purpose:** Allows AI to understand which arcs are active in each episode and emphasize relevant plot threads in image generation.

#### Best Practices

**For Each Plot Arc:**
```sql
INSERT INTO plot_arcs (arc_number, type, arc_hierarchy, activation_episode, peak_episode, resolution_episode, ...)
VALUES (
  1,                    -- Arc number
  'NARRATIVE',          -- Arc type
  'primary',            -- Hierarchy
  1,                    -- Activates in Episode 1
  5,                    -- Peaks in Episode 5
  8                     -- Resolves in Episode 8
);
```

**What Each Field Means:**

- **activation_episode:** When this arc begins (first mention, inciting incident)
- **peak_episode:** When this arc reaches maximum intensity (climax of this arc)
- **resolution_episode:** When this arc concludes (resolution, payoff)

#### Current Gap (As of 2025-11-26)

In the "Cat & Daniel" story:
- 13 arcs exist
- Only 6 have activation_episode and peak_episode
- All 13 have resolution_episode

**Impact:** Phase A can only use arcs with complete episode tracking to determine "active arcs in this episode."

**Action:** When creating new stories, **always populate all three fields** for every arc.

#### Episode Tracking Guidelines

1. **Activation Episode:**
   - When the arc's central question/conflict is introduced
   - First appearance of key arc elements
   - Sets up expectations

2. **Peak Episode:**
   - Maximum tension/intensity for this specific arc
   - Not necessarily the series climax
   - Can occur before or after other arc peaks

3. **Resolution Episode:**
   - Arc's central question answered
   - Conflict resolved (for better or worse)
   - Payoff delivered

---

## Character Development Tracking

### 5. Character Location Contexts (Emotional State Tracking)

**Table:** `character_location_contexts`
**Key Fields:** `demeanor_description`, `temporal_context`

**Purpose:** Track character emotional/psychological evolution across story

#### Best Practices

Instead of having one generic character description, create multiple `character_location_contexts` entries showing character evolution:

**Example: Cat's Evolution**
```sql
-- Pre-Collapse Cat (Flashback)
INSERT INTO character_location_contexts (..., demeanor_description, temporal_context)
VALUES (..., 'Idealistic, trusting, believes in the system', 'PRE_COLLAPSE');

-- Post-Collapse Cat (Present Day)
INSERT INTO character_location_contexts (..., demeanor_description, temporal_context)
VALUES (..., 'Skeptical, guarded, trust earned through action', 'POST_COLLAPSE');
```

**Visual Impact:** AI can generate different expressions, body language, and visual mood based on temporal context and emotional state.

#### Demeanor Description Guidelines

**Good demeanor descriptions include:**
- **Emotional state:** Alert, determined, vulnerable, guarded
- **Body language cues:** Tense shoulders, relaxed stance, protective posture
- **Facial expression:** Focused, skeptical, conflicted, compassionate
- **Interaction style:** Commanding presence, withdrawn, collaborative

**Poor demeanor descriptions:**
- "Happy" - too simple
- "Wearing tactical gear" - that's clothing, not demeanor
- "Protagonist" - that's a role, not emotional state

---

## Location Visual Descriptions

### 6. Location Arcs (Environmental Context)

**Table:** `location_arcs`
**Required Field:** `visual_description`

**Finding:** In "Cat & Daniel," 100% of locations (9/9) have visual descriptions. This is EXCELLENT.

#### Visual Description Guidelines

**Good Example:**
```
A sprawling CDC archive and data center, now a ghost town of sterile server
rooms and data storage units. Emergency lights cast long shadows down silent
corridors, with abandoned computer terminals and data drives hinting at the
chaos of its evacuation.
```

**Why it works:**
- **Specific details:** Server rooms, data storage, computer terminals
- **Lighting description:** Emergency lights, long shadows
- **Atmospheric elements:** Ghost town, silent corridors, chaos hints
- **Emotional tone:** Abandonment, evacuation chaos

#### What to Include

1. **Physical Structure:**
   - Size/scale (sprawling, cramped, vast, intimate)
   - Architecture (modern, industrial, makeshift, ornate)
   - Key features (server racks, medical equipment, tactical gear)

2. **Lighting:**
   - Source (emergency lights, natural light, artificial, firelight)
   - Quality (harsh, soft, flickering, dim)
   - Shadows and contrast

3. **Atmosphere:**
   - Mood (eerie, clinical, tense, safe)
   - Sensory details (dust in air, sterile smell, distant sounds)
   - Emotional resonance (abandoned, lived-in, threatening, sanctuary)

4. **Narrative Context:**
   - Purpose (archive, medical facility, safehouse, battlefield)
   - Current state (operational, abandoned, damaged, repurposed)
   - Story significance (where key events happen)

---

## Continuous Improvement Process

### As You Discover What Works

Since this is the **first integration** of StoryTeller and StoryArt, we're learning as we go.

**Please document:**

1. **What Produced Great Images:**
   - Which thematic elements translated well visually?
   - Which character demeanor descriptions created compelling expressions?
   - Which location descriptions captured the right mood?

2. **What Didn't Work:**
   - Which themes were too abstract?
   - Which tone guidance was too vague?
   - Which descriptions confused the AI?

3. **Unexpected Successes:**
   - Surprising visual elements that enhanced images
   - Thematic connections that created compelling compositions
   - Character dynamics that showed well visually

4. **Data Gaps:**
   - What story intelligence would have helped but didn't exist?
   - What context was missing that could improve future stories?

### Feedback Mechanism

Create a `story-quality-feedback.md` document for each story:

```markdown
# Story Quality Feedback: [Story Name]

## What Worked Well
- [Specific example with explanation]

## What Didn't Work
- [Specific example with explanation]

## Surprising Discoveries
- [Unexpected results]

## Recommendations for Future Stories
- [Actionable improvements]
```

---

## Validation Checklist

Before considering story intelligence data "complete," verify:

### Story Level
- [ ] story_context is 300-700 characters
- [ ] story_context includes world context, relationship framework, emotional guidance
- [ ] narrative_tone is 150-350 characters
- [ ] narrative_tone balances atmosphere, authenticity, and visual mood
- [ ] core_themes includes opposing themes, action-oriented themes, metaphorical depth
- [ ] core_themes is 150-300 characters with 5-7 distinct themes

### Plot Arc Level
- [ ] All arcs have activation_episode (or NULL with justification)
- [ ] All arcs have peak_episode (or NULL with justification)
- [ ] All arcs have resolution_episode
- [ ] Episode numbers are logical (activation < peak < resolution)

### Character Level
- [ ] Key characters have multiple location_contexts (showing evolution)
- [ ] demeanor_description includes emotional state and body language
- [ ] temporal_context is used to show character at different time periods
- [ ] At least 2 contexts per major character (before/after or different emotional states)

### Location Level
- [ ] All significant locations have visual_description
- [ ] visual_description is 100-300 characters
- [ ] visual_description includes physical structure, lighting, atmosphere, narrative context
- [ ] Locations tied to major scenes have detailed descriptions

---

## Example: Quality Comparison

### Low Quality Story Intelligence

```
Story Context: "A sci-fi story about space exploration."
Narrative Tone: "Exciting and dramatic."
Core Themes: "Courage, discovery, friendship."
```

**Problems:**
- Too vague and generic
- No specific visual guidance
- Single-word themes
- No world-building depth

**AI Impact:** Generates generic sci-fi images with no narrative specificity or emotional depth.

### High Quality Story Intelligence

```
Story Context: "Colonial expansion meets first contact in a frontier where
human desperation clashes with alien territorial sovereignty. Exploration
crews operate under corporate mandate but personal ethics, creating tension
between discovery for profit and respect for intelligent life. Trust is
fragile, communication is imperfect, and every encounter could spark war
or forge alliance."

Narrative Tone: "Maintain wonder tinged with unease - the vastness of space
creates isolation and vulnerability. Balance hard sci-fi technical authenticity
with human emotional responses to the unknown. Dialogue shifts from clinical
jargon during crisis to philosophical reflection in quiet moments."

Core Themes: "Discovery at what cost, corporate mandate vs. personal ethics,
communication across unbridgeable divides, the loneliness of frontier life,
first contact as mirror to humanity's flaws, sovereignty of intelligent life,
wonder tempered by responsibility."
```

**Strengths:**
- Specific world context (colonial expansion, corporate mandate)
- Opposing themes creating tension (discovery vs. cost, mandate vs. ethics)
- Tonal balance guidance (wonder tinged with unease)
- Visual implications (isolation, frontier, technical authenticity)
- Character guidance (corporate vs. personal ethics creates internal conflict)

**AI Impact:** Generates images that capture narrative themes - isolation in vast spaces, technical authenticity in equipment/settings, moral complexity in character expressions, specific world-building details.

---

## Summary: The Golden Rules

1. **Be Specific, Not Generic:** "post-collapse medical dystopia" > "dystopia"
2. **Create Visual Tension:** Opposing themes create dramatic compositions
3. **Action Over Abstraction:** "redemption through action" > "redemption"
4. **Context Creates Depth:** 300-700 chars of story_context > 50 chars
5. **Track Evolution:** Multiple character contexts > single description
6. **Light the Scene:** Always describe lighting in locations
7. **Oppose and Balance:** duty vs. desire, action vs. quiet, tension vs. relief
8. **Ground the Fantastic:** Realism in dystopia, authenticity in sci-fi

**Remember:** This is an evolving process. Your observations and feedback will improve these guidelines for all future stories.

---

**Last Updated:** 2025-11-26
**Based On:** Cat & Daniel: Collapse Protocol analysis
**Status:** Living Document - Continuous Improvement
**Feedback To:** [Story Team / StoryArt Development]
