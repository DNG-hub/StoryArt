# Task List: Episode Context Enhancement - Phase B

**PRD:** prd-episode-context-phase-b.md
**Time Appetite:** Small Batch (1-2 weeks / 10 work days)
**Created:** 2025-11-26
**Status:** Planning

---

## Relevant Files

### Existing Files (Will Modify)
- `services/promptGenerationService.ts` - Add story context injection into system instruction
- `services/databaseContextService.ts` - Add `getStoryContext()` function
- `types.ts` - Add `StoryContextData` interface

### New Files (Will Create)
- `services/storyContextService.ts` - Minimal story context aggregation service (<100 lines)
- `tests/storyContextService.test.ts` - Unit tests for story context service
- `docs/lessons-learned-phase-b.md` - Lessons learned documentation
- `tasks/data-quality-baseline.md` - Baseline quality measurements

###Notes

- Unit tests should be placed alongside code files (e.g., `services/storyContextService.test.ts`)
- Use `npm test` to run all tests
- Follow DEVELOPMENT_GUIDELINES.md - use real data, not mock data
- All database access via Docker exec or existing databaseContextService

---

## Task States

- `[ ]` **Not Started**: Task hasn't been begun yet
- `[~]` **Figuring Out (Uphill)**: Currently working on approach, researching, or making decisions
- `[>]` **Executing (Downhill)**: Clear path forward, implementing the solution
- `[x]` **Complete**: Task is finished and verified

---

## Definition of Done

Every task must meet these criteria before being marked complete `[x]`:

- [ ] Code implemented as specified in the task
- [ ] Unit tests written and passing (if applicable)
- [ ] Code reviewed (self-review minimum)
- [ ] Documentation updated (inline comments, README, API docs as needed)
- [ ] No new linter warnings or errors introduced
- [ ] Uses real data (not mock data) per DEVELOPMENT_GUIDELINES.md
- [ ] Performance acceptable (no obvious bottlenecks)
- [ ] Error handling implemented (graceful degradation)

---

## Tasks

### 1.0 Data Quality Baseline and Environment Setup

- [ ] 1.1 Run data quality audit and confirm Phase B readiness (verify story_context, narrative_tone, core_themes exist and are comprehensive)
- [ ] 1.2 Create baseline measurements (generate 10 prompts with current system, measure character count, save for comparison)
- [ ] 1.3 Define quality evaluation rubric (technical quality, narrative depth, emotional impact, marketing appeal - 1-10 scale with specific criteria for each level)
- [ ] 1.4 Verify database access from StoryArt application (test that databaseContextService can connect, query stories table)
- [ ] **1.5 TESTING CHECKPOINT**: Verify database access works, baseline data collected
- [ ] **1.6 DOCUMENTATION**: Document baseline measurements, rubric criteria
- [ ] **1.7 COMMIT**: `git add -A && git commit -m "feat(phase-b): Add data quality baseline and evaluation rubric" && git push`

### 2.0 Story Context Service Implementation

- [ ] 2.1 Create `StoryContextData` interface in types.ts (story_context, narrative_tone, core_themes fields)
- [ ] 2.2 Create `services/storyContextService.ts` with `getStoryContext(storyId)` function
- [ ] 2.3 Implement real database query (use existing databaseContextService pattern, query stories table for story_context, narrative_tone, core_themes)
- [ ] 2.4 Add error handling and fallback logic (if query fails: log error, return null; if fields are null/empty: return null, log warning)
- [ ] 2.5 Add basic caching (5-minute TTL to avoid repeated queries during batch prompt generation)
- [ ] **2.6 TESTING CHECKPOINT**: Unit test getStoryContext with real database, verify returns correct data, test error handling
- [ ] **2.7 DOCUMENTATION**: Add JSDoc comments explaining function, parameters, return values, error cases
- [ ] **2.8 COMMIT**: `git add -A && git commit -m "feat(phase-b): Implement storyContextService with real database access" && git push`

### 3.0 System Instruction Template Enhancement

