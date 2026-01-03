/**
 * Video Short Redis Service
 * 
 * Redis session management for video shorts using Database 1.
 * Aligned with planned video short marketing system architecture.
 * 
 * Key Structure:
 * - Session data: `videoshort:session:{timestamp}`
 * - Index: `videoshort:sessions:index`
 * - Database: Redis Database 1
 * - TTL: 7 days (604,800 seconds)
 */

import type { VideoShortMoment, VideoShortEpisode } from '../../types';
import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

// Load environment variables (important for standalone scripts)
// This ensures .env is loaded even when service is imported directly
if (typeof process !== 'undefined' && process.env) {
  // Only load if not already loaded (avoid multiple loads)
  if (!process.env.REDIS_PORT && !process.env.REDIS_URL) {
    dotenv.config();
  }
}

// Redis connection for video shorts (Database 1)
let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client for video shorts (Database 1)
 * 
 * Uses same environment variable priority as main Redis service:
 * 1. REDIS_URL (highest priority)
 * 2. REDIS_HOST + REDIS_PORT (fallback)
 * 3. Default: localhost:6379
 * 
 * Always uses Database 1 for video shorts (separate from beat analysis Database 0)
 */
async function initializeVideoShortRedis(): Promise<void> {
  if (redisClient) {
    return; // Already initialized
  }
  
  // Priority: REDIS_URL > REDIS_HOST + REDIS_PORT > defaults
  let redisUrl = process.env.REDIS_URL;
  
  // If REDIS_URL is not provided, build it from individual components
  if (!redisUrl) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    
    // Build Redis URL from components
    redisUrl = `redis://${redisHost}:${redisPort}`;
    console.log(`📊 Building Video Short Redis URL from environment variables:`);
    console.log(`   REDIS_HOST: ${redisHost}`);
    console.log(`   REDIS_PORT: ${redisPort}`);
  }
  
  // Ensure database 1 is used for video shorts (separate from beat analysis)
  const urlMatch = redisUrl.match(/^(redis:\/\/[^\/]+)\/(\d+)$/);
  if (urlMatch) {
    // Force database 1 for video shorts
    redisUrl = `${urlMatch[1]}/1`;
    if (parseInt(urlMatch[2], 10) !== 1) {
      console.log(`📊 REDIS_URL specified database ${urlMatch[2]}, but video shorts use database 1. Overriding to database 1.`);
    }
  } else if (!redisUrl.includes('/')) {
    // URL doesn't have database number, add /1
    redisUrl = `${redisUrl}/1`;
  } else {
    // Replace existing database number with 1
    redisUrl = redisUrl.replace(/\/\d+$/, '/1');
  }
  
  // Log the database being used for transparency
  const dbMatch = redisUrl.match(/\/(\d+)$/);
  const dbNumber = dbMatch ? dbMatch[1] : '1';
  console.log(`📊 Video Short Redis Configuration: ${redisUrl}`);
  console.log(`📊 Using Redis database ${dbNumber} (for video shorts)`);
  
  redisClient = createClient({
    url: redisUrl
  });
  
  redisClient.on('error', (err) => {
    console.error('Video Short Redis Client Error:', err);
  });
  
  redisClient.on('connect', () => {
    console.log('✅ Video Short Redis connected successfully');
    console.log(`✅ Video Short Redis database ${dbNumber} is active`);
  });
  
  await redisClient.connect();
  console.log('✅ Video Short Redis connected (database 1)');
}

/**
 * Video Short Session data structure
 */
export interface VideoShortSession {
  timestamp: number;
  episodeNumber: number;
  storyId?: string;
  episodeTitle: string;
  moments: VideoShortMoment[];
  storyContext?: string;
  marketingAngle?: string;
  source: 'markdown-import' | 'storyteller-ai';
  generatedAt: Date;
}

/**
 * Save video short session to Redis
 * 
 * @param session - VideoShortSession data
 * @returns Promise that resolves to session key
 */
export async function saveVideoShortSession(
  session: Omit<VideoShortSession, 'timestamp'>
): Promise<string> {
  await initializeVideoShortRedis();
  
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  const timestamp = Date.now();
  const sessionKey = `videoshort:session:${timestamp}`;
  
  const sessionData: VideoShortSession = {
    ...session,
    timestamp
  };
  
  // Save session data with 7-day TTL
  await redisClient.setEx(
    sessionKey,
    604800, // 7 days in seconds
    JSON.stringify(sessionData)
  );
  
  // Add to sorted set index for fast retrieval
  await redisClient.zAdd('videoshort:sessions:index', {
    score: timestamp,
    value: sessionKey
  });
  
  console.log(`✅ Saved video short session: ${sessionKey}`);
  return sessionKey;
}

/**
 * Get latest video short session
 * 
 * @returns Promise that resolves to latest VideoShortSession or null
 */
export async function getLatestVideoShortSession(): Promise<VideoShortSession | null> {
  await initializeVideoShortRedis();
  
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  // Get latest session from sorted set
  const latestKeys = await redisClient.zRange(
    'videoshort:sessions:index',
    -1,
    -1,
    { REV: true }
  );
  
  if (latestKeys.length === 0) {
    return null;
  }
  
  const latestKey = latestKeys[0];
  const sessionData = await redisClient.get(latestKey);
  
  if (!sessionData) {
    return null;
  }
  
  return JSON.parse(sessionData) as VideoShortSession;
}

/**
 * Get video short session by timestamp
 * 
 * @param timestamp - Session timestamp
 * @returns Promise that resolves to VideoShortSession or null
 */
export async function getVideoShortSessionByTimestamp(
  timestamp: number
): Promise<VideoShortSession | null> {
  await initializeVideoShortRedis();
  
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  const sessionKey = `videoshort:session:${timestamp}`;
  const sessionData = await redisClient.get(sessionKey);
  
  if (!sessionData) {
    return null;
  }
  
  return JSON.parse(sessionData) as VideoShortSession;
}

/**
 * Get list of all video short sessions
 * 
 * @param limit - Maximum number of sessions to return (default: 50)
 * @returns Promise that resolves to array of session metadata
 */
export async function getVideoShortSessionList(
  limit: number = 50
): Promise<Array<{ timestamp: number; episodeNumber: number; episodeTitle: string; momentCount: number }>> {
  await initializeVideoShortRedis();
  
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  // Get latest sessions from sorted set
  const sessionKeys = await redisClient.zRange(
    'videoshort:sessions:index',
    -limit,
    -1,
    { REV: true }
  );
  
  const sessions: Array<{ timestamp: number; episodeNumber: number; episodeTitle: string; momentCount: number }> = [];
  
  for (const key of sessionKeys) {
    const sessionData = await redisClient.get(key);
    if (sessionData) {
      const session = JSON.parse(sessionData) as VideoShortSession;
      sessions.push({
        timestamp: session.timestamp,
        episodeNumber: session.episodeNumber,
        episodeTitle: session.episodeTitle,
        momentCount: session.moments.length
      });
    }
  }
  
  return sessions;
}

/**
 * Close Redis connection
 */
export async function closeVideoShortRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Video Short Redis connection closed');
  }
}

