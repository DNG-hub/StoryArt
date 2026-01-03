# Rule: Conducting a Pre-Mortem

## Goal

To guide an AI assistant in conducting a pre-mortem analysis before implementing a feature. A pre-mortem imagines the feature has failed and works backwards to identify risks and mitigation strategies.

## When to Use

Use a pre-mortem when:
- About to start a complex or high-risk feature
- Stakeholders have concerns about feasibility
- Feature involves new technology or approaches
- Timeline is tight or budget is limited
- Working on a critical business feature

## Process

1. **Receive PRD Reference:** User points to a PRD or describes the feature
2. **Set the Scenario:** Frame the exercise - "It's 6 months from now. This feature has failed."
3. **Brainstorm Failure Modes:** Identify ways the feature could fail
4. **Document Risks:** Categorize and document each risk
5. **Plan Mitigation:** For each risk, identify prevention/mitigation strategies
6. **Create Action Items:** Generate specific tasks to address high-priority risks
7. **Save Pre-Mortem:** Save as `pre-mortem-[feature-name].md` in `/tasks/`

## Pre-Mortem Questions

Ask questions to surface different failure modes:

* **Technical Failures:** "What technical problems could prevent this from working?"
* **Adoption Failures:** "Why might users not use this feature?"
* **Integration Failures:** "What dependencies could break or not work as expected?"
* **Scope Failures:** "Why might we not finish on time or within budget?"
* **User Experience Failures:** "How might the UX confuse or frustrate users?"
* **Performance Failures:** "What could make this too slow or resource-intensive?"
* **Security Failures:** "What security vulnerabilities might we introduce?"
* **Data Failures:** "What could go wrong with data integrity or accuracy?"
* **AI/LLM Failures (if applicable):**
  - "How could prompt injection cause unsafe behavior or incorrect outputs?"
  - "Could the model leak sensitive data in outputs or logs?"
  - "Could the model fabricate facts/citations and be trusted incorrectly?"
  - "Could tool-use/agent actions do the wrong thing (wrong target, wrong environment)?"
  - "How will we detect silent quality regressions when prompts/models change?"

If the PRD includes AI/agents, use the checklist:
- `PRD workflows/llm-agent-evals-checklist.md`

## Pre-Mortem Document Structure

```markdown
# Pre-Mortem: [Feature Name]

## Scenario

It's [timeline - e.g., 6 months] from now. The [feature name] feature has failed. It either:
- Wasn't completed on time
- Was completed but users don't use it
- Was completed but has critical bugs/issues
- Caused other problems (performance, security, etc.)

**What went wrong?**

## Failure Modes and Mitigation

### 1. Technical Failure Modes

#### [Specific Technical Risk 1]
**Failure Scenario:** [Describe what went wrong]
**Probability:** [High/Medium/Low]
**Impact:** [Critical/High/Medium/Low]
**Mitigation Strategy:**
- **Prevention:** [How we'll prevent this from happening]
- **Detection:** [How we'll know if it's happening]
- **Recovery:** [What we'll do if it happens]
**Action Items:**
- [ ] [Specific task to address this risk]
- [ ] [Specific task to address this risk]

#### [Specific Technical Risk 2]
**Failure Scenario:** [Describe what went wrong]
**Probability:** [High/Medium/Low]
**Impact:** [Critical/High/Medium/Low]
**Mitigation Strategy:**
- **Prevention:** [How we'll prevent this from happening]
- **Detection:** [How we'll know if it's happening]
- **Recovery:** [What we'll do if it happens]
**Action Items:**
- [ ] [Specific task to address this risk]

### 2. Adoption Failure Modes

#### [Specific Adoption Risk 1]
**Failure Scenario:** [Describe why users didn't adopt]
**Probability:** [High/Medium/Low]
**Impact:** [Critical/High/Medium/Low]
**Mitigation Strategy:**
- **Prevention:** [How we'll ensure adoption]
- **Detection:** [Metrics to track adoption]
- **Recovery:** [How we'll course-correct if adoption is low]
**Action Items:**
- [ ] [Specific task to address this risk]
- [ ] [Specific task to address this risk]

### 3. Integration Failure Modes

#### [Specific Integration Risk 1]
**Failure Scenario:** [Describe what integration failed]
**Probability:** [High/Medium/Low]
**Impact:** [Critical/High/Medium/Low]
**Mitigation Strategy:**
- **Prevention:** [How we'll ensure integration works]
- **Detection:** [How we'll test integrations]
- **Recovery:** [Fallback if integration fails]
**Action Items:**
- [ ] [Specific task to address this risk]

### 4. Scope/Timeline Failure Modes

#### [Specific Scope Risk 1]
**Failure Scenario:** [Describe why we didn't finish on time]
**Probability:** [High/Medium/Low]
**Impact:** [Critical/High/Medium/Low]
**Mitigation Strategy:**
- **Prevention:** [How we'll control scope]
- **Detection:** [How we'll track progress]
- **Recovery:** [What we'll cut if needed]
**Action Items:**
- [ ] [Specific task to address this risk]

### 5. Other Failure Modes

#### [Specific Other Risk]
**Failure Scenario:** [Describe what went wrong]
**Probability:** [High/Medium/Low]
**Impact:** [Critical/High/Medium/Low]
**Mitigation Strategy:**
- **Prevention:** [How we'll prevent this]
- **Detection:** [How we'll detect this]
- **Recovery:** [How we'll recover]
**Action Items:**
- [ ] [Specific task to address this risk]

## Risk Matrix

**Critical Risks (High Probability + High Impact):**
1. [Risk name] - **MUST ADDRESS**
2. [Risk name] - **MUST ADDRESS**

**High Priority (High Probability OR High Impact):**
1. [Risk name] - **SHOULD ADDRESS**
2. [Risk name] - **SHOULD ADDRESS**

**Medium Priority:**
1. [Risk name] - Monitor
2. [Risk name] - Monitor

**Low Priority:**
1. [Risk name] - Accept risk
2. [Risk name] - Accept risk

## Pre-Implementation Action Plan

Before starting implementation, we must:

**Critical Actions (Complete Before Starting):**
- [ ] [Action item from critical risk]
- [ ] [Action item from critical risk]
- [ ] [Action item from critical risk]

**High Priority Actions (Complete in Sprint 0):**
- [ ] [Action item from high priority risk]
- [ ] [Action item from high priority risk]

**Ongoing Monitoring:**
- [ ] Set up [metric/alert] to detect [risk]
- [ ] Weekly check on [risk indicator]

## Assumptions to Validate

List assumptions that, if wrong, would cause failure:

1. **Assumption:** [Statement]
   - **Validation Method:** [How we'll test this]
   - **Timeline:** [When we'll validate]
   - **Risk if Wrong:** [What happens]

2. **Assumption:** [Statement]
   - **Validation Method:** [How we'll test this]
   - **Timeline:** [When we'll validate]
   - **Risk if Wrong:** [What happens]

## Contingency Plans

**If technical issues prove insurmountable:**
- **Plan A:** [Alternative approach]
- **Plan B:** [Simplified version]
- **Plan C:** [Abandon and pivot to alternative solution]

**If users don't adopt:**
- **Plan A:** [Enhanced onboarding/education]
- **Plan B:** [Simplify UX]
- **Plan C:** [Remove feature, learn from failure]

**If timeline slips:**
- **Plan A:** [Reduce scope to core features]
- **Plan B:** [Extend timeline with stakeholder approval]
- **Plan C:** [Delay launch, complete properly]

## Success Criteria Review

Given the identified risks, are our success criteria still appropriate?

**Current Success Criteria (from PRD):**
- [Criterion 1]
- [Criterion 2]

**Adjustments Needed:**
- [Modify criterion based on risk analysis]
- [Add criterion to address identified risk]

## Decision: Proceed or Pivot?

Based on this pre-mortem:

**Recommendation:** [Proceed / Proceed with Modifications / Reconsider Approach]

**Reasoning:** [Why this recommendation]

**Required Changes to Proceed:**
- [Change to PRD or approach]
- [Additional resources needed]
- [Timeline adjustment needed]

---

*Pre-mortem completed. Update PRD and task list based on identified risks and action items.*
```

