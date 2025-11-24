# Vertical Prompt Generation for StoryArt

## Overview

This document explains how StoryArt handles vertical (9:16) image generation with specific considerations for both long-form storytelling and marketing use cases.

## Vertical Prompt Considerations

### Composition Differences from Cinematic (16:9)

Vertical images require different compositional approaches compared to cinematic formats:

- **Character-Centric Focus**: Vertical format emphasizes people and character details rather than wide environmental storytelling
- **Top-to-Bottom Emphasis**: Unlike cinematic formats that spread composition side-to-side, vertical formats prioritize elements in the top and bottom of the frame
- **Facial Feature Emphasis**: Character faces and expressions are more prominent and important in vertical compositions
- **Positioning Priority**: The main subject should be positioned close to camera with clear focus on facial features and expressions
- **Environmental Context**: Background elements should support but not compete with the character(s)

### Technical Requirements

- **Aspect Ratio**: 9:16 (width:height ratio)
- **Standard Dimensions**: Calculated based on base resolution of 1024
- **Parameter Values**:
  - `steps`: Always 40
  - `cfgscale`: Always 1
  - `seed`: -1 for random generation

## Two-Track Vertical Generation

StoryArt now handles vertical prompts for two distinct purposes with different requirements:

### 1. Long-Form Storytelling Verticals

**Purpose**: Supporting the main narrative content in vertical format for long-form viewing.

**Characteristics**:
- Narrative flow and continuity focused
- Environmental storytelling prioritized
- Character placement within the story world
- Consistent with cinematic prompts but optimized for vertical view
- Subtle visual appeal for sustained viewing

**Example Use Case**: Vertical episodes for mobile viewing platforms

### 2. Marketing Verticals

**Purpose**: Creating promotional content to attract viewers and drive engagement.

**Characteristics**:
- Character appeal focused
- High engagement potential
- Visual hooks to draw attention
- Dramatic lighting and composition
- Designed for social media platforms (TikTok, Instagram Reels, YouTube Shorts)
- High-intensity hooks for quick viewer capture

**Example Use Case**: Promo images for social media marketing

## Implementation

### Prompt Generation

The system now generates both cinematic and vertical prompts simultaneously with:

- **Cinematic (16:9)**: Emphasizes wide, environmental storytelling
- **Vertical (9:16)**: Character-centric with top/bottom frame emphasis

### Service Architecture

- `promptGenerationService.ts`: Primary service for generating both prompt types
- `qwenPromptService.ts`: Qwen-specific implementation with vertical considerations
- `verticalPromptService.ts`: Specialized service for enhancing vertical prompts based on use case

### Compositional Guidelines

#### For Long-Form Verticals:
- Character positioned in story context
- Environmental details support narrative
- Moderate lighting and composition
- Focus on narrative continuity
- Character placement within story world

#### For Marketing Verticals:
- Close-up character focus with dramatic lighting
- "Character's head at top of frame, feet at bottom" positioning
- High-concept visual elements
- Strong emotional or action hooks
- Designed for immediate attention capture

## Usage in Pipeline

Vertical prompts flow through the same pipeline as cinematic prompts but with specialized post-processing:

1. **Generation**: Both prompt types generated simultaneously
2. **Enhancement**: Vertical prompts enhanced based on intended use case
3. **Processing**: Same SwarmUI API integration
4. **Organization**: Files organized in appropriate directories (LongForm vs ShortForm)

## Best Practices

### For Long-Form Content:
- Maintain narrative consistency with cinematic prompts
- Preserve environmental context relevant to story
- Use moderate character positioning
- Focus on story progression rather than isolated moments

### For Marketing Content:
- Prioritize character appeal and emotional impact
- Include strong hooks in the prompt (e.g., "compelling visual hook that draws viewers in")
- Use dramatic lighting and composition
- Consider social media platform requirements
- Focus on attracting new viewers to the content