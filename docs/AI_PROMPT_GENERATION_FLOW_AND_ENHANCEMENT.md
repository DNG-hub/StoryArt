# AI Prompt Generation: Current Flow and Enhancement Proposal

## Current AI-Driven Prompt Generation Flow

### Input Sources

```
1. BEAT ANALYSIS (Episode Script)
   - Core action
   - Character positions
   - Visual anchor
   - Location attributes
   - Style guide (camera, lighting, atmosphere, environment FX)

2. EPISODE CONTEXT JSON
   - Characters (base trigger, visual description)
   - Locations (name, attributes)
   - Scene metadata

3. STYLE CONFIG
   - Model (flux1-dev-fp8)
   - Aspect ratios (16:9, 9:16)
   - Global aesthetic rules
```

### Manipulation Before AI (promptGenerationService.ts)

**Step 1: Context Enhancement**
```typescript
// Checks if database mode is active
if (retrievalMode === 'database' && storyId) {
  // Fetches enhanced context from database:
  // - Location visual_description
  // - Location artifacts with SwarmUI prompt fragments
  // - Character location_context with swarmui_prompt_override
  // - Tactical overrides
}
```

**Step 2: Beat Processing**
```typescript
// Filters beats marked for image generation
const beatsForPrompting = scenes.flatMap(scene =>
  scene.beats.filter(beat => beat.imageDecision.type === 'NEW_IMAGE')
);

// Batches beats (20 at a time to avoid token limits)
```

**Step 3: System Instruction Assembly** (The Key Part!)
```typescript
const systemInstruction = `
You are an expert Virtual Cinematographer and Visual Translator.

PRODUCTION STANDARDS (Based on 135 tested prompts):
1. Facial Expressions INSTEAD of heavy camera direction
2. Atmosphere-Specific Face Lighting (always include)
3. YOLO Face Segments for precise control
4. Character Physique Emphasis (lean athletic build)
5. FLUX-Specific Settings (cfgscale: 1, fluxguidancescale: 3.5)

CONTENT RULES:
1. NO NARRATIVE NAMES (unless swarmui_prompt_override exists)
2. NO LOCATION NAMES (use visual_description)
3. MUST use base_trigger (JRUMLV woman, HSCEIA man)
4. MUST include location artifacts from database

WORKFLOW FOR EACH BEAT:
1. Deconstruct style guide (camera, lighting, environmentFX, atmosphere)
2. Synthesize characters:
   - Check for swarmui_prompt_override (HIGHEST PRIORITY)
   - If override exists: use it EXACTLY as written
   - If no override: use base_trigger + visual descriptors
3. Synthesize environment:
   - Use location visual_description (CRITICAL)
   - Include artifacts swarmui_prompt_fragment (CRITICAL)
   - Apply locationAttributes from beat
4. Compose shot with NEW PRODUCTION STANDARDS:
   - Start with shot type ("medium shot of a")
   - Include facial expression after character description
   - Apply atmosphere-specific lighting
   - Add YOLO face segments
5. Generate both cinematic (16:9) AND vertical (9:16) prompts
`;
```

### AI Processing (Gemini)

**Step 4: Send to Gemini 2.5 Flash**
```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `
    Generate SwarmUI prompts for the following beat analyses,
    using the provided Episode Context for character details
    and the Style Config for aesthetic guidance.

    ---BEAT ANALYSES---
    ${JSON.stringify(beatsWithStyleGuide, null, 2)}

    ---EPISODE CONTEXT JSON (Source: ${contextSource})---
    ${enhancedContextJson}

    ---EPISODE STYLE CONFIG---
    ${JSON.stringify(styleConfig, null, 2)}
  `,
  config: {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: responseSchema,
    temperature: 0.2
  }
});
```

**Step 5: AI Returns Structured JSON**
```json
[
  {
    "beatId": "s1-b1",
    "cinematic": {
      "prompt": "medium shot of a JRUMLV woman (...), alert expression on her face, moving through bombed-out facility...",
      "model": "flux1-dev-fp8",
      "width": 1344,
      "height": 768,
      "cfgscale": 1,
      "fluxguidancescale": 3.5
    },
    "vertical": {
      "prompt": "medium shot of a JRUMLV woman (...), alert expression on her face, moving through bombed-out facility...",
      "model": "flux1-dev-fp8",
      "width": 1088,
      "height": 1920,
      "cfgscale": 1,
      "fluxguidancescale": 3.5
    },
    "marketingVertical": {
      // Similar but optimized for marketing hooks
    }
  }
]
```

**Step 6: LoRA Trigger Substitution**
```typescript
// Post-processing to ensure trigger words are correct
applyLoraTriggerSubstitution(beatPrompts);
```

