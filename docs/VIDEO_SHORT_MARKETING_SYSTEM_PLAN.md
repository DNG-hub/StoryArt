# Video Short Marketing System - Detailed Plan

## Executive Summary

This document outlines a comprehensive plan for implementing a standalone video short marketing system that generates compelling 9:16 vertical images for promotional content. Unlike the current beat-based analysis system, this system focuses on episode-level narrative highlights designed to drive viewers to the full long-form episode.

## Vision Statement

The video short marketing system will:
- Generate 9:16 vertical images optimized for social media platforms (TikTok, Instagram Reels, YouTube Shorts)
- Extract the most compelling narrative elements from each episode
- Create visual hooks that connect to the overarching story arc
- Drive viewers to watch the full long-form episode
- Operate independently from the beat-based analysis workflow

## Current System Analysis

### What We're Removing
- All vertical (9:16) prompt generation from beat-based analysis
- `vertical` field from `BeatPrompts` interface
- `verticalAspectRatio` from `EpisodeStyleConfig`
- Vertical prompt processing in `promptGenerationService.ts` and `qwenPromptService.ts`
- Vertical tab/UI elements (already removed in previous changes)

### Why This Separation Makes Sense
1. **Different Purpose**: Beat analysis creates images for the actual episode narrative; video shorts are marketing/promotional content
2. **Different Input**: Beat analysis uses individual beats; video shorts analyze the entire episode narrative
3. **Different Output**: Beat analysis creates scene-specific images; video shorts create highlight/key moment images
4. **Different Workflow**: Beat analysis is automated per-episode; video shorts may be generated on-demand or per-campaign

## System Architecture Options

### Option A: Standalone System (RECOMMENDED)

#### Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Video Short Marketing System (Standalone)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │   Episode    │ -> │   Narrative  │ -> │  Visual  │ │
│  │   Context    │    │   Analysis   │    │  Prompt  │ │
│  │   Service    │    │   Service    │    │ Generator│ │
│  └──────────────┘    └──────────────┘    └──────────┘ │
│         │                    │                  │       │
│         └────────────────────┴──────────────────┘       │
│                          │                              │
│                    ┌──────────┐                        │
│                    │  Image   │                        │
│                    │Generator │                        │
│                    └──────────┘                        │
│                          │                              │
│                    ┌──────────┐                        │
│                    │  Video   │                        │
│                    │  Compiler │                        │
│                    └──────────┘                        │
└─────────────────────────────────────────────────────────┘
```

#### Components

1. **Episode Context Service** (Reuse existing)
   - Fetches full episode context from StoryTeller database
   - Includes story arc, themes, character arcs
   - Provides narrative context beyond individual beats

2. **Narrative Analysis Service** (NEW)
   - Analyzes entire episode narrative (not beats)
   - Identifies:
     - Most compelling moments
     - Key character moments
     - Plot twists/revelations
     - Emotional peaks
     - Story arc connections
   - Generates 3-5 key visual moments per episode

3. **Video Short Prompt Generator** (NEW)
   - Creates 9:16 vertical prompts optimized for marketing
   - Focuses on:
     - Visual hooks (mystery, action, emotion)
     - Character highlights
     - Story arc connections
     - Episode-specific themes
   - Different prompt style: more dramatic, hook-focused, less detailed than beat prompts

4. **Image Generation Service** (Reuse SwarmUI service)
   - Generates 9:16 vertical images
   - Uses same model/config as cinematic but different aspect ratio

5. **Video Compiler Service** (NEW - Future Phase)
   - Compiles images into short video format
   - Adds transitions, music, text overlays
   - Exports for social media platforms

#### Pros
✅ **Complete Separation**: No interference with beat-based analysis workflow
✅ **Independent Scaling**: Can scale video short generation separately
✅ **Flexible Usage**: Can generate shorts on-demand, per-campaign, or batch
✅ **Clear Purpose**: Each system has a distinct, well-defined role
✅ **Easier Maintenance**: Changes to one system don't affect the other
✅ **Different AI Prompts**: Marketing prompts can be optimized differently than narrative prompts
✅ **Future-Proof**: Easy to add video compilation, social media optimization, etc.

#### Cons
❌ **Code Duplication**: Some shared logic (episode context fetching, image generation)
❌ **Separate UI**: Need separate UI/interface for video short generation
❌ **Two Systems to Maintain**: More moving parts

---

### Option B: Integrated System

#### Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Unified StoryArt System                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐                                       │
│  │   Analysis   │ -> Beat Analysis (16:9)              │
│  │   Pipeline   │ -> Video Short Analysis (9:16)       │
│  └──────────────┘                                       │
│                                                         │
│  ┌──────────────┐                                       │
│  │   Prompt     │ -> Generates both types              │
│  │   Generator  │   (parallel or sequential)           │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

#### Pros
✅ **Single Workflow**: One analysis generates both types
✅ **Shared Context**: Both use same episode context
✅ **Unified UI**: One interface for both outputs
✅ **Less Code**: Shared services and logic

#### Cons
❌ **Tight Coupling**: Changes to one affect the other
❌ **Mixed Purposes**: Beat analysis and marketing mixed together
❌ **Less Flexible**: Can't generate video shorts independently
❌ **Complex Prompts**: AI needs to handle two very different tasks
❌ **Harder to Optimize**: Can't tune marketing prompts separately

---

## Recommended Approach: Standalone System

**Decision: Option A (Standalone System)**

### Rationale
1. **Clear Separation of Concerns**: Beat analysis = narrative production; Video shorts = marketing
2. **Independent Optimization**: Marketing prompts can be tuned for hooks/clicks, narrative prompts for story
3. **Flexible Workflow**: Can generate shorts on-demand without running full beat analysis
4. **Future Scalability**: Easy to add video compilation, A/B testing, campaign management
5. **Maintainability**: Changes to narrative workflow don't affect marketing, and vice versa

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### 1.1 Remove Vertical from Current System
- ✅ Remove `vertical` from `BeatPrompts` interface
- ✅ Remove `verticalAspectRatio` from `EpisodeStyleConfig`
- ✅ Remove vertical prompt generation from prompt services
- ✅ Clean up UI components (already done)
- ✅ Update documentation

**Testing Checkpoint 1.1:**
- [ ] Verify no TypeScript errors after removing vertical types
- [ ] Test that beat analysis still works correctly
- [ ] Verify UI components render without vertical tabs
- [ ] Run existing unit tests and ensure they pass

**Git Commit 1.1:**
```
git add .
git commit -m "feat: Remove vertical (9:16) prompts from beat analysis workflow

- Removed vertical field from BeatPrompts interface
- Removed verticalAspectRatio from EpisodeStyleConfig
- Updated prompt generation services to only create cinematic prompts
- Updated UI components to remove vertical tabs
- Updated documentation to reflect separation of video shorts"
```

#### 1.2 Create New Service Structure
```
services/
  videoShort/
    narrativeAnalysisService.ts    # Analyzes episode narrative
    videoShortPromptService.ts     # Generates 9:16 marketing prompts
    videoShortImageService.ts      # Wraps SwarmUI for 9:16 images
    videoShortService.ts           # Orchestrator
    videoShortRedisService.ts      # Redis session management (database 1)
```

**Testing Checkpoint 1.2:**
- [ ] Verify all service files are created with proper structure
- [ ] Check that imports/exports are correct
- [ ] Verify no circular dependencies

**Git Commit 1.2:**
```
git add services/videoShort/
git commit -m "feat: Create video short service structure

- Added service directory structure for video short marketing system
- Created placeholder files for all core services
- Set up Redis service for database 1 session management"
```

#### 1.3 Create New Types
```typescript
// types/videoShort.ts
export interface VideoShortMoment {
  momentId: string;
  title: string;
  description: string;          // Why this moment is compelling
  storyArcConnection: string;  // How it relates to overall story
  emotionalHook: string;        // Emotional appeal
  visualPrompt: SwarmUIPrompt;  // 9:16 prompt
}

