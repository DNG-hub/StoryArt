#!/usr/bin/env tsx
/**
 * OpenRouter Fallback Models Test
 *
 * Tests whether all fallback models listed in the codebase are actually
 * accessible and functional via OpenRouter.
 *
 * Usage:
 *   npx tsx scripts/test-openrouter-fallbacks.ts
 */

import {
  testOpenRouterConnection,
  testOpenRouterModel,
  OPENROUTER_MODELS,
  getRecommendedScriptAnalysisModels,
  getOpenRouterModelPricing,
} from '../services/openrouterService';

interface TestResult {
  modelId: string;
  name: string;
  available: boolean;
  accessible: boolean;
  testResponse?: string;
  tokensUsed?: { prompt: number; completion: number };
  pricing?: { prompt: string; completion: string };
  error?: string;
  context?: number;
}

async function main() {
  console.log('\n🔍 OpenRouter Fallback Models Test\n');
  console.log('=' .repeat(80));
  console.log('Testing accessibility of fallback models listed in StoryArt\n');

  // Step 1: Test basic connection
  console.log('📡 Step 1: Testing OpenRouter Connection\n');
  const connectionTest = await testOpenRouterConnection();

  if (!connectionTest.success) {
    console.error('❌ Connection Failed');
    console.error(`Error: ${connectionTest.error}`);
    console.error('\nPlease ensure VITE_OPENROUTER_API_KEY is set in .env file');
    process.exit(1);
  }

  console.log(`✅ Connected to OpenRouter`);
  console.log(`   Found ${connectionTest.models?.length} available models\n`);

  // Step 2: Get list of all available model IDs
  const availableModelIds = new Set(connectionTest.models?.map(m => m.id) || []);
  console.log(`📋 Step 2: Checking Our Fallback Models\n`);

  // List of models we use as fallbacks (from OPENROUTER_MODELS and recommended)
  const fallbackModels = [
    // From OPENROUTER_MODELS constant
    { key: 'CLAUDE_3_5_SONNET', id: OPENROUTER_MODELS.CLAUDE_3_5_SONNET, category: 'Claude' },
    { key: 'CLAUDE_3_OPUS', id: OPENROUTER_MODELS.CLAUDE_3_OPUS, category: 'Claude' },
    { key: 'GPT_4O', id: OPENROUTER_MODELS.GPT_4O, category: 'OpenAI' },
    { key: 'GPT_4_TURBO', id: OPENROUTER_MODELS.GPT_4_TURBO, category: 'OpenAI' },
    { key: 'QWEN_TURBO', id: OPENROUTER_MODELS.QWEN_TURBO, category: 'Qwen' },
    { key: 'DEEPSEEK_CHAT', id: OPENROUTER_MODELS.DEEPSEEK_CHAT, category: 'DeepSeek' },
    { key: 'GROK_3', id: OPENROUTER_MODELS.GROK_3, category: 'xAI' },
    { key: 'GLM_4', id: OPENROUTER_MODELS.GLM_4, category: 'Zhipu' },
    { key: 'LLAMA_3_1_405B', id: OPENROUTER_MODELS.LLAMA_3_1_405B, category: 'Meta' },
    { key: 'MISTRAL_LARGE', id: OPENROUTER_MODELS.MISTRAL_LARGE, category: 'Mistral' },
  ];

  console.log(`Models to test: ${fallbackModels.length}\n`);

  // Step 3: Check availability in API response
  console.log('Checking model availability in OpenRouter catalog:\n');
  const availabilityResults: TestResult[] = [];

  for (const model of fallbackModels) {
    const isAvailable = availableModelIds.has(model.id);
    const modelInfo = connectionTest.models?.find(m => m.id === model.id);

    const result: TestResult = {
      modelId: model.id,
      name: model.key,
      available: isAvailable,
      accessible: false,
      context: modelInfo?.context_length,
      pricing: modelInfo?.pricing,
    };

    if (isAvailable) {
      console.log(`✅ ${model.category.padEnd(10)} | ${model.key.padEnd(25)} | Available`);
      if (modelInfo?.context_length) {
        console.log(`   Context: ${(modelInfo.context_length / 1000).toFixed(0)}K tokens`);
      }
    } else {
      console.log(`❌ ${model.category.padEnd(10)} | ${model.key.padEnd(25)} | NOT AVAILABLE`);
      result.error = 'Model not found in OpenRouter catalog';
    }

    availabilityResults.push(result);
  }

  // Step 4: Test functionality of available models
  console.log('\n' + '=' .repeat(80));
  console.log('\n🧪 Step 3: Testing Model Functionality\n');
  console.log('Testing each available model with a sample prompt...\n');

  const testPrompt = `Analyze this screenplay beat:
"Cat enters the warehouse, scanning the darkened space. Security cameras blink red in the shadows. She signals Daniel to cover the east entrance."

Respond with JSON: {"beat_title": "...", "action_summary": "...", "key_props": [...]}`;

  const availableModelsToTest = availabilityResults
    .filter(r => r.available)
    .map(r => r.modelId);

  console.log(`Testing ${availableModelsToTest.length} available models...\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const modelId of availableModelsToTest) {
    process.stdout.write(`Testing ${modelId}... `);

    const result = await testOpenRouterModel(modelId, testPrompt);

    const testResult = availabilityResults.find(r => r.modelId === modelId);
    if (testResult) {
      if (result.success) {
        testResult.accessible = true;
        testResult.testResponse = result.response?.substring(0, 100) || '';
        testResult.tokensUsed = result.tokens;
        console.log(`✅ Accessible`);
        successCount++;
      } else {
        testResult.accessible = false;
        testResult.error = result.error;
        console.log(`❌ Error: ${result.error}`);
        failureCount++;
      }
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Step 5: Generate Summary Report
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 Step 4: Summary Report\n');

  const availableCount = availabilityResults.filter(r => r.available).length;
  const accessibleCount = availabilityResults.filter(r => r.accessible).length;
  const unavailableCount = availabilityResults.filter(r => !r.available).length;

  console.log(`Total Models Tested: ${availabilityResults.length}`);
  console.log(`✅ Available in Catalog: ${availableCount}`);
  console.log(`✅ Actually Accessible: ${accessibleCount}`);
  console.log(`❌ Not Available: ${unavailableCount}\n`);

  // Detailed table
  console.log('Detailed Results:\n');
  console.log('Model'.padEnd(35) + '| Available | Accessible');
  console.log('-'.repeat(80));

  for (const result of availabilityResults) {
    const available = result.available ? '✅' : '❌';
    const accessible = result.accessible ? '✅' : '❌';
    const modelDisplay = result.name.padEnd(33);
    console.log(`${modelDisplay}| ${available}        | ${accessible}`);
    if (result.error) {
      console.log(`${''.padEnd(35)}  └─ ${result.error}`);
    }
  }

  // Step 6: Recommendations
  console.log('\n' + '=' .repeat(80));
  console.log('\n💡 Step 5: Recommendations\n');

  const accessibleModels = availabilityResults.filter(r => r.accessible);

  if (accessibleModels.length === 0) {
    console.error('❌ No models are accessible! Check your API key and OpenRouter account status.');
    process.exit(1);
  }

  console.log(`✅ Good news! ${accessibleModels.length} models are accessible for fallback use.\n`);

  console.log('Recommended Primary Models (in order):\n');

  // Sort by capability and cost
  const recommendations = [
    { id: OPENROUTER_MODELS.CLAUDE_3_5_SONNET, name: 'Claude 3.5 Sonnet', rating: '⭐⭐⭐ Excellent' },
    { id: OPENROUTER_MODELS.GPT_4O, name: 'GPT-4o', rating: '⭐⭐⭐ Excellent' },
    { id: OPENROUTER_MODELS.LLAMA_3_1_405B, name: 'Llama 3.1 405B', rating: '⭐⭐⭐ Excellent (Budget)' },
    { id: OPENROUTER_MODELS.MISTRAL_LARGE, name: 'Mistral Large', rating: '⭐⭐ Good (Fast)' },
  ];

  let rank = 1;
  for (const rec of recommendations) {
    const isAccessible = accessibleModels.find(m => m.modelId === rec.id);
    if (isAccessible) {
      console.log(`${rank}. ${rec.name.padEnd(25)} ${rec.rating}`);
      console.log(`   ID: ${rec.id}`);
      if (isAccessible.context) {
        console.log(`   Context: ${(isAccessible.context / 1000).toFixed(0)}K tokens`);
      }
      if (isAccessible.pricing) {
        console.log(`   Cost: $${isAccessible.pricing.prompt} (prompt) / $${isAccessible.pricing.completion} (completion) per 1M tokens`);
      }
      console.log();
      rank++;
    }
  }

  // Step 7: Next Steps
  console.log('=' .repeat(80));
  console.log('\n✅ Test Complete!\n');
  console.log('Next Steps:\n');
  console.log('1. Review the accessible models above');
  console.log('2. Choose your preferred model for script analysis');
  console.log('3. Update multiProviderAnalysisService.ts to use OpenRouter');
  console.log('4. Update App.tsx to show available models in the provider selector');
  console.log('5. Test script analysis with your chosen model\n');
  console.log('Documentation: https://openrouter.ai/docs/intro\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
