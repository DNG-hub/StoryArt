import React from 'react';
import { GenerateIcon } from './icons';

interface InputPanelProps {
  script: string;
  setScript: (value: string) => void;
  episodeContext: string;
  setEpisodeContext: (value: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

export const InputPanel: React.FC<InputPanelProps> = ({ script, setScript, episodeContext, setEpisodeContext, onAnalyze, isLoading }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-brand-purple">Inputs</h2>
      <div className="flex-grow flex flex-col space-y-4">
        
        {/* Script Input */}
        <div className='flex flex-col flex-grow h-1/2'>
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

        {/* Episode Context Input */}
        <div className='flex flex-col flex-grow h-1/2'>
            <label htmlFor="episode-context-input" className="block text-sm font-medium text-gray-300 mb-2">
                Episode Context (JSON)
            </label>
            <textarea
                id="episode-context-input"
                value={episodeContext}
                onChange={(e) => setEpisodeContext(e.target.value)}
                placeholder="Enter episode context JSON data here..."
                className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-md p-3 font-mono text-sm text-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition duration-200"
                aria-label="Episode Context Input"
            />
        </div>

      </div>
      <div className="mt-6">
        <button
          onClick={onAnalyze}
          disabled={isLoading || !script.trim()}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Script...
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
