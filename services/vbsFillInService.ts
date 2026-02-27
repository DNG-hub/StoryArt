/**
 * VBS Fill-In Service — Phase B: LLM Slot-Fill
 *
 * Fills only the action/expression/composition slots that cannot be deterministically set.
 * Uses a focused ~400-token system instruction (CINEMATOGRAPHER_RULES.md).
 * Currently uses Gemini; multi-provider support can be added later.
 * JSON output with fallback to deterministic fill-in on LLM failure.
 *
 * v0.21 Compiler-Style Prompt Generation
 */

import type {
  VisualBeatSpec,
  VBSFillIn,
  LLMProvider,
  BeatAnalysis,
} from '../types';
import { GoogleGenAI } from '@google/genai';
import { getGeminiModel, getGeminiTemperature, getGeminiMaxTokens } from './geminiService';

/**
 * JSON schema for VBSFillIn validation.
 */
const VBS_FILL_IN_SCHEMA = {
  type: 'object',
  properties: {
    beatId: { type: 'string' },
    shotComposition: { type: 'string' },
    subjectFillIns: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          characterName: { type: 'string' },
          action: { type: 'string' },
          expression: { oneOf: [{ type: 'string' }, { type: 'null' }] },
          dualPositioning: { type: 'string', enum: ['camera-left', 'camera-right'] },
        },
        required: ['characterName', 'action', 'expression'],
      },
    },
    vehicleSpatialNote: { type: 'string' },
    atmosphereEnrichment: { type: 'string' },
  },
  required: ['beatId', 'shotComposition', 'subjectFillIns'],
};

/**
 * Build the system instruction for Phase B LLM.
 * Focused on translating visual_anchor and writing camera-observable descriptions.
 * Zero story names, zero character appearance details.
 */
function buildCinematographerSystemInstruction(beatAnalysis: BeatAnalysis): string {
  return `You are a cinematographer filling in missing visual details for an AI image generation pipeline.

Your job: complete the Visual Beat Spec by filling in only what a camera would literally see.

INPUT: A partial VBS with empty slots:
- shot.composition: What does the visual_anchor describe? Translate to FLUX spatial language.
- subjects[].action: What is each character DOING (observable pose/movement)?
- subjects[].expression: What is their FACE showing (only if not helmeted)?
- vehicle.spatialNote: Where/how is the vehicle moving?
- atmosphereEnrichment: Beat-specific observable environment detail (NOT location base).

RULES:
1. Composition: Visual_anchor is the director's intent. Translate it to FLUX spatial language:
   - "wide view of both characters" → "wide angle, character 1 left, character 2 right"
   - "intimate moment" → "close on faces, soft depth of field"
   - "action shot" → "dynamic angle, motion blur on vehicle"

2. Action: Observable pose/movement ONLY. No psychology, no inner state. Examples:
   - "weight forward on right foot, left hand raised"
   - "crouching behind barrier, scanning left"
   - "hands gripping wheel, shoulders hunched forward"

3. Expression: Camera-observable facial features ONLY. NO emotions, NO states. Examples:
   - "brow furrowed, eyes narrowed"
   - "mouth slightly open, eyes wide"
   - If character has visor DOWN, expression MUST be null (you cannot see face).

4. atmosphereEnrichment: Beat-specific CAMERA OBSERVATIONS. Examples:
   - "dust particles visible in light shaft"
   - "wet asphalt glistening, rain dripping down visor"
   - NOT generic location descriptions.

OUTPUT: Valid JSON matching the VBSFillIn schema.`;
}

/**
 * Fill the VBS using Gemini LLM.
 * Returns completed VBSFillIn or deterministic fallback if LLM fails.
 */
