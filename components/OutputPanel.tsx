import React, { useState } from 'react';
import type { AnalyzedEpisode, BeatAnalysis, ImageDecision, SwarmUIPrompt, PipelineProgress } from '../types';
import { LightbulbIcon, LinkIcon, ClockIcon, CopyIcon, CheckIcon } from './icons';
import { PipelineProgressModal } from './PipelineProgressModal';
import { NewImageModal } from './NewImageModal';
import { processEpisodeCompletePipeline } from '../services/pipelineClientService';
import { getLatestSession, getSessionTimestampFromLocalStorage, getFullLocalStorageSession, saveSessionToRedis, getSessionByTimestamp } from '../services/redisService';
import type { ProgressCallback } from '../services/pipelineService';
import type { PipelineResult } from '../types';

interface OutputPanelProps {
  analysis: AnalyzedEpisode | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  onReset: () => void;
  onEditBeat?: (beatId: string) => void;
  sessionTimestamp?: number;
}

const ImageDecisionDisplay: React.FC<{ 
  decision: ImageDecision; 
  onClick?: () => void;
  clickable?: boolean;
}> = ({ decision, onClick, clickable = false }) => {
  const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5";
  let content: React.ReactNode;

  switch (decision.type) {
    case 'NEW_IMAGE':
      content = (
        clickable ? (
          <button
            onClick={onClick}
            className={`${baseClasses} bg-green-800 text-green-200 hover:bg-green-700 cursor-pointer transition-colors`}
            title="Click to edit this beat"
          >
            New Image
          </button>
        ) : (
          <span className={`${baseClasses} bg-green-800 text-green-200`}>New Image</span>
        )
      );
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
    // Vertical (9:16) prompts are generated separately for video short marketing content
    // Only cinematic (16:9) prompts are part of beat-based analysis
    if (!beat.prompts) return null;

    return (
        <div className="mt-4 pt-4 border-t border-brand-purple/20">
            <div className="mb-3">
                <span className="text-sm font-semibold text-gray-400">Prompt (Cinematic 16:9)</span>
            </div>
            <div>
                <PromptDisplay promptData={beat.prompts.cinematic} title="Cinematic (16:9)" />
            </div>
        </div>
    );
};


const BeatAnalysisCard: React.FC<{ 
  beat: BeatAnalysis; 
  sceneNumber: number; 
  beatIndex: number;
  onEditBeat?: (beatId: string) => void;
}> = ({ beat, sceneNumber, beatIndex, onEditBeat }) => {
    if (!beat.imageDecision) {
        return (
            <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-500 text-sm">Scene {sceneNumber} - Beat #{beatIndex + 1} - No image decision available</p>
            </div>
        );
    }

    return (
    <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-300">
                Scene {sceneNumber} - Beat #{beatIndex + 1}
            </h4>
            <div className="flex items-center gap-2">
              <ImageDecisionDisplay 
                decision={beat.imageDecision} 
                onClick={() => onEditBeat?.(beat.beatId)}
                clickable={beat.imageDecision.type === 'NEW_IMAGE' && !!onEditBeat}
              />
            </div>
        </div>

        <blockquote className="border-l-4 border-gray-600 pl-4 text-gray-400 italic mb-4 whitespace-pre-wrap">
            {beat.beat_script_text || 'No script text available'}
        </blockquote>

        <div className="space-y-3 text-sm">
            {beat.locationAttributes && Array.isArray(beat.locationAttributes) && beat.locationAttributes.length > 0 && (
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
                {beat.imageDecision.type === 'REUSE_IMAGE' && beat.imageDecision.reuseSourceBeatLabel && (
                    <div className="flex items-start gap-2 text-yellow-300 mb-2 p-2 bg-yellow-900/30 rounded-md">
                         <span className="text-yellow-400 mt-0.5 flex-shrink-0"><LinkIcon /></span>
                         <p><span className="font-semibold">Reuse instruction:</span> Reuse image from <span className="font-bold">{beat.imageDecision.reuseSourceBeatLabel}</span>.</p>
                    </div>
                )}
                <div className="flex items-start gap-2">
                    <span className="text-brand-purple mt-0.5 flex-shrink-0"><LightbulbIcon /></span>
                    <p className="text-gray-300"><span className="font-semibold text-gray-400">Reasoning:</span> {beat.imageDecision.reason || 'No reasoning provided'}</p>
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
        {beat.imageDecision.type !== 'NO_IMAGE' && <PromptTabs beat={beat} />}
    </div>
    );
};


const analysisSteps = [
    { id: 1, text: "Initializing...", trigger: "Initializing analysis" },
    { id: 2, text: "Connecting to AI API...", trigger: "Connecting to" },
    { id: 3, text: "Compacting Context...", trigger: "Compacting episode context" },
    { id: 4, text: "Sending Script to AI...", trigger: "Sending script to" },
    { id: 5, text: "Processing AI Response...", trigger: "Processing" },
    { id: 6, text: "Post-processing Analysis...", trigger: "Post-processing analysis" },
    { id: 7, text: "Generating SwarmUI Prompts...", trigger: "Generating SwarmUI prompts" },
];

const LoadingStateDisplay = ({ loadingMessage }: { loadingMessage: string }) => {
    // Extract provider name from loading message
    const getProviderFromMessage = (message: string): string => {
        if (message.includes('QWEN')) return 'Qwen';
        if (message.includes('GEMINI')) return 'Gemini';
        if (message.includes('CLAUDE')) return 'Claude';
        if (message.includes('OPENAI')) return 'OpenAI';
        if (message.includes('XAI')) return 'XAI';
        if (message.includes('DEEPSEEK')) return 'DeepSeek';
        if (message.includes('GLM')) return 'GLM';
        return 'AI';
    };

    const provider = getProviderFromMessage(loadingMessage);
    
    // Create dynamic steps based on provider and include prompt generation steps
    const dynamicSteps = [
        { id: 1, text: "Initializing...", trigger: "Initializing analysis" },
        { id: 2, text: `Connecting to ${provider} API...`, trigger: "Connecting to" },
        { id: 3, text: "Compacting Context...", trigger: "Compacting episode context" },
        { id: 4, text: `Sending Script to ${provider}...`, trigger: "Sending script to" },
        { id: 5, text: `Processing ${provider} Response...`, trigger: "Processing" },
        { id: 6, text: "Post-processing Analysis...", trigger: "Post-processing analysis" },
        { id: 7, text: "Initializing Prompt Generation...", trigger: "Initializing hierarchical" },
        { id: 8, text: "Verifying API Key...", trigger: "Verifying API key" },
        { id: 9, text: "Processing Beats for Prompts...", trigger: "Processing" },
        { id: 10, text: "Sending to Gemini API...", trigger: "Sending batch" },
        { id: 11, text: "Applying LORA Substitutions...", trigger: "Applying LORA" },
        { id: 12, text: "✅ Prompt Generation Complete!", trigger: "Prompt generation complete" },
    ];

    let currentStepIndex = -1;
    // Check in reverse order to match more specific triggers first
    for (let i = dynamicSteps.length - 1; i >= 0; i--) {
        if (loadingMessage.toLowerCase().includes(dynamicSteps[i].trigger.toLowerCase())) {
            currentStepIndex = i;
            break; // Use first match found (most specific due to reverse iteration)
        }
    }
    // Special cases for completion
    if (loadingMessage.includes("Prompt generation complete") || loadingMessage.includes("✅ Prompt generation")) {
        currentStepIndex = dynamicSteps.length - 1; // Last step (completion)
    } else if (loadingMessage.startsWith("✅") || loadingMessage.includes("completed")) {
        // Generic completion - find the highest completed step
        currentStepIndex = Math.max(currentStepIndex, dynamicSteps.length - 1);
    }

    return (
        <div className="text-center w-full max-w-md">
            <h3 className="text-2xl font-semibold text-brand-purple mb-8">Analysis in Progress</h3>
            <div className="space-y-4">
                {dynamicSteps.map((step, index) => {
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
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

export const OutputPanel: React.FC<OutputPanelProps> = ({ analysis, isLoading, loadingMessage, error, onReset, onEditBeat, sessionTimestamp }) => {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<PipelineProgress | null>(null);
  const [bulkResult, setBulkResult] = useState<PipelineResult | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [selectedBeat, setSelectedBeat] = useState<{ beat: BeatAnalysis; sceneNumber: number } | null>(null);
  const [isNewImageModalOpen, setIsNewImageModalOpen] = useState(false);
  const [bulkAbortController, setBulkAbortController] = useState<AbortController | null>(null);

  // Count prompts for bulk processing
  const hasPrompts = analysis?.scenes?.some(scene =>
    scene.beats?.some(beat =>
      beat.imageDecision?.type === 'NEW_IMAGE' && beat.prompts
    )
  ) ?? false;

  const promptCount = analysis?.scenes?.reduce((total, scene) => {
    return total + (scene.beats?.filter(beat =>
      beat.imageDecision?.type === 'NEW_IMAGE' && beat.prompts
    ).length ?? 0);
  }, 0) ?? 0;

  const handleBulkProcess = async () => {
    console.log('[OutputPanel] handleBulkProcess called');
    console.log('[OutputPanel] analysis:', analysis);
    console.log('[OutputPanel] sessionTimestamp:', sessionTimestamp);
    
    setIsBulkProcessing(true);
    setBulkError(null);
    setBulkResult(null);
    const abortController = new AbortController();
    setBulkAbortController(abortController);
    
    setBulkProgress({
      currentStep: 0,
      totalSteps: 1,
      currentStepName: 'Fetching session...',
      progress: 0,
    });

    // Get session timestamp - declared outside try block so it's available in catch
    let timestamp = sessionTimestamp;

    try {
      console.log('[OutputPanel] Starting pipeline process...');
      if (!timestamp) {
        // Try to get timestamp from localStorage first
        timestamp = getSessionTimestampFromLocalStorage() || undefined;
        
        if (!timestamp) {
          // Get latest session - it contains the timestamp
          console.log('[OutputPanel] No sessionTimestamp provided, fetching latest session...');
          const sessionResponse = await getLatestSession();
          if (!sessionResponse.success || !sessionResponse.data) {
            throw new Error('Failed to get session. Please ensure you have saved your analysis by clicking "Analyze Script".');
          }
          
          // Extract timestamp from the saved session data
          // The session data should have a timestamp field
          if (sessionResponse.data.timestamp) {
            timestamp = sessionResponse.data.timestamp;
            console.log('[OutputPanel] Found session timestamp:', timestamp);
          } else {
            // If timestamp not in data, try to extract from session key if available
            // This is a fallback - the timestamp should be in the data
            throw new Error('Session found but no timestamp available. Please re-analyze the episode to create a new session.');
          }
        }
      }
      
      console.log('[OutputPanel] Using session timestamp:', timestamp);

      // Ensure session exists in Redis before calling pipeline
      // This handles the case where session was saved to localStorage but not Redis
      const sessionCheck = await getSessionByTimestamp(timestamp);
      if (!sessionCheck.success) {
        console.log('[OutputPanel] Session not found in Redis, attempting to sync from localStorage...');
        const fullLocalSession = getFullLocalStorageSession();

        // DEBUG: Log what's in localStorage
        if (fullLocalSession) {
          console.log('[OutputPanel] ========== LOCALSTORAGE SESSION DATA ==========');
          console.log('[OutputPanel] Timestamp:', fullLocalSession.timestamp);
          console.log('[OutputPanel] Episode:', fullLocalSession.analyzedEpisode?.episodeNumber, '-', fullLocalSession.analyzedEpisode?.title);
          console.log('[OutputPanel] Scenes count:', fullLocalSession.analyzedEpisode?.scenes?.length);

          // Log first beat prompt to verify data integrity
          const firstScene = fullLocalSession.analyzedEpisode?.scenes?.[0];
          const firstBeatWithPrompt = firstScene?.beats?.find((b: any) => b.prompts?.cinematic);
          if (firstBeatWithPrompt) {
            console.log('[OutputPanel] First beat with prompt:', firstBeatWithPrompt.beatId);
            console.log('[OutputPanel] First prompt preview:', firstBeatWithPrompt.prompts?.cinematic?.prompt?.substring(0, 300));
          } else {
            console.warn('[OutputPanel] ⚠️ No beats with cinematic prompts found in localStorage session!');
          }
          console.log('[OutputPanel] ================================================');
        }

        if (fullLocalSession && fullLocalSession.timestamp === timestamp) {
          console.log('[OutputPanel] Found matching localStorage session, syncing to Redis...');

          // Ensure required fields exist (localStorage might be missing some)
          const sessionToSync = {
            ...fullLocalSession,
            scriptText: fullLocalSession.scriptText || `[Restored session - Episode ${fullLocalSession.analyzedEpisode?.episodeNumber}]`,
            episodeContext: fullLocalSession.episodeContext || `[Restored context for ${fullLocalSession.analyzedEpisode?.title}]`,
            storyUuid: fullLocalSession.storyUuid || `restored-${timestamp}`,
            timestamp: timestamp,
          };

          console.log('[OutputPanel] Session data to sync:', {
            hasScriptText: !!sessionToSync.scriptText,
            hasEpisodeContext: !!sessionToSync.episodeContext,
            hasStoryUuid: !!sessionToSync.storyUuid,
            hasAnalyzedEpisode: !!sessionToSync.analyzedEpisode,
          });

          const saveResult = await saveSessionToRedis(sessionToSync);
          if (saveResult.success && saveResult.storage !== 'localStorage') {
            console.log('[OutputPanel] ✅ Session synced to Redis successfully');
          } else if (saveResult.storage === 'localStorage') {
            // It fell back to localStorage, which means Redis save failed
            // This won't help us - the pipeline needs Redis
            throw new Error('Failed to sync to Redis - only saved to localStorage. Check if Redis server is running.');
          } else {
            throw new Error(`Failed to sync session to Redis: ${saveResult.error || 'Unknown error'}`);
          }
        } else if (fullLocalSession) {
          // localStorage has a different session - use that timestamp instead
          console.log('[OutputPanel] localStorage has different timestamp, using localStorage session...');
          timestamp = fullLocalSession.timestamp;
          const saveResult = await saveSessionToRedis(fullLocalSession);
          if (saveResult.success) {
            console.log('[OutputPanel] ✅ Session synced to Redis with timestamp:', timestamp);
          } else {
            throw new Error(`Failed to sync session to Redis: ${saveResult.error || 'Unknown error'}`);
          }
        } else {
          throw new Error('Session not found in Redis and no valid session in localStorage');
        }
      } else {
        console.log('[OutputPanel] ✅ Session found in Redis');
        // DEBUG: Log what Redis has for comparison
        console.log('[OutputPanel] ========== REDIS SESSION DATA ==========');
        console.log('[OutputPanel] Episode:', sessionCheck.data?.analyzedEpisode?.episodeNumber, '-', sessionCheck.data?.analyzedEpisode?.title);
        console.log('[OutputPanel] Scenes count:', sessionCheck.data?.analyzedEpisode?.scenes?.length);

        const firstScene = sessionCheck.data?.analyzedEpisode?.scenes?.[0];
        const firstBeatWithPrompt = firstScene?.beats?.find((b: any) => b.prompts?.cinematic);
        if (firstBeatWithPrompt) {
          console.log('[OutputPanel] First beat with prompt:', firstBeatWithPrompt.beatId);
          console.log('[OutputPanel] First prompt preview:', firstBeatWithPrompt.prompts?.cinematic?.prompt?.substring(0, 300));
        } else {
          console.warn('[OutputPanel] ⚠️ No beats with cinematic prompts found in Redis session!');
        }
        console.log('[OutputPanel] ===========================================');

        // CRITICAL: Check if Redis data matches what we expect (from analysis prop or localStorage)
        // If Redis has DIFFERENT data (e.g., old test session), force sync from localStorage
        const fullLocalSession = getFullLocalStorageSession();
        const redisTitle = sessionCheck.data?.analyzedEpisode?.title;
        const localTitle = fullLocalSession?.analyzedEpisode?.title;
        const analysisTitle = analysis?.title;

        console.log('[OutputPanel] Checking for data mismatch...');
        console.log('[OutputPanel]   fullLocalSession exists:', !!fullLocalSession);
        console.log('[OutputPanel]   redisTitle:', redisTitle);
        console.log('[OutputPanel]   localTitle:', localTitle);
        console.log('[OutputPanel]   analysisTitle:', analysisTitle);

        // Check mismatch against BOTH localStorage and current analysis
        const shouldForceSync = (localTitle && redisTitle !== localTitle) ||
                                (analysisTitle && redisTitle !== analysisTitle);

        if (shouldForceSync) {
          console.warn(`[OutputPanel] ⚠️ DATA MISMATCH DETECTED!`);
          console.warn(`[OutputPanel]   Redis has: "${redisTitle}"`);
          console.warn(`[OutputPanel]   localStorage has: "${localTitle}"`);
          console.warn(`[OutputPanel]   Current analysis: "${analysisTitle}"`);

          // Prefer localStorage if it has correct data, otherwise build from analysis prop
          if (localTitle && localTitle !== redisTitle && localTitle === analysisTitle) {
            // localStorage has the correct data, sync it
            console.log('[OutputPanel] Syncing from localStorage (has correct data)...');
            const saveResult = await saveSessionToRedis(fullLocalSession);
            if (saveResult.success) {
              console.log('[OutputPanel] ✅ Force-synced localStorage to Redis');
            } else {
              throw new Error(`Failed to force-sync session: ${saveResult.error || 'Unknown error'}`);
            }
          } else {
            // localStorage doesn't have correct data either - need to create new session
            // We only have the analysis prop, not scriptText/episodeContext/storyUuid
            // Generate a NEW timestamp and save with minimal data
            console.log('[OutputPanel] ⚠️ localStorage also has stale data!');
            console.log('[OutputPanel] Creating NEW session from current analysis...');

            const newTimestamp = Date.now();
            const minimalSessionData = {
              scriptText: `[Auto-saved from pipeline - Episode ${analysis?.episodeNumber}]`,
              episodeContext: `[Auto-saved context for ${analysis?.title}]`,
              storyUuid: 'auto-generated-' + newTimestamp,
              analyzedEpisode: analysis,
              timestamp: newTimestamp,
            };

            const saveResult = await saveSessionToRedis(minimalSessionData as any);
            if (saveResult.success) {
              console.log('[OutputPanel] ✅ Created new session with timestamp:', newTimestamp);
              // Update the timestamp we'll use for the pipeline
              timestamp = newTimestamp;
              console.log('[OutputPanel] Pipeline will now use new timestamp:', timestamp);
            } else {
              throw new Error(`Failed to create new session: ${saveResult.error || 'Unknown error'}`);
            }
          }
        } else {
          console.log('[OutputPanel] No mismatch detected, using Redis data as-is');
        }
      }

      const progressCallback: ProgressCallback = (progressData) => {
        setBulkProgress({
          currentStep: progressData.currentStep,
          totalSteps: progressData.totalSteps,
          currentStepName: progressData.currentStepName,
          progress: progressData.progress,
          estimatedTimeRemaining: progressData.estimatedTimeRemaining,
        });
      };

      console.log('[OutputPanel] Calling processEpisodeCompletePipeline with timestamp:', timestamp);
      const result = await processEpisodeCompletePipeline(timestamp, progressCallback, abortController);
      console.log('[OutputPanel] Pipeline result:', result);
      setBulkResult(result);

      if (!result.success) {
        const errorMsg = result.errors?.join(', ') || 'Pipeline processing failed';
        console.error('[OutputPanel] Pipeline failed:', errorMsg);
        setBulkError(errorMsg);
      } else {
        console.log('[OutputPanel] Pipeline succeeded!');
      }
    } catch (err) {
      console.error('[OutputPanel] Error in handleBulkProcess:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setBulkError('Operation cancelled by user');
        const finalTimestamp = sessionTimestamp || timestamp || 0;
        setBulkResult({
          success: false,
          sessionTimestamp: finalTimestamp,
          episodeNumber: analysis?.episodeNumber || 0,
          episodeTitle: analysis?.title || '',
          totalPrompts: 0,
          successfulGenerations: 0,
          failedGenerations: 0,
          generationResults: [],
          errors: ['Operation cancelled'],
        });
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setBulkError(errorMessage);
      }
    } finally {
      setIsBulkProcessing(false);
      setBulkAbortController(null);
    }
  };

  const handleBulkCancel = () => {
    if (bulkAbortController) {
      bulkAbortController.abort();
      setBulkAbortController(null);
    }
  };

  const handleEditBeat = (beatId: string) => {
    if (!analysis) return;

    // Find the beat
    for (const scene of analysis.scenes) {
      const beat = scene.beats?.find(b => b.beatId === beatId);
      if (beat) {
        setSelectedBeat({ beat, sceneNumber: scene.sceneNumber });
        setIsNewImageModalOpen(true);
        return;
      }
    }
  };

  const handleCloseNewImageModal = () => {
    setIsNewImageModalOpen(false);
    setSelectedBeat(null);
  };
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
        <button onClick={onReset} className="bg-brand-blue hover:bg-brand-purple text-white font-bold py-2 px-4 rounded mt-4">Try Again</button>
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

  if (!analysis.scenes || !Array.isArray(analysis.scenes) || analysis.scenes.length === 0) {
    return (
      <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg h-full overflow-y-auto">
        <div className="border-b-2 border-brand-purple/50 pb-4 mb-6">
          <h2 className="text-3xl font-bold text-brand-blue">Episode {analysis.episodeNumber}: {analysis.title}</h2>
        </div>
        <div className="text-center text-gray-500 mt-8">
          <p>No scenes found in analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg h-full overflow-y-auto">
      <div className="border-b-2 border-brand-purple/50 pb-4 mb-6 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-brand-blue">Episode {analysis.episodeNumber}: {analysis.title}</h2>
        {hasPrompts && (
          <button
            onClick={handleBulkProcess}
            disabled={isBulkProcessing}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors ${
              isBulkProcessing
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-brand-blue hover:bg-brand-purple text-white'
            }`}
            title={`Create all images for ${promptCount} beats`}
          >
            {isBulkProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Create All Images ({promptCount})
              </>
            )}
          </button>
        )}
      </div>
      <div className="space-y-8">
        {analysis.scenes.map((scene, sceneIndex) => (
          <details key={`scene-${scene.sceneNumber}-${sceneIndex}`} open className="bg-gray-900/50 p-4 rounded-lg">
            <summary className="text-2xl font-semibold text-brand-purple cursor-pointer">
              Scene {scene.sceneNumber}: {scene.title}
            </summary>
            <div className="mt-4 space-y-4">
              {scene.beats && Array.isArray(scene.beats) && scene.beats.length > 0 ? (
                scene.beats.map((beat, beatIndex) => (
                  <BeatAnalysisCard
                    key={`${beat.beatId}-${beatIndex}`}
                    beat={beat} 
                    sceneNumber={scene.sceneNumber} 
                    beatIndex={beatIndex}
                    onEditBeat={handleEditBeat}
                  />
                ))
              ) : (
                <p className="text-gray-500 text-sm">No beats found in this scene.</p>
              )}
            </div>
          </details>
        ))}
      </div>

      {/* Bulk Processing Progress Modal */}
      <PipelineProgressModal
        isOpen={isBulkProcessing || !!bulkResult || !!bulkError}
        progress={bulkProgress || {
          currentStep: 0,
          totalSteps: 1,
          currentStepName: bulkResult ? 'Complete!' : 'Processing...',
          progress: bulkResult ? 100 : 0,
        }}
        onClose={() => {
          setBulkProgress(null);
          setBulkResult(null);
          setBulkError(null);
        }}
        onCancel={isBulkProcessing ? handleBulkCancel : undefined}
      />

      {/* Bulk Processing Result Display */}
      {(bulkResult || bulkError) && !isBulkProcessing && (
        <div className={`mt-4 p-4 rounded-md ${
          bulkResult?.success
            ? 'bg-green-900/50 border border-green-700'
            : 'bg-red-900/50 border border-red-700'
        }`}>
          {bulkResult?.success ? (
            <div>
              <h3 className="text-lg font-semibold text-green-200 mb-2">
                ✅ Pipeline Complete!
              </h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Episode: {bulkResult.episodeNumber} - {bulkResult.episodeTitle}</p>
                <p>Total Prompts: {bulkResult.totalPrompts}</p>
                <p>Successful: {bulkResult.successfulGenerations}</p>
                <p>Failed: {bulkResult.failedGenerations}</p>
                {bulkResult.organizationResult?.episodeProjectPath && (
                  <p className="mt-2">
                    <span className="font-semibold">DaVinci Project:</span>{' '}
                    <code className="text-xs bg-gray-800 px-2 py-1 rounded">
                      {bulkResult.organizationResult.episodeProjectPath}
                    </code>
                  </p>
                )}
                {bulkResult.duration && (
                  <p className="text-xs text-gray-400">
                    Duration: {Math.round(bulkResult.duration / 1000)}s
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-red-200 mb-2">
                ❌ Pipeline Failed
              </h3>
              <div className="text-sm text-red-200">
                <p className="whitespace-pre-wrap">{bulkError}</p>
              </div>
              {bulkResult?.errors && bulkResult.errors.length > 0 && (
                <div className="mt-2">
                  <ul className="text-sm text-red-200 list-disc list-inside">
                    {bulkResult.errors.map((err, idx) => (
                      <li key={idx} className="whitespace-pre-wrap">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {bulkResult && !bulkResult.success && (
                <div className="mt-3">
                  <button
                    onClick={handleBulkProcess}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md font-semibold transition-colors text-sm"
                  >
                    🔄 Retry Pipeline
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Image Modal */}
      {selectedBeat && (
        <NewImageModal
          isOpen={isNewImageModalOpen}
          beat={selectedBeat.beat}
          sceneNumber={selectedBeat.sceneNumber}
          onClose={handleCloseNewImageModal}
          sessionTimestamp={sessionTimestamp}
        />
      )}
    </div>
  );
};