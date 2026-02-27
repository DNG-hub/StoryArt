# StoryArt Project Memory

## Architecture Overview
- **Stack**: React/TypeScript frontend, Gemini API for prompt generation, FLUX.1-dev for image generation
- **Key Services**: `promptGenerationService.ts` (Gemini system instruction + post-processing), `beatStateService.ts` (state tracking), `geminiService.ts` (API calls)
- **Image Pipeline**: Story beats -> Gemini prompt generation -> SwarmUI (FLUX) or ComfyUI (zimage) rendering
- **Prompt Skill**: `.claude/skills/prompt-generation-rules/SKILL.md` - comprehensive rules doc (v0.21, ~3700 lines)
- **Testing**: 70 comprehensive unit tests for VBS services (Phase A, B, C+D) - all passing

## Key Patterns
- **LoRA Triggers**: JRUMLV (Cat), HSCEIA (Daniel) - used in segment tags for character identification
- **Segment Tags**: `<segment:model-x,y,w,h>` format for SwarmUI face/hair/body targeting
- **T5 Encoder**: FLUX uses T5-XXL (language model), NOT CLIP. Understands sentences, not comma-separated tags
- **Token Budget**: Adaptive per-beat (150-280 tokens). T5 ~4 chars/token. Tokens 1-30 strongest attention
- **Belt-and-suspenders validation**: Post-generation checks LOG warnings but never block prompt output

## Pre-existing Issues
- TypeScript compilation has pre-existing errors in: `App.tsx`, `ErrorBoundary.tsx`, `scripts/*.ts`
- These are NOT from recent changes - safe to ignore when verifying new code compiles

## v0.21 Changes (Compiler-Style Prompt Generation - VBS Architecture)
**Completed 2026-02-27** — Four-phase pipeline replacing v0.20's LLM-centric approach

### Architecture
- **Phase A**: Deterministic Enrichment (vbsBuilderService.ts) → Build VBS from DB + beatStateService
- **Phase B**: LLM Fill-In (vbsFillInService.ts) → Fill only action/expression/composition slots
- **Phase C**: Deterministic Compilation (vbsCompilerService.ts) → Assemble final prompt from completed VBS
- **Phase D**: Validate + Repair Loop (vbsCompilerService.ts) → Run validators; repair VBS and recompile if needed

### Central Type: VisualBeatSpec
- Intermediate representation: single inspectable object per beat
- All appearance data deterministically set in Phase A (LoRA triggers, descriptions, helmet state, segments)
- LLM fills only: action, expression, composition (from visual_anchor), atmosphere, vehicle spatial note
- Beats processed sequentially (not batched) for per-beat location awareness

### New Files Created
- `services/vbsBuilderService.ts` - Phase A: buildVisualBeatSpec(), mapArtifactsByType(), applyHelmetStateToDescription()
- `services/vbsFillInService.ts` - Phase B: fillVBSWithLLM(), buildFallbackFillIn(), mergeVBSFillIn()
- `services/vbsCompilerService.ts` - Phase C+D: compileVBSToPrompt(), runVBSValidation(), validateAndRepairVBS()
- `.claude/skills/prompt-generation-rules/CINEMATOGRAPHER_RULES.md` - ~500 lines, LLM system instruction for Phase B

### Modified Files
- `src/types.ts` - Added: VisualBeatSpec, VBSFillIn, VBSValidationResult, VBSSubject, VBSEnvironment types
- `src/services/promptGenerationService.ts` - Added v021 orchestrator: generateSwarmUiPromptsV021(), promptVersion param routing
- `.claude/skills/prompt-generation-rules/SKILL.md` - Appended Section 24 (v0.21 architecture overview + changelog)

### Key Improvements
| Problem | v0.20 | v0.21 |
|---------|-------|-------|
| LLM invents appearance | Full generation → hallucinates | VBS schema → structurally impossible |
| Post-processing fights output | Regex injection, hair suppression wars | No post-processing; compilation complete by construction |
| Batching breaks continuity | 12 beats together → loss of visual_anchor | Sequential processing → per-beat awareness |
| visual_anchor unused | Input ignored | Primary input to LLM → drives shotComposition |
| System instruction bloat | 2300 lines, hardcoded names | ~400 lines, fully story-agnostic |
| Single-character segments | Only last character gets tags | All subjects in compiler loop |
| Validation only logs | Never block | Repair first, log if repair fails |