export interface VideoShortEpisode {
  episodeNumber: number;
  episodeTitle: string;
  moments: VideoShortMoment[];  // 3-5 key moments
  storyContext: string;         // Overall story connection
  marketingAngle: string;      // Primary marketing hook
}
```

**Testing Checkpoint 1.3:**
- [ ] Verify TypeScript types compile correctly
- [ ] Test type imports in service files
- [ ] Check for type conflicts with existing types

**Documentation Checkpoint 1.3:**
- [ ] Document new types in code comments
- [ ] Update types README if applicable

**Git Commit 1.3:**
```
git add types/videoShort.ts
git commit -m "feat: Add video short TypeScript interfaces

- Added VideoShortMoment interface
- Added VideoShortEpisode interface
- Added VideoShortSession interface for Redis storage"
```

**Phase 1 Summary & Sync:**
- [ ] Run full test suite
- [ ] Update main README with video short system overview
- [ ] Create initial documentation structure

**Git Sync 1:**
```
git push origin main
```

### Phase 2: Core Services (Week 3-4)

#### 2.1 Narrative Analysis Service
**Purpose**: Analyze full episode narrative to identify compelling moments

**Input**:
- Full episode script
- Episode context (from StoryTeller)
- Story arc context
- Character arcs

**Process**:
1. Analyze entire episode narrative (not beats)
2. Identify key moments:
   - Plot twists/revelations
   - Emotional peaks
   - Character development moments
   - Action sequences
   - Mystery/cliffhanger moments
3. Score moments by:
   - Compelling factor (0-10)
   - Visual appeal (0-10)
   - Story connection strength (0-10)
   - Marketing potential (0-10)
4. Select top 3-5 moments

**Output**: Array of `VideoShortMoment` objects with analysis

**AI Model**: Use Gemini/Qwen for narrative analysis

#### 2.2 Video Short Prompt Generator
**Purpose**: Generate 9:16 vertical prompts optimized for marketing

**Input**:
- Selected moment from narrative analysis
- Episode context
- Story arc context
- Marketing angle

**Process**:
1. Create hook-focused prompt:
   - Start with compelling visual hook
   - Include character highlights
   - Emphasize mystery/action/emotion
   - Connect to story arc
   - Optimize for vertical composition
2. Different style from beat prompts:
   - More dramatic/attention-grabbing
   - Less detailed (short-form optimization)
   - Focus on single compelling element
   - Marketing language (hooks, questions, intrigue)

**Output**: `SwarmUIPrompt` (9:16 format)

**AI Model**: Use Gemini/Qwen for prompt generation

#### 2.3 Video Short Image Service
**Purpose**: Generate 9:16 images using SwarmUI

**Input**: `SwarmUIPrompt` (9:16)

**Process**:
1. Use existing SwarmUI service
2. Generate 9:16 vertical images
3. Store in separate directory structure:
   ```
   output/
     video-shorts/
       episode-{number}/
         moment-{id}.png
   ```

**Output**: Image file paths

### Phase 3: UI Components (Week 5)

#### 3.1 Video Short Dashboard
**New Component**: `VideoShortDashboard.tsx`

**Features**:
- Episode selector
- "Generate Video Short" button
- Display of analyzed moments
- Preview of generated images
- Download/export functionality

#### 3.2 Integration Points
- Add "Video Shorts" tab to main dashboard
- Link from episode analysis (optional)
- Standalone route: `/video-shorts`

### Phase 4: Video Compilation (Future - Week 6+)

**Future Enhancement**: Compile images into video format

**Components**:
- Video compiler service
- Transition effects
- Music/audio integration
- Text overlay service
- Export to multiple formats (TikTok, Instagram, YouTube)

## Redis Storage & Session Management

### Storage Strategy

**Recommendation: Use Redis Database 1 for Video Shorts**

**Rationale:**
- Beat analysis uses Redis database 0 (enforced)
- Video shorts are a separate workflow with different purposes
- Database separation provides clear isolation
- Easier to manage, query, and maintain separately
- Can have different TTL policies if needed

**Alternative Option: Separate Key Prefix in Database 0**
- Use key prefix `videoshort:session:{timestamp}` in database 0
- Simpler setup (no database switching)
- Still separated by key prefix
- Same TTL and management as beat analysis

**Decision: Use Redis Database 1** ✅

### Key Structure

**Video Short Session Keys:**
```
videoshort:session:{timestamp}
```

**Example:**
```
videoshort:session:1704067200000
```

- **Prefix:** `videoshort:session:`
- **Timestamp:** Unix timestamp in milliseconds (JavaScript `Date.now()`)
- **Database:** Redis database 1
- **Format:** `{VIDEO_SHORT_KEY_PREFIX}{timestamp}`

### Index System

**Sorted Set Index:**
```
videoshort:sessions:index
```

- **Score:** Timestamp (Unix milliseconds)
- **Value:** Full session key (e.g., `videoshort:session:1704067200000`)
- **Purpose:** Enables fast retrieval of latest session and session listing
- **Database:** Redis database 1

### Automatic Saving

**Yes - Results are automatically saved to Redis**

**When Saved:**
1. **After Narrative Analysis:** Saves analyzed moments
2. **After Prompt Generation:** Updates session with generated prompts
3. **After Image Generation:** Updates session with image paths
4. **Manual Save:** User can trigger save at any time
5. **Auto-Save on Edit:** Changes to moments or prompts trigger auto-save

**Implementation:**
```typescript
// Automatic save after each step
await saveVideoShortSession({
  episodeNumber,
  storyId,
  moments: analyzedMoments,  // or with prompts, or with images
  timestamp: Date.now()
});
```

### Versioning System

**Yes - Full versioning support like beat analysis**

**How It Works:**
1. **Timestamp-Based Versions:** Each save creates a new timestamp-based key
2. **No Overwriting:** Previous versions remain accessible
3. **Version History:** All versions are tracked in the sorted set index
4. **Browse & Restore:** Users can browse all versions and restore any previous version

**Version Data Structure:**
```typescript
interface VideoShortSession {
  timestamp: number;
  episodeNumber: number;
  storyId: string;
  episodeTitle: string;
  moments: VideoShortMoment[];
  storyContext: string;
  marketingAngle: string;
  generatedAt: Date;
  // ... other metadata
}
```

**TTL (Time To Live):**
- **Redis TTL:** 7 days (604,800 seconds) - same as beat analysis
- **Purpose:** Automatic cleanup of old sessions
- **Format:** `SETEX videoshort:session:{timestamp} 604800 {...}`

### Session Management Endpoints

```
POST /api/v1/video-short/session/save
  Body: { episodeNumber, storyId, moments, ... }
  Returns: { success: true, sessionKey, timestamp }

