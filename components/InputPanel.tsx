import React, { useState, useEffect } from 'react';
import { GenerateIcon, PanelCollapseIcon } from './icons';
import type { EpisodeStyleConfig, RetrievalMode } from '../types';

// Database context quality indicator component
const DatabaseContextIndicator: React.FC<{
  retrievalMode: RetrievalMode;
  episodeContext: string;
  contextError: string | null;
  isContextFetching: boolean;
}> = ({ retrievalMode, episodeContext, contextError, isContextFetching }) => {
  const [contextQuality, setContextQuality] = useState<'none' | 'basic' | 'rich'>('none');
  const [contextMetrics, setContextMetrics] = useState({
    locations: 0,
    artifacts: 0,
    characterContexts: 0,
    tacticalOverrides: 0
  });

  useEffect(() => {
    if (retrievalMode === 'database' && episodeContext && !contextError && !isContextFetching) {
      try {
        const context = JSON.parse(episodeContext);
        
        // Analyze context quality based on structure
        const locations = context.episode?.scenes?.length || 0;
        const artifacts = context.episode?.scenes?.reduce((total: number, scene: any) => 
          total + (scene.location?.artifacts?.length || 0), 0) || 0;
        const characterContexts = context.episode?.characters?.reduce((total: number, char: any) => 
          total + (char.location_contexts?.length || 0), 0) || 0;
        const tacticalOverrides = context.episode?.scenes?.filter((scene: any) => 
          scene.location?.tactical_override_location).length || 0;

        setContextMetrics({ locations, artifacts, characterContexts, tacticalOverrides });

        // Determine quality level
        if (locations > 0 && artifacts > 0 && characterContexts > 0) {
          setContextQuality('rich');
        } else if (locations > 0 || artifacts > 0) {
          setContextQuality('basic');
        } else {
          setContextQuality('none');
        }
      } catch (error) {
        setContextQuality('none');
        setContextMetrics({ locations: 0, artifacts: 0, characterContexts: 0, tacticalOverrides: 0 });
      }
    } else {
      setContextQuality('none');
      setContextMetrics({ locations: 0, artifacts: 0, characterContexts: 0, tacticalOverrides: 0 });
    }
  }, [retrievalMode, episodeContext, contextError, isContextFetching]);

  if (retrievalMode !== 'database') {
    return null;
  }

  const getQualityColor = () => {
    switch (contextQuality) {
      case 'rich': return 'text-green-400 bg-green-900/20 border-green-700';
      case 'basic': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
      case 'none': return 'text-gray-400 bg-gray-900/20 border-gray-700';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700';
    }
  };

  const getQualityLabel = () => {
    switch (contextQuality) {
      case 'rich': return 'Rich Database Context';
      case 'basic': return 'Basic Database Context';
      case 'none': return 'No Database Context';
      default: return 'Unknown Context';
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getQualityColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">{getQualityLabel()}</span>
        {isContextFetching && (
          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </div>
      
      {contextError ? (
        <div className="text-xs text-red-400">
          Error: {contextError}
        </div>
      ) : contextQuality !== 'none' ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Locations: {contextMetrics.locations}</div>
          <div>Artifacts: {contextMetrics.artifacts}</div>
          <div>Character Contexts: {contextMetrics.characterContexts}</div>
          <div>Tactical Overrides: {contextMetrics.tacticalOverrides}</div>
        </div>
      ) : (
        <div className="text-xs opacity-75">
          {isContextFetching ? 'Loading context...' : 'No context data available'}
        </div>
      )}
    </div>
  );
};

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
  onToggleCollapse: () => void;
  styleConfig: EpisodeStyleConfig;
  setStyleConfig: (config: EpisodeStyleConfig) => void;
  onRestoreFromRedis: () => Promise<void>;
  isRestoring: boolean;
  restoreError: string | null;
  restoreSuccess: boolean;
  saveSuccess: boolean;
  selectedLLM: LLMProvider;
  onSelectedLLMChange: (llm: LLMProvider) => void;
}

const LLMProviderSelector: React.FC<{
  selectedLLM: LLMProvider;
  onSelectedLLMChange: (llm: LLMProvider) => void;
}> = ({ selectedLLM, onSelectedLLMChange }) => {
  const llmOptions: LLMProvider[] = ['gemini', 'qwen', 'claude', 'openai', 'xai', 'deepseek', 'glm'];

  return (
    <details className="bg-gray-900/50 border border-gray-700 rounded-lg">
      <summary className="px-4 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:bg-gray-800/50">
        AI Model Configuration
      </summary>
      <div className="p-4 border-t border-gray-700">
        <label htmlFor="llm-selector" className="block text-xs font-medium text-gray-400 mb-1">
          Analysis Provider
        </label>
        <select
          id="llm-selector"
          value={selectedLLM}
          onChange={(e) => onSelectedLLMChange(e.target.value as LLMProvider)}
          className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
        >
          {llmOptions.map((llm) => (
            <option key={llm} value={llm}>
              {llm.charAt(0).toUpperCase() + llm.slice(1)}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-2">
          Select the AI model to perform the script analysis.
        </p>
      </div>
    </details>
  );
};

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

const StyleConfigPanel: React.FC<{
  config: EpisodeStyleConfig;
  setConfig: (config: EpisodeStyleConfig) => void;
}> = ({ config, setConfig }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    }

    return (
        <details className="bg-gray-900/50 border border-gray-700 rounded-lg" open>
            <summary className="px-4 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:bg-gray-800/50">
                Episode Style Configuration
            </summary>
            <div className="p-4 border-t border-gray-700 space-y-4">
                <div>
                    <label htmlFor="model" className="block text-xs font-medium text-gray-400 mb-1">
                        SwarmUI Model
                    </label>
                    <input
                        type="text"
                        id="model"
                        name="model"
                        value={config.model}
                        onChange={handleChange}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-xs text-gray-200 focus:ring-1 focus:ring-brand-blue focus:border-brand-blue"
                        placeholder="e.g., flux1-dev-fp8"
                    />
                </div>
            </div>
        </details>
    )
}

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
  onToggleCollapse,
  styleConfig,
  setStyleConfig,
  onRestoreFromRedis,
  isRestoring,
  restoreError,
      restoreSuccess,
      saveSuccess,
      selectedLLM,
      onSelectedLLMChange
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

  const getGenerateButtonText = () => {
    if (isLoading) {
      return loadingMessage || 'Analyzing...';
    }
    
    if (retrievalMode === 'database' && episodeContext && !contextError) {
      try {
        const context = JSON.parse(episodeContext);
        const scenes = context.episode?.scenes || [];
        const tacticalScenes = scenes.filter((scene: any) => scene.location?.tactical_override_location);
        
        if (tacticalScenes.length > 0) {
          return `Generate with ${tacticalScenes.length} tactical location${tacticalScenes.length > 1 ? 's' : ''}`;
        } else if (scenes.length > 0) {
          return `Generate with ${scenes.length} database location${scenes.length > 1 ? 's' : ''}`;
        }
      } catch (error) {
        // Fall back to default text if parsing fails
      }
    }
    
    return 'Analyze Script';
  };

  const getGenerateButtonSubtext = () => {
    if (isLoading || retrievalMode === 'manual') {
      return null;
    }
    
    if (retrievalMode === 'database' && episodeContext && !contextError) {
      try {
        const context = JSON.parse(episodeContext);
        const scenes = context.episode?.scenes || [];
        const tacticalScenes = scenes.filter((scene: any) => scene.location?.tactical_override_location);
        
        if (tacticalScenes.length > 0) {
          const overrideLocations = [...new Set(tacticalScenes.map((scene: any) => scene.location.tactical_override_location))];
          return `Using ${overrideLocations.join(', ')} overrides`;
        } else if (scenes.length > 0) {
          return 'Using database context';
        }
      } catch (error) {
        // Fall back to default text if parsing fails
      }
    }
    
    return null;
  };

  const isAnalyzeDisabled =
    isLoading ||
    isContextFetching ||
    !script.trim() ||
    (retrievalMode === 'manual' && (!episodeContext.trim() || !isContextJsonValid)) ||
    (retrievalMode === 'database' && (!storyUuid.trim() || !episodeContext.trim() || !!contextError));
    
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg h-full flex flex-col relative">
      <button 
        onClick={onToggleCollapse} 
        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors z-10"
        aria-label="Collapse Input Panel"
      >
        <PanelCollapseIcon />
      </button>
      <h2 className="text-2xl font-semibold mb-4 text-brand-purple text-center">Inputs</h2>
      <div className="flex-grow flex flex-col space-y-4">
        
        {/* Script Input */}
        <div className='flex flex-col flex-grow' style={{ minHeight: '150px' }}>
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

        {/* AI Model Config */}
        <LLMProviderSelector selectedLLM={selectedLLM} onSelectedLLMChange={onSelectedLLMChange} />

        {/* Style Config */}
        <StyleConfigPanel 
          config={styleConfig} 
          setConfig={setStyleConfig} 
        />

        {/* Retrieval Mode Switch and Context Input */}
        <div className='flex flex-col flex-grow' style={{ minHeight: '150px' }}>
            <div className="text-sm font-medium text-gray-300 my-2 text-center">Episode Context Source</div>
            <RetrievalModeSwitch mode={retrievalMode} setMode={onRetrievalModeChange} />
            
            {/* Database Context Indicator */}
            <div className="mt-3">
              <DatabaseContextIndicator 
                retrievalMode={retrievalMode}
                episodeContext={episodeContext}
                contextError={contextError}
                isContextFetching={isContextFetching}
              />
            </div>
            
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
      <div className="mt-6 space-y-2">
        {saveSuccess && (
          <div className="mb-2 p-2 bg-green-900/20 border border-green-700 rounded-md">
            <p className="text-xs text-center text-green-400">✅ Session saved successfully</p>
          </div>
        )}
        <button
          onClick={onAnalyze}
          disabled={isAnalyzeDisabled}
          className="w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{loadingMessage || 'Analyzing...'}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <GenerateIcon />
                <span>{getGenerateButtonText()}</span>
              </div>
              {getGenerateButtonSubtext() && (
                <div className="text-xs opacity-75 font-normal">
                  {getGenerateButtonSubtext()}
                </div>
              )}
            </div>
          )}
        </button>
        <button
          onClick={onRestoreFromRedis}
          disabled={isRestoring || isLoading}
          className={`w-full text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            restoreSuccess 
              ? 'text-green-400' 
              : restoreError 
                ? 'text-red-400' 
                : 'text-gray-400 hover:text-brand-blue'
          }`}
        >
          {isRestoring ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Restoring session...
            </span>
          ) : restoreSuccess ? (
            '✅ Session restored successfully'
          ) : (
            'Restore Last Session'
          )}
        </button>
        {restoreError && (
          <p className="text-xs text-center text-red-400 mt-1">{restoreError}</p>
        )}
        {restoreSuccess && !restoreError && (
          <p className="text-xs text-center text-green-400 mt-1">
            Session restored from {localStorage.getItem('last-restore-storage') || 'storage'}
          </p>
        )}
      </div>
    </div>
  );
};
