# Beat-Narrative Driven Prompt Generation Standards

This document outlines the new production standards implemented based on the latest findings in `Latest_Prompt_Suggestions.md`.

## Key New Principles

### 1. Beat-Narrative Driven Lighting Extraction

The most significant new principle is that **the beat narrative is the SOURCE OF TRUTH for all lighting**. This replaces the previous approach of using generic atmospheric lighting.

#### Methodology:
1. READ beat narrative for ANY lighting-related details
2. EXTRACT those details and adapt to face lighting
3. FALLBACK to location atmosphere only if beat has NO lighting details

#### Lighting Extraction Categories:
- **Light Sources**: "emergency generators", "muzzle flashes", "explosions", "searchlights", "fires"
- **Light Qualities**: "bright", "subdued", "dim", "harsh", "soft", "flickering", "strobing", "pulsing"
- **Light Colors**: "green", "orange", "red", "blue", "golden", "white", "amber", "sickly"
- **Environmental Effects**: "gunsmoke", "dust", "fog", "rain", "debris cloud", "haze"
- **Time Indicators**: "dawn", "dusk", "night", "midday", "twilight", "sunset"
- **Intensity Modifiers**: "barely visible", "blinding", "faint", "intense", "overwhelming"

#### Example Extraction Process:
```
Beat: "heavy gunsmoke, bright muzzle flashes illuminating the haze"
Face Lighting: "bright intermittent muzzle flashes on face, subdued by thick gunsmoke, flickering combat lighting"
```

### 2. Dynamic Weapon Positioning

Weapon positioning for Daniel (HSCEIA man) is now beat-specific action, NOT a character trait.

#### Previous (WRONG):
```
HSCEIA man (...body armor, M4 carbine slung across chest...)
```

#### Current (CORRECT):
- Character description: "HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes)"
- Action section: "advancing with M4 carbine at ready position"

#### Common Weapon Positions:
- **Defensive**: "M4 carbine at ready position"
- **Offensive**: "aiming M4 carbine", "firing M4 carbine"  
- **Moving**: "M4 carbine slung across chest", "carbine on tactical sling"
- **Tactical**: "M4 carbine low ready", "carbine at high ready"
- **Resting**: "M4 carbine secured on back", "weapon lowered"
- **Transition**: "raising M4 carbine", "shouldering weapon"

### 3. Updated Prompt Structure

#### New Standard Structure:
```
[shot_type] of [character_description], [facial_expression], [action_verb] [environment_description with beat narrative lighting]. [face_lighting_extracted_from_beat_narrative]. [composition_directives]. <yolo_segments>
```

#### Critical Changes:
1. **Always start with shot type** ("medium shot of a", "wide shot of a", "close-up of a")
2. **Include facial expression** after character description
3. **Extract lighting from beat narrative** first, fallback only if no lighting details
4. **Include weapon position in action** for Daniel (not character description)
5. **End with YOLO segments** for precise camera control

## Implementation in Services

### 1. System Instructions Updated
- `promptGenerationService.ts` - Updated with beat-narrative lighting extraction
- `qwenPromptService.ts` - Updated with beat-narrative lighting extraction

### 2. New Service: beatNarrativeProcessor.ts
A dedicated service for extracting lighting keywords from beat narratives:

#### Key Functions:
- `extractLightingKeywords(narrativeText)`: Extracts lighting categories from beat text
- `buildFaceLightingFromBeat(narrativeText, fallback)`: Builds face lighting from beat or uses fallback
- `hasLightingDetails(narrativeText)`: Checks if beat contains lighting details

#### Usage Example:
```typescript
import { processBeatNarrativeForLighting } from './beatNarrativeProcessor';

const beatNarrative = "Daniel advances through heavy gunsmoke, bright muzzle flashes illuminating the chaos";
const locationFallback = "dramatic tactical lighting on face";
const faceLighting = processBeatNarrativeForLighting(beatNarrative, locationFallback);
// Returns: "intermittent muzzle flash on face, blinding effect on features"
```

## Quality Assurance Checklist

Before generating prompts, verify:

### Character Description:
- [ ] LoRA trigger present (JRUMLV woman / HSCEIA man)
- [ ] "lean athletic build" included
- [ ] "form-fitting" modifier on tactical gear
- [ ] Specific clothing details (MultiCam camo, olive shirt, muted grays)
- [ ] Daniel has "white hair" (NOT dark hair!)
- [ ] Cat has "long-sleeved shirt" (NOT sleeveless)
- [ ] Weapon positions in ACTION section for Daniel (not character description)

### Facial Elements:
- [ ] Facial expression included (alert, focused, etc.)
- [ ] Face lighting extracted from beat narrative (not generic fallback when beat has lighting)
- [ ] If beat has no lighting, use atmosphere fallback
- [ ] YOLO segment at end of prompt

### Lighting Verification:
- [ ] READ beat narrative for ANY lighting keywords FIRST
- [ ] Extract sources, colors, qualities, effects, time-of-day
- [ ] Face lighting uses SAME descriptive words from beat
- [ ] No contradictions (e.g., beat says green, face says red)
- [ ] Only use location fallback if beat has NO lighting details

### Settings:
- [ ] cfgscale: 1 (NOT 7!)
- [ ] fluxguidancescale: 3.5
- [ ] seed: -1 for batches
- [ ] Correct resolution (1088x1920 or 1920x1088)

## Common Mistakes to Avoid

1. **Lighting Color Mismatch**: Beat says "eerie green light" but face lighting says "flickering red light"

2. **Missing Dynamic Elements**: Beat says "bright muzzle flashes through heavy gunsmoke" but face lighting is generic "dramatic tactical lighting"

3. **Generic When Beat Has Details**: Beat has specific lighting details but face lighting is generic

4. **Weapon in Character Description**: Including "M4 carbine slung across chest" in Daniel's character description instead of action section

5. **Skipping Beat Narrative**: Using location fallback when beat actually contains lighting details

## Examples

### Example 1: Beat with Lighting Details
```
Beat: "Cat moves through CDC archive bathed in eerie green light from backup generators"

Result: 
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), alert expression on her face, moving through CDC archive bathed in eerie green light from backup generators. eerie green light on face, sickly green illumination, Dramatic rim light, desaturated color grade, shallow depth of field. <segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

### Example 2: Beat without Lighting Details  
```
Beat: "Daniel moves through damaged tactical facility" (no lighting mentioned)

Result:
medium shot of a HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), focused combat readiness on his face, advancing with M4 carbine at ready position through damaged tactical facility. dramatic tactical lighting on face, high contrast face shadows, directional harsh light on features, Dramatic rim light, desaturated color grade, shallow depth of field. <segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

## Troubleshooting Guide

### Issue: Lighting Doesn't Match Beat Narrative
**Cause**: Using location fallback instead of extracting from beat narrative
**Solution**: Always check beat for lighting keywords first, only use fallback if beat has zero lighting details

### Issue: Daniel's Weapon Position is Static
**Cause**: Including weapon in character description
**Solution**: Move weapon positioning to action section based on beat context

### Issue: Generic Lighting When Beat Has Details
**Cause**: Not extracting lighting from beat narrative
**Solution**: Use the beatNarrativeProcessor service to extract and build lighting from beat text

These updates implement the Version 2.0 Production Standards based on 135 tested prompts and should significantly improve the contextual accuracy and visual quality of generated images.