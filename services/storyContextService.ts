/**
 * Story Context Service - Phase B: Episode Context Enhancement
 *
 * Provides high-level story intelligence (context, tone, themes) for enriching
 * AI-generated image prompts. Uses REAL database queries (no mock data).
 *
 * @see docs/DEVELOPMENT_GUIDELINES.md - Real data over mock data principle
 * @see tasks/prd-episode-context-phase-b.md - Phase B requirements
 */

import { execSync } from 'child_process';
import type { StoryContextData } from '../types';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry {
  data: StoryContextData | null;
  timestamp: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>();

/**
 * Get story context data from the database (with caching)
 *
 * @param storyId - UUID of the story
 * @returns StoryContextData if found, null if not found or on error
 *
 * @example
 * const context = await getStoryContext('59f64b1e-726a-439d-a6bc-0dfefcababdb');
 * if (context) {
 *   console.log('Story Context:', context.story_context);
 * }
 */
export async function getStoryContext(storyId: string): Promise<StoryContextData | null> {
  // Check cache first
  const cacheKey = `story_context_${storyId}`;
  const cached = getCachedData(cacheKey);
  if (cached !== null) {
    console.log(`[StoryContext] Using cached data for story ${storyId}`);
    return cached;
  }

  console.log(`[StoryContext] Fetching story context from database for story ${storyId}`);

  try {
    // Use real database query via Docker exec
    // This is the method verified to work in data quality audit
    const query = `SELECT story_context, narrative_tone, core_themes FROM stories WHERE id = '${storyId}'`;
    const command = `docker exec storyteller_postgres_dev psql -U storyteller_user -d storyteller_dev -t -A -F"|" -c "${query}"`;

    const result = execSync(command, {
      encoding: 'utf-8',
      timeout: 10000, // 10 second timeout
      stdio: ['pipe', 'pipe', 'pipe'] // Capture stdout and stderr
    });

    const data = parsePostgresResult(result);

    if (data) {
      // Cache the result
      setCachedData(cacheKey, data);
      console.log(`[StoryContext] Successfully retrieved and cached story context (${data.story_context.length + data.narrative_tone.length + data.core_themes.length} total chars)`);
      return data;
    } else {
      console.warn(`[StoryContext] No story found with ID ${storyId}`);
      // Cache null result to avoid repeated failed queries
      setCachedData(cacheKey, null);
      return null;
    }
  } catch (error) {
    console.error(`[StoryContext] Error fetching story context:`, error instanceof Error ? error.message : error);
    // Don't cache errors - allow retry on next request
    return null;
  }
}

/**
 * Parse PostgreSQL result into StoryContextData
 * Expected format: "story_context|narrative_tone|core_themes\n"
 */
function parsePostgresResult(result: string): StoryContextData | null {
  const trimmed = result.trim();

  if (!trimmed || trimmed.length === 0) {
    return null;
  }

  // Split by pipe delimiter (used -F"|" in psql command)
  const parts = trimmed.split('|');

  if (parts.length !== 3) {
    console.warn(`[StoryContext] Unexpected result format: expected 3 fields, got ${parts.length}`);
    return null;
  }

  const [story_context, narrative_tone, core_themes] = parts;

  // Validate that fields are not empty
  if (!story_context || !narrative_tone || !core_themes) {
    console.warn(`[StoryContext] One or more required fields are empty`);
    return null;
  }

  return {
    story_context: story_context.trim(),
    narrative_tone: narrative_tone.trim(),
    core_themes: core_themes.trim()
  };
}

/**
 * Get cached data if still valid
 */
function getCachedData(key: string): StoryContextData | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Check if cache entry is still fresh
  const now = Date.now();
  const age = now - entry.timestamp;

  if (age < CACHE_TTL) {
    return entry.data;
  }

  // Cache expired, remove it
  cache.delete(key);
  return null;
}

/**
 * Store data in cache with timestamp
 */
function setCachedData(key: string, data: StoryContextData | null): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Clear all cached story context data
 * Useful for testing or when data is updated
 */
export function clearStoryContextCache(): void {
  cache.clear();
  console.log('[StoryContext] Cache cleared');
}

/**
 * Get cache statistics (for monitoring/debugging)
 */
export function getCacheStats(): { entries: number; keys: string[] } {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys())
  };
}
