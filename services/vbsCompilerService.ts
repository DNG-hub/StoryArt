/**
 * VBS Compiler Service — Phase C+D: Compilation and Validation/Repair
 *
 * Phase C: compileVBSToPrompt() assembles final prompt from completed VBS
 * Phase D: runVBSValidation() checks prompt and repairs VBS if needed
 *
 * Assembly is complete by construction — no post-processing injection.
 * Validation/repair loop with max 2 iterations.
 *
 * Integrates runtime skill validation to ensure prompt compliance with
 * FLUX vocabulary, SKILL.md rules, and CINEMATOGRAPHER constraints.
 *
 * v0.21 Compiler-Style Prompt Generation + Runtime Skill Integration
 */

import type {
  VisualBeatSpec,
  VBSValidationResult,
} from '../types';
import { skillApplicatorService } from './skillApplicatorService';

/**
 * Compile a completed VisualBeatSpec into a final FLUX prompt.
 * All fields are deterministically assembled; no subsequent modification.
 * STRICT ORDER (critical for T5 encoder token attention):
 * 1. [shot_type], [depth_of_field], [composition]
 * 2. [character LoRA], [description], [action], [expression], [position] (× N characters)
 * 3. [location_visual]
 * 4. [anchors]
 * 5. [lighting]
 * 6. [atmosphere]
 * 7. [fx]
 * 8. [props]
 * 9. [vehicle]
 * 10. [color_grade]
 * 11. <segment_tags> (NO SPACES between tags)
 */
export function compileVBSToPrompt(vbs: VisualBeatSpec): string {
  const parts: string[] = [];

  // --- 1. Shot section (first tokens = highest T5 attention) ---
  if (vbs.shot.shotType) {
    parts.push(vbs.shot.shotType);
  }
  if (vbs.shot.depthOfField) {
    parts.push(vbs.shot.depthOfField);
  }
  if (vbs.shot.cameraAngle) {
    parts.push(vbs.shot.cameraAngle);
  }
  if (vbs.shot.composition) {
    parts.push(vbs.shot.composition);
  }

  // --- 2. Subjects (characters) section ---
  for (const subject of vbs.subjects) {
    // [LoRA trigger] description action, expression, position
    const subjectParts: string[] = [];

    // LoRA trigger (never optional)
    subjectParts.push(subject.loraTrigger);

    // Character description (NO PARENTHESES - T5 encoder doesn't use parens for emphasis)
    if (subject.description) {
      subjectParts.push(subject.description);
    }

    // Action (filled by LLM)
    if (subject.action) {
      subjectParts.push(subject.action);
    }

    // Expression (filled by LLM, can be null)
    if (subject.expression) {
      subjectParts.push(subject.expression);
    }

    // Position
    if (subject.position) {
      subjectParts.push(subject.position);
    }

    parts.push(subjectParts.join(', '));
  }

  // --- 3. Location visual ---
  if (vbs.environment.locationVisual) {
    parts.push(vbs.environment.locationVisual);
  }

  // --- 4. Anchors (structural artifacts) ---
  if (vbs.environment.anchors.length > 0) {
    parts.push(vbs.environment.anchors.join(', '));
  }

  // --- 5. Lighting ---
  if (vbs.environment.lighting) {
    parts.push(vbs.environment.lighting);
  }

  // --- 6. Atmosphere ---
  if (vbs.environment.atmosphere) {
    parts.push(vbs.environment.atmosphere);
  }

  // --- 7. FX (environmental effects) ---
  if (vbs.environment.fx) {
    parts.push(vbs.environment.fx);
  }

  // --- 8. Props ---
  if (vbs.environment.props && vbs.environment.props.length > 0) {
    parts.push(vbs.environment.props.join(', '));
  }

  // --- 9. Vehicle section ---
  if (vbs.vehicle) {
    const vehicleParts = [vbs.vehicle.description];
    if (vbs.vehicle.spatialNote) {
      vehicleParts.push(vbs.vehicle.spatialNote);
    }
    parts.push(vehicleParts.join(', '));
  }

  // --- 10. Color grade ---
  if (vbs.environment.colorGrade) {
    parts.push(vbs.environment.colorGrade);
  }

  // Join all parts with comma-space
  let prompt = parts.filter(Boolean).join(', ');

  // --- 11. Segment tags (NO SPACES between multiple tags) ---
  const allSegments: string[] = [];
  for (const subject of vbs.subjects) {
    if (subject.segments.clothing) {
      allSegments.push(subject.segments.clothing);
    }
    if (subject.segments.face) {
      allSegments.push(subject.segments.face);
    }
  }
  if (allSegments.length > 0) {
    // Join segments with NO spaces (critical for SwarmUI parsing)
    const segmentString = allSegments.join('');
    prompt = prompt ? `${prompt}${segmentString}` : segmentString;
  }

  // Clean up formatting
  prompt = prompt.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();

  return prompt;
}

