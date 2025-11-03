# Redis Session Restore PRD
## StoryArt Session Persistence & Restoration

### **Project Status & Context**
- **Current Implementation:** ✅ Complete - Redis API backend + localStorage fallback
- **Backend Server:** Express.js server on port 7802
- **Storage Strategy:** Redis (primary) → Memory (fallback) → localStorage (client-side fallback)
- **Integration:** Seamlessly integrated with existing SwarmUI export workflow

---

## **Problem Statement**

### **Current Issues:**
1. **No Session Persistence:** Users lose their work when closing the browser or refreshing
2. **Workflow Interruption:** No way to resume analysis after browser restart
3. **No Export/Restore Mechanism:** Unable to save and restore complete analysis sessions
4. **Lost Context:** Script text, episode context, analyzed episodes, and prompts are lost

### **Business Impact:**
- Users must re-analyze scripts after browser refresh
- No way to share or backup analysis sessions
- Lost productivity from repeated analysis work
- No version history or session management

---

## **Solution Requirements**

### **Target State:**
- **Automatic Session Saving:** Sessions saved automatically after analysis completes
- **One-Click Restore:** Simple "Restore Last Session" button in UI
- **Multi-Storage Strategy:** Redis → Memory → localStorage fallback
- **Session Persistence:** Sessions survive browser restarts and server reboots (with Redis)
- **User Experience:** Seamless, transparent session management

---

## **Technical Implementation**

### **Phase 1: Backend Redis API Server** ✅ COMPLETED

**1.1. Express Server (`server.js`)**
- **Port:** 7802 (configurable via `REDIS_API_PORT`)
- **Endpoints:**
  - `POST /api/v1/session/save` - Save session data
  - `GET /api/v1/session/latest` - Get latest session
  - `GET /api/v1/session/list` - List all sessions (debug)
  - `GET /health` - Health check

**1.2. Storage Strategy**
- **Primary:** Redis (if `REDIS_URL` configured)
- **Fallback:** In-memory Map (when Redis unavailable)
- **TTL:** 7 days for Redis sessions
- **Error Handling:** Graceful degradation to fallback storage

**1.3. Session Data Structure**
```typescript
interface SwarmUIExportData {
  scriptText: string;
  episodeContext: string;
  storyUuid: string;
  analyzedEpisode: AnalyzedEpisode;
}
```

### **Phase 2: Frontend Integration** ✅ COMPLETED

**2.1. Redis Service (`services/redisService.ts`)**
- `saveSessionToRedis()` - Save session with Redis API fallback
- `getLatestSession()` - Retrieve session with localStorage fallback
- Multi-endpoint strategy (tries Redis API → StoryTeller API → localStorage)

