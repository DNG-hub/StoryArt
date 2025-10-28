import React, { useState, useEffect } from 'react';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { analyzeScript } from './services/geminiService';
import { getEpisodeContext } from './services/contextService';
import { parseEpisodeNumber, postProcessAnalysis } from './utils';
import type { AnalyzedEpisode, EpisodeStyleConfig } from './types';
import { DEFAULT_SCRIPT, DEFAULT_EPISODE_CONTEXT } from './constants';
import { GithubIcon, PanelExpandIcon } from './components/icons';
import { generateSwarmUiPrompts } from './services/promptGenerationService';

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

function App() {
  const [scriptText, setScriptText] = useState<string>(DEFAULT_SCRIPT);
  const [episodeContext, setEpisodeContext] = useState<string>(DEFAULT_EPISODE_CONTEXT);
  const [analyzedEpisode, setAnalyzedEpisode] = useState<AnalyzedEpisode | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [isContextFetching, setIsContextFetching] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);
  
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('manual');
  const [storyUuid, setStoryUuid] = useState<string>('59f64b1e-726a-439d-a6bc-0dfefcababdb');
  
  const [isInputCollapsed, setIsInputCollapsed] = useState(true);
  
  const [styleConfig, setStyleConfig] = useState<EpisodeStyleConfig>({
    stylePrefix: 'cinematic, gritty, post-apocalyptic, photorealistic, 8k, masterpiece',
    model: 'epicrealism_naturalSinRC1VAE',
    cinematicAspectRatio: '16:9',
    verticalAspectRatio: '9:16',
  });


  const handleFetchContext = async () => {
    setIsContextFetching(true);
    setContextError(null);
    setEpisodeContext('');
    try {
        const episodeNumber = parseEpisodeNumber(scriptText);
        if (episodeNumber === null) {
            throw new Error("Cannot fetch context: Script must begin with 'EPISODE: X'.");
        }
        setLoadingMessage('Fetching episode context from API...');
        const contextData = await getEpisodeContext(storyUuid, episodeNumber);
        const formattedContext = JSON.stringify(contextData, null, 2);
        setEpisodeContext(formattedContext);
    } catch (e: any) {
        setContextError(e.message || 'An unexpected error occurred while fetching context.');
        setEpisodeContext('');
    } finally {
        setIsContextFetching(false);
        setLoadingMessage('');
    }
  };

  useEffect(() => {
    if (retrievalMode === 'database') {
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
    setIsLoading(true);
    setError(null);
    setAnalyzedEpisode(null);
    setLoadingMessage('Initializing analysis...');
    
    try {
      // STAGE 1: Storyboard Analysis (relies on onProgress for messages)
      const analysisResult = await analyzeScript(scriptText, episodeContext, setLoadingMessage);
      
      setLoadingMessage('Post-processing analysis...');
      let processedResult = postProcessAnalysis(analysisResult);
      setAnalyzedEpisode(processedResult); // Show storyboard first

      // STAGE 2: Prompt Generation
      setLoadingMessage('Generating SwarmUI prompts...');
      const promptsResult = await generateSwarmUiPrompts(processedResult, episodeContext, styleConfig);
      
      // Integrate prompts back into the analysis object
      processedResult.scenes.forEach(scene => {
        scene.beats.forEach(beat => {
          const matchingPrompts = promptsResult.find(p => p.beatId === beat.beatId);
          if (matchingPrompts) {
            beat.prompts = {
              cinematic: matchingPrompts.cinematic,
              vertical: matchingPrompts.vertical,
            };
          }
        });
      });
      
      setAnalyzedEpisode({ ...processedResult });

    // FIX: Corrected syntax for the try-catch block.
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
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
                onRetrievalModeChange={handleRetrievalModeChange}
                storyUuid={storyUuid}
                setStoryUuid={setStoryUuid}
                onToggleCollapse={() => setIsInputCollapsed(true)}
                styleConfig={styleConfig}
                setStyleConfig={setStyleConfig}
              />
            </div>
          )}
          <div className={isInputCollapsed ? "xl:col-span-9" : "xl:col-span-5"}>
            <OutputPanel
              analysis={analyzedEpisode}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              error={error}
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

export default App;