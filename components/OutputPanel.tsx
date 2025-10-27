import React from 'react';
import type { AnalyzedEpisode, BeatAnalysis } from '../types';
import { LightbulbIcon } from './icons';

interface OutputPanelProps {
  analysis: AnalyzedEpisode | null;
  isLoading: boolean;
  error: string | null;
}

const RequirementBadge: React.FC<{ requirement: BeatAnalysis['imageRequirement'] }> = ({ requirement }) => {
  const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
  let colorClasses = "";
  switch (requirement) {
    case 'New Image Recommended':
      colorClasses = 'bg-green-800 text-green-200';
      break;
    case 'Reuse Possible':
      colorClasses = 'bg-yellow-800 text-yellow-200';
      break;
    case 'No Image Needed':
      colorClasses = 'bg-gray-700 text-gray-300';
      break;
  }
  return <span className={`${baseClasses} ${colorClasses}`}>{requirement}</span>;
}

const BeatAnalysisCard: React.FC<{ beat: BeatAnalysis, beatNumber: number }> = ({ beat, beatNumber }) => (
    <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
        <h4 className="font-bold text-gray-300 mb-2">Beat #{beatNumber}</h4>
        <blockquote className="border-l-4 border-gray-600 pl-4 text-gray-300 italic mb-4">
            {beat.beatText}
        </blockquote>
        <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-gray-400">Image Need:</span>
                <RequirementBadge requirement={beat.imageRequirement} />
            </div>
             <div className="flex justify-between items-center">
                <span className="text-gray-400">Beat Type:</span>
                <span className="text-gray-200 font-medium">{beat.beatType}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-gray-400">Visual Significance:</span>
                <span className="text-gray-200 font-medium">{beat.visualSignificance}</span>
            </div>
            {beat.locationAttributes && beat.locationAttributes.length > 0 && (
                <div className="pt-2">
                    <p className="text-gray-400 font-semibold mb-2">Location Attributes:</p>
                    <div className="flex flex-wrap gap-2">
                        {beat.locationAttributes.map((attr, i) => (
                            <span key={i} className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded-md">{attr}</span>
                        ))}
                    </div>
                </div>
            )}
             <div className="pt-2 mt-2 border-t border-gray-700">
                <div className="flex items-start gap-2">
                    <span className="text-brand-purple mt-0.5 flex-shrink-0"><LightbulbIcon /></span>
                    <p className="text-gray-300"><span className="font-semibold text-gray-400">Justification:</span> {beat.justification}</p>
                </div>
            </div>
            {beat.cameraAngleSuggestion && (
                 <div className="pt-2">
                    <p className="text-gray-300"><span className="font-semibold text-gray-400">Camera Suggestion:</span> {beat.cameraAngleSuggestion}</p>
                </div>
            )}
             {beat.characterPositioning && (
                 <div className="pt-2">
                    <p className="text-gray-300"><span className="font-semibold text-gray-400">Positioning:</span> {beat.characterPositioning}</p>
                </div>
            )}
        </div>
    </div>
);

export const OutputPanel: React.FC<OutputPanelProps> = ({ analysis, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg p-6 min-h-[500px]">
        <div className="text-center">
          <svg className="animate-spin mx-auto h-12 w-12 text-brand-purple" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg text-gray-300">Analyzing script beats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-200 p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg p-6 min-h-[500px]">
        <div className="text-center text-gray-500">
          <h2 className="text-2xl font-semibold">Storyboard Analysis Awaits</h2>
          <p className="mt-2">Provide a script and click "Analyze Script" to generate a visual breakdown.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg h-full overflow-y-auto">
      <div className="border-b-2 border-brand-purple/50 pb-4 mb-6">
        <h2 className="text-3xl font-bold text-brand-blue">Episode {analysis.episodeNumber}: {analysis.title}</h2>
      </div>
      <div className="space-y-8">
        {analysis.scenes.map((scene) => (
          <details key={scene.sceneNumber} open className="bg-gray-900/50 p-4 rounded-lg">
            <summary className="text-2xl font-semibold text-brand-purple cursor-pointer">
              Scene {scene.sceneNumber}: {scene.title}
            </summary>
            <div className="mt-4 border-t border-gray-700 pt-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-6 bg-gray-800 p-3 rounded-md">
                    <div className="text-gray-400">Timing: <span className="text-gray-200 font-medium">{scene.metadata.timing}</span></div>
                    <div className="text-gray-400">Duration: <span className="text-gray-200 font-medium">{scene.metadata.targetDuration} min</span></div>
                    <div className="text-gray-400">Role: <span className="text-gray-200 font-medium">{scene.metadata.sceneRole}</span></div>
                    <div className="text-gray-400">Ad Break: <span className="text-gray-200 font-medium">{scene.metadata.adBreak ? 'Yes' : 'No'}</span></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-4">Visual Beats</h3>
                <div className="space-y-4">
                    {scene.beats.map((beat, index) => (
                        <BeatAnalysisCard key={index} beat={beat} beatNumber={index + 1} />
                    ))}
                </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};