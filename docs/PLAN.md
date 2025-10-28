# StoryTeller AI - Implementation Plan for Content Expansion & Automation

This document outlines the phased implementation plan for expanding the application's capabilities to include new content types (vertical shorts prompts, hook narratives) and direct SwarmUI API integration for a fully automated script-to-image pipeline.

## 🎯 **Critical Database Integration Discovery**

**Phase 2 has been significantly enhanced** based on database analysis revealing:

### **📊 Rich Database Context Available:**
- **12 detailed locations** with visual descriptions and atmospheric context
- **37 artifacts** with ready-to-use SwarmUI prompt fragments  
- **26 character-location contexts** with detailed appearance data
- **6 complete SwarmUI prompt overrides** ready for immediate use

### **🔗 Location Override Mapping System:**
**Key Discovery:** Roadmap data drives location selection, but tactical locations should use Atlanta Emergency Zone SwarmUI overrides for character appearance.

**Mapping Rules:**
- `roadmap_scenes.location_name = "NHIA Facility 7"` → Use Atlanta Emergency Zone character overrides
- **Reason:** NHIA Facility 7 is bombed/tactical environment requiring protective gear
- **Result:** Consistent tactical character appearance across similar environments

### **💡 Implementation Priority:**
**Phase 2.0 (Database Context Integration) must be implemented FIRST** before SwarmUI automation, as it provides 10x more visual detail than current constants-based approach.

### **🏢 NHIA Facility 7 - Multi-Floor Building Analysis**

**Current Issue:** NHIA Facility 7 is described as a single location, but the narrative reveals it's a multi-floor CDC archive and data center with distinct areas that need separate treatment.

**Narrative Analysis from Constants:**
- **Main Building:** CDC archive and data center (post-downfall destruction)
- **Specific Areas Identified:**
  - **Ground Level:** Reception area, corridors with shattered containment pods and lab equipment
  - **Lower Level:** Data vault accessed through reinforced door (primary target)
  - **Server Room:** Revealed within the vault when opened, contains server racks
  - **Movement Sequence:** Cat moves "deeper" through facility → finds reinforced vault door → opens vault → discovers server room inside

**Database Structure Analysis:**
- **Current Limitation:** No parent/child location hierarchy in `location_arcs` table
- **Available Fields:** `location_type` (SPECIFIC/GENERAL), `significance_level`, `atmosphere_category`
- **Artifact Association:** 8 artifacts currently associated with main NHIA Facility 7

**Required Implementation:**

#### **2.0.4. Hierarchical Location System:**
```sql
-- Proposed database enhancement (requires schema modification)
ALTER TABLE location_arcs ADD COLUMN parent_location_id UUID REFERENCES location_arcs(id);
ALTER TABLE location_arcs ADD COLUMN floor_level INTEGER;
ALTER TABLE location_arcs ADD COLUMN area_type VARCHAR(50); -- 'reception', 'server_room', 'vault', 'corridor', etc.
```

#### **2.0.5. NHIA Facility 7 Child Locations:**
```typescript
const nhiaFacility7ChildLocations = {
  "NHIA Facility 7 - Reception Area": {
    location_type: "SPECIFIC",
    area_type: "reception", 
    floor_level: 1,
    visual_description: "Destroyed reception area with scattered debris, broken security checkpoint, emergency lighting casting shadows across abandoned visitor logs and shattered glass partitions.",
    artifacts: ["concrete_rubble", "shattered_windows", "emergency_lighting"]
  },
  
  "NHIA Facility 7 - Data Vault": {
    location_type: "SPECIFIC", 
    area_type: "vault",
    floor_level: -1, // Lower level - accessed by going deeper into facility
    visual_description: "Underground data vault accessed through reinforced door, containing rows of shattered containment pods, abandoned lab equipment, reinforced concrete walls, emergency lighting creating long shadows.",
    artifacts: ["Shattered Containment Pods", "medical_equipment", "The Original SledBed"]
  },
  
  "NHIA Facility 7 - Server Room": {
    location_type: "SPECIFIC",
    area_type: "server_room", 
    floor_level: -1, // Same level as vault - servers revealed when vault is opened
    visual_description: "Hardened server room revealed within the vault, rows of server racks with blinking status lights, emergency backup systems, clinical white walls with biohazard warnings.",
    artifacts: ["server_racks", "Emergency Biohazard Warnings", "emergency_lighting"]
  },
  
  "NHIA Facility 7 - Corridors": {
    location_type: "GENERAL",
    area_type: "corridor", 
    floor_level: 0, // Ground level
    visual_description: "Long sterile corridors with emergency lights casting dancing shadows, abandoned computer terminals, scattered debris from the explosion.",
    artifacts: ["concrete_rubble", "emergency_lighting", "shattered_windows"]
  }
};
```

