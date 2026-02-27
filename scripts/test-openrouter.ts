#!/usr/bin/env tsx
/**
 * Test OpenRouter API Key and Available Models
 *
 * Usage:
 *   npx tsx scripts/test-openrouter.ts
 *
 * This script:
 * 1. Tests your OpenRouter API key
 * 2. Lists all available models
 * 3. Tests recommended models for script analysis
 * 4. Shows pricing information
 */

import {
  testOpenRouterConnection,
  testOpenRouterModel,
  getRecommendedScriptAnalysisModels,
  compareOpenRouterModels,
  OPENROUTER_MODELS,
} from '../services/openrouterService';

async function main() {
  console.log('\n🚀 OpenRouter API Test\n');
  console.log('=' .repeat(60));

  // Step 1: Test connection
  console.log('\n📡 Step 1: Testing OpenRouter Connection...\n');
  const connectionTest = await testOpenRouterConnection();

  if (!connectionTest.success) {
    console.error('❌ Connection Failed');
    console.error(`Message: ${connectionTest.message}`);
    console.error(`Error: ${connectionTest.error}`);
    console.error('\n⚠️  Make sure VITE_OPENROUTER_API_KEY is set in your .env file');
    console.error('   Get a key from: https://openrouter.ai/');
    process.exit(1);
  }

  console.log(`✅ Connection Successful!`);
  console.log(`   Found ${connectionTest.models?.length} available models`);

  // Step 2: List recommended models
  console.log('\n📋 Step 2: Recommended Models for Script Analysis\n');
  const recommendedModels = getRecommendedScriptAnalysisModels();
  for (const model of recommendedModels) {
    console.log(`• ${model.name}`);
    console.log(`  ID: ${model.modelId}`);
    console.log(`  Context: ${model.contextWindow.toLocaleString()} tokens`);
    console.log(`  Reason: ${model.reasoning}`);
    console.log();
  }

  // Step 3: Test a sample prompt with each recommended model
  console.log('🧪 Step 3: Testing Sample Prompts\n');
  const testPrompt = `You are an expert narrative analyst. Analyze this beat:
"Cat enters the warehouse cautiously, scanning for threats. She signals Daniel to cover the east entrance."

Respond in JSON format with: {"characters": [...], "setting": "...", "action": "...", "significance": "..."}`;

  const modelIds = recommendedModels.map(m => m.modelId);
  console.log(`Testing ${modelIds.length} models (this may take a minute)...\n`);

  const results = [];
  for (const modelId of modelIds) {
    process.stdout.write(`  Testing ${modelId}... `);
    const result = await testOpenRouterModel(modelId, testPrompt);
    results.push(result);
    if (result.success) {
      console.log('✅');
    } else {
      console.log('❌');
    }
  }

  console.log('\nDetailed Results:\n');
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.modelId}`);
      console.log(`   Tokens used: ${result.tokens?.prompt} prompt, ${result.tokens?.completion} completion`);
      // Show first 200 chars of response
      const preview = result.response?.substring(0, 200) || '';
      console.log(`   Response preview: ${preview}${preview.length === 200 ? '...' : ''}`);
    } else {
      console.log(`❌ ${result.modelId}`);
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  }

  // Step 4: Show comparison table
  console.log('💰 Step 4: Model Pricing & Context\n');
  if (connectionTest.models) {
    const relevantModels = connectionTest.models.filter(m =>
      m.id.includes('claude') ||
      m.id.includes('gpt-4') ||
      m.id.includes('llama') ||
      m.id.includes('mistral') ||
      m.id.includes('deepseek') ||
      m.id.includes('qwen')
    );

    console.log('Model ID                          | Context | Prompt    | Completion');
    console.log('-'.repeat(85));

    for (const model of relevantModels) {
      const id = model.id.padEnd(32);
      const context = `${(model.context_length / 1000).toFixed(0)}K`.padEnd(7);
      const prompt = `$${model.pricing.prompt}`.padEnd(9);
      const completion = `$${model.pricing.completion}`;
      console.log(`${id} | ${context} | ${prompt} | ${completion}`);
    }
    console.log();
  }

  // Step 5: Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ OpenRouter Setup is Ready!\n');
  console.log('Next steps:');
  console.log('1. Review the recommended models above');
  console.log('2. Update multiProviderAnalysisService.ts to use OpenRouter');
  console.log('3. Update App.tsx to show available models in the provider selector');
  console.log('4. Set VITE_OPENROUTER_API_KEY in your .env file\n');
  console.log('Documentation: https://openrouter.ai/docs/intro\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