GET /api/v1/video-short/session/latest
  Returns: { success: true, data: VideoShortSession }

GET /api/v1/video-short/session/list
  Returns: { success: true, sessions: SessionListItem[] }

GET /api/v1/video-short/session/:timestamp
  Returns: { success: true, data: VideoShortSession }
```

## Dashboard & UI Features

### Dashboard Similarity

**Yes - Similar dashboard with edit and save features**

**Video Short Dashboard Features:**
1. **Episode Selector:** Choose episode to generate shorts for
2. **Narrative Analysis View:** Display analyzed moments (3-5 key moments)
3. **Moment Editor:** Edit individual moments:
   - Edit description
   - Edit story arc connection
   - Edit emotional hook
   - Edit/regenerate prompt
4. **Prompt Preview:** View generated prompts before image generation
5. **Image Gallery:** View generated images
6. **Save/Restore:**
   - "Save Session" button (manual save)
   - Auto-save indicator
   - "Browse Sessions" button
   - "Restore Session" button
7. **Version History:** View and restore previous versions
8. **Export:** Download images or export video compilation

### Edit & Save Workflow

**Edit Features:**
- ✅ Edit moment descriptions
- ✅ Edit/regenerate prompts for individual moments
- ✅ Add/remove moments
- ✅ Edit story arc connections
- ✅ Edit marketing angles
- ✅ Re-order moments

**Save Features:**
- ✅ Manual save button (creates new version)
- ✅ Auto-save on changes (configurable)
- ✅ Save confirmation and feedback
- ✅ Version history display
- ✅ Restore previous versions

### UI Component Structure

```
components/
  VideoShortDashboard.tsx          # Main dashboard (similar to OutputPanel)
  VideoShortMomentCard.tsx          # Individual moment display/edit
  VideoShortSessionBrowser.tsx      # Browse/restore sessions (similar to SessionBrowser)
  VideoShortPromptEditor.tsx        # Edit prompts for moments
  VideoShortImageGallery.tsx        # Display generated images
