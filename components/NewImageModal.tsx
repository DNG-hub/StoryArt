import React, { useState } from 'react';
import type { BeatAnalysis, SwarmUIPrompt } from '../types';
import { CopyIcon, CheckIcon } from './icons';
import { processSingleBeat } from '../services/pipelineClientService';
import type { ProgressCallback } from '../services/pipelineService';
import type { BeatPipelineResult } from '../types';

interface NewImageModalProps {
  isOpen: boolean;
  beat: BeatAnalysis | null;
  sceneNumber: number;
  onClose: () => void;
  sessionTimestamp?: number;
}

export const NewImageModal: React.FC<NewImageModalProps> = ({
  isOpen,
  beat,
  sceneNumber,
  onClose,
  sessionTimestamp,
}) => {
  // Vertical prompts are now auto-generated from cinematic, so we only need cinematic
  const [activeTab] = useState<'cinematic' | 'vertical'>('cinematic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ currentStep: number; totalSteps: number; currentStepName: string; progress: number; estimatedTimeRemaining?: number } | null>(null);
  const [result, setResult] = useState<BeatPipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  if (!isOpen || !beat) return null;

  const hasPrompts = beat.prompts && beat.prompts.cinematic;
  // Vertical prompts are auto-generated from cinematic, so we only use cinematic
  const selectedPrompt: SwarmUIPrompt | null = beat.prompts?.cinematic || null;

  const handleGenerate = async () => {
    if (!selectedPrompt || !beat.beatId) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    const abortCtrl = new AbortController();
    setAbortController(abortCtrl);
    setProgress({ currentStep: 0, totalSteps: 3, currentStepName: 'Initializing...', progress: 0 });

    const progressCallback: ProgressCallback = (progressData) => {
      setProgress({
        currentStep: progressData.currentStep,
        totalSteps: progressData.totalSteps,
        currentStepName: progressData.currentStepName,
        progress: progressData.progress,
        estimatedTimeRemaining: progressData.estimatedTimeRemaining,
      });
    };

    try {
      // Always use 'cinematic' since vertical is auto-generated from cinematic
      const pipelineResult = await processSingleBeat(
        beat.beatId,
        'cinematic',
        sessionTimestamp,
        progressCallback,
        abortCtrl
      );

      setResult(pipelineResult);
      
      if (!pipelineResult.success) {
        setError(pipelineResult.error || 'Image generation failed');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Operation cancelled by user');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
      }
      setResult(null);
    } finally {
      setIsGenerating(false);
      setProgress(null);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  const formatTime = (ms?: number): string => {
    if (!ms) return 'Calculating...';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const handleOpenInExplorer = (path: string) => {
    // Extract directory from path
    const pathParts = path.split(/[\\/]/);
    const directory = pathParts.slice(0, -1).join('\\');
    
    // Use Windows file explorer command
    if (window.electron && window.electron.shell) {
      window.electron.shell.showItemInFolder(path);
    } else {
      // Fallback: try to open directory
      alert(`Path: ${path}\n\nDirectory: ${directory}\n\nPlease open this directory in File Explorer.`);
    }
  };

  const getResultImagePaths = (): string[] => {
    if (!result?.success || !result.generationResult?.imagePaths) return [];
    return result.generationResult.imagePaths;
  };

  const getOrganizedPaths = (): string[] => {
    if (!result?.success || !result.organizationResult?.organizedImages) return [];
    return result.organizationResult.organizedImages.map(img => img.destinationPath);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-brand-blue">
            Create Image - Scene {sceneNumber} Beat {beat.beatId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Beat Script Text */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Beat Script:</h3>
          <blockquote className="border-l-4 border-gray-600 pl-4 text-gray-300 italic whitespace-pre-wrap">
            {beat.beat_script_text || 'No script text available'}
          </blockquote>
        </div>

        {/* Prompt Display */}
        {hasPrompts && beat.prompts?.cinematic && (
          <div className="mb-4">
            <div className="mb-2">
              <span className="text-sm font-semibold text-gray-400">Prompt (Cinematic 16:9)</span>
              <span className="text-xs text-gray-500 ml-2">(Vertical 9:16 prompts generated separately for video shorts)</span>
            </div>
            <div className="bg-gray-900 p-3 rounded-md border border-gray-700">
              <p className="text-sm text-gray-200 font-mono whitespace-pre-wrap">
                {beat.prompts.cinematic.prompt}
              </p>
              <div className="text-xs text-gray-400 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 mt-2">
                <span><span className="font-semibold">Model:</span> {beat.prompts.cinematic.model}</span>
                <span><span className="font-semibold">Size:</span> {beat.prompts.cinematic.width}x{beat.prompts.cinematic.height}</span>
                <span><span className="font-semibold">Steps:</span> {beat.prompts.cinematic.steps}</span>
                <span><span className="font-semibold">CFG:</span> {beat.prompts.cinematic.cfgscale}</span>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={!selectedPrompt || isGenerating}
            className={`flex-1 py-3 px-4 rounded-md font-semibold transition-colors ${
              !selectedPrompt || isGenerating
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-brand-blue hover:bg-brand-purple text-white'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              'Create Image'
            )}
          </button>
          {isGenerating && (
            <button
              onClick={handleCancel}
              className="px-4 py-3 bg-red-700 hover:bg-red-600 text-white rounded-md font-semibold transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Progress Display */}
        {progress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{progress.currentStepName}</span>
              <span>{progress.currentStep} / {progress.totalSteps}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-brand-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            {progress.estimatedTimeRemaining && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-200 text-sm">{error}</p>
            <button
              onClick={handleGenerate}
              className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Success Display */}
        {result?.success && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-green-900/50 border border-green-700 rounded-md">
              <p className="text-green-200 text-sm font-semibold mb-2">✅ Image created successfully!</p>
              
              {/* Organized Image Paths */}
              {getOrganizedPaths().length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-semibold">DaVinci Project Paths:</p>
                  {getOrganizedPaths().map((path, idx) => (
                    <div key={idx} className="bg-gray-800 p-2 rounded flex items-center gap-2">
                      <code className="text-xs text-gray-300 flex-1 truncate">{path}</code>
                      <button
                        onClick={() => handleCopyPath(path)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Copy path"
                      >
                        {copiedPath ? <CheckIcon /> : <CopyIcon />}
                      </button>
                      <button
                        onClick={() => handleOpenInExplorer(path)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Original Image Paths (if no organized paths) */}
              {getOrganizedPaths().length === 0 && getResultImagePaths().length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-semibold">Created Image Paths:</p>
                  {getResultImagePaths().map((path, idx) => (
                    <div key={idx} className="bg-gray-800 p-2 rounded flex items-center gap-2">
                      <code className="text-xs text-gray-300 flex-1 truncate">{path}</code>
                      <button
                        onClick={() => handleCopyPath(path)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Copy path"
                      >
                        {copiedPath ? <CheckIcon /> : <CopyIcon />}
                      </button>
                      <button
                        onClick={() => handleOpenInExplorer(path)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Extend Window interface for electron API
declare global {
  interface Window {
    electron?: {
      shell?: {
        showItemInFolder: (path: string) => void;
      };
    };
  }
}