/**
 * Run validation on a compiled prompt.
 * Includes both internal checks and runtime skill validation against FLUX/SKILL rules.
 * Returns actionable diagnostics and determines if repairs are needed.
 */
export async function runVBSValidation(
  vbs: VisualBeatSpec,
  prompt: string
): Promise<{ valid: boolean; issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }> }> {
  const issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }> = [];

  // SKILL INTEGRATION: Apply runtime skill validation
  try {
    console.log(`[VBS Phase C] Running skill validation for beat ${vbs.beatId}...`);

    // Validate against SKILL.md rules
    const skillValidation = await skillApplicatorService.applySkillRules(vbs);
    if (!skillValidation.valid) {
      console.warn(`[VBS Phase C] ⚠️  SKILL.md validation warnings:`);
      skillValidation.warnings.forEach(w => {
        console.warn(`  [${w.severity}] ${w.type}: ${w.message}`);
        issues.push({
          type: w.type,
          description: w.message,
          severity: w.severity,
        });
      });
    } else {
      console.log(`[VBS Phase C] ✅ SKILL.md validation passed`);
    }

    // Validate prompt against all skill constraints
    const promptValidation = await skillApplicatorService.validatePromptAgainstSkills(prompt, vbs);
    if (!promptValidation.valid) {
      console.warn(`[VBS Phase C] ⚠️  Prompt skill validation warnings:`);
      promptValidation.warnings.forEach(w => {
        console.warn(`  [${w.severity}] ${w.type}: ${w.message}`);
        issues.push({
          type: w.type,
          description: w.message,
          severity: w.severity,
        });
      });
    } else {
      console.log(`[VBS Phase C] ✅ Prompt skill validation passed`);
    }
  } catch (error) {
    console.warn(`[VBS Phase C] ⚠️  Skill validation failed, continuing with internal checks:`, error);
  }

  const lowerPrompt = prompt.toLowerCase();

  // Check 1: All LoRA triggers present
  for (const subject of vbs.subjects) {
    if (!lowerPrompt.includes(subject.loraTrigger.toLowerCase())) {
      issues.push({
        type: 'missing_lora_trigger',
        description: `Missing LoRA trigger for ${subject.characterName}: ${subject.loraTrigger}`,
        severity: 'error',
      });
    }
  }

  // Check 2: Hair text + VISOR_DOWN violation
  for (const subject of vbs.subjects) {
    if (subject.helmetState === 'VISOR_DOWN') {
      const hairKeywords = ['hair', 'ponytail', 'updo', 'tousled', 'locks'];
      if (hairKeywords.some(kw => lowerPrompt.includes(kw))) {
        issues.push({
          type: 'helmet_hair_violation',
          description: `${subject.characterName}: Hair text present with visor down`,
          severity: 'error',
        });
      }
    }
  }

  // Check 3: Face segment presence when faceVisible
  for (const subject of vbs.subjects) {
    if (subject.faceVisible && subject.segments.face) {
      if (!lowerPrompt.includes('<segment:yolo-face')) {
        issues.push({
          type: 'missing_face_segment',
          description: `${subject.characterName}: Face visible but no face segment tag`,
          severity: 'warning',
        });
      }
    }
  }

  // Check 4: Token budget
  const tokenCount = estimateTokenCount(prompt);
  if (tokenCount > vbs.constraints.tokenBudget.total) {
    issues.push({
      type: 'token_budget_exceeded',
      description: `Token count ${tokenCount} exceeds budget ${vbs.constraints.tokenBudget.total}`,
      severity: 'error',
    });
  }

  // Check 5: Expression with visor down
  for (const subject of vbs.subjects) {
    if (subject.helmetState === 'VISOR_DOWN' && subject.expression) {
      issues.push({
        type: 'expression_visor_violation',
        description: `${subject.characterName}: Expression text present with visor down`,
        severity: 'error',
      });
    }
  }

  const valid = issues.filter(i => i.severity === 'error').length === 0;

  return { valid, issues };
}

