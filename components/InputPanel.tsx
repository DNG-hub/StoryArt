import React, { useState, useEffect } from 'react';
import { GenerateIcon } from './icons';

type RetrievalMode = 'manual' | 'database';

interface InputPanelProps {
  script: string;
  setScript: (value: string) => void;
  episodeContext: string;
  setEpisodeContext: (value: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  loadingMessage: string;
  isContextFetching: boolean;
  contextError: string | null;
  retrievalMode: RetrievalMode;
  onRetrievalModeChange: (mode: RetrievalMode) => void;
  storyUuid: string;
  setStoryUuid: (uuid: string) => void;
}

const RetrievalModeSwitch: React.FC<{
  mode: RetrievalMode;
  setMode: (mode: RetrievalMode) => void;
}> = ({ mode, setMode }) => (
  <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1 max-w-sm mx-auto">
    <button
      onClick={() => setMode('manual')}
      className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${
        mode === 'manual' ? 'bg-brand-blue text-white shadow' : 'text-gray-400 hover:bg-gray-800'
      }`}
    >
      Manual Input
    </button>
    <button
      onClick={() => setMode('database')}
      className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${
        mode === 'database' ? 'bg-brand-blue text-white shadow' : 'text-gray-400 hover:bg-gray-800'
      }`}
    >
      Database
    </button>
  </div>
);

export const InputPanel: React.FC<InputPanelProps> = ({
  script,
  setScript,
  episodeContext,
  setEpisodeContext,
  onAnalyze,
  isLoading,
  loadingMessage,
  isContextFetching,
  contextError,
  retrievalMode,
  onRetrievalModeChange,
  storyUuid,
  setStoryUuid,
}) => {
  const [isContextJsonValid, setIsContextJsonValid] = useState(true);

  useEffect(() => {
    if (retrievalMode === 'manual') {
      if (!episodeContext.trim()) {
        setIsContextJsonValid(true); // Empty is not "invalid", just empty
        return;
      }
      try {
        JSON.parse(episodeContext);
        setIsContextJsonValid(true);
      } catch (e) {
        setIsContextJsonValid(false);
      }
    } else {
      setIsContextJsonValid(true); // Not in manual mode, so no validation needed here
    }
  }, [episodeContext, retrievalMode]);

  const isAnalyzeDisabled =
    isLoading ||
    isContextFetching ||
    !script.trim() ||
    (retrievalMode === 'manual' && (!episodeContext.trim() || !isContextJsonValid)) ||
    (retrievalMode === 'database' && (!storyUuid.trim() || !episodeContext.trim() || !!contextError));
    
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-brand-purple text-center">Inputs</h2>
      <div className="flex-grow flex flex-col space-y-4">
        
        {/* Script Input */}
        <div className='flex flex-col flex-grow' style={{ minHeight: '200px' }}>
            <label htmlFor="script-input" className="block text-sm font-medium text-gray-300 mb-2">
                Script
            </label>
            <textarea
                id="script-input"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Enter your script here..."
                className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition duration-200"
                aria-label="Script Input"
            />
        </div>

        {/* Retrieval Mode Switch and Context Input */}
        <div className='flex flex-col flex-grow' style={{ minHeight: '200px' }}>
            <div className="text-sm font-medium text-gray-300 mb-2 text-center">Episode Context Source</div>
            <RetrievalModeSwitch mode={retrievalMode} setMode={onRetrievalModeChange} />
            
            <div className="mt-4 flex-grow flex flex-col">
                {retrievalMode === 'manual' ? (
                     <>
                        <textarea
                            id="episode-context-input"
                            value={episodeContext}
                            onChange={(e) => setEpisodeContext(e.target.value)}
                            placeholder="Enter episode context JSON data here..."
                            className={`w-full flex-grow bg-gray-900 border rounded-md p-3 font-mono text-sm text-gray-200 focus:ring-2 focus:border-brand-blue transition duration-200 ${
                                !isContextJsonValid && episodeContext.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-700'
                            }`}
                            aria-label="Episode Context Input"
                        />
                        {!isContextJsonValid && episodeContext.trim() && (
                            <p className="text-red-400 text-xs mt-1">
                                Invalid JSON format. Please check for errors.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="flex-grow flex flex-col space-y-4">
                        <div>
                            <label htmlFor="story-uuid-input" className="block text-sm font-medium text-gray-300 mb-2">
                                Story UUID
                            </label>
                            <input
                                type="text"
                                id="story-uuid-input"
                                value={storyUuid}
                                onChange={(e) => setStoryUuid(e.target.value)}
                                placeholder="Enter Story UUID to fetch context..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition duration-200"
                                aria-label="Story UUID Input"
                            />
                        </div>
                         <div className="flex-grow flex flex-col">
                            <label htmlFor="episode-context-input-db" className="block text-sm font-medium text-gray-300 mb-2">
                                Episode Context (Fetched)
                            </label>
                             {isContextFetching ? (
                                <div className="flex-grow flex items-center justify-center bg-gray-900 border border-gray-700 rounded-md p-3">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="ml-2 text-gray-400">Fetching context...</span>
                                </div>
                             ) : contextError ? (
                                <div className="flex-grow flex items-center justify-center bg-red-900/20 border border-red-700 rounded-md p-3">
                                    <p className="text-red-400 text-sm text-center">{contextError}</p>
                                </div>
                             ) : (
                                <textarea
                                    id="episode-context-input-db"
                                    value={episodeContext}
                                    readOnly
                                    className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-md p-3 font-mono text-sm text-gray-400 cursor-not-allowed"
                                    aria-label="Fetched Episode Context"
                                />
                             )}
                        </div>
                    </div>
                )}
            </div>
        </div>

      </div>
      <div className="mt-6">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzeDisabled}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {loadingMessage || 'Analyzing...'}
            </>
          ) : (
            <>
              <GenerateIcon />
              Analyze Script
            </>
          )}
        </button>
      </div>
    </div>
  );
};