**2.2. Automatic Session Saving**
- Triggered after successful script analysis
- Saves: script text, episode context, story UUID, analyzed episode
- Non-blocking (doesn't interrupt user workflow)

**2.3. UI Integration**
- "Restore Last Session" button in `InputPanel`
- Loading states during restore
- Error messages for failed restores
- Success indicators when restore completes

### **Phase 3: Fallback Mechanisms** ✅ COMPLETED

**3.1. Storage Priority**
1. **Redis API** (if backend running and Redis configured)
2. **StoryTeller API** (if Redis endpoints exist there)
3. **localStorage** (always available, client-side only)

**3.2. Error Handling**
- Graceful degradation at each level
- User-friendly error messages
- No disruption to analysis workflow
- Automatic fallback to next storage method

---

## **API Specification**

### **POST /api/v1/session/save**
**Request:**
```json
{
  "scriptText": "...",
  "episodeContext": "...",
  "storyUuid": "...",
  "analyzedEpisode": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session saved successfully",
  "sessionKey": "storyart:session:1234567890",
  "storage": "redis" | "memory"
}
```

### **GET /api/v1/session/latest**
**Response:**
```json
{
  "success": true,
  "data": {
    "scriptText": "...",
    "episodeContext": "...",
    "storyUuid": "...",
    "analyzedEpisode": { ... }
  },
  "storage": "redis" | "memory"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No session found"
}
```

---

## **Success Criteria**

### **Functional Requirements:**
- ✅ Sessions automatically saved after analysis
- ✅ One-click restore functionality
- ✅ Redis persistence (with Redis configured)
- ✅ Memory fallback (when Redis unavailable)
- ✅ localStorage fallback (when backend unavailable)
- ✅ Health check endpoint for monitoring
- ✅ Error handling at all levels

### **User Experience Requirements:**
- ✅ Transparent session saving (no user action required)
- ✅ Simple restore button
- ✅ Clear error messages
- ✅ Loading states during restore
- ✅ No workflow interruption

### **Technical Requirements:**
- ✅ Express backend server
- ✅ Redis integration (optional)
- ✅ CORS configuration for frontend access
- ✅ Environment variable configuration
- ✅ Graceful shutdown handling
- ✅ Multi-storage fallback chain

---

## **Configuration**

### **Environment Variables**

**Backend (.env):**
```env
# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379/0
REDIS_API_PORT=7802

# Server Configuration
NODE_ENV=development
```

**Frontend (.env):**
```env
# Redis API Configuration
VITE_REDIS_API_URL=http://localhost:7802/api/v1

# StoryTeller API (fallback)
VITE_STORYTELLER_API_URL=http://localhost:8000
```

---

## **Usage**

### **Starting the Backend:**
```powershell
# Option 1: Using startup script (recommended)
.\start-storyart.ps1

# Option 2: Manual start
npm run dev:server

# Option 3: Both frontend and backend
npm run dev:all
```

### **User Workflow:**
1. **Analyze Script:** Session automatically saved after analysis completes
2. **Restore Session:** Click "Restore Last Session" button to restore all data
3. **Continue Work:** Resume from where you left off

---

## **Implementation Files**

### **Backend:**
- `server.js` - Express server with Redis integration
- `package.json` - Dependencies and scripts

### **Frontend:**
- `services/redisService.ts` - Redis API client with fallbacks
- `App.tsx` - Session save/restore integration
- `components/InputPanel.tsx` - Restore button UI

### **Infrastructure:**
- `start-storyart.ps1` - Startup script with backend support

---

## **Future Enhancements**

### **Phase 4: Advanced Features (Planned)**
- [ ] Session versioning (multiple saved sessions)
- [ ] Session history browser
- [ ] Session export/import (JSON files)
- [ ] Session sharing between users
- [ ] Session metadata (timestamp, script name, etc.)
- [ ] Session search and filtering

### **Phase 5: Integration Enhancements**
- [ ] Integration with StoryTeller API for persistent storage
- [ ] User-specific session storage
- [ ] Session expiration policies
- [ ] Session backup/restore to cloud storage

---

## **Testing**

### **Test Scenarios:**
1. ✅ Save session after analysis
2. ✅ Restore session from Redis
3. ✅ Restore session from memory (Redis unavailable)
4. ✅ Restore session from localStorage (backend unavailable)
5. ✅ Error handling for all failure modes
6. ✅ Health check endpoint functionality

### **Test Commands:**
```bash
# Test health check
curl http://localhost:7802/health

# Test save session
curl -X POST http://localhost:7802/api/v1/session/save \
  -H "Content-Type: application/json" \
  -d '{"scriptText":"...","episodeContext":"...","storyUuid":"...","analyzedEpisode":{}}'

# Test get latest session
curl http://localhost:7802/api/v1/session/latest
```

---

## **Notes**

### **Design Decisions:**
1. **Multi-Storage Strategy:** Ensures functionality works in all environments
2. **Automatic Saving:** Reduces user friction, no manual save required
3. **Non-Blocking:** Session save doesn't interrupt analysis workflow
4. **Graceful Degradation:** System works even if Redis unavailable

### **Constraints:**
- Sessions stored in Redis are persistent (survive server restart)
- Sessions stored in memory are lost on server restart
- Sessions stored in localStorage are browser-specific

### **Security Considerations:**
- No authentication required for development (add for production)
- CORS configured for localhost origins only
- Session data contains no sensitive information (public script analysis)

---

*This PRD documents the Redis Session Restore feature implementation. Update as enhancements are added.*

