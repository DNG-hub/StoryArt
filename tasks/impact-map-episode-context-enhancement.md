# Impact Map: Episode-Wide Context for AI Image Generation

## Business Goal

**What:** Increase marketing image quality and engagement by 40% through episode-aware AI prompt generation
**Why:** Current beat-level prompts produce generic images that miss emotional arcs, character development, and viral marketing opportunities
**Measure:**
- Image generation quality score (human evaluation 1-10)
- Marketing vertical engagement rate (clicks, shares, watch time)
- AI prompt richness (character count, narrative elements included)
**Target:**
- Quality score from 6.5/10 to 9/10
- Engagement rate from 2.5% to 3.5%
- Prompt richness from 200 chars to 500+ chars
**Timeline:** Next quarter (3 months)

## Current State

- **Current Quality Score:** 6.5/10 (images are technically correct but narratively flat)
- **Current Engagement:** 2.5% click-through on marketing verticals
- **Current Prompt Richness:** ~200 characters, beat-level context only
- **Gap:** Images lack emotional depth, character arc awareness, thematic coherence
- **Why Now:**
  - We have story intelligence data but aren't using it
  - Marketing team reports images don't capture "the hook"
  - Competition has more compelling visual storytelling
  - Database already has the data we need (distributed across tables)

## Impact Map

### Actor: AI Prompt Generation System

**Impact We Want:** Generate prompts that incorporate episode-wide story context, character arcs, and emotional progression

**Deliverables (Possible Solutions):**

1. **Minimal Episode Context Aggregator**
   - Description: Simple service that pulls story_context, core_themes, narrative_tone from stories table and injects into system instruction
   - Assumption: Even basic story-level context will improve prompt quality because AI will align images with themes
   - Effort: Small (1-2 weeks) - Single service, read from existing tables, no new data structures
   - Value: Medium - Improves thematic coherence but still misses character/plot arcs
   - **Scope:** Read stories table, enhance system instruction template

2. **Plot Arc Aware Generation (RECOMMENDED)**
   - Description: Aggregates active plot arcs for episode (activation_episode <= current <= resolution_episode), includes arc status and key moments in prompt context
   - Assumption: Knowing which arcs are active and their progression will let AI emphasize pivotal moments
   - Effort: Medium (3-4 weeks) - Arc aggregation service, episode-arc mapping logic, enhanced context structure
   - Value: High - AI knows what plot threads to emphasize, creates visual continuity across arc
   - **Scope:** Arc aggregation, episode filtering, context injection

3. **Full Episode Intelligence Service**
   - Description: Comprehensive service that aggregates story context + active arcs + character emotional states + location significance + marketing hooks
   - Assumption: Full context will produce marketing-ready images with maximum viral potential
   - Effort: Large (5-6 weeks) - Multiple services, character state snapshots, marketing analysis, new database tables
   - Value: Very High - Maximum quality improvement, marketing optimization built-in
   - **Scope:** episodeIntelligenceService + marketingIntelligenceService + new tables

4. **Character Arc Snapshot System**
   - Description: Create episode-level snapshots of character progression (supernatural_influence_level, revenge_programming_resistance at each episode)
   - Assumption: Character development tracking will enable AI to visualize internal conflicts and emotional states
   - Effort: Medium (3-4 weeks) - New table, snapshot creation logic, integration with existing character data
   - Value: High - Better character portrayal, emotional depth in images
   - **Scope:** New episode_character_states table, snapshot service, query integration

### Actor: Marketing Team

**Impact We Want:** Get viral-worthy images without manual prompt tweaking

**Deliverables (Possible Solutions):**

1. **Marketing Vertical Prompt Optimization**
   - Description: Separate prompt generation logic for marketing verticals that emphasizes hooks, dramatic composition, thumbnail-worthy framing
   - Assumption: Marketing images need different emphasis than cinematic narrative images
   - Effort: Small (1-2 weeks) - Template variation, marketing-specific rules in system instruction
   - Value: High - Direct impact on marketing effectiveness
   - **Scope:** marketingVertical prompt template enhancement

2. **Viral Potential Scoring (AI-Powered)**
   - Description: Secondary AI pass that analyzes beats for emotional peaks, plot revelations, visual drama, then scores viral potential 1-10
   - Assumption: AI can identify viral moments by analyzing narrative structure and emotional intensity
   - Effort: Medium (3-4 weeks) - New AI service, scoring logic, integration with beat analysis
   - Value: Medium - Helps prioritize which beats to use for marketing, but doesn't improve individual images
   - **Scope:** marketingIntelligenceService, viral scoring algorithm

3. **Manual Marketing Annotations**
   - Description: UI for marketing team to mark beats as "high viral potential" and add marketing hook suggestions
   - Assumption: Humans better at identifying viral moments than AI
   - Effort: Medium (3-4 weeks) - New table, UI components, integration with beat selection
   - Value: Medium - Effective but requires manual work, not scalable
   - **Scope:** marketing_annotations table, annotation UI

### Actor: Content Viewers/Audience

**Impact We Want:** Higher engagement with marketing content (clicks, shares, watch time)

