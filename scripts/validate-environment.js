#!/usr/bin/env node
// validate-environment.js
// Validates environment configuration for StoryArt pipeline

import { access, constants } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
try {
  dotenv.config({ path: join(__dirname, '..', '.env') });
} catch (error) {
  // .env file not found, use process.env directly
  console.log('Note: .env file not found, using process.env');
}

const results = {
  passed: [],
  warnings: [],
  errors: [],
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m',
  };
  
  const symbol = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
  console.log(`${colors[type]}${symbol} ${message}${colors.reset}`);
  
  if (type === 'success') results.passed.push(message);
  else if (type === 'warning') results.warnings.push(message);
  else if (type === 'error') results.errors.push(message);
}

async function checkPath(path, description, mustExist = true) {
  if (!path) {
    log(`${description}: Not configured`, 'error');
    return false;
  }
  
  try {
    if (mustExist) {
      await access(path, constants.F_OK);
      log(`${description}: ${path}`, 'success');
      return true;
    } else {
      // Check if parent directory exists
      const parent = path.split(/[\\/]/).slice(0, -1).join(path.includes('\\') ? '\\' : '/');
      if (existsSync(parent)) {
        log(`${description}: ${path} (parent directory exists)`, 'success');
        return true;
      } else {
        log(`${description}: ${path} (parent directory does not exist)`, 'warning');
        return false;
      }
    }
  } catch (error) {
    log(`${description}: ${path} (not accessible)`, 'error');
    return false;
  }
}

async function checkUrl(url, description) {
  if (!url) {
    log(`${description}: Not configured`, 'warning');
    return false;
  }
  
  try {
    const response = await fetch(url, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) 
    });
    log(`${description}: ${url} (accessible)`, 'success');
    return true;
  } catch (error) {
    log(`${description}: ${url} (not accessible)`, 'warning');
    return false;
  }
}

async function validateEnvironment() {
  console.log('\n🔍 Validating StoryArt Environment Configuration\n');
  console.log('=' .repeat(60));
  
  // Check AI Provider Keys
  console.log('\n📋 AI Provider Configuration:');
  const aiProviders = [
    { key: 'VITE_GEMINI_API_KEY', name: 'Gemini' },
    { key: 'VITE_CLAUDE_API_KEY', name: 'Claude' },
    { key: 'VITE_QWEN_API_KEY', name: 'Qwen' },
    { key: 'VITE_OPENAI_API_KEY', name: 'OpenAI' },
  ];
  
  let hasAiProvider = false;
  for (const provider of aiProviders) {
    if (process.env[provider.key]) {
      log(`${provider.name} API Key: Configured`, 'success');
      hasAiProvider = true;
    } else {
      log(`${provider.name} API Key: Not configured`, 'warning');
    }
  }
  
  if (!hasAiProvider) {
    log('⚠️  No AI provider keys found. At least one is required for script analysis.', 'error');
  }
  
  // Check SwarmUI Configuration
  console.log('\n🎨 SwarmUI Pipeline Configuration:');
  const swarmuiApiUrl = process.env.VITE_SWARMUI_API_URL || process.env.SWARMUI_API_URL || 'http://localhost:7801';
  const swarmuiOutputPath = process.env.VITE_SWARMUI_OUTPUT_PATH || process.env.SWARMUI_OUTPUT_PATH;
  const davinciPath = process.env.VITE_DAVINCI_PROJECTS_PATH || process.env.DAVINCI_PROJECTS_PATH;
  
  log(`SwarmUI API URL: ${swarmuiApiUrl}`, 'info');
  await checkUrl(`${swarmuiApiUrl}/API/GetNewSession`, 'SwarmUI API');
  
  if (swarmuiOutputPath) {
    await checkPath(swarmuiOutputPath, 'SwarmUI Output Path', true);
    // Check for raw subdirectory
    const rawPath = join(swarmuiOutputPath, 'local', 'raw');
    try {
      await access(rawPath, constants.F_OK);
      log(`SwarmUI Raw Output: ${rawPath}`, 'success');
    } catch {
      log(`SwarmUI Raw Output: ${rawPath} (does not exist, will be created)`, 'warning');
    }
  } else {
    log('SwarmUI Output Path: Not configured (using default)', 'warning');
  }
  
  if (davinciPath) {
    await checkPath(davinciPath, 'DaVinci Projects Path', false);
    // Check if writable
    try {
      await access(davinciPath, constants.W_OK);
      log(`DaVinci Projects Path: Writable`, 'success');
    } catch {
      log(`DaVinci Projects Path: Not writable`, 'warning');
    }
  } else {
    log('DaVinci Projects Path: Not configured (using default)', 'warning');
  }
  
  // Check Redis Configuration
  console.log('\n💾 Redis Configuration:');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6382/0';
  const redisApiUrl = process.env.VITE_REDIS_API_URL || process.env.REDIS_API_URL || 'http://localhost:7802';
  
  log(`Redis URL: ${redisUrl}`, 'info');
  await checkUrl(`${redisApiUrl}/health`, 'Redis API');
  
  // Check StoryTeller API
  console.log('\n🔗 StoryTeller API Configuration:');
  const storyTellerUrl = process.env.VITE_STORYTELLER_API_URL || process.env.STORYTELLER_API_URL || 'http://localhost:8000';
  await checkUrl(`${storyTellerUrl}/health`, 'StoryTeller API');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Validation failed. Please fix errors before using the pipeline.');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log('\n⚠️  Validation completed with warnings. Pipeline may not work correctly.');
    process.exit(0);
  } else {
    console.log('\n✅ All checks passed! Environment is properly configured.');
    process.exit(0);
  }
}

validateEnvironment().catch((error) => {
  console.error('\n❌ Validation script error:', error);
  process.exit(1);
});

