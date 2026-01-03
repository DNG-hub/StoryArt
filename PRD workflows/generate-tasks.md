# Rule: Generating a Task List from a PRD

## Goal

To guide an AI assistant in creating a detailed, step-by-step task list in Markdown format based on an existing Product Requirements Document (PRD). The task list should guide a developer through implementation.

## Output

- **Format:** Markdown (`.md`)
- **Location:** `/tasks/`
- **Filename:** `tasks-[prd-file-name].md` (e.g., `tasks-prd-user-profile-editing.md`)

## Process

1.  **Receive PRD Reference:** The user points the AI to a specific PRD file
2.  **Analyze PRD:** The AI reads and analyzes the functional requirements, user stories, and other sections of the specified PRD.
3.  **Assess Current State:** Review the existing codebase to understand existing infrastructre, architectural patterns and conventions. Also, identify any existing components or features that already exist and could be relevant to the PRD requirements. Then, identify existing related files, components, and utilities that can be leveraged or need modification.
4.  **Phase 1: Generate Parent Tasks:** Based on the PRD analysis and current state assessment, create the file and generate the main, high-level tasks required to implement the feature. Use your judgement on how many high-level tasks to use. It's likely to be about
5. **Inform the user:** Present these tasks to the user in the specified format (without sub-tasks yet) For example, say "I have generated the high-level tasks based on the PRD. Ready to generate the sub-tasks? Respond with 'Go' to proceed." .
6.  **Wait for Confirmation:** Pause and wait for the user to respond with "Go".
7.  **Phase 2: Generate Sub-Tasks:** Once the user confirms, break down each parent task into smaller, actionable sub-tasks necessary to complete the parent task. Ensure sub-tasks logically follow from the parent task, cover the implementation details implied by the PRD, and consider existing codebase patterns where relevant without being constrained by them.
8.  **Identify Relevant Files:** Based on the tasks and PRD, identify potential files that will need to be created or modified. List these under the `Relevant Files` section, including corresponding test files if applicable.
9.  **Generate Final Output:** Combine the parent tasks, sub-tasks, relevant files, and notes into the final Markdown structure.
10.  **Save Task List:** Save the generated document in the `/tasks/` directory with the filename `tasks-[prd-file-name].md`, where `[prd-file-name]` matches the base name of the input PRD file (e.g., if the input was `prd-user-profile-editing.md`, the output is `tasks-prd-user-profile-editing.md`).

### Additional task guidance (when applicable)
- If the PRD includes **LLMs/agents**, the task list MUST include:
  - an **eval set** (golden inputs + expected constraints/outputs)
  - a **regression harness** to re-run evals on prompt/model changes
  - explicit **safety tasks** (prompt injection tests, data leakage tests, tool allowlisting)
- If the PRD includes **sensitive data**, the task list MUST include:
  - data classification review
  - retention/deletion behavior validation
  - access control checks
  - audit logging verification

## Output Format

The generated task list _must_ follow this structure:

