import type { ImageGenerationResult } from './services/swarmUIService';
export type { ImageGenerationResult };

export type LLMProvider = 'gemini' | 'qwen' | 'claude' | 'openai' | 'xai' | 'deepseek' | 'glm';
export type LLMSelection = LLMProvider;

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
  // Additional SwarmUI parameters (populated from Episode Context image_config)
  sampler?: string;
  scheduler?: string;
  loras?: string;
  loraweights?: string;
}

export interface BeatPrompts {
  beatId: string;
  cinematic: SwarmUIPrompt;
  vertical?: SwarmUIPrompt; // Vertical (9:16) prompts for long-form storytelling based on beat analysis
  marketingVertical?: SwarmUIPrompt; // Vertical (9:16) prompts specifically for marketing, based on full episode analysis
  /** Scene persistent state for continuity validation */
  scenePersistentState?: ScenePersistentState;
  /** Scene type template for validation */
  sceneTemplate?: SceneTypeTemplate;
  /** Post-generation validation results (belt-and-suspenders enforcement) */
  validation?: PromptValidationResult;
}

export interface BeatAnalysis {
  beatId: string; // e.g., s1-b1
  beat_script_text: string; // The verbatim text content of the beat.
  source_paragraph?: string; // The original narrative paragraph from the script this beat was extracted from.
  visualSignificance: 'High' | 'Medium' | 'Low';
  imageDecision: ImageDecision;
  cameraAngleSuggestion?: string;
  characterPositioning?: string;
  locationAttributes?: string[];
  resolvedLocationId?: string; // The UUID of the specific sub-location from the hierarchy table.
  prompts?: {
    cinematic: SwarmUIPrompt;
    vertical?: SwarmUIPrompt; // For long-form storytelling based on beat analysis
    marketingVertical?: SwarmUIPrompt; // For marketing based on full episode analysis
  };
  hookNarrative?: string; // For Phase 1.4
}

// Video Short Marketing Types
export interface VideoShortMoment {
  momentId: string;
  title: string;
  description: string;          // Why this moment is compelling for marketing
  storyArcConnection: string;   // How it relates to overall story
  emotionalHook: string;        // Emotional appeal for marketing
  visualPrompt: SwarmUIPrompt;  // 9:16 marketing-optimized prompt
  beatReference?: string;       // Optional reference to original beat if applicable
  buzzScore: number;            // 0-10 score for marketing potential
}

export interface VideoShortEpisode {
  episodeNumber: number;
  episodeTitle: string;
  moments: VideoShortMoment[];  // 3-5 key marketing moments
  storyContext: string;         // Overall story connection for marketing
  marketingAngle: string;       // Primary marketing hook for the episode
  generatedAt: Date;
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
  verticalAspectRatio: string; // Now included for both long-form and marketing use cases
}

// Image generation configuration from database (stories.image_config)
export interface ImageConfigPreset {
  width: number;
  height: number;
}

export interface ImageConfig {
  model: string;
  steps: number;
  cfgscale: number;
  sampler: string;
  scheduler: string;
  loras: string;
  lora_weights: string;
  presets: {
    cinematic: ImageConfigPreset;
    vertical: ImageConfigPreset;
  };
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
    image_config?: ImageConfig;     // SwarmUI settings from stories table
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
  // Helmet fragment columns for LLM scene discernment
  helmet_fragment_off?: string;     // Hair/face when helmet is off
  helmet_fragment_visor_up?: string; // Helmet with visor raised - face visible
  helmet_fragment_visor_down?: string; // Helmet with visor down - face hidden
  face_segment_rule?: 'ALWAYS' | 'IF_FACE_VISIBLE' | 'NEVER'; // Face segment inclusion rule
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
  // Helmet fragment columns for LLM scene discernment
  helmet_fragment_off?: string;
  helmet_fragment_visor_up?: string;
  helmet_fragment_visor_down?: string;
  face_segment_rule?: string;
}

export interface DatabaseStoryData {
  id: string;
  title: string;
  story_context: string;
  narrative_tone: string;
  core_themes: string;
}