---

## What Makes It Work Well

### 1. Highly Detailed System Instructions
The 135-prompt production standard teaches AI:
- Exact syntax ("medium shot of a JRUMLV woman")
- When to use overrides vs. base triggers
- Character physique descriptors to prevent bulky rendering
- Lighting schemes per atmosphere type
- YOLO segment placement

### 2. Structured JSON Schema
AI must return exact schema - no freeform hallucination

### 3. Low Temperature (0.2)
Minimal creativity, maximum adherence to instructions

### 4. Beat-Level Granularity
Each beat gets individual attention with style guide

---

## Current Limitations

### Beat-Level Context Only
- AI sees: **Individual beat + immediate scene context**
- AI does NOT see:
  - Full episode arc
  - Story themes
  - Character development trajectory
  - Emotional progression across scenes
  - Marketing hook opportunities across episode

### Missing Big-Picture Information

**Currently NOT sent to AI:**

1. **Episode-Level Story Arc**
   - Episode theme
   - Central conflict
   - Emotional journey
   - Key revelations/twists
   - Climax structure

2. **Character Arc Context**
   - Where character is in development
   - Emotional state progression
   - Relationship dynamics
   - Inner conflict visualization

3. **Series-Wide Context**
   - Overarching plot threads
   - Recurring visual motifs
   - Thematic consistency
   - Marketing positioning

4. **Marketing Intelligence**
   - Most viral-worthy moments
   - Hook potential per beat
   - Audience engagement patterns
   - Platform-specific optimization

---

## Enhancement Proposal: Episode-Wide Context Integration

### Available Big-Picture Data (From StoryTeller Database)

**REALITY CHECK: Story intelligence exists but is DISTRIBUTED across tables, not centralized.**

```sql
-- stories table (Story-Level Intelligence)
stories:
  - story_context (TEXT) - Overarching themes and dynamics
  - narrative_tone (TEXT) - Narrative tone and style
  - core_themes (TEXT) - Core thematic elements
  - current_episode_number (INTEGER)
  - total_episodes (INTEGER)
  - planned_ending (TEXT)
  - series_conclusion (TEXT)
  - character_final_states (TEXT)
  - thematic_resolution (TEXT)
  - ai_guidance (TEXT)

-- plot_arcs table (Plot Intelligence)
plot_arcs:
  - arc_number (INTEGER)
  - type (VARCHAR) - Default: "NARRATIVE"
  - arc_hierarchy (VARCHAR) - "primary" or subplot
  - activation_episode (INTEGER) - When arc begins
  - peak_episode (INTEGER) - When arc reaches max intensity
  - resolution_episode (INTEGER) - When arc resolves
  - resolution_goal (TEXT)
  - climax_description (TEXT)
  - ending_state (TEXT)
  - character_destinations (TEXT)
  - thematic_payoff (TEXT)
  - key_characters (TEXT)
  - relationship_dynamics (TEXT)
  - progression_type (VARCHAR)
  - cross_arc_impact (TEXT)
  - parent_arc_id (UUID) - For subplot hierarchy

-- characters table (Character Development Intelligence)
characters:
  - description (TEXT)
  - backstory (TEXT)
  - role (VARCHAR)
  - supernatural_influence_level (INTEGER) - 0-10 scale (PROGRESSION TRACKING)
  - revenge_programming_resistance (INTEGER) - 0-10 scale (PROGRESSION TRACKING)
  - humanity_choice_evolution (JSONB) - Character agency development
  - enhancement_motivations (JSONB)
  - supernatural_conflicts (VARCHAR[])
  - ghost_enhancement_status (VARCHAR)

-- character_location_contexts table (Character Emotional States)
character_location_contexts:
  - temporal_context (VARCHAR) - PRE_COLLAPSE, POST_COLLAPSE, DREAM_SEQUENCE, FLASHBACK
  - age_at_context (INTEGER)
  - physical_description (TEXT)
  - clothing_description (TEXT)
  - demeanor_description (TEXT) - Emotional/psychological state
  - swarmui_prompt_override (TEXT)
  - lora_weight_adjustment (FLOAT)

-- ghost_entity_relationships table (Emotional/Supernatural Intelligence)
ghost_entity_relationships:
  - entity_name (VARCHAR)
  - relationship_type (VARCHAR) - enhanced, protected, influenced, rejected
  - enhancement_level (INTEGER) - 0-10 scale
  - protection_investment (JSONB)
  - revenge_agenda_alignment (VARCHAR) - aligned, conflicted, rejected
  - communication_method (VARCHAR)
  - influence_notes (TEXT)

-- character_relationships table
character_relationships:
  - relationship_type (VARCHAR)
  - description (TEXT)

-- location_arcs table (Location Intelligence)
location_arcs:
  - name (VARCHAR)
  - description (TEXT)
  - location_type (VARCHAR) - SPECIFIC, GENERAL, CONTEXT
  - atmosphere_category (VARCHAR)
  - visual_description (TEXT)
  - atmosphere (TEXT)
  - geographical_location (VARCHAR)
  - time_period (VARCHAR)
  - cultural_context (VARCHAR)
  - key_features (TEXT) - JSON array
  - significance_level (VARCHAR)

-- location_artifacts table (Visual Elements)
location_artifacts:
  - artifact_name (VARCHAR)
  - artifact_type (VARCHAR) - KEY_ITEM, FORESHADOWING, CLUE, WEAPON, etc.
  - description (TEXT)
  - always_present (BOOLEAN)
  - scene_specific (BOOLEAN)
  - swarmui_prompt_fragment (TEXT) - For image generation
```

