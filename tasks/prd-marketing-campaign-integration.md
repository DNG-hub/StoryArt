# PRD: Marketing Campaign Integration & Vertical Prompt Optimization

## 1. Introduction/Overview
This feature integrates the specialized `VideoShortMarketingService` into the StoryArt UI and optimizes the prompt generation pipeline. Currently, vertical (9:16) prompts are generated for every single beat, which is inefficient and lacks the narrative cohesion needed for effective marketing. The goal is to transition to a "Best Moments" paradigm where the system intelligently selects the top 3-5 marketing hooks from an episode and generates optimized vertical prompts only for those moments.

## 2. Problem Evidence (Required)
*   **Inefficiency:** The current system generates ~40-60 vertical prompts per episode (one for every beat), most of which are never used for marketing.
*   **Quality Gap:** Beat-by-beat vertical prompts lack the "viral hook" context (overlays, scripts, buzz scores) that the `VideoShortMarketingService` already creates.
*   **Missed Opportunity:** A sophisticated marketing engine (`services/videoShortMarketingService.ts`) exists in the codebase but is inaccessible to the user.
*   **User Feedback:** The user specifically stated, "I do not want to generate a vertical for every beat... I need the 'best moments' paradigm."

## 3. Time Appetite
**Time Budget:** Small Batch (1-2 weeks)
**Rationale:** The core logic (`videoShortMarketingService.ts`) already exists. The work is primarily identifying the disconnect, integrating it into the UI, and cleaning up the old pipeline.

## 4. Goals
1.  **Eliminate Waste:** Stop generating low-value vertical prompts for every beat.
2.  **Activate Marketing Engine:** Enable users to run the "Video Short Marketing Campaign" analysis via the UI.
3.  **Improve Marketing Output:** Deliver high-quality, buzz-scored, script-ready vertical content.
4.  **Streamline Workflow:** Clear separation between "Storyboarding" (16:9 beat-by-beat) and "Marketing" (9:16 highlights).

## 5. User Stories / Job Stories
1.  **When** I analyze an episode, **I want** the system to generate *only* cinematic (16:9) prompts for the storyboard, **so I can** save tokens and processing time.
2.  **When** I am ready to market an episode, **I want** to click a "Generate Marketing Campaign" button, **so I can** get a curated list of the best viral moments.
3.  **When** the campaign is generated, **I want** to see viral hooks, scripts, and buzz scores, **so I can** quickly create social media content.
4.  **When** I review marketing moments, **I want** to see the specific 9:16 visual prompts associated with them, **so I can** send them to SwarmUI.

## 6. Functional Requirements

### Core (Must Ship):
1.  **Pipeline Optimization:** Modify `promptGenerationService.ts` to *stop* generating `vertical` and `marketingVertical` prompts for every beat. It should only return `cinematic` prompts by default.
2.  **UI Integration:** Add a "Generate Marketing Campaign" button to the `InputPanel` (or a new dedicated Marketing tab).
3.  **Service Connection:** Connect the UI button to `videoShortMarketingService.generateVideoShortMarketingCampaign`.
4.  **Output Display:** Create a new `MarketingCampaignPanel` (or similar) to display the `VideoShortEpisode` results:
    *   List of Top Moments (Hooks).
    *   Buzz Score, Title, Viral Hook Overlay.
    *   Proposed Script/Description.
    *   The generated 9:16 Image Prompt.
5.  **Schema Update:** Ensure `services/promptGenerationService.ts` and `types.ts` reflect that `vertical` prompts are now optional/removed from the standard beat object.

### Nice-to-Have:
6.  **Direct Export:** Button to send selected marketing prompts directly to SwarmUI queue.
7.  **Edit Capability:** Ability to edit the generated "Viral Hook" text before saving.

## 7. Non-Goals (Out of Scope)
*   **Video Generation:** We are generating *prompts* and *scripts* for video, not the video files themselves.
*   **Social Posting:** Automated posting to TikTok/Instagram is out of scope.

## 8. Rabbit Holes to Avoid
*   **Over-engineering the UI:** The marketing results display can be simple for V1. Don't build a complex "Kanban board" for marketing yet.
*   **Refactoring the "Lost" Service:** Use `videoShortMarketingService.ts` as-is where possible. Don't rewrite its internal logic unless it's broken.

## 9. Technical Considerations
*   **Existing Service:** `videoShortMarketingService.ts` is the source of truth.
*   **Type Safety:** The `BeatPrompts` interface currently requires `vertical`. This will need to be made optional.
*   **State Management:** The "Marketing Campaign" data is episode-level, not beat-level. It needs its own state in `App.tsx` (`marketingCampaign` state).

## 10. Risk Analysis
*   **Integration Risk:** The `videoShortMarketingService` might rely on older type definitions or broken imports since it hasn't been used.
    *   *Mitigation:* Comprehensive audit of the file and its dependencies before integration.
*   **UI Clutter:** Adding more panels might clutter the interface.
    *   *Mitigation:* Use a dedicated "Marketing" tab or modal to keep it distinct from the script analysis.

## 11. Success Metrics
*   **Efficiency:** 0% of standard beats generate vertical prompts (token savings).
*   **Utilization:** Users successfully generate a Marketing Campaign for an episode.
*   **Quality:** Generated marketing moments have valid buzz scores and scripts.

## 12. Validation Plan
1.  **Manual Test:** Run script analysis -> Verify only 16:9 prompts.
2.  **Function Test:** Click "Generate Marketing Campaign" -> Verify `VideoShortEpisode` object is returned.
3.  **Visual Test:** Verify the Marketing Panel displays the 3-5 top moments correctly.

---
*Created via StoryArt PRD Workflow*
