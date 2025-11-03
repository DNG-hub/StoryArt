import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import RefinementWorkspace from './components/RefinementWorkspace';
import { ServiceStatusPanel } from './components/ServiceStatusPanel';
import { analyzeScript } from './services/geminiService';
import { getEpisodeContext } from './services/contextService';
import { ensureServiceRunning, type ServiceStatus } from './services/storytellerService';
import { parseEpisodeNumber, postProcessAnalysis } from './utils';
import type { AnalyzedEpisode, EpisodeStyleConfig, EnhancedEpisodeContext, SceneContext, BeatAnalysis, LLMSelection, LLMProvider } from './types';
import { DEFAULT_SCRIPT, DEFAULT_EPISODE_CONTEXT } from './constants';
import { GithubIcon, PanelExpandIcon } from './components/icons';
import { generateSwarmUiPrompts, generateHierarchicalSwarmUiPrompts } from './services/promptGenerationService';
import { useSwarmUIExport } from './hooks/useSwarmUIExport';
import { type SwarmUIExportData } from './types';

type RetrievalMode = 'manual' | 'database';

// IMPLEMENTATION PLAN & PROJECT VISION
// This application is being developed in phases. For a detailed breakdown of current
// and future features, please refer to the PLAN.md file in the root directory.
//
// - PHASE 1 (In Progress): Content Generation & UI Expansion.
//   - Dual prompt generation (16:9 Cinematic + 9:16 Vertical).
//   - Episode-wide style configuration.
//   - UI overhaul to support new content types.
//   - Future: AI-generated narrative hooks for social media.
//
// - PHASE 2 (Planned): SwarmUI Automation & Workflow Integration.
//   - Direct API calls to SwarmUI for automated image generation.
//   - Conditional UI for automation vs. manual workflows.
//   - Batch processing and export tools.

