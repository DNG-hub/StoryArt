# StorySwarm Integration Plan v2: Prompt-Only Mode

**Date:** 2025-06-28  
**Status:** Proposal for StoryArt Review  
**Approach:** Option A — StorySwarm generates prompts, StoryArt keeps image generation

---

## Executive Summary

StorySwarm will provide **enhanced visual prompts** via API. StoryArt retains full control of the image generation pipeline ("Create Images" button → SwarmUI → Review). This minimizes integration complexity while delivering the quality benefits of multi-agent prompt generation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           STORYART                                  │
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Script  │───▶│ Beat Analysis │───▶│  Redis   │───▶│  Review  │  │
│  │  Upload  │    │ (beats only) │    │  Session │    │   Stage  │  │
│  └──────────┘    └──────────────┘    └────┬─────┘    └────▲─────┘  │
│                                           │                │        │
│                         ┌─────────────────┘                │        │
│                         │                                  │        │
│                         ▼                                  │        │
│                  ┌─────────────┐    ┌──────────────┐       │        │
│                  │   Call      │───▶│ Create Images│───────┘        │
│                  │ StorySwarm  │    │   (SwarmUI)  │                │
│                  │    API      │    └──────────────┘                │
│                  └─────────────┘                                    │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ POST /api/v1/visual-prompt/generate-batch
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          STORYSWARM                                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Visual Prompt Swarm                         │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌────────────────┐  ┌──────────┐              │  │
│  │  │ Director │  │ Cinematographer│  │ Stylist  │              │  │
│  │  └────┬─────┘  └───────┬────────┘  └────┬─────┘              │  │
│  │       │                │                 │                    │  │
│  │       └────────────────┼─────────────────┘                    │  │
│  │                        ▼                                      │  │
│  │               ┌─────────────────┐                             │  │
│  │               │  SetDesigner    │ ◀── Database lookups        │  │
│  │               └────────┬────────┘                             │  │
│  │                        │                                      │  │
│  │                        ▼                                      │  │
│  │               ┌─────────────────┐                             │  │
│  │               │  PromptWeaver   │ ─▶ Rich narrative prompts   │  │
│  │               └─────────────────┘                             │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Interface Contract

### Endpoint

```
POST /api/v1/visual-prompt/generate-batch
```

### Request (from StoryArt)

```json
{
  "beats": [
    {
      "beatId": "s2-b7",
      "sceneNumber": 2,
      "beatNumber": 7,
      "scriptText": "Cat types furiously at the terminal as warning lights flash...",
      "characters": ["uuid-cat", "uuid-marcus"],
      "locationId": "uuid-trailer",
      "emotionalTone": "desperate tension",
      "visualElements": ["keyboard", "warning lights", "sweat"]
    }
  ],
  "episode_context": {
    "episodeNumber": 2,
    "title": "Episode Title"
  },
  "style_config": {
    "model": "flux1-dev-fp8",
    "cinematicAspectRatio": "16:9",
    "steps": 40
  }
}
```

### Response (to StoryArt)

```json
{
  "success": true,
  "prompts": [
    {
      "beatId": "s2-b7",
      "prompt": {
        "positive": "JRUMLV woman hunched over flickering console in cramped trailer interior, harsh fluorescent light casting shadows across her sweat-stained tactical shirt as her fingers fly desperately across the keyboard, warning lights pulsing red in the background, dark brown hair escaping from practical ponytail, green eyes intense with focus, medium close-up shot slightly elevated looking down, shallow depth of field with blurred server racks in background, atmosphere of desperate tension",
        "negative": "blurry, distorted faces, bright cheerful colors, fantasy elements, unrealistic proportions, peaceful setting, relaxed postures"
      },
      "generation_metadata": {
        "agents_consulted": ["director", "cinematographer", "stylist", "set_designer", "prompt_weaver"],
        "database_sources": {
          "character": "cat-uuid",
          "location": "trailer-uuid"
        },
        "continuity_notes": "Cat wearing tactical shirt from scene 1"
      }
    }
  ],
  "stats": {
    "beats_processed": 1,
    "generation_time_ms": 2400
  }
}
```

