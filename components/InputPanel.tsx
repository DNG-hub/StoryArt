import React, { useState, useEffect } from 'react';
import { GenerateIcon, PanelCollapseIcon } from './icons';
import type { EpisodeStyleConfig, RetrievalMode, LLMProvider } from '../types';
import type { EpisodeListItem } from '../services/contextService';

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
    characterOverrides: 0
  });

  useEffect(() => {
    if (retrievalMode === 'database' && episodeContext && !contextError && !isContextFetching) {
      try {
        const context = JSON.parse(episodeContext);

        // Analyze context quality based on structure
        const locations = context.episode?.scenes?.length || 0;
        const artifacts = context.episode?.scenes?.reduce((total: number, scene: any) =>
          total + (scene.location?.artifacts?.length || 0), 0) || 0;

        // Characters are nested in scenes, and location_context is a single object (not array)
        const characterContexts = context.episode?.scenes?.reduce((total: number, scene: any) =>
          total + (scene.characters?.filter((char: any) => char.location_context).length || 0), 0) || 0;

        // Character overrides: check if characters have swarmui_prompt_override or lora_weight_adjustment
        // (these indicate location-specific appearance customization)
        const characterOverrides = context.episode?.scenes?.reduce((total: number, scene: any) => {
          const charactersWithOverrides = scene.characters?.filter((char: any) =>
            char.location_context?.swarmui_prompt_override ||
            char.location_context?.lora_weight_adjustment
          ).length || 0;
          return total + charactersWithOverrides;
        }, 0) || 0;

        setContextMetrics({ locations, artifacts, characterContexts, characterOverrides });

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
        setContextMetrics({ locations: 0, artifacts: 0, characterContexts: 0, characterOverrides: 0 });
      }
    } else {
      setContextQuality('none');
      setContextMetrics({ locations: 0, artifacts: 0, characterContexts: 0, characterOverrides: 0 });
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
          <div>Character Overrides: {contextMetrics.characterOverrides}</div>
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
  onSaveToRedis?: () => Promise<void>;
  isSaving?: boolean;
  saveError?: string | null;
  onOpenSessionBrowser?: () => void;
  selectedLLM: LLMProvider;
  onSelectedLLMChange: (llm: LLMProvider) => void;
  // New props for database episode selection
  episodeList: EpisodeListItem[];
  selectedEpisodeNumber: number | null;
  onEpisodeSelect: (episodeNumber: number) => void;
  isEpisodeListLoading: boolean;
  episodeListError: string | null;
  isScriptFetching: boolean;
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
  episodeContext?: string;
  retrievalMode?: RetrievalMode;
}> = ({ config, setConfig, episodeContext, retrievalMode }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    }

    // Extract image_config from Episode Context if available
    const imageConfig = React.useMemo(() => {
        if (episodeContext) {
            try {
                const parsed = JSON.parse(episodeContext);
                return parsed.episode?.image_config || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    }, [episodeContext]);

    const isFromDatabase = retrievalMode === 'database' && imageConfig;

    return (
        <details className="bg-gray-900/50 border border-gray-700 rounded-lg" open>
            <summary className="px-4 py-3 text-sm font-medium text-gray-300 cursor-pointer hover:bg-gray-800/50">
                Image Generation Configuration
                {isFromDatabase && (
                    <span className="ml-2 text-xs text-green-400">(from database)</span>
                )}
            </summary>
            <div className="p-4 border-t border-gray-700 space-y-4">
                {imageConfig ? (
                    /* Display image_config from Episode Context (read-only) */
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-gray-500">Model:</span>
                                <span className="ml-2 text-gray-200">{imageConfig.model}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Steps:</span>
                                <span className="ml-2 text-gray-200">{imageConfig.steps}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">CFG Scale:</span>
                                <span className="ml-2 text-gray-200">{imageConfig.cfgscale}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Scheduler:</span>
                                <span className="ml-2 text-gray-200">{imageConfig.scheduler}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Sampler:</span>
                                <span className="ml-2 text-gray-200">{imageConfig.sampler}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">LoRAs:</span>
                                <span className="ml-2 text-gray-200">{imageConfig.loras || 'none'}</span>
                            </div>
                        </div>
                        <div className="border-t border-gray-700 pt-3">
                            <div className="text-xs text-gray-400 mb-2">Presets:</div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-gray-800 rounded p-2">
                                    <div className="text-gray-500 mb-1">Cinematic (16:9)</div>
                                    <div className="text-gray-200">
                                        {imageConfig.presets?.cinematic?.width || 1344} x {imageConfig.presets?.cinematic?.height || 768}
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded p-2">
                                    <div className="text-gray-500 mb-1">Vertical (9:16)</div>
                                    <div className="text-gray-200">
                                        {imageConfig.presets?.vertical?.width || 768} x {imageConfig.presets?.vertical?.height || 1344}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 italic">
                            Configuration loaded from database. Edit in pgAdmin or via API.
                        </p>
                    </div>
                ) : (
                    /* Fallback: Manual model input (original behavior) */
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
                        <p className="text-xs text-gray-500 mt-2">
                            Using fallback configuration. Add image_config to Episode Context for full control.
                        </p>
                    </div>
                )}
            </div>
        </details>
    )
}

// Episode selector for database mode
const EpisodeSelector: React.FC<{
  episodes: EpisodeListItem[];
  selectedEpisodeNumber: number | null;
  onSelect: (episodeNumber: number) => void;
  isLoading: boolean;
  error: string | null;
  disabled?: boolean;
}> = ({ episodes, selectedEpisodeNumber, onSelect, isLoading, error, disabled }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3 bg-gray-900 border border-gray-700 rounded-md">
        <svg className="animate-spin h-4 w-4 text-brand-blue mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-gray-400 text-sm">Loading episodes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-900/20 border border-red-700 rounded-md">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-md">
        <p className="text-yellow-400 text-sm">No episodes found for this story.</p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="episode-selector" className="block text-sm font-medium text-gray-300 mb-2">
        Select Episode
      </label>
      <select
        id="episode-selector"
        value={selectedEpisodeNumber ?? ''}
        onChange={(e) => onSelect(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="" disabled>-- Select an episode --</option>
        {episodes.map((ep) => (
          <option key={ep.episode_id} value={ep.episode_number}>
            Episode {ep.episode_number}: {ep.episode_title}
            {ep.scene_count ? ` (${ep.scene_count} scenes)` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

// Manual mode notice component
const ManualModeNotice: React.FC = () => (
  <div className="p-3 bg-gray-900/50 border border-gray-600 rounded-md">
    <p className="text-xs text-gray-500 italic">
      Manual script input is available but hidden in Database mode.
      Switch to "Manual Input" mode to paste scripts directly.
    </p>
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
  onToggleCollapse,
  styleConfig,
  setStyleConfig,
  onRestoreFromRedis,
  isRestoring,
  restoreError,
  restoreSuccess,
  saveSuccess,
  onSaveToRedis,
  isSaving = false,
  saveError = null,
  onOpenSessionBrowser,
  selectedLLM,
  onSelectedLLMChange,
  // New props for database episode selection
  episodeList = [],
  selectedEpisodeNumber = null,
  onEpisodeSelect,
  isEpisodeListLoading = false,
  episodeListError = null,
  isScriptFetching = false,
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

        if (scenes.length > 0) {
          return `Generate with ${scenes.length} database scene${scenes.length > 1 ? 's' : ''}`;
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

        if (scenes.length > 0) {
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
    isScriptFetching ||
    !script.trim() ||
    (retrievalMode === 'manual' && (!episodeContext.trim() || !isContextJsonValid)) ||
    (retrievalMode === 'database' && (!storyUuid.trim() || !episodeContext.trim() || !!contextError || selectedEpisodeNumber === null));
    
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

        {/* Retrieval Mode Switch - Moved to top for better UX */}
        <div>
          <div className="text-sm font-medium text-gray-300 mb-2 text-center">Data Source</div>
          <RetrievalModeSwitch mode={retrievalMode} setMode={onRetrievalModeChange} />
        </div>

        {/* Script Input - Only shown in manual mode */}
        {retrievalMode === 'manual' ? (
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
        ) : (
          /* Database Mode: Episode Selection and Fetched Script */
          <div className='flex flex-col space-y-4'>
            {/* Story UUID Input */}
            <div>
              <label htmlFor="story-uuid-input" className="block text-sm font-medium text-gray-300 mb-2">
                Story UUID
              </label>
              <input
                type="text"
                id="story-uuid-input"
                value={storyUuid}
                onChange={(e) => setStoryUuid(e.target.value)}
                placeholder="Enter Story UUID..."
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition duration-200"
                aria-label="Story UUID Input"
              />
            </div>

            {/* Episode Selector */}
            <EpisodeSelector
              episodes={episodeList}
              selectedEpisodeNumber={selectedEpisodeNumber}
              onSelect={onEpisodeSelect}
              isLoading={isEpisodeListLoading}
              error={episodeListError}
              disabled={isContextFetching || isScriptFetching}
            />

            {/* Fetched Script Display (read-only) */}
            {selectedEpisodeNumber !== null && (
              <div className='flex flex-col' style={{ minHeight: '120px' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Script (from database)
                </label>
                {isScriptFetching ? (
                  <div className="flex-grow flex items-center justify-center bg-gray-900 border border-gray-700 rounded-md p-3">
                    <svg className="animate-spin h-5 w-5 text-brand-blue mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-400">Fetching script...</span>
                  </div>
                ) : script.trim() ? (
                  <textarea
                    value={script}
                    readOnly
                    className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-md p-3 font-mono text-sm text-gray-400 cursor-not-allowed"
                    style={{ minHeight: '100px', maxHeight: '200px' }}
                    aria-label="Fetched Script (read-only)"
                  />
                ) : (
                  <div className="flex-grow flex items-center justify-center bg-gray-900/50 border border-dashed border-gray-700 rounded-md p-3">
                    <span className="text-gray-500 text-sm">Script will appear here after fetching</span>
                  </div>
                )}
              </div>
            )}

            {/* Manual mode notice */}
            <ManualModeNotice />
          </div>
        )}

        {/* AI Model Config */}
        <LLMProviderSelector selectedLLM={selectedLLM} onSelectedLLMChange={onSelectedLLMChange} />

        {/* Image Generation Config (from Episode Context or fallback) */}
        <StyleConfigPanel
          config={styleConfig}
          setConfig={setStyleConfig}
          episodeContext={episodeContext}
          retrievalMode={retrievalMode}
        />

        {/* Episode Context Section */}
        <div className='flex flex-col' style={{ minHeight: '150px' }}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
                Episode Context {retrievalMode === 'database' ? '(auto-fetched)' : '(JSON)'}
            </label>

            {/* Database Context Indicator - shown in database mode */}
            {retrievalMode === 'database' && (
              <div className="mb-3">
                <DatabaseContextIndicator
                  retrievalMode={retrievalMode}
                  episodeContext={episodeContext}
                  contextError={contextError}
                  isContextFetching={isContextFetching}
                />
              </div>
            )}

            {retrievalMode === 'manual' ? (
              /* Manual mode: editable JSON input */
              <>
                <textarea
                    id="episode-context-input"
                    value={episodeContext}
                    onChange={(e) => setEpisodeContext(e.target.value)}
                    placeholder="Enter episode context JSON data here..."
                    className={`w-full flex-grow bg-gray-900 border rounded-md p-3 font-mono text-sm text-gray-200 focus:ring-2 focus:border-brand-blue transition duration-200 ${
                        !isContextJsonValid && episodeContext.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-700'
                    }`}
                    style={{ minHeight: '100px' }}
                    aria-label="Episode Context Input"
                />
                {!isContextJsonValid && episodeContext.trim() && (
                    <p className="text-red-400 text-xs mt-1">
                        Invalid JSON format. Please check for errors.
                    </p>
                )}
              </>
            ) : (
              /* Database mode: read-only fetched context */
              <div className="flex-grow flex flex-col">
                {isContextFetching ? (
                  <div className="flex-grow flex items-center justify-center bg-gray-900 border border-gray-700 rounded-md p-3">
                    <svg className="animate-spin h-5 w-5 text-brand-blue mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-400">Fetching context...</span>
                  </div>
                ) : contextError ? (
                  <div className="flex-grow flex items-center justify-center bg-red-900/20 border border-red-700 rounded-md p-3">
                    <p className="text-red-400 text-sm text-center">{contextError}</p>
                  </div>
                ) : episodeContext.trim() ? (
                  <textarea
                    id="episode-context-input-db"
                    value={episodeContext}
                    readOnly
                    className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-md p-3 font-mono text-sm text-gray-400 cursor-not-allowed"
                    style={{ minHeight: '100px', maxHeight: '200px' }}
                    aria-label="Fetched Episode Context"
                  />
                ) : selectedEpisodeNumber === null ? (
                  <div className="flex-grow flex items-center justify-center bg-gray-900/50 border border-dashed border-gray-700 rounded-md p-3">
                    <span className="text-gray-500 text-sm">Select an episode above to fetch context</span>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center bg-gray-900/50 border border-dashed border-gray-700 rounded-md p-3">
                    <span className="text-gray-500 text-sm">Context will appear here after fetching</span>
                  </div>
                )}
              </div>
            )}
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
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRestoreFromRedis}
            disabled={isRestoring || isLoading || isSaving}
            className={`text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors py-2 px-3 rounded-md border ${
              restoreSuccess 
                ? 'text-green-400 border-green-700 bg-green-900/20' 
                : restoreError 
                  ? 'text-red-400 border-red-700 bg-red-900/20' 
                  : 'text-gray-400 hover:text-brand-blue border-gray-700 hover:border-brand-blue'
            }`}
          >
            {isRestoring ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restoring...
              </span>
            ) : restoreSuccess ? (
              '✅ Restored'
            ) : (
              'Browse & Restore'
            )}
          </button>
          {onSaveToRedis && (
            <button
              onClick={onSaveToRedis}
              disabled={isSaving || isLoading || isRestoring}
              className={`text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors py-2 px-3 rounded-md border ${
                saveSuccess 
                  ? 'text-green-400 border-green-700 bg-green-900/20' 
                  : saveError 
                    ? 'text-red-400 border-red-700 bg-red-900/20' 
                    : 'text-gray-400 hover:text-brand-blue border-gray-700 hover:border-brand-blue'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : saveSuccess ? (
                '✅ Saved'
              ) : (
                'Save'
              )}
            </button>
          )}
        </div>
        {restoreError && (
          <p className="text-xs text-center text-red-400 mt-1">{restoreError}</p>
        )}
        {saveError && (
          <p className="text-xs text-center text-red-400 mt-1">{saveError}</p>
        )}
        {restoreSuccess && !restoreError && (
          <p className="text-xs text-center text-green-400 mt-1">
            Session restored from {localStorage.getItem('last-restore-storage') || 'storage'}
          </p>
        )}
        {/* Session browser is now opened by the "Restore" button above */}
      </div>
    </div>
  );
};
