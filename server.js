// server.js - Redis Session API Backend
import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { processEpisodeCompletePipeline, processSingleBeat } from './services/pipelineService.ts';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.REDIS_API_PORT || 7802;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Increase payload size limit to handle large session data (50MB limit)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Redis client setup
let redisClient = null;

const initializeRedis = async () => {
  try {
    // StoryArt uses Redis database 0 as standard for stability
    // This ensures consistent behavior across all deployments
    
    // Priority: REDIS_URL > REDIS_HOST + REDIS_PORT > defaults
    let redisUrl = process.env.REDIS_URL;
    
    // If REDIS_URL is not provided, build it from individual components
    if (!redisUrl) {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || '6379';
      
      // Build Redis URL from components
      redisUrl = `redis://${redisHost}:${redisPort}/0`;
      console.log(`📊 Building Redis URL from environment variables:`);
      console.log(`   REDIS_HOST: ${redisHost}`);
      console.log(`   REDIS_PORT: ${redisPort}`);
    }
    
    // If REDIS_URL is provided, ensure it uses database 0
    if (redisUrl) {
      // Parse the URL and ensure database is 0
      const urlMatch = redisUrl.match(/^(redis:\/\/[^\/]+)\/(\d+)$/);
      if (urlMatch) {
        // Force database 0 for consistency
        redisUrl = `${urlMatch[1]}/0`;
        if (parseInt(urlMatch[2], 10) !== 0) {
          console.warn(`⚠️  REDIS_URL specified database ${urlMatch[2]}, but StoryArt uses database 0. Overriding to database 0 for stability.`);
        }
      } else if (!redisUrl.includes('/')) {
        // URL doesn't have database number, add /0
        redisUrl = `${redisUrl}/0`;
      }
    } else {
      // Fallback default (should not reach here with new logic above)
      redisUrl = 'redis://localhost:6379/0';
    }
    
    // Log the database being used for transparency
    const dbMatch = redisUrl.match(/\/(\d+)$/);
    const dbNumber = dbMatch ? dbMatch[1] : '0';
    console.log(`📊 StoryArt Redis Configuration: ${redisUrl}`);
    console.log(`📊 Using Redis database ${dbNumber} (standard for StoryArt)`);
    
    redisClient = createClient({
      url: redisUrl
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      console.log(`✅ Redis database ${dbNumber} is active`);
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.warn('⚠️  Redis connection failed. Sessions will be stored in memory (not persistent).');
    return false;
  }
};

// In-memory fallback storage (when Redis is not available)
const memoryStorage = new Map();
const memorySessionIndex = []; // Used to track order for versioning

// Session key constants
const SESSION_KEY_PREFIX = 'storyart:session:';
const SESSION_INDEX_KEY = 'storyart:sessions:index'; // Redis Sorted Set

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    redis: redisClient?.isOpen ? 'connected' : 'disconnected',
    memory: memoryStorage.size > 0 ? 'active' : 'empty'
  });
});

// Save session endpoint
app.post('/api/v1/session/save', async (req, res) => {
  try {
    const sessionData = req.body;

    if (!sessionData || !sessionData.scriptText) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session data. Required fields: scriptText, episodeContext, storyUuid, analyzedEpisode'
      });
    }

    // Use provided timestamp (for syncing from localStorage) or generate new one
    const timestamp = sessionData.timestamp || Date.now();
    const sessionKey = `${SESSION_KEY_PREFIX}${timestamp}`;
    const sessionValue = JSON.stringify({
      ...sessionData,
      timestamp
    });

    try {
      if (redisClient?.isOpen) {
        // Save to Redis
        await redisClient.setEx(sessionKey, 86400 * 7, sessionValue); // 7 days TTL
        await redisClient.zAdd(SESSION_INDEX_KEY, { score: timestamp, value: sessionKey });
        console.log(`✅ Session saved to Redis: ${sessionKey}`);
      } else {
        // Fallback to memory storage
        memoryStorage.set(sessionKey, sessionValue);
        memorySessionIndex.push({ score: timestamp, value: sessionKey });
        memorySessionIndex.sort((a, b) => b.score - a.score); // Keep newest first
        console.log(`✅ Session saved to memory: ${sessionKey}`);
      }
    } catch (storageError) {
      console.error('Storage error:', storageError);
      // Fallback to memory
      memoryStorage.set(sessionKey, sessionValue);
      memorySessionIndex.push({ score: timestamp, value: sessionKey });
      memorySessionIndex.sort((a, b) => b.score - a.score);
    }

    res.json({
      success: true,
      message: 'Session saved successfully',
      sessionKey,
      storage: redisClient?.isOpen ? 'redis' : 'memory'
    });
  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save session'
    });
  }
});

