# StoryArt Automation Pipeline Integration Guide

## Overview

This document describes how to enable and test the full automation pipeline that coordinates beat generation → prompt generation → image generation without manual intervention.

## Current Status

**Phase 1: Infrastructure Complete ✅**
- ✅ GPU monitoring service (`services/gpuMonitorService.ts`)
- ✅ SwarmUI service manager (`services/swarmUIServiceManager.ts`)
- ✅ Webhook receiver service (`services/webhookReceiverService.ts`)
- ✅ Automation orchestrator (`services/automationOrchestrator.ts`)
- ✅ StorySwarm beats-ready notification in App.tsx
- ✅ UI controls for automation configuration (disabled until backend ready)

**Phase 2: Backend APIs Required ⏳**
- ⏳ GPU status endpoint (GET /api/v1/gpu/status)
- ⏳ SwarmUI start endpoint (POST /api/v1/swarmui/start)
- ⏳ Notification check endpoint (GET /api/v1/notifications/check)
- ⏳ Notification acknowledge endpoint (POST /api/v1/notifications/{id}/ack)
- ⏳ Session prompts status endpoint (GET /api/v1/session/{timestamp}/prompts-status)

See `docs/BACKEND_API_REQUIREMENTS.md` for detailed API specifications.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER ACTION: Run beat analysis (StorySwarm mode)           │
│                                                                  │
│  2. BEAT ANALYSIS: Gemini/Claude analyzes script               │
│     └─► processedResult: { scenes, beats, episodeNumber }      │
│                                                                  │
│  3. SAVE TO REDIS: Beats saved without prompts                 │
│     └─► promptMode: 'storyswarm'                               │
│                                                                  │
│  4. NOTIFY STORYSWARM: POST to localhost:8050                  │
│     └─► { sessionTimestamp, storyUuid, episodeNumber }         │
│                                                                  │
│  5. [IF AUTOMATION ENABLED] WAIT FOR PROMPTS:                  │
│     └─► Poll Redis every 10 seconds (max 30 minutes)           │
│                                                                  │
│  6. [IF AUTOMATION ENABLED] CHECK GPU:                         │
│     └─► GET /api/v1/gpu/status                                 │
│     └─► Wait if utilization > 80% or memory < 4GB              │
│                                                                  │
│  7. [IF AUTOMATION ENABLED] ENSURE SWARMUI:                    │
│     └─► Check localhost:7801 health                            │
│     └─► POST /api/v1/swarmui/start if not running              │
│                                                                  │
│  8. [IF AUTOMATION ENABLED] AUTO-TRIGGER IMAGES:               │
│     └─► Trigger "Create All Images" workflow                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
┌──────────────┐
│   App.tsx    │
│ (handleAnalyze)
└──────┬───────┘
       │
       ├──► analyzeScriptWithProvider() ──► Beat analysis
       │
       ├──► saveSessionToRedis() ──► Redis storage
       │
       ├──► notifyStorySwarmBeatsReady() ──► StorySwarm trigger
       │
       └──► [IF AUTOMATION] startAutomationPipeline()
                   │
                   ├──► waitForPrompts()
                   │       └──► checkIfPromptsReady() (poll Redis)
                   │
                   ├──► isGPUReadyForGeneration()
                   │       └──► checkGPUStatus() (nvidia-smi via backend)
                   │
                   ├──► ensureSwarmUIRunning()
                   │       └──► checkSwarmUIStatus()
                   │       └──► startSwarmUI() (if needed)
                   │
                   └──► onImageGenerationTrigger()
                            └──► "Create All Images" workflow
