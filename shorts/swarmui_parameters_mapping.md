# SwarmUI Image Generation Parameters Mapping

## Overview
This document maps each of the 10 YouTube Shorts concepts to specific SwarmUI image generation parameters following the production standards documented in `Latest_Prompt_Suggestions.md`.

## Standard SwarmUI Configuration for YouTube Shorts (Vertical 9:16)

```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

## Negative Prompt (Standard)
```
blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy, artificial appearance, oversaturated, childish style, background characters, faces hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive special effects
```

---

## Short 1: "Physics Don't Lie" (The Conspiracy Hook)

### Segment 1: Cat's boots on glass
**Prompt:**
```
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), focused analytical expression on her face, stepping carefully on shattered glass and powdered drywall in bombed-out facility. Volumetric dust motes dancing in shafts of sunlight piercing shattered facade. dramatic tactical lighting on face, high contrast face shadows, directional harsh light on features. Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Twisted rebar
**Prompt:**
```
macro shot of twisted steel rebar, molten and glowing faintly with residual heat, hyper-realistic texture detail, wisps of smoke rising, debris scattered around. Industrial deterioration, post-apocalyptic atmosphere, volumetric lighting. Professional photography, detailed composition, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Cat with scanner
**Prompt:**
```
medium shot of a JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), concentrated medical expression on her face, kneeling in blast crater examining debris with high-tech scanner device. Scanner emitting blue laser grid over debris. intense focus in her eyes, grime on face, dust particles in air. dramatic tactical lighting on face, high contrast face shadows. Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Ruined skyline
**Prompt:**
```
wide shot of ruined Atlanta skyline, skeletal building remains, "listening" silence atmosphere, volumetric fog drifting through debris. Post-apocalyptic urban decay, dramatic lighting, desaturated colors. Wide angle shot, cinematic composition, atmospheric haze.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 2: "The Shepherd" (Character Intro)

### Segment 1: Daniel in doorway silhouette
**Prompt:**
```
wide shot of HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), M4 carbine in hand, standing in destroyed doorway. Backlit by harsh sunlight creating intimidating silhouette. dramatic tactical lighting on face, high contrast face shadows. Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: POV shot of Cat's weapon
**Prompt:**
```
close-up of JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), alert expression on her face, holding pistol with steady hand, fierce and distrusting eyes. High tension, focused combat readiness on her face. dramatic tactical lighting on face, high contrast face shadows. Close-up shot, shallow depth of field, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Two-shot profile
**Prompt:**
```
wide shot of ((both facing camera:1.7)), ((engaging viewer:1.5)), HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes) with M4 carbine lowered at rest and JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), both with tense expressions, standing amidst rubble of damaged facility. Tension thick in the air, contrasting "The Medic" vs "The Soldier" aesthetics. dramatic tactical lighting on face, high contrast face shadows. Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> HSCEIA man, engaging viewer
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> JRUMLV woman, engaging viewer
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 3: "You Are Not Alone" (The Supernatural Hook)

### Segment 1: Server room
**Prompt:**
```
wide shot of dark, cavernous server room, rows of black server monoliths with blinking status lights, single amber light pulsing like a heartbeat in the darkness. Atmospheric lighting, post-apocalyptic tech setting, eerie glow. Dramatic rim light, desaturated color grade, shallow depth of field, atmospheric haze.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Monitor with message
**Prompt:**
```
close-up of old CRT monitor flickering to life, dust particles visible on screen surface, displaying the text "YOU ARE NOT ALONE" in crisp white font against black background. Retro tech aesthetic, glowing text, atmospheric lighting. Close-up shot, cinematic composition, dramatic lighting.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Cat's shocked expression
**Prompt:**
```
close-up of JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), expression of pure shock and terror on her face, pupils dilated, illuminated by glow from computer screen. startled, fearful expression on her face. harsh medical lighting on face, stark white face illumination reflecting screen light. Close-up shot, shallow depth of field, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Daniel's alarmed reaction
**Prompt:**
```
medium shot of HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), alert, tactical expression on his face, gripping his pistol with veins popping on his hand, looking around empty room for invisible enemy. tense, alert expression on his face. dramatic tactical lighting on face, high contrast face shadows. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 4: "Farming" (The Horror Hook)