**Deliverables (Possible Solutions):**

1. **Platform-Specific Optimization**
   - Description: Different prompt generation for YouTube vs TikTok vs Instagram (aspect ratios, composition rules, text-safety zones)
   - Assumption: Each platform has different engagement patterns requiring tailored imagery
   - Effort: Small (1-2 weeks) - Platform-specific templates, composition rules
   - Value: Medium - Platform optimization matters but secondary to content quality
   - **Scope:** Platform-specific prompt templates

2. **Thematic Visual Motifs**
   - Description: Track key_symbols from story (e.g., "shattered glass", "blue energy") and inject into relevant scenes
   - Assumption: Recurring visual motifs create brand recognition and narrative cohesion
   - Effort: Small (1-2 weeks) - Read key_symbols, add to system instruction
   - Value: Medium - Subtle but builds visual identity
   - **Scope:** Symbol injection logic

## Key Assumptions

1. **Assumption:** Story intelligence data in database is sufficiently rich and accurate
   - **Risk if wrong:** Enhancement produces no quality improvement if data is sparse or incorrect
   - **How to validate:** Audit stories table for data completeness, review plot_arcs for 2-3 episodes

2. **Assumption:** AI (Gemini 2.5 Flash) can effectively use episode-wide context without hallucinating
   - **Risk if wrong:** More context confuses AI, produces worse prompts due to token limit or complexity
   - **How to validate:** A/B test with simple vs. complex context on 20 beats, measure quality

3. **Assumption:** Current beat-level context is insufficient (the problem actually exists)
   - **Risk if wrong:** Wasted development effort if images are already good enough
   - **How to validate:** Marketing team evaluation of current images, user engagement data

4. **Assumption:** Character progression (supernatural_influence_level, etc.) changes between episodes
   - **Risk if wrong:** If character states are static, per-episode snapshots add no value
   - **How to validate:** Check character data variance across temporal_contexts

5. **Assumption:** Improved prompts translate to better generated images (not limited by Flux model)
   - **Risk if wrong:** Better prompts don't matter if Flux can't render nuanced emotions/concepts
   - **How to validate:** Test prompt variations with current system, see if Flux responds to prompt richness

## Prioritization

### High Priority (Do First):

**Option A: Plot Arc Aware Generation (Deliverable #2)**
- **Rationale:** High value, medium effort, leverages existing data
- **Why:** Active arcs are already tracked with activation/peak/resolution episodes
- **Next:** Validate assumption #1 (data completeness), then create PRD

**Option B: Minimal Episode Context + Marketing Vertical Optimization (Deliverables #1 + Marketing #1)**
- **Rationale:** Fastest path to value, combined high impact
- **Why:** Story context is easy to access, marketing optimization has direct ROI
- **Next:** Validate assumption #3 (problem exists), then create PRD

### Medium Priority (Consider After Phase 1):

- Character Arc Snapshot System (Deliverable #4) - High value but requires new table
- Viral Potential Scoring (Marketing #2) - Interesting but secondary to core quality
- Thematic Visual Motifs (Audience #2) - Easy win for visual cohesion

### Low Priority (Future Consideration):

- Full Episode Intelligence Service (Deliverable #3) - Over-engineered for initial need
- Manual Marketing Annotations (Marketing #3) - Not scalable
- Platform-Specific Optimization (Audience #1) - Already have aspect ratios, minor gains

### Not Doing (At This Time):

- Creating new episodes table - Not needed, can aggregate on the fly
- Real-time character emotion tracking - Too complex, use existing demeanor descriptions
- AI-generated marketing copy - Out of scope, focus on images only

## Next Steps

**Before creating PRD, validate critical assumptions:**

1. **Data Completeness Audit (1 hour):**
   - Check stories table: Are story_context, core_themes, narrative_tone populated?
   - Check plot_arcs table: Are activation_episode, peak_episode, resolution_episode set?
   - Sample 2-3 episodes worth of data

2. **Marketing Team Feedback (30 minutes):**
   - Ask: "Are current images missing narrative depth?"
   - Ask: "What's missing from current marketing images?"
   - Get examples of "good" vs "bad" images

3. **A/B Test Proposal (2 hours):**
   - Generate 10 prompts with current system
   - Manually enhance 10 prompts with episode context
   - Send both to Flux, compare results
   - Evaluate if enhancement produces measurable improvement

**Then:**
- If validations pass, create PRD for **Option A** (Plot Arc Aware Generation)
- If time appetite is tighter, create PRD for **Option B** (Minimal Context + Marketing)
- If validations fail, revisit problem definition

## Questions for Stakeholder

1. **Time Appetite:** How much time is this worth? Small (1-2 weeks), Medium (3-4 weeks), or Large (5-6 weeks)?
2. **Priority:** Is this more urgent than other planned features?
3. **Scope Preference:** Prefer quick win (Option B) or more comprehensive solution (Option A)?
4. **Marketing Intelligence:** Want automated viral scoring or rely on manual selection?
5. **Database Changes:** Comfortable adding new tables (episode_character_states) or prefer read-only approach?

---

Generated using impact mapping methodology to ensure strategic alignment before implementation.
