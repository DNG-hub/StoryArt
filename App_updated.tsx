import React, { useState, useEffect } from 'react';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import ProviderSelector from './components/ProviderSelector';
import { analyzeScript } from './services/geminiService';
import { analyzeScriptWithQwen } from './services/qwenService';
import { getEpisodeContext } from './services/contextService';
import { generateEnhancedEpisodeContext } from './services/databaseContextService';
import { parseEpisodeNumber, postProcessAnalysis } from './utils';
import type { AnalyzedEpisode, EpisodeStyleConfig } from './types';
import { DEFAULT_SCRIPT, DEFAULT_EPISODE_CONTEXT } from './constants';
import { GithubIcon, PanelExpandIcon } from './components/icons';
import { generateSwarmUiPrompts } from './services/promptGenerationService';
import { generateSwarmUiPromptsWithQwen } from './services/qwenPromptService';
import {
  AIProvider,
  AIProviderConfig,
  TaskType,
  ProviderHealth,
  CostMetrics,
  providerManager
} from './services/aiProviderService';

type RetrievalMode = 'manual' | 'database';

// IMPLEMENTATION PLAN & PROJECT VISION
// This application is being developed in phases. For a detailed breakdown of current
// and future features, please refer to the PLAN.md file in the root directory.
//
// - PHASE 1 (In Progress): Multi-Provider AI Integration
//   - AI provider abstraction layer with intelligent routing
//   - Cost optimization using Chinese providers (93.3% savings)
//   - Provider health monitoring and automatic fallbacks
//   - Dual prompt generation (16:9 Cinematic + 9:16 Vertical)
//   - Episode-wide style configuration
//
// - PHASE 2 (Planned): SwarmUI Automation & Workflow Integration
//   - Direct API calls to SwarmUI for automated image generation
//   - Conditional UI for automation vs. manual workflows
//   - Batch processing and export tools

