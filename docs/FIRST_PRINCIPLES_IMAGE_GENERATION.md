# First Principles: Image Generation in StoryArt

**Date**: 2025-11-24  
**Status**: Foundation Document - Vision Alignment  
**Purpose**: Deconstruct the image generation process from first principles to align with vision

---

## Core Question: What Is Image Generation For?

### The Fundamental Purpose

**What is StoryArt trying to achieve with image generation?**

This is the foundational question. Before we can fix anything, we need to understand:
- What makes an image "correct"?
- What makes an image "good"?
- What is the relationship between the story/narrative and the visual output?

---

## First Principles Framework

### Principle 1: Source of Truth

**Question**: What is the authoritative source for visual decisions?

**Current State**:
- Episode context (characters, locations, story)
- Beat analysis (narrative, action, visual anchors)
- Style config (model, aspect ratios)
- AI system instructions (how to interpret the above)

**What Should Be True**:
- [ ] **What is the hierarchy of authority?** (e.g., beat narrative > location context > style defaults)
- [ ] **Who/what makes final visual decisions?** (AI interpreting instructions? Pre-processed data? Human curation?)
- [ ] **What can be overridden and by what?** (location overrides? character overrides? narrative overrides?)

**Vision Question**: In your vision, what should be the ultimate source of truth for:
- Character appearance?
- Location visuals?
- Lighting?
- Composition?
- Negative prompts?

---

### Principle 2: The Generation Pipeline

**Question**: What is the actual flow of data from input to image?

**Current Flow** (as I understand it):
```
1. Episode Context (manual or database)
   ↓
2. Beat Analysis (AI analyzes script)
   ↓
3. Prompt Generation (AI creates SwarmUI prompts)
   ↓
4. Image Generation (SwarmUI creates images)
   ↓
5. Output (images displayed/saved)
```

**What Should Be True**:
- [ ] **Is this the correct flow?** Should steps be added/removed/reordered?
- [ ] **Where should decisions be made?** (pre-processing? AI interpretation? post-processing?)
- [ ] **What should be deterministic vs. AI-interpreted?** (e.g., negative prompts should be deterministic, but lighting might be AI-interpreted?)

**Vision Question**: In your vision:
- Should the AI be making creative decisions, or just following rules?
- Should certain elements be pre-processed before AI sees them?
- Where should human curation/override points be?

---

### Principle 3: Quality Definition

**Question**: What does "good image quality" actually mean?

**Current Understanding** (from docs):
- No artifacts (extra limbs, distorted faces)
- Correct style (not cartoon/anime)
- Accurate to narrative (lighting matches beat, characters match descriptions)
- Location-appropriate visuals (damaged areas look damaged, server rooms look pristine)

