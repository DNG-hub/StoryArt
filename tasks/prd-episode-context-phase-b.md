# PRD: Episode Context Enhancement - Phase B (Quick Win)

**Phase:** B of 3 (B → A → C incremental strategy)
**Feature Type:** AI Prompt Generation Enhancement
**Created:** 2025-11-26
**Status:** Planning

---

## 1. Introduction/Overview

This feature enhances AI image prompt generation by injecting minimal episode-wide story context (themes, narrative tone, story arc) and optimizing prompts specifically for marketing verticals. Currently, prompts are generated with beat-level context only, resulting in images that are technically correct but may lack thematic depth and marketing appeal.

**Goal:** Quick win to validate that episode-wide context improves image quality while establishing the foundation for more comprehensive enhancements (Phases A and C).

---

## 2. Problem Evidence (Required)

**CRITICAL ACKNOWLEDGMENT: We currently have NO hard evidence that this problem exists. This PRD is based on subjective assessment.**

### Subjective Assessment:
* **User observation:** Current images appear "narratively flat" and lack thematic cohesion
* **User belief:** Marketing team would benefit from images with stronger hooks
* **User intuition:** We have story intelligence data that isn't being used

### What We're Missing:
* No quantitative image quality metrics
* No marketing engagement data (click-through, shares, watch time)
* No A/B testing of current vs. enhanced prompts
* No user feedback on image quality
* No competitive benchmarking

### Evidence Collection Strategy (Built Into This Phase):
**We will build a tracking system as part of this phase to gather evidence:**

1. **Image Quality Scoring (Manual):**
   - Human evaluation of generated images (1-10 scale)
   - Dimensions: Technical quality, narrative depth, emotional impact, marketing appeal
   - Evaluate 20 images: 10 before enhancement, 10 after

2. **Prompt Richness Metrics (Automated):**
   - Character count of generated prompts
   - Number of narrative elements (themes, emotional descriptors, etc.)
   - Before/after comparison

3. **A/B Testing Framework:**
   - Generate same beat with current vs. enhanced system
   - Side-by-side comparison
   - Track which version is selected for marketing use

4. **Lessons Learned Log:**
   - Document what works / doesn't work
   - Capture insights for Phases A and C
   - Track development velocity and complexity

**Validation Criteria:** If Phase B shows >20% improvement in quality score OR >30% increase in prompt richness, proceed to Phase A.

---

## 3. Time Appetite

**Time Budget:** Small Batch (1-2 weeks)

**Rationale:**
This is an experimental enhancement to validate assumptions. We're intentionally keeping scope minimal to:
- Get to validation quickly (do we have a real problem?)
- Establish development patterns for Phases A and C
- Minimize investment risk since we have no evidence
- Learn what works before committing to larger effort

**If we exceed 2 weeks:** Re-evaluate whether to continue, simplify scope, or pivot approach.

---

## 4. Goals

**Primary Goal:**
1. **Validate enhancement hypothesis:** Prove that episode-wide context improves image quality by ≥20%

**Secondary Goals:**
2. **Establish development foundation:** Create reusable context aggregation service for Phases A and C
3. **Capture evidence:** Build tracking system to measure impact quantitatively
4. **Optimize marketing verticals:** Improve marketing image appeal with specialized templates

**Stretch Goal:**
5. **Document lessons learned:** Create playbook for Phases A and C based on Phase B learnings

---

## 5. User Stories / Job Stories

### User Stories:
1. As a content creator, I want generated images to reflect episode themes so the visual storytelling is cohesive
2. As a marketing team member, I want marketing vertical images to emphasize hooks and drama so engagement improves
3. As a developer, I want to measure prompt quality so I can validate whether enhancements work
4. As a product owner, I want lessons learned documentation so I can plan Phases A and C effectively

### Job Stories (When-I-Want-So Format):
1. **When** generating prompts for a dramatic reveal beat, **I want** the AI to know the episode's central conflict, **so** the image emphasizes that tension
2. **When** creating marketing verticals, **I want** prompts optimized for viral potential, **so** engagement rates improve
3. **When** comparing image quality, **I want** quantitative metrics, **so** I can make data-driven decisions
4. **When** planning Phase A, **I want** documented lessons from Phase B, **so** I avoid repeating mistakes and build on successes

---

## 6. Functional Requirements

### Core (Must Ship):

