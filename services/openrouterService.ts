/**
 * OpenRouter Service
 *
 * Provides unified access to multiple LLM providers through OpenRouter API.
 * Replaces individual API key management for Claude, OpenAI, Qwen, DeepSeek, xAI, GLM.
 *
 * Single source of truth: VITE_OPENROUTER_API_KEY in .env
 */

// Load .env file in Node.js environment (for tsx scripts)
if (typeof window === 'undefined') {
  try {
    const dotenv = require('dotenv');
    dotenv.config();
  } catch (e) {
    // dotenv not available, will use process.env directly
  }
}

const getOpenRouterApiKey = (): string => {
  // Try Vite environment first (browser)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (key) return key;
  }

  // Try process.env (Node.js)
  const envKey = (process.env as any).VITE_OPENROUTER_API_KEY;
  if (envKey) return envKey;

  // Return empty string if not found
  return '';
};

const getOpenRouterReferer = (): string => {
  // OpenRouter requires a referer header for rate limiting
  return 'https://storyart.ai';
};

/**
 * OpenRouter Model Mapping
 * Maps friendly names to OpenRouter model IDs
 */
export const OPENROUTER_MODELS = {
  // Claude models
  CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_5_SONNET_20241022: 'anthropic/claude-3.5-sonnet-20241022',
  CLAUDE_3_OPUS: 'anthropic/claude-3-opus',

  // OpenAI models
  GPT_4O: 'openai/gpt-4o',
  GPT_4_TURBO: 'openai/gpt-4-turbo',
  GPT_4: 'openai/gpt-4',

  // Alibaba Qwen
  QWEN_TURBO: 'qwen/qwen-turbo',
  QWEN_PLUS: 'qwen/qwen-plus',

  // DeepSeek
  DEEPSEEK_CHAT: 'deepseek/deepseek-chat',

  // xAI Grok
  GROK_3: 'xai/grok-3',
  GROK_2: 'xai/grok-2',

  // Zhipu GLM
  GLM_4: 'zhipu/glm-4',
  GLM_4_FLASH: 'zhipu/glm-4-flash',

  // Other quality models
  LLAMA_3_1_405B: 'meta-llama/llama-3.1-405b-instruct',
  MISTRAL_LARGE: 'mistralai/mistral-large',
} as const;

export type OpenRouterModelId = typeof OPENROUTER_MODELS[keyof typeof OPENROUTER_MODELS];

/**
 * Test OpenRouter API key and list available models
 */