**What Should Be True**:
- [ ] **Is this the complete definition?** What else matters?
- [ ] **What is the priority?** (e.g., narrative accuracy > style > technical quality?)
- [ ] **What are acceptable trade-offs?** (e.g., slightly less accurate if it's more visually compelling?)

**Vision Question**: In your vision:
- What makes an image "right" for the story?
- What makes an image "wrong"?
- Is there a hierarchy of quality criteria?

---

### Principle 4: Control vs. Automation

**Question**: What should be automated vs. what should be controlled?

**Current State**:
- AI interprets everything (prompts, lighting, composition)
- Some pre-processing (LORA trigger substitution)
- Some post-processing (steps/cfgscale correction)
- Location overrides exist but may not be used

**What Should Be True**:
- [ ] **What should be hardcoded/rules-based?** (negative prompts? character descriptions? location visuals?)
- [ ] **What should be AI-interpreted?** (composition? lighting adaptation? narrative translation?)
- [ ] **What should be configurable?** (per-story? per-location? per-character?)

**Vision Question**: In your vision:
- Should the system be more like a "rule engine" that follows strict guidelines?
- Or more like a "creative AI" that interprets and adapts?
- Or a hybrid where certain things are strict and others are flexible?

---

### Principle 5: Negative Prompts - Purpose and Application

**Question**: What is the true purpose of negative prompts?

**Current Understanding**:
- Prevent unwanted elements (artifacts, wrong styles)
- Enforce visual tone (not cheerful, not fantasy)
- Location-specific requirements (varies by area)

**What Should Be True**:
- [ ] **Are negative prompts about prevention or correction?** (prevent bad images, or correct AI mistakes?)
- [ ] **Should they be static or dynamic?** (same for all images, or vary by context?)
- [ ] **What is their relationship to positive prompts?** (complement? override? filter?)

**Vision Question**: In your vision:
- What is the negative prompt actually doing? (preventing errors? enforcing style? correcting AI?)
- Should negative prompts be part of the "source of truth" or just a technical tool?

---

### Principle 6: Lighting - Extraction vs. Interpretation

**Question**: How should lighting be determined?

**Current State**:
- Beat narrative may contain lighting details
- Location context may have lighting atmosphere
- AI is instructed to extract lighting from beat narrative
- Service exists (`beatNarrativeProcessor.ts`) but isn't used

**What Should Be True**:
- [ ] **Should lighting be extracted (deterministic) or interpreted (AI)?**
- [ ] **What is the hierarchy?** (beat narrative > location context > style defaults?)
- [ ] **Should lighting be pre-processed or AI-interpreted?**

**Vision Question**: In your vision:
- Should lighting be a "fact" extracted from the narrative (like character names)?
- Or should it be a "creative interpretation" by the AI?
- What happens when beat narrative has no lighting details?

---

### Principle 7: Location Context - Static vs. Dynamic

**Question**: How should location visuals be determined?

**Current State**:
- Location descriptions in episode context
- Location attributes in beat analysis
- Location-specific overrides exist
- Location-specific negative prompts documented but not implemented

**What Should Be True**:
- [ ] **Should locations be static descriptions or dynamic interpretations?**
- [ ] **How should location anomalies be handled?** (NHIA Facility 7 has 3 distinct areas)
- [ ] **What is the relationship between location and negative prompts?**

**Vision Question**: In your vision:
- Should locations be "database facts" that are always true?
- Or should they be "narrative context" that adapts to the story?
- How should conflicting location requirements be resolved?

---

## Vision Alignment Questions

### For You to Consider:

1. **What is the core purpose of StoryArt's image generation?**
   - Is it to visualize a story accurately?
   - Is it to create compelling marketing visuals?
   - Is it to support long-form narrative?
   - Is it all of the above with different modes?

2. **What should be "true" vs. "interpreted"?**
   - Character appearance: fact or interpretation?
   - Location visuals: fact or interpretation?
   - Lighting: fact or interpretation?
   - Composition: fact or interpretation?

3. **What is the role of AI in this system?**
   - Is AI a "translator" (converting narrative to visual language)?
   - Is AI a "creative partner" (making artistic decisions)?
   - Is AI a "rule follower" (applying strict guidelines)?
   - Is AI a "hybrid" (strict for some things, creative for others)?

4. **What should be pre-processed vs. AI-interpreted?**
   - Should negative prompts be pre-determined (rules-based)?
   - Should lighting be pre-extracted (deterministic)?
   - Should character descriptions be pre-formatted (templates)?
   - Or should AI interpret all of this?

5. **What is the relationship between "correct" and "good"?**
   - Is a technically correct image always good?
   - Is a visually compelling image always correct?
   - What happens when they conflict?

---

## Current State vs. Vision

### What I Think Is Currently True:

1. **System Instructions Drive Everything**
   - AI reads system instructions and interprets them
   - AI makes decisions based on instructions
   - Post-processing corrects some AI mistakes

2. **Mixed Control Model**
   - Some things are pre-processed (LORA triggers)
   - Some things are AI-interpreted (lighting, composition)
   - Some things are post-corrected (steps, cfgscale)

3. **Documentation Exists But Code Doesn't Match**
   - Standards documented in multiple places
   - Services exist but aren't integrated
   - Vision described but implementation incomplete

### What Should Be True (Your Vision):

**This is what we need to discover together.**

---

## Next Steps: Vision Discovery

### Step 1: Answer the Core Questions
- What is image generation for?
- What makes an image "correct"?
- What makes an image "good"?

### Step 2: Define the Hierarchy
- What is the source of truth?
- What can override what?
- What is deterministic vs. interpreted?

### Step 3: Design the Pipeline
- What should be pre-processed?
- What should be AI-interpreted?
- What should be post-corrected?

### Step 4: Implement to Vision
- Build the system that matches your vision
- Not just fixing what's broken
- But creating what should be

---

## Questions for You

1. **What is your vision for StoryArt's image generation?**
   - What should it feel like to use?
   - What should the output be like?
   - What should the process be like?

2. **What is "correct" in your vision?**
   - Is it narrative accuracy?
   - Is it visual quality?
   - Is it consistency?
   - Is it something else?

3. **What role should AI play?**
   - Strict rule follower?
   - Creative interpreter?
   - Hybrid?

4. **What should be automated vs. controlled?**
   - What should be hardcoded?
   - What should be configurable?
   - What should be AI-interpreted?

---

**This document is a starting point for understanding your vision. Let's work through these questions together to build the system that matches what you envision.**

