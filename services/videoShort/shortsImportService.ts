/**
 * Shorts Import Service
 * 
 * Parses pre-written YouTube Shorts from markdown files and converts them
 * to VideoShortMoment[] format compatible with the planned video short system.
 * 
 * This service enables importing curated shorts while maintaining compatibility
 * with the AI-driven video short marketing system.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { VideoShortMoment, SwarmUIPrompt } from '../../types';

/**
 * Standard negative prompt for all video short generations
 */
const STANDARD_NEGATIVE_PROMPT = `blurry, low quality, distorted faces, extra limbs, cartoon, anime, bright cheerful colors, fantasy elements, unrealistic proportions, multiple faces, deformed anatomy, artificial appearance, oversaturated, childish style, background characters, faces hidden, back to camera, civilian clothes, peaceful setting, relaxed postures, bright cheerful lighting, fantasy weapons, unrealistic tactics, superhero poses, explosive special effects`;

/**
 * Standard SwarmUI parameters for 9:16 vertical YouTube Shorts
 */
const STANDARD_PARAMETERS = {
  width: 1088,
  height: 1920,
  model: 'flux1-dev-fp8',
  sampler: 'iPNDM',
  scheduler: 'simple',
  steps: 20,
  cfgscale: 1,
  fluxguidancescale: 3.5,
  seed: -1,
  automaticvae: true,
  sdtextencs: 'CLIP + T5'
};

/**
 * Parsed segment from markdown files
 */
interface ParsedSegment {
  segmentId: string;
  description: string;
  prompt: string;
  parameters: typeof STANDARD_PARAMETERS;
}

/**
 * Parsed short from markdown files
 */
interface ParsedShort {
  shortId: string;
  title: string;
  hook: string;
  focus: string;
  segments: ParsedSegment[];
}

/**
 * Parse YouTube Shorts creation plan markdown file
 */
async function parseCreationPlan(filePath: string): Promise<ParsedShort[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const shorts: ParsedShort[] = [];
  
  // Split by short sections (### Short X:)
  const shortSections = content.split(/### Short \d+:/);
  
  for (let i = 1; i < shortSections.length; i++) {
    const section = shortSections[i];
    
    // Extract short title (first line after "Short X:")
    const titleMatch = section.match(/^([^\n]+)/);
    if (!titleMatch) continue;
    
    const titleLine = titleMatch[1].trim();
    const title = titleLine.replace(/\([^)]+\)$/, '').trim(); // Remove parenthetical
    const shortId = `short-${String(i).padStart(2, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    
    // Extract hook (line starting with "Viral Hook Overlay:")
    const hookMatch = section.match(/Viral Hook Overlay:\s*"([^"]+)"/);
    const hook = hookMatch ? hookMatch[1] : '';
    
    // Extract focus (line starting with "Focus:")
    const focusMatch = section.match(/Focus:\s*([^\n]+)/);
    const focus = focusMatch ? focusMatch[1].trim() : '';
    
    // Extract segments (format: **Segment X:** description followed by ``` code block)
    const segments: ParsedSegment[] = [];
    
    // Pattern: **Segment X:** description, then ``` code block with prompt
    // The markdown format is:
    // **Segment 1:** Description
    // ```
    // prompt text
    // ```
    const segmentPattern = /\*\*Segment \d+:\*\*\s*([^\n]+)\s*\n\s*```\s*\n([\s\S]*?)```/g;
    const segmentMatches = Array.from(section.matchAll(segmentPattern));
    
    let segmentIndex = 1;
    for (const match of segmentMatches) {
      const segmentDescription = match[1].trim();
      const prompt = match[2].trim();
      
      // Skip if prompt is empty
      if (!prompt) continue;
      
      const segmentId = `${shortId}-segment-${String(segmentIndex).padStart(2, '0')}`;
      
      segments.push({
        segmentId,
        description: segmentDescription,
        prompt,
        parameters: { ...STANDARD_PARAMETERS }
      });
      
      segmentIndex++;
    }
    
    if (segments.length > 0) {
      shorts.push({
        shortId,
        title,
        hook,
        focus,
        segments
      });
    }
  }
  
  return shorts;
}

/**
 * Parse SwarmUI parameters mapping markdown file
 * (Currently uses standard parameters, but can be extended to read from file)
 */
async function parseParametersMapping(filePath: string): Promise<Map<string, typeof STANDARD_PARAMETERS>> {
  // For now, return empty map (using standard parameters)
  // Can be extended later to read specific parameters from file
  return new Map();
}

/**
 * Convert parsed short segments to VideoShortMoment format
 */
function convertToVideoShortMoments(
  parsedShorts: ParsedShort[],
  episodeNumber: number
): VideoShortMoment[] {
  const moments: VideoShortMoment[] = [];
  
  for (const short of parsedShorts) {
    for (const segment of short.segments) {
      const moment: VideoShortMoment = {
        momentId: segment.segmentId,
        title: `${short.title} - ${segment.description}`,
        description: segment.description,
        storyArcConnection: short.focus,
        emotionalHook: short.hook,
        visualPrompt: {
          prompt: segment.prompt,
          negative_prompt: STANDARD_NEGATIVE_PROMPT,
          ...segment.parameters
        } as SwarmUIPrompt,
        buzzScore: 8 // Default high score for curated shorts
      };
      
      moments.push(moment);
    }
  }
  
  return moments;
}

/**
 * Main function to parse markdown files and convert to VideoShortMoment[]
 * 
 * @param planPath - Path to youtube_shorts_creation_plan.md
 * @param paramsPath - Path to swarmui_parameters_mapping.md (optional)
 * @param episodeNumber - Episode number for the shorts
 * @returns Array of VideoShortMoment objects ready for generation
 */
export async function parseShortsFromMarkdown(
  planPath: string,
  paramsPath?: string,
  episodeNumber: number = 1
): Promise<VideoShortMoment[]> {
  try {
    // Parse creation plan
    const parsedShorts = await parseCreationPlan(planPath);
    
    // Parse parameters mapping (if provided)
    let paramsMap = new Map<string, typeof STANDARD_PARAMETERS>();
    if (paramsPath) {
      paramsMap = await parseParametersMapping(paramsPath);
    }
    
    // Apply custom parameters if available
    for (const short of parsedShorts) {
      for (const segment of short.segments) {
        const customParams = paramsMap.get(segment.segmentId);
        if (customParams) {
          segment.parameters = customParams;
        }
      }
    }
    
    // Convert to VideoShortMoment format
    const moments = convertToVideoShortMoments(parsedShorts, episodeNumber);
    
    return moments;
  } catch (error) {
    console.error('Error parsing shorts from markdown:', error);
    throw new Error(`Failed to parse shorts from markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get summary of parsed shorts
 */
export async function getShortsSummary(
  planPath: string
): Promise<{ totalShorts: number; totalSegments: number; shorts: Array<{ title: string; segments: number }> }> {
  const parsedShorts = await parseCreationPlan(planPath);
  
  return {
    totalShorts: parsedShorts.length,
    totalSegments: parsedShorts.reduce((sum, s) => sum + s.segments.length, 0),
    shorts: parsedShorts.map(s => ({
      title: s.title,
      segments: s.segments.length
    }))
  };
}

