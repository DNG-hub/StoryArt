# Task List: Marketing Campaign Integration & Vertical Prompt Optimization

**PRD Reference:** `tasks/prd-marketing-campaign-integration.md`

## Relevant Files

- `types.ts` - Core type definitions (needs update for optional vertical prompts).
- `services/promptGenerationService.ts` - Main prompt generation logic (needs optimization).
- `services/qwenPromptService.ts` - Qwen prompt generation logic (needs optimization).
- `services/videoShortMarketingService.ts` - The marketing service to be integrated.
- `App.tsx` - Main application state and logic.
- `components/InputPanel.tsx` - UI for triggering the new workflow.
- `components/MarketingCampaignPanel.tsx` - NEW component for displaying results.
- `services/__tests__/videoShortMarketingService.test.ts` - NEW test file for service verification.

### Notes

- We are transitioning from "vertical per beat" to "vertical per best moment".
- `videoShortMarketingService.ts` is an existing but "dormant" service.
- Use `npx vitest` to run tests.

### Task States

- `[ ]` **Not Started**
- `[~]` **Figuring Out**
- `[>]` **Executing**
- `[x]` **Complete**

## Tasks

- [ ] 1.0 Optimization & Cleanup (Stop Waste)
  - [ ] 1.1 Update `types.ts`: Make `vertical` and `marketingVertical` optional in `BeatPrompts` and `BeatAnalysis` interfaces.
  - [ ] 1.2 Modify `services/promptGenerationService.ts`: Remove/disable vertical prompt generation in the main `generateSwarmUiPrompts` function. Ensure it only produces cinematic prompts.
  - [ ] 1.3 Modify `services/qwenPromptService.ts`: Apply the same optimization (remove vertical generation).
  - [ ] **1.4 TESTING CHECKPOINT**: Run the app, generate prompts for an episode, and verify only cinematic prompts are returned. Ensure no crashes due to missing vertical prompts.
  - [ ] **1.5 DOCUMENTATION**: Document the API changes and schema updates.
  - [ ] **1.6 COMMIT**: `git add . && git commit -m "refactor: optimize prompt generation to cinematic only"`

- [ ] 2.0 Service Integration & Verification
  - [ ] 2.1 Audit `services/videoShortMarketingService.ts`: Fix any linting errors, missing imports, or type mismatches with the updated `types.ts`.
  - [ ] 2.2 Create `services/__tests__/videoShortMarketingService.test.ts`: Write a test to mock an `AnalyzedEpisode` and call `generateVideoShortMarketingCampaign` to verify it returns a valid `VideoShortEpisode`.
  - [ ] **2.3 TESTING CHECKPOINT**: Run the new test suite to confirm the marketing service works in isolation.
  - [ ] **2.4 DOCUMENTATION**: Document any fixes applied to the service.
  - [ ] **2.5 COMMIT**: `git add . && git commit -m "feat: verify and fix videoShortMarketingService"`

- [ ] 3.0 State Management & App Logic
  - [ ] 3.1 Update `App.tsx`: Add state for `marketingCampaign` (`VideoShortEpisode | null`) and `isGeneratingCampaign` (`boolean`).
  - [ ] 3.2 Implement `handleGenerateMarketingCampaign` in `App.tsx`: Create the handler that calls `videoShortMarketingService.generateVideoShortMarketingCampaign` using the current `analyzedEpisode` and `episodeContext`.
  - [ ] **3.3 TESTING CHECKPOINT**: Verify the handler can be called (e.g., via temporary console log or test trigger) and updates state correctly.
  - [ ] **3.4 DOCUMENTATION**: Document the new state flow.
  - [ ] **3.5 COMMIT**: `git add . && git commit -m "feat: add marketing campaign state management"`

- [ ] 4.0 UI Implementation
  - [ ] 4.1 Update `components/InputPanel.tsx`: Add a "Generate Marketing Campaign" button.
    -   Should be distinct from "Analyze Script".
    -   Enabled only when `analyzedEpisode` exists.
    -   Show loading state when `isGeneratingCampaign` is true.
  - [ ] 4.2 Create `components/MarketingCampaignPanel.tsx`:
    -   Accept `marketingCampaign` as a prop.
    -   Display "Marketing Campaign" header.
    -   List the 3-5 generated moments.
    -   For each moment, show: Title, Buzz Score (0-10), Viral Hook Overlay text, Script summary, and the 9:16 Visual Prompt.
  - [ ] 4.3 Integrate Panel into `App.tsx`: Add `MarketingCampaignPanel` to the main layout (e.g., as a new tab or section below the Output Panel).
  - [ ] **4.4 TESTING CHECKPOINT**: Run the full workflow. Analyze script -> Click "Generate Marketing Campaign" -> Verify results appear in the new panel.
  - [ ] **4.5 DOCUMENTATION**: Document the new UI features.
  - [ ] **4.6 COMMIT**: `git add . && git commit -m "feat: implement marketing campaign UI"`
