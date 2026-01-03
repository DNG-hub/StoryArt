# Format-Agnostic Qualitative AI Inputs

**Date**: 2025-11-24  
**Status**: Vision Clarification  
**Purpose**: Document that qualitative AI inputs apply equally to both wide and vertical formats

---

## Core Principle

**Qualitative AI inputs apply equally to both:**
- **Wide Format (16:9 Cinematic)**: Current existing format
- **Vertical Format (9:16)**: Long-form storytelling and marketing

---

## What Are "Qualitative AI Inputs"?

These are the nuanced, creative, AI-driven aspects of image generation:

### 1. **Agency Model**
- Specialized AI agents for different aspects
- "CEO" agent coordinating work
- Individual agents for lighting, composition, character, location, marketing
- **Applies to**: Both wide and vertical formats

### 2. **Context Analysis**
- Examining predecessor and next beats for fullest understanding
- Multi-beat emotional/action extraction
- Context-aware prompt generation
- **Applies to**: Both wide and vertical formats

### 3. **Creative Interpretation**
- Lighting interpretation (rigid guidelines + action-based)
- Composition decisions (shot type, framing, positioning)
- Character pose variety (within format constraints)
- Location visual interpretation (facts + narrative)
- **Applies to**: Both wide and vertical formats

### 4. **Purpose-Driven Generation**
- Storytelling mode: Narrative accuracy, emotion, action
- Marketing mode: Compelling hooks, traffic drivers
- Different rules and interpretations for each purpose
- **Applies to**: Both wide and vertical formats

### 5. **Hybrid Solutions**
- Negative prompts: Rules + AI interpretation
- Location visuals: Facts + narrative interpretation
- Lighting: Guidelines + action-based interpretation
- **Applies to**: Both wide and vertical formats

---

## Format-Specific Considerations

### Wide Format (16:9 Cinematic)
- **Full frame available**: Location details can be placed throughout frame
- **Horizontal composition**: Environmental storytelling emphasized
- **Same qualitative inputs**: Agency model, context analysis, creative interpretation
- **Current state**: May need improvement with qualitative AI inputs

### Vertical Format (9:16)
- **Restricted composition**: Location details at top/bottom of frame
- **Vertical emphasis**: Character-centric, top-to-bottom framing
- **Same qualitative inputs**: Agency model, context analysis, creative interpretation
- **Current issue**: Location details minimal, poses constrained
- **Solution needed**: More creative use of top/bottom frame, pose variety

---

## Architecture Implications

### Format-Agnostic Components
These work the same for both formats:

1. **Agency Architecture** (Format-Agnostic Agents)
   - Lighting Agent (works for both formats)
   - Character Agent (works for both formats)
   - Location Agent (works for both formats)
   - Context Analysis Agent (works for both formats)
   - Negative Prompt Agent (works for both formats)
   - CEO Coordinator (works for both formats)

2. **Format-Specific Agents** (Separate for Each Format)
   - Wide Composition Agent (16:9) - horizontal thinking, full frame
   - Vertical Composition Agent (9:16) - vertical thinking, top/bottom placement
   - Marketing Composition Agent (9:16) - hook-focused
   - **Rationale**: Formats dictate what can be done within the frame, requiring separate agents

2. **Context Analysis**
   - Same multi-beat analysis
   - Same emotional/action extraction
   - Format-agnostic context understanding

3. **Facts First Model**
   - Character appearance (facts)
   - Story database (facts)
   - Scene rules (facts)
   - Same for both formats

4. **Hybrid Interpretation**
   - Location visuals (facts + interpretation)
   - Negative prompts (rules + AI)
   - Lighting (guidelines + action)
   - Same approach for both formats

### Format-Specific Components
These differ by format:

1. **Composition Instructions**
   - Wide: Horizontal emphasis, environmental storytelling
   - Vertical: Top/bottom emphasis, character-centric

2. **Location Detail Placement**
   - Wide: Full frame available
   - Vertical: Top/bottom of frame

3. **Character Pose Constraints**
   - Wide: More freedom in horizontal space
   - Vertical: Constrained by vertical frame, need variety

4. **Marketing Hooks**
   - Currently vertical format only
   - May expand to wide format in future

---

## Implementation Strategy

### Phase 1: Build Format-Agnostic Foundation
1. **Agency Architecture** (works for both formats)
   - Lighting Agent
   - Composition Agent
   - Character Agent
   - Location Agent
   - Marketing Agent (vertical for now)
   - Negative Prompt Agent
   - CEO Coordinator

2. **Context Analysis System** (works for both formats)
   - Multi-beat analysis
   - Emotional/action extraction
   - Context-aware generation

3. **Hybrid Interpretation Logic** (works for both formats)
   - Facts + interpretation model
   - Rules + AI decision model

### Phase 2: Apply to Both Formats
1. **Wide Format (16:9)**
   - Apply agency model
   - Apply context analysis
   - Apply creative interpretation
   - Improve with qualitative inputs

2. **Vertical Format (9:16)**
   - Apply agency model
   - Apply context analysis
   - Apply creative interpretation
   - Solve format-specific challenges (location details, poses)

### Phase 3: Format-Specific Optimization
1. **Wide Format Enhancements**
   - Optimize for horizontal composition
   - Environmental storytelling emphasis
   - Full frame utilization

2. **Vertical Format Solutions**
   - Top/bottom location detail placement
   - Character pose variety
   - Vertical composition optimization
   - ComfyUI Solo evaluation

---

## Key Questions

### For Wide Format
1. Are there current issues with wide format that qualitative AI inputs should address?
2. Should wide format also benefit from agency model improvements?
3. Are there wide-format-specific challenges we should identify?

### For Vertical Format
1. How do we apply qualitative inputs to solve location detail issues?
2. How do we apply qualitative inputs to solve pose variety issues?
3. Should vertical format have format-specific agents or just format-specific instructions?

### For Both Formats
1. Should agency model be identical for both?
2. Should context analysis be identical for both?
3. Should creative interpretation logic be shared or separate?

---

## Vision Summary

**The qualitative AI inputs (agency model, context analysis, creative interpretation, hybrid solutions) are format-agnostic and should improve both wide and vertical formats equally.**

**Format-specific differences are in:**
- Composition instructions
- Location detail placement
- Character pose constraints
- Marketing application (currently vertical only)

**But the underlying qualitative approach (how AI thinks, interprets, creates) is the same for both.**

---

**This clarification ensures we build a system that improves both formats with the same qualitative intelligence, while addressing format-specific constraints.**

