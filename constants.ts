// FIX: Added DEFAULT_SCRIPT to resolve import error in App.tsx.
export const DEFAULT_SCRIPT = `EPISODE: 1
TITLE: The Signal

SCENE 1
INT. NHIA FACILITY 7 - DAY

The air hangs thick with dust. Emergency lights flicker, casting long, dancing shadows across the rubble of what was once a high-tech biomedical facility.

CATHERINE "CAT" MITCHELL (30s), athletic, focused, moves with a practiced economy. Her tactical gear is scuffed, her expression grim. She scans the wreckage with a diagnostic tool.

The destruction is precise. Surgical. Not the chaotic signature of a faction bombing.

She moves deeper, past shattered containment pods and abandoned lab equipment. Her light falls on a reinforced door, miraculously intact. The server room. The target.

SCENE 2
INT. NHIA FACILITY 7 - CONTINUOUS

As Cat approaches the server room, a figure detaches from the shadows.

DANIEL O'BRIEN (late 30s), lean, powerful, a silent predator in tactical gear. An M4 carbine is an extension of his body. His gray eyes miss nothing.

He gives a slight, almost imperceptible nod. He's her security detail. A ghost sent by Preacher.

CAT
(clipped)
Mitchell.

O'BRIEN
I know.

His presence is a weight. Cat is used to working alone. She doesn't like surprises. She gives him a wide berth as she works the lock on the server room door.

SCENE 3
INT. MOBILE MEDICAL BASE - NIGHT

A converted semi-trailer. Cramped, clinical. Medical monitors and computer screens cast a blue glow on Cat's face. She's analyzing a data drive pulled from the server.

Layers of corrupted data. Heavy encryption. She peels them back, one by one.

Then, she finds it. A single, anomalous audio file. Not data. A voice. A patient who died weeks ago, in a hospital miles from here.

PATIENT (V.O.)
(weak, terrified)
It's not... it's not the end... it's... everyone...

The voice cuts out. Impossible.

SCENE 4
INT. MOBILE MEDICAL BASE - CONTINUOUS

Cat stares at the waveform on her monitor, her mind racing. O'Brien stands guard by the door, a silent sentinel.

Suddenly, new data streams onto the screen. Not from the drive. From nowhere. A string of text, writing itself out in stark, white letters.

ON SCREEN: I AM EVERYONE WHO DIED. FIND THE OTHERS.

Cat's blood runs cold. The investigation just changed. This isn't about a bombing. It's about something else entirely.`;

