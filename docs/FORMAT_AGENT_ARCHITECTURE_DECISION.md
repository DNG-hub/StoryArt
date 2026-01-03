# Format Agent Architecture Decision

**Date**: 2025-11-24  
**Status**: Architecture Decision Point  
**Purpose**: Determine if format-specific agents are needed or if single agent with format tools is sufficient

---

## The Question

**Do formats dictate what can be done within the frame to such an extent that we need:**
- **Option A**: Separate agents (Wide Format Agent, Vertical Format Agent)
- **Option B**: Single agent with explicit format-aware instructions/tools

---

## Format Constraints Analysis

### Wide Format (16:9 Cinematic)
**Frame Characteristics**:
- Horizontal composition (side-to-side emphasis)
- Full frame available for location details
- Environmental storytelling emphasized
- More freedom in character positioning
- Can show wide environmental context

**What Can Be Done**:
- Location details throughout frame
- Character positions: left, center, right, foreground, background
- Environmental context: full scene visible
- Composition: wide shots, establishing shots, environmental storytelling

### Vertical Format (9:16)
**Frame Characteristics**:
- Vertical composition (top-to-bottom emphasis)
- Restricted horizontal space
- Location details primarily at top/bottom of frame
- Character-centric focus
- Constrained character poses/positions

**What Can Be Done**:
- Location details: top and bottom of frame (limited middle)
- Character positions: constrained by vertical frame
- Environmental context: minimal, supporting character
- Composition: medium shots, close-ups, character-focused
- Poses: variety needed but within vertical constraint

---

## The Fundamental Difference

**Your Point**: "Formats dictate what can be done within the frame"

This is absolutely correct. The frame constraints are not just parameters - they fundamentally change:
- **What's possible** (location placement, character positions)
- **What's emphasized** (environmental vs. character-centric)
- **What's constrained** (poses, composition options)
- **How to think about composition** (horizontal vs. vertical thinking)

---

## Architecture Options

### Option A: Separate Format Agents

**Structure**:
```
Composition Agent (Wide Format)
  - Handles 16:9 composition
  - Horizontal thinking
  - Full frame location placement
  - Environmental storytelling emphasis

Composition Agent (Vertical Format)
  - Handles 9:16 composition
  - Vertical thinking
  - Top/bottom location placement
  - Character-centric emphasis
  - Pose variety within constraints
```

**Pros**:
- ✅ Clear separation of concerns
- ✅ Each agent can be optimized for its format
- ✅ Format-specific logic is explicit and focused
- ✅ Easier to debug format-specific issues
- ✅ Can have format-specific tools/knowledge

**Cons**:
- ⚠️ Potential code duplication (shared logic)
- ⚠️ More agents to coordinate
- ⚠️ Need to ensure consistency between agents

**Shared Agents** (format-agnostic):
- Lighting Agent (works for both)
- Character Agent (works for both)
- Location Agent (works for both)
- Context Analysis Agent (works for both)
- Negative Prompt Agent (works for both)

**Format-Specific Agents**:
- Wide Composition Agent (16:9)
- Vertical Composition Agent (9:16)
- Marketing Composition Agent (9:16, hook-focused)

---

### Option B: Single Agent with Format Tools

**Structure**:
```
Composition Agent
  - Format-aware (has format parameter)
  - Format-specific tools:
    - WideFormatTool: horizontal composition, full frame placement
    - VerticalFormatTool: vertical composition, top/bottom placement
  - Explicit format instructions in system prompt
  - Format constraint checker
```

**Pros**:
- ✅ Single agent to maintain
- ✅ Shared logic for format-agnostic aspects
- ✅ Format is a parameter, not a separate system

**Cons**:
- ⚠️ Risk of format logic bleeding together
- ⚠️ System instructions might be too complex
- ⚠️ Format constraints might not be explicit enough
- ⚠️ Harder to optimize for format-specific needs

---

### Option C: Hybrid - Shared Core + Format Specialists

**Structure**:
```
Composition Core Agent
  - Shared logic (context analysis, character positioning basics)
  - Format-agnostic composition principles

Wide Format Specialist
  - Extends Composition Core
  - Wide-specific composition logic
  - Horizontal thinking
  - Full frame utilization

Vertical Format Specialist
  - Extends Composition Core
  - Vertical-specific composition logic
  - Vertical thinking
  - Top/bottom placement
  - Pose variety within constraints
```

