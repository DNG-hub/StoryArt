import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { analyzeScript } from './services/geminiService';
import type { AnalyzedEpisode, HistoryEntry } from './types';
import { DEFAULT_SCRIPT, DEFAULT_EPISODE_CONTEXT } from './constants';
import { GithubIcon } from './components/icons';

const HISTORY_STORAGE_KEY = 'storyboard_analysis_history';

function App() {
  const [scriptText, setScriptText] = useState<string>(DEFAULT_SCRIPT);
  const [episodeContext, setEpisodeContext] = useState<string>(DEFAULT_EPISODE_CONTEXT);
  const [analyzedEpisode, setAnalyzedEpisode] = useState<AnalyzedEpisode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

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
    if (currentEntry && (currentEntry.inputs.scriptText !== scriptText || currentEntry.inputs.episodeContext !== episodeContext)) {
        setSelectedHistoryId(null);
    }
  };

  useEffect(deselectOnManualChange, [scriptText, episodeContext, selectedHistoryId, history]);


  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalyzedEpisode(null);
    
    try {
      const result = await analyzeScript(scriptText, episodeContext);
      setAnalyzedEpisode(result);

      const newEntry: HistoryEntry = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        inputs: { scriptText, episodeContext },
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
    }
  };

  const handleLoadHistory = useCallback((id: string) => {
    const entry = history.find(h => h.id === id);
    if (entry) {
        initialLoad.current = true; // Prevent useEffect from deselecting on load
        setScriptText(entry.inputs.scriptText);
        setEpisodeContext(entry.inputs.episodeContext);
        setAnalyzedEpisode(entry.output);
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
            />
          </div>
          <div className="xl:col-span-5">
            <OutputPanel
              analysis={analyzedEpisode}
              isLoading={isLoading}
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
