# SwarmUI to DaVinci Pipeline - Product Requirements Document

**Date**: 2025-01-20  
**Purpose**: Complete specification for implementing SwarmUI → DaVinci pipeline in StoryArt  
**Status**: Draft  
**Target**: StoryArt (Node.js/TypeScript/React)  
**Reference**: `E:\REPOS\StoryTeller\docs\STORYART_SWARMUI_DAVINCI_REFERENCE.md`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Objectives](#business-objectives)
3. [User Stories](#user-stories)
4. [Technical Architecture](#technical-architecture)
5. [Data Flow](#data-flow)
6. [API Specifications](#api-specifications)
7. [UI/UX Requirements](#uiux-requirements)
8. [Implementation Details](#implementation-details)
9. [Success Criteria](#success-criteria)
10. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

This PRD specifies the implementation of a complete automated pipeline that takes prompts generated in StoryArt, sends them to SwarmUI for image generation, tracks the generated images, and organizes them into DaVinci Resolve project structures. The pipeline will support both bulk processing (all prompts in an episode) and individual beat processing (single prompts from the "New Image" modal).

### Key Features

- **Bulk Processing**: Process all prompts in an analyzed episode from the prompt dashboard
- **Individual Processing**: Process single prompts from the "New Image" modal
- **SwarmUI Integration**: Direct API calls to SwarmUI for image generation
- **Image Path Tracking**: Handle SwarmUI's date-based folders and non-descriptive filenames
- **DaVinci Organization**: Copy images to organized DaVinci project folder structure
- **Progress Tracking**: Real-time status updates during processing

---

## Business Objectives

### Primary Goals

1. **Automate Image Generation**: Eliminate manual copy-paste of prompts to SwarmUI
2. **Organize Assets**: Automatically organize generated images into DaVinci project structure
3. **Improve Workflow**: Reduce time from script analysis to organized assets from hours to minutes
4. **Ensure Consistency**: Use exact prompts saved in Redis for consistent image generation

### Success Metrics

- **Time Savings**: Reduce manual workflow time by 80%+
- **Accuracy**: 100% of prompts processed correctly (no manual errors)
- **Reliability**: 95%+ success rate for image generation and organization
- **User Adoption**: Pipeline used for 90%+ of image generation workflows

---

## User Stories

### US-1: Bulk Image Generation from Prompt Dashboard

**As a** content creator  
**I want to** process all prompts for an entire episode at once  
**So that** I can generate all images while I work on other tasks

**Acceptance Criteria:**
- Button appears at top of prompt dashboard (OutputPanel)
- Button is only enabled when analyzed episode has prompts
- Clicking button shows confirmation dialog with prompt count
- Processing runs in background with progress indicator
- Success notification shows count of images generated
- Error handling shows which prompts failed

### US-2: Individual Image Generation from New Image Modal

**As a** content creator  
**I want to** generate an image for a single beat from the "New Image" modal  
**So that** I can test prompts or generate specific images on-demand

**Acceptance Criteria:**
- "Generate Image" button appears in New Image modal
- Button processes both cinematic and vertical prompts (or selected format)
- Modal shows generation progress
- Generated image paths are displayed in modal
- Option to copy image path or open in file explorer
- Success/error feedback clearly displayed

### US-3: Image Path Tracking and Normalization

**As a** content creator  
**I want** generated images to be automatically found and tracked  
**So that** I don't have to manually locate files in SwarmUI's date-based folders

**Acceptance Criteria:**
- System handles SwarmUI's date-based folder structure (YYYY-MM-DD)
- Handles midnight rollover (images generated overnight)
- Finds images by filename even when SwarmUI returns relative paths
- Validates image paths exist before copying
- Handles multiple date folders for overnight generation

### US-4: DaVinci Project Organization

**As a** video editor  
**I want** images automatically organized into DaVinci project structure  
**So that** I can immediately start timeline creation without manual file organization

**Acceptance Criteria:**
- Creates episode project folder structure if it doesn't exist
- Organizes images by scene and beat
- Separates cinematic (16:9) and vertical (9:16) formats
- Uses descriptive filenames (e.g., `s1-b1_16_9_cinematic_v01.png`)
- Handles Windows filename compatibility (no colons)
- Preserves original images in SwarmUI output folder

### US-5: Progress Tracking and Status Updates

**As a** content creator  
**I want** real-time updates on image generation progress  
**So that** I know how long the process will take and can plan accordingly

**Acceptance Criteria:**
- Progress bar shows current image being processed
- Status updates show: "Generating image 5 of 20", "Copying to DaVinci...", etc.
- Estimated time remaining displayed
- Ability to cancel long-running operations
- Final summary shows success/failure counts

---

## Technical Architecture

### System Components

#### 1. SwarmUI Service (`services/swarmUIService.ts` - Enhanced)

**Responsibilities:**
- Initialize SwarmUI session
- Send prompts to SwarmUI API
- Track generation queue status
- Retrieve generated image paths

**Key Methods:**
```typescript
initializeSession(): Promise<string>  // Returns session_id
generateImages(prompt: string, imagesCount: number, sessionId: string): Promise<ImageGenerationResult>
getQueueStatus(): Promise<QueueStatus>
getGenerationStatistics(): Promise<GenerationStats>
```

**API Endpoints:**
- `POST /API/GetNewSession` - Create SwarmUI session
- `POST /API/Generate` - Generate images
- `POST /API/GetQueueStatus` - Check queue status
- `POST /API/GetStats` - Get statistics

#### 2. Image Path Tracker Service (`services/imagePathTracker.ts` - New)

**Responsibilities:**
- Normalize image paths from SwarmUI
- Search date-based folders for images
- Handle midnight rollover scenarios
- Validate paths exist before copying

**Key Methods:**
```typescript
normalizeImagePath(path: string, generationStartDate: Date): Promise<string>
findImageByFilename(filename: string, startDate: Date): Promise<string>
enhanceImagePathsWithMetadata(paths: string[], metadata: ImageMetadata[]): Promise<EnhancedImagePath[]>
```

**Configuration:**
- SwarmUI output path: `E:/FLUX_models_Auto_Downloaders_v7/SwarmUI/Output/local/raw/{date}/`
- Date format: `YYYY-MM-DD`
- Search strategy: Check today, start_date, and yesterday folders

#### 3. DaVinci Project Service (`services/davinciProjectService.ts` - New)

**Responsibilities:**
- Create DaVinci project folder structure
- Copy images to organized folders
- Generate descriptive filenames
- Handle Windows filename compatibility

**Key Methods:**
```typescript
createEpisodeProject(episodeNumber: number, title: string): Promise<string>
organizeSwarmUIImages(images: EnhancedImagePath[], episodeNumber: number): Promise<OrganizationResult>
getProjectDirectoryStructure(episodeNumber: number): Promise<ProjectStructure>
```

**Project Structure:**
```
Episode_01_The_Signal/
├── 01_Assets/
│   ├── Images/
│   │   ├── LongForm/          # 16:9 cinematic
│   │   │   ├── Scene_01/
│   │   │   │   ├── s1-b1_16_9_cinematic_v01.png
│   │   │   │   └── s1-b1_16_9_cinematic_v02.png
│   │   │   └── Scene_02/
│   │   └── ShortForm/         # 9:16 vertical
│   │       ├── Scene_01/
│   │       └── Scene_02/
│   ├── Audio/
│   └── Video/
├── 02_Timelines/
└── 03_Exports/
```

#### 4. Pipeline Orchestrator Service (`services/pipelineService.ts` - New)

**Responsibilities:**
- Orchestrate complete pipeline: Redis → SwarmUI → DaVinci
- Handle bulk and individual processing
- Manage progress tracking
- Error handling and recovery

**Key Methods:**
```typescript
processEpisodeCompletePipeline(sessionTimestamp: number): Promise<PipelineResult>
processSingleBeat(beatId: string, format: 'cinematic' | 'vertical'): Promise<BeatPipelineResult>
fetchPromptsFromRedis(sessionTimestamp: number): Promise<BeatPrompt[]>
generateImagesFromPrompts(prompts: BeatPrompt[]): Promise<ImageGenerationResult[]>
organizeAssetsInDaVinci(images: ImageGenerationResult[]): Promise<OrganizationResult>
```

#### 5. UI Components

**Prompt Dashboard Button** (`components/OutputPanel.tsx` - Enhanced)
- Bulk processing button at top of panel
- Enabled/disabled based on analyzed episode state
- Progress modal during processing

**New Image Modal** (`components/NewImageModal.tsx` - New)
- Modal for editing individual beats
- "Generate Image" button for selected prompt
- Image preview and path display
- Copy path / open folder buttons

---

## Data Flow

### Complete Pipeline Flow

```
1. StoryArt (Analysis Complete)
   ↓
2. Redis (storyart:session:{timestamp})
   - Prompts stored in: analyzedEpisode.scenes[].beats[].prompts
   ↓
3. Pipeline Orchestrator
   - Fetch prompts from Redis
   - Initialize SwarmUI session
   ↓
4. SwarmUI API
   - Generate images for each prompt
   - Return image paths (filename, relative, or absolute)
   ↓
5. Image Path Tracker
   - Normalize paths to absolute
   - Handle date-based folders
   - Validate paths exist
   ↓
6. DaVinci Project Service
   - Create project structure
   - Copy images with descriptive names
   - Organize by scene/beat/format
   ↓
7. DaVinci Resolve Project
   - Organized assets ready for timeline
```

### Individual Beat Flow

```
1. User clicks "New Image" on beat
   ↓
2. New Image Modal opens
   ↓
3. User selects format (cinematic/vertical)
   ↓
4. User clicks "Generate Image"
   ↓
5. Pipeline processes single prompt
   - Initialize SwarmUI session (if needed)
   - Generate image
   - Normalize path
   - Copy to DaVinci
   ↓
6. Modal displays result
   - Image path
   - Copy/open buttons
```

---

## API Specifications

### SwarmUI API Integration

**Base URL**: `http://localhost:7801`

#### Initialize Session
```typescript
POST /API/GetNewSession
Headers: { "Content-Type": "application/json" }
Body: {}
Response: { session_id: string }
```

#### Generate Images
```typescript
POST /API/Generate
Headers: { "Content-Type": "application/json" }
Body: {
  session_id: string,
  prompt: string,        // Full prompt text (with stage directions intrinsic)
  images_count: number   // Default: 3
}
Response: {
  image_paths: string[]  // May be filename, relative, or absolute paths
}
```

**Note**: SwarmUI handles all generation parameters (model, LoRA, steps, etc.) internally. Only raw prompt text is sent.

#### Get Queue Status
```typescript
POST /API/GetQueueStatus
Headers: { "Content-Type": "application/json" }
Body: {}
Response: {
  queue_length: number,
  current_generation: string | null
}
```

#### Get Statistics
```typescript
POST /API/GetStats
Headers: { "Content-Type": "application/json" }
Body: {}
Response: {
  total_generations: number,
  average_generation_time: number
}
```

### Redis Data Format

**Key Format**: `storyart:session:{timestamp}`

**Data Structure**:
```typescript
{
  scriptText: string,
  episodeContext: string,
  storyUuid: string,
  analyzedEpisode: {
    episodeNumber: number,
    title: string,
    scenes: [{
      sceneNumber: number,
      title: string,
      beats: [{
        beatId: string,  // e.g., "s1-b1"
        prompts: {
          cinematic: {
            prompt: string,  // Stage directions intrinsic
            model: string,
            width: number,
            height: number,
            steps: number,
            cfgscale: number,
            seed: number
          },
          vertical: {
            // Same structure
          }
        }
      }]
    }]
  }
}
```

### Environment Configuration

**Required Environment Variables**:
```env
# SwarmUI API
SWARMUI_API_URL=http://localhost:7801

# SwarmUI Output Path
SWARMUI_OUTPUT_PATH=E:/FLUX_models_Auto_Downloaders_v7/SwarmUI/Output

# DaVinci Projects Base Path
DAVINCI_PROJECTS_PATH=E:/DaVinci_Projects

# Redis Configuration (existing)
REDIS_URL=redis://localhost:6382
REDIS_HOST=localhost
REDIS_PORT=6382
```

---

## UI/UX Requirements

### Prompt Dashboard (Bulk Processing)

**Location**: Top of `OutputPanel` component

**Button Specifications:**
- **Text**: "Generate All Images" or "Process Episode Images"
- **Icon**: Image/photo icon
- **Position**: Top-right of OutputPanel header
- **States**:
  - **Enabled**: When `analyzedEpisode` exists and has prompts
  - **Disabled**: When no analysis or no prompts
  - **Loading**: During processing (shows spinner)

**Modal Specifications:**
- **Title**: "Processing Episode Images"
- **Content**:
  - Progress bar (0-100%)
  - Current status text: "Generating image 5 of 20..."
  - Estimated time remaining
  - Cancel button (optional)
- **Success**: Shows count of images generated and DaVinci project path
- **Error**: Shows error details and which prompts failed

### New Image Modal

**Trigger**: Clicking "New Image" button on a beat in OutputPanel

**Modal Specifications:**
- **Title**: "Generate Image - {Scene} Beat {BeatNumber}"
- **Content**:
  - Beat script text (read-only)
  - Prompt tabs (Cinematic/Vertical) - same as current OutputPanel
  - Selected prompt display
  - "Generate Image" button
  - Format selector (if both formats available)
- **Generation State**:
  - Button shows "Generating..." with spinner
  - Progress indicator
  - Status updates
- **Success State**:
  - Generated image path displayed
  - "Copy Path" button
  - "Open in Explorer" button
  - "View Image" button (if preview possible)
- **Error State**:
  - Error message displayed
  - "Retry" button

---

## Implementation Details

### Stage Directions Handling

**Critical**: Prompts must already include stage directions as part of the prompt text. The pipeline does NOT add stage directions from `cameraAngleSuggestion` or `characterPositioning` fields.

**Example Prompt**:
```
"(Wide shot, showing the scale of destruction and Cat's small figure.:1.3), (Cat walking through debris, focused.:1.2), wide shot of..."
```

**Requirement**: StoryArt must save prompts with stage directions intrinsic when generating prompts.

### Image Path Normalization

**Problem**: SwarmUI returns paths in various formats:
- Filename only: `"1332001-(frontal view13), (facing camera12),-flux1-dev-fp8.png"`
- Relative: `"Output/local/raw/2025-01-03/image.png"`
- Absolute: `"E:/FLUX_models_Auto_Downloaders_v7/SwarmUI/Output/local/raw/2025-01-03/image.png"`

**Solution**: `ImagePathTracker` normalizes all formats:
1. Check if path is already absolute → use as-is
2. If relative → resolve against SwarmUI output path
3. If filename only → search date folders (today, start_date, yesterday)
4. Validate path exists before use

### Midnight Rollover Handling

**Problem**: Overnight generation may cross midnight, saving images to different date folders.

**Solution**:
- Capture `generation_start_date` when pipeline starts
- Search both `start_date` folder and `current_date` folder
- Check yesterday's folder as fallback
- Implementation: `ImagePathTracker._find_image_by_filename()` with `start_date` parameter

### Windows Filename Compatibility

**Problem**: Windows doesn't allow colons (`:`) in filenames.

**Solution**: Replace colons with underscores in DaVinci project filenames:
- `16:9_cinematic` → `16_9_cinematic`
- `9:16_vertical` → `9_16_vertical`

**Implementation**: `DaVinciProjectService.organize_swarmui_images()` sanitizes filenames

### DaVinci Project Structure

**Naming Convention**:
- Episode folder: `Episode_{number}_{title}` (sanitized)
- Image filenames: `{beatId}_{format}_{version}.png`
  - Example: `s1-b1_16_9_cinematic_v01.png`
  - Version numbers: `v01`, `v02`, `v03` (for multiple images per prompt)

**Folder Hierarchy**:
- `01_Assets/Images/LongForm/Scene_{number}/` - 16:9 cinematic
- `01_Assets/Images/ShortForm/Scene_{number}/` - 9:16 vertical

### Error Handling

**SwarmUI API Errors**:
- Network failures → Retry with exponential backoff (3 attempts)
- API errors → Log error, skip prompt, continue with others
- Timeout → Show error, allow user to retry

**Image Path Errors**:
- Path not found → Search alternative date folders
- Still not found → Log error, mark as failed
- Continue with other images

**DaVinci Organization Errors**:
- Folder creation failure → Log error, abort operation
- File copy failure → Log error, continue with others
- Show summary of failures at end

---

## Success Criteria

### Functional Requirements

- [ ] Bulk processing button appears on prompt dashboard
- [ ] Individual processing button appears in New Image modal
- [ ] All prompts from Redis are correctly extracted
- [ ] SwarmUI API calls succeed for 95%+ of prompts
- [ ] Image paths are correctly normalized and found
- [ ] Images are correctly copied to DaVinci project structure
- [ ] Progress tracking provides accurate status updates
- [ ] Error handling provides clear feedback

### Performance Requirements

- [ ] Bulk processing completes for 100 prompts in < 30 minutes
- [ ] Individual processing completes in < 2 minutes
- [ ] Progress updates refresh at least every 5 seconds
- [ ] No UI blocking during processing (background execution)

### User Experience Requirements

- [ ] Clear visual feedback during processing
- [ ] Error messages are actionable and understandable
- [ ] Success notifications show relevant information (paths, counts)
- [ ] Modal can be closed/cancelled during processing
- [ ] Generated image paths are easily accessible (copy/open buttons)

---

## Risk Mitigation

### Technical Risks

**Risk**: SwarmUI API changes or becomes unavailable  
**Mitigation**: 
- Implement API version detection
- Provide fallback to manual export
- Clear error messages with troubleshooting steps

**Risk**: Image paths not found due to SwarmUI folder structure changes  
**Mitigation**:
- Implement robust path search (multiple date folders)
- Log detailed path resolution attempts
- Allow manual path override in UI

**Risk**: DaVinci project folder permissions issues  
**Mitigation**:
- Check folder permissions before starting
- Create folder structure with proper permissions
- Provide clear error messages for permission issues

**Risk**: Large batch processing overwhelms system  
**Mitigation**:
- Implement rate limiting (max concurrent requests)
- Add pause/resume functionality
- Process in batches with progress checkpoints

### User Experience Risks

**Risk**: Users don't understand what the pipeline does  
**Mitigation**:
- Clear button labels and tooltips
- Confirmation dialogs with prompt counts
- Help documentation linked from UI

**Risk**: Long processing times frustrate users  
**Mitigation**:
- Show accurate progress and time estimates
- Allow cancellation
- Background processing (non-blocking)

---

## Dependencies

### External Services

- **SwarmUI**: Must be running on `localhost:7801`
- **Redis**: Must be running on `localhost:6382`
- **File System**: DaVinci projects path must be writable

### Internal Dependencies

- **Redis Service**: `services/redisService.ts` - For fetching session data
- **OutputPanel**: `components/OutputPanel.tsx` - For UI integration
- **Types**: `types.ts` - For TypeScript interfaces

---

## Future Enhancements

### Phase 2 Features

1. **DaVinci Resolve API Integration**: Direct timeline creation from organized assets
2. **Image Preview**: Show generated images in modal before copying
3. **Batch Retry**: Retry failed generations without re-processing successful ones
4. **Custom SwarmUI Parameters**: Override model/LoRA/preset per prompt
5. **Multiple Image Versions**: Generate multiple variations per prompt automatically

### Phase 3 Features

1. **Real-time Progress**: WebSocket updates for long-running operations
2. **Image Quality Validation**: Auto-check generated images meet quality standards
3. **Automatic Regeneration**: Retry with adjusted prompts if quality check fails
4. **Project Templates**: Pre-configured DaVinci project structures

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-20  
**Author**: StoryArt Development Team