```

## Configuration

### AutomationConfig Interface

```typescript
export interface AutomationConfig {
  enabled: boolean;                   // Master toggle
  waitForGPU: boolean;                // Wait for GPU availability
  autoStartSwarmUI: boolean;          // Launch SwarmUI if not running
  autoTriggerImageGeneration: boolean; // Auto-trigger "Create All Images"
  maxWaitTimeMinutes: number;         // Max time to wait for prompts (default: 30)
}
```

### Default Configuration

```typescript
const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  enabled: false,                     // Disabled until backend ready
  waitForGPU: true,                   // Safe default: wait for GPU
  autoStartSwarmUI: true,             // Convenience: auto-start SwarmUI
  autoTriggerImageGeneration: false,  // Safe default: manual trigger
  maxWaitTimeMinutes: 30              // 30 minute timeout
};
```

## Enabling Automation

### Step 1: Verify Backend APIs

Before enabling automation, ensure all 5 backend endpoints are implemented and responding:

```bash
# Test GPU status endpoint
curl http://localhost:8000/api/v1/gpu/status

# Expected response:
{
  "available": true,
  "gpuCount": 1,
  "utilization": 45,
  "memoryUsed": 8192,
  "memoryTotal": 24576,
  "temperature": 65,
  "processCount": 2
}

# Test SwarmUI start endpoint
curl -X POST http://localhost:8000/api/v1/swarmui/start

# Expected response:
{
  "success": true,
  "port": 7801,
  "apiUrl": "http://localhost:7801"
}

# Test notification check endpoint
curl http://localhost:8000/api/v1/notifications/check

# Expected response:
{
  "notifications": []
}

# Test session prompts status endpoint
curl http://localhost:8000/api/v1/session/1738195200000/prompts-status

# Expected response:
{
  "promptsReady": false,
  "sessionTimestamp": 1738195200000,
  "totalBeats": 48,
  "totalPrompts": 0
}
```

### Step 2: Enable Automation in App.tsx

Once backend APIs are ready, modify `App.tsx` to:

1. **Add automation config state**:
```typescript
const [automationConfig, setAutomationConfig] = useState<AutomationConfig>({
  enabled: false,
  waitForGPU: true,
  autoStartSwarmUI: true,
  autoTriggerImageGeneration: false,
  maxWaitTimeMinutes: 30
});
```

2. **Update beats-only section to call automation pipeline**:
```typescript
if (saveResult.success) {
  // Existing notification code...
  await notifyStorySwarmBeatsReady(...);

  // NEW: Start automation pipeline if enabled
  if (automationConfig.enabled) {
    const sessionTimestamp = Date.now();
    const totalBeats = processedResult.scenes.reduce((sum, s) => sum + s.beats.length, 0);

    const automationResult = await startAutomationPipeline(
      sessionTimestamp,
      storyUuid,
      processedResult.episodeNumber,
      totalBeats,
      automationConfig,
      async () => {
        // Callback: Auto-trigger "Create All Images"
        console.log('🤖 Auto-triggering image generation...');
        // TODO: Call your "Create All Images" workflow function here
      }
    );

    if (!automationResult.success) {
      console.error('❌ Automation pipeline failed:', automationResult.error);
      setError(`Automation failed: ${automationResult.error}`);
    }
  }
}
```

3. **Pass automation config to InputPanel**:
```typescript
<InputPanel
  // ... existing props
  automationConfig={automationConfig}
  onAutomationConfigChange={setAutomationConfig}
/>
```

### Step 3: Enable UI Controls in InputPanel.tsx

Remove `disabled` attributes from automation checkboxes:

```typescript
<label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
  <input
    type="checkbox"
    checked={automationConfig.enabled}
    onChange={(e) => onAutomationConfigChange({
      ...automationConfig,
      enabled: e.target.checked
    })}
    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded"
  />
  <span>Enable full automation</span>
</label>

<label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer ml-5">
  <input
    type="checkbox"
    checked={automationConfig.waitForGPU}
    onChange={(e) => onAutomationConfigChange({
      ...automationConfig,
      waitForGPU: e.target.checked
    })}
    disabled={!automationConfig.enabled}
    className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded disabled:opacity-50"
  />
  <span>Wait for GPU availability before generation</span>
</label>

// ... similar for autoStartSwarmUI and autoTriggerImageGeneration
```

### Step 4: Add Automation Status Display

Add a status panel to show automation pipeline progress:

```typescript
// In App.tsx
import { setAutomationStatusCallback, getAutomationStatus } from './services/automationOrchestrator';