**Pros**:
- ✅ Shared core logic (no duplication)
- ✅ Format-specific specialization
- ✅ Clear format boundaries
- ✅ Can optimize each specialist

**Cons**:
- ⚠️ More complex architecture
- ⚠️ Need to design core vs. specialist boundaries

---

## Recommendation: Option A (Separate Format Agents)

**Reasoning**:

1. **Format Constraints Are Fundamental**
   - Not just parameters, but fundamental differences in what's possible
   - Horizontal vs. vertical thinking is different
   - Composition logic is fundamentally different

2. **Explicit Format Knowledge**
   - Each agent can have format-specific knowledge
   - Wide agent knows: full frame available, environmental emphasis
   - Vertical agent knows: top/bottom placement, pose constraints

3. **Clearer Separation**
   - Format-specific issues are isolated
   - Easier to debug and improve
   - Can optimize each format independently

4. **Your Insight**
   - "Formats dictate what can be done within the frame"
   - This suggests format is not just a parameter, but a fundamental constraint
   - Separate agents respect this fundamental difference

---

## Proposed Architecture

### Format-Agnostic Agents (Shared)
- **Lighting Agent**: Extracts/interprets lighting (works for both formats)
- **Character Agent**: Handles character appearance, facts (works for both)
- **Location Agent**: Handles location visuals, facts + interpretation (works for both)
- **Context Analysis Agent**: Multi-beat analysis, emotional extraction (works for both)
- **Negative Prompt Agent**: Location-aware negative prompts (works for both)
- **CEO Coordinator**: Organizes agents, resolves conflicts

### Format-Specific Agents
- **Wide Composition Agent (16:9)**
  - Horizontal composition thinking
  - Full frame location placement
  - Environmental storytelling emphasis
  - Wide shot, establishing shot composition
  - Character positioning: left, center, right, foreground, background

- **Vertical Composition Agent (9:16)**
  - Vertical composition thinking
  - Top/bottom location placement
  - Character-centric emphasis
  - Medium shot, close-up composition
  - Character pose variety within vertical constraints

- **Marketing Composition Agent (9:16)**
  - Extends Vertical Composition Agent
  - Hook-focused composition
  - Character inclusion decision logic
  - Compelling visual elements
  - YouTube short format optimization

---

## Format-Specific Agent Responsibilities

### Wide Composition Agent (16:9)
**Inputs**:
- Beat narrative
- Location context
- Character positions
- Context analysis results

**Outputs**:
- Shot type (wide, establishing, environmental)
- Character positioning (horizontal: left/center/right)
- Location detail placement (throughout frame)
- Environmental storytelling emphasis
- Composition directives for wide format

**Format-Specific Knowledge**:
- Horizontal composition principles
- Full frame utilization
- Environmental context emphasis
- Wide shot techniques

### Vertical Composition Agent (9:16)
**Inputs**:
- Beat narrative
- Location context
- Character positions
- Context analysis results

**Outputs**:
- Shot type (medium, close-up, character-focused)
- Character positioning (vertical: top/middle/bottom)
- Location detail placement (top/bottom of frame)
- Character pose variety (within vertical constraints)
- Composition directives for vertical format

**Format-Specific Knowledge**:
- Vertical composition principles
- Top/bottom frame utilization
- Character-centric emphasis
- Pose variety within vertical constraints
- FLUX vertical generation patterns

---

## Questions for You

1. **Does this architecture make sense?**
   - Separate format agents for composition
   - Shared agents for format-agnostic aspects

2. **Should there be more format-specific agents?**
   - Or is composition the main format-specific concern?

3. **How should format agents coordinate?**
   - CEO decides which format agent to use?
   - Or are they called based on output format needed?

4. **Should format agents share any logic?**
   - Or are they completely separate?

5. **What about format-specific tools?**
   - Should agents have format-specific tools/knowledge?
   - Or just format-specific instructions?

---

## Next Steps

1. **Confirm architecture approach** (separate format agents vs. single agent)
2. **Design format agent interfaces** (what they receive, what they output)
3. **Design format-specific knowledge/tools** (what each agent knows)
4. **Design coordination** (how CEO decides which agent to use)
5. **Build proof of concept** (one format agent first, test, then add others)

---

**Your insight about formats dictating what can be done within the frame suggests separate agents might be the right approach. What do you think?**

