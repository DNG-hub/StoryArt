# User Guide: SwarmUI to DaVinci Pipeline

## Overview

The SwarmUI to DaVinci Pipeline automates the workflow from episode script analysis to organized image assets in DaVinci Resolve. This guide walks you through using the pipeline for both bulk processing and individual beat image generation.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Bulk Processing Workflow](#bulk-processing-workflow)
4. [Individual Beat Processing](#individual-beat-processing)
5. [Progress Tracking](#progress-tracking)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

## Prerequisites

Before using the pipeline, ensure:

- ✅ **SwarmUI is installed and running**
  - SwarmUI API accessible at configured URL (default: `http://localhost:7801`)
  - SwarmUI configured to save images to output directory
  
- ✅ **DaVinci Resolve Projects path configured**
  - Path must be writable
  - Sufficient disk space for images
  
- ✅ **Episode analyzed and prompts generated**
  - Episode script has been analyzed
  - Prompts have been generated for beats with NEW_IMAGE decisions
  - Session saved to Redis

- ✅ **Environment variables configured**
  - See [Environment Configuration Guide](../docs/ENVIRONMENT_CONFIGURATION.md)

## Configuration

### Environment Variables

Create a `.env` file (copy from `.env.example`) with:

```env
# SwarmUI Configuration
VITE_SWARMUI_API_URL=http://localhost:7801
SWARMUI_OUTPUT_PATH=E:/FLUX_models_Auto_Downloaders_v7/SwarmUI/Output
DAVINCI_PROJECTS_PATH=E:/DaVinci_Projects

# Redis for Session Storage
VITE_REDIS_API_URL=http://localhost:7802
```

### Validate Configuration

Run the validation script to check your setup:

```bash
npm run validate:env
```

This will verify:
- ✅ SwarmUI API is accessible
- ✅ Paths exist and are writable
- ✅ Required services are running

## Bulk Processing Workflow

### Step 1: Analyze Episode Script

1. Open StoryArt application
2. Paste or load your episode script
3. Click "Analyze Episode"
4. Wait for analysis to complete
5. Review the analyzed episode structure

### Step 2: Generate Prompts

1. Ensure beats are marked for NEW_IMAGE generation
2. Prompts should be generated automatically during analysis
3. Verify prompts exist in the analyzed episode

### Step 3: Initiate Bulk Processing

1. In the Output Panel, locate the **"Generate All Images"** button
   - **Location**: Top-right of the Output Panel header
   - **Appearance**: Button with image icon and text "Generate All Images"
   - **State**: Enabled when episode is analyzed and has prompts
   
   > 📸 **Screenshot Placeholder**: 
   > *Screenshot showing the Output Panel with the "Generate All Images" button highlighted in the top-right corner*

2. Click the button to start bulk processing
3. A progress modal will appear showing:
   - Current step (e.g., "Generating image 5 of 20")
   - Progress percentage
   - Estimated time remaining
   - Current status message
   
   > 📸 **Screenshot Placeholder**: 
   > *Screenshot of the Pipeline Progress Modal showing progress bar, current step, estimated time, and cancel button*

### Step 4: Monitor Progress

The progress modal displays:

```
┌─────────────────────────────────────────────────┐
│  Pipeline Progress                               │
├─────────────────────────────────────────────────┤
│                                                  │
│  ████████████████░░░░░░░░░░  45%                │
│                                                  │
│  Current Step: Generating image 5 of 20         │
│  Status: Initializing SwarmUI session...        │
│  Estimated Time Remaining: 2m 30s                │
│                                                  │
│  [Cancel]                                       │
└─────────────────────────────────────────────────┘
```

- **Progress Bar**: Visual indicator of completion percentage
- **Current Step**: Which image is being generated (e.g., "Image 5 of 20")
- **Status Message**: Current operation (e.g., "Initializing SwarmUI session...")
- **Estimated Time**: Time remaining based on average generation time
- **Cancel Button**: Click to stop processing (returns partial results)

> 📸 **Screenshot Placeholder**: 
> *Animated GIF or screenshot sequence showing progress modal updating in real-time as images are generated*

### Step 5: Review Results

After completion, you'll see:

**Success Indicators:**
```
┌─────────────────────────────────────────────────┐
│  Pipeline Complete!                              │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✅ Total Prompts: 20                            │
│  ✅ Successful: 18                                │
│  ⚠️  Failed: 2                                    │
│  📁 DaVinci Path: E:/DaVinci_Projects/...        │
│  ⏱️  Duration: 15m 32s                           │
│                                                  │
│  [View Results]                                  │
└─────────────────────────────────────────────────┘
```

- ✅ Total prompts processed
- ✅ Successful generations count
- ✅ Failed generations count (if any)
- ✅ DaVinci project path
- ✅ Duration of operation

**Failure Handling:**
```
┌─────────────────────────────────────────────────┐
│  Pipeline Failed                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ❌ Error: SwarmUI connection failed            │
│                                                  │
│  Troubleshooting:                                │
│  1. Verify SwarmUI is running                    │
│  2. Check API URL in .env file                   │
│  3. Review error logs                            │
│                                                  │
│  [Retry Pipeline]  [Close]                       │
└─────────────────────────────────────────────────┘
```

- ❌ Error messages with troubleshooting steps
- 🔄 Retry button to attempt again
- Detailed error logs in console

> 📸 **Screenshot Placeholder**: 
> *Screenshot showing success result modal with statistics and organized images list*
> 
> 📸 **Screenshot Placeholder**: 
> *Screenshot showing error result modal with troubleshooting steps and retry button*

### Step 6: Access Organized Images

Images are organized in DaVinci project structure:

```
{DAVINCI_PROJECTS_PATH}/
  Episode_01_Title/
    01_Assets/
      Images/
        LongForm/          # 16:9 cinematic images
          Scene_01/
            s1-b1_16_9_cinematic_v01.png
            s1-b1_16_9_cinematic_v02.png
            s1-b1_16_9_cinematic_v03.png
        ShortForm/         # 9:16 vertical images
          Scene_01/
            s1-b1_9_16_vertical_v01.png
```

## Individual Beat Processing

### When to Use

Use individual beat processing when:
- You want to regenerate a specific beat's images
- You need to test image generation for a single beat
- You want to generate only one format (cinematic or vertical)

### Step 1: Open New Image Modal

1. In the Output Panel, find the beat you want to process
   - **Location**: In the beat card/section within a scene
   - **Button**: "New Image" button or edit icon (pencil/edit symbol)
   
   > 📸 **Screenshot Placeholder**: 
   > *Screenshot showing a beat card in the Output Panel with the "New Image" button highlighted*

2. Click the "New Image" button (or edit icon) for that beat
3. The New Image Modal will open

```
┌─────────────────────────────────────────────────┐
│  Generate New Image for Beat                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Beat: s1-b1 (Scene 1)                           │
│                                                  │
│  [Cinematic] [Vertical]                          │
│                                                  │
│  Prompt:                                        │
│  ┌─────────────────────────────────────────┐   │
│  │ A cinematic shot of...                  │   │
│  │ [prompt text displayed here]            │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [Generate Image]                               │
└─────────────────────────────────────────────────┘
```

> 📸 **Screenshot Placeholder**: 
> *Screenshot of the New Image Modal showing beat information, format tabs, and prompt display*

### Step 2: Select Format

Choose the format tab:
- **Cinematic**: 16:9 aspect ratio (LongForm folder)
  - Tab appears as: `[Cinematic]` (active) or `Cinematic` (inactive)
- **Vertical**: 9:16 aspect ratio (ShortForm folder)
  - Tab appears as: `[Vertical]` (active) or `Vertical` (inactive)

> 📸 **Screenshot Placeholder**: 
> *Screenshot showing format tabs with Cinematic selected and Vertical tab visible*

### Step 3: Review Prompt

- Review the prompt text that will be used
- Verify it matches the beat's script content
- Prompt includes stage directions and visual context

### Step 4: Generate Image

1. Click **"Generate Image"** button
2. Progress will be shown:
   - Initializing SwarmUI session
   - Generating image
   - Organizing in DaVinci project
3. Estimated time displayed for single generation

### Step 5: View Results

After generation:

**Success:**
```
┌─────────────────────────────────────────────────┐
│  Image Generated Successfully!                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✅ Images generated and organized               │
│                                                  │
│  Generated Images:                               │
│  • E:/DaVinci_Projects/Episode_01/.../          │
│    s1-b1_16_9_cinematic_v01.png                 │
│  • E:/DaVinci_Projects/Episode_01/.../          │
│    s1-b1_16_9_cinematic_v02.png                 │
│  • E:/DaVinci_Projects/Episode_01/.../          │
│    s1-b1_16_9_cinematic_v03.png                 │
│                                                  │
│  [📋 Copy Path]  [📁 Open in Explorer]         │
│  [Close]                                        │
└─────────────────────────────────────────────────┘
```

- ✅ Image paths displayed
- 📋 Copy Path button (copies to clipboard)
- 📁 Open in Explorer button (opens file location)
- Image saved to appropriate DaVinci folder

> 📸 **Screenshot Placeholder**: 
> *Screenshot showing success result in New Image Modal with image paths and action buttons*

**Failure:**
```
┌─────────────────────────────────────────────────┐
│  Image Generation Failed                          │
├─────────────────────────────────────────────────┤
│                                                  │
│  ❌ Error: SwarmUI session initialization failed │
│                                                  │
│  Troubleshooting:                                │
│  1. Verify SwarmUI is running                    │
│  2. Check API URL configuration                  │
│  3. Review SwarmUI logs                           │
│                                                  │
│  [Retry]  [Close]                                │
└─────────────────────────────────────────────────┘
```

- ❌ Error message with troubleshooting steps
- 🔄 Option to retry

> 📸 **Screenshot Placeholder**: 
> *Screenshot showing error result in New Image Modal with error message and retry option*

## Progress Tracking

### Real-Time Updates

The pipeline provides real-time progress updates via Server-Sent Events (SSE):

- **Progress Percentage**: 0-100% completion
- **Current Step**: Which operation is running
- **Total Steps**: Total number of steps
- **Estimated Time**: Calculated based on average generation time

### Time Estimation

Time estimation uses:
1. SwarmUI statistics (if available) for average generation time
2. Local tracking of generation times
3. Queue length consideration
4. Remaining prompts calculation

Formula: `(remaining prompts × avg time) + (queue length × avg time)`

### Cancellation

You can cancel operations at any time:

1. Click **"Cancel"** button in progress modal
2. Processing stops after current image completes
3. Partial results are returned
4. You can retry later

## Visual Guide: UI Components

### Output Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Output Panel                           [Generate All Images] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Episode 1: The Signal                                       │
│                                                               │
│  Scene 1: Opening                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Beat s1-b1: Introduction                            │   │
│  │ [View Details] [New Image]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Beat s1-b2: Setup                                   │   │
│  │ [View Details] [New Image]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Scene 2: Development                                        │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

> 📸 **Screenshot Placeholder**: 
> *Full screenshot of the Output Panel showing episode structure with scenes and beats*

### Progress Modal States

**Initializing:**
```
Progress: 0% ░░░░░░░░░░░░░░░░░░░░░░░░
Status: Initializing SwarmUI session...
```

**Processing:**
```
Progress: 45% ████████████████░░░░░░░░░░
Status: Generating image 5 of 20...
Estimated Time: 2m 30s
```

**Complete:**
```
Progress: 100% ████████████████████████████
Status: Complete! All images generated.
```

> 📸 **Screenshot Placeholder**: 
> *Animated GIF showing progress modal states from initialization through completion*

## Troubleshooting

### Common Issues

#### Issue: "No NEW_IMAGE prompts found"

**Cause**: No beats are marked for new image generation or prompts weren't generated.

**Solution**:
1. Review episode analysis to ensure beats have NEW_IMAGE decisions
2. Regenerate prompts for beats that need images
3. Verify prompts exist in the analyzed episode data

#### Issue: "SwarmUI session initialization failed"

**Cause**: SwarmUI is not running or API is not accessible.

**Solution**:
1. Verify SwarmUI is running: `curl http://localhost:7801/API/GetNewSession`
2. Check SwarmUI logs for errors
3. Verify API URL in `.env` file matches SwarmUI configuration
4. Check firewall/network settings
5. Try restarting SwarmUI

#### Issue: "Image not found" errors

**Cause**: Generated images not found in SwarmUI output directory.

**Solution**:
1. Verify `SWARMUI_OUTPUT_PATH` matches actual SwarmUI output location
2. Check date folder structure exists (`YYYY-MM-DD` folders)
3. Verify image generation completed (may still be processing)
4. Check filename matches exactly (case-sensitive)

#### Issue: "Episode project folder not found"

**Cause**: DaVinci project folder doesn't exist.

**Solution**:
1. Pipeline will create folder automatically
2. Verify `DAVINCI_PROJECTS_PATH` is writable
3. Check disk space availability
4. Ensure path uses absolute format

#### Issue: "Failed to fetch session from Redis"

**Cause**: Session not found in Redis or Redis API not accessible.

**Solution**:
1. Verify session was saved successfully
2. Check Redis API is accessible
3. Verify session timestamp is correct
4. Try re-analyzing the episode to create a new session

### Error Messages

All error messages include:
- ✅ Clear description of the problem
- ✅ Troubleshooting steps
- ✅ Actionable suggestions
- ✅ Relevant context (paths, timestamps, etc.)

### Getting Help

1. **Check Console Logs**: Open browser developer console for detailed logs
2. **Run Validation**: `npm run validate:env` to check configuration
3. **Review Documentation**: See [Environment Configuration Guide](../docs/ENVIRONMENT_CONFIGURATION.md)
4. **Check Service Status**: Verify SwarmUI and Redis are running

## FAQ

### Q: How many images are generated per prompt?

**A**: By default, 3 images are generated per prompt. This can be configured in the code.

### Q: Can I cancel a long-running operation?

**A**: Yes! Click the "Cancel" button in the progress modal. Processing stops after the current image completes, and partial results are returned.

### Q: What happens if some images fail to generate?

**A**: The pipeline continues processing other prompts. Failed generations are logged, and a summary shows successful vs. failed counts. You can retry failed prompts individually.

### Q: How are images organized in DaVinci?

**A**: Images are organized by:
- Episode folder: `Episode_{number}_{title}`
- Format: `LongForm` (16:9) or `ShortForm` (9:16)
- Scene: `Scene_{number}`
- Filename: `{beatId}_{format}_v{version}.png`

### Q: What if generation runs overnight (midnight rollover)?

**A**: The pipeline handles midnight rollover automatically. It searches:
1. Today's date folder
2. Generation start date folder
3. Yesterday's folder (midnight rollover fallback)

### Q: Can I process multiple episodes concurrently?

**A**: Each pipeline run uses its own session timestamp for isolation. Sequential processing is recommended to avoid resource contention.

### Q: How do I regenerate images for a specific beat?

**A**: Use the "New Image" button on that beat in the Output Panel. This opens the New Image Modal where you can select format and generate.

### Q: What if I don't have prompts for some beats?

**A**: The pipeline will skip beats without prompts and log a warning suggesting you regenerate prompts. Only beats with prompts are processed.

## Best Practices

1. **Save Analysis Before Processing**: Always ensure your analysis is saved to Redis before running the pipeline
2. **Monitor Progress**: Keep an eye on the progress modal to catch issues early
3. **Start Small**: Test with a few beats before processing entire episodes
4. **Check Disk Space**: Ensure sufficient space for generated images
5. **Verify Paths**: Use `npm run validate:env` to verify all paths are correct
6. **Review Prompts**: Check prompts before bulk processing to ensure quality
7. **Use Cancellation**: Don't hesitate to cancel if something looks wrong

## Next Steps

After processing:

1. **Review Images**: Check generated images in DaVinci project folders
   - Navigate to: `{DAVINCI_PROJECTS_PATH}/Episode_{number}_{title}/01_Assets/Images/`
   - Images organized by format (LongForm/ShortForm) and scene
   
   > 📸 **Screenshot Placeholder**: 
   > *Screenshot of Windows Explorer showing organized images in DaVinci project folder structure*

2. **Organize Further**: Move images within DaVinci as needed
3. **Import to DaVinci**: Use DaVinci Resolve's media pool to import images
   - Open DaVinci Resolve
   - Navigate to Media Pool
   - Import from organized folder structure
   
   > 📸 **Screenshot Placeholder**: 
   > *Screenshot of DaVinci Resolve Media Pool with imported images from the organized folder structure*

4. **Create Timeline**: Use organized images in your DaVinci timeline
   - Drag images from Media Pool to timeline
   - Images are already organized by scene for easy placement

## Screenshot Guide

This guide includes placeholders for screenshots that enhance the documentation. To add screenshots:

1. **Take screenshots** of the UI at key points:
   - Output Panel with "Generate All Images" button
   - Progress Modal during processing
   - New Image Modal with format tabs
   - Success/Error result modals
   - DaVinci project folder structure
   - DaVinci Resolve Media Pool

2. **Save screenshots** to `docs/images/swarmui-davinci/`:
   ```
   docs/
     images/
       swarmui-davinci/
         output-panel-bulk-button.png
         progress-modal-processing.png
         new-image-modal.png
         success-result.png
         error-result.png
         davinci-folder-structure.png
         davinci-media-pool.png
   ```

3. **Replace placeholders** in this guide:
   - Replace `📸 **Screenshot Placeholder**:` with `![Description](images/swarmui-davinci/filename.png)`
   - Example: `![Output Panel with Generate All Images button](images/swarmui-davinci/output-panel-bulk-button.png)`

4. **For animated GIFs**:
   - Use screen recording tools to capture workflow
   - Convert to GIF format
   - Save to same directory
   - Use same replacement pattern

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review [Troubleshooting](#troubleshooting) section
- Verify configuration with `npm run validate:env`
- Check service documentation