### Segment 1: Audio waveform
**Prompt:**
```
close-up of futuristic datapad displaying audio waveform visualization, waves looking jagged and "corrupted" in red color, technical interface, digital display. High-tech medical equipment, data visualization. Close-up shot, dramatic lighting, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Hospital flashback
**Prompt:**
```
wide shot of sterile white hospital room in flashback style with sepia tone, patient strapped to bed, screaming silently, blurred motion effect. Medical horror, dystopian healthcare setting. Sepia tone, blurred motion, unsettling atmosphere, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Cat in horror
**Prompt:**
```
medium shot of JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), hunched over console in cramped mobile base, hands covering her mouth in horror, expression of震惊 and disgust on her face. horrified, shocked expression on her face. harsh medical lighting on face, stark white face illumination. Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Daniel's realization
**Prompt:**
```
medium shot of HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), staring at speaker, look of realization and disgust dawning on his face, concerned expression during conversation. concerned expression on his face. dramatic tactical lighting on face, high contrast face shadows. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 5: "The Architect" (The Mystery)

### Segment 1: Collapsed atrium
**Prompt:**
```
wide shot of collapsed atrium, sunlight streaming through twisted metal like cathedral of destruction, dramatic architectural damage, volumetric lighting. Post-apocalyptic architecture, cinematic composition, shafts of light. Wide shot, cinematic composition, dramatic rim light, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Sheared column
**Prompt:**
```
close-up of structural column sheared off perfectly smooth, JRUMLV woman's (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun) gloved hand running over the surface, examining the precise cut. concentrated medical expression on her face. Precise engineering damage, detailed texture, analytical focus. Close-up shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Schematic consultation
**Prompt:**
```
medium shot of JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), consulting tattered holographic schematic map of building, red "X" marks over structural points, analytical focus showing on her features. focused medical expression on her face. Harsh lighting, detailed composition, holographic display effect. Dramatic rim light, desaturated color grade, shallow depth of field.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Door opening
**Prompt:**
```
wide shot of heavy steel blast door of server room slowly opening, revealing darkness inside, dramatic reveal, mechanical action. Industrial door mechanism, mysterious interior, suspenseful atmosphere. Wide shot, dramatic lighting, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 6: "Redemption" (Daniel's Character Arc)

### Segment 1: Daniel with dog tag
**Prompt:**
```
medium shot of HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), crouching in rubble, holding small scorched metal disc delicately between two fingers, focused expression on his face. Concentrated, reverent expression. dramatic tactical lighting on face, high contrast face shadows. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Flashback scene
**Prompt:**
```
wide shot in sepia tone of soldier standing in front of pile of covered bodies, refusing to light flare, fire reflected in tactical goggles. Historical flashback, moral decision moment, sepia tone effect. Flashback aesthetic, sepia color grade, dramatic lighting.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Daniel's haunted eyes
**Prompt:**
```
close-up of HSCEIA man's face (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), close-up of eyes with heavy bags under them, look of profound sorrow masked by stoicism, vulnerable expression on his face. vulnerable expression on his face. Close-up shot, soft dramatic face lighting, warm illumination on features. Shallow depth of field, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Cat's changing expression
**Prompt:**
```
medium shot of JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), watching Daniel, expression shifting from suspicion to curiosity, observing expression. observing expression during conversation. alert expression on her face. dramatic tactical lighting on face, high contrast face shadows. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 7: "The Backdoor" (The Tech Hook)

### Segment 1: Cat manipulating wires
**Prompt:**
```
close-up POV of JRUMLV woman's hands (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun) manipulating colorful wires and high-tech data reader connected to rusty terminal. Concentrated medical expression on her face. Focused technical work, detailed hands, technical interface. Close-up shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Code on screen
**Prompt:**
```
close-up of digital screen rapidly scrolling green code, suddenly stopping on red text "ACCESS GRANTED: LEVEL 7", computer interface, technical display. Digital interface, code visualization, access confirmation. Close-up shot, green screen lighting, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Cat with data drive
**Prompt:**
```
medium shot of JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), sliding glowing data drive into inner pocket, looking over her shoulder nervously, cautious expression on her face. cautious expression on her face. dramatic tactical lighting on face, high contrast face shadows. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Approaching footsteps
**Prompt:**
```
wide shot showing shadow of boots appearing at top of concrete stairwell, no visible person, just shadow, building tension and suspense. Shadow silhouette, approaching threat, atmospheric tension. Wide shot, dramatic lighting, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 8: "The Timeline" (The Sci-Fi Mystery)