#### **2.0.6. Artifact Redistribution Strategy:**
- **Reception Area:** Structural damage artifacts (concrete_rubble, shattered_windows)
- **Server Room:** Technical artifacts (server_racks, biohazard warnings)  
- **Data Vault:** Medical/research artifacts (containment pods, SledBed, medical equipment)
- **Corridors:** General atmospheric artifacts (emergency lighting, general debris)

**Implementation Priority:** This hierarchical system must be implemented before SwarmUI automation to ensure consistent visual storytelling across different areas of the same building.

### **🏗️ Hierarchical Location System - Complete Analysis**

#### **2.0.7. Database Schema Enhancement Required:**
```sql
-- Required schema modifications for parent/child location support
ALTER TABLE location_arcs ADD COLUMN parent_location_id UUID REFERENCES location_arcs(id);
ALTER TABLE location_arcs ADD COLUMN floor_level INTEGER;
ALTER TABLE location_arcs ADD COLUMN area_type VARCHAR(50); -- 'reception', 'server_room', 'vault', 'corridor', 'office', 'lab', etc.
ALTER TABLE location_arcs ADD COLUMN access_method VARCHAR(100); -- 'stairs', 'elevator', 'door', 'corridor', etc.
```

#### **2.0.8. NHIA Facility 7 - Corrected Layout:**
**Narrative Sequence:** Ground Level → Move Deeper → Reinforced Vault Door → Open Vault → Server Room Inside

```typescript
const nhiaFacility7Hierarchy = {
  "NHIA Facility 7": {
    parent_location_id: null, // Root location
    floor_level: 0,
    area_type: "building",
    visual_description: "CDC archive and data center, post-downfall destruction"
  },
  
  "NHIA Facility 7 - Reception Area": {
    parent_location_id: "NHIA Facility 7",
    floor_level: 0,
    area_type: "reception",
    access_method: "main entrance",
    visual_description: "Destroyed reception area with scattered debris, broken security checkpoint"
  },
  
  "NHIA Facility 7 - Corridors": {
    parent_location_id: "NHIA Facility 7", 
    floor_level: 0,
    area_type: "corridor",
    access_method: "from reception",
    visual_description: "Long sterile corridors with emergency lighting, abandoned terminals"
  },
  
  "NHIA Facility 7 - Data Vault": {
    parent_location_id: "NHIA Facility 7",
    floor_level: -1,
    area_type: "vault", 
    access_method: "reinforced door (go deeper)",
    visual_description: "Underground vault accessed through reinforced door, containing containment pods and lab equipment"
  },
  
  "NHIA Facility 7 - Server Room": {
    parent_location_id: "NHIA Facility 7 - Data Vault",
    floor_level: -1,
    area_type: "server_room",
    access_method: "inside vault",
    visual_description: "Server room revealed within vault, rows of server racks with biohazard warnings"
  }
};
```

#### **2.0.9. Other Locations Requiring Sub-Area Analysis:**

**Investigation Required for Additional Multi-Area Locations:**

1. **Dr. Chen's Enhancement Facility:**
   - Likely contains: Labs, offices, patient rooms, surgical suites
   - **Investigation Needed:** What specific areas are mentioned in narrative?