### Implementation Status
✅ Types defined in types.ts (VBS, VBSFillIn, VBSValidationResult, VBSSubject, VBSEnvironment)
✅ vbsBuilderService.ts complete (Phase A deterministic enrichment)
✅ vbsFillInService.ts complete (Phase B LLM fill-in with Gemini backend, deterministic fallback)
✅ vbsCompilerService.ts complete (Phase C+D compilation and validation/repair)
✅ promptGenerationService.ts modified (v021 orchestrator, version routing)
✅ CINEMATOGRAPHER_RULES.md created (~500 lines, comprehensive Phase B rules)
✅ SKILL.md Section 24 appended (architecture overview + changelog)
✅ TypeScript compilation passes (no new errors)

### Routing (v0.20 vs v0.21)
- `generateSwarmUiPrompts(..., promptVersion: 'v021')` → Uses new v021 pipeline
- Default `promptVersion: 'v020'` → Existing pipeline unchanged
- Both paths live in parallel; v0.20 completely untouched

## v0.20 Changes (Multi-Phase Character Appearance)
- Added `context_phase` and `phase_trigger_text` columns to `character_location_contexts` table
- New unique constraint allows multiple phases per (character, location_arc): supports transit/arrival/settled/default/custom
- `CharacterLocationContext` now includes phase fields
- `CharacterAppearance` now includes `phases` array for multi-phase support
- `BeatAnalysis` includes `phaseTransitions` array for Gemini phase detection
- `ScenePersistentState` tracks `characterPhases: Record<string, string>` per character
- beatStateService initializes phases to 'default', processes transitions from Gemini
- Gemini system instruction updated with phase detection guidance (Section 2f)
- compactEpisodeContext now includes `available_phases` per character and per scene appearance
- promptGenerationService `getCharacterOverrideForScene()` now phase-aware: finds matching phase or fallback
- Both injection call sites pass phase from persistentState to getCharacterOverrideForScene()
- Migration: `docs/migration_multi_phase_character_appearance.sql` - adds columns and constraint
- Backward compatible: scenes without multi-phase data work unchanged with 'default' phase
- Documentation at SKILL.md Section 3.7

## v0.19 Changes
- Replaced fixed 200-token limit with adaptive per-beat budgets (150-280 based on shot/chars/helmet/vehicle)
- New `TokenBudget` interface, `adaptiveTokenBudget` on `PromptValidationResult`
- New functions: `calculateAdaptiveTokenBudget()`, `condenseOverrideForShot()`, `injectMissingCharacterOverrides()`
- Character injection uses condensed `swarmui_prompt_override` at token 31-80 zone (was "nearby" at end)
- Gemini system instruction shows adaptive budget ranges, beat context includes `tokenBudget`
- SKILL.md Section 17 rewritten, v0.19 changelog added
- RCA 2026-01-27: Gemini config NO LONGER hardcoded → model/temp now environment-driven ✅

## Prompt Generator Assessment (2026-02-26)
**Status:** Well-engineered but context is scene-static, lacks beat-level location awareness
- Configuration flexibility: ✅ Fully fixed (env vars)
- Character appearance: ⚠️ Works but scene-level only
- Location context: ⚠️ Per-scene, not per-beat
- Gap: Cannot handle intra-scene location changes or appearance triggers (e.g., "removes helmet")
- **RESOLVED by v0.21**: VBS architecture provides per-beat location and appearance context

## v0.18 Changes
- Added `ScenePersistentState`, `SceneTypeTemplate`, `PromptValidationResult` types
- Scene persistent state tracking, scene template detection, post-generation validation
- SKILL.md sections 5A, 10.4, 16.9, 17-23

## Working Directory Notes
- Windows platform, use `npx tsc --noEmit` for compilation checks (no `cd /d` in bash)
- Plan files go to: `C:\Users\DaveB\.claude\plans\`
- New VBS services located in: `services/vbsBuilderService.ts`, `services/vbsFillInService.ts`, `services/vbsCompilerService.ts`