// Main Dashboard Component
function Dashboard({
  scriptText,
  setScriptText,
  episodeContext,
  setEpisodeContext,
  analyzedEpisode,
  setAnalyzedEpisode,
  isLoading,
  setIsLoading,
  loadingMessage,
  setLoadingMessage,
  error,
  setError,
  isContextFetching,
  setIsContextFetching,
  contextError,
  setContextError,
  retrievalMode,
  setRetrievalMode,
  storyUuid,
  setStoryUuid,
  isInputCollapsed,
  setIsInputCollapsed,
  styleConfig,
  setStyleConfig,
  useHierarchicalPrompts,
  setUseHierarchicalPrompts,
  selectedLLM,
  setSelectedLLM,
  handleAnalyze,
  handleFetchContext,
  handleReset,
  handleNavigateToRefine,
  handleRestoreFromRedis
}: {
  scriptText: string;
  setScriptText: (text: string) => void;
  episodeContext: string;
  setEpisodeContext: (context: string) => void;
  analyzedEpisode: AnalyzedEpisode | null;
  setAnalyzedEpisode: (episode: AnalyzedEpisode | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isContextFetching: boolean;
  setIsContextFetching: (fetching: boolean) => void;
  contextError: string | null;
  setContextError: (error: string | null) => void;
  retrievalMode: RetrievalMode;
  setRetrievalMode: (mode: RetrievalMode) => void;
  storyUuid: string;
  setStoryUuid: (uuid: string) => void;
  isInputCollapsed: boolean;
  setIsInputCollapsed: (collapsed: boolean) => void;
  styleConfig: EpisodeStyleConfig;
  setStyleConfig: (config: EpisodeStyleConfig) => void;
  useHierarchicalPrompts: boolean;
  setUseHierarchicalPrompts: (use: boolean) => void;
  selectedLLM: LLMProvider;
  setSelectedLLM: (selection: LLMProvider) => void;
  handleAnalyze: () => Promise<void>;
  handleFetchContext: () => Promise<void>;
  handleReset: () => void;
  handleNavigateToRefine: (beatId: string) => void;
  handleRestoreFromRedis: (data: SwarmUIExportData) => void;
}) {
  const {
    isExporting: isSavingToSwarmUI,
    exportError: saveToSwarmUIError,
    lastExportId,
    exportToSwarmUI,
    clearError: clearSwarmUIError,
  } = useSwarmUIExport();

  const handleSaveToSwarmUI = async () => {
    if (!analyzedEpisode) {
      return;
    }

    try {
      const exportId = await exportToSwarmUI(scriptText, episodeContext, analyzedEpisode, storyUuid);
      if (exportId) {
        console.log('Successfully saved to SwarmUI with ID:', exportId);
      }
    } catch (error) {
      console.error('Failed to save to SwarmUI:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto flex flex-col min-h-screen">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">
            StoryTeller AI Beat Analysis & Prompt Architect
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            From script to SwarmUI prompt: An AI-powered production pipeline.
          </p>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-9 gap-8 flex-grow relative">
          {!isInputCollapsed && (
            <div className="xl:col-span-4">
              <InputPanel
                script={scriptText}
                setScript={setScriptText}
                episodeContext={episodeContext}
                setEpisodeContext={setEpisodeContext}
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                isContextFetching={isContextFetching}
                contextError={contextError}
                retrievalMode={retrievalMode}
                onRetrievalModeChange={setRetrievalMode}
                storyUuid={storyUuid}
                setStoryUuid={setStoryUuid}
                onToggleCollapse={() => setIsInputCollapsed(true)}
                styleConfig={styleConfig}
                setStyleConfig={setStyleConfig}
                useHierarchicalPrompts={useHierarchicalPrompts}
                onUseHierarchicalPromptsChange={setUseHierarchicalPrompts}
                selectedLLM={selectedLLM}
                onSelectedLLMChange={setSelectedLLM}
                onRestoreFromRedis={handleRestoreFromRedis}
              />
            </div>
          )}
          <div className={isInputCollapsed ? "xl:col-span-9" : "xl:col-span-5"}>
            <OutputPanel
              analysis={analyzedEpisode}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              error={error}
              onReset={handleReset}
              onNavigateToRefine={handleNavigateToRefine}
              onSaveToSwarmUI={handleSaveToSwarmUI}
              isSavingToSwarmUI={isSavingToSwarmUI}
              saveToSwarmUIError={saveToSwarmUIError}
            />
          </div>
           {isInputCollapsed && (
            <button
              onClick={() => setIsInputCollapsed(false)}
              className="fixed top-1/2 left-4 -translate-y-1/2 z-10 p-2 bg-gray-800 rounded-full text-white hover:bg-brand-blue transition-colors shadow-lg"
              aria-label="Expand Input Panel"
            >
              <PanelExpandIcon />
            </button>
          )}
        </main>

        <footer className="text-center mt-12 py-4 border-t border-gray-800">
          <a
            href="https://github.com/DNG-hub/StoryArt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <GithubIcon />
            View Project on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}

// App wrapper that provides router context
function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const navigate = useNavigate();
  const [scriptText, setScriptText] = useState<string>(DEFAULT_SCRIPT);
  const [episodeContext, setEpisodeContext] = useState<string>(DEFAULT_EPISODE_CONTEXT);
  const [analyzedEpisode, setAnalyzedEpisode] = useState<AnalyzedEpisode | null>(null);

  // Service status state
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus & { message?: string }>({
    isRunning: false,
    isStarting: false
  });
  const [showServiceStatus, setShowServiceStatus] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setError(null);
    setAnalyzedEpisode(null);
  };

  // Enhanced functions for refinement workspace using real episode context data
  const getBeatData = (beatId: string) => {
    if (!analyzedEpisode) return null;

    // Find the beat across all scenes
    for (const scene of analyzedEpisode.scenes) {
      const beat = scene.beats.find(b => b.beatId === beatId);
      if (beat) {
        // Parse the actual episode context data
        let parsedEpisodeContext: any = null;
        try {
          parsedEpisodeContext = JSON.parse(episodeContext);
        } catch (error) {
          console.warn('Failed to parse episode context, using fallback data:', error);
        }

        // Find the matching scene from the episode context data
        const contextScene = parsedEpisodeContext?.episode?.scenes?.find((s: any) =>
          s.scene_number === scene.sceneNumber
        );

        // Build real scene context from parsed data
        const sceneContext: SceneContext = {
          scene_number: scene.sceneNumber,
          scene_title: scene.title,
          scene_summary: contextScene?.scene_summary || 'Scene summary not available',
          roadmap_location: contextScene?.roadmap_location || '',
          location: contextScene?.location ? {
            id: contextScene.location.id || `scene-${scene.sceneNumber}-location`,
            name: contextScene.location.name || 'Unknown Location',
            description: contextScene.location.description || 'Location description not available',
            visual_description: contextScene.location.visual_description || '',
            atmosphere: contextScene.location.atmosphere || '',
            atmosphere_category: contextScene.location.atmosphere_category || 'neutral',
            geographical_location: contextScene.location.geographical_location || '',
            time_period: contextScene.location.time_period || '',
            cultural_context: contextScene.location.cultural_context || '',
            key_features: contextScene.location.key_features || '[]',
            visual_reference_url: contextScene.location.visual_reference_url || '',
            significance_level: contextScene.location.significance_level || 'medium',
            artifacts: contextScene.location.artifacts?.map((artifact: any) => ({
              artifact_name: artifact.name || artifact.artifact_name || 'Unknown Artifact',
              description: artifact.description || '',
              swarmui_prompt_fragment: artifact.prompt_fragment || artifact.swarmui_prompt_fragment || '',
              artifact_type: artifact.type || artifact.artifact_type || 'prop',
              always_present: artifact.always_present || false,
              scene_specific: artifact.scene_specific !== false
            })) || [],
            tactical_override_location: contextScene.location.tactical_override_location || ''
          } : {
            id: `scene-${scene.sceneNumber}-fallback`,
            name: 'Location Not Available',
            description: 'Location data not found in episode context',
            visual_description: '',
            atmosphere: '',
            atmosphere_category: 'neutral',
            geographical_location: '',
            time_period: '',
            cultural_context: '',
            key_features: '[]',
            visual_reference_url: '',
            significance_level: 'medium',
            artifacts: [],
            tactical_override_location: ''
          },
          character_appearances: contextScene?.character_appearances || [],
          characters_present: contextScene?.characters_present || contextScene?.characters || [],
          atmosphere: contextScene?.atmosphere || ''
        };

        // Build real episode context from parsed data
        const enhancedEpisodeContext: EnhancedEpisodeContext = {
          episode: {
            episode_number: parsedEpisodeContext?.episode?.episode_number || analyzedEpisode.episodeNumber,
            episode_title: parsedEpisodeContext?.episode?.episode_title || analyzedEpisode.title,
            episode_summary: parsedEpisodeContext?.episode?.episode_summary || 'Episode summary not available',
            story_context: parsedEpisodeContext?.episode?.story_context || '',
            narrative_tone: parsedEpisodeContext?.episode?.narrative_tone || '',
            core_themes: parsedEpisodeContext?.episode?.core_themes || 'Core themes not available',
            characters: parsedEpisodeContext?.episode?.characters || [],
            scenes: parsedEpisodeContext?.episode?.scenes || []
          }
        };

        return { beat, sceneContext, episodeContext: enhancedEpisodeContext };
      }
    }
    return null;
  };

  const handleSaveRefinement = (beatId: string, refinedPrompt: string) => {
    console.log('Saving refinement for beat:', beatId, refinedPrompt);
    // Will integrate with persistence in Phase 3
  };

  const handleQueueForGeneration = (beatId: string) => {
    console.log('Queuing beat for generation:', beatId);
    // Will integrate with batch queue in Phase 4
  };

  const handleNavigateToRefine = (beatId: string) => {
    navigate(`/refine/${beatId}`);
  };

  const [isContextFetching, setIsContextFetching] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);
  
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('manual');
  const [storyUuid, setStoryUuid] = useState<string>('59f64b1e-726a-439d-a6bc-0dfefcababdb');
  
  const [isInputCollapsed, setIsInputCollapsed] = useState(true);
  
  const [styleConfig, setStyleConfig] = useState<EpisodeStyleConfig>({
    model: 'flux1-dev-fp8',
    cinematicAspectRatio: '16:9',
    verticalAspectRatio: '9:16',
  });

  const [useHierarchicalPrompts, setUseHierarchicalPrompts] = useState<boolean>(false);

  const [selectedLLM, setSelectedLLM] = useState<LLMProvider>('gemini'); // Default to Gemini as it's set as DEFAULT_AI_PROVIDER in .env


  const handleFetchContext = async () => {
    setIsContextFetching(true);
    setContextError(null);
    setEpisodeContext('');

    try {
        const episodeNumber = parseEpisodeNumber(scriptText);
        if (episodeNumber === null) {
            throw new Error("Cannot fetch context: Script must begin with 'EPISODE: X'.");
        }

        // First ensure StoryTeller service is running
        setShowServiceStatus(true);
        setLoadingMessage('Checking StoryTeller service...');

        const serviceRunning = await ensureServiceRunning((status) => {
          setServiceStatus(status);
          if (status.message) {
            setLoadingMessage(status.message);
          }
        });

        if (!serviceRunning) {
          throw new Error('StoryTeller service is not available. Please start it manually and try again.');
        }

        // Hide service status panel once service is confirmed running
        setShowServiceStatus(false);

        setLoadingMessage('Fetching episode context from API...');
        const contextData = await getEpisodeContext(storyUuid, episodeNumber);
        const formattedContext = JSON.stringify(contextData, null, 2);
        setEpisodeContext(formattedContext);

    } catch (e: any) {
        setContextError(e.message || 'An unexpected error occurred while fetching context.');
        setEpisodeContext('');
        setShowServiceStatus(false); // Hide service status on error
    } finally {
        setIsContextFetching(false);
        setLoadingMessage('');
    }
  };

  useEffect(() => {
    if (retrievalMode === 'database' && storyUuid) {
        setLoadingMessage('Fetching context...');
        handleFetchContext();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retrievalMode, scriptText, storyUuid]);


  const handleRetrievalModeChange = (mode: RetrievalMode) => {
    setRetrievalMode(mode);
    if (mode === 'manual') {
        // Only set default context if the current context is empty
        if (!episodeContext.trim()) {
            setEpisodeContext(DEFAULT_EPISODE_CONTEXT);
        }
        setContextError(null);
    }
  };

  const handleAnalyze = async () => {
    console.log('=== ANALYSIS STARTED ===');
    console.log('Script text:', scriptText.substring(0, 100) + '...');
    console.log('Episode context:', episodeContext.substring(0, 200) + '...');
    console.log('Selected LLM:', selectedLLM);
    console.log('Retrieval mode:', retrievalMode);

    setIsLoading(true);
    setError(null);
    setAnalyzedEpisode(null);
    setLoadingMessage('Initializing analysis...');

    try {
      // STAGE 1: Storyboard Analysis using Gemini
      setLoadingMessage('Analyzing script with Gemini...');
      
      let analysisResult: AnalyzedEpisode;
      analysisResult = await analyzeScript(scriptText, episodeContext, setLoadingMessage);

      console.log('Analysis result received:', analysisResult);
      
      setLoadingMessage('Post-processing analysis...');
      let processedResult = postProcessAnalysis(analysisResult);
      setAnalyzedEpisode(processedResult); // Show storyboard first

      // STAGE 2: Prompt Generation
      // This is the control switch. Based on the state of `useHierarchicalPrompts`,
      // we delegate to the appropriate prompt generation service.
      setLoadingMessage('Generating SwarmUI prompts...');
      const promptsResult = useHierarchicalPrompts
        ? await generateHierarchicalSwarmUiPrompts(processedResult, episodeContext, styleConfig, retrievalMode, storyUuid)
        : await generateSwarmUiPrompts(processedResult, episodeContext, styleConfig, retrievalMode, storyUuid);
      
      // Integrate prompts back into the analysis object
      if (processedResult.scenes && Array.isArray(processedResult.scenes)) {
        processedResult.scenes.forEach(scene => {
          if (scene.beats && Array.isArray(scene.beats)) {
            scene.beats.forEach(beat => {
              const matchingPrompts = promptsResult.find(p => p.beatId === beat.beatId);
              if (matchingPrompts) {
                beat.prompts = {
                  cinematic: matchingPrompts.cinematic,
                  vertical: matchingPrompts.vertical,
                };
              }
            });
          }
        });
      }
      
      setAnalyzedEpisode({ ...processedResult });

    // FIX: Corrected syntax for the try-catch block.
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRestoreFromRedis = (data: SwarmUIExportData) => {
    setScriptText(data.scriptText);
    setEpisodeContext(data.episodeContext);
    setStoryUuid(data.storyUuid);
    setAnalyzedEpisode(data.analyzedEpisode);
    setError(null);
  };

  return (
    <>
      <Routes>
        <Route path="/" element={
          <Dashboard
            scriptText={scriptText}
            setScriptText={setScriptText}
            episodeContext={episodeContext}
            setEpisodeContext={setEpisodeContext}
            analyzedEpisode={analyzedEpisode}
            setAnalyzedEpisode={setAnalyzedEpisode}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            loadingMessage={loadingMessage}
            setLoadingMessage={setLoadingMessage}
            error={error}
            setError={setError}
            isContextFetching={isContextFetching}
            setIsContextFetching={setIsContextFetching}
            contextError={contextError}
            setContextError={setContextError}
            retrievalMode={retrievalMode}
            setRetrievalMode={setRetrievalMode}
            storyUuid={storyUuid}
            setStoryUuid={setStoryUuid}
            isInputCollapsed={isInputCollapsed}
            setIsInputCollapsed={setIsInputCollapsed}
            styleConfig={styleConfig}
            setStyleConfig={setStyleConfig}
            useHierarchicalPrompts={useHierarchicalPrompts}
            setUseHierarchicalPrompts={setUseHierarchicalPrompts}
            selectedLLM={selectedLLM}
            setSelectedLLM={setSelectedLLM}
            handleAnalyze={handleAnalyze}
            handleFetchContext={handleFetchContext}
            handleReset={handleReset}
            handleNavigateToRefine={handleNavigateToRefine}
            handleRestoreFromRedis={handleRestoreFromRedis}
          />
        } />

        <Route path="/refine/:beatId" element={
          <RefinementWorkspace
            getBeatData={getBeatData}
            onSaveRefinement={handleSaveRefinement}
            onQueueForGeneration={handleQueueForGeneration}
          />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Service Status Panel */}
      <ServiceStatusPanel
        status={serviceStatus}
        isVisible={showServiceStatus}
        onClose={() => setShowServiceStatus(false)}
      />
    </>
  );
}

export default AppWrapper;