export async function fillVBSWithLLM(
  partialVBS: VisualBeatSpec,
  beatAnalysis: BeatAnalysis,
  _selectedLLM: LLMProvider = 'gemini'
): Promise<VBSFillIn> {
  try {
    // Get Gemini configuration from environment
    const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
                   (typeof import.meta !== 'undefined' && import.meta.env?.GEMINI_API_KEY) ||
                   process.env.VITE_GEMINI_API_KEY ||
                   process.env.GEMINI_API_KEY ||
                   process.env.API_KEY;

    if (!apiKey) {
      console.warn(`[VBSFillIn] ${partialVBS.beatId}: No Gemini API key, using fallback`);
      return buildFallbackFillIn(partialVBS, beatAnalysis);
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildCinematographerSystemInstruction(beatAnalysis);
    const userPrompt = buildFillInUserPrompt(partialVBS, beatAnalysis);

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: [{
        parts: [{
          text: `${systemInstruction}\n\n${userPrompt}`,
        }],
      }],
      config: {
        temperature: getGeminiTemperature(),
        maxOutputTokens: getGeminiMaxTokens(),
      },
    });

    // Extract text response
    const text = response.text?.trim();
    if (!text) {
      console.warn(`[VBSFillIn] ${partialVBS.beatId}: Invalid response format, using fallback`);
      return buildFallbackFillIn(partialVBS, beatAnalysis);
    }

    // Parse response as JSON
    let fillIn: VBSFillIn;
    try {
      fillIn = JSON.parse(text) as VBSFillIn;
    } catch {
      // Try to extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fillIn = JSON.parse(jsonMatch[0]) as VBSFillIn;
      } else {
        throw new Error('No JSON found in response');
      }
    }

    // Validate schema
    if (!validateVBSFillInSchema(fillIn)) {
      console.warn(`[VBSFillIn] ${partialVBS.beatId}: Invalid schema, using fallback`);
      return buildFallbackFillIn(partialVBS, beatAnalysis);
    }

    console.log(`[VBSFillIn] ${partialVBS.beatId}: LLM fill-in successful`);
    return fillIn;
  } catch (error) {
    console.warn(`[VBSFillIn] ${partialVBS.beatId}: LLM call failed, using fallback`, error);
    return buildFallbackFillIn(partialVBS, beatAnalysis);
  }
}

/**
 * Build user prompt for Phase B LLM.
 */
function buildFillInUserPrompt(partialVBS: VisualBeatSpec, beatAnalysis: BeatAnalysis): string {
  const subjectsJson = JSON.stringify(
    partialVBS.subjects.map(s => ({
      characterName: s.characterName,
      helmetState: s.helmetState,
      faceVisible: s.faceVisible,
      currentDescription: s.description,
    })),
    null,
    2
  );

  // Safely access beat analysis fields with defaults
  const beatScript = (beatAnalysis as any).beat_script_text || '';
  const visualAnchor = (beatAnalysis as any).visual_anchor || 'not provided';
  const emotionalTone = (beatAnalysis as any).emotional_tone || 'neutral';

  return `Fill in the missing visual details for this beat:

Beat ID: ${partialVBS.beatId}
Script: "${beatScript}"
Visual Anchor: "${visualAnchor}"
Emotional Tone: ${emotionalTone}

Shot Type: ${partialVBS.shot.shotType}
Camera Angle: ${partialVBS.shot.cameraAngle || 'not specified'}

Characters in scene:
${subjectsJson}

Location: ${partialVBS.environment.locationShorthand}
Environment: ${partialVBS.environment.anchors.join(', ') || 'generic'}
Lighting: ${partialVBS.environment.lighting}

Vehicle: ${partialVBS.vehicle?.description || 'none'}

Previous beat context: ${partialVBS.previousBeatSummary || 'start of scene'}

Fill in ONLY the missing slots. Return valid JSON.`;
}

/**
 * Validate VBSFillIn against schema.
 */
function validateVBSFillInSchema(fillIn: any): boolean {
  if (!fillIn.beatId || typeof fillIn.beatId !== 'string') return false;
  if (!fillIn.shotComposition || typeof fillIn.shotComposition !== 'string') return false;
  if (!Array.isArray(fillIn.subjectFillIns)) return false;

  for (const subject of fillIn.subjectFillIns) {
    if (!subject.characterName || !subject.action) return false;
    if (subject.expression === undefined) return false; // Can be null or string
  }

  return true;
}

