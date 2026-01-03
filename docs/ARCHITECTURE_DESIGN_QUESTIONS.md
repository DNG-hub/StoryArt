# Architecture Design Questions

**Date**: 2025-11-24  
**Status**: Discovery Phase  
**Purpose**: Guide iterative architecture design based on your vision

---

## Immediate Questions for Architecture Design

### 1. Vertical Format Deep Dive

**Your Statement**: "the issue with the current vertical format is that the characters are good but the location details are minimal, the only place to furnish location details is at the top and bottom of the image and that takes more imagination than we expend right now."

**Questions**:
- What specific location details are you seeing missing? (e.g., background elements, environmental context, set dressing?)
- When you say "top and bottom of the image" - do you mean the vertical frame's top/bottom edges?
- What kind of "imagination" is needed? (AI creative interpretation? More detailed prompts? Different composition techniques?)
- Have you seen examples where vertical format location details worked well? What made them work?

**Your Statement**: "Also the character poses are constrained, I would like more varity in the position and pose while maintaining that verticle constraint"

**Questions**:
- What poses are you currently seeing? (mostly standing? facing camera?)
- What variety do you want? (crouching, action poses, different angles, different positions in frame?)
- Are there specific poses that work better for vertical format that we should prioritize?

**Your Statement**: "this too requires imagination and detailed knowledge about how flux generates images in the verticle format. We may haveto stray into using Comfyui Solo as an alternative"

**Questions**:
- What do you know about how FLUX handles vertical format? (any specific patterns or behaviors?)
- Have you tested ComfyUI Solo? What advantages does it offer?
- Would ComfyUI Solo replace the current system or work alongside it?

---

### 2. Marketing Hooks System

**Your Statement**: "for marketing images they must be able to produce evocative and compleling hooks to drive traffick to the long form story., I have not yet created the narratives that would drive that type of images."

**Questions**:
- What makes an image a "hook" in your vision? (emotional impact? action? mystery? character focus?)
- Should marketing images be:
  - Beat-based (one image per beat)?
  - Episode-based (one image per episode)?
  - Scene-based (one image per scene)?
  - Custom (selected moments)?
- What emotions/actions drive traffic in your experience? (suspense? action? character moments?)
- Should marketing images always include characters, or can they be location/environment focused?

**Your Statement**: "the ai mustr determine of the inclusion of the character is important for the hook of the image."

**Questions**:
- What factors should the AI consider? (beat emotion? action? narrative importance?)
- Should this be a separate "marketing agent" that analyzes beats for hook potential?
- Should there be a human review step for marketing images?

---

### 3. Agency Architecture

**Your Statement**: "I imagen there wll beindividual agent for keeping table on all the aspects and the "CEO" organizing who works on what and when"

**Questions**:
- What specific agents do you envision? For example:
  - Lighting Agent (extracts/interprets lighting from narrative)?
  - Composition Agent (determines shot type, framing)?
  - Character Agent (handles character appearance, poses)?
  - Location Agent (handles location visuals, details)?
  - Marketing Agent (determines hooks, marketing composition)?
  - Negative Prompt Agent (handles location-specific negative prompts)?
- How should agents communicate? 
  - Shared context object?
  - Message passing?
  - Sequential processing with handoffs?
- What should the "CEO" agent do?
  - Coordinate agent order?
  - Resolve conflicts?
  - Make final decisions?
  - Delegate to human when needed?

**Your Statement**: "the ai would most like be formed into an agency so that the nuance is focused in particular jobs"

**Questions**:
- Should each agent be a separate AI call, or can agents share a single AI with different system instructions?
- Should agents be specialized models or the same model with different roles?
- How should agent outputs be combined? (sequential? parallel with coordination?)

---

### 4. Context Analysis

**Your Statement**: "It conveys the emotion or action in the beat, it may best be communicated by examining the predeccessor and next beats for the fullest understanding of the context"

**Questions**:
- How many predecessor/next beats should be examined? (1? 2? all in scene?)
- What context should be extracted? (emotion? action? visual continuity? narrative flow?)
- Should this be a separate "Context Agent" or part of each specialized agent?
- Should context analysis happen before or during prompt generation?

**Your Statement**: "All of the rules about the cscene are hardcoded into the narrative, the ai can be allowed access to the other rigid parts tha are the storytell database and the roadmap and the stoy bible."

**Questions**:
- What specific data from storyteller database should AI access? (character descriptions? location visuals? story themes?)
- What from the roadmap? (episode structure? scene purposes? narrative arcs?)
- What from the story bible? (world rules? character relationships? location hierarchies?)
- Should AI have full access or filtered/contextual access?

---

### 5. Hierarchy Discovery

**Your Statement**: "I do not know lets discover that in an iterative fashion"

**Questions**:
- Should we start with a simple hierarchy and test it?
  - Example: Beat Narrative > Location Context > Story Database > Defaults
- What conflicts have you seen that need resolution?
  - Example: Beat says "dark" but location says "bright emergency lights"
- Should there be different hierarchies for:
  - Storytelling vs. Marketing?
  - Cinematic vs. Vertical?
  - Character vs. Location vs. Lighting?

**Proposed Starting Hierarchy** (to test and iterate):
```
1. Beat Narrative (emotion, action, lighting details)
2. Scene Rules (hardcoded in narrative)
3. Location Context (visual facts + narrative interpretation)
4. Character Facts (LoRA, body shape, hair, clothing)
5. Story Database (story bible, roadmap, character relationships)
6. Style Defaults (model settings, composition defaults)
```

**Questions**:
- Does this feel right as a starting point?
- What should override what?
- Where should AI interpretation happen in this hierarchy?

---

### 6. Negative Prompts Hybrid Solution

**Your Statement**: "We need a hybrid solution as the recent prompt management details indicate" and "It is hybrid. I can't make so many rules to meat all examples of ambiguity"

**Questions**:
- What's the base negative prompt? (the standard one from docs?)
- When should location-specific rules apply? (always for NHIA Facility 7? other locations?)
- When should AI interpret/adapt negative prompts? (ambiguous cases? new locations?)
- Should there be a "Negative Prompt Agent" that:
  - Applies location-specific rules when clear?
  - Uses AI to interpret ambiguous cases?
  - Combines both approaches?

---

### 7. Lighting Interpretation

**Your Statement**: "there are rigid guidlines however the action taking place in a location dictates the lighting/ambiance that a strict rulle abut the location"

**Questions**:
- What are the rigid guidelines? (the ones in beatNarrativeProcessor.ts?)
- How should action override location lighting? (e.g., explosion in medical facility = explosion lighting, not medical lighting?)
- Should this be:
  - Action Agent analyzes action → determines lighting override?
  - Lighting Agent considers both location and action?
  - Sequential: location first, then action modifies?

---

## Proposed Next Steps

### Step 1: Answer These Questions
- Help me understand the specifics so I can design the architecture

### Step 2: Design Simple Starting Architecture
- Based on your answers, design a simple architecture
- Test with one beat/scene
- Iterate based on results

### Step 3: Build Incrementally
- Start with one agent (e.g., Lighting Agent)
- Add agents one at a time
- Test and refine

### Step 4: Discover Hierarchy Iteratively
- Start with proposed hierarchy
- Test with real beats
- Adjust based on conflicts/needs

---

**Which questions should we tackle first? Or would you prefer to start with a specific area (vertical format, marketing hooks, agency architecture)?**

