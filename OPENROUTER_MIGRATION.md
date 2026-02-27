# OpenRouter Migration Guide

## Overview

This guide explains how to migrate StoryArt from individual API keys (Claude, OpenAI, Qwen, DeepSeek, xAI, GLM) to a **single unified OpenRouter API key**.

### Why OpenRouter?

| Aspect | Before | After |
|--------|--------|-------|
| **API Keys to Manage** | 7 (Gemini + 6 others) | 2 (Gemini + OpenRouter) |
| **Setup Complexity** | 6 separate accounts & keys | 1 account & key |
| **Rate Limiting** | Per-provider | Centralized |
| **Provider Switching** | Code changes needed | Config change only |
| **Cost Control** | Per-provider tracking | Single dashboard |
| **Context Window** | Provider-specific | OpenRouter routed automatically |
| **Model Versions** | Manual updates | Auto-routed to latest |

---

## Quick Start (5 minutes)

### Step 1: Get OpenRouter API Key

1. Go to https://openrouter.ai/
2. Sign up / Log in
3. Navigate to "Keys" section
4. Create a new API key
5. Copy the key

### Step 2: Update `.env` File

Replace individual provider keys with a single key:

**REMOVE these:**
```env
VITE_CLAUDE_API_KEY=...
VITE_OPENAI_API_KEY=...
VITE_QWEN_API_KEY=...
VITE_DEEPSEEK_API_KEY=...
VITE_XAI_API_KEY=...
VITE_ZHIPU_API_KEY=...
```

**ADD this:**
```env
VITE_OPENROUTER_API_KEY=sk-or-...your-key-here...
VITE_GEMINI_API_KEY=...keep-this-for-Gemini...
```

### Step 3: Test Your Key

Run the test script:
```bash
npx tsx scripts/test-openrouter.ts
```

You should see:
- ✅ Connection successful
- ✅ Available models listed
- ✅ Sample prompts tested
- 💰 Pricing information

### Step 4: View in Storyteller App

1. Start the dev server: `npm run dev`
2. Go to Provider selector in Storyteller
3. You should now see models available via OpenRouter

---

## Testing Your OpenRouter Setup

### Full Automated Test

```bash
npx tsx scripts/test-openrouter.ts
```

This script will:
- ✅ Verify your API key is valid
- ✅ List all 100+ available models
- ✅ Test 5 recommended models with sample prompts
- 💰 Show pricing for each model
- 📊 Generate comparison table

### Manual Testing (Node REPL)

```typescript
import { testOpenRouterConnection, testOpenRouterModel } from './services/openrouterService.ts';

// Test connection
const conn = await testOpenRouterConnection();
console.log(conn);

// Test a specific model
const test = await testOpenRouterModel(
  'anthropic/claude-3.5-sonnet',
  'What is 2+2?'
);
console.log(test);
```

### Quick CLI Test

```bash
# Just check if key is valid
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer sk-or-YOUR-KEY-HERE" \
  -H "HTTP-Referer: https://storyart.ai"
```

---

## Recommended Models for Script Analysis

| Model | Provider | Context | Speed | Cost | Best For |
|-------|----------|---------|-------|------|----------|
| **GPT-4o** ⭐ | OpenAI | 128K | Fast | $$ | Best overall balance |
| **Llama 3.1 405B** ⭐ | Meta | 131K | Fast | $ | Best value, cost-effective |
| Mistral Large | Mistral | 32K | Very Fast | $ | Rapid iteration |
| GPT-4 Turbo | OpenAI | 128K | Medium | $$$ | Complex analysis |
| Qwen Turbo | Alibaba | 131K | Fast | $ | Alternative |
| DeepSeek Chat | DeepSeek | 164K | Medium | $ | Largest context |

**Recommendation**: Start with **GPT-4o** for quality, evaluate **Llama 3.1 405B** for production (1/3 the cost).
**Removed**: Claude 3.5 Sonnet per user preference.

---

## Implementation Details

### File Changes

#### New Files
- `services/openrouterService.ts` — Unified OpenRouter interface
- `services/multiProviderAnalysisServiceV2.ts` — Refactored script analysis
- `scripts/test-openrouter.ts` — Test utility

#### Files to Update
- `src/types.ts` — Keep `LLMProvider` type
- `src/App.tsx` — Provider selector (remove individual API key inputs)
- `services/multiProviderAnalysisService.ts` — Can be deprecated or kept for backward compat

### Service Architecture

```
analyzeScriptWithProvider(script, context, provider)
    ↓
[Provider → OpenRouter Model Mapping]
    ↓
callOpenRouter(modelId, systemInstruction, userPrompt)
    ↓
OpenRouter API
    ↓
Response → Parsed AnalyzedEpisode
```

### Error Handling