**Context Aggregation:**
1. Service must query stories table for: story_context, narrative_tone, core_themes
2. Service must inject this context into AI system instruction template
3. Service must operate within existing prompt generation flow (no breaking changes)
4. Service must gracefully handle missing data (fallback to current behavior)

**Marketing Vertical Optimization:**
5. System must use separate prompt template for marketing verticals
6. Marketing template must emphasize: dramatic composition, emotional intensity, thumbnail-worthy framing, hook potential
7. Marketing prompts must include Rule of Thirds, leading lines, visual drama keywords

**Evidence Collection:**
8. System must log prompt richness metrics (character count, element count)
9. System must enable A/B comparison (current vs. enhanced)
10. System must track which prompts lead to selected images

**Quality Gates:**
11. Enhanced prompts must not increase generation time by >10%
12. Enhanced prompts must not exceed Gemini token limits
13. Enhanced prompts must maintain current success rate (no increase in failures)

### Nice-to-Have (Can Cut if Time Short):

14. System could provide before/after prompt comparison UI
15. System could auto-generate quality score based on prompt richness
16. Marketing template could include platform-specific rules (YouTube vs TikTok)
17. System could track token usage for cost analysis

### Future Work (Explicitly Deferred to Phases A/C):

18. **Phase A:** Plot arc aggregation and arc-aware prompt generation
19. **Phase A:** Character arc snapshot integration
20. **Phase C:** Automated viral potential scoring
21. **Phase C:** Character emotional state per-episode tracking
22. **Phase C:** New database tables (episode_character_states, etc.)

---

## 7. Non-Goals (Out of Scope)

This feature will **NOT** include:

* **Plot arc intelligence** - Deferred to Phase A
* **Character arc snapshots** - Deferred to Phase A
* **Automated viral scoring** - Deferred to Phase C
* **New database tables** - Phase B is read-only from existing tables
* **UI for manual annotations** - Out of scope for incremental approach
* **Real-time character emotion tracking** - Too complex for Phase B
* **Platform-specific composition rules** - Nice-to-have, defer if time-constrained
* **Marketing team training** - Focus on technical implementation only

---

## 8. Rabbit Holes to Avoid

**1. Over-Engineering the Context Service:**
Don't build a comprehensive aggregation framework. Just read 3 fields from stories table and inject into template. Resist the urge to make it "future-proof" - we'll learn what we need in Phase A.

**2. Perfect Marketing Prompts:**
Don't spend 3 days tweaking marketing template wording. Get something reasonable working, test it, iterate based on data. Perfection is the enemy of validation.

**3. Comprehensive Tracking System:**
Don't build a full analytics dashboard. Simple logging and manual evaluation is sufficient for Phase B. We need evidence, not enterprise BI.

**4. Token Optimization:**
Don't obsess over token count. If we're within limits and cost is reasonable, ship it. Optimization can come in Phase A if needed.

**5. Handling Every Edge Case:**
If story_context is missing, just fall back to current behavior. Don't build complex error handling for rare scenarios in a 1-2 week experiment.

**6. Lessons Learned Framework:**
Don't create a formal knowledge management system. A markdown file with bullet points is fine.

---

## 9. Design Considerations

**Service Architecture:**
* New service: `storyContextService.ts` (minimal, <100 lines)
* Modify: `promptGenerationService.ts` (inject context into system instruction)
* Pattern: Read-only queries, no state mutation

**Prompt Template Structure:**
```
EXISTING PRODUCTION STANDARDS:
[Current system instruction...]

EPISODE-WIDE STORY CONTEXT:
Story Arc: ${story_context}
Narrative Tone: ${narrative_tone}
Core Themes: ${core_themes}

Use this context to align image composition with thematic elements.

[Rest of existing instructions...]
```

**Marketing Template Enhancement:**
```
MARKETING VERTICAL OPTIMIZATION:
- Emphasize dramatic composition (Rule of Thirds, leading lines)
- Heighten emotional intensity in facial expressions
- Frame for thumbnail impact (clear focal point, high contrast)
- Include visual hooks (dramatic action, revelation moments)

[Existing marketing instructions...]
```

**No UI Changes:** Phase B operates behind the scenes, no user-facing changes needed.

---

## 10. Technical Considerations

**Technology Stack:**
* TypeScript service (storyContextService.ts)
* PostgreSQL queries to stories table
* Modification to existing Gemini prompt assembly

**Database Access:**
* Read-only queries: `SELECT story_context, narrative_tone, core_themes FROM stories WHERE id = $1`
* No new tables, no schema changes
* Use existing database connection pool

