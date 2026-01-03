# Task List: Video Short Marketing System Implementation

## Relevant Files

### Service Layer
- `services/videoShort/narrativeAnalysisService.ts` - Analyzes full episode narrative to identify compelling moments for video shorts
- `services/videoShort/narrativeAnalysisService.test.ts` - Unit tests for narrative analysis service
- `services/videoShort/videoShortPromptService.ts` - Generates 9:16 vertical marketing prompts optimized for social media
- `services/videoShort/videoShortPromptService.test.ts` - Unit tests for prompt generation service
- `services/videoShort/videoShortImageService.ts` - Wraps SwarmUI service for 9:16 vertical image generation
- `services/videoShort/videoShortImageService.test.ts` - Unit tests for image generation service
- `services/videoShort/videoShortService.ts` - Main orchestrator service coordinating narrative analysis, prompt generation, and image creation
- `services/videoShort/videoShortService.test.ts` - Integration tests for video short service
- `services/videoShort/videoShortRedisService.ts` - Redis session management for video shorts (database 1)
- `services/videoShort/videoShortRedisService.test.ts` - Unit tests for Redis service

### Type Definitions
- `types/videoShort.ts` - TypeScript interfaces for video short moments, episodes, and sessions

### UI Components
- `components/VideoShortDashboard.tsx` - Main dashboard for video short generation (similar to OutputPanel)
- `components/VideoShortDashboard.test.tsx` - Unit tests for dashboard component
- `components/VideoShortMomentCard.tsx` - Individual moment display and editing component
- `components/VideoShortMomentCard.test.tsx` - Unit tests for moment card component
- `components/VideoShortSessionBrowser.tsx` - Browse and restore video short sessions (similar to SessionBrowser)
- `components/VideoShortSessionBrowser.test.tsx` - Unit tests for session browser
- `components/VideoShortPromptEditor.tsx` - Edit prompts for individual moments
- `components/VideoShortPromptEditor.test.tsx` - Unit tests for prompt editor
- `components/VideoShortImageGallery.tsx` - Display generated images in gallery format
- `components/VideoShortImageGallery.test.tsx` - Unit tests for image gallery

### API Endpoints
- `server.js` - Add video short API endpoints (session management, generation, etc.)

### Documentation
- `docs/VIDEO_SHORT_MARKETING_SYSTEM_PLAN.md` - Main planning document (already exists)
- `docs/VIDEO_SHORT_USER_GUIDE.md` - User guide for video short generation
- `docs/VIDEO_SHORT_REDIS_STORAGE.md` - Technical documentation for Redis storage (database 1)

### Notes
- All video short services use Redis database 1 (separate from beat analysis database 0)
- Video short images stored in `output/video-shorts/episode-{number}/` directory
- Session keys use prefix `videoshort:session:` to avoid conflicts with beat analysis
- Tests should be run with `npm test` or `npx vitest`

## Tasks

- [ ] 1.0 Remove Vertical Prompts from Beat Analysis (COMPLETED - Foundation)
  - [x] 1.1 Remove `vertical` field from `BeatPrompts` interface
  - [x] 1.2 Remove `verticalAspectRatio` from `EpisodeStyleConfig`
  - [x] 1.3 Remove vertical prompt generation from `promptGenerationService.ts`
  - [x] 1.4 Remove vertical prompt generation from `qwenPromptService.ts`
  - [x] 1.5 Update UI components to remove vertical tabs
  - [x] 1.6 Update documentation to reflect separation

  **Testing Checkpoint 1.0:**
  - [x] Verify no TypeScript errors after removing vertical types
  - [x] Test that beat analysis still works correctly
  - [x] Verify UI components render without vertical tabs
  - [x] Run existing unit tests and ensure they pass

  **Git Commit 1.0:**
  - [x] Committed: "feat: Remove vertical (9:16) prompts from beat analysis workflow"

