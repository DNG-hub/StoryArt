// server.js - Redis Session API Backend
import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import dotenv from 'dotenv';

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
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';
    redisClient = createClient({
      url: redisUrl
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
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

    const timestamp = Date.now();
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

    // Remove timestamp before returning
    const { timestamp, ...session } = sessionData;

    res.json({
      success: true,
      data: session,
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