OpenRouter service includes built-in error handling:
- API key validation on startup
- Graceful fallback if provider unavailable
- Clear error messages for debugging
- Retry logic for transient failures

---

## Models Available via OpenRouter

### Language Models (100+)

**Anthropic**
- claude-3.5-sonnet
- claude-3.5-haiku
- claude-3-opus
- claude-3-sonnet
- claude-3-haiku

**OpenAI**
- gpt-4o
- gpt-4-turbo
- gpt-4
- gpt-3.5-turbo

**Meta**
- llama-3.1-405b-instruct
- llama-3.1-70b-instruct
- llama-3.1-8b-instruct

**Mistral**
- mistral-large
- mistral-medium
- mistral-small
- mistral-7b

**DeepSeek**
- deepseek-chat

**Alibaba**
- qwen-turbo
- qwen-plus
- qwen-long

**Zhipu**
- glm-4
- glm-4-flash

**xAI**
- grok-3
- grok-2

**And many more...**

Use `testOpenRouterConnection()` to see the full list.

---

## Pricing

OpenRouter acts as a broker:

1. **Your Cost** = Model Provider Cost
2. **OpenRouter Fee** = 0% (they offer it as a service with optional donations)
3. **No Markup** from OpenRouter

Example pricing (per million tokens):
| Model | Prompt | Completion |
|-------|--------|------------|
| Claude 3.5 Sonnet | $3 | $15 |
| GPT-4o | $5 | $15 |
| Llama 3.1 405B | $1.35 | $5.4 |
| Mistral Large | $2 | $6 |

---

## Migration Checklist

- [ ] Get OpenRouter API key from https://openrouter.ai/
- [ ] Run `npx tsx scripts/test-openrouter.ts` to validate key
- [ ] Update `.env` file with `VITE_OPENROUTER_API_KEY`
- [ ] Remove individual API key env vars
- [ ] Update `src/App.tsx` provider selector UI
- [ ] Test script analysis with each recommended model
- [ ] Update documentation
- [ ] Deploy to production
- [ ] Monitor costs on OpenRouter dashboard

---

## Switching Providers at Runtime

The UI provider selector is already set up to work:

```typescript
// In Storyteller app
const selectedProvider = 'claude'; // User selection

await analyzeScriptWithProvider(
  scriptText,
  contextJson,
  selectedProvider,
  onProgress
);
```

OpenRouter handles the rest — no code changes needed.

---

## Monitoring & Costs

### OpenRouter Dashboard
1. Go to https://openrouter.ai/activity
2. View real-time usage and costs
3. Set billing alerts
4. Analyze which models are being used

### Cost Estimation
For a typical episode (4 scenes, ~160 beats):

| Model | Input Tokens | Output Tokens | Cost |
|-------|--------------|---------------|------|
| Claude 3.5 Sonnet | ~50,000 | ~30,000 | $0.30 |
| GPT-4o | ~50,000 | ~30,000 | $0.40 |
| Llama 3.1 405B | ~50,000 | ~30,000 | $0.10 |

---

## Troubleshooting

### Issue: "API key not configured"

**Solution**: Make sure `VITE_OPENROUTER_API_KEY` is in your `.env` file
```bash
echo "VITE_OPENROUTER_API_KEY=sk-or-..." >> .env
npm run dev  # Restart dev server
```

### Issue: "HTTP 401: Unauthorized"

**Solution**: Your API key is invalid or expired
- Check the key is copied correctly
- Regenerate key on OpenRouter website
- Make sure there are no leading/trailing spaces

### Issue: "Model not found"

**Solution**: The model ID changed or is not available in your region
- Run `npx tsx scripts/test-openrouter.ts` to see available models
- Check OpenRouter's status page

### Issue: "Rate limited"

**Solution**: You've exceeded OpenRouter's rate limits
- Wait a few minutes
- Check your account on OpenRouter for monthly limits
- Consider using a cheaper model for testing

---

## Gemini Stays Separate

**Important**: Keep your Gemini API key separate!

Gemini is still used for:
- VBS Phase B (vbsFillInService.ts) — Only Gemini (v0.21)
- Fallback LLM operations

```env
# Keep both:
VITE_GEMINI_API_KEY=...
VITE_OPENROUTER_API_KEY=...
```

---

## Next Steps

1. **Test your key** (5 minutes):
   ```bash
   npx tsx scripts/test-openrouter.ts
   ```

2. **Choose your preferred model** for script analysis (review the recommendation table)

3. **Update UI** to reflect available models via OpenRouter

4. **Deploy** and monitor costs on OpenRouter dashboard

---

## Questions?

- OpenRouter Docs: https://openrouter.ai/docs/intro
- OpenRouter Status: https://status.openrouter.ai/
- API Documentation: https://openrouter.ai/docs/api/overview