/**
 * Repair and recompile a VBS based on validation issues.
 * Uses skill validation results to guide repair strategy prioritization.
 * Max 2 iterations; returns best available prompt after repairs.
 */
export async function repairAndRecompile(
  vbs: VisualBeatSpec,
  initialValidation: { valid: boolean; issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }> },
  maxIterations: number = 2
): Promise<{ prompt: string; repairsApplied: string[]; valid: boolean; iterationCount: number }> {
  let currentVBS = { ...vbs };
  let currentPrompt = compileVBSToPrompt(currentVBS);
  let currentValidation = initialValidation;
  const repairsApplied: string[] = [];
  let iterationCount = 0;

  while (!currentValidation.valid && iterationCount < maxIterations) {
    iterationCount++;
    const errorIssues = currentValidation.issues.filter(i => i.severity === 'error');

    // SKILL INTEGRATION: Log skill-guided repair strategy
    console.log(`[VBS Phase D] Iteration ${iterationCount}: Applying skill-guided repairs...`);

    for (const issue of errorIssues) {
      if (issue.type === 'missing_lora_trigger') {
        // Repair: force-prepend LoRA trigger to subject description
        const match = issue.description.match(/for (.+?):/);
        if (match) {
          const charName = match[1];
          const subject = currentVBS.subjects.find(s => s.characterName === charName);
          if (subject) {
            subject.description = `${subject.loraTrigger}, ${subject.description}`;
            repairsApplied.push(`Prepended LoRA trigger to ${charName}`);
          }
        }
      } else if (issue.type === 'helmet_hair_violation') {
        // Repair: strip hair from description
        const charName = issue.description.split(':')[0];
        const subject = currentVBS.subjects.find(s => s.characterName === charName);
        if (subject) {
          subject.description = subject.description
            .replace(/,?\s*hair[^,]*/gi, '')
            .replace(/,?\s*ponytail[^,]*/gi, '')
            .replace(/,?\s*updo[^,]*/gi, '')
            .replace(/,?\s*tousled[^,]*/gi, '')
            .replace(/,\s*,/g, ',')
            .trim();
          repairsApplied.push(`Stripped hair from ${charName} (visor down)`);
        }
      } else if (issue.type === 'missing_face_segment') {
        // Repair: inject face segment
        const charName = issue.description.split(':')[0];
        const subject = currentVBS.subjects.find(s => s.characterName === charName);
        if (subject) {
          subject.segments.face = '<segment:yolo-face>';
          repairsApplied.push(`Injected face segment for ${charName}`);
        }
      } else if (issue.type === 'expression_visor_violation') {
        // Repair: null the expression
        const charName = issue.description.split(':')[0];
        const subject = currentVBS.subjects.find(s => s.characterName === charName);
        if (subject) {
          subject.expression = null;
          repairsApplied.push(`Nulled expression for ${charName} (visor down)`);
        }
      } else if (issue.type === 'token_budget_exceeded') {
        // Repair: apply compaction strategy
        currentVBS = applyCompactionStrategy(currentVBS);
        repairsApplied.push(`Applied compaction strategy`);
      }
    }

    // Recompile and revalidate (using skill validation)
    currentPrompt = compileVBSToPrompt(currentVBS);
    currentValidation = await runVBSValidation(currentVBS, currentPrompt);
    console.log(`[VBS Phase D] Revalidation: valid=${currentValidation.valid}, errors=${currentValidation.issues.filter(i => i.severity === 'error').length}`);
  }

  return {
    prompt: currentPrompt,
    repairsApplied,
    valid: currentValidation.valid,
    iterationCount,
  };
}