**KEY GAP IDENTIFIED:**
- NO dedicated `episodes` table (episodes are implicit, referenced via episode_number)
- NO explicit episode-level metadata (theme, central conflict, emotional arc)
- NO episode-level snapshots of character states (character progression exists but not tied to specific episodes)
- Emotional state data is IMPLICIT in descriptions, not explicitly tracked per episode

### Proposed Enhanced Context Structure

```typescript
interface EnhancedEpisodeContext {
  // EXISTING (what we have now)
  episode: {
    episodeNumber: number;
    title: string;
    scenes: SceneContext[];
    characters: CharacterContext[];
  };

  // NEW: Big-Picture Story Intelligence
  storyArc: {
    overarchingNarrative: string;  // The whole series story
    currentPlotThreads: string[];  // Active plot threads in this episode
    thematicFocus: string[];       // Core themes
    keySymbols: string[];          // Recurring visual motifs
    narrativeTone: string;         // Overall tone/mood
  };

  // NEW: Episode-Level Arc
  episodeArc: {
    theme: string;                 // This episode's theme
    centralConflict: string;       // Main conflict
    emotionalJourney: string;      // Emotional progression
    keyRevelations: string[];      // Major revelations
    climaxMoment: string;          // Where the climax occurs
  };

  // NEW: Character Development Context
  characterArcs: {
    [characterName: string]: {
      arcType: string;             // e.g., "redemption", "fall from grace"
      arcStatus: string;           // "setup", "rising", "climax", "resolution"
      emotionalState: string;      // Current emotional state
      relationshipDynamics: {      // With other characters
        [otherChar: string]: string;
      };
      keyMoments: string[];        // Critical moments in this episode
    };
  };

  // NEW: Marketing Intelligence
  marketingContext: {
    viralPotential: {
      [beatId: string]: number;    // 1-10 viral score per beat
    };
    hookOpportunities: {
      [beatId: string]: {
        type: string;              // "twist", "action", "emotional", "supernatural"
        suggestion: string;        // Marketing angle
      };
    };
    platformOptimization: {
      youtube: {                   // YouTube-specific guidance
        thumbnailMoments: string[];
        titleHooks: string[];
      };
      tiktok: {                    // TikTok-specific guidance
        hookMoments: string[];
        trendAlignment: string[];
      };
    };
  };
}
```

### Enhanced System Instruction

```typescript
const systemInstruction = `
You are an expert Virtual Cinematographer and Visual Translator.

[...existing production standards...]

EPISODE-WIDE STORY CONTEXT (NEW!):

You now have access to comprehensive story intelligence:

1. OVERARCHING NARRATIVE:
   ${storyArc.overarchingNarrative}

2. EPISODE THEME:
   ${episodeArc.theme}
   Central Conflict: ${episodeArc.centralConflict}
   Emotional Journey: ${episodeArc.emotionalJourney}

3. CHARACTER ARCS IN THIS EPISODE:
   ${Object.entries(characterArcs).map(([name, arc]) => `
   - ${name}: ${arc.arcType} (${arc.arcStatus})
     Emotional State: ${arc.emotionalState}
     Key Moments: ${arc.keyMoments.join(', ')}
   `).join('\n')}

4. ACTIVE PLOT THREADS:
   ${storyArc.currentPlotThreads.join(', ')}

5. THEMATIC VISUAL MOTIFS:
   ${storyArc.keySymbols.join(', ')}

USE THIS CONTEXT TO:
- Align visual composition with character emotional state
- Emphasize moments that advance plot threads
- Incorporate thematic symbols when appropriate
- Heighten tension at climax moments
- Create visual consistency across episode arc

MARKETING OPTIMIZATION:
For beats marked with high viral potential, emphasize:
- Compositional drama (Rule of thirds, leading lines)
- Emotional intensity in facial expressions
- Action dynamism
- Thumbnail-worthy framing (when marked)