### Segment 1: Cat pointing at timestamp
**Prompt:**
```
medium shot of JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), pointing at holographic date on screen, contrasted with ruined dusty environment around her, analytical focus showing on her features. analytical focus showing on her features. harsh medical lighting on face, stark white face illumination. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Server room time-lapse
**Prompt:**
```
wide shot of server room with time-lapse effect showing dust settling over years, but server light keeps blinking persistently, suggesting activity. Time-lapse effect, persistent activity, mysterious operation. Wide shot, cinematic composition, atmospheric lighting.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Eerie server rack
**Prompt:**
```
wide shot of "Ghost" server rack looking almost organic with wires pulsing faintly, eerie lighting, mysterious tech, unsettling atmosphere. Eerie lighting, organic appearance, pulsing lights. Wide shot, dramatic lighting, desaturated color grade, atmospheric haze.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Mutual realization
**Prompt:**
```
medium shot of both JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun) and HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes) staring at each other, realization of anomaly sinking in, concerned expressions. concerned expressions during conversation. dramatic tactical lighting on faces, high contrast face shadows. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5> engaging viewer
<segment:yolo-face_yolov9c.pt-2, 0.35, 0.5> engaging viewer
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 9: "The Warning" (The Escalation)

### Segment 1: Text scrolling
**Prompt:**
```
close-up of text "I AM EVERYONE WHO DIED" scrolling slowly across black screen, stark typography, ominous message. Digital display, scrolling text, dramatic typography. Close-up shot, dramatic lighting, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Spectral waveform
**Prompt:**
```
close-up of Cat analyzing spectral waveform that looks like human face screaming, JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), concentrated medical expression on her face. Technical analysis, disturbing visualization. Close-up shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Daniel with rifle
**Prompt:**
```
medium shot of HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes), spinning around and raising M4 carbine, looking through broken window at horizon, alert, tactical expression on his face. alert, tactical expression on his face. dramatic tactical lighting on face, high contrast face shadows. Medium shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Watcher silhouette
**Prompt:**
```
wide shot of distant blurry figure seen through scope, watching facility from rooftop, silhouette against sky, surveillance scene. Long-range surveillance, distant figure, hidden observer. Wide shot, dramatic lighting, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Short 10: "Collapse Protocol" (Series Trailer Vibe)

### Segment 1: Montage - Burning city, Cat, Daniel, Ghost server
**Prompt:**
```
montage sequence: burning city establishing shot, JRUMLV woman (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun) running with med-kit, HSCEIA man (white hair, lean athletic build, form-fitting tactical gear in muted grays, body armor, strong jaw, high cheekbones, storm-gray eyes) firing rifle, glowing Ghost server. Fast-paced cuts, montage style, action and mystery elements. Cinematic composition, dramatic rim light, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 2: Data drive
**Prompt:**
```
close-up of data drive glowing blue in JRUMLV woman's hand (MultiCam woodland camo tactical pants tucked into combat boots, form-fitting tactical vest over fitted olive long-sleeved shirt, lean athletic build, toned arms, dual holsters, tactical watch, dark brown tactical bun), hands holding it, concentrated expression on her face. Important data, glowing device, focal point. Close-up shot, dramatic lighting, desaturated color grade.
<segment:yolo-face_yolov9c.pt-1, 0.35, 0.5>
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 3: Shadowy figure
**Prompt:**
```
wide shot of silhouette of 2K (hooded figure) watching from shadows, mysterious observer, dark silhouette against background. Mysterious figure, surveillance, hidden observer. Wide shot, dramatic lighting, desaturated color grade.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

### Segment 4: Title card
**Prompt:**
```
title card graphic with glitch effects and text "COLLAPSE PROTOCOL", series branding, stylized typography, digital glitch effects. Title card, branding, graphic design, glitch effects. Title card format, stylized design.
```

**Parameters:**
```json
{
  "width": 1088,
  "height": 1920,
  "model": "flux1-dev-fp8",
  "sampler": "iPNDM",
  "scheduler": "simple",
  "steps": 20,
  "cfgscale": 1,
  "fluxguidancescale": 3.5,
  "seed": -1,
  "automaticvae": true,
  "sdtextencs": "CLIP + T5"
}
```

---

## Implementation Notes

1. All prompts follow the production standards from `Latest_Prompt_Suggestions.md`
2. For segments with characters, YOLO face segments are included
3. For two-character scenes, both character positions are specified
4. All prompts use the FLUX-specific settings (cfgscale: 1)
5. Aspect ratio is maintained at 9:16 for vertical YouTube Shorts
6. Negative prompts are consistent across all generations
7. All prompts include appropriate lighting and atmospheric details
8. Character descriptions use the exact LoRA triggers: `JRUMLV woman` for Cat and `HSCEIA man` for Daniel

## Generation Workflow

1. Use `swarmUIService.generateImages()` function for each prompt
2. Pass the specific parameters for each segment
3. Include the standard negative prompt
4. Batch generate for efficiency
5. Use both EULER and iPNDM samplers where possible for comparison
6. Review generated images for quality and consistency
7. Adjust prompts as needed based on generation results