- [ ] 3.1 Analyze current system instruction in promptGenerationService.ts (locate where system instruction is built, understand current structure)
- [ ] 3.2 Design episode context injection pattern (where to insert story context, how to format it, keep under 500 chars total)
- [ ] 3.3 Create new template section for episode-wide context (add after existing production standards, before workflow instructions)
- [ ] 3.4 Implement context injection logic (call storyContextService.getStoryContext(), inject into system instruction if available, graceful skip if null)
- [ ] 3.5 Add token usage tracking (log character count before/after context injection to measure impact)
- [ ] **3.6 TESTING CHECKPOINT**: Generate 5 test prompts with context injection, verify context appears in system instruction, measure token impact
- [ ] **3.7 DOCUMENTATION**: Document new system instruction structure, explain context injection logic
- [ ] **3.8 COMMIT**: `git add -A && git commit -m "feat(phase-b): Add episode-wide story context to system instruction" && git push`

### 4.0 Marketing Vertical Template Optimization

- [ ] 4.1 Identify marketing vertical generation code (find where marketingVertical prompts are generated in promptGenerationService.ts)
- [ ] 4.2 Define marketing optimization keywords (dramatic composition, Rule of Thirds, leading lines, emotional intensity, thumbnail-worthy framing, high contrast, clear focal point)
- [ ] 4.3 Create enhanced marketing template (separate template variant with marketing keywords, emphasis on visual drama and hooks)
- [ ] 4.4 Implement template selection logic (if generating marketing vertical, use enhanced template; else use standard template)
- [ ] 4.5 Add marketing-specific context formatting (emphasize core_themes in marketing template for hook potential)
- [ ] **4.6 TESTING CHECKPOINT**: Generate 5 marketing vertical prompts, compare to standard prompts, verify marketing keywords present
- [ ] **4.7 DOCUMENTATION**: Document marketing template enhancements, explain keyword choices
- [ ] **4.8 COMMIT**: `git add -A && git commit -m "feat(phase-b): Add marketing vertical template optimization" && git push`

### 5.0 Evidence Collection System

- [ ] 5.1 Create prompt richness tracking (log prompt character count, count narrative elements like theme mentions, emotional descriptors)
- [ ] 5.2 Implement A/B comparison logging (for each beat, log both current and enhanced prompt side-by-side for manual review)
- [ ] 5.3 Add generation metadata tracking (track context injection success rate, token usage, generation time impact)
- [ ] 5.4 Create simple metrics export (save metrics to JSON file: `phase-b-metrics-YYYY-MM-DD.json`)
- [ ] **5.5 TESTING CHECKPOINT**: Generate 10 beats, verify all metrics are captured, review metrics export file
- [ ] **5.6 DOCUMENTATION**: Document metrics format, explain how to analyze them
- [ ] **5.7 COMMIT**: `git add -A && git commit -m "feat(phase-b): Add evidence collection and metrics tracking" && git push`

### 6.0 Integration Testing and Validation

- [ ] 6.1 Generate enhanced prompts for 20 beats (10 from Episode 1, 10 from Episode 2 if available)
- [ ] 6.2 Run A/B comparison (compare enhanced vs. baseline prompts, measure character count increase, narrative element increase)
- [ ] 6.3 Calculate improvement metrics (% increase in prompt richness, context injection success rate, average token impact)
- [ ] 6.4 Manual quality evaluation (use rubric from task 1.3, evaluate 10 enhanced prompts, score 1-10 on each dimension)
- [ ] 6.5 Check for regressions (verify no increase in generation failures, no excessive generation time increase >10%, prompts still under token limits)
- [ ] **6.6 TESTING CHECKPOINT**: All tests passing, metrics show ≥20% quality improvement OR ≥30% prompt richness increase
- [ ] **6.7 DOCUMENTATION**: Document test results, improvement metrics, any issues found
- [ ] **6.8 COMMIT**: `git add -A && git commit -m "test(phase-b): Complete integration testing and validation" && git push`

### 7.0 Lessons Learned and Phase A Planning

