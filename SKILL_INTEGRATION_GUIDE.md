# Runtime Skill Integration Guide

## Overview

The prompt generation pipeline now loads and applies FLUX and SKILL rules at runtime from markdown skill files. This ensures synchronicity between beat/scene context and the validated vocabulary/constraints.

**Benefits**:
- ✅ Single source of truth: Update .md skills, code uses them immediately
- ✅ Dynamic validation: Rules applied based on scene/beat context
- ✅ No manual sync needed: Skills loaded at runtime
- ✅ Graceful fallback: Hardcoded versions if skill loading fails

---

## Architecture

### Three New Services

#### 1. **skillLoaderService.ts**
Loads skill .md files from disk with caching.

```typescript
import { skillLoaderService } from './services/skillLoaderService';

// Load all skills
const skills = await skillLoaderService.loadAllSkills();

// Load specific skill
const fluxVocab = await skillLoaderService.getFluxVocabularySkill();
const rules = await skillLoaderService.getSkillRules();
const cinematographer = await skillLoaderService.getCinematographerRules();
```

**Caching**: 5-minute cache (configurable)
**Fallback**: Returns empty string if file not found

---

#### 2. **skillParserService.ts**
Parses markdown into structured rule catalogs.

```typescript
import { skillParserService } from './services/skillParserService';

// Parse FLUX vocabulary
const fluxCatalog = skillParserService.parseFluxVocabulary(markdownContent);
// → FluxVocabularyCatalog with shot types, angles, poses, expressions, lighting

// Parse SKILL.md rules
const skillsCatalog = skillParserService.parseSkillRules(markdownContent);
// → SkillRulesCatalog with token budgets, character rules, segment format

// Validate terms
const isValid = skillParserService.isValidFluxTerm(
  'wide shot',
  fluxCatalog,
  'shot'
);
```

**Output Types**:
- `FluxVocabularyCatalog`: Validated FLUX terms
- `SkillRulesCatalog`: Prompt generation rules
- `CinematographerRulesCatalog`: LLM system instruction

---

#### 3. **skillApplicatorService.ts**
Applies rules during prompt generation at each phase.

```typescript
import { skillApplicatorService } from './services/skillApplicatorService';

// Initialize (loads and parses all skills)
await skillApplicatorService.initialize();

// Apply FLUX rules to beat
const fluxResult = await skillApplicatorService.applyFluxRules(beatAnalysis);
// → Validates shot type, camera angle against vocabulary

// Apply SKILL.md rules to VBS
const skillResult = await skillApplicatorService.applySkillRules(vbs);
// → Validates token budget, LoRA triggers, helmet rules

// Get dynamic cinematographer instruction
const instruction = await skillApplicatorService.getCinematographerInstruction();
// → Returns parsed CINEMATOGRAPHER_RULES.md (or fallback)

// Suggest FLUX terms based on scene context
const suggestions = await skillApplicatorService.suggestFluxTerms(
  beatAnalysis,
  'dialogue' // scene type
);
// → { shotType: 'medium shot', cameraAngle: 'eye-level', poses: [...] }

// Validate entire prompt against all skill rules
const validation = await skillApplicatorService.validatePromptAgainstSkills(
  prompt,
  vbs
);
// → Checks for avoided terms, LoRA triggers, segment format
```

---

## Integration Points in VBS Pipeline

### Phase A: Deterministic Enrichment (vbsBuilderService.ts)

**Current**: Hardcoded depthOfField and colorGrade logic
**Upgrade**: Apply FLUX vocabulary suggestions

```typescript
// Get shot type suggestions from skill
const suggestions = await skillApplicatorService.suggestFluxTerms(beat, sceneType);
if (suggestions.shotType) {
  shot.shotType = suggestions.shotType;
}

// Validate against FLUX vocabulary
const fluxValidation = await skillApplicatorService.applyFluxRules(beat);
if (!fluxValidation.valid) {
  console.warn('⚠️', fluxValidation.warnings);
}
```

### Phase B: LLM Fill-In (vbsFillInService.ts)

**Current**: Integrated ✅
**Status**: Already updated to load CINEMATOGRAPHER_RULES at runtime

```typescript
// vbsFillInService.ts line 114 (now async)
const systemInstruction = await buildCinematographerSystemInstruction(beatAnalysis);
// → Loads from .md skill file, falls back to hardcoded

// Result: LLM receives dynamic rules that match current scene context
```

### Phase C: Compilation (vbsCompilerService.ts)

**Current**: Hardcoded compilation order
**Upgrade**: Validate against SKILL.md compilation rules

```typescript
// After compiling prompt, validate
const skillValidation = await skillApplicatorService.validatePromptAgainstSkills(
  compiledPrompt,
  vbs
);

if (!skillValidation.valid) {
  console.warn('Prompt violations:', skillValidation.warnings);
  skillValidation.suggestions.forEach(s => console.log('→', s));
}
```

### Phase D: Validation (vbsCompilerService.ts)

**Current**: Custom validation checks
**Upgrade**: Integrate skill validation results

```typescript
// Get skill-based validation
const skillValidation = await skillApplicatorService.applySkillRules(vbs);

// Merge with existing validation
if (!skillValidation.valid) {
  // Apply skill validation warnings to repair loop
  // Recompile with corrections
}
```

---

## Usage Examples

### Example 1: Apply Skills During Prompt Generation

```typescript
import { skillApplicatorService } from './services/skillApplicatorService';

async function generatePromptWithSkills(vbs, beat) {
  // Initialize skills on first use
  await skillApplicatorService.initialize();

  // Compile prompt
  const prompt = compileVBSToPrompt(vbs);

  // Apply skill validation
  const validation = await skillApplicatorService.validatePromptAgainstSkills(prompt, vbs);

  if (!validation.valid) {
    console.log('Skill violations detected:');
    validation.warnings.forEach(w => {
      console.log(`  [${w.severity}] ${w.type}: ${w.message}`);
    });

    // Optionally repair and recompile
    // ...
  }

  return prompt;
}
```