**Performance:**
* Single additional query per episode (cached for duration of episode generation)
* Negligible impact (<50ms added to prompt generation)
* No impact on Flux image generation time

**Error Handling:**
* If stories table query fails: fall back to current behavior, log error
* If fields are null: use empty string, don't block generation
* If context exceeds reasonable length: truncate to first 500 characters

**Logging:**
* Log prompt character count before/after enhancement
* Log whether story context was available/used
* Log generation time impact
* All logs to existing logging infrastructure

---

## 11. Risk Analysis

### Technical Risks

**Risk:** Story context fields (story_context, narrative_tone, core_themes) are empty or low-quality
* **Probability:** Medium
* **Impact:** High (enhancement produces no improvement)
* **Mitigation:** Audit stories table before development, validate data exists for target episodes
* **Contingency:** If data is sparse, this becomes a data quality project, not a code project - halt Phase B

**Risk:** Additional context confuses Gemini, producing worse prompts
* **Probability:** Low
* **Impact:** High (degrades existing functionality)
* **Mitigation:** A/B test with 10 beats before full rollout, compare quality
* **Contingency:** Feature flag to disable enhancement, revert to current behavior

**Risk:** Token limits exceeded with additional context
* **Probability:** Low
* **Impact:** Medium (prompts truncated or failed)
* **Mitigation:** Monitor token usage, keep context under 500 characters total
* **Contingency:** Truncate context, prioritize themes over narrative_tone

### Adoption Risks

**Risk:** No measurable quality improvement (hypothesis is wrong)
* **Probability:** Medium (we have no evidence!)
* **Impact:** Medium (wasted effort, but limited to 1-2 weeks)
* **Mitigation:** Set clear success criteria (≥20% improvement), use A/B testing
* **Contingency:** If no improvement, document why, pivot to different approach or abandon

**Risk:** Manual quality evaluation is too subjective/inconsistent
* **Probability:** Medium
* **Impact:** Low (harder to validate, but can still use prompt richness metrics)
* **Mitigation:** Use multiple evaluators, define clear rubric, focus on objective metrics too
* **Contingency:** Rely on prompt richness metrics and marketing team feedback instead

### Integration Risks

**Risk:** Changes break existing prompt generation
* **Probability:** Low
* **Impact:** Critical (blocks image generation)
* **Mitigation:** Comprehensive testing, feature flag, fallback to current behavior
* **Contingency:** Immediate rollback capability, can disable in <5 minutes

**Risk:** Development takes longer than 2 weeks (scope creep)
* **Probability:** Medium
* **Impact:** Medium (delays validation, reduces ROI)
* **Mitigation:** Strict scope control, cut nice-to-haves aggressively, time-box to 2 weeks
* **Contingency:** Ship with reduced scope, defer marketing optimization if needed

---

## 12. Alternatives Considered

### Alternative 1: Start with Phase A (Plot Arc Aware Generation)
**Description:** Skip Phase B, go straight to plot arc aggregation
**Pros:** Higher potential quality improvement, more comprehensive solution
**Cons:** 3-4 week commitment without validation, more complex, higher risk
**Why Not Chosen:** No evidence problem exists, need quick validation first

### Alternative 2: Manual Prompt Enhancement (No Code)
**Description:** Marketing team manually enhances prompts with episode context
**Pros:** No development effort, immediate results, validates hypothesis
**Cons:** Not scalable, manual effort per beat, doesn't establish technical foundation
**Why Not Chosen:** Need technical foundation for Phases A/C, manual approach doesn't scale

### Alternative 3: Build Full Tracking System First
**Description:** Create comprehensive image quality tracking before enhancing prompts
**Pros:** Better data for decision-making, proper baseline
**Cons:** Delays actual enhancement, may be over-engineered for experimental phase
**Why Not Chosen:** Can do minimal tracking alongside enhancement, get results faster

### Alternative 4: Focus Only on Marketing Optimization (No Story Context)
**Description:** Just enhance marketing vertical template, skip story context injection
**Pros:** Even simpler, marketing has direct ROI
**Cons:** Doesn't validate episode context hypothesis, limits learning for Phase A
**Why Not Chosen:** Want to test context hypothesis while getting marketing wins

**Chosen Approach:** Phase B (Minimal Context + Marketing Optimization)
**Reasoning:** Balances quick validation, technical foundation, and marketing value. Sets up incremental learning path for Phases A and C.

---

## 13. Success Metrics

### Leading Indicators (Track During Development):