- [ ] 2.0 Create Video Short Type Definitions and Service Structure
  - [ ] 2.1 Create `types/videoShort.ts` with `VideoShortMoment`, `VideoShortEpisode`, and `VideoShortSession` interfaces
  - [ ] 2.2 Create `services/videoShort/` directory structure
  - [ ] 2.3 Create placeholder service files with basic exports
  - [ ] 2.4 Add JSDoc comments to all type definitions
  - [ ] 5 Verify TypeScript compilation with new types

  **Testing Checkpoint 2.0:**
  - [ ] Verify TypeScript types compile correctly
  - [ ] Test type imports in service files
  - [ ] Check for type conflicts with existing types
  - [ ] Run `npm run build` to verify no compilation errors

  **Documentation Checkpoint 2.0:**
  - [ ] Document new types in code comments
  - [ ] Update types README if applicable

  **Git Commit 2.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add types/videoShort.ts services/videoShort/`
  - [ ] Commit: `git commit -m "feat: Add video short type definitions and service structure" -m "- Added VideoShortMoment, VideoShortEpisode, VideoShortSession interfaces" -m "- Created service directory structure for video short marketing system" -m "- Added JSDoc comments to all type definitions"`

- [ ] 3.0 Implement Redis Session Management Service (Database 1)
  - [ ] 3.1 Create `videoShortRedisService.ts` with Redis client initialization for database 1
  - [ ] 3.2 Implement `saveVideoShortSession()` function with timestamp-based keys
  - [ ] 3.3 Implement `getLatestVideoShortSession()` function using sorted set index
  - [ ] 3.4 Implement `getVideoShortSessionList()` function for browsing all sessions
  - [ ] 3.5 Implement `getVideoShortSessionByTimestamp()` function for version restoration
  - [ ] 3.6 Add sorted set index management (`videoshort:sessions:index`)
  - [ ] 3.7 Implement 7-day TTL for all session data
  - [ ] 3.8 Add error handling and fallback to in-memory storage
  - [ ] 3.9 Add logging for Redis operations

  **Testing Checkpoint 3.0:**
  - [ ] Create unit tests for all Redis service functions
  - [ ] Test Redis database 1 connection and isolation from database 0
  - [ ] Test session save/retrieve operations
  - [ ] Test sorted set index management
  - [ ] Test TTL expiration behavior
  - [ ] Test fallback to in-memory storage when Redis unavailable
  - [ ] Run tests: `npm test services/videoShort/videoShortRedisService.test.ts`

  **Git Commit 3.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add services/videoShort/videoShortRedisService.ts services/videoShort/videoShortRedisService.test.ts`
  - [ ] Commit: `git commit -m "feat: Add Redis session management for video shorts (database 1)" -m "- Implemented save/retrieve/list/restore functions" -m "- Uses Redis database 1 for separation from beat analysis" -m "- Added 7-day TTL and sorted set index management" -m "- Includes fallback to in-memory storage"`