- [ ] 7.1 Review what worked well (technical approach, service architecture, database access patterns, testing approach)
- [ ] 7.2 Document what was harder than expected (database access issues, token management, template design complexity)
- [ ] 7.3 Capture data quality insights (which context fields were most valuable, data completeness observations, missing data that would help)
- [ ] 7.4 Document process insights (was 2-week timeline realistic, were requirements clear, did scope creep occur)
- [ ] 7.5 Create recommendations for Phase A (architectural patterns to reuse, avoid these rabbit holes, estimate Phase A complexity based on Phase B learnings)
- [ ] **7.6 TESTING CHECKPOINT**: Review lessons learned document with stakeholder, confirm Phase A readiness decision
- [ ] **7.7 DOCUMENTATION**: Complete `docs/lessons-learned-phase-b.md` with all sections
- [ ] **7.8 COMMIT**: `git add -A && git commit -m "docs(phase-b): Complete lessons learned and Phase A recommendations" && git push`

### 8.0 Phase B Completion and Decision Gate

- [ ] 8.1 Compile success metrics (quality score improvement %, prompt richness increase %, context injection success rate %, generation reliability maintained)
- [ ] 8.2 Determine Phase A go/no-go (if ≥20% quality improvement OR ≥30% prompt richness: GO; else: REVISIT)
- [ ] 8.3 Create Phase B summary report (executive summary of results, key metrics, lessons learned, Phase A recommendation)
- [ ] 8.4 Update Phase A PRD based on learnings (incorporate lessons learned, adjust time appetite if needed, update technical approach based on what worked)
- [ ] **8.5 TESTING CHECKPOINT**: Final validation that all Phase B goals met, no critical issues remain
- [ ] **8.6 DOCUMENTATION**: Complete Phase B summary report, update project documentation
- [ ] **8.7 COMMIT**: `git add -A && git commit -m "feat(phase-b): Complete Phase B implementation and validation" && git push`

---

## Schedule (10 Work Days)

### Week 1 (Days 1-5): Implementation

- **Day 1:** Tasks 1.0 (baseline), 2.0 (story context service)
- **Day 2-3:** Tasks 3.0 (system instruction enhancement)
- **Day 4:** Task 4.0 (marketing templates)
- **Day 5:** Task 5.0 (evidence collection), start 6.0 (testing)

### Week 2 (Days 6-10): Validation and Documentation

- **Day 6-7:** Complete 6.0 (integration testing and validation)
- **Day 8:** Task 7.0 (lessons learned)
- **Day 9:** Task 8.0 (completion and decision gate)
- **Day 10:** Buffer for fixes, final review, stakeholder presentation

---

## Success Criteria

**Primary (Must Achieve):**
- [ ] Quality score improvement ≥20% (from baseline ~6.5/10 to ≥7.8/10) OR
- [ ] Prompt richness increase ≥30% (from ~200 chars to ≥260 chars with narrative elements)

**Secondary (Must Maintain):**
- [ ] Zero increase in generation failure rate
- [ ] Generation time increase <10%
- [ ] All prompts within token limits

**Tertiary (Strongly Desired):**
- [ ] Lessons learned document complete
- [ ] Clear Phase A recommendations
- [ ] Evidence of marketing vertical improvement

---

## Risk Mitigation

### Risk: Story context fields empty or low quality
- **Detection:** Task 1.1 data quality audit
- **Mitigation:** Halt if data quality insufficient, fix data first
- **Status:** ✓ MITIGATED - Data quality audit shows READY status

### Risk: Context injection confuses AI
- **Detection:** Task 6.3 quality evaluation
- **Mitigation:** A/B testing shows if quality degrades
- **Response:** Remove or simplify context if quality decreases

### Risk: Token limits exceeded
- **Detection:** Task 5.3 metadata tracking
- **Mitigation:** Keep context under 500 chars, truncate if needed
- **Response:** Reduce context length or prioritize fields

### Risk: Scope creep (exceeds 2 weeks)
- **Detection:** Daily progress tracking
- **Mitigation:** Strict scope control, cut nice-to-haves
- **Response:** Defer marketing templates or evidence collection if needed

---

## Notes

- **Real Data Requirement:** All testing must use real database data per DEVELOPMENT_GUIDELINES.md
- **Docker Access:** Database queries must use Docker exec method documented in .env files
- **Incremental Development:** Each task should be completable in <1 day, allowing daily progress checks
- **Testing Emphasis:** Every major task section ends with testing checkpoint to catch issues early
- **Documentation Emphasis:** Capture lessons learned continuously, not just at end

---

**Last Updated:** 2025-11-26
**Status:** Ready for Implementation
**Data Quality:** READY (see data-quality-audit-report-2025-11-26.md)