[...rest of existing instructions...]
`;
```

### Implementation Strategy

**Phase 1: Data Aggregation Service**
```typescript
// services/episodeIntelligenceService.ts
export async function gatherEpisodeIntelligence(
  storyId: string,
  episodeNumber: number
): Promise<EnhancedEpisodeContext> {
  // Query database for:
  // - Story intelligence
  // - Plot arcs active in this episode
  // - Character arcs
  // - Episode metadata
  // - Marketing annotations

  return comprehensiveContext;
}
```

**Phase 2: Context Injection**
```typescript
// Modify promptGenerationService.ts
const episodeIntelligence = await gatherEpisodeIntelligence(storyId, episodeNumber);

const enhancedSystemInstruction = buildSystemInstructionWithIntelligence(
  baseSystemInstruction,
  episodeIntelligence
);
```

**Phase 3: Marketing Layer (Optional)**
```typescript
// services/marketingIntelligenceService.ts
export async function analyzeViralPotential(
  beats: Beat[],
  episodeContext: EnhancedEpisodeContext
): Promise<MarketingContext> {
  // AI analyzes beats for:
  // - Emotional peaks
  // - Visual drama
  // - Plot revelations
  // - Action intensity

  // Returns viral scores + marketing suggestions
}
```

---

## Benefits of Enhancement

### For Image Quality
1. **Emotional Consistency**: AI knows character emotional state → better facial expressions
2. **Thematic Coherence**: Recurring symbols/motifs appear when narratively appropriate
3. **Arc-Aware Composition**: Tension builds visually toward climax
4. **Character Development Visualization**: Visual cues match character arc progression

### For Marketing
1. **Strategic Emphasis**: High-viral moments get compositional priority
2. **Hook Identification**: AI knows which moments work for marketing verticals
3. **Platform Optimization**: Different framing for TikTok vs. YouTube Shorts
4. **Thumbnail Intelligence**: Specific beats marked for thumbnail potential

### For Narrative Storytelling
1. **Long-Form Coherence**: Visual language consistent across episode
2. **Plot Thread Visualization**: Active threads get visual representation
3. **Revelation Emphasis**: Key revelations get dramatic visual treatment
4. **Relationship Dynamics**: Character positioning reflects relationships

---

## Example: Before vs. After

### BEFORE (Beat-Level Context Only)

**AI Sees:**
```json
{
  "beat": "Cat discovers the anomaly in the blast pattern",
  "location": "bombed facility",
  "characters": ["Cat"],
  "styleGuide": {
    "lighting": "dramatic",
    "camera": "medium shot"
  }
}
```

**AI Generates:**
```
medium shot of a JRUMLV woman, alert expression, examining debris in bombed facility
```

### AFTER (Episode-Wide Context)

**AI Sees:**
```json
{
  "beat": "Cat discovers the anomaly in the blast pattern",
  "location": "bombed facility",
  "characters": ["Cat"],
  "styleGuide": { "lighting": "dramatic", "camera": "medium shot" },

  "episodeContext": {
    "theme": "Truth vs. Official Narrative",
    "catArc": {
      "emotionalState": "Skeptical determination - first doubt of official story",
      "arcMoment": "Discovery - inciting incident of personal investigation"
    },
    "plotThread": "Government Conspiracy - First Evidence",
    "viralPotential": 9,
    "marketingHook": "The physics don't lie - this was no terrorist attack"
  }
}
```

**AI Generates:**
```
medium shot of a JRUMLV woman, concentrated skeptical expression with dawning
realization on her face, kneeling in blast crater examining twisted steel rebar
with high-tech scanner emitting blue laser grid. Scanner's readout showing
anomalous energy signature contradicting official narrative. Intense focus in her
eyes, slight furrowing of brow suggesting internal conflict between data and
authority. Grime-streaked face, dust particles illuminated in air by scanner light.
Dramatic tactical lighting on face, high contrast face shadows emphasizing moment
of discovery. Volumetric dust creating shafts of light. Composition: Rule of thirds
with Cat's face and scanner readout as focal points. Desaturated color grade with
scanner's blue light as only color accent.
```

**Result**: Far more compelling, narratively rich, marketing-ready image that visualizes the theme and emotional beat.

---

## Next Steps

1. **Review Available Data**: Verify what story intelligence exists in StoryTeller database
2. **Decide on Scope**: Full implementation vs. phased approach?
3. **Marketing Integration**: Do we want automated viral potential analysis?
4. **Testing Strategy**: A/B test enhanced vs. standard prompts
5. **Documentation**: Update system instructions with new context patterns

Would you like me to implement this enhancement?