/**
 * Build deterministic fallback fill-in for LLM failures.
 * Uses beat analysis fields to derive reasonable defaults.
 */
export function buildFallbackFillIn(
  partialVBS: VisualBeatSpec,
  beatAnalysis: BeatAnalysis
): VBSFillIn {
  const subjectFillIns = partialVBS.subjects.map((subject, index) => {
    // Derive action from shot type as a default
    let action = 'standing, observing';
    const shotType = (partialVBS.shot.shotType || '').toLowerCase();
    if (shotType.includes('close')) {
      action = 'intense focus, face forward';
    } else if (shotType.includes('wide')) {
      action = 'full body visible, contextual positioning';
    }

    // Derive expression from beat emotional tone if available
    let expression: string | null = null;
    if (subject.faceVisible) {
      const emotionalTone = (beatAnalysis as any).emotional_tone || 'neutral';
      if (emotionalTone.toLowerCase().includes('alert')) {
        expression = 'eyes wide, brow raised';
      } else if (emotionalTone.toLowerCase().includes('intense')) {
        expression = 'brow furrowed, focused gaze';
      } else {
        expression = 'neutral expression, eyes forward';
      }
    } else if (subject.helmetState === 'VISOR_DOWN') {
      expression = null; // Cannot see face
    }

    // Position: left/right based on character order
    const dualPositioning = index === 0 ? ('camera-left' as const) : ('camera-right' as const);

    const fillIn: any = {
      characterName: subject.characterName,
      action,
      expression,
    };

    if (partialVBS.subjects.length >= 2) {
      fillIn.dualPositioning = dualPositioning;
    }

    return fillIn;
  });

  // Derive composition from visual_anchor or shot type
  let shotComposition = 'standard framing';
  const visualAnchor = (beatAnalysis as any).visual_anchor;
  if (visualAnchor) {
    shotComposition = `${visualAnchor}, ${partialVBS.shot.shotType}`;
  } else if (partialVBS.shot.cameraAngle) {
    shotComposition = `${partialVBS.shot.shotType}, ${partialVBS.shot.cameraAngle}`;
  } else {
    shotComposition = partialVBS.shot.shotType;
  }

  return {
    beatId: partialVBS.beatId,
    shotComposition,
    subjectFillIns,
    vehicleSpatialNote: partialVBS.vehicle ? 'in motion' : undefined,
    atmosphereEnrichment: undefined,
  };
}

/**
 * Merge VBSFillIn into partialVBS to produce completed VisualBeatSpec.
 */
export function mergeVBSFillIn(
  partialVBS: VisualBeatSpec,
  fillIn: VBSFillIn
): VisualBeatSpec {
  // Update shot composition
  const updatedShot = { ...partialVBS.shot };
  if (fillIn.shotComposition) {
    updatedShot.composition = fillIn.shotComposition;
  }

  // Update subjects with action/expression
  const updatedSubjects = partialVBS.subjects.map(subject => {
    const fillInData = fillIn.subjectFillIns.find(f => f.characterName === subject.characterName);
    if (fillInData) {
      return {
        ...subject,
        action: fillInData.action,
        expression: fillInData.expression !== undefined ? fillInData.expression : subject.expression,
        position: fillInData.dualPositioning || subject.position,
      };
    }
    return subject;
  });

  // Update vehicle spatial note
  const updatedVehicle = partialVBS.vehicle
    ? {
        ...partialVBS.vehicle,
        spatialNote: fillIn.vehicleSpatialNote || partialVBS.vehicle.spatialNote,
      }
    : undefined;

  // Update environment atmosphere if enrichment provided
  const updatedEnvironment = { ...partialVBS.environment };
  if (fillIn.atmosphereEnrichment) {
    updatedEnvironment.atmosphere = fillIn.atmosphereEnrichment;
  }

  return {
    ...partialVBS,
    shot: updatedShot,
    subjects: updatedSubjects,
    vehicle: updatedVehicle,
    environment: updatedEnvironment,
  };
}
