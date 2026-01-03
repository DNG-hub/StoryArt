# Rule: Creating an Impact Map

## Goal

To guide an AI assistant in creating an Impact Map before writing a PRD. Impact mapping ensures strategic alignment by connecting features to business objectives and making assumptions explicit.

## When to Use

Use impact mapping when:
- Starting a new initiative or major feature
- Unsure if a feature is worth building
- Need to validate strategic alignment
- Want to explore alternative solutions
- Need to communicate value to stakeholders

## Process

1. **Receive Initiative Idea:** User describes what they want to build
2. **Ask Clarifying Questions:** Gather information about business context
3. **Create Impact Map:** Generate the impact map following the structure below
4. **Validate Assumptions:** Surface and document key assumptions
5. **Save Impact Map:** Save as `impact-map-[initiative-name].md` in `/tasks/`
6. **Proceed to PRD:** Use the highest-priority deliverable(s) from the impact map to create a PRD

## Clarifying Questions

Ask questions to understand the business context:

* **Business Goal:** "What measurable business outcome do we want to achieve?" (e.g., "Increase user retention by 20%", "Reduce support costs by $50K/year")
* **Timeline:** "By when do we need to achieve this goal?"
* **Current State:** "What is the current metric? Where are we now?"
* **Actors:** "Who can help or prevent us from reaching this goal?" (users, admins, customers, partners, etc.)
* **Desired Impacts:** "How do we want each actor's behavior to change?" (e.g., "New users complete onboarding faster", "Power users adopt advanced features")
* **Constraints:** "Are there any constraints on solutions?" (budget, time, technical limitations)
* **Risk/Regulatory (if applicable):** "Are there legal/compliance, safety, or reputational risks that constrain what we can do?"

## Impact Map Structure

The generated impact map should follow this structure:

```markdown
# Impact Map: [Initiative Name]

## Business Goal

**What:** [Specific, measurable objective]
**Why:** [Why this goal matters to the business]
**Measure:** [How we'll measure success]
**Target:** [Specific number/metric to hit]
**Timeline:** [By when]

## Current State

- **Current Metric:** [Where we are now]
- **Gap:** [Distance to goal]
- **Why Now:** [Why this goal is a priority now]

## Impact Map

### Actor: [User Type 1]

**Impact We Want:** [How we want this actor's behavior to change]

**Deliverables (Possible Solutions):**
1. **[Feature/Solution A]**
   - Description: [What it is]
   - Assumption: We believe this will create the impact because [reason]
   - Effort: [Small/Medium/Large - 1-2 weeks, 3-4 weeks, 5-6 weeks]
   - Value: [High/Medium/Low impact on the goal]
   - Validation: [How we’ll test the assumption cheaply before building fully]

2. **[Feature/Solution B]**
   - Description: [What it is]
   - Assumption: We believe this will create the impact because [reason]
   - Effort: [Small/Medium/Large]
   - Value: [High/Medium/Low]

### Actor: [User Type 2]

**Impact We Want:** [How we want this actor's behavior to change]

**Deliverables (Possible Solutions):**
1. **[Feature/Solution C]**
   - Description: [What it is]
   - Assumption: We believe this will create the impact because [reason]
   - Effort: [Small/Medium/Large]
   - Value: [High/Medium/Low]

## Key Assumptions

Document all critical assumptions that need to be true for this to work:

1. **Assumption:** [Statement]
   - **Risk if wrong:** [What happens if this assumption is false]
   - **How to validate:** [How we can test this assumption]

2. **Assumption:** [Statement]
   - **Risk if wrong:** [What happens if this assumption is false]
   - **How to validate:** [How we can test this assumption]

### Assumption-first recommendation
Prefer deliverables that can validate the highest-risk assumptions fastest (prototype, workflow change, experiment, policy update), not just software builds.

## Prioritization

Based on the impact map, prioritize deliverables:

**High Priority (Do First):**
- [Deliverable X] - High value, Small effort
- [Deliverable Y] - High value, Medium effort

**Medium Priority (Do Next):**
- [Deliverable Z] - Medium value, Small effort

**Low Priority (Consider Later):**
- [Deliverable W] - Low value or High effort

**Not Doing:**
- [Deliverable V] - Doesn't strongly support the goal

## Next Steps

1. **Validate Assumptions:** [Which assumptions need validation before building?]
2. **Create PRD:** For the highest-priority deliverable(s)
3. **Review Timeline:** Does the effort align with our timeline for the goal?

## Notes

- Impact maps are living documents - revisit as you learn
- Multiple deliverables can support the same impact
- Some impacts may not require any deliverables (process changes, training, etc.)
- Focus on impacts (behavior changes) not just deliverables (features)

---

*Generated using impact mapping methodology to ensure strategic alignment*
```

## Output

* **Format:** Markdown (`.md`)
* **Location:** `/tasks/`
* **Filename:** `impact-map-[initiative-name].md`

## After Creating Impact Map

1. **Review with user:** Present the impact map and get feedback
2. **Validate assumptions:** Discuss which assumptions are most critical
3. **Choose deliverable:** Select highest-priority deliverable(s) from the map
4. **Create PRD:** Use `create-prd.md` to create a PRD for the chosen deliverable
5. **Reference in PRD:** Link back to the impact map in the PRD for context

## Example

Here's a brief example of what an impact map might look like:

```markdown
# Impact Map: Improve User Retention

## Business Goal

**What:** Increase 30-day user retention by 20%
**Why:** Higher retention leads to better LTV and lower acquisition costs
**Measure:** Percentage of users still active after 30 days
**Target:** From 40% to 60% retention
**Timeline:** Next quarter (3 months)

## Impact Map

### Actor: New Users

**Impact We Want:** Complete onboarding within first session

**Deliverables:**
1. **Interactive Tutorial** - Small effort, High value
   - Assumption: New users are confused about core features
   - Validation: User interviews, analytics showing drop-off

2. **Quick Start Checklist** - Small effort, Medium value
   - Assumption: Users need guidance on first steps
   - Validation: Survey existing users about onboarding experience

### Actor: Returning Users

**Impact We Want:** Engage with advanced features

**Deliverables:**
1. **Feature Discovery Prompts** - Medium effort, High value
   - Assumption: Users don't know advanced features exist
   - Validation: Feature usage analytics

## Prioritization

**High Priority:**
- Interactive Tutorial (High value, Small effort)
- Feature Discovery Prompts (High value, Medium effort)

**Next:** Create PRD for Interactive Tutorial
```

This template ensures features are tied to business goals and assumptions are explicit before diving into implementation.
