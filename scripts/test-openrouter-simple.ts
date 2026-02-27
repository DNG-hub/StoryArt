#!/usr/bin/env tsx
/**
 * Simple OpenRouter Test
 * Directly loads .env and tests connection
 */

import 'dotenv/config';

async function testOpenRouter() {
  const apiKey = process.env.VITE_OPENROUTER_API_KEY;

  console.log('\n🔍 OpenRouter Connection Test\n');
  console.log('=' .repeat(80));

  if (!apiKey) {
    console.error('\n❌ API Key Error');
    console.error('VITE_OPENROUTER_API_KEY not found in .env');
    console.error('\nAvailable env vars:');
    Object.keys(process.env)
      .filter(k => k.includes('openrouter') || k.includes('OPENROUTER'))
      .forEach(k => console.error(`  ${k}=${process.env[k]?.substring(0, 20)}...`));
    process.exit(1);
  }

  console.log(`\n✅ API Key Found: ${apiKey.substring(0, 20)}...`);
  console.log(`\n📡 Testing connection to OpenRouter...\n`);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://storyart.ai',
        'X-Title': 'StoryArt',
      },
    });

    console.log(`Response Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Connection Failed');
      console.error(`Error: ${text}`);
      process.exit(1);
    }

    const data = await response.json() as { data: Array<{ id: string; name: string; context_length: number }> };

    console.log(`✅ Connection Successful!`);
    console.log(`\n📊 Available Models: ${data.data.length}\n`);

    // List all models (for reference)
    console.log('All available models:\n');
    data.data.forEach((model, i) => {
      console.log(`${(i + 1).toString().padEnd(3)} | ${model.id.padEnd(40)} | ${(model.context_length / 1000).toFixed(0)}K`);
    });

    // Check for our fallback models
    console.log('\n' + '=' .repeat(80));
    console.log('\n🎯 Checking Fallback Models\n');

    const fallbackModelIds = [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'openai/gpt-4o',
      'openai/gpt-4-turbo',
      'qwen/qwen-turbo',
      'deepseek/deepseek-chat',
      'xai/grok-3',
      'zhipu/glm-4',
      'meta-llama/llama-3.1-405b-instruct',
      'mistralai/mistral-large',
    ];

    const availableSet = new Set(data.data.map(m => m.id));
    let foundCount = 0;

    console.log('Model ID                          | Status | Context');
    console.log('-'.repeat(80));

    for (const modelId of fallbackModelIds) {
      const available = availableSet.has(modelId);
      const modelData = data.data.find(m => m.id === modelId);
      const status = available ? '✅ Available' : '❌ Not Found';
      const context = modelData ? `${(modelData.context_length / 1000).toFixed(0)}K` : '-';

      console.log(`${modelId.padEnd(33)} | ${status.padEnd(11)} | ${context}`);

      if (available) foundCount++;
    }

    console.log('\n' + '=' .repeat(80));
    console.log(`\n✅ Summary: ${foundCount}/${fallbackModelIds.length} fallback models are accessible\n`);

    if (foundCount === 0) {
      console.error('❌ No fallback models found! Your account may not have access.');
      process.exit(1);
    }

    // Test one model
    console.log('🧪 Testing Sample Model (Claude 3.5 Sonnet)\n');

    if (availableSet.has('anthropic/claude-3.5-sonnet')) {
      const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://storyart.ai',
          'X-Title': 'StoryArt',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'user',
              content: 'What is 2+2? Reply with just the number.',
            },
          ],
          max_tokens: 10,
        }),
      });

      if (testResponse.ok) {
        const result = await testResponse.json() as { choices: Array<{ message: { content: string } }>; usage: { prompt_tokens: number; completion_tokens: number } };
        const response = result.choices[0]?.message?.content || 'No response';
        console.log(`✅ Sample model test successful`);
        console.log(`   Response: "${response}"`);
        console.log(`   Tokens: ${result.usage.prompt_tokens} prompt, ${result.usage.completion_tokens} completion`);
      } else {
        const error = await testResponse.text();
        console.log(`❌ Sample model test failed: ${error}`);
      }
    }

    console.log('\n✅ OpenRouter is ready to use!\n');

  } catch (error) {
    console.error('❌ Connection Error');
    console.error(error);
    process.exit(1);
  }
}

testOpenRouter();