- [ ] 4.0 Implement Narrative Analysis Service
  - [ ] 4.1 Create `narrativeAnalysisService.ts` with function to analyze full episode narrative
  - [ ] 4.2 Implement episode context fetching from StoryTeller database
  - [ ] 4.3 Implement AI prompt for narrative analysis (identify compelling moments)
  - [ ] 4.4 Implement moment scoring algorithm (compelling factor, visual appeal, story connection, marketing potential)
  - [ ] 4.5 Implement top 3-5 moment selection logic
  - [ ] 4.6 Add integration with existing AI provider service (Gemini/Qwen)
  - [ ] 4.7 Add error handling and retry logic
  - [ ] 4.8 Add progress callback support
  - [ ] 4.9 Add JSDoc comments with detailed descriptions

  **Testing Checkpoint 4.0:**
  - [ ] Create unit tests for narrative analysis service
  - [ ] Test with mock episode context data
  - [ ] Test moment scoring algorithm
  - [ ] Test top moment selection logic
  - [ ] Test error handling and retry logic
  - [ ] Run tests: `npm test services/videoShort/narrativeAnalysisService.test.ts`

  **Documentation Checkpoint 4.0:**
  - [ ] Document narrative analysis algorithm in code comments
  - [ ] Document scoring criteria and weights

  **Git Commit 4.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add services/videoShort/narrativeAnalysisService.ts services/videoShort/narrativeAnalysisService.test.ts`
  - [ ] Commit: `git commit -m "feat: Add narrative analysis service for video short moments" -m "- Analyzes full episode narrative to identify compelling moments" -m "- Implements scoring algorithm for moment selection" -m "- Selects top 3-5 moments for video short generation" -m "- Includes error handling and progress callbacks"`

- [ ] 5.0 Implement Video Short Prompt Generator Service
  - [ ] 5.1 Create `videoShortPromptService.ts` with function to generate 9:16 marketing prompts
  - [ ] 5.2 Implement AI system instructions for hook-focused marketing prompts
  - [ ] 5.3 Implement prompt generation for individual moments
  - [ ] 5.4 Add vertical composition optimization (9:16 aspect ratio)
  - [ ] 5.5 Add marketing language optimization (hooks, intrigue, emotion)
  - [ ] 5.6 Integrate with episode context and story arc information
  - [ ] 5.7 Enforce steps: 40 and cfgscale: 1 (same as beat analysis)
  - [ ] 5.8 Add LORA trigger substitution support
  - [ ] 5.9 Add error handling and retry logic
  - [ ] 5.10 Add JSDoc comments with detailed descriptions

  **Testing Checkpoint 5.0:**
  - [ ] Create unit tests for prompt generation service
  - [ ] Test prompt generation with mock moments
  - [ ] Verify prompt style (hook-focused, marketing-optimized)
  - [ ] Verify steps and cfgscale values are correct
  - [ ] Test LORA trigger substitution
  - [ ] Test error handling
  - [ ] Run tests: `npm test services/videoShort/videoShortPromptService.test.ts`

  **Documentation Checkpoint 5.0:**
  - [ ] Document prompt style differences from beat analysis prompts
  - [ ] Document marketing optimization strategies

  **Git Commit 5.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add services/videoShort/videoShortPromptService.ts services/videoShort/videoShortPromptService.test.ts`
  - [ ] Commit: `git commit -m "feat: Add video short prompt generator service" -m "- Generates 9:16 vertical marketing prompts" -m "- Hook-focused prompt style optimized for social media" -m "- Enforces steps: 40 and cfgscale: 1" -m "- Includes LORA trigger substitution support"`

- [ ] 6.0 Implement Video Short Image Service
  - [ ] 6.1 Create `videoShortImageService.ts` that wraps existing SwarmUI service
  - [ ] 6.2 Implement 9:16 vertical image generation using SwarmUI API
  - [ ] 6.3 Implement image path tracking and normalization
  - [ ] 6.4 Create directory structure: `output/video-shorts/episode-{number}/`
  - [ ] 6.5 Implement image filename generation with moment IDs
  - [ ] 6.6 Add error handling and retry logic
  - [ ] 6.7 Add progress tracking for image generation
  - [ ] 6.8 Add JSDoc comments with detailed descriptions

  **Testing Checkpoint 6.0:**
  - [ ] Create unit tests for image generation service
  - [ ] Test with mock SwarmUI responses
  - [ ] Test image path normalization
  - [ ] Test directory creation logic
  - [ ] Test error handling and retry logic
  - [ ] Run tests: `npm test services/videoShort/videoShortImageService.test.ts`

  **Git Commit 6.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add services/videoShort/videoShortImageService.ts services/videoShort/videoShortImageService.test.ts`
  - [ ] Commit: `git commit -m "feat: Add video short image generation service" -m "- Wraps SwarmUI service for 9:16 vertical image generation" -m "- Creates organized directory structure for video short images" -m "- Includes error handling and progress tracking"`

- [ ] 7.0 Implement Video Short Orchestrator Service
  - [ ] 7.1 Create `videoShortService.ts` as main orchestrator
  - [ ] 7.2 Implement `generateVideoShort()` function that coordinates all services
  - [ ] 7.3 Integrate narrative analysis → prompt generation → image generation workflow
  - [ ] 7.4 Add automatic Redis session saving after each step
  - [ ] 7.5 Add progress callback support throughout workflow
  - [ ] 7.6 Add cancellation token support
  - [ ] 7.7 Add error handling and recovery
  - [ ] 7.8 Add time estimation for operations
  - [ ] 7.9 Add JSDoc comments with detailed descriptions

  **Testing Checkpoint 7.0:**
  - [ ] Create integration tests for orchestrator service
  - [ ] Test full workflow end-to-end with mock services
  - [ ] Test automatic Redis saving at each step
  - [ ] Test progress callbacks
  - [ ] Test cancellation token
  - [ ] Test error handling and recovery
  - [ ] Run tests: `npm test services/videoShort/videoShortService.test.ts`

  **Git Commit 7.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add services/videoShort/videoShortService.ts services/videoShort/videoShortService.test.ts`
  - [ ] Commit: `git commit -m "feat: Add video short orchestrator service" -m "- Coordinates narrative analysis, prompt generation, and image creation" -m "- Implements automatic Redis session saving at each step" -m "- Includes progress tracking and cancellation support" -m "- Full error handling and recovery"`