### Example 2: Suggest FLUX Terms Based on Scene

```typescript
async function selectShotTypeForScene(beat, sceneRole) {
  const suggestions = await skillApplicatorService.suggestFluxTerms(beat, sceneRole);

  console.log('Suggested FLUX terms:');
  console.log(`  Shot: ${suggestions.shotType}`);
  console.log(`  Angle: ${suggestions.cameraAngle}`);
  console.log(`  Poses: ${suggestions.poses?.join(', ')}`);

  // Use suggestions to populate VBS
  vbs.shot.shotType = suggestions.shotType;
  vbs.shot.cameraAngle = suggestions.cameraAngle;
}
```

### Example 3: Skill-Aware Validation Loop

```typescript
async function validateAndRepairWithSkills(vbs) {
  const MAX_ITERATIONS = 3;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    // Compile current VBS
    const prompt = compileVBSToPrompt(vbs);

    // Apply skill rules
    const skillValidation = await skillApplicatorService.applySkillRules(vbs);
    const promptValidation = await skillApplicatorService.validatePromptAgainstSkills(prompt, vbs);

    if (skillValidation.valid && promptValidation.valid) {
      console.log('✅ All skill validations passed');
      return prompt;
    }

    // Repair based on skill violations
    const allIssues = [
      ...skillValidation.warnings,
      ...promptValidation.warnings,
    ];

    for (const issue of allIssues) {
      console.log(`Repairing ${issue.type}: ${issue.message}`);
      repairVBSForIssue(vbs, issue);
    }

    iterations++;
  }

  console.warn('⚠️  Max iterations reached, returning best attempt');
  return compileVBSToPrompt(vbs);
}
```

---

## Skill File Structure

### FLUX_VOCABULARY.md

Sections parsed:
- `## SHOT TYPES` → `catalog.shotTypes`
- `## CAMERA ANGLES` → `catalog.cameraAngles`
- `## POSE DESCRIPTIONS` → `catalog.poses`
- `## EXPRESSION KEYWORDS` → `catalog.expressions`
- `## LIGHTING` → `catalog.lighting`
- `## TERMS TO AVOID` → `catalog.avoidTerms`

### SKILL.md

Sections parsed:
- Token budgets by scene type
- Character description rules
- LoRA trigger rules
- Helmet rules
- Segment tag format
- Compilation order rules

### CINEMATOGRAPHER_RULES.md

Loaded as complete instruction for Phase B LLM.
Used in `vbsFillInService.ts` buildCinematographerSystemInstruction()

---

## Configuration

### Cache Expiry

Default: 5 minutes
Edit in `skillLoaderService.ts`:
```typescript
private cacheExpiry = 5 * 60 * 1000; // 5 minutes
```

### Force Reload

```typescript
skillLoaderService.clearCache();
const skills = await skillLoaderService.loadAllSkills();
```

### Skill File Location

```typescript
.claude/skills/prompt-generation-rules/
  ├── FLUX_VOCABULARY.md
  ├── SKILL.md
  ├── CINEMATOGRAPHER_RULES.md
  ├── DATA_LOCATOR.md
  └── TESTING_STRATEGY.md
```

---

## Migration Checklist

- ✅ skillLoaderService.ts created
- ✅ skillParserService.ts created
- ✅ skillApplicatorService.ts created
- ✅ vbsFillInService.ts updated to load CINEMATOGRAPHER_RULES dynamically
- ⏳ vbsBuilderService.ts: Integrate FLUX suggestions
- ⏳ vbsCompilerService.ts: Integrate skill validation
- ⏳ promptGenerationService.ts: Orchestrate skill application across phases

---

## Testing

### Test Skill Loading

```typescript
import { skillLoaderService } from './services/skillLoaderService';

const skills = await skillLoaderService.loadAllSkills();
console.log('FLUX Vocabulary loaded:', skills.fluxVocabulary.length, 'chars');
console.log('Skill Rules loaded:', skills.skillRules.length, 'chars');
console.log('Cinematographer loaded:', skills.cinematographerRules.length, 'chars');
```

### Test Skill Parsing

```typescript
import { skillParserService } from './services/skillParserService';
import { skillLoaderService } from './services/skillLoaderService';

const skills = await skillLoaderService.loadAllSkills();
const fluxCatalog = skillParserService.parseFluxVocabulary(skills.fluxVocabulary);

console.log('Shot types found:', Object.keys(fluxCatalog.shotTypes).length);
console.log('Camera angles found:', Object.keys(fluxCatalog.cameraAngles).length);
console.log('Avoid terms found:', fluxCatalog.avoidTerms.length);
```

### Test Skill Application

```typescript
import { skillApplicatorService } from './services/skillApplicatorService';

await skillApplicatorService.initialize();
const result = await skillApplicatorService.applyFluxRules(beatAnalysis);

console.log('Valid:', result.valid);
console.log('Warnings:', result.warnings);
console.log('Applied:', result.applied);
console.log('Suggestions:', result.suggestions);
```

---

## Next Steps

1. ✅ Create skill loader/parser/applicator services
2. ✅ Update vbsFillInService to use dynamic CINEMATOGRAPHER_RULES
3. ⏳ Update vbsBuilderService to use FLUX suggestions
4. ⏳ Update vbsCompilerService to validate against SKILL.md rules
5. ⏳ Create integration tests for skill application
6. ⏳ Document skill file update process

---

**Status**: Services created and integrated into Phase B (vbsFillInService)
**Next**: Integrate into Phases A, C, D
**Date**: 2026-02-27
