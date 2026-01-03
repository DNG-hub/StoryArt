# Vision Alignment Synthesis

**Date**: 2025-11-24  
**Status**: Vision Captured - Architecture Design Phase  
**Purpose**: Synthesize your vision into actionable architecture

---

## Core Vision Summary

### Image Generation Purpose: **All of the Above**

1. **Long-Form Storytelling** (Cinematic + Vertical)
   - **Cinematic (16:9)**: Full narrative visualization
     - Qualitative AI inputs apply equally (agency model, context analysis, creative interpretation)
     - Same nuanced approach as vertical format
   - **Vertical (9:16)**: Long-form storytelling format
     - **Current Issue**: Vertical format has good characters but minimal location details
     - **Solution Needed**: 
       - Location details at top/bottom of vertical frame (requires more imagination)
       - More variety in character poses/positions while maintaining vertical constraint
       - May need ComfyUI Solo as alternative to current system
   - **Key Point**: Qualitative AI inputs (nuance, creative interpretation, agency model) apply **equally** to both wide and vertical formats

2. **Marketing Visuals** (Vertical 9:16)
   - Evocative and compelling hooks to drive traffic to long-form story
   - Narratives for marketing not yet created
   - AI must determine if character inclusion is important for the hook
   - Vertical format restricts composition - requires creative solutions
   - Short form conforms to YouTube standards for length
   - **Note**: Marketing-specific qualitative inputs may differ from storytelling, but same agency model applies

---

## Truth vs. Interpretation Model

### **Facts (Deterministic)**
- **Character Appearance**: Facts (driven by LoRA + body shape, hair color, clothing)
- **Story Database**: Facts (storyteller database, roadmap, story bible)
- **Scene Rules**: Facts (hardcoded into narrative)

