# Task List: SwarmUI to DaVinci Pipeline Implementation

**Date**: 2025-01-20  
**Purpose**: Detailed task breakdown for implementing SwarmUI → DaVinci pipeline  
**Status**: In Progress  
**Related PRD**: `docs/SWARMUI_DAVINCI_PIPELINE_PRD.md`

---

## Relevant Files

### Core Services
- `services/swarmUIService.ts` - Enhanced SwarmUI API client with native endpoints (initializeSession, generateImages, getQueueStatus, getGenerationStatistics)
- `services/imagePathTracker.ts` - Image path normalization and date-based folder searching (NEW)
- `services/davinciProjectService.ts` - DaVinci Resolve project structure creation and image organization (NEW)
- `services/pipelineService.ts` - Main pipeline orchestrator coordinating Redis → SwarmUI → DaVinci flow (NEW)

### Type Definitions
- `types.ts` - Add new interfaces: `EnhancedImagePath`, `PipelineResult`, `BeatPipelineResult`, `BeatPrompt`, `OrganizationResult`, `ProjectStructure`, `QueueStatus`, `GenerationStats`

### UI Components
- `components/OutputPanel.tsx` - Add bulk processing button at top of panel
- `components/NewImageModal.tsx` - Create modal component for individual beat image generation (NEW)
- `components/PipelineProgressModal.tsx` - Progress modal for bulk processing (NEW, optional - can be inline)

### Configuration
- `.env.example` - Add SwarmUI and DaVinci environment variables
- `docs/ENVIRONMENT_CONFIGURATION.md` - Document new environment variables

### Test Files
- `services/__tests__/swarmUIService.test.ts` - Unit tests for enhanced SwarmUI service (NEW)
- `services/__tests__/imagePathTracker.test.ts` - Unit tests for image path tracker (NEW)
- `services/__tests__/davinciProjectService.test.ts` - Unit tests for DaVinci project service (NEW)
- `services/__tests__/pipelineService.test.ts` - Unit tests for pipeline orchestrator (NEW)
- `components/__tests__/NewImageModal.test.tsx` - Component tests for New Image modal (NEW)

### Notes
- SwarmUI API endpoints use POST with `Content-Type: application/json` headers
- Image paths may be absolute, relative, or filename-only - normalization handles all formats
- DaVinci project structure follows Windows filename compatibility (colons replaced with underscores)
- Redis session format already includes prompts in `analyzedEpisode.scenes[].beats[].prompts`
- Use `fs/promises` for async file operations in Node.js
- Progress tracking uses callback pattern for real-time updates

---

## Tasks

- [x] 1.0 Enhanced SwarmUI Service
  - [x] 1.1 Add `initializeSession()` method to call `POST /API/GetNewSession` and handle session ID response
  - [x] 1.2 Add `generateImages()` method to call `POST /API/Generate` with prompt text, images count, and session ID
  - [x] 1.3 Handle image path responses (filename, relative, absolute) in `generateImages()` and return `ImageGenerationResult` with paths
  - [x] 1.4 Add `getQueueStatus()` method to call `POST /API/GetQueueStatus` and parse queue length and current generation
  - [x] 1.5 Add `getGenerationStatistics()` method to call `POST /API/GetStats` and parse statistics response
  - [x] 1.6 Update error handling with network retries, API error parsing, and timeout handling
  - [x] 1.7 Add TypeScript interfaces for `QueueStatus` and `GenerationStats` to `types.ts`

- [ ] 2.0 Image Path Tracker Service
  - [ ] 2.1 Create `services/imagePathTracker.ts` file
  - [ ] 2.2 Add `EnhancedImagePath` interface to `types.ts` with scene/beat/format metadata
  - [ ] 2.3 Implement `normalizeImagePath()` method that checks if path is absolute, resolves relative paths, or searches date folders for filename-only paths
  - [ ] 2.4 Implement `findImageByFilename()` method that searches today's date folder, generation start date folder, and yesterday's folder (midnight rollover)
  - [ ] 2.5 Implement `enhanceImagePathsWithMetadata()` method to add scene/beat/format metadata to paths
  - [ ] 2.6 Add configuration constants for SwarmUI output path from env, date format handling, and Windows path separator handling
  - [ ] 2.7 Add path validation to ensure paths exist before returning

- [ ] 3.0 DaVinci Project Service
  - [ ] 3.1 Create `services/davinciProjectService.ts` file
  - [ ] 3.2 Add `OrganizationResult` and `ProjectStructure` interfaces to `types.ts`
  - [ ] 3.3 Implement `createEpisodeProject()` method that generates episode folder name `Episode_{number}_{title}`, sanitizes title, and creates folder structure (01_Assets/Images/LongForm/Scene_{N}/, ShortForm, Audio, Video, 02_Timelines, 03_Exports)
  - [ ] 3.4 Implement `organizeSwarmUIImages()` method that accepts `EnhancedImagePath` array, groups by scene and format, generates descriptive filenames `{beatId}_{format}_v{version}.png`, replaces colons with underscores, and copies images
  - [ ] 3.5 Implement `getProjectDirectoryStructure()` method that returns and validates folder structure for given episode
  - [ ] 3.6 Add Windows filename sanitization to remove/replace invalid characters and handle colons → underscores

