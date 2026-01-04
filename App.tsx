import React, { useState, useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'; // Removed routing
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { SessionBrowser } from './components/SessionBrowser';
// import RefinementWorkspace from './components/RefinementWorkspace'; // Component removed
// import { ServiceStatusPanel } from './components/ServiceStatusPanel'; // Component removed
import { analyzeScript } from './services/geminiService';
import { analyzeScriptWithProvider } from './services/multiProviderAnalysisService';
import { getEpisodeContext, getEpisodeList, getEpisodeScript, type EpisodeListItem } from './services/contextService';
// import { ensureServiceRunning, type ServiceStatus } from './services/storytellerService'; // Service removed
import { parseEpisodeNumber, postProcessAnalysis } from './utils';
import type { AnalyzedEpisode, EpisodeStyleConfig, EnhancedEpisodeContext, SceneContext, BeatAnalysis, LLMSelection, LLMProvider } from './types';
import { DEFAULT_SCRIPT, DEFAULT_EPISODE_CONTEXT } from './constants';
import { GithubIcon, PanelExpandIcon } from './components/icons';
import { generateHierarchicalSwarmUiPrompts } from './services/promptGenerationService';
// import { useSwarmUIExport } from './hooks/useSwarmUIExport'; // Hook removed
import { type SwarmUIExportData } from './types';
import { getLatestSession, saveSessionToRedis, getSessionByTimestamp } from './services/redisService';

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
  selectedLLM,
  setSelectedLLM,
  handleAnalyze,
  handleFetchContext,
  handleReset,
  handleNavigateToRefine,
  onRestoreFromRedis,
  isRestoring,
  restoreError,
  restoreSuccess,
  saveSuccess,
  onSaveToRedis,
  isSaving,
  saveError,
  // New props for database episode selection
  episodeList,
  selectedEpisodeNumber,
  onEpisodeSelect,
  isEpisodeListLoading,
  episodeListError,
  isScriptFetching,
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
  selectedLLM: LLMProvider;
  setSelectedLLM: (selection: LLMProvider) => void;
  handleAnalyze: () => Promise<void>;
  handleFetchContext: () => Promise<void>;
  handleReset: () => void;
  handleNavigateToRefine: (beatId: string) => void;
  onRestoreFromRedis: () => Promise<void>;
  isRestoring: boolean;
  restoreError: string | null;
  restoreSuccess: boolean;
  saveSuccess: boolean;
  onSaveToRedis?: () => Promise<void>;
  isSaving?: boolean;
  saveError?: string | null;
  // New props for database episode selection
  episodeList: EpisodeListItem[];
  selectedEpisodeNumber: number | null;
  onEpisodeSelect: (episodeNumber: number) => Promise<void>;
  isEpisodeListLoading: boolean;
  episodeListError: string | null;
  isScriptFetching: boolean;
}) {
  // SwarmUI export hook removed - stubbing out functionality
  const isSavingToSwarmUI = false;
  const saveToSwarmUIError: string | null = null;
  
  const handleSaveToSwarmUI = async () => {
    if (!analyzedEpisode) {
      return;
    }

    // SwarmUI export functionality removed
    console.warn('SwarmUI export feature is not available. The useSwarmUIExport hook was removed.');
    // TODO: Implement SwarmUI export functionality if needed
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
                selectedLLM={selectedLLM}
                onSelectedLLMChange={setSelectedLLM}
                onRestoreFromRedis={onRestoreFromRedis}
                isRestoring={isRestoring}
                restoreError={restoreError}
                restoreSuccess={restoreSuccess}
                saveSuccess={saveSuccess}
                onSaveToRedis={onSaveToRedis}
                isSaving={isSaving}
                saveError={saveError}
                // New props for database episode selection
                episodeList={episodeList}
                selectedEpisodeNumber={selectedEpisodeNumber}
                onEpisodeSelect={onEpisodeSelect}
                isEpisodeListLoading={isEpisodeListLoading}
                episodeListError={episodeListError}
                isScriptFetching={isScriptFetching}
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
              onEditBeat={handleNavigateToRefine}
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
// Routing removed - single page app
// function AppWrapper() {
//   return (
//     <Router>
//       <App />
//     </Router>
//   );
// }

function App() {
  // Only log renders in development and limit frequency
  if (import.meta.env.DEV) {
    const renderCount = (window as any).__storyart_render_count = ((window as any).__storyart_render_count || 0) + 1;
    if (renderCount <= 3 || renderCount % 10 === 0) {
      console.log('📱 StoryArt: App component rendering...', `(render #${renderCount})`);
    }
  }
  // const navigate = useNavigate(); // Routing removed
  const [scriptText, setScriptText] = useState<string>(DEFAULT_SCRIPT);
  const [episodeContext, setEpisodeContext] = useState<string>(DEFAULT_EPISODE_CONTEXT);
  const [analyzedEpisode, setAnalyzedEpisode] = useState<AnalyzedEpisode | null>(null);

  // Redis state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSessionBrowserOpen, setIsSessionBrowserOpen] = useState(false);

  // Service status state - kept for potential future use but not currently displayed
  const [serviceStatus, setServiceStatus] = useState<{ isRunning: boolean; isStarting: boolean; message?: string }>({
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
    // Find the beat data
    const beatData = getBeatData(beatId);
    
    if (!beatData) {
      console.error('Beat not found:', beatId);
      alert(`Beat ${beatId} not found. Please ensure the analysis has been completed.`);
      return;
    }

    // For now, show an alert with beat information and indicate edit feature is coming
    // TODO: Implement full refinement modal/workspace
    const { beat, sceneContext, episodeContext } = beatData;
    
    console.log('Opening refinement for beat:', beatId, beat);
    
    // Create a simple modal or alert to show the beat details
    // For now, show an informative message
    const message = `Beat Editor (Coming Soon)\n\n` +
      `Beat ID: ${beat.beatId}\n` +
      `Scene: ${sceneContext?.sceneNumber || 'Unknown'}\n` +
      `Script: ${beat.beat_script_text?.substring(0, 100) || 'No text'}...\n\n` +
      `The full beat refinement editor is under development. ` +
      `For now, you can view and edit the prompt directly in the beat card below.`;
    
    alert(message);
    
    // Future: Open a modal with the refinement workspace
    // setRefiningBeatId(beatId);
    // setIsRefinementModalOpen(true);
  };

  const [isContextFetching, setIsContextFetching] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);
  
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('manual');
  const [storyUuid, setStoryUuid] = useState<string>(
    import.meta.env.VITE_CAT_DANIEL_STORY_ID || '59f64b1e-726a-439d-a6bc-0dfefcababdb'
  );
  
  const [isInputCollapsed, setIsInputCollapsed] = useState(true);
  
  const [styleConfig, setStyleConfig] = useState<EpisodeStyleConfig>({
    model: 'flux1-dev-fp8',
    cinematicAspectRatio: '16:9',
    verticalAspectRatio: '9:16',
  });


  const [selectedLLM, setSelectedLLM] = useState<LLMProvider>('gemini'); // Default to Gemini as it's set as DEFAULT_AI_PROVIDER in .env

  // New state for database episode selection
  const [episodeList, setEpisodeList] = useState<EpisodeListItem[]>([]);
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState<number | null>(null);
  const [isEpisodeListLoading, setIsEpisodeListLoading] = useState<boolean>(false);
  const [episodeListError, setEpisodeListError] = useState<string | null>(null);
  const [isScriptFetching, setIsScriptFetching] = useState<boolean>(false);

  // Fetch episode list when story UUID changes (in database mode)
  useEffect(() => {
    if (retrievalMode === 'database' && storyUuid.trim()) {
      const fetchEpisodeList = async () => {
        setIsEpisodeListLoading(true);
        setEpisodeListError(null);
        setEpisodeList([]);
        setSelectedEpisodeNumber(null);
        setScriptText('');
        setEpisodeContext('');

        try {
          const episodes = await getEpisodeList(storyUuid);
          setEpisodeList(episodes);
        } catch (e: any) {
          setEpisodeListError(e.message || 'Failed to fetch episode list.');
        } finally {
          setIsEpisodeListLoading(false);
        }
      };

      fetchEpisodeList();
    }
  }, [retrievalMode, storyUuid]);

  // Handle episode selection - fetch both script and context
  const handleEpisodeSelect = async (episodeNumber: number) => {
    setSelectedEpisodeNumber(episodeNumber);
    setScriptText('');
    setEpisodeContext('');
    setContextError(null);

    // Fetch script and context in parallel
    setIsScriptFetching(true);
    setIsContextFetching(true);
    setLoadingMessage('Fetching episode data...');

    try {
      const [scriptResult, contextResult] = await Promise.all([
        getEpisodeScript(storyUuid, episodeNumber),
        getEpisodeContext(storyUuid, episodeNumber),
      ]);

      // Set script
      if (scriptResult.success && scriptResult.standardized_script) {
        setScriptText(scriptResult.standardized_script);
      } else {
        throw new Error('Failed to fetch standardized script.');
      }

      // Set context
      const formattedContext = JSON.stringify(contextResult, null, 2);
      setEpisodeContext(formattedContext);

    } catch (e: any) {
      setContextError(e.message || 'Failed to fetch episode data.');
    } finally {
      setIsScriptFetching(false);
      setIsContextFetching(false);
      setLoadingMessage('');
    }
  };

  // Legacy handleFetchContext - still used for manual mode parsing
  const handleFetchContext = async () => {
    setIsContextFetching(true);
    setContextError(null);
    setEpisodeContext('');

    try {
        const episodeNumber = parseEpisodeNumber(scriptText);
        if (episodeNumber === null) {
            throw new Error("Cannot fetch context: Script must begin with 'EPISODE: X'.");
        }

        // StoryTeller service check removed - proceed directly to context fetch
        // Note: If StoryTeller service is required, ensure it's running before using database mode
        setLoadingMessage('Fetching episode context from API...');
        const contextData = await getEpisodeContext(storyUuid, episodeNumber);
        const formattedContext = JSON.stringify(contextData, null, 2);
        setEpisodeContext(formattedContext);

    } catch (e: any) {
        setContextError(e.message || 'An unexpected error occurred while fetching context.');
        setEpisodeContext('');
        // Service status panel removed - no need to hide it
    } finally {
        setIsContextFetching(false);
        setLoadingMessage('');
    }
  };

  // Auto-restore session from localStorage on mount (if available)
  useEffect(() => {
    const restoreFromLocalStorage = async () => {
      try {
        // Skip API calls on auto-restore to avoid console errors (check localStorage only)
        const response = await getLatestSession(true); // true = skip API calls
        if (response.success && response.data) {
          const data = response.data;
          // Only restore if we have actual data (not just defaults)
          if (data.scriptText && data.scriptText !== DEFAULT_SCRIPT) {
            setScriptText(data.scriptText);
            if (data.episodeContext) setEpisodeContext(data.episodeContext);
            if (data.storyUuid) {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (uuidRegex.test(data.storyUuid)) {
                setStoryUuid(data.storyUuid);
              }
            }
            if (data.analyzedEpisode) {
              setAnalyzedEpisode(data.analyzedEpisode);
            }
            console.log('✅ Auto-restored session from', response.storage || 'localStorage');
          }
        }
      } catch (error) {
        // Silently fail - defaults will be used
        console.debug('No previous session found, using defaults');
      }
    };
    
    restoreFromLocalStorage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Note: Old auto-fetch useEffect removed - now handled by episode selection flow
  // When user switches to database mode, the episode list is fetched
  // When user selects an episode, both script and context are fetched via handleEpisodeSelect


  const handleRetrievalModeChange = (mode: RetrievalMode) => {
    setRetrievalMode(mode);
    if (mode === 'manual') {
        // Reset to defaults for manual mode
        if (!scriptText.trim() || scriptText === '') {
            setScriptText(DEFAULT_SCRIPT);
        }
        if (!episodeContext.trim()) {
            setEpisodeContext(DEFAULT_EPISODE_CONTEXT);
        }
        setContextError(null);
        // Reset database mode state
        setSelectedEpisodeNumber(null);
        setEpisodeListError(null);
    } else {
        // Switching to database mode - clear script and context, keep story UUID
        // The useEffect will fetch episode list automatically
        setScriptText('');
        setEpisodeContext('');
        setContextError(null);
        setSelectedEpisodeNumber(null);
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
      // STAGE 1: Storyboard Analysis
      // Use unified provider routing - all providers are now supported
      setLoadingMessage(`Analyzing script with ${selectedLLM.toUpperCase()}...`);
      const analysisResult = await analyzeScriptWithProvider(selectedLLM, scriptText, episodeContext, setLoadingMessage);

      console.log('Analysis result received:', analysisResult);
      
      setLoadingMessage('Post-processing analysis...');
      let processedResult = postProcessAnalysis(analysisResult);
      setAnalyzedEpisode(processedResult); // Show storyboard first

      // STAGE 2: Prompt Generation
      // Use the same provider selected for analysis
      setLoadingMessage(`Generating SwarmUI prompts with ${selectedLLM.toUpperCase()}...`);
      const promptsResult = await generateHierarchicalSwarmUiPrompts(processedResult, episodeContext, styleConfig, retrievalMode, storyUuid, selectedLLM, setLoadingMessage);
      
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

      // Save session to Redis API (with localStorage fallback)
      try {
        const saveResult = await saveSessionToRedis({
          scriptText,
          episodeContext,
          storyUuid,
          analyzedEpisode: processedResult,
        });
        
        if (saveResult.success) {
          const storageType = saveResult.storage === 'redis' ? 'Redis' : 
                            saveResult.storage === 'memory' ? 'memory storage' : 
                            'localStorage';
          console.log(`✅ Session auto-saved to ${storageType}`);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          console.warn('⚠️ Auto-save failed:', saveResult.error);
        }
      } catch (error) {
        // Session save failure shouldn't break the analysis flow
        console.warn('Failed to auto-save session:', error);
      }

    // FIX: Corrected syntax for the try-catch block.
    } catch (e: any) {
      const errorMessage = e?.message || e?.toString() || 'An unexpected error occurred.';
      const errorStack = e?.stack || 'No stack trace available';
      
      console.error('=== ANALYSIS ERROR ===');
      console.error('Error message:', errorMessage);
      console.error('Error stack:', errorStack);
      console.error('Full error object:', e);
      console.error('Error type:', typeof e);
      console.error('Error constructor:', e?.constructor?.name);
      
      // Set error state
      setError(errorMessage);
      
      // Also log to console for debugging
      console.error('Error has been set in state. Check UI for error display.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Open session browser to select a version to restore
  const handleRestoreFromRedis = () => {
    setIsSessionBrowserOpen(true);
  };

  // Restore the latest session directly (used by auto-restore on mount)
  const handleRestoreLatestSession = async () => {
    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(false);
    setError(null);

    const response = await getLatestSession();

    if (response.success && response.data) {
      const data = response.data;
      setScriptText(data.scriptText);
      setEpisodeContext(data.episodeContext);
      
      // Validate UUID from restored session
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (data.storyUuid && uuidRegex.test(data.storyUuid)) {
        setStoryUuid(data.storyUuid);
      } else {
        console.warn(
          `Restored session contained an invalid UUID: "${data.storyUuid}". Falling back to default.`
        );
        // Fallback to env var or default if restored UUID is invalid
        setStoryUuid(
          import.meta.env.VITE_CAT_DANIEL_STORY_ID || '59f64b1e-726a-439d-a6bc-0dfefcababdb'
        );
      }
      
      setAnalyzedEpisode(data.analyzedEpisode);
      setRestoreSuccess(true);
      // Store storage source for display
      if (response.storage) {
        localStorage.setItem('last-restore-storage', response.storage);
      }
      setTimeout(() => setRestoreSuccess(false), 3000); // Clear success message after 3 seconds
    } else {
      setRestoreError(response.error || 'Failed to restore session from Redis.');
    }

    setIsRestoring(false);
  };

  const handleRestoreSessionByTimestamp = async (timestamp: number) => {
    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(false);
    setError(null);

    try {
      const response = await getSessionByTimestamp(timestamp);

      if (response.success && response.data) {
        const data = response.data;
        setScriptText(data.scriptText);
        setEpisodeContext(data.episodeContext);
        
        // Validate UUID from restored session
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (data.storyUuid && uuidRegex.test(data.storyUuid)) {
          setStoryUuid(data.storyUuid);
        } else {
          console.warn(
            `Restored session contained an invalid UUID: "${data.storyUuid}". Falling back to default.`
          );
          setStoryUuid(
            import.meta.env.VITE_CAT_DANIEL_STORY_ID || '59f64b1e-726a-439d-a6bc-0dfefcababdb'
          );
        }
        
        setAnalyzedEpisode(data.analyzedEpisode);
        setRestoreSuccess(true);
        if (response.storage) {
          localStorage.setItem('last-restore-storage', response.storage);
        }
        setTimeout(() => setRestoreSuccess(false), 3000);
        
        // Close the browser after successful restore
        setIsSessionBrowserOpen(false);
      } else {
        setRestoreError(response.error || 'Failed to restore session.');
      }
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : 'Failed to restore session.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveToRedis = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Verify prompts are in the data before saving
      const hasPrompts = analyzedEpisode?.scenes?.some(scene => 
        scene.beats?.some(beat => beat.prompts)
      );
      
      if (hasPrompts) {
        console.log('✅ Prompts detected in analyzedEpisode, will be saved');
      } else {
        console.warn('⚠️ No prompts found in analyzedEpisode. Make sure you have generated prompts before saving.');
      }

      const result = await saveSessionToRedis({
        scriptText,
        episodeContext,
        storyUuid,
        analyzedEpisode: analyzedEpisode || {
          episodeNumber: 1,
          title: '',
          scenes: []
        },
      });

      if (result.success) {
        const storageType = result.storage === 'redis' ? 'Redis' : 
                          result.storage === 'memory' ? 'memory storage' : 
                          'localStorage';
        console.log(`✅ Session saved successfully to ${storageType}`);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(result.error || 'Save failed for unknown reason');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save session to Redis.';
      console.error('❌ Save error:', errorMessage);
      setSaveError(errorMessage);
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Dashboard directly without routing
  return (
    <>
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
        setRetrievalMode={handleRetrievalModeChange}
        storyUuid={storyUuid}
        setStoryUuid={setStoryUuid}
        isInputCollapsed={isInputCollapsed}
        setIsInputCollapsed={setIsInputCollapsed}
        styleConfig={styleConfig}
        setStyleConfig={setStyleConfig}
        selectedLLM={selectedLLM}
        setSelectedLLM={setSelectedLLM}
        handleAnalyze={handleAnalyze}
        handleFetchContext={handleFetchContext}
        handleReset={handleReset}
        handleNavigateToRefine={handleNavigateToRefine}
        onRestoreFromRedis={handleRestoreFromRedis}
        isRestoring={isRestoring}
        restoreError={restoreError}
        restoreSuccess={restoreSuccess}
        saveSuccess={saveSuccess}
        onSaveToRedis={handleSaveToRedis}
        isSaving={isSaving}
        saveError={saveError}
        onOpenSessionBrowser={() => setIsSessionBrowserOpen(true)}
        // New props for database episode selection
        episodeList={episodeList}
        selectedEpisodeNumber={selectedEpisodeNumber}
        onEpisodeSelect={handleEpisodeSelect}
        isEpisodeListLoading={isEpisodeListLoading}
        episodeListError={episodeListError}
        isScriptFetching={isScriptFetching}
      />
      <SessionBrowser
        isOpen={isSessionBrowserOpen}
        onClose={() => setIsSessionBrowserOpen(false)}
        onRestoreSession={handleRestoreSessionByTimestamp}
      />
    </>
  );
}

export default App;