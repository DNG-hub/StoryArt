// AI Provider Service - Multi-provider management for StoryArt
// CRITICAL: No emojis in this code file

export enum AIProvider {
  GEMINI = 'gemini',
  CLAUDE = 'claude',
  OPENAI = 'openai',
  XAI = 'xai',
  DEEPSEEK = 'deepseek',
  QWEN = 'qwen',
  GLM = 'glm'
}

export enum TaskType {
  SCRIPT_ANALYSIS = 'script_analysis',
  PROMPT_GENERATION = 'prompt_generation',
  CREATIVE_WRITING = 'creative_writing',
  TECHNICAL_ANALYSIS = 'technical_analysis',
  STRUCTURED_OUTPUT = 'structured_output',
  COST_OPTIMIZED = 'cost_optimized'
}

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  schema?: any;
  taskType?: TaskType;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  costUSD?: number;
}

export interface AIProviderConfig {
  name: string;
  provider: AIProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1kTokens: number;
  isAvailable: boolean;
  priority: number;
  supportedTasks: TaskType[];
  baseUrl?: string;
}

export interface ProviderHealth {
  provider: AIProvider;
  status: 'healthy' | 'degraded' | 'unavailable';
  latency: number;
  lastCheck: Date;
  errorRate: number;
}

export interface CostMetrics {
  provider: AIProvider;
  tokensUsed: number;
  costUSD: number;
  requestCount: number;
  averageLatency: number;
  successRate: number;
}

export abstract class BaseAIClient {
  protected config: AIProviderConfig;
  protected healthStatus: ProviderHealth;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.healthStatus = {
      provider: config.provider,
      status: 'unavailable',
      latency: 0,
      lastCheck: new Date(),
      errorRate: 0
    };
  }

  abstract generateResponse(request: AIRequest): Promise<AIResponse>;
  abstract generateStreamingResponse(request: AIRequest): AsyncGenerator<string, void, unknown>;
  abstract healthCheck(): Promise<boolean>;

  getConfig(): AIProviderConfig {
    return this.config;
  }

  getHealth(): ProviderHealth {
    return this.healthStatus;
  }

  protected updateHealth(status: 'healthy' | 'degraded' | 'unavailable', latency: number = 0) {
    this.healthStatus = {
      ...this.healthStatus,
      status,
      latency,
      lastCheck: new Date()
    };
  }

  protected calculateCost(inputTokens: number, outputTokens: number): number {
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * this.config.costPer1kTokens;
  }
}

// Gemini Client Implementation
export class GeminiClient extends BaseAIClient {
  private ai: any;

  constructor(config: AIProviderConfig) {
    super(config);
    // Initialize Google GenAI when needed
  }

  private async initializeClient() {
    if (!this.ai) {
      const { GoogleGenAI } = await import('@google/genai');
      this.ai = new GoogleGenAI({ apiKey: this.config.apiKey });
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    try {
      await this.initializeClient();

      const response = await this.ai.models.generateContent({
        model: this.config.model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemInstruction || 'You are a helpful assistant. Never use emojis in responses.',
          temperature: request.temperature || this.config.temperature,
          maxOutputTokens: request.maxTokens || this.config.maxTokens,
          responseMimeType: request.schema ? 'application/json' : 'text/plain',
          responseSchema: request.schema
        }
      });

      const latency = Date.now() - startTime;
      this.updateHealth('healthy', latency);

      const result = response.text();
      const usage = {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      };

      return {
        content: result,
        usage,
        model: this.config.model,
        provider: this.config.provider,
        costUSD: this.calculateCost(usage.inputTokens, usage.outputTokens)
      };
    } catch (error) {
      this.updateHealth('unavailable');
      throw new Error(`Gemini client error: ${error.message}`);
    }
  }