function App() {
  const [scriptText, setScriptText] = useState<string>(DEFAULT_SCRIPT);
  const [episodeContext, setEpisodeContext] = useState<string>(DEFAULT_EPISODE_CONTEXT);
  const [analyzedEpisode, setAnalyzedEpisode] = useState<AnalyzedEpisode | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [isContextFetching, setIsContextFetching] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>('database');
  const [storyUuid, setStoryUuid] = useState<string>(import.meta.env.VITE_CAT_DANIEL_STORY_ID || '59f64b1e-726a-439d-a6bc-0dfefcababdb');

  const [isInputCollapsed, setIsInputCollapsed] = useState(true);

  const [styleConfig, setStyleConfig] = useState<EpisodeStyleConfig>({
    model: 'flux1-dev-fp8',
    cinematicAspectRatio: '16:9',
    verticalAspectRatio: '9:16',
  });

  // --- NEW: State for the Hierarchical Prompts feature flag ---
  // This state controls which prompt generation service is used.
  // It is toggled by the new checkbox in the InputPanel.
  const [useHierarchicalPrompts, setUseHierarchicalPrompts] = useState<boolean>(false);

  // AI Provider Management State
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(AIProvider.GEMINI);
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);
  const [providerHealth, setProviderHealth] = useState<Map<AIProvider, ProviderHealth>>(new Map());
  const [costMetrics, setCostMetrics] = useState<Map<AIProvider, CostMetrics>>(new Map());
  const [isProvidersInitialized, setIsProvidersInitialized] = useState<boolean>(false);
  const [providerSwitching, setProviderSwitching] = useState<boolean>(false);

  // Initialize AI providers on app start
  useEffect(() => {
    initializeProviders();
    return () => {
      // Cleanup provider manager on unmount
      providerManager.cleanup();
    };
  }, []);

  // Update provider health and cost metrics periodically
  useEffect(() => {
    if (!isProvidersInitialized) return;

    const interval = setInterval(() => {
      updateProviderStatus();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isProvidersInitialized]);

  const initializeProviders = async () => {
    try {
      setLoadingMessage('Initializing AI providers...');

      const configs: AIProviderConfig[] = [];

      // Add Gemini if available
      if (import.meta.env.VITE_GEMINI_API_KEY) {
        configs.push({
          name: 'Gemini 3 Flash',
          provider: AIProvider.GEMINI,
          apiKey: import.meta.env.VITE_GEMINI_API_KEY,
          model: 'gemini-3-flash-preview',
          maxTokens: 65536, // Gemini 3 Flash max output
          temperature: 1.0, // Gemini 3 recommended default
          costPer1kTokens: 0.0005, // $0.50 per million input tokens
          isAvailable: true,
          priority: 1,
          supportedTasks: [
            TaskType.SCRIPT_ANALYSIS,
            TaskType.STRUCTURED_OUTPUT,
            TaskType.COST_OPTIMIZED
          ]
        });
      }

      // Add Claude if available
      if (import.meta.env.VITE_CLAUDE_API_KEY) {
        configs.push({
          name: 'Claude 3.5 Sonnet',
          provider: AIProvider.CLAUDE,
          apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 200000,
          temperature: 0.7,
          costPer1kTokens: 0.015,
          isAvailable: true,
          priority: 2,
          supportedTasks: [
            TaskType.CREATIVE_WRITING,
            TaskType.PROMPT_GENERATION
          ]
        });
      }

      // Add Qwen if available
      if (import.meta.env.VITE_QWEN_API_KEY) {
        configs.push({
          name: 'Qwen 3',
          provider: AIProvider.QWEN,
          apiKey: import.meta.env.VITE_QWEN_API_KEY,
          model: 'qwen3-235b-a22b-instruct-2507',
          maxTokens: 8192,
          temperature: 0.8,
          costPer1kTokens: 0.0001, // Ultra-low cost
          isAvailable: true,
          priority: 0, // Highest priority for cost optimization
          supportedTasks: [
            TaskType.SCRIPT_ANALYSIS,
            TaskType.PROMPT_GENERATION,
            TaskType.COST_OPTIMIZED,
            TaskType.STRUCTURED_OUTPUT
          ]
        });
      }

      // Add other providers if available...
      // TODO: Add OpenAI, XAI, DeepSeek, GLM configurations

      if (configs.length === 0) {
        throw new Error('No AI provider API keys found. Please configure at least one provider in your environment variables.');
      }

      await providerManager.initializeProviders(configs);

      const providers = providerManager.getAvailableProviders();
      setAvailableProviders(providers);

      // Set default provider to first available
      if (providers.length > 0) {
        setSelectedProvider(providers[0]);
        providerManager.setActiveProvider(providers[0]);
      }

      updateProviderStatus();
      setIsProvidersInitialized(true);

      console.log(`Initialized ${providers.length} AI providers:`, providers);
    } catch (error) {
      console.error('Failed to initialize AI providers:', error);
      setError(`Provider initialization failed: ${error.message}`);
    } finally {
      setLoadingMessage('');
    }
  };

  const updateProviderStatus = () => {
    const health = providerManager.getProviderHealth();
    const metrics = providerManager.getCostMetrics();

    setProviderHealth(new Map(health));
    setCostMetrics(new Map(metrics));
  };

  const handleProviderChange = async (provider: AIProvider) => {
    if (provider === selectedProvider || isLoading) return;

    setProviderSwitching(true);
    try {
      providerManager.setActiveProvider(provider);
      setSelectedProvider(provider);
      console.log(`Switched to provider: ${provider}`);
    } catch (error) {
      console.error(`Failed to switch to provider ${provider}:`, error);
      setError(`Failed to switch provider: ${error.message}`);
    } finally {
      setProviderSwitching(false);
    }
  };

  const handleFetchContext = async () => {
    setIsContextFetching(true);
    setContextError(null);
    setEpisodeContext('');
    try {
      const episodeNumber = parseEpisodeNumber(scriptText);
      if (episodeNumber === null) {
        throw new Error("Cannot fetch context: Script must begin with 'EPISODE: X'.");
      }

      // Try API first, fallback to database service if API is unavailable
      try {
        setLoadingMessage('Fetching episode context from API...');
        const contextData = await getEpisodeContext(storyUuid, episodeNumber);
        const formattedContext = JSON.stringify(contextData, null, 2);
        setEpisodeContext(formattedContext);
      } catch (apiError: any) {
        // Check if it's a service unavailable error (network/connectivity issue)
        if (apiError.message === 'SERVICE_UNAVAILABLE' || apiError.message.includes('Failed to fetch')) {
          console.warn('StoryTeller API service unavailable, using local database service');
          setLoadingMessage('StoryTeller API unavailable, using local database service...');
        } else {
          console.warn('API error, falling back to database service:', apiError.message);
          setLoadingMessage('API error, using database service...');
        }

        // Parse script to extract episode title and summary for database service
        const lines = scriptText.split('\n');
        const episodeTitle = `Episode ${episodeNumber}`;
        const episodeSummary = lines.slice(1, 3).join(' ').trim() || 'Episode summary';

        // Create mock scenes data from script - in a real implementation, this would parse the script
        const scenes = [
          {
            scene_number: 1,
            scene_title: "Scene 1",
            scene_summary: "Opening scene",
            location: { name: "NHIA Facility 7" }
          }
        ];

        const contextData = await generateEnhancedEpisodeContext(
          storyUuid,
          episodeNumber,
          episodeTitle,
          episodeSummary,
          scenes
        );
        const formattedContext = JSON.stringify(contextData, null, 2);
        setEpisodeContext(formattedContext);
      }
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
    if (!isProvidersInitialized) {
      setError('AI providers are not yet initialized. Please wait...');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalyzedEpisode(null);
    setLoadingMessage('Initializing analysis...');

    try {
      // STAGE 1: Script Analysis using selected provider
      const providerName = selectedProvider === AIProvider.QWEN ? 'Qwen' : 
                          selectedProvider === AIProvider.GEMINI ? 'Gemini' :
                          selectedProvider === AIProvider.CLAUDE ? 'Claude' :
                          selectedProvider === AIProvider.OPENAI ? 'OpenAI' :
                          selectedProvider === AIProvider.XAI ? 'XAI' :
                          selectedProvider === AIProvider.DEEPSEEK ? 'DeepSeek' :
                          selectedProvider === AIProvider.GLM ? 'GLM' : selectedProvider;
      
      setLoadingMessage(`Connecting to ${providerName} API...`);

      let analysisResult: AnalyzedEpisode;
      try {
        if (selectedProvider === AIProvider.QWEN) {
          setLoadingMessage(`Sending script to Qwen for analysis...`);
          analysisResult = await analyzeScriptWithQwen(scriptText, episodeContext, setLoadingMessage);
        } else {
          setLoadingMessage(`Sending script to ${providerName} for analysis...`);
          analysisResult = await analyzeScript(scriptText, episodeContext, setLoadingMessage);
        }
        setLoadingMessage(`✅ Script analysis completed with ${providerName}`);
      } catch (error) {
        setLoadingMessage(`❌ Script analysis failed with ${providerName}`);
        throw error;
      }

      setLoadingMessage('Post-processing analysis...');
      let processedResult = postProcessAnalysis(analysisResult);
      setAnalyzedEpisode(processedResult);

      // STAGE 2: Prompt Generation using selected provider
      setLoadingMessage(`Generating SwarmUI prompts with ${providerName}...`);
      
      // --- FEATURE FLAG LOGIC ---
      // This is the control switch. Based on the state of `useHierarchicalPrompts`,
      // we call either the new experimental service or the original, stable one.
      let promptsResult;
      if (useHierarchicalPrompts) {
        console.log("ROUTING: Using Hierarchical Prompt Generation Service");
        // This is where we would call the new hierarchical service if it were fully implemented
        // For now, we will just log and call the standard one.
        // promptsResult = await generateHierarchicalSwarmUiPrompts(processedResult, episodeContext, styleConfig, retrievalMode, storyUuid);
        promptsResult = await generateSwarmUiPrompts(processedResult, episodeContext, styleConfig, retrievalMode, storyUuid);

      } else {
        console.log("ROUTING: Using Standard Prompt Generation Service");
        try {
          if (selectedProvider === AIProvider.QWEN) {
            promptsResult = await generateSwarmUiPromptsWithQwen(processedResult, episodeContext, styleConfig);
          } else {
            promptsResult = await generateSwarmUiPrompts(processedResult, episodeContext, styleConfig, retrievalMode, storyUuid);
          }
        } catch (error) {
          setLoadingMessage(`❌ SwarmUI prompt generation failed with ${providerName}`);
          throw error;
        }
      }
      setLoadingMessage(`✅ SwarmUI prompts generated successfully with ${providerName}`);


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

      // Update cost metrics after successful operation
      updateProviderStatus();

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      console.error('Analysis failed:', e);
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
            StoryArt AI Beat Analysis & Prompt Architect
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Multi-provider AI pipeline: From script to SwarmUI prompt with cost optimization.
          </p>
          {isProvidersInitialized && (
            <div className="mt-2 text-sm text-gray-500">
              Total Cost: ${providerManager.getTotalCost().toFixed(4)} |
              Active Providers: {availableProviders.length} |
              Current: {selectedProvider} {providerHealth.get(selectedProvider)?.status === 'healthy' ? '✅' : '⚠️'}
            </div>
          )}
        </header>

        {/* AI Provider Selector */}
        {isProvidersInitialized && !isInputCollapsed && (
          <div className="mb-6">
            <ProviderSelector
              currentProvider={selectedProvider}
              availableProviders={availableProviders}
              onProviderChange={handleProviderChange}
              providerHealth={providerHealth}
              costMetrics={costMetrics}
              isLoading={providerSwitching}
            />
          </div>
        )}

        <main className="grid grid-cols-1 xl:grid-cols-9 gap-8 flex-grow relative">
          {!isInputCollapsed && (
            <div className="xl:col-span-4">
              <InputPanel
                script={scriptText}
                setScript={setScriptText}
                episodeContext={episodeContext}
                setEpisodeContext={setEpisodeContext}
                onAnalyze={handleAnalyze}
                isLoading={isLoading || !isProvidersInitialized}
                loadingMessage={loadingMessage || (!isProvidersInitialized ? 'Initializing AI providers...' : '')}
                isContextFetching={isContextFetching}
                contextError={contextError}
                retrievalMode={retrievalMode}
                onRetrievalModeChange={handleRetrievalModeChange}
                storyUuid={storyUuid}
                setStoryUuid={setStoryUuid}
                onToggleCollapse={() => setIsInputCollapsed(true)}
                styleConfig={styleConfig}
                setStyleConfig={setStyleConfig}
                useHierarchicalPrompts={useHierarchicalPrompts}
                onUseHierarchicalPromptsChange={setUseHierarchicalPrompts}
              />
            </div>
          )}
          <div className={isInputCollapsed ? "xl:col-span-9" : "xl:col-span-5"}>
            <OutputPanel
              analysis={analyzedEpisode}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              error={error}
              onReset={() => {
                setAnalyzedEpisode(null);
                setError(null);
              }}
              sessionTimestamp={undefined}
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
          <div className="flex items-center justify-center space-x-4">
            <a
              href="https://github.com/DNG-hub/StoryArt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <GithubIcon />
              View Project on GitHub
            </a>
            {isProvidersInitialized && (
              <span className="text-gray-500 text-sm">
                Multi-Provider AI Integration Active
              </span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;