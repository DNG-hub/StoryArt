# Integration Testing Guide: SwarmUI to DaVinci Pipeline

## Overview

This guide provides procedures for integration testing the complete SwarmUI to DaVinci Pipeline with real services. Integration tests verify end-to-end functionality with actual SwarmUI API, Redis, and file system operations.

## Prerequisites

### Required Services Running

1. **SwarmUI Service**
   - Must be running and accessible
   - API endpoint: `http://localhost:7801`
   - Test: `curl -X POST http://localhost:7801/API/GetNewSession`

2. **Redis API**
   - Must be running and accessible
   - API endpoint: `http://localhost:7802`
   - Test: `curl http://localhost:7802/api/v1/health`

3. **StoryArt Backend Server**
   - Must be running: `npm run dev:server`
   - Frontend: `npm run dev`

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure all required variables
3. Run validation: `npm run validate:env`

## Test Scenarios

### Test 11.1: Complete Bulk Pipeline

**Objective**: Test complete bulk pipeline with real Redis session, real SwarmUI API, verify images generated, and verify DaVinci organization.

**Steps**:

1. **Prepare Test Data**:
   ```bash
   # Ensure you have an analyzed episode with:
   # - Multiple scenes with beats
   # - Beats marked for NEW_IMAGE
   # - Prompts generated for those beats
   # - Session saved to Redis
   ```

2. **Run Bulk Processing**:
   - Open StoryArt application
   - Load/analyze episode script
   - Click "Generate All Images"
   - Monitor progress modal

3. **Verify Results**:
   - ✅ Check SwarmUI output directory for generated images
   - ✅ Verify images in date folders (`YYYY-MM-DD`)
   - ✅ Check DaVinci project folder created
   - ✅ Verify images organized by scene and format
   - ✅ Check filenames follow pattern: `{beatId}_{format}_v{version}.png`
   - ✅ Verify version numbering (v01, v02, v03)

4. **Expected Outcome**:
   - All prompts processed successfully
   - Images generated in SwarmUI
   - Images found and normalized
   - Images copied to DaVinci structure
   - Success summary displayed

**Verification Checklist**:
- [ ] SwarmUI session initialized
- [ ] Images generated (check SwarmUI output)
- [ ] Images found in date folders
- [ ] DaVinci project folder created
- [ ] Images organized correctly
- [ ] Filenames correct
- [ ] Progress updates received
- [ ] Success summary accurate

### Test 11.2: Individual Beat Pipeline

**Objective**: Test individual beat pipeline with real SwarmUI API, verify single image generated, and verify copied to DaVinci.

**Steps**:

1. **Select Beat**:
   - Open Output Panel
   - Find a beat with NEW_IMAGE decision
   - Click "New Image" button

2. **Generate Image**:
   - Select format (cinematic or vertical)
   - Review prompt
   - Click "Generate Image"

3. **Verify Results**:
   - ✅ Check SwarmUI output for generated image
   - ✅ Verify image found and normalized
   - ✅ Check DaVinci folder for copied image
   - ✅ Verify filename format correct
   - ✅ Check image path displayed in modal

4. **Test Both Formats**:
   - Test cinematic format (16:9)
   - Test vertical format (9:16)
   - Verify both saved to correct folders

**Verification Checklist**:
- [ ] Single image generated
- [ ] Image found in SwarmUI output
- [ ] Image copied to DaVinci
- [ ] Correct folder (LongForm/ShortForm)
- [ ] Filename correct
- [ ] Path displayed correctly

### Test 11.3: Error Scenarios

#### Scenario 3.1: SwarmUI Not Running

**Steps**:
1. Stop SwarmUI service
2. Attempt bulk processing
3. Verify error handling

**Expected**:
- ❌ Clear error message about SwarmUI not accessible
- ✅ Troubleshooting steps provided
- ✅ Retry option available
- ✅ No partial results saved

#### Scenario 3.2: Redis Not Available

**Steps**:
1. Stop Redis API service
2. Attempt to fetch session
3. Verify error handling

**Expected**:
- ❌ Clear error message about Redis not accessible
- ✅ Troubleshooting steps provided
- ✅ Suggestion to re-analyze episode

#### Scenario 3.3: Invalid Paths

**Steps**:
1. Set invalid `SWARMUI_OUTPUT_PATH` in `.env`
2. Attempt image generation
3. Verify error handling

**Expected**:
- ❌ Clear error about path not found
- ✅ Detailed search paths listed
- ✅ Troubleshooting steps provided

#### Scenario 3.4: Missing Prompts

**Steps**:
1. Use episode with beats marked NEW_IMAGE but no prompts
2. Attempt bulk processing
3. Verify handling

**Expected**:
- ⚠️ Warning about missing prompts
- ✅ Suggestion to regenerate prompts
- ✅ Processing continues with available prompts
- ✅ Summary shows skipped beats

### Test 11.4: UI Integration

#### Scenario 4.1: Button Clicks

**Test Cases**:
- ✅ "Generate All Images" button opens progress modal
- ✅ "New Image" button opens modal with beat data
- ✅ "Cancel" button stops processing
- ✅ "Retry Pipeline" button restarts failed operation
- ✅ "Copy Path" copies image path to clipboard
- ✅ "Open in Explorer" opens file location

#### Scenario 4.2: Modal Interactions

**Test Cases**:
- ✅ Progress modal shows real-time updates
- ✅ Format tabs switch correctly (cinematic/vertical)
- ✅ Progress bar updates smoothly
- ✅ Estimated time updates dynamically
- ✅ Cancel button works during processing
- ✅ Modal closes on completion

#### Scenario 4.3: Progress Updates

**Test Cases**:
- ✅ Progress percentage updates correctly
- ✅ Current step name updates
- ✅ Estimated time calculation works
- ✅ Progress bar animates smoothly
- ✅ Multiple progress updates received
- ✅ Final progress shows 100%

## Test Execution

### Manual Test Script

Create a test script to automate some checks:

```javascript
// test-integration-manual.js
// Manual integration test helper

const testBulkPipeline = async () => {
  console.log('Testing bulk pipeline...');
  // 1. Verify SwarmUI is running
  // 2. Verify Redis is accessible
  // 3. Check session exists
  // 4. Trigger bulk processing
  // 5. Monitor progress
  // 6. Verify results
};

const testSingleBeat = async (beatId, format) => {
  console.log(`Testing single beat: ${beatId} (${format})`);
  // 1. Open modal
  // 2. Select format
  // 3. Generate image
  // 4. Verify result
};
```

### Automated Checks

While full automation requires real services, you can verify:

```bash
# Check SwarmUI is running
curl -X POST http://localhost:7801/API/GetNewSession

# Check Redis API
curl http://localhost:7802/api/v1/health

# Validate environment
npm run validate:env

# Run unit tests
npm run test:run
```

## Test Data Requirements

### Valid Episode Data

For testing, ensure you have:

1. **Analyzed Episode**:
   - Multiple scenes (2-3 minimum)
   - Multiple beats per scene
   - Mix of NEW_IMAGE and REUSE_EXISTING decisions
   - Prompts generated for NEW_IMAGE beats

2. **Session Data**:
   - Saved to Redis
   - Contains analyzed episode
   - Contains prompts for beats

3. **Test Scenarios**:
   - Small episode (5-10 prompts) for quick testing
   - Medium episode (20-30 prompts) for realistic testing
   - Large episode (50+ prompts) for stress testing

## Verification Procedures

### Verify Image Generation

1. **Check SwarmUI Output**:
   ```bash
   # Navigate to SwarmUI output directory
   cd {SWARMUI_OUTPUT_PATH}/local/raw
   
   # Check today's date folder
   ls {YYYY-MM-DD}/
   
   # Verify images exist
   ```

2. **Verify Image Paths**:
   - Images should be in date folders
   - Filenames should match SwarmUI format
   - Paths should be accessible

### Verify DaVinci Organization

1. **Check Project Folder**:
   ```bash
   # Navigate to DaVinci projects
   cd {DAVINCI_PROJECTS_PATH}
   
   # Check episode folder exists
   ls Episode_*/
   
   # Verify structure
   ls Episode_*/01_Assets/Images/
   ```

2. **Verify Image Organization**:
   - ✅ Images in LongForm folder (cinematic)
   - ✅ Images in ShortForm folder (vertical)
   - ✅ Images organized by scene
   - ✅ Filenames follow pattern
   - ✅ Version numbers correct

### Verify Progress Updates

1. **Check Console Logs**:
   - Open browser developer console
   - Verify progress events received
   - Check for errors

2. **Verify UI Updates**:
   - Progress bar updates
   - Step names update
   - Estimated time updates
   - Progress percentage accurate

## Test Results Recording

### Test Report Template

```markdown
## Integration Test Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Details]

### Test 11.1: Bulk Pipeline
- **Status**: ✅ Pass / ❌ Fail
- **Duration**: [Time]
- **Images Generated**: [Count]
- **Success Rate**: [Percentage]
- **Issues**: [List any issues]

### Test 11.2: Single Beat
- **Status**: ✅ Pass / ❌ Fail
- **Format Tested**: [cinematic/vertical]
- **Issues**: [List any issues]

### Test 11.3: Error Scenarios
- **SwarmUI Not Running**: ✅ / ❌
- **Redis Not Available**: ✅ / ❌
- **Invalid Paths**: ✅ / ❌
- **Missing Prompts**: ✅ / ❌

### Test 11.4: UI Integration
- **Button Clicks**: ✅ / ❌
- **Modal Interactions**: ✅ / ❌
- **Progress Updates**: ✅ / ❌
```

## Troubleshooting Test Issues

### SwarmUI Connection Fails

**Check**:
- SwarmUI service is running
- Port 7801 is not blocked
- API URL is correct
- SwarmUI logs for errors

### Redis Connection Fails

**Check**:
- Redis API service is running
- Port 7802 is accessible
- Session data exists
- Redis API logs

### Images Not Found

**Check**:
- SwarmUI output path is correct
- Date folders exist
- Images were actually generated
- Filename matches exactly

### DaVinci Organization Fails

**Check**:
- DaVinci projects path is writable
- Disk space available
- Path permissions correct
- Episode folder naming correct

## Continuous Testing

### Regular Test Schedule

- **After Code Changes**: Run full integration test suite
- **Before Releases**: Test all scenarios
- **After Environment Changes**: Verify configuration
- **Weekly**: Smoke test with real data

### Test Maintenance

- Update test data as needed
- Keep test scenarios current
- Document new issues found
- Update this guide with new scenarios