- [ ] 8.0 Add Video Short API Endpoints to Server
  - [ ] 8.1 Add `POST /api/v1/video-short/analyze-episode` endpoint
  - [ ] 8.2 Add `POST /api/v1/video-short/generate-prompts` endpoint
  - [ ] 8.3 Add `POST /api/v1/video-short/generate-images` endpoint
  - [ ] 8.4 Add `POST /api/v1/video-short/generate-complete` endpoint
  - [ ] 8.5 Add `POST /api/v1/video-short/session/save` endpoint
  - [ ] 8.6 Add `GET /api/v1/video-short/session/latest` endpoint
  - [ ] 8.7 Add `GET /api/v1/video-short/session/list` endpoint
  - [ ] 8.8 Add `GET /api/v1/video-short/session/:timestamp` endpoint
  - [ ] 8.9 Add error handling and validation for all endpoints
  - [ ] 8.10 Add request/response logging

  **Testing Checkpoint 8.0:**
  - [ ] Test all API endpoints with Postman or similar tool
  - [ ] Test error handling (invalid requests, missing data)
  - [ ] Test Redis database 1 isolation (no interference with database 0)
  - [ ] Test session save/retrieve operations via API
  - [ ] Run integration tests if available

  **Git Commit 8.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add server.js`
  - [ ] Commit: `git commit -m "feat: Add video short API endpoints" -m "- Added endpoints for narrative analysis, prompt generation, image generation" -m "- Added session management endpoints (save, latest, list, restore)" -m "- All endpoints use Redis database 1" -m "- Includes error handling and validation"`

  **Git Sync 8.0:**
  - [ ] `git push origin main`

- [ ] 9.0 Create Video Short Dashboard Component
  - [ ] 9.1 Create `VideoShortDashboard.tsx` component with main layout
  - [ ] 9.2 Add episode selector dropdown
  - [ ] 9.3 Add "Generate Video Short" button
  - [ ] 9.4 Add loading states and progress indicators
  - [ ] 9.5 Add error display and handling
  - [ ] 9.6 Integrate with video short service API
  - [ ] 9.7 Add responsive design for mobile/tablet

  **Testing Checkpoint 9.0:**
  - [ ] Create unit tests for dashboard component
  - [ ] Test episode selector functionality
  - [ ] Test button interactions and API calls
  - [ ] Test loading and error states
  - [ ] Test responsive design breakpoints
  - [ ] Run tests: `npm test components/VideoShortDashboard.test.tsx`

  **Git Commit 9.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add components/VideoShortDashboard.tsx components/VideoShortDashboard.test.tsx`
  - [ ] Commit: `git commit -m "feat: Add video short dashboard component" -m "- Main dashboard for video short generation" -m "- Episode selector and generate button" -m "- Loading states and error handling" -m "- Responsive design"`

