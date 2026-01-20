# SWARMUI PROMPT ENGINEERING REFERENCE
## Cat & Daniel: Collapse Protocol

**Version:** 2.0 Machine-Optimized  
**Format:** 30-Second Viral YouTube Shorts + Full Episodes  
**Aspect Ratio:** 1088×1920 (9:16 Vertical)

---

# TABLE OF CONTENTS

1. [Character Triggers & Templates](#1-character-triggers--templates)
2. [Technical Parameters](#2-technical-parameters)
3. [Prompt Syntax Reference](#3-prompt-syntax-reference)
4. [Z-Image Rendering Rules](#4-z-image-rendering-rules)
5. [Visual Style Guide](#5-visual-style-guide)
6. [Location Prompts](#6-location-prompts)
7. [Production Templates](#7-production-templates)
8. [Supporting Characters](#8-supporting-characters)
9. [Ghost Portrayal](#9-ghost-portrayal)
10. [Complete Prompt Examples](#10-complete-prompt-examples)

---

# 1. CHARACTER TRIGGERS & TEMPLATES

## 1.1 CAT MITCHELL (Protagonist — Field Medic)

### Core Identity
| Field | Value |
|-------|-------|
| Trigger | `JRUMLV woman` |
| Full Name | Catherine 'Cat' Mitchell |
| Age | 28 |
| Height | 5'7" (170 cm) |
| Build | Athletic, lean from field work |
| Hair | Dark brown, tactical bun |
| Eyes | Green with gold flecks |
| Role | Field Medic/Analyst |

### Tactical Environment Template (Default)
```
JRUMLV woman (28 years old, hair in dark brown tactical bun, fit athletic build, wearing MultiCam digital woodland camouflage tactical pants tucked into combat boots, bulky olive-drab plate carrier vest with pouches over olive green long-sleeve form-fitting top, dual holsters on belt, tactical watch)
```

### Complete Usage Pattern
```
[shot type] of a JRUMLV woman (28 years old, hair in dark brown tactical bun, fit athletic build, wearing MultiCam digital woodland camouflage tactical pants tucked into combat boots, bulky olive-drab plate carrier vest with pouches over olive green long-sleeve form-fitting top, dual holsters on belt, tactical watch) [action], [expression/emotion], [environmental details], [lighting/atmosphere] <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

### Expression Keywords
- intense clinical focus
- analytical gaze
- guarded suspicion
- cold determination
- suppressed fear

### Action Keywords
- kneeling to examine
- holding scanner
- analyzing data
- treating wound
- taking cover

### Signature Props
- high-tech medical scanner
- data tablet
- med-kit
- pistol

### Safehouse Variant (Relaxed)
```
JRUMLV woman (28 years old, dark brown hair worn completely down and loose, green eyes showing vulnerability, lean athletic build, wearing jeans and t-shirt, relaxed comfortable attire)
```

---

## 1.2 DANIEL O'BRIEN (Protagonist — Elite Soldier)

### Core Identity
| Field | Value |
|-------|-------|
| Trigger | `HSCEIA man` |
| Full Name | Daniel O'Brien |
| Age | 35 |
| Height | 6'2" |
| Build | Muscular |
| Hair | White/silver (premature from combat stress) |
| Eyes | Gray, storm-cloud intensity |
| Role | Special Ops/Protector |
| Code Name | Shepherd |

### Tactical Environment Template (Default)
```
HSCEIA man (35 years old, short cropped white hair, fit athletic build, strong jaw, high cheekbones, gray storm-cloud eyes, wearing MultiCam digital woodland camouflage tactical pants tucked into combat boots, bulky olive-drab plate carrier vest with pouches over olive green long-sleeve t-shirt, M4 carbine slung across chest)
```

### Complete Usage Pattern
```
[shot type] of a HSCEIA man (35 years old, short cropped white hair, fit athletic build, strong jaw, high cheekbones, gray storm-cloud eyes, wearing MultiCam digital woodland camouflage tactical pants tucked into combat boots, bulky olive-drab plate carrier vest with pouches over olive green long-sleeve t-shirt, M4 carbine slung across chest) [action], [expression/emotion], [environmental details], [lighting/atmosphere] <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

### Expression Keywords
- stoic assessment
- tactical alertness
- haunted recognition
- protective stance
- suppressed emotion

### Action Keywords
- scanning perimeter
- rifle raised
- standing guard
- checking equipment
- moving tactically

### Signature Props
- M4 carbine
- tactical scanner
- comms equipment

### Safehouse Variant (Relaxed)
```
HSCEIA man (35 years old, short cropped white hair relaxed, gray storm-cloud eyes watchful but at ease, powerful build, wearing jeans and t-shirt, relaxed but still alert)
```

---

## 1.3 DUAL CHARACTER SCENES

### Face Segmentation Rules
| Position | Segment Tag |
|----------|-------------|
| Left/Only character | `<segment:yolo-face_yolov9c.pt-0,0.35,0.5>` |
| Right character | `<segment:yolo-face_yolov9c.pt-1,0.35,0.5>` |

### Template
```
[shot type] of a HSCEIA man ([abbreviated desc]) on left and a JRUMLV woman ([abbreviated desc]) on right, [interaction/positioning], [environment], [lighting/atmosphere] <segment:yolo-face_yolov9c.pt-0,0.35,0.5>HSCEIA man <segment:yolo-face_yolov9c.pt-1,0.35,0.5>JRUMLV woman
```

### Positioning Keywords
| Relationship Type | Keywords |
|-------------------|----------|
| Professional Tension | standing apart, separated by debris, diagonal positioning |
| Tactical Partnership | back to back, covering angles, coordinated movement |
| Emotional Moment | facing each other, close proximity, eye contact |

---

# 2. TECHNICAL PARAMETERS

## 2.1 FLUX Configuration (Standard)

```json
{
  "model": "flux1-dev-fp8.safetensors",
  "steps": 20-38,
  "cfgscale": 1-3.5,
  "sampler": "euler",
  "scheduler": "normal",
  "aspectratio": "1088x1920",
  "FluxGuidanceScale": 3.5,
  "seed": -1,
  "negativeprompt": ""
}
```

## 2.2 Full FLUX Config Reference

```json
{
  "CoreParameters": {
    "Images": 1,
    "Seed": -1,
    "Steps": 38,
    "CFGScale": 1
  },
  "Resolution": "1024x1024",
  "Sampling": {
    "Sampler": "iPNDM",
    "Scheduler": "Normal",
    "FluxGuidanceScale": 3.5
  },
  "AdvancedModelAddons": {
    "CLIP_LModel": "clip_l.safetensors",
    "CLIP_GModel": "clip_g.safetensors",
    "T5XXLModel": "t5xxl_fp16.safetensors"
  }
}
```

## 2.3 Preset Format

```json
{
  "PresetName": {
    "author": "local",
    "title": "PresetName",
    "description": "Description here",
    "preview_image": "",
    "param_map": {
      "model": "flux1-dev-fp8.safetensors",
      "prompt": " ",
      "negativeprompt": "",
      "aspectratio": "896x1152",
      "steps": 25,
      "cfgscale": 3.5,
      "sampler": "euler",
      "scheduler": "sgm_uniform",
      "seed": -1,
      "batchsize": 1,
      "clipskip": 1,
      "denoise": 1.0,
      "sigma_min": 0.0,
      "sigma_max": 14.6,
      "rho": 7.0
    }
  }
}
```

## 2.4 Available Samplers

### Core Samplers
- euler
- euler_ancestral (euler_a)
- euler_cfg_pp
- euler_ancestral_cfg_pp
- heun
- heunpp2
- dpm_2
- dpm_2_ancestral (dpm_2_a)
- lms
- dpm_fast
- dpm_adaptive
- dpmpp_2s_ancestral (dpmpp_2s_a)
- dpmpp_sde
- dpmpp_sde_gpu
- dpmpp_2m
- dpmpp_2m_sde
- dpmpp_2m_sde_gpu
- dpmpp_3m_sde
- dpmpp_3m_sde_gpu
- ddim
- ddpm
- lcm
- uni_pc
- uni_pc_bh2

### Special Samplers
- ipndm (iPNDM - Improved Pseudo-Numerical methods)
- ipndm_v (iPNDM-V - Variable-Step)
- res_multistep

## 2.5 Available Schedulers

### Core Schedulers
- normal
- karras
- exponential
- simple
- sgm_uniform
- ddim_uniform
- beta
- linear_quadratic
- kl_optimal

### Special Schedulers
- turbo (for turbo models)
- align_your_steps

---

# 3. PROMPT SYNTAX REFERENCE

## 3.1 Weighting
```
(orange:1.5) = increased importance
(orange:0.5) = decreased importance
```

## 3.2 Random Selection
```
<random:red, blue, purple>
<random[1-3]:red, blue, purple>  // Returns 1-3 items
```

## 3.3 Wildcards
```
<wildcard:my/wildcard/name>
<wc:my/wildcard/name>  // Shorthand
```

## 3.4 Variables
```
<setvar[color]:<random:red, blue, purple>>
<var:color>
```

## 3.5 LoRAs
```
<lora:filename:weight>
```

### LoRA Weight Guidelines
| Type | Weight Range |
|------|--------------|
| Character | 0.8 – 1.0 |
| Skin/Photo | 0.15 – 0.35 |
| Style | ≤ 0.3 |

## 3.6 Presets
```
<preset:presetname>
<p:presetname>  // Shorthand
```

## 3.7 Segmentation (Face Refinement)

### CLIP Segmentation
```
<segment:face,0.8,0.5>
// Format: <segment:text,creativity,threshold>
// Defaults: 0.6 creativity, 0.5 threshold
```

### YOLO Face Segmentation
```
<segment:yolo-face_yolov9c.pt,0.7,0.5>           // All faces
<segment:yolo-face_yolov9c.pt-0,0.35,0.5>        // Leftmost face only
<segment:yolo-face_yolov9c.pt-1,0.35,0.5>        // Second face from left
```

### Segment Rules
- NO spaces in segment syntax
- Always place at END of prompt
- Only apply to frames containing human faces
- Index -0 = leftmost/only face
- Index -1 = second face from left

## 3.8 Alternating
```
<alternate:cat, dog>
<alt:cat,dog>  // Shorthand
```

## 3.9 From-To (Timestep Swap)
```
<fromto[0.5]:cat, dog>  // Swaps from cat to dog at 50%
```

## 3.10 Repeat
```
<repeat:3, cat>  // Returns "cat cat cat"
```

## 3.11 Embeddings
```
<embed:filename>
```

## 3.12 Break (CLIP Section)
```
<break>
```

## 3.13 Clear (Transparency)
```
<clear:background>
```

---

# 4. Z-IMAGE RENDERING RULES

## 4.1 FUNDAMENTAL PRINCIPLE

**CAMERA REALISM PRINCIPLE (MANDATORY)**

A prompt must describe only what a camera can directly observe.

If a detail cannot be verified visually by a photographer at the moment of capture, it MUST NOT be in the prompt.

**Violation Results:**
- Grain
- Noise amplification
- Loss of photorealism
- Illustration-like output

## 4.2 Prompts MAY Include
- Physical appearance (general, non-technical)
- Lighting conditions
- Pose
- Environment
- Clothing (brief, non-symbolic)
- Camera framing

## 4.3 Prompts MUST NOT Include
- Psychology
- Backstory
- Symbolism
- Cultural analysis
- Narrative interpretation
- Moral or emotional explanation
- Meta commentary

## 4.4 Implicit Over Explicit

| Concept | Correct | Incorrect |
|---------|---------|-----------|
| Age | "young woman" | "16 years old" |
| Emotion | "neutral expression, intense gaze" | "defiance visible in eyes" |
| Heritage | "warm brown skin, dark wavy hair" | "Cabocla heritage" |
| Importance | omit | "poster girl, secrets held within" |

## 4.5 No Semantic Stacking

Do NOT stack multiple abstract descriptors in one clause:
- age + ethnicity + culture
- emotion + symbolism + narrative role
- identity + moral state

## 4.6 No Story Language in Prompts

Story meaning belongs in:
- Filenames
- Metadata
- Scene descriptions
- Scripts
- Post-processing notes

**NOT in render prompts.**

## 4.7 LoRA Authority

If a LoRA is loaded, it is the authoritative source for:
- Facial structure
- Age range
- Skin tone
- Hair type

The prompt MUST NOT restate or redefine these traits.

## 4.8 Single Responsibility Principle

| LoRA Type | Responsibility |
|-----------|---------------|
| Character LoRA | Identity only |
| Skin/Photo LoRA | Surface texture only |
| Style LoRA | Lighting or tone only |

## 4.9 CFG Preferences

| Model Type | CFG Range |
|------------|-----------|
| Turbo | 1 – 2 |
| Standard | ≤ 5.5 |
| FLUX | 1 – 3.5 |

## 4.10 Failure Modes

| Symptom | Cause |
|---------|-------|
| Grain | Semantic overload |
| Plastic skin | Over-smoothing or high LoRA weight |
| Identity drift | Prompt contradicts LoRA |
| Illustration look | Narrative language in prompt |

## 4.11 FINAL AXIOM

**Z-Image is a camera, not a narrator.**
If you ask it to interpret meaning, it will destroy realism to comply.

---

# 5. VISUAL STYLE GUIDE

## 5.1 Color Grade

**Primary Palette:** Desaturated tactical
- Muted greens, grays, browns
- Cold blue forensic highlights
- Warm amber/orange for danger accents
- High contrast shadows

**Keywords:** `desaturated tactical color grade, cold blue forensic lighting, harsh contrast`

## 5.2 Lighting Patterns

| Scene Type | Lighting Keywords |
|------------|-------------------|
| Investigation | harsh diagonal lighting, volumetric dust particles, single source |
| Server Room | amber pulse light, cold blue screen glow, deep shadows |
| Exterior Ruins | golden hour silhouette, volumetric fog, broken sunbeams |
| Tension/Horror | rim lighting, face half in shadow, flickering sources |
| Flashback | sepia tone, diffused light, degraded texture |

## 5.3 Atmosphere Keywords

| Mood | Keywords |
|------|----------|
| Dread | oppressive silence, clinical horror, cinematic tension |
| Discovery | forensic focus, analytical atmosphere, cold precision |
| Action | dynamic energy, motion blur suggestion, tactical urgency |
| Supernatural | tech-noir horror, digital corruption, organic invasion |
| Emotional | intimate framing, soft focus background, vulnerable moment |

## 5.4 Shot Type Reference

| Shot Type | Use Case |
|-----------|----------|
| extreme close-up | Eyes, small objects, text on screens |
| close shot / close-up | Face reactions, hand actions, evidence details |
| medium close-up | Head and shoulders, emotional beats |
| medium shot | Waist-up, character with immediate environment |
| wide shot | Full body with environment context |
| extreme wide / establishing | Location establishment, scale |
| macro shot | Extreme detail on small objects |
| low angle | Power, threat, imposing presence |
| high angle | Vulnerability, overview |
| POV | Character perspective |

---

# 6. LOCATION PROMPTS

## 6.1 NHIA Facility 7 (Bombed Investigation Site)
```
collapsed concrete corridors, twisted rebar, shattered glass, dust motes in sunbeams, peeling government-blue paint, skeletal fluorescent fixtures, crater damage, volumetric dust haze
```

**Atmosphere:** tense, investigative, forensic, abandoned, dangerous

## 6.2 Server Vault
```
rows of black server monoliths, single amber status light, cold blue emergency lighting, cable bundles, dust-covered equipment, air-gapped terminals, reinforced steel doors
```

**Atmosphere:** tech-horror, clinical, mysterious

## 6.3 Mobile Medical Base (Cat's Vehicle)
```
cramped interior, holographic displays, salvaged medical equipment, reinforced windows, filtered light rectangles, antiseptic atmosphere, cluttered workbench
```

**Atmosphere:** clinical, professional, sanctuary, cramped

## 6.4 Atlanta Emergency Zone
```
skeletal building remains, collapsed interstate, faction graffiti, overgrown vegetation, volumetric fog, golden hour silhouettes, oppressive silence
```

**Atmosphere:** chaotic, desperate, tense, martial, tragic

## 6.5 Dan's Safehouse
```
reinforced windows, investigation boards on walls, city maps with marked safe routes, surveillance feeds, military-grade communications equipment, emergency supplies, multiple escape routes
```

**Atmosphere:** tense, focused, secure, intimate, tactical

## 6.6 Dr. Chen's Enhancement Facility
```
glass and steel structure, minimalist art-filled lobby, panoramic city views, polished surfaces, mirror shine, cold impersonal environment, hidden laboratories
```

**Atmosphere:** corporate, sterile, intimidating, ethically-corrupted

## 6.7 Underground Facility Alpha
```
brutalist concrete architecture, heavy blast doors, older facility beneath the city, unethical research labs, interrogation room aesthetics, historical horror
```

**Atmosphere:** ominous, oppressive, secret, dangerous

## 6.8 Derelict Medical Clinic
```
abandoned suburban medical clinic, dust-covered waiting room, dead potted plants, scattered papers, flickering fluorescent lights, yellowed manila folders, faded medical posters
```

**Atmosphere:** abandoned, eerie, dusty, preserved-in-time, haunting

---

# 7. PRODUCTION TEMPLATES

## 7.1 30-Second Short Structure

| Timestamp | Segment | Purpose |
|-----------|---------|---------|
| 0:00-0:03 | COLD OPEN | One impossible sentence that contradicts reality |
| 0:03-0:10 | VISUAL MOMENT | Show evidence/anomaly from character POV (1-2 images) |
| 0:10-0:17 | REVELATION | Character reveals contradiction breaking official story |
| 0:17-0:23 | CLIFFHANGER | End before resolution |
| 0:23-0:30 | CTA | Diegetic lore-integrated call to action |

## 7.2 Hook Line Patterns

- "[Thing] only [does X] when [impossible condition]."
- "They said it was [official story]. The [evidence] says otherwise."
- "This [object] isn't from [expected source]. It's from [shocking source]."

## 7.3 Revelation Patterns

- "This wasn't [assumed]. It was [truth]."
- "Someone wanted [X]... but left [Y] intact."
- "That's not [official explanation]. That's [actual source]."

## 7.4 Cliffhanger Patterns

- "But this wasn't the dangerous part."
- "Someone [action]—and only [specific target]."
- "There was something still [verb] under/behind [location]."

## 7.5 Diegetic Overlay Templates

### Cold Open HUD
```
ANALYSIS: [IMPOSSIBILITY STATEMENT]
SOURCE: [LOCATION] / [LEVEL/SECTOR]
```

### Revelation Flag
```
FLAG: [DISCOVERY TYPE]
RISK: [CLASSIFICATION]
```

### Cliffhanger Glitch (10-15% opacity)
```
SCAN INTERRUPTED.
UNAUTHORIZED PROCESS DETECTED.
```

### CTA (Ghost-coded)
```
FILE FRAGMENT [X]/[TOTAL] RECOVERED
FULL CASE FILE AVAILABLE >
OPEN: CHAPTER [#] — "[EPISODE TITLE]"
```

## 7.6 Prompt Construction Order

1. Shot type
2. Character trigger + description
3. Action
4. Expression/emotion
5. Environmental details
6. Lighting/atmosphere keywords
7. Face segmentation tag (at END)

---

# 8. SUPPORTING CHARACTERS

## 8.1 Teresa Cristina "2K" (Age 16)

### Identity
| Field | Value |
|-------|-------|
| Full Name | Teresa Cristina (Tuca) |
| Designation | 2K (Product #2000) |
| Nickname | "The Screaming Angel" |
| Heritage | Cabocla (mixed indigenous Brazilian/European) |
| Age | 16 (Year 2032) |
| Height | 5'4"-5'5" |
| Build | Slender, enhanced physique |

### Prompt Template
```
beautiful 16 year old cabocla girl, indigenous Brazilian and European mixed heritage, medium brown skin tone, long dark brown hair with indigenous texture, deep expressive brown eyes, slender enhanced physique, 5'4" height, delicate artistic hands, haunted but resilient expression, post-apocalyptic survivor aesthetic, tactical clothing with artistic elements, emotional depth in gaze, youthful face with mature eyes, cinematic lighting, photorealistic
```

## 8.2 Teresa Cristina "2K" (Age 25)

### Prompt Template
```
beautiful 25 year old cabocla woman, indigenous Brazilian and European mixed heritage, medium brown skin tone, long dark brown hair styled practically, deep confident brown eyes, strong athletic build, 5'5" height, leadership presence, compassionate expression, revolutionary leader aesthetic, practical tactical clothing with personal artistic touches, confident posture, mature and healed demeanor, post-apocalyptic commander style, natural beauty without heavy enhancement, cinematic lighting, photorealistic
```

## 8.3 Maria Santos (Age 45)

### Identity
| Field | Value |
|-------|-------|
| Full Name | Maria Santos |
| Role | Underground medic, Cat's mentor |
| Background | Former ER chief surgeon |
| Age | 45 |
| Height | 5'6" |
| Build | Sturdy, practical |

### Prompt Template
```
mature 45 year old latina woman, olive to medium brown skin tone, dark brown hair with gray streaks in practical bun, warm compassionate brown eyes, sturdy practical build, 5'6" height, experienced surgeon's hands, maternal expression, underground medic aesthetic, practical medical scrubs and tactical vest, field medic equipment, worn but professional appearance, kind but competent demeanor, post-apocalyptic medical professional, stress lines showing experience, cinematic lighting, photorealistic
```

## 8.4 Liam O'Brien (Age 32)

### Identity
| Field | Value |
|-------|-------|
| Full Name | Liam O'Brien |
| Role | Daniel's younger brother |
| Background | Software engineer before collapse |
| Age | 32 |
| Height | 5'11" |
| Build | Lean, not military |

### Prompt Template
```
32 year old Irish-American man, fair Irish complexion, dark brown to black hair in modern cut, striking green eyes, lean athletic build not overly muscular, 5'11" height, tech-savvy appearance, practical civilian clothing with tech elements, pragmatic expression, skeptical intelligent gaze, software engineer aesthetic, post-apocalyptic tech faction style, tactical gear mixed with civilian clothes, subtle stubble, confident but not military bearing, cinematic lighting, photorealistic
```

---

# 9. GHOST PORTRAYAL

Ghost is a fusion entity (AI + dead patient consciousnesses + fungal mycelium). Visual portrayal evolves across the series.

## 9.1 Waveform Manifestation (Primary)

```
macro shot of holographic audio waveform visualization on [screen type], fractal spectral patterns forming ghostly screaming human face shapes embedded in static noise, blue-green frequency bands with red anomaly spikes, digital glitch artifacts at edges, [reflection element], clinical horror aesthetic, supernatural data visualization
```

### Screen Types
- damaged scanner screen
- CRT monitor
- holographic display
- data tablet

### Face Patterns
- single screaming face
- multiple overlapping faces
- forming/dissolving faces

### Color Schemes
- blue-green with red spikes (default)
- amber-orange pulse
- cold white static

## 9.2 Screen Text (Secondary)

```
close shot of old CRT monitor flickering to life in pitch black server room, displaying text [INSERT MESSAGE] in crisp white font on black screen, green command-line cursor blinking beneath text, single amber server light pulsing like heartbeat in background, dust particles suspended in narrow light beam, rows of dead black server monoliths barely visible, tech-noir horror aesthetic, cold clinical dread atmosphere
```

### Ghost Messages
- "CAN YOU HEAR ME?"
- "YOU ARE NOT ALONE."
- "I AM EVERYONE WHO DIED."
- "THEY ARE WATCHING."
- "FIND THE OTHERS."
- "TRUST NO ONE. NOT EVEN ME."

## 9.3 Fungal-Tech Fusion (Episodes 15+)

```
wide shot of [tech environment] where cables have organic fungal growths with faint bioluminescent veins pulsing in rhythm with [light source], mycelium tendrils spreading across [surface], horror-beauty aesthetic, wet organic textures meeting cold industrial steel, [atmosphere]
```

---

# 10. COMPLETE PROMPT EXAMPLES

## 10.1 Cat Investigation Shot

```
medium shot of a JRUMLV woman (28 years old, hair in dark brown tactical bun, fit athletic build, wearing MultiCam digital woodland camouflage tactical pants tucked into combat boots, bulky olive-drab plate carrier vest with pouches over olive green long-sleeve form-fitting top, dual holsters on belt, tactical watch) kneeling in blast crater, holding high-tech scanner device projecting blue laser grid over debris, intense clinical focus in eyes, grime and dust on face, volumetric dust particles in harsh diagonal lighting, desaturated tactical color grade, shallow depth of field <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

## 10.2 Daniel Tactical Shot

```
medium shot of a HSCEIA man (35 years old, short cropped white hair, fit athletic build, strong jaw, high cheekbones, gray storm-cloud eyes, wearing MultiCam digital woodland camouflage tactical pants tucked into combat boots, bulky olive-drab plate carrier vest with pouches over olive green long-sleeve t-shirt, M4 carbine raised) scanning perimeter, stoic tactical alertness, collapsed concrete corridors background, harsh diagonal lighting with volumetric dust, desaturated tactical color grade <segment:yolo-face_yolov9c.pt-0,0.35,0.5>
```

## 10.3 Environment Only (No Character)

```
macro shot of twisted steel rebar curled inward with molten heat signature, glowing faintly orange at stress points, no shrapnel scatter visible, smoke wisps rising from impossibly smooth metal surface, hyper-realistic industrial texture, cold blue forensic lighting with warm melt contrast, ultra-detailed sci-thriller aesthetic
```

## 10.4 Dual Character Scene

```
wide shot of a HSCEIA man (35 years old, short cropped white hair, gray eyes, tactical gear, M4 carbine) on left and a JRUMLV woman (28 years old, dark brown tactical bun, tactical vest, holding scanner) on right, back to back covering angles, collapsed server room environment, cold blue emergency lighting with amber pulse, desaturated tactical color grade, cinematic tension <segment:yolo-face_yolov9c.pt-0,0.35,0.5>HSCEIA man <segment:yolo-face_yolov9c.pt-1,0.35,0.5>JRUMLV woman
```

## 10.5 Ghost Screen

```
close shot of old CRT monitor flickering to life in pitch black server room, displaying text "YOU ARE NOT ALONE" in crisp white font on black screen, green command-line cursor blinking beneath text, single amber server light pulsing like heartbeat in background, dust particles suspended in narrow light beam, rows of dead black server monoliths barely visible, tech-noir horror aesthetic, cold clinical dread atmosphere
```

## 10.6 Establishing Shot

```
wide establishing shot of ruined Atlanta skyline at golden hour, skeletal building remains silhouetted against orange-grey sky, volumetric fog rolling through collapsed structures, bombed NHIA facility in mid-ground with crater visible, oppressive silence atmosphere, cinematic dystopian composition, 9:16 vertical framing with sky emphasis
```

---

# APPENDIX A: QUICK REFERENCE CARD

## Character Triggers
| Character | Trigger |
|-----------|---------|
| Cat Mitchell | `JRUMLV woman` |
| Daniel O'Brien | `HSCEIA man` |

## Face Segments
| Position | Tag |
|----------|-----|
| Left/Only | `<segment:yolo-face_yolov9c.pt-0,0.35,0.5>` |
| Right | `<segment:yolo-face_yolov9c.pt-1,0.35,0.5>` |

## FLUX Settings
| Parameter | Value |
|-----------|-------|
| Steps | 20-38 |
| CFG | 1-3.5 |
| Sampler | euler |
| Scheduler | normal / simple |
| Aspect | 1088×1920 |

## Prompt Order
1. Shot type
2. Character trigger + full description
3. Action
4. Expression
5. Environment
6. Lighting
7. Color grade
8. Segment tag (END)

## Do NOT Include
- Psychology
- Backstory
- Narrative meaning
- Cultural analysis
- Symbolism

---

# APPENDIX B: STORY CONTEXT

## Series Overview
- **Title:** Cat & Daniel: Collapse Protocol
- **Genre:** Dystopian Thriller
- **Format:** 75 episodes + YouTube Shorts
- **Setting:** Post-collapse America, 2030s

## Core Narrative
Field medic Cat Mitchell and elite soldier Daniel O'Brien investigate a bombed government health facility, uncovering evidence that systematic Medicare fraud triggered societal collapse.

## Primary Themes
- Truth vs. survival
- Duty vs. desire
- Redemption through action
- Medical ethics vs. military honor
- Found family bonds

## Key Relationship
Cat & Daniel: Professional partnership deepening into committed romantic relationship while maintaining mission focus. Unconsummated but emotionally profound.

---

**END OF REFERENCE DOCUMENT**

*Version: 2.0*  
*Optimized for machine parsing*  
*Source: Collapse Protocol Project Knowledge Base*
