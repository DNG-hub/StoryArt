# Task List Management

Guidelines for managing task lists in markdown files to track progress on completing a PRD

## Task Implementation
- **One sub-task at a time:** Do **NOT** start the next sub‑task until you ask the user for permission and they say "yes" or "y"
- **Completion protocol:**  
  1. When you finish a **sub‑task**, immediately mark it as completed by changing `[ ]` to `[x]`.
  2. **Testing Checkpoint Protocol:** When you encounter a task marked as `**TESTING CHECKPOINT**`:
     - Run the appropriate test suite (`pytest`, `npm test`, `bin/rails test`, etc.)
     - Verify all tests pass
     - If tests fail:
       - Document the failure in detail
       - Fix the issues
       - Re-run tests until all pass
       - Document what was fixed and why
     - Mark the testing checkpoint as complete `[x]`
     - Proceed to the documentation step
  3. **Documentation Protocol:** When you encounter a task marked as `**DOCUMENTATION**`:
     - Document what was implemented in this task section
     - Document any changes from the original plan
     - Document test results (pass/fail, coverage metrics if available)
     - Document any fixes applied to make tests pass
     - Documentation format:
       ```markdown
       ## Implementation Notes - [Task Name]
       - **Changes from Plan**: [List any deviations]
       - **Test Results**: [Success/failure, coverage metrics]
       - **Fixes Applied**: [What was changed to make tests pass]
       - **Validation**: [How the feature was validated]
       ```
     - Save documentation in code comments, a separate doc file, or include in commit message
     - Mark the documentation step as complete `[x]`
     - Proceed to the commit step
  4. **Commit Protocol:** When you encounter a task marked as `**COMMIT**`:
     - **First**: Ensure all tests pass (if testing checkpoint was just completed)
     - **Second**: Stage changes using the command specified in the task (usually `git add -A` or `git add .`)
     - **Third**: Clean up any temporary files and temporary code before committing
     - **Fourth**: Execute the commit command exactly as specified in the task, which should include:
       - Conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, etc.)
       - Descriptive summary message
       - Additional `-m` flags for detailed changes
       - `git push` to sync with remote repository
     - Example commit command:
       ```bash
       git add -A && git commit -m "feat: add payment validation logic" -m "- Validates card type and expiry" -m "- Adds unit tests for edge cases" -m "- Task 1.0 from PRD" && git push
       ```
     - Mark the commit step as complete `[x]`
  5. **Regular Sub-task Completion:** For non-checkpoint subtasks:
     - Mark as complete `[x]` when finished
     - Continue to next subtask after user approval
  6. **Parent Task Completion:** If **all** subtasks underneath a parent task are now `[x]` (including testing, documentation, and commit steps):
     - Mark the **parent task** as completed `[x]`
     - Inform the user that the parent task is complete
- Stop after each sub‑task and wait for the user's go‑ahead.

## Task List Maintenance

1. **Update the task list as you work:**
   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one‑line description of its purpose.

## AI Instructions

When working with task lists, the AI must:

1. Regularly update the task list file after finishing any significant work.
2. Follow the completion protocol:
   - Mark each finished **sub‑task** `[x]`.
   - Mark the **parent task** `[x]` once **all** its subtasks are `[x]`.
   - **Special handling for testing/documentation/commit steps:** These must be completed in sequence before proceeding.
3. Add newly discovered tasks.
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check which sub‑task is next.
6. After implementing a sub‑task, update the file and then pause for user approval.
7. **Testing Checkpoints:** When you reach a testing checkpoint:
   - Run the appropriate test suite
   - Document results (pass/fail, coverage)
   - Fix any failures and document fixes
   - Do not proceed until tests pass
8. **Documentation:** Always document:
   - What was implemented
   - Changes from plan (if any)
   - Test results
   - Fixes applied
9. **Git Commits:** Execute commits exactly as specified in task list, including `git push` to sync with remote.