- [ ] 10.0 Create Video Short Moment Card Component
  - [ ] 10.1 Create `VideoShortMomentCard.tsx` component for displaying individual moments
  - [ ] 10.2 Add moment description display
  - [ ] 10.3 Add story arc connection display
  - [ ] 10.4 Add emotional hook display
  - [ ] 10.5 Add edit functionality for moment descriptions
  - [ ] 10.6 Add prompt preview display
  - [ ] 10.7 Add image preview when available
  - [ ] 10.8 Add delete moment functionality
  - [ ] 10.9 Add reorder functionality (drag and drop)

  **Testing Checkpoint 10.0:**
  - [ ] Create unit tests for moment card component
  - [ ] Test display of all moment properties
  - [ ] Test edit functionality
  - [ ] Test delete functionality
  - [ ] Test reorder functionality
  - [ ] Run tests: `npm test components/VideoShortMomentCard.test.tsx`

  **Git Commit 10.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add components/VideoShortMomentCard.tsx components/VideoShortMomentCard.test.tsx`
  - [ ] Commit: `git commit -m "feat: Add video short moment card component" -m "- Displays individual moment with all properties" -m "- Edit, delete, and reorder functionality" -m "- Prompt and image previews"`

- [ ] 11.0 Create Video Short Session Browser Component
  - [ ] 11.1 Create `VideoShortSessionBrowser.tsx` component (similar to SessionBrowser)
  - [ ] 11.2 Add session list display with timestamps
  - [ ] 11.3 Add session metadata display (episode number, story ID, moment count)
  - [ ] 11.4 Add "Restore Session" functionality
  - [ ] 11.5 Add session filtering and search
  - [ ] 11.6 Add session deletion functionality
  - [ ] 11.7 Add modal/dialog for session browser

  **Testing Checkpoint 11.0:**
  - [ ] Create unit tests for session browser component
  - [ ] Test session list display
  - [ ] Test restore functionality
  - [ ] Test filtering and search
  - [ ] Test deletion functionality
  - [ ] Run tests: `npm test components/VideoShortSessionBrowser.test.tsx`

  **Git Commit 11.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add components/VideoShortSessionBrowser.tsx components/VideoShortSessionBrowser.test.tsx`
  - [ ] Commit: `git commit -m "feat: Add video short session browser component" -m "- Browse and restore video short sessions" -m "- Session filtering and search" -m "- Session deletion functionality"`

- [ ] 12.0 Create Video Short Prompt Editor Component
  - [ ] 12.1 Create `VideoShortPromptEditor.tsx` component
  - [ ] 12.2 Add prompt text editor with syntax highlighting
  - [ ] 12.3 Add "Regenerate Prompt" button
  - [ ] 12.4 Add prompt parameters display (steps, cfgscale, model, dimensions)
  - [ ] 12.5 Add prompt validation and feedback
  - [ ] 12.6 Add copy to clipboard functionality
  - [ ] 12.7 Add save prompt changes functionality

  **Testing Checkpoint 12.0:**
  - [ ] Create unit tests for prompt editor component
  - [ ] Test prompt editing functionality
  - [ ] Test regenerate button
  - [ ] Test validation and feedback
  - [ ] Test copy to clipboard
  - [ ] Run tests: `npm test components/VideoShortPromptEditor.test.tsx`

  **Git Commit 12.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add components/VideoShortPromptEditor.tsx components/VideoShortPromptEditor.test.tsx`
  - [ ] Commit: `git commit -m "feat: Add video short prompt editor component" -m "- Edit and regenerate prompts for moments" -m "- Prompt validation and feedback" -m "- Copy to clipboard functionality"`

- [ ] 13.0 Create Video Short Image Gallery Component
  - [ ] 13.1 Create `VideoShortImageGallery.tsx` component
  - [ ] 13.2 Add grid layout for displaying generated images
  - [ ] 13.3 Add image preview modal/lightbox
  - [ ] 13.4 Add download individual image functionality
  - [ ] 13.5 Add download all images functionality
  - [ ] 13.6 Add image metadata display (moment, prompt, generation time)
  - [ ] 13.7 Add image regeneration functionality

  **Testing Checkpoint 13.0:**
  - [ ] Create unit tests for image gallery component
  - [ ] Test grid layout rendering
  - [ ] Test image preview modal
  - [ ] Test download functionality
  - [ ] Test image regeneration
  - [ ] Run tests: `npm test components/VideoShortImageGallery.test.tsx`

  **Git Commit 13.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add components/VideoShortImageGallery.tsx components/VideoShortImageGallery.test.tsx`
  - [ ] Commit: `git commit -m "feat: Add video short image gallery component" -m "- Grid layout for displaying generated images" -m "- Image preview modal and download functionality" -m "- Image regeneration support"`