```

## Technical Specifications

### Prompt Style Differences

#### Beat Analysis Prompts (Current)
- Detailed narrative descriptions
- Scene-specific context
- Character positioning details
- Lighting and composition details
- Story continuation focus

#### Video Short Prompts (New)
- Hook-focused (mystery, action, emotion)
- Single compelling moment
- Marketing language
- Story arc connection
- Vertical composition optimized
- Less detail, more impact

### Example Prompt Comparison

**Beat Prompt (16:9)**:
```
(facing camera:1.2), wide shot, shallow depth of field. In a room choked with volumetric dust and twisted rebar, the air is thick with an atmosphere of eerie stillness. Dramatic rim light cuts through the gloom, catching the precise, focused posture of a JRUMLV woman (athletic build, hair in a tight bun) advancing directly toward the viewer. The scene has a desaturated color grade.
```

**Video Short Prompt (9:16)**:
```
(facing camera:1.3), close-up, dramatic lighting. A determined JRUMLV woman with intense focus in her eyes, tactical gear visible. Mystery and tension in the air. Background hints at danger. Vertical composition emphasizing her strength and determination. Compelling visual hook that draws viewers in.
```

### API Endpoints (New)

```
POST /api/v1/video-short/analyze-episode
  Body: { episodeNumber, storyId }
  Returns: { moments: VideoShortMoment[] }

POST /api/v1/video-short/generate-prompts
  Body: { episodeNumber, moments: VideoShortMoment[] }
  Returns: { moments: VideoShortMoment[] with prompts }

POST /api/v1/video-short/generate-images
  Body: { episodeNumber, moments: VideoShortMoment[] }
  Returns: { imagePaths: string[] }

POST /api/v1/video-short/generate-complete
  Body: { episodeNumber, storyId }
  Returns: { complete video short data }

# Session Management (similar to beat analysis)
POST /api/v1/video-short/session/save
GET /api/v1/video-short/session/latest
GET /api/v1/video-short/session/list
GET /api/v1/video-short/session/:timestamp
```

## File Structure

```
services/
  videoShort/
    narrativeAnalysisService.ts
    videoShortPromptService.ts
    videoShortImageService.ts
    videoShortService.ts          # Main orchestrator
    videoShortRedisService.ts      # Redis session management (database 1)
    __tests__/
      narrativeAnalysisService.test.ts
      videoShortPromptService.test.ts
      videoShortImageService.test.ts
      videoShortRedisService.test.ts

components/
  VideoShortDashboard.tsx          # Main dashboard (similar to OutputPanel)
  VideoShortMomentCard.tsx         # Individual moment display/edit
  VideoShortSessionBrowser.tsx      # Browse/restore sessions (similar to SessionBrowser)
  VideoShortPromptEditor.tsx        # Edit prompts for moments
  VideoShortImageGallery.tsx        # Display generated images

types/
  videoShort.ts                     # Video short types and interfaces

docs/
  VIDEO_SHORT_MARKETING_SYSTEM_PLAN.md (this file)
  VIDEO_SHORT_USER_GUIDE.md (future)
  VIDEO_SHORT_REDIS_STORAGE.md (future)
