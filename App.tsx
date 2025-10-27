import React, { useState, useEffect, useCallback } from 'react';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { analyzeScript } from './services/geminiService';
import { getEpisodeContext } from './services/contextService';
import { parseEpisodeNumber, postProcessAnalysis } from './utils';
import type { AnalyzedEpisode } from './types';
import { DEFAULT_SCRIPT, DEFAULT_EPISODE_CONTEXT } from './constants';
import { GithubIcon } from './components/icons';

type RetrievalMode = 'manual' | 'database';

// FUTURE: PHASE 2 - INTER-EPISODE CONTINUITY & ASSET MANAGEMENT
// The current implementation provides "intra-episode" continuity by analyzing a single script in its entirety.
// The next major evolution ("Phase 2") is to create a "long-term memory" for the AI, allowing it to make
// image reuse decisions across multiple episodes.
//
// PROPOSED ARCHITECTURE:
// 1.  VISUAL ASSET DATABASE: A dedicated backend/database to store metadata for every generated image.
//     - Each entry would include: `imageId`, `episodeNumber`, `sceneNumber`, `beatId`, key visual elements (characters, location, props),
//       a text description, and a link to the image file.
// 2.  CONTEXT ENRICHMENT: Before calling the Gemini API, the app would query this database for existing assets
//     relevant to the current script's locations and characters.
// 3.  ENHANCED AI PROMPT: This "visual history" (a list of available, previously generated assets) would be passed
//     to the Gemini API as part of the context.
// 4.  AI AS ASSET MANAGER: The AI's instructions would be upgraded to: "Before recommending a NEW_IMAGE,
//     first check the provided Visual History. If a suitable image already exists, recommend REUSE_IMAGE and
//     provide the existing `imageId`."
//
// This will transform the tool from a script analyzer into a full-fledged production assistant, drastically
// reducing redundant asset creation and enforcing visual consistency across the entire series.

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

  const handleRetrievalModeChange = (mode: RetrievalMode) => {
    setRetrievalMode(mode);
    if (mode === 'database') {
        handleFetchContext();
    } else {
        setEpisodeContext(DEFAULT_EPISODE_CONTEXT);
        setContextError(null);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalyzedEpisode(null);
    setLoadingMessage('Analyzing script with Gemini...');

    try {
      const result = await analyzeScript(scriptText, episodeContext);
      const processedResult = postProcessAnalysis(result);
      setAnalyzedEpisode(processedResult);
    } catch (e: any) {
      console.error(e);
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
            StoryTeller AI Beat Analysis
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            From script to storyboard: AI-powered narrative analysis.
          </p>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-9 gap-8 flex-grow">
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
            />
          </div>
          <div className="xl:col-span-5">
            <OutputPanel
              analysis={analyzedEpisode}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              error={error}
            />
          </div>
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