**Development Velocity:**
* Complete Phase B within 2-week time appetite (10 work days)
* Service implementation complete by day 5
* Testing and validation by day 8
* Documentation and lessons learned by day 10

**Technical Health:**
* Zero breaking changes to existing generation flow
* <10% increase in prompt generation time
* 100% test coverage for new storyContextService
* Zero increase in generation failure rate

**Context Availability:**
* Story context fields populated for ≥80% of target episodes
* Average context length: 200-500 characters
* Successful context injection rate: ≥95%

### Lagging Indicators (Track Post-Implementation):

**Image Quality (Manual Evaluation):**
* Quality score improvement: ≥20% increase (from baseline 6.5/10 to 7.8/10)
* Narrative depth score: ≥30% increase
* Marketing appeal score: ≥25% increase
* Evaluation sample size: 20 images (10 before, 10 after)

**Prompt Richness (Automated Metrics):**
* Average prompt character count: ≥30% increase (from ~200 to 260+)
* Narrative elements per prompt: ≥50% increase (theme mentions, emotional descriptors, etc.)
* Marketing vertical prompts: ≥40% longer than standard prompts

**Validation Confidence:**
* A/B test results show preference for enhanced prompts in ≥70% of comparisons
* Marketing team feedback: Positive on ≥80% of new marketing images
* Zero negative feedback on image quality regression

### Success Criteria:

**Primary:** Quality score improvement ≥20% OR prompt richness increase ≥30%
**Secondary:** Zero regressions in generation reliability or performance
**Tertiary:** Lessons learned document completed with insights for Phases A/C

**Proceed to Phase A if:** Primary criterion met AND secondary criterion met
**Revisit approach if:** Neither primary criterion met after 2-week implementation

---

## 14. Validation Plan

### Pre-Launch Validation:

**Data Quality Audit (Before Development Starts):**
* Query stories table for episodes 1-3
* Verify story_context, narrative_tone, core_themes are populated
* Check data quality (not just placeholder text)
* If <80% populated or low quality: Fix data before coding
* **Timeline:** Day 0 (before development)

**A/B Prompt Testing (During Development):**
* Generate 10 beats with current system (baseline)
* Generate same 10 beats with enhanced system
* Manual comparison: Which prompts are richer/better?
* Automated metrics: Character count, element count
* **Timeline:** Day 6-7 (after service implementation)

**Technical Testing:**
* Unit tests for storyContextService (100% coverage)
* Integration tests for enhanced prompt generation
* Performance testing (measure time impact)
* Error handling tests (missing data, query failures)
* **Timeline:** Day 5-7

### Phased Rollout Strategy:

**Phase B1 (Week 1 - Days 1-5): Implementation**
* Build storyContextService
* Modify promptGenerationService
* Create marketing vertical template enhancement
* Unit and integration testing

**Phase B2 (Week 2 - Days 6-8): Validation**
* A/B testing with 10 beats
* Manual quality evaluation
* Prompt richness metrics collection
* Marketing team feedback session

**Phase B3 (Week 2 - Days 9-10): Documentation & Decision**
* Complete lessons learned document
* Compile success metrics
* Make go/no-go decision for Phase A
* Update Phase A planning based on learnings

### Rollback Plan:

* **Feature flag:** `ENABLE_EPISODE_CONTEXT_ENHANCEMENT` (environment variable)
* **Rollback time:** <5 minutes (flip flag, restart service)
* **Rollback criteria:** If generation failure rate increases >5% OR quality scores decrease
* **Data safety:** No database changes, no risk of data loss

### Feedback Collection:

**Automated Metrics:**
* Prompt character count (before/after)
* Context injection success rate
* Generation time impact
* Token usage per prompt

**Manual Evaluation:**
* Quality scoring rubric (technical, narrative, emotional, marketing dimensions)
* A/B preference tracking
* Marketing team feedback survey
* Developer velocity tracking (for Phase A planning)

**Lessons Learned Capture:**
* `lessons-learned-phase-b.md` document
* Sections: What worked, what didn't, surprises, recommendations for Phase A/C
* Updated after validation week
* Used as input for Phase A PRD

---

## 15. Open Questions

### Questions to Resolve Before Development:

1. **Data Quality Check:** Are story_context, narrative_tone, core_themes actually populated and useful?
   - **Decision needed by:** Day 0 (before starting development)
   - **Owner:** Developer to run audit query