```markdown
## Relevant Files

- `path/to/potential/file1.ts` - Brief description of why this file is relevant (e.g., Contains the main component for this feature).
- `path/to/file1.test.ts` - Unit tests for `file1.ts`.
- `path/to/another/file.tsx` - Brief description (e.g., API route handler for data submission).
- `path/to/another/file.test.tsx` - Unit tests for `another/file.tsx`.
- `lib/utils/helpers.ts` - Brief description (e.g., Utility functions needed for calculations).
- `lib/utils/helpers.test.ts` - Unit tests for `helpers.ts`.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

### Task States

Tasks can be in one of four states to provide better visibility into progress:

- `[ ]` **Not Started**: Task hasn't been begun yet
- `[~]` **Figuring Out (Uphill)**: Currently working on approach, researching, or making decisions
- `[>]` **Executing (Downhill)**: Clear path forward, implementing the solution
- `[x]` **Complete**: Task is finished and verified

Use these states to show progress and identify blockers. Update task state as you work.

### Definition of Done

Every task must meet these criteria before being marked complete `[x]`:

- [ ] Code implemented as specified in the task
- [ ] Unit tests written and passing (if applicable)
- [ ] Code reviewed (if working in a team)
- [ ] Documentation updated (inline comments, README, API docs as needed)
- [ ] No new linter warnings or errors introduced
- [ ] Accessibility checked (if UI component)
- [ ] Performance acceptable (no obvious bottlenecks)
- [ ] Security reviewed (if handling user data, authentication, etc.)

### Testing and Validation Workflow

The task list **must** include testing checkpoints, documentation steps, and git commit steps at appropriate intervals:

**Testing Checkpoints:**
- Add a testing checkpoint after each major parent task section (e.g., after task 1.0, 2.0, etc.)
- Testing checkpoint tasks should be marked clearly: `**X.Y TESTING CHECKPOINT**: [description]`
- Testing checkpoints should verify:
  - Code compiles/runs without errors
  - Unit tests pass (if applicable)
  - Integration tests pass (if applicable)
  - Manual validation (if applicable)

**Documentation Steps:**
- Add a documentation step after each testing checkpoint
- Documentation tasks should be marked: `**X.Y DOCUMENTATION**: [description]`
- Documentation should capture:
  - What was implemented
  - Any changes from the original plan
  - Test results and validation
  - Fixes applied to make tests pass

**Git Commit Steps:**
- Add a commit step after each documentation step (at the end of every parent task/feature).
- Commit tasks should be marked: `**X.Y COMMIT**: [git command]`
- Use **Conventional Commits**. For new features, use `feat:`. For bug fixes, use `fix:`.
- Include the full git command: `git add . && git commit -m "feat: [brief description]" && git push`

**Example Structure:**
```markdown
- [ ] 1.0 Parent Task
  - [~] 1.1 Implementation task (currently figuring out approach)
  - [ ] 1.2 Implementation task
  - [ ] **1.3 TESTING CHECKPOINT**: Run tests, verify functionality
  - [ ] **1.4 DOCUMENTATION**: Document implementation, test results, fixes
  - [ ] **1.5 COMMIT**: `git add -A && git commit -m "feat: implement feature X" && git push`
```

## Tasks

- [ ] 1.0 Parent Task Title
  - [ ] 1.1 [Sub-task description 1.1]
  - [ ] 1.2 [Sub-task description 1.2]
  - [ ] **1.3 TESTING CHECKPOINT**: Run tests, verify functionality
  - [ ] **1.4 DOCUMENTATION**: Document implementation, test results, fixes
  - [ ] **1.5 COMMIT**: `git add -A && git commit -m "feat: implement task 1.0" && git push`
- [ ] 2.0 Parent Task Title
  - [ ] 2.1 [Sub-task description 2.1]
  - [ ] **2.2 TESTING CHECKPOINT**: Run tests, verify functionality
  - [ ] **2.3 DOCUMENTATION**: Document implementation, test results, fixes
  - [ ] **2.4 COMMIT**: `git add -A && git commit -m "feat: implement task 2.0" && git push`
- [ ] 3.0 Parent Task Title (may not require sub-tasks if purely structural or configuration)
  - [ ] **3.1 TESTING CHECKPOINT**: Run tests, verify functionality
  - [ ] **3.2 DOCUMENTATION**: Document implementation, test results, fixes
  - [ ] **3.3 COMMIT**: `git add -A && git commit -m "feat: implement task 3.0" && git push`
```

**Note on Task States**: Use `[~]` for "figuring out" and `[>]` for "executing" to show progress. This helps identify tasks stuck in research/decision phase vs. tasks with clear implementation path.
```

## Interaction Model

The process explicitly requires a pause after generating parent tasks to get user confirmation ("Go") before proceeding to generate the detailed sub-tasks. This ensures the high-level plan aligns with user expectations before diving into details.

## Target Audience

Assume the primary reader of the task list is a **junior developer** who will implement the feature with awareness of the existing codebase context.