export async function testOpenRouterConnection(): Promise<{
  success: boolean;
  message: string;
  models?: Array<{
    id: string;
    name: string;
    context_length: number;
    pricing: {
      prompt: string;
      completion: string;
    };
  }>;
  error?: string;
}> {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return {
      success: false,
      message: 'OpenRouter API key not configured',
      error: 'VITE_OPENROUTER_API_KEY not set in .env file'
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': getOpenRouterReferer(),
        'X-Title': 'StoryArt',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: await response.text()
      };
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        context_length: number;
        pricing: {
          prompt: string;
          completion: string;
        };
        top_provider?: string;
      }>;
    };

    return {
      success: true,
      message: `Connected to OpenRouter. Found ${data.data.length} models.`,
      models: data.data
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to connect to OpenRouter',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test a specific model with a sample prompt
 */
export async function testOpenRouterModel(
  modelId: string,
  testPrompt: string = 'What is 2+2? Reply with just the number.'
): Promise<{
  success: boolean;
  modelId: string;
  response?: string;
  tokens?: {
    prompt: number;
    completion: number;
  };
  error?: string;
}> {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return {
      success: false,
      modelId,
      error: 'OpenRouter API key not configured'
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': getOpenRouterReferer(),
        'X-Title': 'StoryArt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: testPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        modelId,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json() as {
      choices: Array<{
        message: { content: string };
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
      };
    };

    return {
      success: true,
      modelId,
      response: data.choices[0]?.message?.content || 'No response',
      tokens: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
      }
    };
  } catch (error) {
    return {
      success: false,
      modelId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test multiple models in parallel
 */
export async function testOpenRouterModels(
  modelIds: string[],
  testPrompt?: string
): Promise<Array<Awaited<ReturnType<typeof testOpenRouterModel>>>> {
  return Promise.all(
    modelIds.map(modelId => testOpenRouterModel(modelId, testPrompt))
  );
}

/**
 * Recommended models for script analysis (beat segmentation)
 * Claude 3.5 Sonnet removed per user preference
 */
export function getRecommendedScriptAnalysisModels(): {
  name: string;
  modelId: string;
  contextWindow: number;
  reasoning: string;
}[] {
  return [
    {
      name: 'GPT-4o (Recommended)',
      modelId: OPENROUTER_MODELS.GPT_4O,
      contextWindow: 128000,
      reasoning: 'Strong reasoning, fast, good for narrative analysis'
    },
    {
      name: 'Llama 3.1 405B (Best Value)',
      modelId: OPENROUTER_MODELS.LLAMA_3_1_405B,
      contextWindow: 131072,
      reasoning: 'Open-source, very capable, cost-effective (1/3 price of alternatives)'
    },
    {
      name: 'Mistral Large',
      modelId: OPENROUTER_MODELS.MISTRAL_LARGE,
      contextWindow: 32768,
      reasoning: 'Fast, capable, good for rapid iteration'
    },
    {
      name: 'GPT-4 Turbo',
      modelId: OPENROUTER_MODELS.GPT_4_TURBO,
      contextWindow: 128000,
      reasoning: 'Reliable fallback, good for complex analysis'
    },
    {
      name: 'Qwen Turbo',
      modelId: OPENROUTER_MODELS.QWEN_TURBO,
      contextWindow: 131072,
      reasoning: 'Alternative provider, capable and cost-effective'
    },
    {
      name: 'DeepSeek Chat',
      modelId: OPENROUTER_MODELS.DEEPSEEK_CHAT,
      contextWindow: 164000,
      reasoning: 'Alternative provider, strong context window'
    },
  ];
}

/**
 * Call OpenRouter with unified interface
 */
export async function callOpenRouter(
  modelId: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number = 0.7,
  maxTokens: number = 8000
): Promise<{
  success: boolean;
  content: string;
  tokens?: {
    prompt: number;
    completion: number;
  };
  error?: string;
}> {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return {
      success: false,
      content: '',
      error: 'OpenRouter API key not configured'
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': getOpenRouterReferer(),
        'X-Title': 'StoryArt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: systemInstruction,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        content: '',
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json() as {
      choices: Array<{
        message: { content: string };
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
      };
    };

    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
      tokens: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
      }
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get pricing information for a model
 */
export async function getOpenRouterModelPricing(modelId: string): Promise<{
  modelId: string;
  name?: string;
  contextLength?: number;
  pricing?: {
    prompt: string;  // Price per million tokens
    completion: string;
  };
  error?: string;
}> {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return {
      modelId,
      error: 'OpenRouter API key not configured'
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': getOpenRouterReferer(),
        'X-Title': 'StoryArt',
      },
    });

    if (!response.ok) {
      return {
        modelId,
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        context_length: number;
        pricing: {
          prompt: string;
          completion: string;
        };
      }>;
    };

    const model = data.data.find(m => m.id === modelId);
    if (!model) {
      return {
        modelId,
        error: 'Model not found'
      };
    }

    return {
      modelId,
      name: model.name,
      contextLength: model.context_length,
      pricing: model.pricing
    };
  } catch (error) {
    return {
      modelId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Console-friendly model comparison
 */
export async function compareOpenRouterModels(modelIds: string[]): Promise<void> {
  console.log('\n📊 OpenRouter Model Comparison\n');
  console.log('Testing API connection and model capabilities...\n');

  // Test connection
  const connectionTest = await testOpenRouterConnection();
  if (!connectionTest.success) {
    console.error('❌ Connection failed:', connectionTest.error);
    return;
  }
  console.log(`✅ Connected to OpenRouter (${connectionTest.models?.length} models available)\n`);

  // Test individual models
  console.log('Testing sample prompts:\n');
  const results = await testOpenRouterModels(modelIds);

  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.modelId}`);
      console.log(`   Response: ${result.response}`);
      console.log(`   Tokens: ${result.tokens?.prompt} prompt, ${result.tokens?.completion} completion`);
    } else {
      console.log(`❌ ${result.modelId}`);
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  }

  // Show pricing
  console.log('\n💰 Pricing Information:\n');
  for (const modelId of modelIds) {
    const pricing = await getOpenRouterModelPricing(modelId);
    if (pricing.pricing) {
      console.log(`${pricing.name || modelId}`);
      console.log(`  Context: ${pricing.contextLength?.toLocaleString()} tokens`);
      console.log(`  Prompt: $${pricing.pricing.prompt} per 1M tokens`);
      console.log(`  Completion: $${pricing.pricing.completion} per 1M tokens`);
    } else {
      console.log(`${modelId}: ${pricing.error}`);
    }
    console.log();
  }
}

// Export configuration
export const OPENROUTER_CONFIG = {
  apiUrl: 'https://openrouter.ai/api/v1',
  referer: getOpenRouterReferer(),
  getApiKey: getOpenRouterApiKey,
} as const;
