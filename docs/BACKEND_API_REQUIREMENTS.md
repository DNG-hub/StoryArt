# Backend API Requirements for StoryArt Automation Pipeline

## Overview

The StoryArt automation pipeline requires 5 new backend API endpoints in the StoryTeller backend service to enable full lights-out operation from beat generation → prompt generation → image generation.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTOMATION PIPELINE FLOW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  StoryArt (Frontend)                                             │
│       │                                                           │
│       ├─1─► POST /api/v1/trigger/beats-ready (StorySwarm)       │
│       │                                                           │
│       ├─2─► GET  /api/v1/session/{timestamp}/prompts-status     │
│       │      (Poll until prompts ready)                          │
│       │                                                           │
│       ├─3─► GET  /api/v1/gpu/status                             │
│       │      (Check GPU availability)                            │
│       │                                                           │
│       ├─4─► POST /api/v1/swarmui/start                          │
│       │      (Launch SwarmUI if needed)                          │
│       │                                                           │
│       └─5─► Trigger "Create All Images" workflow                │
│                                                                   │
│  StorySwarm (Backend)                                            │
│       │                                                           │
│       ├─► GET  /api/v1/notifications/check                      │
│       │    (Poll for prompts-ready events)                       │
│       │                                                           │
│       └─► POST /api/v1/notifications/{id}/ack                   │
│            (Acknowledge processed notification)                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. GPU Status Endpoint

**Endpoint**: `GET /api/v1/gpu/status`

**Purpose**: Check NVIDIA GPU availability, utilization, and temperature before image generation

**Request**: None (GET request)

**Response**:
```json
{
  "available": true,
  "gpuCount": 1,
  "utilization": 45,
  "memoryUsed": 8192,
  "memoryTotal": 24576,
  "temperature": 65,
  "processCount": 2,
  "error": null
}
```

**Implementation Requirements**:
- Execute `nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,count --format=csv,noheader,nounits`
- Parse CSV output to extract metrics
- Return 200 with GPU status
- Return 500 with `available: false` if nvidia-smi fails

**Error Response**:
```json
{
  "available": false,
  "gpuCount": 0,
  "utilization": 0,
  "memoryUsed": 0,
  "memoryTotal": 0,
  "temperature": 0,
  "processCount": 0,
  "error": "nvidia-smi not found or GPU not available"
}
```

### 2. SwarmUI Service Start Endpoint

**Endpoint**: `POST /api/v1/swarmui/start`

**Purpose**: Launch SwarmUI subprocess and wait for it to become responsive

**Request**: None (POST request)

**Response**:
```json
{
  "success": true,
  "message": "SwarmUI started successfully",
  "port": 7801,
  "apiUrl": "http://localhost:7801"
}
```

**Implementation Requirements**:
- Launch SwarmUI as subprocess (platform-specific command)
- Wait up to 30 seconds for SwarmUI API to respond to health check
- Poll `http://localhost:7801/API/GetNewSession` every 2 seconds
- Return 200 when SwarmUI responsive
- Return 500 if SwarmUI fails to start or timeout

**Windows Implementation Example**:
```python
import subprocess
import asyncio

async def start_swarmui():
    process = subprocess.Popen(
        ["path/to/SwarmUI.exe"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for responsiveness
    for i in range(15):  # 30 seconds total (2s * 15)
        try:
            response = await fetch("http://localhost:7801/API/GetNewSession")
            if response.ok:
                return {"success": True, "port": 7801}
        except:
            await asyncio.sleep(2)

    return {"success": False, "error": "Timeout waiting for SwarmUI"}
```

**Error Response**:
```json
{
  "success": false,
  "error": "SwarmUI failed to start: [error message]"
}
```

### 3. Notification Check Endpoint

**Endpoint**: `GET /api/v1/notifications/check`

**Purpose**: StorySwarm polls this endpoint to check for prompts-ready notifications

**Request**: None (GET request)

**Response**:
```json
{
  "notifications": [
    {
      "id": "notif_abc123",
      "type": "prompts_ready",
      "sessionTimestamp": 1738195200000,
      "storyUuid": "59f64b1e-726a-439d-a6bc-0dfefcababdb",
      "episodeNumber": 2,
      "totalPrompts": 48,
      "timestamp": "2026-01-29T10:00:00Z"
    }
  ]
}
```

**Implementation Requirements**:
- Query Redis or database for unacknowledged notifications
- Return array of notifications (may be empty)
- Each notification includes unique ID for acknowledgment
- Filter by notification type (only return relevant types)

**Empty Response**:
```json
{
  "notifications": []
}
```

### 4. Notification Acknowledge Endpoint

**Endpoint**: `POST /api/v1/notifications/{notification_id}/ack`

**Purpose**: Mark notification as processed to prevent redelivery

**Request Parameters**:
- `notification_id` (path): Unique notification identifier

**Response**:
```json
{
  "success": true,
  "notificationId": "notif_abc123"
}
```

**Implementation Requirements**:
- Mark notification as acknowledged in Redis/database
- Prevent notification from appearing in future `/check` calls
- Return 200 on success
- Return 404 if notification not found

**Error Response**:
```json
{
  "success": false,
  "error": "Notification not found"
}
```

### 5. Session Prompts Status Endpoint

**Endpoint**: `GET /api/v1/session/{session_timestamp}/prompts-status`

**Purpose**: Check if prompts are ready for a specific session (for polling after beats saved)

**Request Parameters**:
- `session_timestamp` (path): Session timestamp (Unix milliseconds)