### **Hybrid (Facts + Interpretation)**
- **Location Visuals**: Facts with interpretation of narrative
- **Negative Prompts**: Hybrid solution (can't make rules for all ambiguity)
- **Lighting**: Rigid guidelines, but action in location dictates lighting/ambiance

### **Interpretation (AI-Driven)**
- **Lighting Details**: Interpretation when narrative fails to provide details
- **Composition**: Creative interpretation (especially for vertical format)
- **Character Poses**: Creative interpretation (variety within constraints)
- **Marketing Hooks**: Creative interpretation (what makes image compelling)

---

## AI Architecture: Agency Model

### **Programming Does Heavy Lifting**
- Structure and rules enforcement
- Data access (storyteller database, roadmap, story bible)
- Pre-processing where needed

### **AI Provides Nuance**
- Formed into an **agency** where nuance is focused on particular jobs
- Individual agents for keeping track of all aspects
- "CEO" agent organizing who works on what and when

### **AI Roles**
1. **Rule Follower**: For basics of structure
2. **Creative Interpreter**: For artistic decisions
3. **Context Analyzer**: Examining predecessor and next beats for fullest understanding
4. **Marketing Strategist**: Determining what makes compelling hooks
5. **Composition Specialist**: Working within vertical format constraints

### **Human in the Loop**
- May need human guidance for complex decisions
- Especially for marketing hooks and creative interpretation

---

## Processing Model

### **What Comes In Already Processed**
- Narrative (beats, scenes, episodes)
- Story database (characters, locations, story bible)
- Roadmap (story structure)

### **Key Requirement: Responsive Prompts**
Prompts must fit:
- **Narrative**: What's happening in the beat
- **Mood**: Emotional tone
- **Purpose**: Storytelling vs. marketing

### **Pre-Processing (Minimal)**
- Not many things to pre-process (already processed when they come in)
- Character LoRA triggers (already handled)
- Basic structure enforcement

### **AI Interpretation (Primary)**
- Lighting (rigid guidelines + action-based interpretation)
- Composition (especially vertical format challenges)
- Character poses (variety within constraints)
- Location details in vertical format (top/bottom placement)
- Marketing hooks (what's compelling)

---

## Hierarchy Discovery (Iterative)

### **What We Know**
- Scene rules are hardcoded into narrative (highest authority?)
- Story database provides facts (characters, locations, story bible)
- Beat narrative provides context (emotion, action)
- Location context provides visual facts
- AI interprets and makes creative decisions

### **What We Need to Discover**
- Exact override hierarchy (beat narrative > location context > defaults?)
- How agents coordinate decisions
- When human guidance is needed
- How marketing vs. storytelling modes differ

---

## Critical Challenges Identified

### 1. **Vertical Format Limitations**
**Problem**: 
- Characters are good but location details are minimal
- Character poses are constrained
- Composition is restricted

**Solution Needed**:
- Location details at top/bottom of vertical frame
- More variety in character poses/positions
- Better understanding of how FLUX generates images in vertical format
- May need ComfyUI Solo as alternative

### 2. **Marketing Hooks**
**Problem**:
- Need evocative and compelling hooks
- Narratives for marketing not yet created
- AI must determine if character inclusion is important

**Solution Needed**:
- Marketing-specific prompt generation
- Hook-focused composition
- Character inclusion decision logic

### 3. **Context Understanding**
**Problem**:
- Image must convey emotion or action in the beat
- May need to examine predecessor and next beats for fullest understanding

**Solution Needed**:
- Multi-beat context analysis
- Emotional/action extraction from beat sequence
- Context-aware prompt generation

### 4. **Agency Architecture**
**Problem**:
- Need individual agents for different aspects
- Need "CEO" organizing who works on what and when

**Solution Needed**:
- Agent-based architecture design
- Agent coordination system
- Task delegation logic

---

## Architecture Principles

### **Principle 1: Facts First, Interpretation Second**
- Facts (character, database, rules) are authoritative
- Interpretation (lighting, composition, poses) builds on facts
- Hybrid (location, negative prompts) combines both

### **Principle 2: Context-Aware**
- Examine predecessor and next beats for fullest understanding
- Access to storyteller database, roadmap, story bible
- Narrative provides context for interpretation

### **Principle 3: Purpose-Driven**
- Storytelling mode: Narrative accuracy, emotion, action
- Marketing mode: Compelling hooks, traffic drivers
- Different rules and interpretations for each

### **Principle 4: Constraint-Aware Creativity**
- **Format-Agnostic**: Qualitative AI inputs apply equally to wide (16:9) and vertical (9:16) formats
- Vertical format restricts composition - requires creative solutions
- Character poses need variety within constraints (both formats)
- Location details need creative placement (top/bottom of vertical frame; full frame in wide format)
- Same agency model, context analysis, and creative interpretation for both formats

### **Principle 5: Agency Coordination**
- Individual agents for different aspects
- "CEO" agent organizes and delegates
- Human in the loop when needed

---

## Next Steps: Architecture Design

### Phase 1: Understand Current State
- [ ] Map current prompt generation flow
- [ ] Identify where facts vs. interpretation happens
- [ ] Document current vertical format handling
- [ ] Analyze current marketing image generation (if any)

### Phase 2: Design Agency Architecture
- [ ] Define agent roles (lighting, composition, marketing, etc.)
- [ ] Design "CEO" coordination system
- [ ] Define agent communication protocols
- [ ] Design human-in-the-loop interfaces

### Phase 3: Design Format-Specific Solutions
- [ ] **Wide Format (16:9 Cinematic)**
  - Apply qualitative AI inputs (agency model, context analysis)
  - Ensure same nuanced approach as vertical
- [ ] **Vertical Format (9:16)**
  - Research FLUX vertical format generation patterns
  - Design location detail placement (top/bottom)
  - Design character pose variety system
  - Evaluate ComfyUI Solo integration
- [ ] **Format-Agnostic**
  - Agency model works for both formats
  - Context analysis applies to both
  - Creative interpretation applies to both

### Phase 4: Design Context Analysis
- [ ] Multi-beat context extraction
- [ ] Emotional/action analysis from beat sequence
- [ ] Context-aware prompt generation

### Phase 5: Design Marketing Hook System
- [ ] Marketing-specific prompt generation
- [ ] Hook-focused composition
- [ ] Character inclusion decision logic

---

## Questions for Further Discovery

### About Format-Specific Needs
1. **Wide Format (16:9)**: 
   - Are there specific issues with current wide format that need addressing?
   - Should qualitative AI inputs improve wide format as well?
2. **Vertical Format (9:16)**:
   - What specific location details are missing in vertical format?
   - What character pose variety do you want? (standing, crouching, action poses?)
   - Have you tested ComfyUI Solo? What are the advantages?
3. **Format-Agnostic**:
   - Should agency model work identically for both formats?
   - Should context analysis be the same for both?

### About Marketing Hooks
1. What makes an image a "hook" in your vision?
2. Should marketing images be beat-based or episode-based?
3. What emotions/actions drive traffic in your experience?

### About Agency Architecture
1. What specific agents do you envision? (lighting agent, composition agent, etc.)
2. How should agents communicate? (shared context? message passing?)
3. When should human guidance be triggered?

### About Hierarchy
1. Should we start with a simple hierarchy and iterate?
2. What conflicts have you seen that need resolution?
3. Should there be different hierarchies for storytelling vs. marketing?

---

**This document captures your vision. Let's use it to design the architecture that matches what you envision.**