2. **Quality Evaluation Rubric:** What specific criteria will we use to score images 1-10?
   - **Decision needed by:** Day 1 (before baseline evaluation)
   - **Owner:** Product owner to define rubric

3. **Marketing Template Specifics:** What exact keywords/rules for marketing vertical optimization?
   - **Decision needed by:** Day 2 (before template implementation)
   - **Owner:** Developer to draft, product owner to approve

### Questions to Resolve During Development:

4. **Token Budget:** What's the maximum context length before we risk token limits?
   - **Decision needed by:** Day 5 (during testing)
   - **Owner:** Developer to test and set limit

5. **Fallback Behavior:** If story context is empty, use generic placeholder or skip enhancement entirely?
   - **Decision needed by:** Day 3 (during error handling implementation)
   - **Owner:** Developer decision, document in code

6. **Success Threshold:** If we get 15% improvement instead of 20%, is that enough to proceed to Phase A?
   - **Decision needed by:** Day 8 (during validation)
   - **Owner:** Product owner decision

### Questions to Inform Phase A Planning:

7. **Context Complexity:** Did adding minimal context cause AI confusion or help?
   - **Answer by:** End of Phase B
   - **Informs:** Whether Phase A should add more context or simplify

8. **Marketing Value:** Was marketing vertical optimization worth the effort?
   - **Answer by:** End of Phase B
   - **Informs:** Whether to continue marketing focus in Phase A

9. **Development Velocity:** Was 2-week timeline realistic for this scope?
   - **Answer by:** End of Phase B
   - **Informs:** Phase A time appetite estimation

10. **Data Gaps:** What story intelligence data is missing that would help in Phase A?
    - **Answer by:** End of Phase B
    - **Informs:** Phase A database queries and requirements

---

## 16. Lessons Learned Framework (For Phases A/C)

### Capture During Phase B:

**Technical Learnings:**
* What worked well in service architecture?
* What was harder than expected?
* Any unexpected technical challenges?
* Performance characteristics (actual vs. estimated)

**Quality Learnings:**
* Did episode context actually improve prompts?
* Which context elements were most valuable? (themes vs. tone vs. story_context)
* Did marketing optimization work as expected?
* Any surprising results from A/B testing?

**Process Learnings:**
* Was 2-week timeline realistic?
* Were requirements clear enough?
* Did scope creep occur? Where?
* What would we do differently?

**Data Learnings:**
* Data quality issues encountered
* Missing data that would have been helpful
* Whether existing tables have enough intelligence for Phase A

**User Impact Learnings:**
* Marketing team reaction
* Any unexpected use cases or requests
* Whether benefits matched expectations

### Use in Phase A/C Planning:

* Update time appetite estimates based on actual velocity
* Adjust scope based on what actually provided value
* Incorporate data quality findings into requirements
* Apply technical patterns that worked well
* Avoid rabbit holes encountered in Phase B

**Document Location:** `E:\repos\storyart\tasks\lessons-learned-phase-b.md`
**Owner:** Developer implementing Phase B
**Timeline:** Updated throughout development, finalized Day 10

---

## 17. Incremental Strategy: B → A → C

### Phase B (This PRD): Weeks 1-2
* Minimal story context (themes, tone)
* Marketing vertical optimization
* Evidence collection
* Foundation for Phase A

**Deliverables:**
* storyContextService.ts
* Enhanced marketing template
* Validation data (quality scores, metrics)
* Lessons learned document

**Decision Point:** Proceed to Phase A if ≥20% quality improvement OR ≥30% prompt richness increase

### Phase A (Next): Weeks 3-6
* Plot arc aggregation (active arcs for episode)
* Arc-aware prompt generation
* Build on Phase B's context service pattern
* Informed by Phase B lessons learned

**Prerequisites:**
* Phase B validation successful
* Lessons learned reviewed
* Data quality issues resolved

### Phase C (Future): Weeks 7-12
* Full episode intelligence service
* Character arc snapshots (new tables)
* Automated viral scoring
* Marketing intelligence layer

**Prerequisites:**
* Phase A validation successful
* Clear evidence of incremental value
* Learnings from both B and A incorporated

**Continuous Iteration:** Each phase builds on previous, with validation gates and lessons learned informing next phase.

---

## Document History

* **Version 1.0** - 2025-11-26 - Initial PRD creation (Phase B of incremental strategy)

---

*This PRD follows the enhanced methodology with problem evidence (acknowledged lack thereof), time appetite, risk analysis, validation planning, and lessons learned capture for incremental development.*