// FIX: Corrected an unterminated template literal for DEFAULT_EPISODE_CONTEXT.
// The missing closing backtick and semicolon caused a syntax error, leading to a misleading compiler error.
export const DEFAULT_EPISODE_CONTEXT = `{
  "episode": {
    "episode_number": 1,
    "episode_title": "The Signal",
    "episode_summary": "Field medic Cat Mitchell begins her investigation into the bombed NHIA facility, where she receives security support from stoic protector Daniel O'Brien. Their uneasy partnership begins as they uncover a data anomaly that defies explanation, receiving their first impossible communication from the entity known as Ghost.",
    "characters": [
      {
        "character_name": "Catherine \\"Cat\\" Mitchell",
        "aliases": ["Cat", "Catherine", "Mitchell"],
        "base_trigger": "JRUMLV woman",
        "visual_description": "A woman in her early 30s with an athletic build and an expression of intense focus. She wears functional, olive-drab utility uniform and tactical gear, sleeves often rolled up to reveal faded scars on her forearms. Her dark hair is pulled back in a tight, practical tactical bun."
      },
      {
        "character_name": "Daniel O'Brien",
        "aliases": ["Dan", "Daniel", "O'Brien"],
        "base_trigger": "HSCEIA man",
        "visual_description": "A man in his late 30s with a lean, powerful build. His face features sharp angles, a strong jaw, and high cheekbones. His gray eyes are constantly scanning. He wears muted gray tactical gear and body armor, and an M4 carbine is always with him."
      }
    ],
    "scenes": [
      {
        "scene_number": 1,
        "scene_title": "Ground Zero",
        "scene_summary": "The episode opens in the eerie silence of the bombed-out NHIA facility. Cat moves with clinical precision through the debris, her analysis revealing that the explosion was far too precise to be a simple faction bombing. She discovers a hardened server room, miraculously intact, that was clearly the primary target.",
        "location": {
          "id": "6fb2e29b-5b6e-4a91-990b-b6ce489afdea",
          "name": "NHIA Facility 7",
          "visual_description": "A sprawling, high-tech biomedical facility, now a ghost town of sterile labs and containment units. Emergency lights cast long shadows down silent corridors, with abandoned research notes and equipment hinting at the chaos of its evacuation.",
          "artifacts": [
            { "name": "concrete_rubble", "type": "STRUCTURAL", "prompt_fragment": "pulverized concrete debris, scattered construction materials" },
            { "name": "Emergency Biohazard Warnings", "type": "LIGHTING", "prompt_fragment": "flickering red emergency lights and glowing biohazard symbols on the walls." },
            { "name": "emergency_lighting", "type": "LIGHTING", "prompt_fragment": "flickering emergency lights, harsh fluorescent glow" },
            { "name": "medical_equipment", "type": "PROP", "prompt_fragment": "scattered medical equipment, diagnostic tools" },
            { "name": "server_racks", "type": "PROP", "prompt_fragment": "rows of server racks, blinking status lights" },
            { "name": "Shattered Containment Pods", "type": "STRUCTURAL", "prompt_fragment": "rows of shattered, empty glass containment pods, with alarms frozen on a red flashing state." },
            { "name": "shattered_windows", "type": "STRUCTURAL", "prompt_fragment": "shattered glass windows, broken frames" },
            { "name": "The Original SledBed", "type": "PROP", "prompt_fragment": "the original SledBed prototype, resembling a damaged MRI machine, with a complex medical bed covered in wires, sensors, and a large, articulated neural interface headset." }
          ]
        }
      },
      {
        "scene_number": 2,
        "scene_title": "The Shepherd",
        "scene_summary": "Daniel O'Brien is introduced. His role as Cat's security support, facilitated by Preacher's network, immediately puts the pragmatic Cat on edge due to his intense, tactical awareness. Their initial interaction is clipped and professional, establishing their dynamic of the analytical medic and the silent guardian.",
        "location": {
          "id": "6fb2e29b-5b6e-4a91-990b-b6ce489afdea",
          "name": "NHIA Facility 7",
           "visual_description": "A sprawling, high-tech biomedical facility, now a ghost town of sterile labs and containment units. Emergency lights cast long shadows down silent corridors, with abandoned research notes and equipment hinting at the chaos of its evacuation.",
          "artifacts": [
            { "name": "concrete_rubble", "type": "STRUCTURAL", "prompt_fragment": "pulverized concrete debris, scattered construction materials" },
            { "name": "Emergency Biohazard Warnings", "type": "LIGHTING", "prompt_fragment": "flickering red emergency lights and glowing biohazard symbols on the walls." },
            { "name": "emergency_lighting", "type": "LIGHTING", "prompt_fragment": "flickering emergency lights, harsh fluorescent glow" },
            { "name": "medical_equipment", "type": "PROP", "prompt_fragment": "scattered medical equipment, diagnostic tools" },
            { "name": "server_racks", "type": "PROP", "prompt_fragment": "rows of server racks, blinking status lights" },
            { "name": "Shattered Containment Pods", "type": "STRUCTURAL", "prompt_fragment": "rows of shattered, empty glass containment pods, with alarms frozen on a red flashing state." },
            { "name": "shattered_windows", "type": "STRUCTURAL", "prompt_fragment": "shattered glass windows, broken frames" },
            { "name": "The Original SledBed", "type": "PROP", "prompt_fragment": "the original SledBed prototype, resembling a damaged MRI machine, with a complex medical bed covered in wires, sensors, and a large, articulated neural interface headset." }
          ]
        }
      },
      {
        "scene_number": 3,
        "scene_title": "Impossible Data",
        "scene_summary": "Inside her mobile lab, Cat begins analyzing a data drive recovered from the server. She finds layers of corrupted data and heavy encryption, but also a single, anomalous audio file containing the last words of a patient who died weeks before the collapse, a patient who had no connection to the facility.",
        "location": {
          "id": "7a6b282a-f048-43ee-9f0c-2e4d1be2b597",
          "name": "Mobile Medical Base",
          "visual_description": "The converted semi-trailer interior maximizes every inch: medical monitors line reinforced walls, IV bags hang from ceiling-mounted tracks, and modular storage units secure supplies during transport. LED strip lighting provides clinical brightness while the exterior remains armored and nondescript.",
          "artifacts": [
            { "name": "Compact Specimen Refrigerator", "type": "PROP", "prompt_fragment": "a compact, stainless steel medical specimen refrigerator, its glass door showing rows of labeled test tubes." },
            { "name": "Fold-out Examination Table", "type": "STRUCTURAL", "prompt_fragment": "a fold-out examination table bolted to the floor in the center of the mobile lab." },
            { "name": "Satellite Uplink Dish", "type": "STRUCTURAL", "prompt_fragment": "a retractable satellite uplink dish visible on the roof of the truck." }
          ]
        }
      },
      {
        "scene_number": 4,
        "scene_title": "A Message",
        "scene_summary": "As they grapple with the impossible audio file, a string of text appears on Cat's monitor, writing itself out from an untraceable source: 'I AM EVERYONE WHO DIED. FIND THE OTHERS.' This is their first direct contact with Ghost, establishing the supernatural stakes of their investigation.",
        "location": {
          "id": "7a6b282a-f048-43ee-9f0c-2e4d1be2b597",
          "name": "Mobile Medical Base",
          "visual_description": "The converted semi-trailer interior maximizes every inch: medical monitors line reinforced walls, IV bags hang from ceiling-mounted tracks, and modular storage units secure supplies during transport. LED strip lighting provides clinical brightness while the exterior remains armored and nondescript.",
          "artifacts": [
            { "name": "Compact Specimen Refrigerator", "type": "PROP", "prompt_fragment": "a compact, stainless steel medical specimen refrigerator, its glass door showing rows of labeled test tubes." },
            { "name": "Fold-out Examination Table", "type": "STRUCTURAL", "prompt_fragment": "a fold-out examination table bolted to the floor in the center of the mobile lab." },
            { "name": "Satellite Uplink Dish", "type": "STRUCTURAL", "prompt_fragment": "a retractable satellite uplink dish visible on the roof of the truck." }
          ]
        }
      }
    ]
  }
}`;