- [ ] 4.0 Pipeline Orchestrator Service
  - [ ] 4.1 Create `services/pipelineService.ts` file
  - [ ] 4.2 Add `PipelineResult`, `BeatPipelineResult`, and `BeatPrompt` interfaces to `types.ts`
  - [ ] 4.3 Implement `fetchPromptsFromRedis()` method that uses `redisService.getSessionData()`, extracts prompts from `analyzedEpisode.scenes[].beats[].prompts`, filters only NEW_IMAGE beats, and returns `BeatPrompt` array
  - [ ] 4.4 Implement `generateImagesFromPrompts()` method that initializes SwarmUI session, processes prompts sequentially with rate limiting, tracks progress, handles errors per prompt, and returns results array
  - [ ] 4.5 Implement `organizeAssetsInDaVinci()` method that extracts episode number, creates DaVinci project if needed, copies all images, and returns organization summary
  - [ ] 4.6 Implement `processEpisodeCompletePipeline()` method that accepts session timestamp, fetches prompts from Redis, filters NEW_IMAGE beats, initializes SwarmUI session, generates images, normalizes paths, and organizes assets
  - [ ] 4.7 Implement `processSingleBeat()` method that accepts beat ID and format, fetches prompt from analyzed episode, initializes/reuses SwarmUI session, generates image, normalizes path, copies to DaVinci, and returns result

- [x] 5.0 Bulk Processing Button on Prompt Dashboard
  - [x] 5.1 Add button to `OutputPanel` component positioned at top-right of panel header with text "Generate All Images" and image icon
  - [x] 5.2 Implement button state logic: enabled when `analyzedEpisode` exists and has prompts, disabled otherwise, loading state during processing
  - [x] 5.3 Add click handler that gets session timestamp from Redis (latest session), calls `processEpisodeCompletePipeline()`, and shows progress modal
  - [x] 5.4 Create progress modal component (inline or separate) that shows progress bar (0-100%), current status text "Generating image 5 of 20...", estimated time remaining, and optional cancel button
  - [x] 5.5 Add success/error handling: success shows count and DaVinci path, error shows details and failed prompts
  - [x] 5.6 Add state management in `App.tsx` or `App_updated.tsx` for bulk processing

- [x] 6.0 New Image Modal with Individual Processing
  - [x] 6.1 Create `components/NewImageModal.tsx` that accepts beat data as prop, displays beat script text (read-only), shows prompt tabs (Cinematic/Vertical), and includes format selector
  - [x] 6.2 Add "Generate Image" button below prompt display, enabled when prompt selected, with loading state during generation
  - [x] 6.3 Implement generation handler that gets selected prompt (cinematic or vertical), calls `processSingleBeat()` with beat ID and format, and shows progress in modal
  - [x] 6.4 Add result display showing generated image path, "Copy Path" button, "Open in Explorer" button, and optional "View Image" button
  - [x] 6.5 Add error handling with error message display and "Retry" button
  - [x] 6.6 Update `OutputPanel` to open modal on "New Image" click by updating `handleNavigateToRefine` or creating new handler, passing beat data, and managing modal state
  - [x] 6.7 Add modal state management in `App.tsx` or `App_updated.tsx`

- [x] 7.0 Progress Tracking and Status Updates
  - [x] 7.1 Add progress state management (current image index, total images, current status message, estimated time remaining)
  - [x] 7.2 Implement progress callback system in `PipelineService` that emits progress events
  - [x] 7.3 Update UI components (`OutputPanel` and `NewImageModal`) to subscribe to progress updates and update progress bar and status text
  - [x] 7.4 Add time estimation that tracks average generation time, calculates remaining time based on queue, and displays in progress modal
  - [x] 7.5 Add optional cancellation support with cancel token in pipeline service, stop processing on cancel, and show partial results

- [x] 8.0 Comprehensive Error Handling
  - [x] 8.1 Add SwarmUI API error handling: network failures with retry and exponential backoff, API errors logged and skipped, timeout with error display and retry option
  - [x] 8.2 Add image path error handling: path not found searches alternative folders, still not found logs error and marks failed, continues with other images
  - [x] 8.3 Add DaVinci organization error handling: folder creation failure logs and aborts operation, file copy failure logs and continues with others, shows summary of failures
  - [x] 8.4 Add Redis error handling: session not found shows clear error message, prompts missing suggests regeneration
  - [x] 8.5 Add user-friendly error messages: clear actionable error text, troubleshooting suggestions, retry options where appropriate