// Get latest session endpoint
app.get('/api/v1/session/latest', async (req, res) => {
  try {
    let sessionData = null;

    try {
      if (redisClient?.isOpen) {
        // Get the latest session key from the sorted set
        const latestKeys = await redisClient.zRange(SESSION_INDEX_KEY, 0, 0, { REV: true });
        if (latestKeys && latestKeys.length > 0) {
          const data = await redisClient.get(latestKeys[0]);
          if (data) {
            sessionData = JSON.parse(data);
            console.log(`✅ Latest session retrieved from Redis: ${latestKeys[0]}`);
          }
        }
      }
    } catch (redisError) {
      console.warn('Redis read error, trying memory:', redisError);
    }

    // Fallback to memory storage
    if (!sessionData && memorySessionIndex.length > 0) {
      const latestKey = memorySessionIndex[0].value;
      if (memoryStorage.has(latestKey)) {
        sessionData = JSON.parse(memoryStorage.get(latestKey));
        console.log(`✅ Latest session retrieved from memory: ${latestKey}`);
      }
    }

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'No session found'
      });
    }

    // Extract timestamp but keep it in response (needed for pipeline processing)
    const { timestamp, ...session } = sessionData;

    res.json({
      success: true,
      data: {
        ...session,
        timestamp: timestamp // Include timestamp in response (needed for getSessionByTimestamp)
      },
      storage: redisClient?.isOpen ? 'redis' : 'memory'
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve session'
    });
  }
});

// List all sessions endpoint (optional, for debugging)
app.get('/api/v1/session/list', async (req, res) => {
  try {
    const sessions = [];

    if (redisClient?.isOpen) {
      // Get all session keys from the sorted set, newest first
      const keys = await redisClient.zRange(SESSION_INDEX_KEY, 0, -1, { REV: true });
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          sessions.push(JSON.parse(data));
        }
      }
    } else {
      // Memory storage
      for (const item of memorySessionIndex) {
        if (memoryStorage.has(item.value)) {
          sessions.push(JSON.parse(memoryStorage.get(item.value)));
        }
      }
    }

    res.json({
      success: true,
      count: sessions.length,
      sessions: sessions.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list sessions'
    });
  }
});

// Get session by timestamp endpoint
app.get('/api/v1/session/:timestamp', async (req, res) => {
  try {
    const timestamp = parseInt(req.params.timestamp, 10);
    
    if (isNaN(timestamp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timestamp parameter'
      });
    }

    const sessionKey = `${SESSION_KEY_PREFIX}${timestamp}`;
    let sessionData = null;

    try {
      if (redisClient?.isOpen) {
        const data = await redisClient.get(sessionKey);
        if (data) {
          sessionData = JSON.parse(data);
        }
      } else {
        // Memory storage
        if (memoryStorage.has(sessionKey)) {
          sessionData = JSON.parse(memoryStorage.get(sessionKey));
        }
      }
    } catch (error) {
      console.error('Error retrieving session:', error);
    }

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Extract timestamp but keep it in response (needed for pipeline processing)
    const { timestamp: ts, ...session } = sessionData;

    res.json({
      success: true,
      data: {
        ...session,
        timestamp: ts // Include timestamp in response (needed for getSessionByTimestamp)
      },
      storage: redisClient?.isOpen ? 'redis' : 'memory'
    });
  } catch (error) {
    console.error('Error retrieving session by timestamp:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve session'
    });
  }
});

