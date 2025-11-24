# Updated Prompt Construction Standards for StoryArt

Based on the latest production-tested standards from `Latest_Prompt_Suggestions.md`, this document outlines the updated approach for prompt construction in StoryArt.

## Key Changes from Previous Standards

### 1. Facial Expressions Instead of Heavy Camera Direction
- **OLD**: `(((facing camera:2.0)))`
- **NEW**: `"alert, tactical expression on her face"`

### 2. Atmosphere-Specific Face Lighting (Always Include)
- **Tactical scenes**: `"dramatic tactical lighting on face, high contrast face shadows"`
- **Medical scenes**: `"harsh medical lighting on face, stark white face illumination"`

### 3. Character Physique Emphasis
- **Always include**: `"lean athletic build, toned arms"`
- **Prevents bulky appearance** from tactical gear

### 4. FLUX Model Settings
- `cfgscale: 1` (NOT 7!)
- `fluxguidancescale: 3.5`
- `steps: 20` (production standard from tested prompts)

## Prompt Structure Template

### New Standard Structure
```
[shot_type] of [character_description], [facial_expression], [action_verb] [environment_description]. [lighting_atmosphere]. [face_lighting]. [composition_directives]. <yolo_segments>
```

### Shot Type Requirements
- Always start with shot type: `"medium shot of a"`, `"wide shot of a"`, `"close-up of a"`
- **DO NOT** start with weighted positioning (old method)

### Character Description Standards
For Cat Mitchell (JRUMLV woman LoRA):
```
JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun)
```

For Daniel O'Brien (HSCEIA man LoRA):
```
HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, M4 carbine slung across chest, strong jaw, high cheekbones, storm-gray eyes)
```

### Facial Expression Integration
Always include facial expression AFTER character description:
- **Tactical/Alert Contexts**: `alert, tactical expression on her face`, `focused combat readiness on his face`
- **Medical/Analytical Contexts**: `concentrated medical expression on her face`
- **Emotional Contexts**: `vulnerable expression on her face`

### Face Lighting by Atmosphere Type
- **Tactical/Danger Scenes**: `dramatic tactical lighting on face, high contrast face shadows, directional harsh light on features`
- **Medical Facility Scenes**: `harsh medical lighting on face, stark white face illumination, clinical light on features`
- **Emergency Lights Scenes**: `flickering emergency light on face, red emergency illumination on features, harsh flash lighting`

### Composition Directives (Standard Set)
Always include: `Dramatic rim light, desaturated color grade, shallow depth of field`

### YOLO Face Segments
- **Single character**: `<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>`
- **Two characters**: Include for each face with engaging commands
- **Two-character example**: `<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> engaging viewer, looking at camera`

### Negative Prompt (Production Standard)
```
blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful
colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy,
artificial appearance, oversaturated, childish style, background characters, faces
hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright
cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive
special effects
```

## Implementation in Services

### Updated Parameters
- **Steps**: Changed from 40 to 20 (production standard)
- **Cfgscale**: Remains 1 for FLUX models
- **Added**: `fluxguidancescale: 3.5` for FLUX-specific guidance

### Service Updates
1. **promptGenerationService.ts** - Updated system instruction and post-processing
2. **qwenPromptService.ts** - Updated system instruction and post-processing

## Two-Character Scene Standards

For two-character scenes, use:
```
wide shot of ((both facing camera:1.7)), ((engaging viewer:1.5)), [Character 1] and [Character 2] in [environment].
[FACE_LIGHTING], [composition directives].
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> [Character 1], engaging viewer, looking at camera
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> [Character 2], engaging viewer, looking at camera
```

## Resolutions
- **Vertical (9:16)**: 1088x1920 
- **Cinematic (16:9)**: 1920x1088
- Both divisible by 64 as required by FLUX models

## Common Mistakes to Avoid

1. **Bulky character appearance**: Missing "lean athletic build, toned arms"
2. **Wrong hair color**: Daniel should have "white hair" not "dark hair"
3. **Sleeveless appearance**: Include "fitted olive long-sleeved shirt" 
4. **Artifacts/Poor quality**: Using cfgscale=7 instead of cfgscale=1 for FLUX
5. **Camera direction**: Starting with weighted positioning instead of shot type

These updated standards have been tested across 135 prompts with superior visual results and should be used for all new prompt generation in StoryArt.