  async *generateStreamingResponse(request: AIRequest): AsyncGenerator<string, void, unknown> {
    try {
      await this.initializeClient();

      const stream = await this.ai.models.generateContentStream({
        model: this.config.model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature || this.config.temperature,
          maxOutputTokens: request.maxTokens || this.config.maxTokens
        }
      });

      for await (const chunk of stream.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.updateHealth('unavailable');
      throw new Error(`Gemini streaming error: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateResponse({
        prompt: 'Test connection. Respond with "OK".',
        maxTokens: 10
      });
      return response.content.includes('OK');
    } catch {
      return false;
    }
  }
}

// Claude Client Implementation
export class ClaudeClient extends BaseAIClient {
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ],
          system: request.systemInstruction || 'You are a helpful assistant. Never use emojis in responses.'
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      this.updateHealth('healthy', latency);

      const usage = {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      };

      return {
        content: data.content[0].text,
        usage,
        model: this.config.model,
        provider: this.config.provider,
        costUSD: this.calculateCost(usage.inputTokens, usage.outputTokens)
      };
    } catch (error) {
      this.updateHealth('unavailable');
      throw new Error(`Claude client error: ${error.message}`);
    }
  }

  async *generateStreamingResponse(request: AIRequest): AsyncGenerator<string, void, unknown> {
    // Claude streaming implementation
    throw new Error('Claude streaming not yet implemented');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateResponse({
        prompt: 'Test connection. Respond with "OK".',
        maxTokens: 10
      });
      return response.content.includes('OK');
    } catch {
      return false;
    }
  }
}

// Qwen Client Implementation
export class QwenClient extends BaseAIClient {
  private baseUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: request.systemInstruction || 'You are a helpful assistant. Never use emojis in responses.'
            },
            {
              role: 'user',
              content: request.prompt
            }
          ],
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          top_p: 0.9,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      this.updateHealth('healthy', latency);

      const usage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      };

      return {
        content: data.choices[0].message.content,
        usage,
        model: this.config.model,
        provider: this.config.provider,
        costUSD: this.calculateCost(usage.inputTokens, usage.outputTokens)
      };
    } catch (error) {
      this.updateHealth('unavailable');
      throw new Error(`Qwen client error: ${error.message}`);
    }
  }

  async *generateStreamingResponse(request: AIRequest): AsyncGenerator<string, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: request.systemInstruction || 'You are a helpful assistant. Never use emojis in responses.'
            },
            {
              role: 'user',
              content: request.prompt
            }
          ],
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          top_p: 0.9,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Qwen streaming API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      this.updateHealth('unavailable');
      throw new Error(`Qwen streaming error: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateResponse({
        prompt: 'Test connection. Respond with "OK".',
        maxTokens: 10
      });
      return response.content.includes('OK');
    } catch {
      return false;
    }
  }
}

// AI Provider Manager
export class AIProviderManager {
  private providers: Map<AIProvider, BaseAIClient> = new Map();
  private activeProvider: AIProvider = AIProvider.GEMINI;
  private costTracking: Map<AIProvider, CostMetrics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  async initializeProviders(configs: AIProviderConfig[]) {
    for (const config of configs) {
      try {
        let client: BaseAIClient;

        switch (config.provider) {
          case AIProvider.GEMINI:
            client = new GeminiClient(config);
            break;
          case AIProvider.CLAUDE:
            client = new ClaudeClient(config);
            break;
          case AIProvider.QWEN:
            client = new QwenClient(config);
            break;
          default:
            console.warn(`Provider ${config.provider} not yet implemented`);
            continue;
        }

        this.providers.set(config.provider, client);
        this.initializeCostTracking(config.provider);

        // Initial health check
        const isHealthy = await client.healthCheck();
        if (isHealthy) {
          console.log(`Provider ${config.provider} initialized successfully`);
        }
      } catch (error) {
        console.error(`Failed to initialize provider ${config.provider}:`, error);
      }
    }

    this.startHealthMonitoring();
  }

  private initializeCostTracking(provider: AIProvider) {
    this.costTracking.set(provider, {
      provider,
      tokensUsed: 0,
      costUSD: 0,
      requestCount: 0,
      averageLatency: 0,
      successRate: 1.0
    });
  }

