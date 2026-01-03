# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a detailed Product Requirements Document (PRD) in Markdown format, based on an initial user prompt. The PRD should be clear, actionable, and suitable for a junior developer to understand and implement the feature.

## Process

1.  **Receive Initial Prompt:** The user provides a brief description or request for a new feature or functionality.
2.  **Ask Clarifying Questions:** Before writing the PRD, the AI *must* ask clarifying questions to gather sufficient detail. The goal is to understand the "what" and "why" of the feature, not necessarily the "how" (which the developer will figure out). Make sure to provide options in letter/number lists so I can respond easily with my selections.
3.  **Generate PRD:** Based on the initial prompt and the user's answers to the clarifying questions, generate a PRD using the structure outlined below.
4.  **Save PRD:** Save the generated document as `prd-[feature-name].md` inside the `/tasks` directory.

## Clarifying Questions (Examples)

The AI should adapt its questions based on the prompt, but here are some common areas to explore:

*   **Problem Evidence (Required):** "What evidence do we have that this problem exists? (e.g., user feedback, support tickets, analytics data, customer interviews)"
*   **Problem/Goal:** "What problem does this feature solve for the user?" or "What is the main goal we want to achieve with this feature?"
*   **Time Appetite:** "How much time is this feature worth? [Small batch: 1-2 weeks | Medium batch: 3-4 weeks | Large batch: 5-6 weeks]"
*   **Target User:** "Who is the primary user of this feature?"
*   **Core Functionality:** "Can you describe the key actions a user should be able to perform with this feature?"
*   **User Stories:** "Could you provide a few user stories? (e.g., As a [type of user], I want to [perform an action] so that [benefit].)" For better clarity, consider job stories: "When [situation], I want to [motivation], so I can [expected outcome]"
*   **Acceptance Criteria:** "How will we know when this feature is successfully implemented? What are the key success criteria?"
*   **Scope/Boundaries:** "Are there any specific things this feature *should not* do (non-goals)? Any known complexity traps to avoid (rabbit holes)?"
*   **Data Requirements:** "What kind of data does this feature need to display or manipulate?"
*   **Design/UI:** "Are there any existing design mockups or UI guidelines to follow?" or "Can you describe the desired look and feel?"
*   **Edge Cases:** "Are there any potential edge cases or error conditions we should consider?"
*   **Risk Analysis:** "What could go wrong? (Technical risks? Adoption risks? Integration risks?)"
*   **Alternatives:** "What other approaches did you consider? Why this approach over others?"

## PRD Structure

The generated PRD should include the following sections:

1.  **Introduction/Overview:** Briefly describe the feature and the problem it solves. State the goal.
2.  **Problem Evidence (Required):** Document the evidence that this problem exists. Include:
    *   Customer feedback/quotes
    *   Usage data showing the problem
    *   Support tickets related to the issue
    *   User research findings
    *   Any other data validating the need
3.  **Time Appetite:** Specify the time budget for this feature:
    *   Small Batch: 1-2 weeks
    *   Medium Batch: 3-4 weeks
    *   Large Batch: 5-6 weeks
4.  **Goals:** List the specific, measurable objectives for this feature.
5.  **User Stories / Job Stories:** Detail the user narratives describing feature usage and benefits. Consider using job story format for clarity: "When [situation], I want to [motivation], so I can [expected outcome]"
6.  **Functional Requirements:** List the specific functionalities the feature must have. Use clear, concise language (e.g., "The system must allow users to upload a profile picture."). Number these requirements and categorize by priority:
    *   **Core (Must Ship):** Essential functionality
    *   **Nice-to-Have:** Can be cut if time runs short
    *   **Future Work:** Explicitly deferred to later
7.  **Non-Goals (Out of Scope):** Clearly state what this feature will *not* include to manage scope.
8.  **Rabbit Holes to Avoid:** Known complexity traps or areas that could consume excessive time without proportional value.
9.  **Design Considerations (Optional):** Link to mockups, describe UI/UX requirements, or mention relevant components/styles if applicable.
10. **Technical Considerations (Optional):** Mention any known technical constraints, dependencies, or suggestions (e.g., "Should integrate with the existing Auth module").
11. **Risk Analysis:** Identify potential risks and mitigation strategies:
    *   **Technical Risks:** What could go wrong technically? How will we mitigate?
    *   **Adoption Risks:** Why might users not use this? How will we address?
    *   **Integration Risks:** What dependencies exist? What's our contingency?
12. **Alternatives Considered:** Document other approaches considered and why this approach was chosen. This preserves decision-making context.
13. **Success Metrics:** How will the success of this feature be measured?
    *   **Leading Indicators:** Metrics to track during development
    *   **Lagging Indicators:** Metrics to track post-launch
    *   **Success Criteria:** When do we consider this successful?
14. **Validation Plan (Optional but Recommended):** How will we validate this works?
    *   Beta testing approach?
    *   A/B testing plan?
    *   Phased rollout strategy?
    *   Feedback collection mechanism?
15. **Open Questions:** List any remaining questions or areas needing further clarification.

### Additional sections (use when relevant)
These are optional, but strongly recommended when applicable:

16. **Data, Privacy, and Compliance (Recommended):**
    * What data is processed/stored? (classify sensitivity)
    * Data residency constraints?
    * Retention / deletion expectations?
    * Regulatory constraints (if any)?

17. **Observability & Rollout (Recommended):**
    * Key logs/metrics/traces required to operate this feature
    * Rollout plan (feature flags, phased rollout, rollback criteria)

18. **LLM/Agent Safety & Evals (Only if AI is involved):**
    * Model/tool boundaries (tool allowlist, permission model)
    * Structured output requirements (schemas)
    * Eval plan: golden set + regression checks
    * Abuse cases: prompt injection, data exfiltration, unsafe actions, hallucinated citations

If you include Section 18, also reference:
- `PRD workflows/llm-agent-evals-checklist.md`

## Target Audience

Assume the primary reader of the PRD is a **junior developer**. Therefore, requirements should be explicit, unambiguous, and avoid jargon where possible. Provide enough detail for them to understand the feature's purpose and core logic.

## Output

*   **Format:** Markdown (`.md`)
*   **Location:** `/tasks/`
*   **Filename:** `prd-[feature-name].md`

## Final instructions

1. Do NOT start implementing the PRD
2. Make sure to ask the user clarifying questions
3. Take the user's answers to the clarifying questions and improve the PRD