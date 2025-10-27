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

export interface BeatAnalysis {
  beatId: string;
  beatText: string;
  beatType: 'Character Introduction' | 'Action' | 'Emotional' | 'Dialogue' | 'Environmental' | 'Revelation' | 'Other';
  visualSignificance: 'High' | 'Medium' | 'Low';
  imageDecision: ImageDecision;
  cameraAngleSuggestion?: string;
  characterPositioning?: string;
  locationAttributes?: string[];
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
