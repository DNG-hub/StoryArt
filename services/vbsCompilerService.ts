/**
 * VBS Compiler Service — Phase C+D: Compilation and Validation/Repair
 *
 * Phase C: compileVBSToPrompt() assembles final prompt from completed VBS
 * Phase D: runVBSValidation() checks prompt and repairs VBS if needed
 *
 * Assembly is complete by construction — no post-processing injection.
 * Validation/repair loop with max 2 iterations.
 *
 * v0.21 Compiler-Style Prompt Generation
 */

import type {
  VisualBeatSpec,
  VBSValidationResult,
} from '../types';

/**
 * Compile a completed VisualBeatSpec into a final FLUX prompt.
 * All fields are deterministically assembled; no subsequent modification.
 */
export function compileVBSToPrompt(vbs: VisualBeatSpec): string {
  const parts: string[] = [];

  // --- Shot section (first tokens = highest T5 attention) ---
  if (vbs.shot.shotType) {
    parts.push(vbs.shot.shotType);
  }
  if (vbs.shot.cameraAngle) {
    parts.push(vbs.shot.cameraAngle);
  }
  if (vbs.shot.composition) {
    parts.push(vbs.shot.composition);
  }

  // --- Subjects (characters) section ---
  for (const subject of vbs.subjects) {
    // [LoRA trigger] (description) action, expression, position
    const subjectParts: string[] = [];

    // LoRA trigger (never optional)
    subjectParts.push(subject.loraTrigger);

    // Character description
    if (subject.description) {
      subjectParts.push(`(${subject.description})`);
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

  // --- Environment section ---
  if (vbs.environment.anchors.length > 0) {
    parts.push(vbs.environment.anchors.join(', '));
  }

  if (vbs.environment.lighting) {
    parts.push(vbs.environment.lighting);
  }

  if (vbs.environment.atmosphere) {
    parts.push(vbs.environment.atmosphere);
  }

  if (vbs.environment.fx) {
    parts.push(vbs.environment.fx);
  }

  if (vbs.environment.props && vbs.environment.props.length > 0) {
    parts.push(vbs.environment.props.join(', '));
  }

  // --- Vehicle section ---
  if (vbs.vehicle) {
    const vehicleParts = [vbs.vehicle.description];
    if (vbs.vehicle.spatialNote) {
      vehicleParts.push(vbs.vehicle.spatialNote);
    }
    parts.push(vehicleParts.join(', '));
  }

  // --- Segment tags (processed separately by SwarmUI, appended at end) ---
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
    parts.push(allSegments.join(', '));
  }

  // Join all parts with comma-space
  let prompt = parts.filter(Boolean).join(', ');

  // Clean up formatting
  prompt = prompt.replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();

  return prompt;
}

/**
 * Run validation on a compiled prompt.
 * Returns actionable diagnostics and determines if repairs are needed.
 */
export function runVBSValidation(
  vbs: VisualBeatSpec,
  prompt: string
): { valid: boolean; issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }> } {
  const issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }> = [];

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
 * Max 2 iterations; returns best available prompt after repairs.
 */
export function repairAndRecompile(
  vbs: VisualBeatSpec,
  initialValidation: { valid: boolean; issues: Array<{ type: string; description: string; severity: 'error' | 'warning' }> },
  maxIterations: number = 2
): { prompt: string; repairsApplied: string[]; valid: boolean; iterationCount: number } {
  let currentVBS = { ...vbs };
  let currentPrompt = compileVBSToPrompt(currentVBS);
  let currentValidation = initialValidation;
  const repairsApplied: string[] = [];
  let iterationCount = 0;

  while (!currentValidation.valid && iterationCount < maxIterations) {
    iterationCount++;
    const errorIssues = currentValidation.issues.filter(i => i.severity === 'error');

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

    // Recompile and revalidate
    currentPrompt = compileVBSToPrompt(currentVBS);
    currentValidation = runVBSValidation(currentVBS, currentPrompt);
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
export function validateAndRepairVBS(vbs: VisualBeatSpec): VBSValidationResult {
  // Phase C: Compile
  const prompt = compileVBSToPrompt(vbs);

  // Phase D: Validate
  const validation = runVBSValidation(vbs, prompt);

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

  // Phase D: Repair and recompile
  const repairResult = repairAndRecompile(vbs, validation);

  return {
    beatId: vbs.beatId,
    valid: repairResult.valid,
    issues: runVBSValidation(vbs, repairResult.prompt).issues,
    repairsApplied: repairResult.repairsApplied,
    iterationCount: repairResult.iterationCount,
    maxIterationsReached: repairResult.iterationCount >= 2,
    finalPrompt: repairResult.prompt,
  };
}