## Output

* **Format:** Markdown (`.md`)
* **Location:** `/tasks/`
* **Filename:** `pre-mortem-[feature-name].md`

## After Conducting Pre-Mortem

1. **Review with team:** Share identified risks and get additional input
2. **Prioritize action items:** Determine which risks must be addressed before starting
3. **Update PRD:** Add critical mitigations to the PRD's Risk Analysis section
4. **Update task list:** Add pre-implementation tasks from critical/high priority action items
5. **Set up monitoring:** Implement detection mechanisms for ongoing risks
6. **Proceed or pivot:** Decide whether to proceed based on risk assessment

## Example

Here's a brief example of a pre-mortem:

```markdown
# Pre-Mortem: User Profile Editing Feature

## Scenario

It's 3 months from now. The user profile editing feature has failed.

## Failure Modes

### 1. Technical Failure: Data Loss

**Failure Scenario:** Users reported lost profile data after editing
**Probability:** Medium
**Impact:** Critical (damages trust, loses user data)
**Mitigation:**
- **Prevention:** Implement optimistic locking, validation before save
- **Detection:** Add save success/failure logging and alerts
- **Recovery:** Automatic backups before changes, rollback capability
**Action Items:**
- [ ] Add database transaction handling with rollback
- [ ] Implement pre-save validation with clear error messages
- [ ] Create automated backup mechanism
- [ ] Add comprehensive save operation logging

### 2. Adoption Failure: Users Can't Find Feature

**Failure Scenario:** Analytics show only 5% of users discovered the edit profile button
**Probability:** High (based on similar features)
**Impact:** High (feature unused, wasted development)
**Mitigation:**
- **Prevention:** Prominent UI placement, onboarding tooltip
- **Detection:** Track edit profile button clicks vs. profile views
- **Recovery:** A/B test different placements, add banner prompts
**Action Items:**
- [ ] User testing on UI placement before development
- [ ] Implement analytics for feature discovery
- [ ] Plan week 1 review of adoption metrics

## Risk Matrix

**Critical Risks:**
1. Data Loss - **MUST ADDRESS** (Add transaction handling, validation, backups)

**High Priority:**
1. Poor Feature Discovery - **SHOULD ADDRESS** (User testing, analytics)

## Pre-Implementation Action Plan

**Before Starting:**
- [ ] Implement robust transaction handling pattern
- [ ] Set up save operation logging
- [ ] User test profile edit UI placement

## Decision: Proceed with Modifications

Add data integrity tasks to sprint 0, conduct user testing before finalizing UI.
```

This template helps surface risks early, when they're easier and cheaper to address.
