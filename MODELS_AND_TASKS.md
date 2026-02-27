# StoryArt: Models and Task Assignments

## Overview

StoryArt uses a **multi-provider, multi-stage AI pipeline** to transform scripts into image-generation prompts optimized for FLUX.1-dev. Different AI models are used for different specialized tasks.

---

## Core AI Providers

| Provider | Models Available | API |
|----------|------------------|-----|
| **Google Gemini** | gemini-2.0-flash (default) | Google Gen AI SDK |
| **Claude** | claude-3-5-sonnet-20241022 | Anthropic |
| **OpenAI** | gpt-4o | OpenAI |
| **Qwen (Alibaba)** | qwen-turbo | Alibaba |
| **DeepSeek** | deepseek-chat | DeepSeek |
| **xAI** | grok-3 | xAI |
| **Zhipu** | glm-4 | Zhipu (Chinese) |

**Configuration**: All models and API keys are environment-variable driven (`.env` file). No hardcoded values.

---

## Task Pipeline: Where Each Model Is Used

### **Stage 1: Script Analysis & Beat Segmentation**
**Purpose**: Parse screenplay into 35-45 narrative beats per scene

| Task | Model | Provider | Service | Input | Output |
|------|-------|----------|---------|-------|--------|
| **Analyze episode script** | User-selectable (default: Gemini 2.0-flash) | Multi-provider | `multiProviderAnalysisService.ts` + `geminiService.ts` | Raw screenplay text + Episode Context JSON | `AnalyzedEpisode` with 35-45 beats per scene |

**System Instruction**: ~1,200 tokens
- Pacing architecture role: "Narrative Pacing Architect"
- Beat definition: 15-30 second narrative units
- Granularity: Every dialogue line, reaction, gesture → separate beat
- Image decision logic: NEW_IMAGE vs REUSE_IMAGE per beat

**How it works**:
1. User selects provider in Storyteller UI
2. Multi-provider service routes to appropriate implementation
3. Script + episode context sent to LLM with beat-segmentation system instruction
4. Response parsed and validated: must have 35-45 beats/scene
5. Beat metadata includes: title, core action, emotional tone, visual anchor, scene beats are then enriched with phase transitions and character appearance data

**Key Features**:
- Shared system instruction across all providers (consistency)
- JSON schema validation for response structure
- Beat linking: REUSE_IMAGE beats reference prior beat's image
- Location attributes: Auto-populated from location artifacts database

---

### **Stage 2: State Enrichment & Persistent State**
**Purpose**: Enrich beats with character state, helmet status, vehicle presence, location

| Task | Model | Service | Input | Output |
|------|-------|---------|-------|--------|
| **Process episode with full context** | Deterministic (NO LLM) | `beatStateService.ts` | Analyzed beats + Database character/location data | `FullyProcessedBeat[]` with all deterministic enrichment |

**What's Determined** (NO LLM needed):
- Character presence per beat
- Helmet state (OFF, IN_HAND, VISOR_UP, VISOR_DOWN)
- Character positioning (camera-left, camera-right)
- Scene template type (combat, indoor_dialogue, vehicle, etc.)
- Location context (from database)
- Character phases (default, arrival, transit, settled, etc.)
- Token budgets (adaptive per shot type)
- Persistent state (location, lighting, vehicle, character positions)

**No AI involved** — pure TypeScript logic reading database and applying business rules.

---

### **Stage 3: VBS Phase A — Deterministic Enrichment**
**Purpose**: Build Visual Beat Spec with all deterministic appearance data

| Task | Model | Service | Input | Output |
|------|-------|---------|-------|--------|
| **Build Visual Beat Spec** | Deterministic (NO LLM) | `vbsBuilderService.ts` | FullyProcessedBeat + Database context | `VisualBeatSpec` (all appearance data pre-filled) |

**What's Populated** (deterministically):
- **Subjects**: LoRA triggers, descriptions, helmet fragments, position, face visibility
- **Environment**: Location anchors, lighting, atmosphere, props (mapped from location artifacts by type)
- **Vehicle**: Description and spatial positioning (if present)
- **Constraints**: Adaptive token budget, segment policy, compaction drop order
- **Continuity**: Previous beat summary (~30-token prose snapshot)

**Beat-Level Location Context** (NEW in v0.21):
- Uses `beat.resolvedLocationId` for beat-specific appearance
- Selects character phase intelligently using `phase_trigger_text`
- Falls back to scene-level location if beat-specific undefined
- Detects location changes between consecutive beats