- [ ] 14.0 Integrate Video Short Dashboard into Main App
  - [ ] 14.1 Add "Video Shorts" tab to main dashboard navigation
  - [ ] 14.2 Add route for `/video-shorts` in routing configuration
  - [ ] 14.3 Integrate VideoShortDashboard into main app layout
  - [ ] 14.4 Add navigation between beat analysis and video shorts
  - [ ] 14.5 Add state management for video short sessions
  - [ ] 14.6 Add auto-restore of latest video short session on load

  **Testing Checkpoint 14.0:**
  - [ ] Test navigation between beat analysis and video shorts
  - [ ] Test route navigation
  - [ ] Test auto-restore functionality
  - [ ] Test state management
  - [ ] Run full integration tests

  **Git Commit 14.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add App.tsx components/VideoShortDashboard.tsx` (and related routing files)
  - [ ] Commit: `git commit -m "feat: Integrate video short dashboard into main app" -m "- Added Video Shorts tab to main navigation" -m "- Added /video-shorts route" -m "- Integrated state management and auto-restore"`

  **Git Sync 14.0:**
  - [ ] `git push origin main`

- [ ] 15.0 Create User Documentation
  - [ ] 15.1 Create `docs/VIDEO_SHORT_USER_GUIDE.md` with step-by-step instructions
  - [ ] 15.2 Document video short generation workflow
  - [ ] 15.3 Document editing and customization features
  - [ ] 15.4 Document session management (save, restore, browse)
  - [ ] 15.5 Add screenshots and visual examples
  - [ ] 15.6 Document troubleshooting common issues
  - [ ] 15.7 Create `docs/VIDEO_SHORT_REDIS_STORAGE.md` technical documentation
  - [ ] 15.8 Update main README with video short system overview

  **Testing Checkpoint 15.0:**
  - [ ] Review documentation for accuracy
  - [ ] Test all documented workflows
  - [ ] Verify all screenshots are current

  **Git Commit 15.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If tests pass: `git add docs/VIDEO_SHORT_USER_GUIDE.md docs/VIDEO_SHORT_REDIS_STORAGE.md README.md`
  - [ ] Commit: `git commit -m "docs: Add video short marketing system documentation" -m "- User guide with step-by-step instructions" -m "- Technical documentation for Redis storage" -m "- Updated main README with system overview"`

- [ ] 16.0 End-to-End Testing and Validation
  - [ ] 16.1 Test complete video short generation workflow (narrative analysis → prompts → images)
  - [ ] 16.2 Test session save and restore functionality
  - [ ] 16.3 Test editing moments and regenerating prompts
  - [ ] 16.4 Test image generation and download
  - [ ] 16.5 Test Redis database 1 isolation (no conflicts with database 0)
  - [ ] 16.6 Test versioning system (multiple saves, restore previous versions)
  - [ ] 16.7 Test error scenarios (API failures, network issues, Redis unavailable)
  - [ ] 16.8 Test performance with large episodes (many moments)
  - [ ] 16.9 Test UI responsiveness and mobile compatibility
  - [ ] 16.10 Validate all generated prompts have correct steps: 40 and cfgscale: 1

  **Testing Checkpoint 16.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] Run integration tests
  - [ ] Manual testing of all workflows
  - [ ] Performance testing
  - [ ] Cross-browser testing

  **Git Commit 16.0:**
  - [ ] Run full test suite: `npm test`
  - [ ] If all tests pass: `git add .`
  - [ ] Commit: `git commit -m "test: Complete end-to-end testing for video short system" -m "- All workflows tested and validated" -m "- Performance and error scenarios tested" -m "- UI responsiveness verified"`

  **Final Git Sync:**
  - [ ] `git push origin main`
  - [ ] Create release tag if appropriate: `git tag -a v1.0.0-video-shorts -m "Video Short Marketing System v1.0.0"`