- [ ] 9.0 Edge Case Handling
  - [ ] 9.1 Test and verify midnight rollover handling: overnight generation works correctly, yesterday's folder searched
  - [ ] 9.2 Test Windows filename compatibility: colon replacement works, other invalid characters handled
  - [ ] 9.3 Test large batch processing: 100+ prompts process successfully, verify memory usage, verify no UI blocking
  - [ ] 9.4 Test concurrent processing: session isolation works (if applicable)
  - [ ] 9.5 Add empty prompt handling: skip beats without prompts, show warning in UI

- [ ] 10.0 Unit Tests
  - [ ] 10.1 Create `services/__tests__/swarmUIService.test.ts` with tests for session initialization, image generation, and error handling
  - [ ] 10.2 Create `services/__tests__/imagePathTracker.test.ts` with tests for path normalization, date folder searching, and midnight rollover
  - [ ] 10.3 Create `services/__tests__/davinciProjectService.test.ts` with tests for folder creation, image copying, and filename sanitization
  - [ ] 10.4 Create `services/__tests__/pipelineService.test.ts` with tests for bulk processing, individual processing, Redis integration, and error scenarios

- [ ] 11.0 Integration Tests
  - [ ] 11.1 Test complete bulk pipeline with real Redis session, real SwarmUI API, verify images generated, and verify DaVinci organization
  - [ ] 11.2 Test individual beat pipeline with real SwarmUI API, verify single image generated, and verify copied to DaVinci
  - [ ] 11.3 Test error scenarios: SwarmUI not running, Redis not available, invalid paths
  - [ ] 11.4 Test UI integration: button clicks, modal interactions, progress updates

- [x] 12.0 Environment Configuration
  - [x] 12.1 Update `.env.example` with new variables: `SWARMUI_API_URL`, `SWARMUI_OUTPUT_PATH`, `DAVINCI_PROJECTS_PATH`
  - [x] 12.2 Document SwarmUI setup requirements in `docs/ENVIRONMENT_CONFIGURATION.md`
  - [x] 12.3 Document DaVinci path requirements in `docs/ENVIRONMENT_CONFIGURATION.md`
  - [x] 12.4 Create setup validation script to check environment variables and paths

- [ ] 13.0 Code Documentation
  - [ ] 13.1 Add JSDoc comments to all methods in new service files
  - [ ] 13.2 Document interfaces and types in `types.ts`
  - [ ] 13.3 Add usage examples to service files
  - [ ] 13.4 Document configuration requirements

- [ ] 14.0 User Documentation
  - [ ] 14.1 Create `docs/USER_GUIDE_SWARMUI_DAVINCI.md` with bulk processing workflow documentation
  - [ ] 14.2 Document individual processing workflow in user guide
  - [ ] 14.3 Document troubleshooting steps in user guide
  - [ ] 14.4 Document configuration (env variables) in user guide
  - [ ] 14.5 Add screenshots/gifs to user guide

---

## Task Dependencies

**Foundation Tasks (Must Complete First)**:
- Task 1.0 (SwarmUI Service) → No dependencies
- Task 2.0 (Image Path Tracker) → Depends on 1.0
- Task 3.0 (DaVinci Project Service) → Depends on 2.0
- Task 4.0 (Pipeline Orchestrator) → Depends on 1.0, 2.0, 3.0

**UI Tasks**:
- Task 5.0 (Bulk Processing Button) → Depends on 4.0
- Task 6.0 (New Image Modal) → Depends on 4.0
- Task 7.0 (Progress Tracking) → Depends on 5.0, 6.0

**Polish Tasks**:
- Task 8.0 (Error Handling) → Depends on 1.0-7.0
- Task 9.0 (Edge Cases) → Depends on 8.0

**Testing Tasks**:
- Task 10.0 (Unit Tests) → Depends on 1.0-7.0
- Task 11.0 (Integration Tests) → Depends on 10.0

**Documentation Tasks**:
- Task 12.0 (Environment Configuration) → No dependencies (can be done early)
- Task 13.0 (Code Documentation) → Depends on 1.0-9.0
- Task 14.0 (User Documentation) → Depends on 11.0

---

## Estimated Timeline

**Foundation (Tasks 1.0-4.0)**: 24-32 hours  
**UI Integration (Tasks 5.0-7.0)**: 14-20 hours  
**Polish (Tasks 8.0-9.0)**: 7-10 hours  
**Testing (Tasks 10.0-11.0)**: 12-18 hours  
**Documentation (Tasks 12.0-14.0)**: 5-8 hours  

**Total Estimated Time**: 62-88 hours (~8-11 working days)

---

## Priority Summary

**P0 (Critical - MVP)**: Tasks 1.0, 2.0, 3.0, 4.0, 5.0, 6.0  
**P1 (High - Production)**: Tasks 7.0, 8.0, 9.0, 10.0, 11.0, 12.0  
**P2 (Medium - Nice to Have)**: Tasks 13.0, 14.0

---

**Document Version**: 1.1  
**Last Updated**: 2025-01-20  
**Author**: StoryArt Development Team

