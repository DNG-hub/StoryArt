# Qwen Integration Test

## Environment Setup

To enable Qwen for narrative parsing and beat calculation, add these environment variables to your `.env` file:

```env
# Qwen (Alibaba) - Ultra-low cost Chinese provider
VITE_QWEN_API_KEY=your_qwen_api_key_here
QWEN_API_KEY=your_qwen_api_key_here
QWEN_MODEL=qwen3-235b-a22b-instruct-2507
QWEN_MAX_TOKENS=8192
QWEN_TEMPERATURE=0.8
```

## Cost Savings

- **99.9% cost reduction** compared to Western providers
- **~$0.0001 per request** vs $0.75+ for Gemini/Claude
- **Priority 0** in provider selection (highest priority for cost optimization)

## Features Enabled

✅ **Script Analysis**: Narrative parsing and beat calculation using Qwen
✅ **SwarmUI Prompt Generation**: Visual prompt creation for image generation
✅ **Provider Selection**: Automatic Qwen selection when API key is available
✅ **Fallback System**: Falls back to Gemini if Qwen fails
✅ **Cost Tracking**: Real-time cost monitoring per provider

## Usage

1. **Add Qwen API Key**: Get your API key from Alibaba Cloud DashScope
2. **Configure Environment**: Add `VITE_QWEN_API_KEY` to your `.env` file
3. **Select Provider**: Choose "Qwen" from the provider selector in the UI
4. **Run Analysis**: Both script analysis and prompt generation will use Qwen

## API Endpoint

- **Base URL**: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- **Model**: `qwen3-235b-a22b-instruct-2507`
- **Authentication**: Bearer token via API key
- **Format**: OpenAI-compatible API

## Integration Status

- ✅ QwenClient implemented in `services/aiProviderService.ts`
- ✅ Script analysis service in `services/qwenService.ts`
- ✅ Prompt generation service in `services/qwenPromptService.ts`
- ✅ Provider selection in `App_updated.tsx`
- ✅ Cost optimization enabled (Priority 0)

The Gemini code remains in place as fallback, ensuring backward compatibility while enabling ultra-low-cost AI processing with Qwen.
