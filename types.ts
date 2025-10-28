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
  beatText: string; // The verbatim text content of the beat.
  visualSignificance: 'High' | 'Medium' | 'Low';
  imageDecision: ImageDecision;
  cameraAngleSuggestion?: string;
  characterPositioning?: string;
  locationAttributes?: string[];
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
  stylePrefix: string;
  model: string;
  cinematicAspectRatio: string;
  verticalAspectRatio: string;
}