  private startHealthMonitoring() {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000');
    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllProviderHealth();
    }, interval);
  }

  private async checkAllProviderHealth() {
    for (const [provider, client] of this.providers) {
      try {
        await client.healthCheck();
      } catch (error) {
        console.warn(`Health check failed for ${provider}:`, error);
      }
    }
  }

  async executeTask(request: AIRequest): Promise<AIResponse> {
    const provider = this.selectOptimalProvider(request.taskType);
    const client = this.providers.get(provider);

    if (!client) {
      throw new Error(`No available provider for task type: ${request.taskType}`);
    }

    try {
      const response = await client.generateResponse(request);
      this.updateCostTracking(provider, response);
      return response;
    } catch (error) {
      // Try fallback provider
      const fallbackProvider = this.selectFallbackProvider(provider);
      if (fallbackProvider) {
        const fallbackClient = this.providers.get(fallbackProvider);
        if (fallbackClient) {
          console.warn(`Falling back from ${provider} to ${fallbackProvider}`);
          const response = await fallbackClient.generateResponse(request);
          this.updateCostTracking(fallbackProvider, response);
          return response;
        }
      }
      throw error;
    }
  }

  private selectOptimalProvider(taskType?: TaskType): AIProvider {
    const costOptimizationEnabled = process.env.ENABLE_COST_OPTIMIZATION === 'true';

    if (costOptimizationEnabled) {
      // Prefer Chinese providers for cost optimization
      const chineseProviders = [AIProvider.QWEN, AIProvider.GLM];
      for (const provider of chineseProviders) {
        const client = this.providers.get(provider);
        if (client && client.getHealth().status === 'healthy') {
          return provider;
        }
      }
    }

    // Task-specific routing
    switch (taskType) {
      case TaskType.SCRIPT_ANALYSIS:
      case TaskType.STRUCTURED_OUTPUT:
        return this.findHealthyProvider([AIProvider.GEMINI, AIProvider.CLAUDE]);
      case TaskType.CREATIVE_WRITING:
      case TaskType.PROMPT_GENERATION:
        return this.findHealthyProvider([AIProvider.CLAUDE, AIProvider.GEMINI]);
      case TaskType.TECHNICAL_ANALYSIS:
        return this.findHealthyProvider([AIProvider.DEEPSEEK, AIProvider.GEMINI]);
      default:
        return this.activeProvider;
    }
  }

  private findHealthyProvider(preferredProviders: AIProvider[]): AIProvider {
    for (const provider of preferredProviders) {
      const client = this.providers.get(provider);
      if (client && client.getHealth().status === 'healthy') {
        return provider;
      }
    }

    // Fallback to any healthy provider
    for (const [provider, client] of this.providers) {
      if (client.getHealth().status === 'healthy') {
        return provider;
      }
    }

    return this.activeProvider;
  }

  private selectFallbackProvider(failedProvider: AIProvider): AIProvider | null {
    const fallbackOrder = [AIProvider.GEMINI, AIProvider.CLAUDE, AIProvider.OPENAI];

    for (const provider of fallbackOrder) {
      if (provider !== failedProvider) {
        const client = this.providers.get(provider);
        if (client && client.getHealth().status === 'healthy') {
          return provider;
        }
      }
    }

    return null;
  }

  private updateCostTracking(provider: AIProvider, response: AIResponse) {
    const metrics = this.costTracking.get(provider);
    if (metrics) {
      metrics.tokensUsed += response.usage.totalTokens;
      metrics.costUSD += response.costUSD || 0;
      metrics.requestCount += 1;

      this.costTracking.set(provider, metrics);
    }
  }

  setActiveProvider(provider: AIProvider) {
    if (this.providers.has(provider)) {
      this.activeProvider = provider;
    } else {
      throw new Error(`Provider ${provider} is not available`);
    }
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  getProviderHealth(): Map<AIProvider, ProviderHealth> {
    const healthMap = new Map<AIProvider, ProviderHealth>();
    for (const [provider, client] of this.providers) {
      healthMap.set(provider, client.getHealth());
    }
    return healthMap;
  }

  getCostMetrics(): Map<AIProvider, CostMetrics> {
    return new Map(this.costTracking);
  }

  getTotalCost(): number {
    let total = 0;
    for (const metrics of this.costTracking.values()) {
      total += metrics.costUSD;
    }
    return total;
  }

  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Global provider manager instance
export const providerManager = new AIProviderManager();