/**
 * Apply priority-aware compaction when token budget is exceeded.
 * Follows compactionDropOrder from VBS constraints.
 */
function applyCompactionStrategy(vbs: VisualBeatSpec): VisualBeatSpec {
  const compacted = { ...vbs };
  const dropOrder = vbs.constraints.compactionDropOrder;

  for (const dropTarget of dropOrder) {
    // Parse drop target (e.g., "vehicle.spatialNote", "environment.props", etc.)
    const [section, field] = dropTarget.split('.');

    if (section === 'vehicle' && field === 'spatialNote') {
      if (compacted.vehicle) {
        compacted.vehicle.spatialNote = undefined;
        console.log(`[Compaction] Dropped vehicle.spatialNote`);
        break; // Stop after first successful drop
      }
    } else if (section === 'environment' && field === 'props') {
      if (compacted.environment.props?.length) {
        compacted.environment.props = undefined;
        console.log(`[Compaction] Dropped environment.props`);
        break;
      }
    } else if (section === 'environment' && field === 'fx') {
      if (compacted.environment.fx) {
        compacted.environment.fx = undefined;
        console.log(`[Compaction] Dropped environment.fx`);
        break;
      }
    } else if (section === 'environment' && field === 'atmosphere') {
      if (compacted.environment.atmosphere) {
        compacted.environment.atmosphere = compacted.environment.atmosphere.substring(0, 40) + '...';
        console.log(`[Compaction] Truncated environment.atmosphere`);
        break;
      }
    } else if (section === 'subjects' && field.startsWith('[')) {
      // subjects[1].description
      const index = parseInt(field.match(/\d+/)?.[0] || '1');
      if (compacted.subjects[index]) {
        compacted.subjects[index].description =
          compacted.subjects[index].description.substring(0, 60) + '...';
        console.log(`[Compaction] Condensed subject[${index}].description`);
        break;
      }
    }
  }

  return compacted;
}

/**
 * Estimate T5 token count.
 * T5 tokenizer: ~4 characters per token.
 */
function estimateTokenCount(prompt: string): number {
  // Strip segment tags from count
  const withoutSegments = prompt.replace(/<segment:[^>]+>/g, '').trim();
  return Math.ceil(withoutSegments.length / 4);
}

/**
 * Run full VBS validation and repair pipeline.
 * Returns final validated prompt with repair history.
 */
export async function validateAndRepairVBS(vbs: VisualBeatSpec): Promise<VBSValidationResult> {
  // Phase C: Compile
  const prompt = compileVBSToPrompt(vbs);

  // Phase D: Validate (now async with skill integration)
  const validation = await runVBSValidation(vbs, prompt);

  if (validation.valid) {
    // No repairs needed
    return {
      beatId: vbs.beatId,
      valid: true,
      issues: [],
      repairsApplied: [],
      iterationCount: 0,
      maxIterationsReached: false,
      finalPrompt: prompt,
    };
  }

  // Phase D: Repair and recompile (now async with skill-guided strategy)
  const repairResult = await repairAndRecompile(vbs, validation);

  // Final revalidation with skill checks
  const finalValidation = await runVBSValidation(vbs, repairResult.prompt);

  return {
    beatId: vbs.beatId,
    valid: repairResult.valid,
    issues: finalValidation.issues,
    repairsApplied: repairResult.repairsApplied,
    iterationCount: repairResult.iterationCount,
    maxIterationsReached: repairResult.iterationCount >= 2,
    finalPrompt: repairResult.prompt,
  };
}