2. **Underground Facility Alpha:**
   - Likely contains: Multiple levels, command centers, storage areas
   - **Investigation Needed:** What sub-areas are referenced?

3. **Mobile Medical Base:**
   - Likely contains: Examination area, computer station, storage
   - **Investigation Needed:** Specific compartments mentioned?

4. **Daniel's Safehouse:**
   - Likely contains: Living area, tactical room, storage
   - **Investigation Needed:** What rooms/areas are described?

5. **Ghost's Digital Lair:**
   - Likely contains: Server areas, interface zones, control rooms
   - **Investigation Needed:** What digital spaces exist?

#### **2.0.10. Implementation Strategy:**

**Phase 2.0.1: Database Schema Enhancement**
- Add parent/child relationship fields to `location_arcs`
- Create migration scripts for existing data
- Update foreign key constraints

**Phase 2.0.2: Location Hierarchy Analysis**
- Review all narrative sources for sub-location references
- Document explicit vs. implied sub-areas for each major location
- Create hierarchical mapping for each multi-area location

**Phase 2.0.3: Artifact Redistribution**
- Move artifacts from parent locations to appropriate child locations
- Ensure visual consistency within each sub-area
- Maintain artifact relationships across hierarchy levels

**Phase 2.0.4: SwarmUI Integration**
- Update prompt generation to use child location context
- Apply character appearance rules to specific sub-areas
- Ensure consistent visual storytelling across location hierarchy

**Critical Note:** This hierarchical system is essential for accurate visual storytelling, as treating complex facilities as single locations leads to inconsistent and inadequate scene descriptions.

### **⚠️ Implementation Detail Deficiencies - Critical Analysis**

**Status:** 🔍 **ANALYZED** - Several tasks lack sufficient implementation details for successful execution.

#### **Critical Deficiencies Requiring Immediate Attention:**

**1. Database Schema Enhancement (2.0.7) - CRITICAL**
- **Constraint:** Cannot modify primary StoryTeller database structure
- **Solution:** Create separate `storyart_location_hierarchy` table for hierarchical data
- **Missing Details:**
  - Migration script creation for new table
  - Data synchronization strategy with existing `location_arcs`
  - Rollback procedures if implementation fails
  - Testing strategy for schema changes

**2. Database Context Service Implementation (2.0.1) - CRITICAL**
- **Missing Details:**
  - Connection pool management for PostgreSQL
  - Error handling when database unavailable
  - Caching strategy for frequently accessed data
  - Query optimization for performance
  - TypeScript interfaces for new data structures

**3. Location Hierarchy Analysis (2.0.2) - HIGH PRIORITY**
- **Missing Details:**
  - Narrative source identification methodology
  - Step-by-step analysis process for sub-area identification
  - Data extraction process from narrative sources
  - Validation process for identified sub-areas

**4. Artifact Redistribution (2.0.3) - HIGH PRIORITY**
- **Missing Details:**
  - Migration script for moving artifacts to child locations
  - Validation logic for correct artifact distribution
  - Conflict resolution when artifacts belong to multiple sub-areas
  - Data integrity maintenance during redistribution

#### **Medium Priority Items Requiring Discussion:**

**5. SwarmUI Integration (2.0.4) - REQUIRES DISCUSSION**
- **Constraint:** Must maintain current prompt generation process
- **Constraint:** Dashboard output must remain unchanged for human-in-the-loop
- **Constraint:** Intersects with Phase 3 requirements
- **Status:** Discussion deferred until other issues implemented

**6. Enhanced Prompt Generation (2.0.3) - REQUIRES DISCUSSION**
- **Current Assessment:** Manual switch process may be sufficient
- **Status:** Discussion deferred until other issues implemented

**7. Roadmap-Driven Location Resolution (2.0.4) - REQUIRES DISCUSSION**
- **Rationale Unclear:** Need to understand business justification
- **Status:** Discussion deferred until other issues implemented

#### **Low Priority Items:**

