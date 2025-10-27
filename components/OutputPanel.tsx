import React, { useState } from 'react';
import type { AnalyzedEpisode, BeatAnalysis, ImageDecision, SwarmUIPrompt } from '../types';
import { LightbulbIcon, LinkIcon, ClockIcon, CopyIcon, CheckIcon } from './icons';

interface OutputPanelProps {
  analysis: AnalyzedEpisode | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

const ImageDecisionDisplay: React.FC<{ decision: ImageDecision }> = ({ decision }) => {
  const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5";
  let content: React.ReactNode;

  switch (decision.type) {
    case 'NEW_IMAGE':
      content = <span className={`${baseClasses} bg-green-800 text-green-200`}>New Image</span>;
      break;
    case 'REUSE_IMAGE':
      content = <span className={`${baseClasses} bg-yellow-800 text-yellow-200`}><LinkIcon /> Reuse</span>;
      break;
    case 'NO_IMAGE':
      content = <span className={`${baseClasses} bg-gray-700 text-gray-300`}>No Image</span>;
      break;
    default:
        content = null;
  }
  return <div>{content}</div>;
}

const PromptDisplay: React.FC<{ promptData: SwarmUIPrompt; title: string }> = ({ promptData, title }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(promptData.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-2">
            <div className="relative bg-gray-900 p-3 rounded-md border border-gray-700">
                <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                    aria-label="Copy prompt to clipboard"
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
                <p className="text-sm text-gray-200 font-mono whitespace-pre-wrap pr-10">{promptData.prompt}</p>
            </div>
            <div className="text-xs text-gray-400 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1">
                <span><span className="font-semibold">Model:</span> {promptData.model}</span>
                <span><span className="font-semibold">Size:</span> {promptData.width}x{promptData.height}</span>
                <span><span className="font-semibold">Steps:</span> {promptData.steps}</span>
                <span><span className="font-semibold">CFG:</span> {promptData.cfgscale}</span>
            </div>
        </div>
    );
};


const PromptTabs: React.FC<{ beat: BeatAnalysis }> = ({ beat }) => {
    const [activeTab, setActiveTab] = useState<'cinematic' | 'vertical'>('cinematic');

    if (!beat.prompts) return null;

    return (
        <div className="mt-4 pt-4 border-t border-brand-purple/20">
            <div className="flex border-b border-gray-700 mb-3">
                <button
                    onClick={() => setActiveTab('cinematic')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'cinematic' ? 'border-b-2 border-brand-blue text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                    Cinematic (16:9)
                </button>
                <button
                    onClick={() => setActiveTab('vertical')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'vertical' ? 'border-b-2 border-brand-blue text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                >
                    Vertical (9:16)
                </button>
            </div>
            <div>
                {activeTab === 'cinematic' && <PromptDisplay promptData={beat.prompts.cinematic} title="Cinematic (16:9)" />}
                {activeTab === 'vertical' && <PromptDisplay promptData={beat.prompts.vertical} title="Vertical (9:16)" />}
            </div>
        </div>
    );
};


const BeatAnalysisCard: React.FC<{ beat: BeatAnalysis, beatNumber: number }> = ({ beat, beatNumber }) => (
    <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-300">Beat #{beatNumber}</h4>
            <div className="flex items-center gap-2">
               {beat.estimatedDurationSeconds && (
                <span className="flex items-center gap-1 text-xs text-gray-400"><ClockIcon /> {beat.estimatedDurationSeconds}s</span>
              )}
              <ImageDecisionDisplay decision={beat.imageDecision} />
            </div>
        </div>

        <blockquote className="border-l-4 border-gray-600 pl-4 text-gray-300 italic mb-4">
            {beat.beatText}
        </blockquote>

        <div className="space-y-2 text-sm">
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
                {beat.imageDecision.type === 'REUSE_IMAGE' && (
                    <div className="flex items-start gap-2 text-yellow-300 mb-2 p-2 bg-yellow-900/30 rounded-md">
                         <span className="text-yellow-400 mt-0.5 flex-shrink-0"><LinkIcon /></span>
                         <p><span className="font-semibold">Reuse instruction:</span> Reuse image from <span className="font-bold">{beat.imageDecision.reuseSourceBeatLabel}</span>.</p>
                    </div>
                )}
                <div className="flex items-start gap-2">
                    <span className="text-brand-purple mt-0.5 flex-shrink-0"><LightbulbIcon /></span>
                    <p className="text-gray-300"><span className="font-semibold text-gray-400">Reasoning:</span> {beat.imageDecision.reason}</p>
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
        {beat.imageDecision.type === 'NEW_IMAGE' && <PromptTabs beat={beat} />}
    </div>
);


const analysisSteps = [
    { id: 1, text: "Initializing...", trigger: "Initializing analysis" },
    { id: 2, text: "Connecting to Gemini API...", trigger: "Connecting to Gemini" },
    { id: 3, text: "Compacting Context...", trigger: "Compacting episode context" },
    { id: 4, text: "Sending Script to Gemini...", trigger: "Sending script to Gemini" },
    { id: 5, text: "Processing Gemini Response...", trigger: "Processing Gemini response" },
    { id: 6, text: "Post-processing Analysis...", trigger: "Post-processing analysis" },
    { id: 7, text: "Generating SwarmUI Prompts...", trigger: "Generating SwarmUI prompts" },
];

const LoadingStateDisplay = ({ loadingMessage }: { loadingMessage: string }) => {
    let currentStepIndex = -1;
    for (let i = 0; i < analysisSteps.length; i++) {
        if (loadingMessage.startsWith(analysisSteps[i].trigger)) {
            currentStepIndex = i;
        }
    }
    if (loadingMessage.startsWith("Analysis complete!")) {
        currentStepIndex = 4;
    }

    return (
        <div className="text-center w-full max-w-md">
            <h3 className="text-2xl font-semibold text-brand-purple mb-8">Analysis in Progress</h3>
            <div className="space-y-4">
                {analysisSteps.map((step, index) => {
                    const isCompleted = currentStepIndex > index;
                    const isCurrent = currentStepIndex === index;
                    
                    return (
                        <div key={step.id} className="flex items-center gap-4 transition-all duration-300">
                            <div className="flex-shrink-0">
                                {isCompleted ? (
                                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-green-500/50">
                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                ) : isCurrent ? (
                                    <div className="h-6 w-6 rounded-full bg-brand-blue flex items-center justify-center ring-2 ring-brand-blue/50 animate-pulse">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="h-6 w-6 rounded-full bg-gray-700"></div>
                                )}
                            </div>
                            <p className={`text-lg text-left ${isCompleted ? 'text-gray-400 line-through' : isCurrent ? 'text-white font-semibold' : 'text-gray-500'}`}>
                                {step.text}
                            </p>
                        </div>
                    );
                })}
            </div>
            <p className="mt-8 text-sm text-gray-400 h-4">{loadingMessage}</p>
        </div>
    );
};

export const OutputPanel: React.FC<OutputPanelProps> = ({ analysis, isLoading, loadingMessage, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800/50 rounded-lg p-6 min-h-[500px]">
        <LoadingStateDisplay loadingMessage={loadingMessage} />
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
                        <BeatAnalysisCard key={beat.beatId} beat={beat} beatNumber={index + 1} />
                    ))}
                </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};
