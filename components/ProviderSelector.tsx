// Provider Selector Component - AI provider selection interface
// CRITICAL: No emojis in this code file

import React, { useState, useEffect } from 'react';
import { AIProvider, ProviderHealth, CostMetrics } from '../services/aiProviderService';

interface ProviderSelectorProps {
  currentProvider: AIProvider;
  availableProviders: AIProvider[];
  onProviderChange: (provider: AIProvider) => void;
  providerHealth: Map<AIProvider, ProviderHealth>;
  costMetrics: Map<AIProvider, CostMetrics>;
  isLoading?: boolean;
}

interface ProviderInfo {
  provider: AIProvider;
  displayName: string;
  description: string;
  costTier: 'ultra-low' | 'low' | 'medium' | 'high';
  strengths: string[];
}

const PROVIDER_INFO: Record<AIProvider, ProviderInfo> = {
  [AIProvider.GEMINI]: {
    provider: AIProvider.GEMINI,
    displayName: 'Gemini 2.0 Flash',
    description: 'Google AI - Best for script analysis and large context processing',
    costTier: 'ultra-low',
    strengths: ['Large context window', 'Fast processing', 'Structured output', 'Cost effective']
  },
  [AIProvider.CLAUDE]: {
    provider: AIProvider.CLAUDE,
    displayName: 'Claude 3.5 Sonnet',
    description: 'Anthropic - Excellent for creative writing and reasoning',
    costTier: 'high',
    strengths: ['Creative writing', 'Complex reasoning', 'High quality prose', 'Narrative consistency']
  },
  [AIProvider.OPENAI]: {
    provider: AIProvider.OPENAI,
    displayName: 'GPT-4o',
    description: 'OpenAI - Reliable general-purpose model',
    costTier: 'high',
    strengths: ['Reliable performance', 'General purpose', 'Good fallback option', 'Wide capability']
  },
  [AIProvider.XAI]: {
    provider: AIProvider.XAI,
    displayName: 'Grok-3',
    description: 'xAI - Alternative provider for creative tasks',
    costTier: 'medium',
    strengths: ['Creative tasks', 'Alternative perspective', 'Good performance', 'Competitive pricing']
  },
  [AIProvider.DEEPSEEK]: {
    provider: AIProvider.DEEPSEEK,
    displayName: 'DeepSeek Chat',
    description: 'DeepSeek - Cost-effective for technical analysis',
    costTier: 'low',
    strengths: ['Technical analysis', 'Code understanding', 'Cost effective', 'Good reasoning']
  },
  [AIProvider.QWEN]: {
    provider: AIProvider.QWEN,
    displayName: 'Qwen',
    description: 'Alibaba - Ultra-low cost Chinese provider',
    costTier: 'ultra-low',
    strengths: ['Extreme cost savings', 'Good quality', 'Fast responses', '99.9% cost reduction']
  },
  [AIProvider.GLM]: {
    provider: AIProvider.GLM,
    displayName: 'GLM-4.5',
    description: 'Zhipu AI - Ultra-low cost creative writing',
    costTier: 'ultra-low',
    strengths: ['Creative writing', 'Extreme cost savings', 'Chinese language', '99.84% cost reduction']
  }
};

const COST_TIER_COLORS = {
  'ultra-low': 'text-green-600 bg-green-50',
  'low': 'text-green-500 bg-green-50',
  'medium': 'text-yellow-600 bg-yellow-50',
  'high': 'text-red-600 bg-red-50'
};

const STATUS_COLORS = {
  'healthy': 'text-green-600',
  'degraded': 'text-yellow-600',
  'unavailable': 'text-red-600'
};

const STATUS_INDICATORS = {
  'healthy': '●',
  'degraded': '◐',
  'unavailable': '○'
};

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  currentProvider,
  availableProviders,
  onProviderChange,
  providerHealth,
  costMetrics,
  isLoading = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'status'>('name');

  const getProviderHealth = (provider: AIProvider): ProviderHealth => {
    return providerHealth.get(provider) || {
      provider,
      status: 'unavailable',
      latency: 0,
      lastCheck: new Date(),
      errorRate: 0
    };
  };

  const getCostMetrics = (provider: AIProvider): CostMetrics => {
    return costMetrics.get(provider) || {
      provider,
      tokensUsed: 0,
      costUSD: 0,
      requestCount: 0,
      averageLatency: 0,
      successRate: 0
    };
  };

  const sortedProviders = [...availableProviders].sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        const costA = getCostMetrics(a).costUSD;
        const costB = getCostMetrics(b).costUSD;
        return costA - costB;
      case 'status':
        const statusA = getProviderHealth(a).status;
        const statusB = getProviderHealth(b).status;
        const statusOrder = { 'healthy': 0, 'degraded': 1, 'unavailable': 2 };
        return statusOrder[statusA] - statusOrder[statusB];
      default:
        return PROVIDER_INFO[a].displayName.localeCompare(PROVIDER_INFO[b].displayName);
    }
  });

  const formatCost = (cost: number): string => {
    if (cost < 0.01) return '$' + (cost * 1000).toFixed(3) + 'k';
    return '$' + cost.toFixed(3);
  };

  const formatLatency = (latency: number): string => {
    if (latency < 1000) return latency + 'ms';
    return (latency / 1000).toFixed(1) + 's';
  };

  return (
    <div className="provider-selector bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-200">AI Provider</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {showDetails && (
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'cost' | 'status')}
              className="text-sm bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-200"
            >
              <option value="name">Name</option>
              <option value="cost">Cost</option>
              <option value="status">Status</option>
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {sortedProviders.map((provider) => {
          const info = PROVIDER_INFO[provider];
          const health = getProviderHealth(provider);
          const metrics = getCostMetrics(provider);
          const isSelected = provider === currentProvider;
          const isAvailable = health.status !== 'unavailable';

          return (
            <div
              key={provider}
              className={`provider-option cursor-pointer rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-900/20'
                  : isAvailable
                  ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                  : 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => isAvailable && !isLoading && onProviderChange(provider)}
            >
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`text-lg ${STATUS_COLORS[health.status]}`}>
                      {STATUS_INDICATORS[health.status]}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-200">
                          {info.displayName}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${COST_TIER_COLORS[info.costTier]}`}>
                          {info.costTier === 'ultra-low' ? 'Ultra Low Cost' :
                           info.costTier === 'low' ? 'Low Cost' :
                           info.costTier === 'medium' ? 'Medium Cost' : 'High Cost'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {info.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-300">
                      {formatLatency(health.latency)}
                    </div>
                    {metrics.costUSD > 0 && (
                      <div className="text-xs text-gray-400">
                        {formatCost(metrics.costUSD)}
                      </div>
                    )}
                  </div>
                </div>

                {showDetails && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-300 mb-2">Strengths</h4>
                        <div className="flex flex-wrap gap-1">
                          {info.strengths.map((strength, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded"
                            >
                              {strength}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-gray-300 mb-2">Usage Stats</h4>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>Requests: {metrics.requestCount}</div>
                          <div>Tokens: {metrics.tokensUsed.toLocaleString()}</div>
                          <div>Success Rate: {(metrics.successRate * 100).toFixed(1)}%</div>
                          <div>Total Cost: {formatCost(metrics.costUSD)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm">Switching provider...</span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Health checks every 30s</span>
          <span>
            Total providers: {availableProviders.length} |
            Healthy: {Array.from(providerHealth.values()).filter(h => h.status === 'healthy').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProviderSelector;