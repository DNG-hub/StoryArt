import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { analyzeScript } from './services/geminiService';
import { getEpisodeContext } from './services/contextService';
import { parseEpisodeNumber } from './utils';
import type { AnalyzedEpisode, HistoryEntry } from './types';
import { DEFAULT_SCRIPT, DEFAULT_EPISODE_CONTEXT } from './constants';
import { GithubIcon } from './components/icons';

const HISTORY_STORAGE_KEY = 'storyboard_analysis_history';

type RetrievalMode = 'manual' | 'database';

function App() {
  const [scriptText, setScriptText] = useState<string>(DEFAULT_SCRIPT);
  const [episodeContext, setEpisodeContext] = useState<string>(DEFAULT_EPISODE_CONTEXT);
  const [analyzedEpisode, setAnalyzedEpisode] = useState<AnalyzedEpisode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('manual');
  const [storyUuid, setStoryUuid] = useState<string>('59f64b1e-726a-439d-a6bc-0dfefcababdb');

  const initialLoad = useRef(true);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
    }
  }, []);

  const deselectOnManualChange = () => {
    if (initialLoad.current) {
        initialLoad.current = false;
        return;
    }
    const currentEntry = history.find(h => h.id === selectedHistoryId);
    if (currentEntry) {
        const inputs = currentEntry.inputs;
        if (inputs.scriptText !== scriptText ||
            (inputs.retrievalMode === 'manual' && inputs.episodeContext !== episodeContext) ||
            (inputs.retrievalMode === 'database' && inputs.storyUuid !== storyUuid)) {
            setSelectedHistoryId(null);
        }
    }
  };

  useEffect(deselectOnManualChange, [scriptText, episodeContext, storyUuid, selectedHistoryId, history]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalyzedEpisode(null);
    let finalEpisodeContext = episodeContext;

    try {
        if (retrievalMode === 'database') {
            setLoadingMessage('Parsing episode number...');
            const episodeNumber = parseEpisodeNumber(scriptText);
            if (episodeNumber === null) {
                throw new Error("Analysis failed: Could not find 'EPISODE: X' at the start of the script.");
            }

            setLoadingMessage('Fetching episode context from API...');
            const contextData = await getEpisodeContext(storyUuid, episodeNumber);
            finalEpisodeContext = JSON.stringify(contextData, null, 2);
            setEpisodeContext(finalEpisodeContext);
        }

      setLoadingMessage('Analyzing script with Gemini...');
      const result = await analyzeScript(scriptText, finalEpisodeContext);
      setAnalyzedEpisode(result);

      const newEntry: HistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        inputs: { 
            scriptText, 
            episodeContext: finalEpisodeContext,
            retrievalMode,
            storyUuid,
        },
        output: result,
      };

      const updatedHistory = [newEntry, ...history];
      setHistory(updatedHistory);
      setSelectedHistoryId(newEntry.id);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleLoadHistory = useCallback((id: string) => {
    const entry = history.find(h => h.id === id);
    if (entry) {
        initialLoad.current = true;
        setScriptText(entry.inputs.scriptText);
        setEpisodeContext(entry.inputs.episodeContext);
        setAnalyzedEpisode(entry.output);
        setRetrievalMode(entry.inputs.retrievalMode);
        setStoryUuid(entry.inputs.storyUuid || '59f64b1e-726a-439d-a6bc-0dfefcababdb');
        setSelectedHistoryId(id);
        setError(null);
    }
  }, [history]);

  const handleDeleteHistory = useCallback((id: string) => {
    const updatedHistory = history.filter(h => h.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    if (selectedHistoryId === id) {
        setSelectedHistoryId(null);
    }
  }, [history, selectedHistoryId]);

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        setHistory([]);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        setSelectedHistoryId(null);
    }
  }, []);


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

        <main className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-grow">
          <div className="xl:col-span-3">
             <HistoryPanel
                history={history}
                selectedId={selectedHistoryId}
                onLoad={handleLoadHistory}
                onDelete={handleDeleteHistory}
                onClear={handleClearHistory}
             />
          </div>
          <div className="xl:col-span-4">
            <InputPanel
              script={scriptText}
              setScript={setScriptText}
              episodeContext={episodeContext}
              setEpisodeContext={setEpisodeContext}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              retrievalMode={retrievalMode}
              setRetrievalMode={setRetrievalMode}
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