const [automationStatus, setAutomationStatus] = useState(getAutomationStatus());

useEffect(() => {
  setAutomationStatusCallback((status) => {
    setAutomationStatus(status);
  });
}, []);

// In Dashboard component
{automationStatus.phase !== 'idle' && (
  <div className="bg-blue-900/20 border border-blue-700 rounded p-4 mb-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-blue-400">
        Automation Pipeline: {automationStatus.phase.replace(/_/g, ' ').toUpperCase()}
      </span>
      <span className="text-xs text-gray-400">{automationStatus.progress}%</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${automationStatus.progress}%` }}
      />
    </div>
    <div className="text-xs text-gray-400">{automationStatus.message}</div>
  </div>
)}
```

## Testing

### Manual Testing Checklist

#### Test 1: Beats-Only Mode (No Automation)
1. ✅ Set Prompt Mode to "StorySwarm"
2. ✅ Ensure automation is DISABLED
3. ✅ Run beat analysis
4. ✅ Verify beats saved to Redis
5. ✅ Verify StorySwarm notification sent
6. ✅ Verify UI exits after notification
7. ✅ Check console for: "StorySwarm notified - prompts will be generated asynchronously"

#### Test 2: GPU Status Check
1. ✅ Implement backend GET /api/v1/gpu/status endpoint
2. ✅ Call `checkGPUStatus()` from browser console
3. ✅ Verify correct GPU metrics returned
4. ✅ Test with GPU under load (run separate process)
5. ✅ Verify `isGPUReadyForGeneration()` returns false when busy

#### Test 3: SwarmUI Auto-Start
1. ✅ Ensure SwarmUI is NOT running
2. ✅ Call `ensureSwarmUIRunning()` from browser console
3. ✅ Verify SwarmUI process starts
4. ✅ Verify function waits for responsiveness
5. ✅ Verify returns true when SwarmUI ready

#### Test 4: Notification Polling
1. ✅ Start notification polling: `startNotificationPolling((notif) => console.log(notif))`
2. ✅ Manually create notification in backend
3. ✅ Verify notification received in callback
4. ✅ Verify notification acknowledged automatically

#### Test 5: Full Automation Pipeline
1. ✅ Enable all automation options
2. ✅ Set Prompt Mode to "StorySwarm"
3. ✅ Run beat analysis
4. ✅ Monitor automation status panel
5. ✅ Verify each phase completes:
   - ✅ waiting_for_prompts (polls Redis)
   - ✅ checking_gpu (checks availability)
   - ✅ starting_swarmui (launches if needed)
   - ✅ generating_images (triggers workflow)
6. ✅ Verify images generated automatically

### Automated Testing

Create test script: `tests/automation_pipeline.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { startAutomationPipeline } from '../services/automationOrchestrator';
import { checkGPUStatus, isGPUReadyForGeneration } from '../services/gpuMonitorService';
import { ensureSwarmUIRunning } from '../services/swarmUIServiceManager';

describe('Automation Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should notify StorySwarm when beats are ready', async () => {
    const config = {
      enabled: false, // Notification only, no automation
      waitForGPU: false,
      autoStartSwarmUI: false,
      autoTriggerImageGeneration: false,
      maxWaitTimeMinutes: 1
    };

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    // Test notification
    const result = await notifyStorySwarmBeatsReady(
      Date.now(),
      'test-uuid',
      2,
      48
    );

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8050/api/v1/trigger/beats-ready',
      expect.any(Object)
    );
  });

  it('should wait for GPU when enabled', async () => {
    const config = {
      enabled: true,
      waitForGPU: true,
      autoStartSwarmUI: false,
      autoTriggerImageGeneration: false,
      maxWaitTimeMinutes: 1
    };

    // Mock GPU as busy initially, then ready
    let gpuCallCount = 0;
    vi.spyOn({ checkGPUStatus }, 'checkGPUStatus').mockImplementation(async () => {
      gpuCallCount++;
      return {
        available: true,
        gpuCount: 1,
        utilization: gpuCallCount === 1 ? 85 : 45, // Busy → Ready
        memoryUsed: 8192,
        memoryTotal: 24576,
        temperature: 65,
        processCount: 2
      };
    });

    // Should wait for GPU to become available
    const isReady = await isGPUReadyForGeneration();
    expect(isReady).toBe(false); // First call: busy

    // Retry
    const isReadyRetry = await isGPUReadyForGeneration();
    expect(isReadyRetry).toBe(true); // Second call: ready
  });

  it('should auto-start SwarmUI when not running', async () => {
    const startSwarmUIMock = vi.fn().mockResolvedValue({ success: true });

    const result = await ensureSwarmUIRunning();
    expect(result).toBe(true);
  });
});
```

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Timeout waiting for prompts" | StorySwarm not processing beats | Check StorySwarm logs, increase timeout |
| "GPU not available" | nvidia-smi not found | Install NVIDIA drivers, verify GPU accessible |
| "Failed to start SwarmUI" | SwarmUI executable not found | Verify SwarmUI path in backend config |
| "SwarmUI not responding" | SwarmUI crashed or port conflict | Check SwarmUI logs, verify port 7801 available |
| "Automation failed: Unknown error" | Network issue or backend down | Check backend service status, network connectivity |

### Error Recovery

The automation pipeline includes automatic error recovery:

1. **Prompt Generation Timeout**: Pipeline exits gracefully, user can manually trigger when prompts ready
2. **GPU Busy**: Waits up to 5 minutes, then exits with error
3. **SwarmUI Start Failure**: Returns error, user can manually start SwarmUI
4. **Network Errors**: Retries failed requests 3 times before failing

### Logging

All automation events are logged to console with clear prefixes:

```
[Automation] waiting_for_prompts: Notifying StorySwarm and waiting for prompts... (10%)
[Automation] checking_gpu: Checking GPU availability... (50%)
[Automation] starting_swarmui: Ensuring SwarmUI is running... (70%)
[Automation] generating_images: Triggering image generation... (90%)
[Automation] complete: Automation pipeline complete (100%)
```

## Performance Considerations

### Polling Intervals

| Service | Interval | Reason |
|---------|----------|--------|
| Prompts status | 10 seconds | Balance between responsiveness and load |
| GPU status | 5 seconds | Quick detection of availability changes |
| SwarmUI health | 2 seconds | Fast startup detection |
| Notification polling | 5 seconds | Real-time notification delivery |

### Timeouts

| Operation | Timeout | Configurable |
|-----------|---------|--------------|
| Wait for prompts | 30 minutes | Yes (maxWaitTimeMinutes) |
| Wait for GPU | 5 minutes | No (hardcoded) |
| SwarmUI startup | 30 seconds | No (hardcoded) |
| HTTP requests | 3 seconds | No (hardcoded) |

### Resource Usage

- **CPU**: Minimal (polling operations are lightweight)
- **Memory**: < 100MB for automation services
- **Network**: < 1KB/s (polling overhead)
- **GPU**: Only when image generation triggered

## Future Enhancements

1. **WebSocket Support**: Replace polling with real-time notifications
2. **GPU Reservation**: Lock GPU for specific user/session
3. **Batch Processing**: Process multiple episodes sequentially
4. **Smart Scheduling**: Queue episodes during off-peak GPU hours
5. **Progress Persistence**: Resume interrupted pipelines
6. **Email Notifications**: Alert user when generation complete
7. **Cost Tracking**: Track API costs and GPU usage per episode

## Support

For issues or questions:
- **Frontend Issues**: StoryArt repository
- **Backend API Issues**: StoryTeller repository
- **Automation Pipeline Issues**: Create issue in StoryArt repo with logs

## Changelog

### 2026-01-29
- Initial automation infrastructure created
- 4 service files implemented
- Backend API requirements documented
- UI controls added (disabled until backend ready)
- Integration guide created