/**
 * Story context data for Episode Context Enhancement (Phase B)
 * Contains high-level story intelligence used to enrich AI prompt generation
 */
export interface StoryContextData {
  story_context: string;  // Overarching narrative framework (300-700 chars recommended)
  narrative_tone: string;  // Tone guidance for atmosphere and mood (150-350 chars recommended)
  core_themes: string;     // Thematic elements for visual symbolism (150-300 chars recommended)
}

// REMOVED: LocationOverrideMapping - character appearances now come directly from Episode Context JSON

// Retrieval mode type
export type RetrievalMode = 'manual' | 'database';

export interface SwarmUIExportData {
  scriptText: string;
  episodeContext: string;
  storyUuid: string;
  analyzedEpisode: AnalyzedEpisode;
  promptMode?: 'storyart' | 'storyswarm';
  retrievalMode?: RetrievalMode;
  selectedLLM?: LLMProvider;
  timestamp?: number; // Session timestamp for tracking
  // Session key for Redis storage
  sessionKey?: string;
  // Legacy fields (may be removed in future)
  prompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgscale?: number;
  seed?: number;
  narrative?: string;
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

// DaVinci Project Service interfaces
export interface OrganizationResult {
  success: boolean;
  episodeProjectPath: string;
  organizedImages: OrganizedImage[];
  failedImages: FailedImage[];
  summary: {
    totalImages: number;
    successfulCopies: number;
    failedCopies: number;
  };
  error?: string;
}

export interface OrganizedImage {
  originalPath: string;
  destinationPath: string;
  sceneNumber: number;
  beatId: string;
  format: 'cinematic' | 'vertical';
  version: number;
  filename: string;
}

export interface FailedImage {
  originalPath: string;
  error: string;
  sceneNumber: number;
  beatId: string;
  format: 'cinematic' | 'vertical';
}

export interface ProjectStructure {
  episodeProjectPath: string;
  episodeNumber: number;
  episodeTitle: string;
  folders: ProjectFolder[];
  isValid: boolean;
  errors?: string[];
}

export interface ProjectFolder {
  path: string;
  name: string;
  type: 'assets' | 'images' | 'longform' | 'shortform' | 'scene' | 'audio' | 'video' | 'timelines' | 'exports';
  exists: boolean;
  subfolders?: ProjectFolder[];
}

// Pipeline Orchestrator Service interfaces
export interface BeatPrompt {
  beatId: string;
  sceneNumber: number;
  format: 'cinematic' | 'vertical';
  prompt: SwarmUIPrompt;
  beat_script_text: string;
}

export interface PipelineResult {
  success: boolean;
  sessionTimestamp: number;
  episodeNumber: number;
  episodeTitle: string;
  totalPrompts: number;
  successfulGenerations: number;
  failedGenerations: number;
  organizationResult?: OrganizationResult;
  generationResults: ImageGenerationResult[];
  errors?: string[];
  duration?: number; // Processing duration in milliseconds
  reviewSessionId?: string; // StoryTeller Image Review session ID
}

export interface BeatPipelineResult {
  success: boolean;
  beatId: string;
  format: 'cinematic' | 'vertical';
  sceneNumber: number;
  generationResult?: ImageGenerationResult;
  organizationResult?: OrganizationResult;
  error?: string;
}

export interface PipelineProgress {
  currentStep: number;
  totalSteps: number;
  currentStepName: string;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
}

// ============================================================================
// Beat Carryover State Types (SKILL.md Section 4.5)
// Tracks action/expression state between beats for continuity
// ============================================================================

/**
 * Per-character state that carries over between beats within a scene.
 * When a beat doesn't explicitly specify action/expression, the previous state persists.
 */
export interface CharacterBeatState {
  characterName: string;
  /** Current action/pose (e.g., "standing tall, examining monitor") */
  currentAction: string | null;
  /** Current expression (e.g., "alert expression, eyes scanning") */
  currentExpression: string | null;
  /** Beat ID where this state was last updated */
  lastUpdatedBeatId: string | null;
}

/**
 * Scene-level variety tracking to prevent visual monotony.
 * Enforces anti-monotony rules from SKILL.md Section 4.7.
 */
export interface SceneVarietyState {
  /** Last 3 shot types used (for anti-repetition) */
  recentShotTypes: string[];
  /** Last 3 camera angles used */
  recentAngles: string[];
  /** Total beats processed in this scene */
  beatCount: number;
}

/**
 * Combined state for a single scene's beat processing.
 * Resets at scene boundaries per SKILL.md Section 4.5 rules.
 */
export interface SceneBeatState {
  sceneNumber: number;
  /** Map of character name -> their current state */
  characterStates: Record<string, CharacterBeatState>;
  /** Variety tracking for shot/angle diversity */
  varietyState: SceneVarietyState;
}

/**
 * Persistent scene elements that carry forward between beats.
 * FLUX Prompt Engine Architect Memo: Scene Continuity Carry-Forward.
 * All elements persist until the narrative EXPLICITLY changes them.
 * A beat about one character's dialogue does NOT clear other characters.
 */
export interface ScenePersistentState {
  /** Vehicle in scene (e.g., "matte-black armored motorcycle (The Dinghy)") */
  vehicle: string | null;
  /** Vehicle state determines visual appearance per SKILL.md 3.6.3 */
  vehicleState: 'in_motion' | 'parked' | null;
  /** All characters currently present in the scene */
  charactersPresent: string[];
  /** Spatial positions (e.g., { "Daniel": "front/driving", "Cat": "behind/passenger" }) */
  characterPositions: Record<string, string>;
  /** Current gear state (e.g., "HELMET_DOWN", "HELMET_VISOR_UP", "HELMET_OFF") */
  gearState: string | null;
  /** Location description for prompt carry-forward */
  location: string | null;
  /** Lighting conditions for prompt carry-forward */
  lighting: string | null;
}

/**
 * Scene type template identification for prompt skeleton selection.
 * Maps to reusable templates from Architect Memo Section 14.
 */
export interface SceneTypeTemplate {
  /** Which template skeleton to use */
  templateType: 'vehicle' | 'indoor_dialogue' | 'combat' | 'stealth' | 'establishing' | 'suit_up' | 'ghost' | 'generic';
  /** Why this template was selected (for logging/debugging) */
  templateReason: string;
}

/**
 * Post-generation prompt validation result.
 * Belt-and-suspenders enforcement: logs warnings, does NOT block generation.
 */
export interface PromptValidationResult {
  beatId: string;
  /** Estimated T5 token count (~4 chars/token) */
  tokenCount: number;
  /** True if token count exceeds 200 limit */
  tokenBudgetExceeded: boolean;
  /** Characters that should be in scene but are missing from prompt */
  missingCharacters: string[];
  /** True if vehicle should be in scene (in_motion) but is missing from prompt */
  missingVehicle: boolean;
  /** Fabricated terms found that are not in canonical descriptions */
  forbiddenTermsFound: string[];
  /** True if visor-down but hair/face descriptions present */
  visorViolation: boolean;
  /** FLUX when faces visible, ALTERNATE when all visors down */
  modelRecommendation: 'FLUX' | 'ALTERNATE';
  /** Reason for model recommendation */
  modelRecommendationReason: string;
  /** Detected scene type template */
  sceneTemplate?: SceneTypeTemplate;
  /** Characters whose LoRA triggers were injected by post-processing (not by Gemini) */
  injectedCharacters: string[];
  /** All validation warnings collected */
  warnings: string[];
}

/**
 * Extended beat analysis with carryover state applied.
 * These fields are populated by the beat state service during post-processing.
 */
export interface BeatAnalysisWithState extends BeatAnalysis {
  /** Carryover action (from previous beat if not specified in this beat) */
  carryoverAction?: string;
  /** Carryover expression (from previous beat if not specified in this beat) */
  carryoverExpression?: string;
  /** Source beat ID if action/expression was carried over */
  carryoverSourceBeatId?: string;
  /** Whether variety rules were applied to modify shot selection */
  varietyApplied?: boolean;
  /** Suggested alternative shot type if original would violate monotony rules */
  suggestedShotType?: string;
}