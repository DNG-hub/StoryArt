export interface SceneMetadata {
  targetDuration: string;
  sceneRole: string;
  timing: string;
  adBreak: boolean;
}

export interface BeatAnalysis {
  beatText: string;
  beatType: 'Character Introduction' | 'Action' | 'Emotional' | 'Dialogue' | 'Environmental' | 'Revelation' | 'Other';
  visualSignificance: 'High' | 'Medium' | 'Low';
  imageRequirement: 'New Image Recommended' | 'Reuse Possible' | 'No Image Needed';
  justification: string;
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

export interface HistoryEntry {
  id: string;
  timestamp: number;
  inputs: {
    scriptText: string;
    episodeContext: string;
    retrievalMode: 'manual' | 'database';
    storyUuid?: string;
  };
  output: AnalyzedEpisode;
}