**Response**:
```json
{
  "promptsReady": true,
  "sessionTimestamp": 1738195200000,
  "totalBeats": 48,
  "totalPrompts": 48,
  "lastUpdated": "2026-01-29T10:05:00Z"
}
```

**Implementation Requirements**:
- Query Redis for session data by timestamp
- Check if all beats have associated prompts
- Return `promptsReady: true` if prompts exist for all beats
- Return `promptsReady: false` if prompts still being generated

**Not Ready Response**:
```json
{
  "promptsReady": false,
  "sessionTimestamp": 1738195200000,
  "totalBeats": 48,
  "totalPrompts": 0,
  "lastUpdated": "2026-01-29T10:00:00Z"
}
```

**Error Response** (Session not found):
```json
{
  "promptsReady": false,
  "error": "Session not found"
}
```

## Implementation Priority

| Priority | Endpoint | Complexity | Estimated Effort |
|----------|----------|------------|------------------|
| P0 | `/api/v1/session/{timestamp}/prompts-status` | Low | 30 min |
| P0 | `/api/v1/notifications/check` | Medium | 1 hour |
| P0 | `/api/v1/notifications/{id}/ack` | Low | 15 min |
| P1 | `/api/v1/gpu/status` | Medium | 45 min |
| P1 | `/api/v1/swarmui/start` | High | 2 hours |

## Redis Data Structures

### Session Storage (Existing)
```typescript
{
  timestamp: number;
  scriptText: string;
  episodeContext: string;
  storyUuid: string;
  analyzedEpisode: AnalyzedEpisode;
  promptMode: 'storyart' | 'storyswarm';
  retrievalMode: 'manual' | 'database';
  selectedLLM: string;
}
```

### Notification Queue (New)
```typescript
{
  id: string;
  type: 'prompts_ready' | 'beats_ready';
  sessionTimestamp: number;
  storyUuid: string;
  episodeNumber: number;
  totalPrompts: number;
  totalBeats: number;
  timestamp: Date;
  acknowledged: boolean;
}
```

**Redis Key Structure**:
- Sessions: `session:{timestamp}`
- Notifications: `notifications:pending` (sorted set by timestamp)
- Acknowledged: `notifications:ack:{notification_id}`

## Testing Strategy

### Unit Tests
- GPU status parsing (mock nvidia-smi output)
- SwarmUI health check (mock HTTP responses)
- Notification CRUD operations

### Integration Tests
1. **GPU Check Flow**:
   - Mock nvidia-smi with various GPU states
   - Verify correct status parsing
   - Test error handling (nvidia-smi not found)

2. **SwarmUI Launch Flow**:
   - Mock subprocess launch
   - Mock SwarmUI API health check
   - Test timeout handling

3. **Notification Flow**:
   - Create notification
   - Poll `/check` endpoint
   - Acknowledge notification
   - Verify notification no longer appears

### End-to-End Test
```bash
# 1. Save beats-only session (StoryArt)
POST /api/v1/session/save
{
  "promptMode": "storyswarm",
  "analyzedEpisode": { ... }
}

# 2. Check GPU status
GET /api/v1/gpu/status
# Expected: { "available": true, "utilization": <50% }

# 3. Start SwarmUI
POST /api/v1/swarmui/start
# Expected: { "success": true }

# 4. Poll for prompts
GET /api/v1/session/{timestamp}/prompts-status
# Expected: { "promptsReady": true }

# 5. Trigger image generation
# (Frontend workflow)
```

## Security Considerations

1. **Command Injection**: Sanitize all subprocess inputs (especially SwarmUI paths)
2. **Resource Limits**: Rate limit SwarmUI start endpoint (max 1 request per minute)
3. **Authentication**: All endpoints should require valid session token
4. **GPU Access**: Validate user has permission to query GPU status

## Error Handling

### Common Error Scenarios

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| nvidia-smi not found | 500 | `{ "available": false, "error": "..." }` |
| SwarmUI launch failure | 500 | `{ "success": false, "error": "..." }` |
| Session not found | 404 | `{ "error": "Session not found" }` |
| Notification not found | 404 | `{ "error": "Notification not found" }` |
| GPU not available | 200 | `{ "available": false }` |

## Performance Considerations

1. **GPU Status Caching**: Cache GPU status for 5 seconds (avoid excessive nvidia-smi calls)
2. **Notification Polling**: Frontend polls every 5 seconds (avoid overwhelming backend)
3. **SwarmUI Health Check**: Use 2-second timeout for health checks
4. **Session Lookup**: Index sessions by timestamp for fast lookup

## Future Enhancements

1. **WebSocket Support**: Replace polling with WebSocket notifications
2. **GPU Reservation**: Lock GPU for specific user during image generation
3. **SwarmUI Auto-Shutdown**: Stop SwarmUI after idle period
4. **Batch Notification**: Aggregate multiple notifications into single event
5. **Monitoring Dashboard**: Real-time view of automation pipeline status

## Migration Path

### Phase 1: Core Endpoints (P0)
- Implement session prompts status endpoint
- Implement notification check/ack endpoints
- Deploy and test with StorySwarm polling

### Phase 2: Hardware Integration (P1)
- Implement GPU status endpoint
- Implement SwarmUI start endpoint
- Add error handling and retry logic

### Phase 3: UI Integration
- Add automation toggle in StoryArt frontend
- Add automation status display
- Add configuration panel (GPU wait, auto-start, etc.)

### Phase 4: Optimization
- Add caching layer
- Optimize polling intervals
- Add monitoring and alerting

## Contact

For questions or clarification:
- **StoryArt Team**: Frontend automation integration
- **StorySwarm Team**: Multi-agent prompt generation
- **StoryTeller Team**: Backend API implementation