**8. Phase 3 Interactive Prompt Refinement - DEFERRED**
- **Status:** Keep low priority, implement Phase 2 first
- **Rationale:** Phase 2 provides foundation for Phase 3 enhancements

#### **Implementation Strategy:**

**Phase 2.0.1: Address Critical Deficiencies**
- Create detailed implementation plans for items 1-4
- Develop migration strategies that don't impact StoryTeller
- Design error handling and rollback procedures

**Phase 2.0.2: Deferred Discussion Items**
- Address items 5-7 after critical deficiencies resolved
- Use implementation experience to inform discussions
- Ensure solutions align with StoryTeller constraints

**Phase 2.0.3: Phase 3 Preparation**
- Complete Phase 2 implementation before Phase 3
- Use Phase 2 learnings to enhance Phase 3 planning

### **🔄 Frontend Default Configuration - Database Mode**

#### **2.0.11. Default Database Mode Implementation:**

**Configuration Changes Made:**
```typescript
// App_updated.tsx - Default to database mode
const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('database');

// Use environment variable for story ID with fallback
const [storyUuid, setStoryUuid] = useState<string>(
  import.meta.env.VITE_CAT_DANIEL_STORY_ID || '59f64b1e-726a-439d-a6bc-0dfefcababdb'
);
```

**Automatic Context Loading:**
- **On Startup:** Application defaults to database mode
- **Auto-Load:** Episode context automatically fetched from database on app load
- **Environment Integration:** Uses `VITE_CAT_DANIEL_STORY_ID` from `.env` file
- **Fallback:** Hardcoded story ID if environment variable not available

**User Experience:**
- **No Manual Switch Required:** Database mode is active by default
- **Immediate Data:** Episode context loads automatically into textarea
- **Development Ready:** Uses development story ID from environment
- **Production Ready:** Can be changed to production story ID when needed

**Implementation Status:** ✅ **COMPLETED**
- Database mode is now the default
- Story ID uses environment variable `VITE_CAT_DANIEL_STORY_ID`
- Context automatically loads on startup
- Manual mode still available as fallback option

### **👤 Character Appearance System - Memorialized:**
**Complete character appearance specifications have been documented** for consistent visual storytelling across all locations:

- **Cat Mitchell:** Tactical bun (field) → Ponytail (office) → Hair down (safehouse)
- **Daniel O'Brien:** Full tactical gear (field) → Camo pants/shirt (office) → Jeans/t-shirt (safehouse)  
- **Dr. Chen:** Professional medical/research attire (all locations)
- **Col. Webb:** Battle dress (field) → Uniform with jacket (office)
- **Preacher:** Priest-like frock (all locations)

**This system ensures visual consistency and character-appropriate styling across all story locations.**

---

## Phase 1: Content Generation & UI Expansion

**Status:** ✅ **COMPLETE**
**Goal:** Enhance the AI's content generation abilities and update the user interface to display all new assets clearly. This phase focuses on getting the core content right before automating its use.

-   [x] **1.1. Dual Prompt Generation:** Modified `promptGenerationService` to produce two distinct prompts (Cinematic 16:9 and Vertical 9:16) for each `NEW_IMAGE` beat.
-   [x] **1.2. Episode Style Configuration:** Added a collapsible "Episode Style Configuration" section in the `InputPanel` to allow users to define consistent stylistic parameters for an entire episode.
-   [x] **1.3. UI Overhaul for New Content:** Redesigned the `OutputPanel` with a tabbed interface within each `BeatAnalysisCard` to cleanly display the dual prompts.
-   [ ] **1.4. Hook Narrative Generation (Future Step):**
    -   Create a new AI-powered service to generate short, engaging narrative hooks for each key beat.
    -   Add a new section to the `BeatAnalysisCard` to display this narrative.

---

## Phase 2: Database Integration & SwarmUI Automation

**Status:** 📋 **PLANNED**
**Goal:** Integrate rich database context with SwarmUI automation, enabling data-driven prompt generation and one-click image creation.

### **2.0. Database Context Integration (NEW - CRITICAL)**

