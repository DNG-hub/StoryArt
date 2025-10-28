# Gemini AI Configuration for Cursor IDE

## Important Code Guidelines

**CRITICAL: When writing code with Gemini, you MUST NEVER use emojis in code, scripts, comments, or any programming content. This is a strict requirement for all development work.**

## Gemini AI Provider Configuration

### Provider Overview
- **Provider**: Google Gemini
- **Best Use Cases**: Script analysis, large context processing, structured data analysis
- **Model**: gemini-2.0-flash
- **Context Window**: 1M+ tokens
- **Strengths**: Massive context window, fast processing, excellent for analysis tasks

### Environment Configuration
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=models/gemini-2.0-flash
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.7
```

### Cursor IDE Settings

Add to your Cursor IDE settings.json:

```json
{
  "google.apiKey": "your_gemini_api_key_here",
  "google.model": "gemini-2.0-flash",
  "google.temperature": 0.7,
  "google.maxTokens": 8192,
  "google.systemPrompt": "You are a professional software developer working on the StoryArt application. NEVER use emojis in code, comments, or any programming content. Focus on analytical thinking, structured data processing, and efficient code generation."
}
```

### Gemini-Specific Instructions for Cursor

When using Gemini in Cursor IDE:

1. **No Emojis in Code**: Absolutely no emojis in any code generation, comments, or technical documentation
2. **Large Context Tasks**: Leverage Gemini's massive context window for complex analysis
3. **Structured Output**: Excellent for JSON schema generation and structured data processing
4. **Performance Focus**: Use for tasks requiring fast processing of large amounts of data

### Recommended Prompts for Gemini

#### For Script Analysis:
```
Analyze the following script content and extract structured data. Requirements:
- No emojis in output or code
- Return valid JSON structure
- Include scene boundaries and narrative beats
- Provide timing estimates and metadata
- Focus on analytical accuracy
```

#### For Code Generation:
```
Generate TypeScript code for [functionality]. Requirements:
- No emojis in code or comments
- Use existing patterns from codebase
- Include proper error handling
- Generate TypeScript interfaces for data structures
- Optimize for performance
```

### Gemini API Integration Pattern

```typescript
// services/geminiClient.ts
import { GoogleGenAI, Type } from '@google/genai';
import { BaseAIClient, AIRequest, AIResponse } from './baseAIClient';

export class GeminiClient extends BaseAIClient {
  private ai: GoogleGenAI;
  private model: string;

  constructor(config: { apiKey: string; model: string }) {
    super();
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    try {
      const generativeModel = this.ai.models.generateContent({
        model: this.model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemInstruction || 'You are a helpful assistant. Never use emojis in responses.',
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 8192,
          responseMimeType: 'application/json',
          responseSchema: request.schema
        }
      });

      const response = await generativeModel;
      const text = response.text();

      return {
        content: text,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        },
        model: this.model,
        provider: 'gemini'
      };
    } catch (error) {
      throw new Error(`Gemini client error: ${error.message}`);
    }
  }

  async generateStreamingResponse(request: AIRequest): AsyncGenerator<string, void, unknown> {
    try {
      const generativeModel = this.ai.models.generateContentStream({
        model: this.model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 8192
        }
      });

      for await (const chunk of generativeModel.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
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
```

### Schema Definition for Structured Output

```typescript
// Gemini excels at structured output with JSON schemas
const episodeAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    episodeNumber: { type: Type.NUMBER },
    title: { type: Type.STRING },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.NUMBER },
          title: { type: Type.STRING },
          beats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                beatId: { type: Type.STRING },
                beatTitle: { type: Type.STRING },
                coreAction: { type: Type.STRING },
                setting: { type: Type.STRING },
                characters: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['beatId', 'beatTitle', 'coreAction', 'setting', 'characters']
            }
          }
        },
        required: ['sceneNumber', 'title', 'beats']
      }
    }
  },
  required: ['episodeNumber', 'title', 'scenes']
};
```

### Cost Information
- **Input**: ~$0.00075 per million tokens
- **Output**: ~$0.003 per million tokens
- **Best for**: Large context analysis, structured data processing, high-volume tasks
- **Cost optimization**: Excellent for most tasks due to very low cost

### Cursor IDE Workflow Tips

1. **Analysis Tasks**: Use Gemini for large script analysis and data processing
2. **JSON Generation**: Excellent for generating structured data with schemas
3. **Batch Processing**: Good for processing multiple files or large datasets
4. **Planning Tasks**: Great for story planning and continuity checking

### System Prompt Template

```
You are an expert data analyst and TypeScript developer working on StoryArt, a story analysis application.

CRITICAL RULES:
1. NEVER use emojis in code, comments, or any output
2. Generate valid JSON when requested with proper schema adherence
3. Focus on analytical accuracy and structured thinking
4. Provide detailed analysis with proper data validation
5. Optimize for large context processing and performance

Current task: [SPECIFIC_TASK_DESCRIPTION]

Requirements:
- Clean, professional output without decorative elements
- Proper TypeScript types and interfaces
- Error handling and validation
- Performance-optimized code
```

### Integration with StoryArt Provider System

```typescript
// Example provider configuration
const geminiConfig: AIProviderConfig = {
  name: 'Gemini 2.0 Flash',
  provider: AIProvider.GEMINI,
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'models/gemini-2.0-flash',
  maxTokens: 8192,
  temperature: 0.7,
  costPer1kTokens: 0.00075,
  isAvailable: true,
  supportedTasks: [
    'script_analysis',
    'data_processing',
    'story_planning',
    'continuity_check',
    'structured_output',
    'batch_processing'
  ]
};
```

### Advanced Features

#### Function Calling
Gemini supports function calling for structured interactions:

```typescript
const functions = [
  {
    name: 'analyzeScript',
    description: 'Analyze script content and extract structured data',
    parameters: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'Script content to analyze' },
        context: { type: 'string', description: 'Episode context information' }
      },
      required: ['script']
    }
  }
];
```

#### Multimodal Capabilities
Gemini can process images and text together:

```typescript
// For future image analysis features
const multimodalRequest = {
  prompt: 'Analyze this storyboard image and generate scene description',
  image: imageData,
  maxTokens: 4000
};
```

Remember: Gemini is ideal for analytical tasks and large context processing, making it perfect for script analysis and structured data generation in StoryArt.