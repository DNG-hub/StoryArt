# Prompt Generation Paradigm Reboot (Unbiased)

## Scope
This document proposes a new prompt-generation paradigm that is not biased by the current workflow. It focuses on using the full available input surface to produce beat-accurate, visually consistent image prompts.

## Problem Statement
The current prompt-generation process produces unsatisfactory results when trying to reflect the visual beats within a scene. The core issue is not lack of data; it is collapsing rich structured inputs into an LLM-written prompt too early.

## Evaluation: Why the Current System Fails
- **Early collapse of structure:** Rich inputs (scene state, overrides, segments, helmet rules) are compressed into a single LLM instruction, so invariants are easily lost or ignored.
- **Continuity drift:** Beat-to-beat visual continuity is not enforced deterministically, causing missing characters, shifting environments, or inconsistent gear states.
- **Over-trusting the LLM:** The LLM is responsible for both interpretation and final prompt phrasing, which amplifies hallucination risk and variability.
- **Implicit rule enforcement:** Constraints like helmet/face visibility, segment placement, and location shorthand limits are often enforced only by prompt text rather than by code.
- **Opaque failure modes:** When prompts are wrong, it is hard to tell whether the issue is input data, LLM interpretation, or template assembly.
- **Token budget conflicts:** Long prompts lose key details unpredictably; compaction is not guided by priority.

## How the New Design Addresses Those Deficiencies
- **Structured intermediate (VBS):** Preserves all key inputs and makes them explicit, preventing loss of critical facts.
- **Deterministic enrichment:** Enforces continuity, gear rules, and segment logic in code before any LLM step.
- **LLM as a fill-in tool only:** The model supplies missing visuals (action/expression/composition) rather than rewriting core facts.
- **Compiler-based prompt assembly:** Guarantees consistent formatting, segment placement, and rule compliance.
- **Validation and repair loop:** Failures become actionable with precise diagnostics (e.g., missing character, visor violation).
- **Priority-aware compaction:** Token budgets are applied with clear drop rules, preserving visual anchors.

## Goals
- Produce prompts that reliably reflect each beat's visual anchor and scene continuity.
- Reduce hallucination and prompt drift across beats.
- Make the pipeline debuggable, explainable, and deterministic where possible.
- Preserve the ability to inject creative visuals where genuinely missing.

## Non-Goals
- Rewriting the story analysis or beat extraction pipeline.
- Changing database schemas in this phase.

## Full Input Surface (Available Today)
- Beat text and metadata: `beat_script_text`, `source_paragraph`, `beatId`, `beat_number`, `beat_title`, `beat_type`, `narrative_function`.
- Visual decisioning: `visualSignificance`, `imageDecision` (NEW/REUSE/NO + reason).
- Visual cues: `cameraAngleSuggestion`, `characterPositioning`, `locationAttributes`, `styleGuide`.
- Character data: `lora_trigger`, `visual_description`, `location_contexts`, `swarmui_prompt_override`.
- Character location contexts: `physical_description`, `clothing_description`, `demeanor_description`, `helmet_fragment_*`, `face_segment_rule`, `context_phase`.
- Location data: `visual_description`, `atmosphere`, `key_features`, `artifacts` (STRUCTURAL/LIGHTING/ATMOSPHERIC/PROP).
- Scene context: `scene_summary`, `metadata` (timing, adBreak), `ScenePersistentState`.
- Variety control: shot/angle history, beat count, `suggestedShotType`.
- Template detection: vehicle/dialogue/combat/stealth/establishing/suit_up/ghost.
- Model routing: FLUX vs alternate for no-face beats.
- Segment rules: face and clothing segment binding.
- Token budget data and validation warnings.

## Proposed Paradigm: Compiler-Style Prompt Generation
Stop asking the LLM to write full prompts. Instead, build a structured "Visual Beat Spec" (VBS) and compile it into prompts deterministically.

### Phase A: Deterministic Enrichment
- Inject database truths (character overrides, gear fragments, helmet state, location artifacts).
- Apply scene continuity from `ScenePersistentState`.
- Apply variety constraints and select a scene template.
- Select model route (FLUX vs alternate) based on face visibility and composition complexity.

### Phase B: LLM Fill-In (Restricted)
- LLM only fills missing *visual* slots (action, pose, expression, composition details).
- LLM output must be strict JSON that merges into the VBS.
- LLM is forbidden from emitting the final prompt string.

### Phase C: Deterministic Prompt Compiler
- Assemble prompt from VBS using templates.
- Enforce token budgets, segment placement, trigger placement, helmet/hair suppression.
- Enforce location shorthand limits and artifact selection limits.

### Phase D: Validation and Repair
- Run validators: missing characters, missing vehicle, visor/hair violation, missing segments, token overflow.
- Repair by deterministic compaction or constrained JSON adjustments to VBS.

## Visual Beat Spec (VBS) Draft
This is a schema-level proposal to capture all visuals needed for a reliable prompt.

```
VisualBeatSpec {
  beatId: string
  sceneNumber: number
  templateType: "vehicle" | "indoor_dialogue" | "combat" | "stealth" | "establishing" | "suit_up" | "ghost" | "generic"
  modelRoute: "FLUX" | "ALTERNATE"

  shot: {
    shotType: string
    cameraAngle?: string
    depthOfField?: string
    lens?: string
    composition?: string
  }

  subjects: Array<{
    characterName: string
    loraTrigger?: string
    description: string
    action?: string
    expression?: string
    position?: string
    faceVisible?: boolean
    helmetState?: "OFF" | "IN_HAND" | "VISOR_UP" | "VISOR_DOWN"
    segments?: {
      face?: string
      clothing?: string
    }
  }>

  environment: {
    locationShorthand: string
    anchors: string[]
    props?: string[]
    lighting: string
    atmosphere: string
    fx?: string
  }

  constraints: {
    tokenBudget?: number
    segmentPolicy?: "ALWAYS" | "IF_FACE_VISIBLE" | "NEVER"
  }
}
```

## Example Mapping (High-Level)
- `beat.styleGuide.camera` -> `shot.shotType`
- `beat.cameraAngleSuggestion` -> `shot.cameraAngle`
- `location.artifacts[STRUCTURAL]` -> `environment.anchors`
- `location.artifacts[LIGHTING]` -> `environment.lighting`
- `location.artifacts[ATMOSPHERIC]` -> `environment.atmosphere`
- `CharacterLocationContext.swarmui_prompt_override` -> `subjects[].description` (verbatim)
- `helmet_fragment_*` + beat text -> `subjects[].helmetState` and `faceVisible`
- `face_segment_rule` + visibility -> `subjects[].segments.face`

## Why This Works Better
- Deterministic assembly reduces drift and hallucination.
- Visual continuity is explicit instead of inferred every beat.
- LLM is used for true unknowns only.
- Validator failures become actionable instead of invisible.

## Minimal Migration Plan
1. Add VBS schema and create a builder that consumes existing inputs.
2. Keep the current LLM but restrict it to JSON fill-in of missing slots.
3. Build deterministic compiler for prompt assembly.
4. Add validators and compaction rules.
5. Run side-by-side evaluation on a few scenes, then cut over.

## Success Criteria
- Prompts preserve all named visual anchors and character presence across beats.
- Helmet/face/segment rules are always enforced.
- Token budgets are met without losing key visuals.
- Scene-to-scene continuity errors are eliminated or visibly flagged.

```