```

## Redis Database Configuration

### Database Assignment

**StoryArt Services:**
- **Beat Analysis:** Redis Database 0 (enforced)
- **Video Shorts:** Redis Database 1 (recommended)

**Rationale for Database 1:**
1. **Clear Separation:** Different workflows, different databases
2. **Independent Management:** Can query/manage separately
3. **Different TTL Policies:** Can have different retention if needed (future)
4. **Easier Debugging:** Clear separation of concerns
5. **No Conflicts:** Beat analysis and video shorts won't interfere

### Redis Connection Setup

**Implementation:**
```typescript
// services/videoShort/videoShortRedisService.ts

const VIDEO_SHORT_REDIS_DB = 1; // Use database 1 for video shorts

const initializeVideoShortRedis = async () => {
  let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Ensure database 1 is used
  const urlMatch = redisUrl.match(/^(redis:\/\/[^\/]+)\/(\d+)$/);
  if (urlMatch) {
    redisUrl = `${urlMatch[1]}/1`; // Force database 1
  } else if (!redisUrl.includes('/')) {
    redisUrl = `${redisUrl}/1`; // Add /1
  }
  
  redisClient = createClient({
    url: redisUrl
  });
  
  await redisClient.connect();
  console.log('✅ Video Short Redis connected (database 1)');
};
```

### Key Prefixes

**Video Short Keys:**
- Session data: `videoshort:session:{timestamp}`
- Index: `videoshort:sessions:index`
- Episode cache: `videoshort:episode:{episodeNumber}:{storyId}` (optional)

**Beat Analysis Keys (for reference):**
- Session data: `storyart:session:{timestamp}`
- Index: `storyart:sessions:index`

**No Conflicts:** Different prefixes ensure no key collisions

## Success Metrics

1. **Generation Time**: < 5 minutes per episode
2. **Moment Quality**: 3-5 compelling moments identified
3. **Image Quality**: High-quality 9:16 vertical images
4. **Marketing Effectiveness**: (Future) Track click-through rates
5. **User Satisfaction**: Easy to use, clear workflow

## Future Enhancements

1. **A/B Testing**: Test different marketing angles
2. **Campaign Management**: Organize shorts by campaign
3. **Analytics Integration**: Track performance metrics
4. **Automated Scheduling**: Schedule shorts for social media
5. **Multi-Platform Optimization**: Different formats for different platforms
6. **Video Compilation**: Automatic video creation from images
7. **Music Integration**: Add background music/audio
8. **Text Overlay**: Add episode titles, hooks, CTAs

## Migration Notes

### Current System Cleanup
- ✅ Removed vertical from beat analysis
- ✅ Removed verticalAspectRatio from config
- ✅ Updated UI to remove vertical tabs
- ✅ Updated prompt generation to only create cinematic

### New System Integration
- Video shorts system will be completely separate
- Can be developed in parallel
- No impact on current beat analysis workflow
- Can be enabled/disabled independently

## Conclusion

The standalone video short marketing system provides a clear, focused solution for generating promotional content. By separating it from the beat-based analysis workflow, we maintain clean architecture, enable independent optimization, and create a scalable foundation for future marketing features.

**Next Steps**:
1. ✅ Complete removal of vertical from current system (done)
2. ✅ Detailed task list created in `docs/TASKS_VIDEO_SHORT_MARKETING_SYSTEM.md`
3. Follow the task list using the PRD workflow process:
   - Use `@process-task-list.md` to work through tasks one at a time
   - Each task includes testing checkpoints, documentation steps, and git commit points
   - Review and approve each task before moving to the next

**Task List Location**: `docs/TASKS_VIDEO_SHORT_MARKETING_SYSTEM.md`

The task list follows the PRD workflow format with:
- Relevant files section listing all files to be created/modified
- 16 parent tasks with detailed sub-tasks
- Testing checkpoints after each major task
- Documentation checkpoints where appropriate
- Git commit points with conventional commit messages
- Git sync points at appropriate intervals

**To Start Implementation**:
1. Review the task list in `docs/TASKS_VIDEO_SHORT_MARKETING_SYSTEM.md`
2. Begin with task 2.0 (Type Definitions and Service Structure)
3. Use `@process-task-list.md` to work through tasks systematically
4. Follow testing and commit protocols after each parent task completion

