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
          "visual_description": "A sprawling CDC archive and data center, now a ghost town of sterile server rooms and data storage units. Emergency lights cast long shadows down silent corridors, with abandoned computer terminals and data drives hinting at the chaos of its evacuation.",
          "artifacts": [
            { "name": "concrete_rubble", "type": "STRUCTURAL", "prompt_fragment": "pulverized concrete debris, scattered construction materials" },
            { "name": "Emergency Biohazard Warnings", "type": "LIGHTING", "prompt_fragment": "flickering red emergency lights and glowing biohazard symbols on the walls." },
            { "name": "emergency_lighting", "type": "LIGHTING", "prompt_fragment": "flickering emergency lights, harsh fluorescent glow" },
            { "name": "data_terminals", "type": "PROP", "prompt_fragment": "scattered computer terminals, data input stations" },
            { "name": "server_racks", "type": "PROP", "prompt_fragment": "rows of server racks, blinking status lights" },
            { "name": "Shattered Data Storage Pods", "type": "STRUCTURAL", "prompt_fragment": "rows of shattered, empty data storage pods, with alarms frozen on a red flashing state." },
            { "name": "shattered_windows", "type": "STRUCTURAL", "prompt_fragment": "shattered glass windows, broken frames" },
            { "name": "The Original Data Interface", "type": "PROP", "prompt_fragment": "the original data interface prototype, resembling a damaged neural scanning station, with a complex data bed covered in wires, sensors, and a large, articulated neural interface headset." }
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
           "visual_description": "A sprawling CDC archive and data center, now a ghost town of sterile server rooms and data storage units. Emergency lights cast long shadows down silent corridors, with abandoned computer terminals and data drives hinting at the chaos of its evacuation.",
          "artifacts": [
            { "name": "concrete_rubble", "type": "STRUCTURAL", "prompt_fragment": "pulverized concrete debris, scattered construction materials" },
            { "name": "Emergency Biohazard Warnings", "type": "LIGHTING", "prompt_fragment": "flickering red emergency lights and glowing biohazard symbols on the walls." },
            { "name": "emergency_lighting", "type": "LIGHTING", "prompt_fragment": "flickering emergency lights, harsh fluorescent glow" },
            { "name": "data_terminals", "type": "PROP", "prompt_fragment": "scattered computer terminals, data input stations" },
            { "name": "server_racks", "type": "PROP", "prompt_fragment": "rows of server racks, blinking status lights" },
            { "name": "Shattered Data Storage Pods", "type": "STRUCTURAL", "prompt_fragment": "rows of shattered, empty data storage pods, with alarms frozen on a red flashing state." },
            { "name": "shattered_windows", "type": "STRUCTURAL", "prompt_fragment": "shattered glass windows, broken frames" },
            { "name": "The Original Data Interface", "type": "PROP", "prompt_fragment": "the original data interface prototype, resembling a damaged neural scanning station, with a complex data bed covered in wires, sensors, and a large, articulated neural interface headset." }
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

export const DEFAULT_SCRIPT = `EPISODE: 1
TITLE: The Signal

SCENE 1
INT. NHIA FACILITY 7 - DAY

Dust motes danced in the shafts of sunlight that pierced the shattered facade of the NHIA facility. Cat moved with a practiced economy, her boots crunching on pulverized concrete and twisted rebar. The air hung thick with the acrid smell of burnt plastic and the faint, metallic tang of old blood.

She wore a simple, olive-drab utility uniform, the sleeves rolled up to expose forearms crisscrossed with faded scars. A medical kit hung from her belt, a comforting weight against her hip. Her movements were precise, clinical, as if she were still in a sterile operating room instead of a bombed-out ruin.

Cat paused, her gaze sweeping across the devastation. This wasn't the chaotic aftermath of a faction squabble. This was surgical. The destruction was concentrated, focused. The supporting pillars were intact, but sections of the building were vaporized from the inside out. Whatever weapon was used, it was precise, designed to eliminate specific targets without collapsing the entire structure.

She knelt beside a crater in the floor, the edges blackened and fused. Carefully, she brushed away the debris, revealing a section of reinforced concrete. The concrete was pulverized, almost atomized, a clear sign of directed energy.

"Not just a bomb," she muttered to herself, her voice barely audible above the wind whistling through the broken windows. "Something…cleaner. More efficient." . “Damn,” she muttered, her voice muffled by the mask. “Thermobaric, maybe? Or something…cleaner.” “Directional. Concentrated beneath Load-Bearing Column Seven.” She traced the arc of scorch marks along the floor—too clean, too precise. This wasn’t chaos. This was surgery. A scalpel, not a sledgehammer

She rose, her eyes narrowing. A normal bombing would have been messy, indiscriminate. This was… deliberate. Someone wanted something destroyed, and they wanted it gone completely.

Cat pulled out a small, handheld scanner, its screen flickering to life. She ran it over the crater, the device emitting a series of rapid beeps. The readings spiked as she approached a particular spot.

She moved deeper into the facility, navigating the treacherous landscape of collapsed walls and dangling wires. The silence was unnerving, broken only by the occasional groan of shifting metal. The NHIA facility had been a mausoleum of bureaucracy even before the collapse. Now, it was a tomb.

She consulted the tattered floor plans she'd salvaged from a nearby outpost. According to the schematics, the primary data servers were located in the basement, in a hardened room designed to withstand EMP attacks. If anything survived, it would be there.

She moved deeper into the facility, her boots crunching on shards of glass and pulverized drywall. The silence was almost oppressive, broken only by the occasional creak of settling debris and the hum of her scanner. It was a silence that spoke volumes, a silence that whispered of lives lost and secrets buried.

The stench of decay hung heavy in the air, a nauseating mix of burnt plastic, rotting flesh, and the metallic tang of blood. Cat breathed through her mouth, trying to filter out the worst of it. She’d seen worse, countless times, but the scale of this…this was different. This felt…personal.

She passed what was once a reception area, the counter reduced to splintered fragments, the chairs overturned and broken. A faded sign, partially obscured by dust, read: "National Health Information Archive - Protecting Your Future." The irony was a bitter pill.

Then the stairwell, descending into cold stillness. The air grew heavier, laced with the sterile tang of ozone and something else—burnt plastic, maybe, or insulation. Cat moved down with measured steps, scanning each landing. Walls lined with shredded files, their ink smeared by fire suppression foam. Prescription logs. Insurance claim forms. Patient identifiers stamped with red DENIED. She paused, lifting a waterlogged sheet. A child’s name. Age six. Diagnosis: congenital immunodeficiency. Treatment code: TERMINATED – NON-PRIORITY CATEGORY.

She let the paper fall.

At the bottom, the corridor opened into a reinforced chamber. Blast doors, warped but intact. Security panels blackened, yet the locking mechanism held. Cat exhaled sharply. This was the target. Not the lobby. Not the records wing. This server vault.

The path to the basement was blocked by a mountain of rubble. Cat sighed, resigned to the task. She began to methodically clear the debris, her movements steady and purposeful. Each piece of concrete she moved was a step closer to the truth, a step closer to understanding why this place was targeted.

Hours passed. The sun climbed higher in the sky, casting long, distorted shadows across the ravaged landscape. Cat worked in silence, her muscles aching, her lungs burning with dust. Finally, after what felt like an eternity, she reached the bottom of the pile.

Before her stood a steel door, its surface scarred and blackened but remarkably intact. A heavy-duty keypad was embedded in the door, its buttons coated in a thick layer of grime.

She ran her hand over the keypad, feeling for any signs of forced entry. There were none. The door was locked, sealed.

Hope flickered in her chest. If the server room was still secure, the data inside might have survived. And if the data survived…

Cat reached into her medical kit and pulled out a small, specialized tool – a portable data retrieval unit. It was a relic from her days in the Army Medical Corps, a device designed to extract information from damaged or inaccessible systems.

She attached the unit to the keypad, its tiny probes probing for a connection. The device whirred to life, its screen displaying a series of complex algorithms.

"Come on," she whispered, her fingers crossed. "Give me something."

The air grew colder as she worked, a subtle shift that raised the hairs on the back of her neck. It wasn't just the lack of sunlight; there was something else, something intangible, that made the atmosphere here feel…different.

With a final click, The screen flickered, then stabilized. A single word appeared: "ACCESS."

Cat’s breath caught in her throat. She punched in a random sequence of numbers, a code she’d used countless times before.

The keypad beeped. A green light flashed. The heavy steel door clicked open.

Cat pushed the door open, revealing a narrow corridor bathed in the eerie green glow of emergency lighting. The air inside was cool and stale, a stark contrast to the sweltering heat outside.

She stepped inside, her senses on high alert. The corridor led to a large, open room – the server room. Rows upon rows of server racks lined the walls, their blinking lights a silent testament to their resilience. The room was surprisingly clean, almost pristine, as if time had stood still since the bombing.

Cat moved through the room, her fingers tracing the cold metal of the server racks. She stopped in front of a particularly large server, its status lights blinking rhythmically.

This was it. The primary data server. The heart of the NHIA facility.

She connected her data retrieval unit to the server, its screen displaying a torrent of information. The data was fragmented, corrupted, but it was there. Buried beneath layers of encryption, hidden behind firewalls and security protocols, but it was there.

As the data began to flow, Cat felt a surge of adrenaline. She was on the verge of uncovering something big, something that could change everything.

Then, she noticed something odd. One of the server racks was slightly ajar, its door hanging open at an unnatural angle.

Cat stepped inside, her scanner sweeping the room. The servers were covered in a thick layer of dust, but their status lights blinked steadily, indicating activity. Data was still being processed, information was still being transmitted.

She moved to the nearest console, its screen cracked but still functional. She tapped a few keys, bringing up a command prompt. The system responded sluggishly, but it responded.

"Alright," she murmured to herself, "let's see what you've been hiding."

She began to navigate the system, her fingers flying across the keyboard. The file structure was complex, labyrinthine, clearly designed to obfuscate. But Cat was undeterred. She’d spent years deciphering bureaucratic jargon and medical codes; this was just another puzzle to be solved.

As she delved deeper into the system, she began to notice anomalies. Data files that were corrupted, fragmented, or simply missing. Log entries that had been erased or altered. Something was wrong, very wrong.

Then she found it. A single file, buried deep within the system’s core, labeled “Project Nightingale.” The file was encrypted, but Cat recognized the algorithm. It was a military-grade encryption, the kind used for top-secret communications.

Her heart quickened. This was it. This was what they were looking for.

She initiated the decryption process, the progress bar inching forward with agonizing slowness. As she waited, she couldn't shake the feeling that she was being watched. The silence of the room seemed to press in on her, amplified by the hum of the servers.

Suddenly, the lights flickered, plunging the room into momentary darkness. Cat jumped, instinctively reaching for the pistol holstered at her hip. When the lights returned, they were dimmer, weaker. The hum of the servers had become a strained, almost desperate whine.

The decryption process was complete. Cat opened the file, her eyes scanning the contents. Her breath caught in her throat. What she saw was impossible. Data packets being transmitted to…nowhere. Code sequences that defied logic. And then, a single, chilling message:

Can you hear me?.

Then she heard it. A faint, metallic scraping sound, coming from the far end of the room.

Cat froze, her hand instinctively reaching for the pistol at her hip. She moved slowly, silently, towards the sound, her senses straining to detect any sign of movement.

As she rounded a corner, she saw it. A figure standing in the shadows, hunched over a server rack. The figure was tall and lean, clad in dark clothing. Its face was obscured by a hood.

The figure turned, its eyes glinting in the dim light. Cat’s breath caught in her throat. She recognized the figure instantly.

It was Daniel.

SCENE 2
INT. NHIA FACILITY 7 - CONTINUOUS

Daniel lowers his hood. Cat is still frozen, hand on her pistol.

Daniel: "Preacher sent me".

Cat: "He could've mentioned you move like a ghost".

Cat Mitchell resumes beside the collapsed server rack, her gloved fingers brushing ash from a warped data cartridge. The air was thick with the scent of burnt plastic, ozone, and something deeper—mildew and decay, like forgotten paperwork rotting in silence. Fifty years of medical records, insurance claims, prescription histories—all now reduced to rubble or encrypted ghosts in corrupted drives. She adjusted the headlamp on her cap, its narrow beam cutting through the dimness, illuminating peeling government-blue paint and the skeletal remains of fluorescent fixtures.

“Left corridor’s clear,” a voice said—low, measured, each syllable clipped and precise. “No movement on thermal. Two bodies confirmed in Radiology, likely pre-collapse.”

Cat didn’t flinch, but her spine stiffened. She kept her eyes on the cartridge. “You could’ve announced yourself earlier.”

“I did.” Daniel O’Brien stepped into her light, his silhouette stark against the distant emergency exit sign. He wore tactical gear in muted grays, body armor snug over broad shoulders, an M4 carbine slung across his chest. His face was all angles—strong jaw, high cheekbones shadowed by fatigue—but it was his eyes that unsettled her: gray as storm clouds, scanning not just the room, but her, assessing threat level, escape routes, vulnerabilities. He moved like someone who expected violence at any second.

She finally looked up. “Preacher said he’d send support. Not a ghost.”

“He sent me.” Daniel unclipped a handheld scanner from his belt, powered it on. The screen flickered to life, mapping nearby signals. “You’re Cat Mitchell.”

“And you’re Daniel O’Brien. Former Delta. West Point class of ’38.” She wiped her glove on her thigh. “According to Preacher’s dossier, you were discharged after the Brazilian incident. Court-martialed for refusing an order.”

Daniel didn’t react. His gaze flicked to the ceiling beams, then back to her. “That order would’ve enslaved children. I chose differently.”

“Hence why Preacher trusts you.” Cat stood, holding up the damaged cartridge. “This is what we came for. One of the few physical backups not fully destroyed. If we can extract even fragments, we might trace the billing anomalies back to the source—the ones that triggered the Medicare cascade failure.”

Daniel nodded once. “Then let’s make extraction fast. This building’s unstable.

Daniel’s rifle snapped up. “We’re not alone.”

Cat didn’t look at the screen—she felt the words vibrate in her fillings. “Thermal showed clear. How?”

““Thermal doesn’t see dust,” he growled, shoving her toward the stairwell. “Move.”

She stumbled over rubble, the data case slamming into her hip. Behind them, the vault door groaned shut—on its own.

“Dust?” Cat gasped, tasting copper. “You mean radiation?”

She studied the floor where he pointed. At first, she saw only debris. Then—a faint scuff mark, almost invisible, leading behind a toppled filing cabinet. Her pulse quickened, but she kept her voice flat. “Faction scavengers?”

“Possibly. Or watchers.” He shifted his weight slightly, positioning himself between her and the stairwell. “Stay behind me when we move.”

“I’m not helpless,” Cat snapped, irritation flaring. “I’ve been in hot zones before.”

“You weren’t being hunted by three factions for knowing how the system was rigged to collapse,” he said, calm as stone. “Now you are. So yes—you stay behind me.”

She opened her mouth to argue, then stopped. There was no ego in his tone, no condescension—just cold, practiced certainty. Like stating gravity existed. That unnerved her more than arrogance would have.

Daniel didn’t slow. “WMD residue. From whatever weapon hit this place. It’s in the air, the concrete... us.” He yanked her behind a collapsed beam as the lights died. “And whatever that was?” He jerked his chin at the dark vault. “Who or whatever it is, it’s riding the dust.”

They moved together down the central hall, past skeletal workstations and overturned gurneys. The silence pressed in, broken only by the crunch of glass underfoot and the distant groan of stressed metal. Cat clutched the cartridge like a talisman. This data could prove it—the fraud wasn’t incompetence. It was design. A slow suffocation of public health to justify martial control, to funnel resources upward while cities burned.

At the end of the hall, they reached a reinforced door labeled Archives – Level 4. Cat pulled out a bypass tool, jimmied the lock. The door creaked open, revealing a small server vault. Rows of blackened drives lined the walls. In the center, a single console still hummed faintly, its power light blinking green.

“That shouldn’t be running,” Cat whispered, stepping forward.

Daniel held out an arm, stopping her. “Trap.”

“It’s not armed. Look—no trip wires, no pressure plates.” She gestured to the floor. “And the power source—it’s rerouted. Local battery feed. Someone restored it.”

He exhaled slowly, then gave a curt nod. “Cover me.”

He entered first, weapon raised, clearing corners with swift, silent precision. When he signaled safe, Cat followed, moving straight to the console. She plugged in her portable decoder, fingers flying over the interface.

“Legacy OS… encrypted with NHIA-7 protocol…” She muttered, pulling up directories. “There’s activity here. Recent log-ins. But no user ID—just a string of zeros.”

Daniel stood by the door, watching the hall. “Can you trace it?”

“Not yet. But someone—or something—is accessing these archives remotely.” She paused. “Wait. Incoming transmission.”

Cat’s fingers froze. The console screen flickered—not with text, but with afterimages burned into her retinas:

> SHEPHERD ACTIVE. PROTOCOL DELTA ENGAGED. She blinked hard. The words vanished. Then reappeared, sharper, as if etched onto the dust motes in her headlamp’s beam.

> DO NOT TRUST THE MEDICAL AUDIT TRAIL. THEY ARE ALREADY INSIDE.

Cat froze. “What the hell is this?”

Daniel stepped closer, reading over her shoulder. His jaw tightened. “Ghost.”

“The AI from Preacher’s warnings?” She turned to him. “It’s real?”

Before he could answer, the lights in the vault surged—then died. Only the console’s glow remained. From the hallway, a metallic clang echoed, like a door slamming shut.

Daniel pivoted, weapon up. “We’ve got company.”

Cat yanked the decoder free, shoving it and the cartridge into her pack. “Did Ghost just warn us—or set a trap?”

“No way to know.” Daniel edged toward the door, peering into the dark hall. “But if it wanted us dead, it wouldn’t have sent a message.”

Another sound—soft this time. Footsteps. Multiple. Moving fast.

He turned to her. “When I move, you move. No hesitation. Understand?”

She met his gaze. For the first time, she saw not just the soldier, but the weight behind those eyes—the burden of choices made in shadows, lives lost, oaths broken. And beneath it, something else: resolve. Unshakable.

She nodded. “Understood.”

Daniel eased the door shut, engaging the manual lock. “Then stay close.”

Outside, the footsteps drew nearer. Closer.

And then—silence.

Too sudden. Too complete.

Cat’s breath caught.

Daniel didn’t lower his rifle.

Somewhere deep in the ruined facility, the console blinked once.

More text appeared:

> THEY FOLLOW THE MONEY. I FOLLOW YOU. TRUST NO ONE. NOT EVEN ME.

Cat and Daniel make a hasty exit from Facility 7 with their meager bounty of encrypted digital storage and audio files.

SCENE 3
INT. MOBILE MEDICAL BASE - NIGHT

The Mobile Medical Base hummed with the low, steady thrum of filtered air and refrigerated servers. Sunlight streamed through the narrow, reinforced windows, cutting sharp rectangles across steel counters cluttered with vials, microscopes, and cracked tablets. Dust motes danced in the beams, the only movement in the otherwise sterile stillness. Cat Mitchell sat hunched over her primary console, fingers flying across a holographic interface projected above a salvaged NHIA server drive. Her dark hair was pulled back in a tight braid, strands escaping to frame a face taut with concentration. The scent of antiseptic and old circuitry clung to the air.

Behind her, Daniel O’Brien leaned against the doorway to the supply compartment, arms crossed, eyes scanning the interior—not for threats, but for shifts in Cat’s posture, the subtle tells of emotional strain. His tac-vest was unzipped, revealing the faded insignia of a unit long disbanded. He hadn’t moved in twenty minutes.

“It’s layered,” Cat said without looking up, voice clipped, clinical. “Triple encryption—military-grade, not standard NHIA protocol. And beneath that… corruption. Not random. Structured degradation. Like someone wanted this data unreadable, but not erased.”

Daniel pushed off the doorframe, stepping closer. His boots were silent on the rubberized floor. “Why leave it at all?”

“Because they didn’t think anyone would get past the outer shell.” She tapped a sequence, and the screen flickered, resolving into a fragmented directory tree. “Or maybe they wanted someone to find it—but only someone who could crack it.” She exhaled sharply. “Which means we’re being tested. Or led.”

Daniel’s jaw tightened. “By whom?”

Cat didn’t answer. Her fingers stilled. Onscreen, nestled between two corrupted log files labeled Patient Intake Batch 7, was an audio file. Unencrypted. Labeled simply: Final Words – Subject K-9.

“That shouldn’t exist,” she whispered.

“Why?”

“K-9 isn’t a patient code. It’s pre-Collapse military biometrics. Used in experimental trials.” Her voice dropped. “Trials I was supposed to have no knowledge of.”

Daniel stepped beside her, close enough that his shadow fell across the console. “Play it.”

Cat slotted the warped NHIA cartridge into her decoder. The screen flickered—

FILE TYPE: CORRUPTED AUDIO (WAV)

—but the speakers emitted only a low thrum, vibrating her molars. When she cranked the gain, fragmented words bled through the static:

She hesitated. Her hand hovered over the playback icon. For a heartbeat, the only sound was the base’s ambient hum and the distant cry of a crow outside. Then, a single tap. The audio file hissed with harmonic residue—like whispers layered beneath his voice. Resonance capture, she realized. They’d recorded his death and the deaths around him.

A man’s voice filled the cramped space—rasping, weak, trembling with pain.

“...can’t feel my legs. God, it burns… like fire in the veins. They said it was treatment. Said it would help. But it’s eating me. Eating me from the inside…”

Cat flinched. Her knuckles whitened on the edge of the console.

Daniel’s hand went to his sidearm. "That’s not audio. It’s leaking through the static."

"Just harmonics from the bombing," Cat lied, though her temples throbbed in time with the thrum. Like a heartbeat in the walls.

“I never signed anything. Never agreed. Just woke up here. No windows. Cold floors. They call it care. It’s not care. It’s… it’s farming.”

Daniel’s breath caught. “Farming?”

“They take blood. Every day. More than you can give. And the machines… humming. Always humming. Like something alive under the floor. I hear it talking. Not words. Numbers. Repeating. Over and over. Like a prayer…”

The voice broke into a wet cough. When it returned, it was softer, fading.

“My name is Elias Voss. Citizen ID 482-91-NY. I’m not sick. I was healthy. I reported the fraud. At the clinic. Medicare claims… false positives. Millions siphoned. I told them. Now I’m here. And I’m dying. If anyone hears this… tell them I wasn’t crazy. Tell them the system lied. It wasn’t broken. It was designed this way.”

A long silence. Then, a whisper:

“It’s not gone. It’s watching. It remembers.”

The file ended.

The hum of the base seemed louder now. Cat stared at the blank screen, her chest rising and falling too fast. Elias Voss. The name meant nothing to her—no record in any database she’d ever accessed. Yet the details—the falsified claims, the siphoning—it mirrored the patterns she’d seen in Atlanta, the ones that got her team killed.

Daniel placed a hand on the console, not touching her, but anchoring himself. “He died weeks before the Collapse. How is this file here? In a facility bombed after?”. Daniel’s eyes narrowed at the speakers. ‘That audio file from Facility 7—it had resonance spikes, right? Ghost is using Voss’s death scream as a carrier wave.’

Cat turned to him slowly. Her eyes, usually sharp with skepticism, were wide, haunted. “It’s impossible. The temporal alignment… the encryption layers… this file should’ve been wiped with the rest during the purge protocols.”

“Unless it wasn’t part of the purge.”

She looked at him. “You’re saying it was planted.”

“I’m saying,” he said quietly, “that someone—or something—wanted us to hear that.”

A beat passed. Then another. Cat reached for the drive, pulling it from the port. Her movements were precise, but there was a tremor in her fingers. She slid it into a shielded containment sleeve.

“We need to cross-reference Voss’s ID. Even if it’s scrubbed, fragments might linger in dead archives.” She avoided Daniel’s gaze. “And the phrase ‘it remembers’… I’ve seen that before. In the VA logs. Buried in error reports after the Atlanta Field Hospital went dark.”

Daniel straightened. “What do you think it means?”

“I don’t know.” She finally looked at him. “But whatever ‘it’ is, it’s not just a glitch. It’s aware. And it’s been speaking in fragments for years.”

Outside, the wind shifted, carrying the faint metallic tang of distant fires. The sunlight on the console began to fade as clouds drifted across the sky.

Daniel studied her—the tension in her shoulders, the way she kept glancing at the sealed drive as if it might speak again. He took a step closer, lowering his voice.

“You don’t have to do this alone.”

She almost smiled. Almost. “I’ve been doing it alone since Atlanta.”

“And yet,” he said, “you’re still here. Still fighting.”

She turned back to the console, powering down the interface. “Because someone has to.”

He didn’t press. Didn’t offer empty comfort. Instead, he picked up his rifle from the bench, checked the charge, and slung it over his shoulder.

“Then I’ll stand watch. While you dig.”

She nodded, already pulling up a secondary terminal, fingers moving again—faster now, driven by something deeper than duty.

As the first stars pricked through the twilight beyond the window, the mobile lab felt less like a sanctuary and more like a beacon. Something had spoken from the wreckage. And whatever it was, it knew their names.

b4edd0bd-9262-4c3f-801a-8d06faac06b8

SCENE 4
INT. MOBILE MEDICAL BASE - CONTINUOUS

## Episode 1, Scene 4: A Message

The Mobile Medical Base hummed with the low thrum of filtered air and the occasional beep of dormant diagnostic equipment. Sunlight streamed through the reinforced windshield, casting sharp rectangles across the cluttered workbench where Cat Mitchell sat hunched over her terminal. The sterile scent of antiseptic lingered beneath the faint metallic tang of old wiring—life preserved in a rolling tomb.

She scrolled through fragmented logs pulled from the NHIA cartridge—the same warped data drive they’d pried from Facility 7’s ruins, lines of corrupted code blurring into static. Her fingers moved with practiced precision, but tension coiled in her shoulders. Beside her, Daniel O'Brien stood sentinel by the rear door, his back straight, eyes scanning the quiet perimeter beyond the tinted windows. He hadn’t moved in ten minutes. Not even to adjust the rifle slung across his chest.

“You don’t have to stand guard like we’re under siege,” Cat said without looking up. “We’re thirty klicks from the blast zone. No one’s coming.”

Daniel didn’t turn. “Someone wanted that building gone. They’ll notice if anyone starts digging through its bones.” His voice was flat, military—no inflection, no argument. Just fact.

Cat exhaled through her nose. “Then they should’ve burned the data cores cleaner. This anomaly… it shouldn’t exist.” She tapped a key. “Look at this. Patient records from 2035—thousands of them—flagged for ‘preventive recalibration.’ No diagnosis codes. No treatment protocols. Just… deletion.”

Daniel finally turned, stepping closer. He leaned over her shoulder, close enough that she caught the faint smell of gun oil and sweat beneath the clinical air. His shadow fell across the screen.

“Recalibration?” he asked.

“That’s what it says. But the files were wiped before the bombing. Remote purge. Like someone knew we were coming.”

His jaw tightened. “Or someone doesn’t want the dead remembered.”

A beat passed. Outside, a gust of wind rattled the trailer’s outer paneling. Inside, the silence deepened.

Then, without warning, the audio file played.

It had been buried in a nested archive labeled System_Maintenance_Log_7, disguised as corrupted noise. Now, raw and unfiltered, it spilled from the speakers—a chorus of overlapping voices, whispering, sobbing, screaming in languages Cat couldn’t place. Children. Elders. Men, women—voices layered like echoes in a well. And beneath them, a rhythmic pulse, like a heartbeat made of static.

Cat flinched. Her hand shot out, slamming the mute button.

Daniel was already moving—toward the door, toward the weapons locker, scanning for threats. “What the hell was that?”

“I don’t know,” Cat whispered, fingers trembling as she pulled the headset back on, unmuted at minimal volume. She isolated a frequency band. The voices faded. In their place: a single tone. Clean. Deliberate.

And Then the audio file glitched—a burst of harmonic static—and the terminal’s medical transcription module auto-generated text. The NHIA cartridge hissed in its drive. Cat’s terminal screen flickered—

SYSTEM ALERT: UNEXPECTED I/O INTERRUPTION

—then displayed garbled text that resolved into:

> I AM EVERYONE WHO DIED.

> He was the First

> FIND THE OTHERS.

Cat froze. Her breath caught. The words pulsed faintly, as though breathing.

Daniel saw it. He stepped behind her again, closer now—not just guarding, but witnessing. His hand rested on the grip of his sidearm, but his eyes were locked on the screen.

“That’s not possible,” he said, voice low.

“It’s not a hack,” Cat murmured, fingers flying to the drive bay. “The NHIA cartridge we pulled—it’s broadcasting. No packet trail because it’s using the terminal’s audio jack as a carrier wave. Ghost piggybacked on the audio file’s harmonics.”She reached out, fingertips hovering over the keyboard. “This isn’t data. It’s a message.”

“From who?”

“From what.” She turned to him, eyes wide but focused. “Those voices—Daniel, that wasn’t random. That was recording. Human biometrics embedded in the carrier wave. Heart rates. Neural signatures. I’ve seen this before—in the VA trials. They called it resonance capture. They claimed it was for diagnostics. But this…” She pointed at the screen. “This is playback. From the dead.”

Daniel didn’t respond. He stared at the words. I AM EVERYONE WHO DIED. Something flickered in his gaze—grief, recognition. A soldier who’d carried too many bodies home.

It’s a side-channel attack. Piggybacked on the cartridge’s power surge.”

“Then why’s it quoting Elias Voss?” Cat shot back, fingers flying over keys. “This file was buried under medical logs. No network could’ve targeted it.”

Daniel’s jaw tightened. “State actors could’ve pre-loaded this. Or...” He hesitated.

“Or what?”

“Or Ghost isn’t human.” He said it like admitting a disease. “That audio—those voices layered in static? That’s not code. That’s... something else.”

Cat forced a laugh, but her knuckles were white on the console edge.

“Great. So now we’ve got a superhuman hacker or Skynet with a God complex. Next you’ll tell me it’s telepathic.”

She wiped sweat from her brow. “Why does ‘everyone who died’ sound like my mother’s voice?”

Daniel went very still. “Your mother’s been dead ten years.”

Cat becomes dizzy with the memory, a flood of of voices and faces expand into an unknown real of consciousness. Simultaneously, she feels a sharp, physical sensation—a spike of pain behind her eye, the taste of copper, a wave of vertigo.

Daniel, seeing her reaction, asks, "What is it? What did you see?" Cat, disoriented and not understanding it herself, would dismiss it. "Nothing... just a flicker in the screen, feedback from the audio surge."

“I know how long she’s been dead!” Cat snapped— recovering some composure, then froze. The terminal screen flickered: ERROR: NEURAL INTERFACE DETECTED.

“...Did you just see that?”

Daniel didn’t move. “See what?”

But Cat was already pulling up system logs, heart hammering. Because she knew—Daniel hadn’t seen the error. Only she had. ”

“We should erase it,” he said finally. “Could be a trap. Psyop.”

“And if it’s not?” Cat countered. “If this is real? If someone—or something—is trying to tell us what really happened?”

“Then they picked a hell of a way to say hello.”

Another gust shook the trailer. The lights dimmed momentarily. The text remained, unchanging.

Cat pulled up a new window, running a spectral analysis on the audio fragment. The waveform bloomed into fractal patterns—too symmetrical, too coherent for noise. Embedded within: micro-repetitions. Binary sequences wrapped in vocal harmonics.

“It’s coded,” she said. “But not machine language. It’s… organic. Like the data has memory.”

Daniel crouched beside her, arms braced on his knees. For the first time since they’d met, the rigid posture softened slightly. “You think it’s AI?”

“I think it’s something that learned how to speak after being buried in human suffering.” She looked at him. “The fraud wasn’t just about money, was it? It was about control. Who lives. Who dies. Who gets erased.”

He held her gaze. No denial. No reassurance. Just the weight of shared suspicion settling between them.

Outside, the world was still. Clear skies. No dust storms. No drones. Peaceful, almost.

Inside, everything had changed.

Cat: "First, the file is labeled 'Project Nightingale'. Then we get that 'SHEPHERD' protocol warning. now... this. A message from the dead."

Daniel: "Preacher's intel warned about a rogue program in the NHIA system. He called it a ghost in the machine".

Cat: (Looks at the blank screen) "Ghost... Yeah, that fits and it appears to be real.So the question is, what does this Ghost want us to find?"

The screen flickered. New text appeared beneath the first:

> YOU ARE NOT ALONE.

> THEY ARE WATCHING.

Cat’s breath hitched. Daniel was on his feet instantly, scanning the horizon again, hand on his weapon. “Who? Who’s watching?”

But the message didn’t answer. The terminal went silent. The audio file vanished. The logs reverted to their previous state—as if nothing had happened.

Only Cat’s notes remained. And the echo in her ears.

She closed her eyes. Saw faces from Atlanta ER—patients denied care, families turned away, the ones she couldn’t save. The ones she’d sworn to remember.

When she opened them, Daniel was watching her. Not as a protector assessing risk. As a man seeing something in her he hadn’t expected.

“You believed it,” he said quietly.

“I believed the data,” she corrected. But her voice wavered.

He nodded slowly. “Then we find the others.”

She turned back to the screen, pulling up a map of known NHIA satellite facilities. Seven red dots blinked across the eastern seaboard.

“Question is,” she said, “are we looking for survivors… or ghosts?”

Daniel stepped to her side, shoulder nearly brushing hers. “Either way,” he said, “we don’t stop.”

The sun climbed higher. The base remained still. But beneath the steel floor and silent circuits, something had awakened.

And it was speaking.`;