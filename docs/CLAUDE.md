# Claude AI Configuration for Cursor IDE

## Important Code Guidelines

**CRITICAL: When writing code with Claude, you MUST NEVER use emojis in code, scripts, comments, or any programming content. This is a strict requirement for all development work.**

## Claude AI Provider Configuration

### Provider Overview
- **Provider**: Anthropic Claude
- **Best Use Cases**: Creative writing, prose generation, dialogue, complex reasoning
- **Model**: claude-3-5-sonnet-20241022
- **Context Window**: 200,000 tokens
- **Strengths**: Excellent at creative writing, maintains narrative consistency, strong reasoning

### Environment Configuration
```env
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=200000
CLAUDE_TEMPERATURE=0.7
```

### Cursor IDE Settings

Add to your Cursor IDE settings.json:

```json
{
  "anthropic.apiKey": "your_claude_api_key_here",
  "anthropic.model": "claude-3-5-sonnet-20241022",
  "anthropic.temperature": 0.7,
  "anthropic.maxTokens": 4000,
  "anthropic.systemPrompt": "You are a professional software developer working on the StoryArt application. NEVER use emojis in code, comments, or any programming content. Focus on clean, efficient, and well-documented code. Maintain consistency with existing codebase patterns."
}
```

### Claude-Specific Instructions for Cursor

When using Claude in Cursor IDE:

1. **No Emojis in Code**: Absolutely no emojis in any code generation, comments, or technical documentation
2. **Creative Writing Focus**: Use Claude for generating narrative content, character dialogue, and story elements
3. **Code Quality**: Emphasize clean, readable code with proper TypeScript types
4. **Documentation**: Generate comprehensive but professional documentation without decorative elements

### Recommended Prompts for Claude

#### For Code Generation:
```
Generate TypeScript code for [functionality]. Requirements:
- No emojis in code or comments
- Use proper TypeScript types
- Follow existing code patterns
- Include error handling
- Add JSDoc comments for functions
```

#### For Story/Narrative Content:
```
Generate narrative content for [story element]. Requirements:
- Professional tone
- Consistent with existing story elements
- No emojis in generated content
- Focus on literary quality
```

### Claude API Integration Pattern

```typescript
// services/claudeClient.ts
import { BaseAIClient, AIRequest, AIResponse } from './baseAIClient';

export class ClaudeClient extends BaseAIClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor(config: { apiKey: string; model: string }) {
    super();
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens || 4000,
          temperature: request.temperature || 0.7,
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
      return {
        content: data.content[0].text,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        model: this.model,
        provider: 'claude'
      };
    } catch (error) {
      throw new Error(`Claude client error: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateResponse({
        prompt: 'Test connection',
        maxTokens: 10
      });
      return !!response.content;
    } catch {
      return false;
    }
  }
}
```

### Cost Information
- **Input**: ~$3.00 per million tokens
- **Output**: ~$15.00 per million tokens
- **Best for**: High-quality creative content, complex reasoning tasks
- **Cost optimization**: Use for final drafts and creative content, not for simple tasks

### Cursor IDE Workflow Tips

1. **Code Generation**: Use Claude for complex logic and narrative processing
2. **Refactoring**: Excellent for improving code structure and readability
3. **Documentation**: Great for generating comprehensive API documentation
4. **Testing**: Good at generating test cases with proper edge case coverage

### System Prompt Template

```
You are an expert TypeScript developer working on StoryArt, a React-based story analysis and prompt generation application.

CRITICAL RULES:
1. NEVER use emojis in code, comments, or technical content
2. Follow TypeScript best practices and existing code patterns
3. Generate clean, maintainable, and well-documented code
4. Focus on performance and error handling
5. Maintain consistency with existing service architecture

Current task: [SPECIFIC_TASK_DESCRIPTION]
```

### Integration with StoryArt Provider System

When integrating Claude into the StoryArt provider system:

```typescript
// Example provider configuration
const claudeConfig: AIProviderConfig = {
  name: 'Claude 3.5 Sonnet',
  provider: AIProvider.CLAUDE,
  apiKey: process.env.CLAUDE_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 200000,
  temperature: 0.7,
  costPer1kTokens: 0.015,
  isAvailable: true,
  supportedTasks: [
    'prose_generation',
    'dialogue_writing',
    'scene_description',
    'emotional_depth',
    'character_development'
  ]
};
```

Remember: Claude excels at creative writing and complex reasoning but should be used judiciously due to higher costs compared to other providers.