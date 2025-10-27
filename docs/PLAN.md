# StoryTeller AI - Implementation Plan for Content Expansion & Automation

This document outlines the phased implementation plan for expanding the application's capabilities to include new content types (vertical shorts prompts, hook narratives) and direct SwarmUI API integration for a fully automated script-to-image pipeline.

---

## Phase 1: Content Generation & UI Expansion

**Status:** ✅ **COMPLETE**
**Goal:** Enhance the AI's content generation abilities and update the user interface to display all new assets clearly. This phase focuses on getting the core content right before automating its use.

-   [x] **1.1. Dual Prompt Generation:** Modified `promptGenerationService` to produce two distinct prompts (Cinematic 16:9 and Vertical 9:16) for each `NEW_IMAGE` beat.
-   [x] **1.2. Episode Style Configuration:** Added a collapsible "Episode Style Configuration" section in the `InputPanel` to allow users to define consistent stylistic parameters for an entire episode.
-   [x] **1.3. UI Overhaul for New Content:** Redesigned the `OutputPanel` with a tabbed interface within each `BeatAnalysisCard` to cleanly display the dual prompts.
-   [ ] **1.4. Hook Narrative Generation (Future Step):**
    -   Create a new AI-powered service to generate short, engaging narrative hooks for each key beat.
    -   Add a new section to the `BeatAnalysisCard` to display this narrative.

---

## Phase 2: SwarmUI Automation & Workflow Integration

**Status:** 📋 **PLANNED**
**Goal:** Build the final bridge to SwarmUI, enabling one-click image generation and providing batch processing tools to complete the automated pipeline.

-   [ ] **2.1. SwarmUI API Service:**
    -   Implement the `generateImage` function in `services/swarmUIService.ts` to make live POST requests to a SwarmUI backend API.
-   [ ] **2.2. Conditional UI for Automation:**
    -   Add a "Generate" button within each prompt tab on the `BeatAnalysisCard`.
    -   This button will be conditionally enabled only when `retrievalMode === 'database'`.
    -   The button will trigger the `swarmUIService.generateImage` call and display in-UI feedback (loading, success, error).
-   [ ] **2.3. Batch Processing & Export:**
    -   Implement an "Export All Prompts" button to download a `.txt` file with all prompts and reuse instructions.
    -   Implement a "Generate All Images" button to iterate through all `NEW_IMAGE` beats and call the SwarmUI API for each one sequentially.

---

## Phase 3: Interactive Prompt Refinement

**Status:** 📋 **PLANNED**
**Goal:** Empower users with a "human-in-the-loop" workflow to iteratively refine AI-generated prompts for maximum creative control.

-   [ ] **3.1: UI Hooks (`OutputPanel.tsx`):**
    -   [ ] Add a "Refine" button to each prompt display card (`cinematic` and `vertical`).
    -   [ ] The button click will trigger a handler in `App.tsx` to open the refinement modal, passing the specific beat and prompt type to be edited.
-   [ ] **3.2: State Management (`App.tsx`):**
    -   [ ] Create new state to manage the visibility of the refinement modal and the "beat in focus" for editing.
    -   [ ] Implement a handler function (`handleOpenRefineModal`) to set the target and show the modal.
    -   [ ] Implement a handler function (`handleSaveChanges`) that receives the updated prompt from the modal and patches it into the main `analyzedEpisode` state.
-   [ ] **3.3: The Refinement Modal (`components/RefineModal.tsx`):**
    -   [ ] Create a new modal component that overlays the main UI.
    -   [ ] It will feature a two-column layout: an editable prompt textarea on one side, and the "Context Tree" on the other.
    -   [ ] Include "Save Changes," "Cancel," and "Refine with AI" buttons.
-   [ ] **3.4: The Context Tree Component (`components/ContextTree.tsx`):**
    -   [ ] Create a new component to display the relevant scene context (characters, location details, artifacts) as a hierarchical, selectable list with checkboxes.
    -   [ ] Implement logic for parent/child selection dependencies.
    -   [ ] The component will report the array of selected `prompt_fragment` strings back to the `RefineModal`.
-   [ ] **3.5: The Refinement AI Service (`promptGenerationService.ts`):**
    -   [ ] Create a new exported function: `refinePrompt(currentPrompt: string, attributesToAdd: string[]): Promise<string>`.
    -   [ ] This function will use a new, specialized system instruction for Gemini, focused on surgical insertion and stylistic preservation.
    -   [ ] The function will return the newly refined prompt string for display in the modal's textarea.