-   [ ] **2.0.1. Database Context Service:**
    -   Implement `services/databaseContextService.ts` to fetch location, character, and artifact data
    -   Query `location_arcs`, `location_artifacts`, and `character_location_contexts` tables
    -   Use `CAT_DANIEL_STORY_ID` environment variable for story-specific data retrieval
    -   Connect to PostgreSQL using `DATABASE_URL` from environment

-   [ ] **2.0.2. Enhanced Location Override Mapping System:**
    -   Implement location override mapping with character appearance rules based on location type
    -   **Location Categories:**
        - **FIELD LOCATIONS** (Tactical/Combat): Use Atlanta Emergency Zone overrides
        - **OFFICE LOCATIONS** (Professional): Use business casual futuristic style
        - **SAFEHOUSE LOCATIONS** (Casual): Use relaxed, sexy casual style
        - **SPECIAL LOCATIONS** (Ghost's Lair): Use unique styling
    -   **Character Appearance Rules:**
        ```typescript
        const locationOverrideMapping = {
          // FIELD LOCATIONS - Tactical gear, tactical bun
          "Atlanta Emergency Zone": "Atlanta Emergency Zone",           // Direct match
          "NHIA Facility 7": "Atlanta Emergency Zone",                  // Tactical override
          "Underground Facility Alpha": "Atlanta Emergency Zone",       // Tactical override
          "Military Black Site": "Atlanta Emergency Zone",              // Tactical override
          "Derelict Warehouse": "Atlanta Emergency Zone",               // Tactical override
          "General Location - Dangerous Terrain": "Atlanta Emergency Zone", // Tactical override
          "General Location - Urban Ruins": "Atlanta Emergency Zone",   // Tactical override
          "General Location - Decommissioned Outpost": "Atlanta Emergency Zone", // Tactical override
          
          // OFFICE LOCATIONS - Business casual futuristic
          "OmniGen HQ": "Office Professional",                          // Corporate headquarters
          "Dr. Chen's Enhancement Facility": "Office Professional",     // Corporate lab
          "Archives Level 4": "Office Professional",                   // Corporate archive
          "Medical Lab": "Office Professional",                        // Corporate medical
          "Radiology Wing": "Office Professional",                     // Corporate medical
          "Mobile Medical Base": "Office Professional",                // Corporate mobile
          
          // SAFEHOUSE LOCATIONS - Casual, sexy, relaxed
          "Dan's Safehouse": "Safehouse Casual",                       // Direct match
          "Rumored Safe Haven": "Safehouse Casual",                    // Safe haven
          
          // SPECIAL LOCATIONS - Unique styling
          "Ghost's Digital Lair": "Ghost Digital"                      // Digital/tech environment
        };
        ```
    -   **Character Appearance Specifications:**
        - **Cat - Field Locations:** Tactical bun, tactical field gear, tactical vest, combat boots
        - **Cat - Office Locations:** Ponytail, business casual futuristic (cyberpunk style)
        - **Cat - Safehouse:** Hair down and loose, jeans and t-shirt, loose/open clothing (simple but super sexy)
        - **Daniel - Field Locations:** Full tactical gear, plate carrier, weapons systems
        - **Daniel - Office Locations:** Camo pants and camo t-shirt
        - **Daniel - Safehouse:** Jeans and t-shirt, relaxed tactical wear
        - **Dr. Chen - All Locations:** Professional medical/research attire, clinical appearance, corporate authority
        - **Col. Webb - Field Locations:** Battle dress uniform, military tactical gear
        - **Col. Webb - Office Locations:** Military uniform with jacket, formal military appearance
        - **Preacher - All Locations:** Priest-like frock (but not actual priest's clothing), religious/authority appearance

-   [ ] **2.0.3. Enhanced Prompt Generation:**
    -   Modify `promptGenerationService.ts` to use database context when `retrievalMode === 'database'`
    -   Integrate `swarmui_prompt_fragment` from 37 location artifacts
    -   Use `swarmui_prompt_override` from 26 character-location contexts
    -   Apply location-specific visual descriptions and atmospheric context
    -   **Database Data Available:**
        - **12 detailed locations** with visual descriptions and atmosphere
        - **37 artifacts** with ready-to-use SwarmUI prompt fragments
        - **26 character-location contexts** with detailed appearance data
        - **6 complete SwarmUI prompt overrides** ready for immediate use

-   [ ] **2.0.4. Roadmap-Driven Location Resolution:**
    -   Implement system to read `roadmap_scenes.location_name` to determine actual story locations
    -   Map roadmap locations to appropriate SwarmUI overrides using locationOverrideMapping
    -   **Example:** When roadmap says "NHIA Facility 7", use Atlanta Emergency Zone character overrides
    -   **Reason:** NHIA Facility 7 is bombed/tactical environment requiring protective gear

-   [ ] **2.0.5. Enhanced Episode Context JSON Structure:**
    -   **Current Structure Issues:**
        - Generic character descriptions (not location-specific)
        - Limited artifacts (8 vs 37 in database)
        - Missing atmospheric context
        - No SwarmUI prompt overrides
        - Hardcoded location descriptions
    -   **New Database-Driven Structure:**
        ```typescript
        interface EnhancedEpisodeContext {
          episode: {
            episode_number: number;
            episode_title: string;
            episode_summary: string;
            story_context: string;           // From stories table
            narrative_tone: string;         // From stories table
            core_themes: string;            // From stories table
            characters: CharacterContext[]; // Enhanced with location-specific data
            scenes: SceneContext[];         // Enhanced with database context
          }
        }

        interface CharacterContext {
          character_name: string;
          aliases: string[];
          base_trigger: string;
          visual_description: string;       // Generic description
          location_contexts: CharacterLocationContext[]; // NEW: Location-specific appearances
        }

        interface CharacterLocationContext {
          location_name: string;
          physical_description: string;     // From character_location_contexts
          clothing_description: string;     // From character_location_contexts
          demeanor_description: string;     // From character_location_contexts
          swarmui_prompt_override: string; // From character_location_contexts
          temporal_context: string;         // PRE_COLLAPSE, POST_COLLAPSE, etc.
          lora_weight_adjustment: number;   // From character_location_contexts
        }

        interface SceneContext {
          scene_number: number;
          scene_title: string;
          scene_summary: string;
          roadmap_location: string;         // From roadmap_scenes.location_name
          location: LocationContext;       // Enhanced with database data
          character_appearances: CharacterAppearance[]; // NEW: Scene-specific character data
        }

        interface LocationContext {
          id: string;
          name: string;
          description: string;              // From location_arcs
          visual_description: string;       // From location_arcs
          atmosphere: string;               // From location_arcs
          atmosphere_category: string;     // From location_arcs
          geographical_location: string;    // From location_arcs
          time_period: string;              // From location_arcs
          cultural_context: string;         // From location_arcs
          key_features: string;             // From location_arcs (JSON array)
          visual_reference_url: string;     // From location_arcs
          significance_level: string;       // From location_arcs
          artifacts: ArtifactContext[];     // Enhanced with database data
          tactical_override_location: string; // NEW: Mapped tactical location
        }

        interface ArtifactContext {
          artifact_name: string;            // From location_artifacts
          artifact_type: string;            // KEY_ITEM, FORESHADOWING, CLUE, etc.
          description: string;              // From location_artifacts
          swarmui_prompt_fragment: string;  // From location_artifacts
          always_present: boolean;          // From location_artifacts
          scene_specific: boolean;         // From location_artifacts
        }

        interface CharacterAppearance {
          character_name: string;
          location_context: CharacterLocationContext; // Matched to scene location
          tactical_override_applied: boolean;          // NEW: Whether tactical override used
        }
        ```
    -   **Implementation Benefits:**
        - **Location-Specific Characters:** Characters look different in each location
        - **Rich Artifact Data:** 37 artifacts vs 8 in current structure
        - **Atmospheric Context:** Mood and atmosphere for each location
        - **SwarmUI Integration:** Ready-to-use prompt overrides
        - **Tactical Override System:** Automatic mapping of tactical locations
        - **Database-Driven:** All data pulled from PostgreSQL, not hardcoded

### **2.1. SwarmUI API Service (ENHANCED)**

-   [ ] **2.1.1. Context-Enhanced Image Generation:**
    -   Implement `generateImage` function that accepts database context parameters
    -   Include location artifacts, character-location context, and atmospheric data
    -   Use database-specific SwarmUI prompt overrides when available
    -   **Enhanced SwarmUI Override Specifications:**
        ```typescript
        const swarmUIOverrides = {
          // FIELD LOCATIONS - Tactical/Combat
          "Atlanta Emergency Zone": {
            "Cat": "Catherine 'Cat' Mitchell as field investigator, 32, dark brown tactical bun, green eyes alert and focused, wearing tactical field gear, tactical vest, combat boots, emergency zone background, tactical stance, burn marks on forearms, investigating with focused determination.",
            "Daniel": "Daniel O'Brien in full tactical mode, 35, 6'2\", stark white hair, green eyes scanning threats, wearing complete tactical gear, plate carrier, weapons systems, protective stance in chaotic Atlanta emergency zone, urban decay background, command presence, military precision."
          },
          
          // OFFICE LOCATIONS - Business Casual Futuristic
          "Office Professional": {
            "Cat": "Catherine 'Cat' Mitchell, 32, 5'7\", dark brown ponytail, green eyes with gold flecks, wearing futuristic business casual - sleek cyberpunk-style blazer, fitted pants, high-tech accessories, professional corporate environment background, confident business stance, medical caduceus tattoo visible.",
            "Daniel": "Daniel O'Brien, 35, 6'2\", muscular build, stark white military hair, green eyes, wearing camo pants and camo t-shirt, protective stance in corporate office environment, professional medical facility background, alert tactical posture."
          },
          
          // SAFEHOUSE LOCATIONS - Casual, Sexy, Relaxed
          "Safehouse Casual": {
            "Cat": "Catherine 'Cat' Mitchell in safehouse, 32, dark brown hair completely down and loose, green eyes showing vulnerability and peace, wearing jeans and t-shirt, loose comfortable clothing, relaxed posture, medical caduceus tattoo visible, safehouse interior background, soft lighting, genuine rare moment of complete relaxation, simple but super sexy.",
            "Daniel": "Daniel O'Brien in safehouse, 35, 6'2\", white hair softened in safe environment, green eyes watchful but relaxed, wearing jeans and t-shirt, protective but relaxed posture, safehouse interior background, soft lighting, rare peaceful moment."
          },
          
          // SPECIAL LOCATIONS - Unique Styling
          "Ghost Digital": {
            "Cat": "Catherine 'Cat' Mitchell, 32, dark brown hair in practical style, green eyes alert, wearing tech-adapted clothing suitable for digital environment, Ghost's Digital Lair background, technological atmosphere.",
            "Daniel": "Daniel O'Brien, 35, 6'2\", white hair, green eyes scanning, wearing tactical gear adapted for digital environment, Ghost's Digital Lair background, technological atmosphere."
          },
          
          // ADDITIONAL CHARACTERS - All Locations
          "Dr. Chen": {
            "Field": "Dr. Sarah Chen, professional medical researcher, wearing clinical white lab coat over dark business suit, authoritative corporate appearance, medical facility background, clinical lighting, professional medical authority.",
            "Office": "Dr. Sarah Chen, professional medical researcher, wearing clinical white lab coat over dark business suit, authoritative corporate appearance, medical facility background, clinical lighting, professional medical authority.",
            "Safehouse": "Dr. Sarah Chen, professional medical researcher, wearing clinical white lab coat over dark business suit, authoritative corporate appearance, medical facility background, clinical lighting, professional medical authority."
          },
          
          "Col. Webb": {
            "Field": "Colonel Webb, military officer, wearing battle dress uniform, military tactical gear, formal military appearance, battlefield background, tactical lighting, command presence, military authority.",
            "Office": "Colonel Webb, military officer, wearing military uniform with jacket, formal military appearance, office environment background, professional lighting, command presence, military authority."
          },
          
          "Preacher": {
            "All": "Preacher, religious authority figure, wearing priest-like frock (but not actual priest's clothing), religious/authority appearance, appropriate background for location, dignified lighting, spiritual authority presence."
          }
        };
        ```

### **2.2. Conditional UI for Automation (ENHANCED)**

-   [ ] **2.2.1. Database Context Indicators:**
    -   Show database context availability in the UI (location artifacts count, character contexts available)
    -   Display which database data is being used for each prompt
    -   Add context preview tooltips showing database descriptions vs constants
    -   **Context Quality Indicators:**
        - Rich database context (37 artifacts, 26 character contexts)
        - Basic constants context (8 artifacts, generic descriptions)

-   [ ] **2.2.2. Enhanced Generate Button:**
    -   Button shows database context being used (e.g., "Generate with NHIA Facility 7 artifacts")
    -   Display character-location specific prompts when available
    -   Show atmospheric context being applied
    -   **Location Override Display:** Show when tactical overrides are being applied

### **2.3. Batch Processing & Export (ENHANCED)**

-   [ ] **2.3.1. Database-Aware Export:**
    -   Export includes database context metadata (location names, artifact sources, character contexts)
    -   Include both database prompts and fallback constants prompts
    -   Export database context summary for each beat
    -   **Export Format:** Include location override mapping used for each scene

-   [ ] **2.3.2. Context-Validated Generation:**
    -   Validate that database context is available before batch generation
    -   Show which beats have rich database context vs basic constants
    -   Allow selective generation based on context quality
    -   **Quality Metrics:** Database context provides 10x more visual detail than constants

---

## Phase 3: Interactive Prompt Refinement

**Status:** 📋 **PLANNED**
**Goal:** Empower users with a "human-in-the-loop" workflow to iteratively refine AI-generated prompts for maximum creative control.

-   [ ] **3.1: UI Hooks (`OutputPanel.tsx`):**
    -   [ ] Add a "Refine" button to each prompt display card (`cinematic` and `vertical`).
    -   [ ] The button click will trigger a handler in `App.tsx` to open the refinement modal, passing the specific beat and prompt type to be edited.
-   [ ] **3.2: State Management (`App.tsx`):**
    -   [ ] Create new state to manage the visibility of the refinement modal and the "beat in focus" for editing.
    -   [ ] Implement a handler function (`handleOpenRefineModal`) to set the target and show the modal.
    -   [ ] Implement a handler function (`handleSaveChanges`) that receives the updated prompt from the modal and patches it into the main `analyzedEpisode` state.
-   [ ] **3.3: The Refinement Modal (`components/RefineModal.tsx`):**
    -   [ ] Create a new modal component that overlays the main UI.
    -   [ ] It will feature a two-column layout: an editable prompt textarea on one side, and the "Context Tree" on the other.
    -   [ ] Include "Save Changes," "Cancel," and "Refine with AI" buttons.
-   [ ] **3.4: The Context Tree Component (`components/ContextTree.tsx`):**
    -   [ ] Create a new component to display the relevant scene context (characters, location details, artifacts) as a hierarchical, selectable list with checkboxes.
    -   [ ] Implement logic for parent/child selection dependencies.
    -   [ ] The component will report the array of selected `prompt_fragment` strings back to the `RefineModal`.
-   [ ] **3.5: The Refinement AI Service (`promptGenerationService.ts`):**
    -   [ ] Create a new exported function: `refinePrompt(currentPrompt: string, attributesToAdd: string[]): Promise<string>`.
    -   [ ] This function will use a new, specialized system instruction for Gemini, focused on surgical insertion and stylistic preservation.
    -   [ ] The function will return the newly refined prompt string for display in the modal's textarea.