**No AI involved** — all data from database and deterministic state machines.

---

### **Stage 4: VBS Phase B — LLM Slot-Fill**
**Purpose**: Fill only the action/expression/composition slots (what LLM does best)

| Task | Model | Provider | Service | Input | Output |
|------|-------|----------|---------|-------|--------|
| **Fill VBS action/expression/composition** | **Google Gemini 2.0-flash** | Google Gen AI | `vbsFillInService.ts` | Partial VBS + beat narrative context | `VBSFillIn` JSON (action, expression, composition filled) |

**System Instruction**: ~400 tokens (focused, story-agnostic)
- Role: "Cinematographer" (NOT narrative architect)
- Focus: Visual composition and camera-observable details
- INPUT: `visual_anchor` (director's key image description) → OUTPUT: FLUX spatial language
- OUTPUT: Camera-observable action (pose, movement), expression (facial features only), atmosphere enrichment

**LLM Inputs**:
- Partial VBS with empty slots: action, expression, composition
- Beat script text, visual anchor, emotional tone
- Character names and positions
- Shot type (close-up, medium, wide)
- Location and vehicle (if present)

**LLM Outputs** (structured JSON):
```typescript
{
  beatId: string,
  shotComposition: string,       // Translated from visual_anchor
  subjectFillIns: [{
    characterName: string,
    action: string,               // Camera-observable pose/movement
    expression: string | null,    // Facial features only (null if helmet sealed)
    dualPositioning?: string,     // camera-left/camera-right for multi-char
  }],
  vehicleSpatialNote?: string,
  atmosphereEnrichment?: string
}
```

**Fallback** (if Gemini fails):
- Deterministic fill-in generated from `fluxPose`, `fluxExpression`, `beatVisualGuidance`
- Pipeline never fails — always produces valid prompt

**Why Gemini for this task**:
- Translation of visual_anchor to FLUX spatial language
- Understanding narrative emotion → visual expression mapping
- Camera positioning for multi-character shots
- Natural language understanding of "how would this look on camera?"

---

### **Stage 5: VBS Phase C — Deterministic Compilation**
**Purpose**: Assemble final prompt from completed VBS

| Task | Model | Service | Input | Output |
|------|-------|---------|-------|--------|
| **Compile VBS to prompt** | Deterministic (NO LLM) | `vbsCompilerService.ts` | Completed VisualBeatSpec | Final FLUX prompt string |

**Compilation Order**:
1. Shot type + camera angle + composition
2. Subject LoRA triggers + descriptions + actions + expressions + positions
3. Environment: anchors, lighting, atmosphere, props, fx
4. Vehicle description + spatial note (if present)
5. Segment tags (face, clothing) — ALL subjects processed

**Segment Completeness Fix** (v0.21 feature):
- v0.20 had bug: only last character got segment tags
- v0.21: processes ALL subjects in compiler loop
- Result: both Cat and Daniel get face + clothing segment tags

**No AI involved** — pure string assembly with format cleanup.

---

### **Stage 6: VBS Phase D — Validate & Repair Loop**
**Purpose**: Validate prompt integrity and auto-repair errors

| Task | Model | Service | Input | Output |
|------|-------|---------|-------|--------|
| **Run validation checks** | Deterministic (NO LLM) | `vbsCompilerService.ts` | Compiled prompt + VBS | Validation issues + repair suggestions |
| **Repair and recompile** | Deterministic (NO LLM) | `vbsCompilerService.ts` | VBS + validation issues | Repaired VBS + final prompt |

**Validation Checks** (5 validation rules):
1. ✅ All LoRA triggers present for all subjects
2. ✅ Hair description NOT present when visor down (violation)
3. ✅ Face segments present when face visible (IF_FACE_VISIBLE policy)
4. ✅ Expression NOT present when visor down (violation)
5. ✅ Token budget not exceeded

**Auto-Repair Strategies**:
| Issue | Fix |
|-------|-----|
| Missing LoRA trigger | Prepend trigger to subject description |
| Hair + VISOR_DOWN | Strip hair phrases from description |
| Missing face segment | Inject YOLO segment tag |
| Expression + VISOR_DOWN | Null the expression field |
| Token budget exceeded | Apply priority-aware compaction: drop vehicle spatial note → props → fx → atmosphere |

**Repair Loop**: Max 2 iterations
- Iteration 1: First repair attempt
- Iteration 2: Second repair if still invalid
- If still failing: Log with full VBS dump + return best available prompt (never block)

**No AI involved** — deterministic repair logic.

---

### **Stage 7: Prompt Generation (v0.20 Legacy Path)**
**Purpose**: Generate full prompts (v0.20 still available for comparison)

| Task | Model | Service | Input | Output |
|------|-------|---------|-------|--------|
| **generateSwarmUiPrompts (v0.20)** | **Google Gemini 2.0-flash** | `promptGenerationService.ts` | FullyProcessedBeat[] | `BeatPrompts[]` with SwarmUI prompts |

**v0.20 Approach** (still available for backward compatibility):
- Large system instruction (~2300 tokens)
- Story-specific character names and context
- Batching (12 beats at a time)
- Post-processing with regex injection of character overrides
- Validation only logs, never repairs

**v0.21 Approach** (Compiler-Style, recommended):
- Route: `promptVersion: 'v021'` parameter
- Sequential beat processing (not batched)
- Uses VBS architecture (Phases A-D above)
- No post-processing — assembly complete by construction
- Validation + repair loop before output

---

## Model Selection Flow Diagram

```
User Script
    ↓
[Provider Selection UI: Gemini, Claude, OpenAI, Qwen, DeepSeek, xAI, GLM]
    ↓
Stage 1: Script Analysis (multiProviderAnalysisService.ts)
    ├─ Provider → Gemini: analyzeScript()
    ├─ Provider → Claude: analyzeScriptWithClaude()
    ├─ Provider → OpenAI: analyzeScriptWithOpenAI()
    ├─ Provider → xAI: analyzeScriptWithXAI()
    ├─ Provider → DeepSeek: analyzeScriptWithDeepSeek()
    ├─ Provider → Qwen: analyzeScriptWithQwen()
    └─ Provider → GLM: analyzeScriptWithGLM()
    ↓
Stage 2: State Enrichment (NO LLM)
    └─ beatStateService.ts → FullyProcessedBeat[]
    ↓
Stage 3: VBS Builder (NO LLM)
    └─ vbsBuilderService.ts → VisualBeatSpec[]
    ↓
Stage 4: VBS Fill-In (GEMINI ONLY)
    └─ vbsFillInService.ts → VBSFillIn (Gemini 2.0-flash)
    ↓
Stage 5: VBS Compiler (NO LLM)
    └─ vbsCompilerService.ts → Prompt strings
    ↓
Stage 6: Validation & Repair (NO LLM)
    └─ vbsCompilerService.ts → Final prompts (validated)
    ↓
Output: BeatPrompts[] with SwarmUI-ready prompts
```

---

## Model Configuration (Environment Variables)

### Gemini (Primary)
```env
VITE_GEMINI_API_KEY=<your-api-key>
VITE_GEMINI_MODEL=gemini-2.0-flash          # Default
VITE_GEMINI_TEMPERATURE=0.1                 # Low for determinism
VITE_GEMINI_MAX_TOKENS=65536                # Large for long analyses
```

### Claude (Optional)
```env
VITE_CLAUDE_API_KEY=<your-api-key>
VITE_CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### OpenAI (Optional)
```env
VITE_OPENAI_API_KEY=<your-api-key>
VITE_OPENAI_MODEL=gpt-4o
```

### Qwen (Optional)
```env
VITE_QWEN_API_KEY=<your-api-key>
VITE_QWEN_MODEL=qwen-turbo
```

### DeepSeek (Optional)
```env
VITE_DEEPSEEK_API_KEY=<your-api-key>
VITE_DEEPSEEK_MODEL=deepseek-chat
```

### xAI (Optional)
```env
VITE_XAI_API_KEY=<your-api-key>
VITE_XAI_MODEL=grok-3
```

### Zhipu GLM (Optional)
```env
VITE_ZHIPU_API_KEY=<your-api-key>
VITE_ZHIPU_MODEL=glm-4
```

---

## Token Budget Summary

| Task | Typical Tokens | Model | Notes |
|------|----------------|-------|-------|
| Script Analysis | 5,000-15,000 | Provider (selectable) | Varies by script length |
| VBS Phase B (per beat) | 500-800 | Gemini 2.0-flash | Focused, story-agnostic instruction |
| Final Prompt (per beat) | 150-280 | (not LLM) | Adaptive budget based on shot type |

**VBS Token Budget Calculation** (Adaptive):
- **Close-up shot**: 250-280 tokens
- **Medium shot**: 220-260 tokens
- **Wide shot**: 180-200 tokens
- **Establishing shot**: 150-170 tokens
- **Helmet adjustment**: -30 tokens (sealed helmet, no expression)
- **Vehicle bonus**: +20 tokens

---

## Task Distribution Summary

| Task Category | Count | LLM Used? | Service |
|---------------|-------|-----------|---------|
| **Script Analysis** | 1 per episode | ✅ YES (provider selectable) | multiProviderAnalysisService |
| **Beat Enrichment** | N beats | ❌ NO | beatStateService |
| **VBS Building** | N beats | ❌ NO | vbsBuilderService |
| **VBS Fill-In** | N beats | ✅ YES (Gemini only) | vbsFillInService |
| **Prompt Compilation** | N beats | ❌ NO | vbsCompilerService |
| **Validation & Repair** | N beats | ❌ NO | vbsCompilerService |

**N = total beats in episode (typically 150-180 beats per 4-scene episode)**

---

## Key Design Principles

### 1. **Provider Flexibility**
- Script analysis: User can choose any supported provider
- VBS fill-in: Currently Gemini (but architecture allows swapping)
- All others: Deterministic (no provider needed)

### 2. **Determinism Over LLM**
- Only use LLM where it adds unique value:
  - Stage 1: Beat segmentation and analysis (requires understanding narrative)
  - Stage 4: Visual-to-FLUX translation (requires creative language understanding)
- All other stages: Pure TypeScript logic, deterministic, repeatable

### 3. **System Instruction Size**
- **Stage 1** (Beat Analysis): ~1,200 tokens
  - Pacing architecture, beat definition, metadata requirements
  - Shared across all providers for consistency
- **Stage 4** (VBS Fill-In): ~400 tokens
  - Focused on cinematography and visual translation
  - Story-agnostic (no character names, no hardcoded story details)

### 4. **No Post-Processing**
- v0.20: Generated prompt → post-processing injection battle
- v0.21: VBS assembly is complete by construction
- Result: No regex wars, no hair suppression hacks, cleaner prompts

### 5. **Graceful Degradation**
- LLM fails → fallback to deterministic fill-in → prompt still generates
- Validation fails → repair loop → best available prompt returned
- Pipeline never blocks on LLM or validation errors

---

## Models in Use vs. Available

### Currently Used:
- **Gemini 2.0-flash** (Primary for beat analysis and VBS fill-in)

### Available (User-Selectable):
- **Claude 3.5 Sonnet** (Beat analysis alternative)
- **GPT-4o** (Beat analysis alternative)
- **Qwen-turbo** (Beat analysis alternative)
- **DeepSeek-chat** (Beat analysis alternative)
- **Grok-3** (Beat analysis alternative)
- **GLM-4** (Beat analysis alternative)

### Why Gemini 2.0-flash Default:
1. **Cost-effective**: Fast model, suitable for Stage 1 beat analysis
2. **JSON schema support**: Native JSON schema validation (Stage 4)
3. **Reliability**: Consistent performance across long contexts
4. **Latency**: Faster response times than larger models
5. **Context window**: 1M token context (sufficient for scripts)

---

## Future Enhancements

1. **Gemini replacement for VBS Phase B**: Could swap to other providers
2. **Fine-tuned models**: Specialized models trained on TV scripts
3. **Local models**: Consider Ollama/LLaMA for on-premise deployment
4. **Model routing by complexity**: Use smaller models for simple beats, larger for complex transitions
5. **Caching**: Store beat analysis results to avoid re-processing same scenes

---

## Summary Table: Tasks × Models

| Stage | Task | Model | Provider | Deterministic? | LLM Provider Selectable? |
|-------|------|-------|----------|---|---|
| 1 | Beat Segmentation | Selectable | Selectable | ❌ | ✅ |
| 2 | State Enrichment | None | None | ✅ | ❌ |
| 3 | VBS Builder | None | None | ✅ | ❌ |
| 4 | VBS Fill-In | Gemini 2.0-flash | Google | ❌ | ❌ (hardcoded) |
| 5 | Compilation | None | None | ✅ | ❌ |
| 6 | Validation | None | None | ✅ | ❌ |

