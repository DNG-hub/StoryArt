# SwarmUI to DaVinci Pipeline - Screenshot Directory

This directory contains screenshots and visual assets for the SwarmUI to DaVinci Pipeline user guide.

## Directory Structure

```
images/
  swarmui-davinci/
    README.md (this file)
    output-panel-bulk-button.png
    progress-modal-processing.png
    progress-modal-complete.png
    new-image-modal.png
    new-image-modal-format-tabs.png
    success-result-bulk.png
    error-result-bulk.png
    success-result-single.png
    error-result-single.png
    davinci-folder-structure.png
    davinci-media-pool.png
    workflow-animation.gif (optional)
```

## Screenshot Requirements

### Required Screenshots

1. **output-panel-bulk-button.png**
   - Shows Output Panel with "Generate All Images" button highlighted
   - Should show button location in top-right of panel
   - Include episode structure visible in background

2. **progress-modal-processing.png**
   - Shows Pipeline Progress Modal during active processing
   - Progress bar should show partial completion (e.g., 45%)
   - Include current step, status message, estimated time
   - Show cancel button

3. **progress-modal-complete.png**
   - Shows Pipeline Progress Modal after completion
   - Progress bar at 100%
   - Success statistics displayed
   - Results summary visible

4. **new-image-modal.png**
   - Shows New Image Modal open
   - Beat information displayed
   - Format tabs visible
   - Prompt text visible

5. **new-image-modal-format-tabs.png**
   - Close-up of format tabs
   - Show Cinematic tab selected
   - Show Vertical tab available

6. **success-result-bulk.png**
   - Shows success result after bulk processing
   - Statistics displayed
   - DaVinci path shown
   - Organized images list (if applicable)

7. **error-result-bulk.png**
   - Shows error result after failed bulk processing
   - Error message displayed
   - Troubleshooting steps visible
   - Retry button shown

8. **success-result-single.png**
   - Shows success result after single beat processing
   - Image paths displayed
   - Copy/Open buttons visible

9. **error-result-single.png**
   - Shows error result after failed single beat processing
   - Error message displayed
   - Retry option visible

10. **davinci-folder-structure.png**
    - Windows Explorer screenshot
    - Shows organized folder structure
    - Episode folder → Assets → Images → LongForm/ShortForm → Scene folders
    - Image files visible with correct naming

11. **davinci-media-pool.png**
    - DaVinci Resolve screenshot
    - Media Pool with imported images
    - Shows organized structure

### Optional Assets

- **workflow-animation.gif**: Animated GIF showing complete workflow from button click to completion
- **progress-animation.gif**: Animated GIF showing progress modal updating in real-time

## Screenshot Guidelines

### Image Specifications

- **Format**: PNG (preferred) or JPG
- **Resolution**: Minimum 1920x1080, recommended 2560x1440
- **File Size**: Optimize for web (under 500KB per image)
- **Naming**: Use kebab-case (lowercase with hyphens)

### Capturing Tips

1. **Use consistent UI theme** across all screenshots
2. **Highlight important elements** with subtle annotations if needed
3. **Remove sensitive information** (API keys, personal paths, etc.)
4. **Use clear, readable fonts** in any annotations
5. **Capture at appropriate zoom level** to show relevant details
6. **Maintain aspect ratio** when resizing

### Annotations

If annotations are needed:
- Use red boxes or arrows to highlight key elements
- Keep annotations minimal and clear
- Use consistent annotation style across all screenshots

## Adding Screenshots to Guide

Once screenshots are added to this directory:

1. Update `docs/USER_GUIDE_SWARMUI_DAVINCI.md`
2. Replace placeholder text with markdown image syntax:
   ```markdown
   ![Description](images/swarmui-davinci/filename.png)
   ```
3. Ensure relative paths are correct from the guide location
4. Test that images load correctly in markdown viewer

## Maintenance

- Keep screenshots updated when UI changes
- Review screenshots annually for accuracy
- Remove outdated screenshots
- Update this README if new screenshot types are needed

