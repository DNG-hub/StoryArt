# Qwen Integration with Agency Swarm System

## Overview

This document describes how Qwen can be integrated with the Agency Swarm multi-agent system to enhance narrative planning and scene generation capabilities within StoryArt.

## Current Qwen Implementation

Qwen is already implemented in the StoryArt system with:

- `QwenClient` class in `services/aiProviderService.ts`
- Dedicated services (`qwenService.ts` for script analysis and `qwenPromptService.ts` for prompt generation)
- Priority 0 in cost optimization (most cost-effective provider)

## Agency Swarm Agent Integration

The Agency Swarm system consists of specialized agents that can leverage Qwen's cost-effective processing. The following agents can utilize Qwen:

### 1. StoryContextOrchestrator
- Uses Qwen for narrative direction and context management
- Processes comprehensive story context from database
- Leverages Qwen's cost efficiency for extensive context analysis

### 2. PlotArcCoordinator
- Employs Qwen for plot structure management
- Analyzes plot arc interactions and progression
- Benefits from Qwen's 99.9% cost reduction for complex plot analysis

### 3. CharacterConsistencyManager
- Utilizes Qwen for character development and relationship tracking
- Maintains character voice and consistency across episodes
- Processes character metadata efficiently using Qwen's capabilities

### 4. SceneCoherenceValidator
- Applies Qwen for timeline validation and narrative consistency
- Checks scene transitions and pacing
- Uses Qwen's contextual understanding for validation

### 5. EpisodeOutlineProvider
- Generates episode outlines using Qwen's analytical capabilities
- Synthesizes information for comprehensive episode context
- Creates detailed episode metadata with Qwen's narrative understanding

## Configuration

To enable Qwen for Agency Swarm agents, ensure the following environment variables are configured:

```env
# Qwen for Agency Swarm
VITE_QWEN_API_KEY=your_qwen_api_key_here
QWEN_API_KEY=your_qwen_api_key_here
QWEN_MODEL=qwen3-235b-a22b-instruct-2507
QWEN_MAX_TOKENS=8192
QWEN_TEMPERATURE=0.7
```

## Benefits of Qwen-Agency Swarm Integration

- **Cost Optimization**: 99.9% cost reduction compared to Western providers when using Qwen
- **Scalability**: Qwen's efficiency enables more complex multi-agent interactions
- **Consistency**: Same provider consistency across all Agency Swarm agents
- **Fallback Support**: Maintains Gemini fallback for redundancy

## Implementation Considerations

1. **Provider Selection**: The AI provider manager automatically selects optimal providers based on task type and cost optimization
2. **Health Monitoring**: Qwen client includes health checking and latency monitoring
3. **Streaming Support**: Qwen client supports streaming responses for real-time agent interactions
4. **Error Handling**: Proper fallback mechanisms to other providers if Qwen is unavailable

## Task-Specific Routing

The system uses intelligent routing for different tasks:
- `SCRIPT_ANALYSIS`: Priority on Qwen when cost optimization is enabled
- `PROMPT_GENERATION`: Leverages Qwen's cost efficiency for image prompt creation
- `CREATIVE_WRITING`: Uses Qwen for narrative generation tasks
- `TECHNICAL_ANALYSIS`: Employs Qwen for structured analysis

## Performance Metrics

Qwen integration enables comprehensive tracking:
- Token usage per agent
- Cost per agent operation
- Response latency for each agent
- Success rates for agent-specific tasks

## Migration Path

For existing Agency Swarm implementations:
1. Add Qwen API key to environment configuration
2. Ensure Agency Swarm agents are configured to use the provider manager
3. Test agent functionality with Qwen as primary provider
4. Monitor cost savings and performance metrics