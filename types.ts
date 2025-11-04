export interface SceneMetadata {
  targetDuration: string;
  sceneRole: string;
  timing: string;
  adBreak: boolean;
}

export type NewImageDecision = {
  type: 'NEW_IMAGE';
  reason: string;
};

export type ReuseImageDecision = {
  type: 'REUSE_IMAGE';
  reason: string;
  reuseSourceBeatId: string;
  reuseSourceBeatLabel: string;
};

export type NoImageDecision = {
  type: 'NO_IMAGE';
  reason: string;
};

export type ImageDecision = NewImageDecision | ReuseImageDecision | NoImageDecision;

export interface SwarmUIPrompt {
  prompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgscale: number;
  seed: number;
  // Add other SwarmUI specific parameters as needed
}

export interface BeatPrompts {
  beatId: string;
  cinematic: SwarmUIPrompt;
  vertical: SwarmUIPrompt;
}

export interface BeatAnalysis {
  beatId: string; // e.g., s1-b1
  beat_script_text: string; // The verbatim text content of the beat.
  visualSignificance: 'High' | 'Medium' | 'Low';
  imageDecision: ImageDecision;
  cameraAngleSuggestion?: string;
  characterPositioning?: string;
  locationAttributes?: string[];
  resolvedLocationId?: string; // The UUID of the specific sub-location from the hierarchy table.
  prompts?: {
    cinematic: SwarmUIPrompt;
    vertical: SwarmUIPrompt;
  };
  hookNarrative?: string; // For Phase 1.4
}


export interface AnalyzedScene {
  sceneNumber: number;
  title: string;
  metadata: SceneMetadata;
  beats: BeatAnalysis[];
}

export interface AnalyzedEpisode {
  episodeNumber: number;
  title: string;
  scenes: AnalyzedScene[];
}

export interface EpisodeStyleConfig {
  model: string;
  cinematicAspectRatio: string;
  verticalAspectRatio: string;
}

// Database-driven interfaces for enhanced episode context
export interface EnhancedEpisodeContext {
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

export interface CharacterContext {
  character_name: string;
  aliases: string[];
  base_trigger: string;
  visual_description: string;       // Generic description
  location_contexts: CharacterLocationContext[]; // NEW: Location-specific appearances
}

export interface CharacterLocationContext {
  location_name: string;
  physical_description: string;     // From character_location_contexts
  clothing_description: string;     // From character_location_contexts
  demeanor_description: string;     // From character_location_contexts
  swarmui_prompt_override: string; // From character_location_contexts
  temporal_context: string;         // PRE_COLLAPSE, POST_COLLAPSE, etc.
  lora_weight_adjustment: number;   // From character_location_contexts
}

export interface SceneContext {
  scene_number: number;
  scene_title: string;
  scene_summary: string;
  roadmap_location: string;         // From roadmap_scenes.location_name
  location: LocationContext;       // Enhanced with database data
  character_appearances: CharacterAppearance[]; // NEW: Scene-specific character data
}

export interface LocationContext {
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

export interface ArtifactContext {
  artifact_name: string;            // From location_artifacts
  artifact_type: string;            // KEY_ITEM, FORESHADOWING, CLUE, etc.
  description: string;              // From location_artifacts
  swarmui_prompt_fragment: string;  // From location_artifacts
  always_present: boolean;          // From location_artifacts
  scene_specific: boolean;         // From location_artifacts
}

export interface CharacterAppearance {
  character_name: string;
  location_context: CharacterLocationContext; // Matched to scene location
  tactical_override_applied: boolean;          // NEW: Whether tactical override used
}

// Database service interfaces
export interface DatabaseLocationData {
  id: string;
  name: string;
  description: string;
  location_type: string;
  atmosphere_category: string;
  geographical_location: string;
  time_period: string;
  cultural_context: string;
  atmosphere: string;
  visual_description: string;
  key_features: string;
  visual_reference_url: string;
  significance_level: string;
  notes: string;
}

export interface DatabaseArtifactData {
  id: string;
  artifact_name: string;
  artifact_type: string;
  description: string;
  always_present: boolean;
  scene_specific: boolean;
  swarmui_prompt_fragment: string;
  location_arc_id: string;
}

export interface DatabaseCharacterLocationData {
  id: string;
  character_id: string;
  character_name: string;
  location_arc_id: string;
  location_name: string;
  temporal_context: string;
  age_at_context: number;
  physical_description: string;
  clothing_description: string;
  hair_description: string;
  demeanor_description: string;
  swarmui_prompt_override: string;
  lora_weight_adjustment: number;
}

export interface DatabaseStoryData {
  id: string;
  title: string;
  story_context: string;
  narrative_tone: string;
  core_themes: string;
}

// Location override mapping for tactical appearances
export interface LocationOverrideMapping {
  [locationName: string]: string;
}

// Retrieval mode type
export type RetrievalMode = 'manual' | 'database';

export interface SwarmUIExportData {
  prompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  cfgscale: number;
  seed: number;
  narrative: string;
}

// SwarmUI API interfaces
export interface QueueStatus {
  queue_length: number;
  current_generation: string | null;
}

export interface GenerationStats {
  total_generations: number;
  average_generation_time: number;
}

// Image Path Tracker interfaces for SwarmUI to DaVinci pipeline
export interface ImageMetadata {
  sceneNumber: number;
  beatId: string;
  format: 'cinematic' | 'vertical';
  prompt: string;
  generationStartDate: Date;
}

export interface EnhancedImagePath {
  originalPath: string;
  normalizedPath: string;
  sceneNumber: number;
  beatId: string;
  format: 'cinematic' | 'vertical';
  filename: string;
  exists: boolean;
  metadata?: ImageMetadata;
}