---

## Changes Required

### StoryArt Changes

| File | Change | Effort |
|------|--------|--------|
| `.env` | Add `PROMPT_GENERATION_MODE=storyart\|storyswarm` | 5 min |
| `.env` | Add `STORYSWARM_API_URL=http://localhost:8050` | 5 min |
| `geminiService.ts` | Skip prompt generation when mode=storyswarm | 30 min |
| `promptGenerationService.ts` | Add `generatePromptsViaStorySwarm()` function | 1 hour |
| `App.tsx` or pipeline | Call StorySwarm API after beat analysis, before "Create Images" | 1 hour |

**Total StoryArt effort:** ~3 hours

### StorySwarm Changes

| File | Change | Effort |
|------|--------|--------|
| `routers/visual_prompt_router.py` | Add `/generate-batch` endpoint | 1 hour |
| `visual_prompt_agency.py` | Ensure batch processing works | 30 min |
| Testing | End-to-end with sample beats | 1 hour |

**Total StorySwarm effort:** ~2.5 hours

---

## Workflow Comparison

### Current (StoryArt only)

```
1. Upload script
2. Analyze → beats + prompts (single-pass Gemini)
3. Save to Redis
4. Click "Create Images" → SwarmUI
5. Review images
```

### Proposed (StoryArt + StorySwarm)

```
1. Upload script
2. Analyze → beats only (no prompts)
3. Save beats to Redis
4. Call StorySwarm API → rich multi-agent prompts
5. Merge prompts into beats
6. Click "Create Images" → SwarmUI (unchanged)
7. Review images (unchanged)
```

**Key point:** Steps 6-7 are unchanged. StoryArt's image generation and review pipeline stays exactly as-is.

---

## Fallback Strategy

If StorySwarm is unavailable:

```typescript
async function generatePrompts(beats, mode) {
  if (mode === 'storyswarm') {
    try {
      return await callStorySwarmAPI(beats);
    } catch (error) {
      console.warn('StorySwarm unavailable, falling back to local generation');
      return await generatePromptsLocally(beats);  // existing code
    }
  }
  return await generatePromptsLocally(beats);
}
```

---

## Quality Expectations

| Metric | StoryArt (current) | StorySwarm (proposed) |
|--------|-------------------|----------------------|
| Prompt length | ~50-80 tokens | ~100-150 tokens |
| Narrative style | List-based | Prose narrative |
| Emotional context | Basic | Rich subtext |
| Technical specs | Implicit | Explicit (shot type, DOF, lighting) |
| Character continuity | Per-beat | Cross-beat tracking |
| Database adherence | Good | Strict (SetDesigner validates) |

---

## Testing Plan

### Phase 1: API Contract (StorySwarm)
- [ ] Implement `/generate-batch` endpoint
- [ ] Test with mock beats
- [ ] Verify response schema matches contract

### Phase 2: Integration (StoryArt)
- [ ] Add mode flag
- [ ] Implement API call
- [ ] Test with Episode 2 beats

### Phase 3: Quality Comparison
- [ ] Same beats → both pipelines
- [ ] Compare prompt output
- [ ] Compare generated images
- [ ] Measure timing differences

---

## Open Questions for StoryArt

1. **Batching:** Should StoryArt send all beats at once, or batch by scene?
   - Recommendation: Batch by scene for continuity tracking

2. **Error handling:** If StorySwarm fails mid-batch, retry whole batch or partial?
   - Recommendation: Retry failed beats only

3. **UI feedback:** Show "Generating prompts via StorySwarm..." progress?
   - Recommendation: Yes, with progress bar

4. **Caching:** Cache StorySwarm prompts in Redis session?
   - Recommendation: Yes, same schema as current prompts

---

## Next Steps

1. **StoryArt:** Review this plan, confirm/modify interface contract
2. **StorySwarm:** Implement `/generate-batch` endpoint
3. **Both:** Coordinate on test data (Episode 2 beats)
4. **Test:** Run quality comparison before committing to production

---

**This plan delivers prompt quality improvements with minimal disruption to the working image generation pipeline.**