// Pipeline API endpoints
app.post('/api/v1/pipeline/process-episode', async (req, res) => {
  try {
    const { sessionTimestamp } = req.body;

    if (!sessionTimestamp) {
      return res.status(400).json({
        success: false,
        error: 'sessionTimestamp is required'
      });
    }

    // Use Server-Sent Events (SSE) for progress updates
    // Set headers BEFORE any writes to ensure SSE format
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

    const progressCallback = (progress) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
    };

    try {
      const result = await processEpisodeCompletePipeline(sessionTimestamp, progressCallback);
      res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
      res.end();
    } catch (error) {
      // Send error via SSE stream if headers are already set
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Unknown error' })}\n\n`);
        res.end();
      } catch (writeError) {
        // If we can't write to stream, send JSON error response
        console.error('Failed to write SSE error:', writeError);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: error.message || 'Failed to process episode pipeline'
          });
        }
      }
    }
  } catch (error) {
    // Handle errors before SSE headers are set
    console.error('Error in process-episode endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process episode pipeline'
      });
    } else {
      // Headers already sent, try to send via SSE
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Unknown error' })}\n\n`);
        res.end();
      } catch (writeError) {
        console.error('Failed to write SSE error after headers sent:', writeError);
        res.end();
      }
    }
  }
});

app.post('/api/v1/pipeline/process-beat', async (req, res) => {
  try {
    const { beatId, format, sessionTimestamp } = req.body;

    if (!beatId || !format) {
      return res.status(400).json({
        success: false,
        error: 'beatId and format are required'
      });
    }

    // Use Server-Sent Events (SSE) for progress updates
    // Set headers BEFORE any writes to ensure SSE format
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

    const progressCallback = (progress) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
    };

    try {
      const result = await processSingleBeat(beatId, format, sessionTimestamp, progressCallback);
      res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
      res.end();
    } catch (error) {
      // Send error via SSE stream if headers are already set
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Unknown error' })}\n\n`);
        res.end();
      } catch (writeError) {
        // If we can't write to stream, send JSON error response
        console.error('Failed to write SSE error:', writeError);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: error.message || 'Failed to process beat pipeline'
          });
        }
      }
    }
  } catch (error) {
    // Handle errors before SSE headers are set
    console.error('Error in process-beat endpoint:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process beat pipeline'
      });
    } else {
      // Headers already sent, try to send via SSE
      try {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Unknown error' })}\n\n`);
        res.end();
      } catch (writeError) {
        console.error('Failed to write SSE error after headers sent:', writeError);
        res.end();
      }
    }
  }
});

// Start server
const startServer = async () => {
  // Try to initialize Redis (non-blocking)
  await initializeRedis();

  app.listen(PORT, () => {
    console.log(`\n🚀 Redis Session API Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`💾 Storage: ${redisClient?.isOpen ? 'Redis' : 'Memory (fallback)'}`);
    console.log(`\n📋 Available endpoints:`);
    console.log(`   POST   /api/v1/session/save    - Save a session`);
    console.log(`   GET    /api/v1/session/latest  - Get latest session`);
    console.log(`   GET    /api/v1/session/list    - List all sessions`);
    console.log(`   GET    /api/v1/session/:timestamp - Get session by timestamp`);
    console.log(`   POST   /api/v1/pipeline/process-episode - Process episode pipeline (SSE)`);
    console.log(`   POST   /api/v1/pipeline/process-beat - Process single beat (SSE)`);
    console.log(`   GET    /health                 - Health check\n`);
  });
};

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  process.exit(0);
});

