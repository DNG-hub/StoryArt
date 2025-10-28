# StoryArt Environment Configuration Guide

## Overview

This document outlines the environment configuration structure for StoryArt, detailing all required environment variables and their purposes. **This document does not contain actual secrets** - it serves as a blueprint for developers and architects to understand the system's configuration requirements.

## Configuration Architecture

StoryArt follows a dual-environment variable pattern to support both frontend (Vite-based) and backend (Node.js) access to the same resources:

- **`VITE_VARIABLE_NAME`**: Frontend accessible variables (bundled into client code)
- **`VARIABLE_NAME`**: Backend/server-side accessible variables (server environment only)

## 🏗️ Infrastructure Configuration

### Application Settings
```env
PROJECT_NAME=StoryArt
VERSION=1.0.0
ENVIRONMENT=development|staging|production
API_V1_STR=/api/v1

# Security
SECRET_KEY=<64-character-hex-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Database Connection (StoryTeller Integration)
```env
# PostgreSQL Connection to StoryTeller's Database
DATABASE_URL=postgresql+asyncpg://<username>:<password>@<host>:<port>/<database>
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600

# Individual Connection Components
POSTGRES_SERVER=<hostname>
POSTGRES_PORT=<port>
POSTGRES_USER=<username>
POSTGRES_PASSWORD=<password>
POSTGRES_DB=<database_name>
```

**Connection Details:**
- **Host**: StoryTeller's PostgreSQL instance
- **Port**: Custom port (not default 5432)
- **Database**: `storyteller_dev` for development
- **User**: Dedicated service account with read/write access

### Redis Configuration (Shared Cache)
```env
# Redis Connection to StoryTeller's Cache
REDIS_URL=redis://<host>:<port>/<db_number>
REDIS_PORT=<port>
REDIS_DB=<database_number>
```

**Cache Strategy:**
- **Shared Instance**: Uses StoryTeller's Redis server
- **Separate Database**: Different DB number to avoid conflicts
- **Purpose**: API response caching, session storage, rate limiting

## 🤖 AI Provider Configuration

### Western AI Providers

#### Gemini (Google)
```env
VITE_GEMINI_API_KEY=<google_ai_api_key>
GEMINI_API_KEY=<google_ai_api_key>
GEMINI_MODEL=models/gemini-2.0-flash
GEMINI_MAX_TOKENS=8192
GEMINI_TEMPERATURE=0.7
```
**Use Case**: Primary script analysis, large context processing

#### Claude (Anthropic)
```env
VITE_CLAUDE_API_KEY=<anthropic_api_key>
CLAUDE_API_KEY=<anthropic_api_key>
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=200000
CLAUDE_TEMPERATURE=0.7
```
**Use Case**: Creative writing, prose generation, dialogue

#### OpenAI
```env
VITE_OPENAI_API_KEY=<openai_api_key>
OPENAI_API_KEY=<openai_api_key>
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=2048
OPENAI_TEMPERATURE=0.7
```
**Use Case**: Reliable fallback, general purpose tasks

#### XAI (Grok)
```env
VITE_XAI_API_KEY=<xai_api_key>
XAI_API_KEY=<xai_api_key>
XAI_MODEL=grok-3
XAI_MAX_TOKENS=8192
XAI_TEMPERATURE=0.7
```
**Use Case**: Alternative provider, creative tasks

#### DeepSeek
```env
VITE_DEEPSEEK_API_KEY=<deepseek_api_key>
DEEPSEEK_API_KEY=<deepseek_api_key>
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=8192
DEEPSEEK_TEMPERATURE=0.8
```
**Use Case**: Cost-effective technical analysis, coding tasks

### Chinese AI Providers (Cost Optimization)

#### Qwen (Alibaba)
```env
VITE_QWEN_API_KEY=<qwen_api_key>
QWEN_API_KEY=<qwen_api_key>
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3-235b-a22b-instruct-2507
QWEN_MAX_TOKENS=8192
QWEN_TEMPERATURE=0.8
QWEN_TOP_P=0.9
QWEN_FALLBACK_MODEL=qwen-max-latest
QWEN_TIMEOUT=60
```
**Cost Savings**: ~99.9% vs Western providers (~$0.0001/request)

#### GLM (Zhipu AI)
```env
VITE_ZHIPU_API_KEY=<zhipu_api_key>
ZHIPU_API_KEY=<zhipu_api_key>
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-4.5
GLM_MAX_TOKENS=8192
GLM_TEMPERATURE=0.9
GLM_TOP_P=0.95
GLM_TIMEOUT=60
```
**Cost Savings**: ~99.84% vs Western providers (~$0.0016/request)

### Google Cloud Platform
```env
GOOGLE_APPLICATION_CREDENTIALS=<path_to_service_account_json>
GCP_PROJECT_ID=<project_id>
GCP_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-pro
VERTEX_AI_MAX_TOKENS=8192
VERTEX_AI_TEMPERATURE=0.7
```

## 🎨 Image Generation (SwarmUI Integration)

### SwarmUI Connection
```env
VITE_SWARMUI_API_URL=http://<host>:<port>
SWARMUI_API_URL=http://<host>:<port>
SWARMUI_API_KEY=<optional_api_key>
SWARMUI_INSTANCE_PATH=<local_installation_path>
SWARMUI_STARTUP_COMMAND=<startup_script_path>
```

### SwarmUI Configuration
```env
# Access Control
SWARMUI_DEPLOYMENT_TYPE=local
SWARMUI_ALLOWED_USERS=<comma_separated_usernames>
SWARMUI_ALLOWED_ORGANIZATIONS=<organization_name>
SWARMUI_LOCAL_NETWORK_ONLY=true
SWARMUI_REQUIRES_PAYMENT=false

# Performance Settings
SWARMUI_CONNECTION_TIMEOUT=30
SWARMUI_GENERATION_TIMEOUT=300
SWARMUI_DOWNLOAD_TIMEOUT=60
SWARMUI_MAX_RETRIES=3
SWARMUI_RETRY_DELAY=1.0
SWARMUI_RETRY_BACKOFF=2.0
SWARMUI_MAX_CONCURRENT=2
SWARMUI_POLL_INTERVAL=0.5
SWARMUI_MAX_BATCH_SIZE=4
SWARMUI_MAX_RESOLUTION=1024
```

## 🔗 StoryTeller API Integration

### API Connection
```env
VITE_STORYTELLER_API_URL=http://<host>:<port>
STORYTELLER_API_URL=http://<host>:<port>
STORYTELLER_API_VERSION=v1
```

### Authentication
```env
VITE_STORYTELLER_TEST_USER=<test_email>
VITE_STORYTELLER_TEST_PASSWORD=<test_password>
STORYTELLER_TEST_USER=<test_email>
STORYTELLER_TEST_PASSWORD=<test_password>
```

### Story Data Access
```env
VITE_CAT_DANIEL_STORY_ID=<story_uuid>
CAT_DANIEL_STORY_ID=<story_uuid>
DEFAULT_USER_ID=<user_uuid>
```

## 🧠 AI Provider Management

### Provider Selection
```env
DEFAULT_AI_PROVIDER=gemini|claude|openai|xai|deepseek|qwen|glm
ENABLE_PROVIDER_FALLBACK=true
HEALTH_CHECK_INTERVAL=30000
PROVIDER_TIMEOUT=60000
```

### Cost Optimization
```env
ENABLE_COST_OPTIMIZATION=true
COST_OPTIMIZATION_LEVEL=conservative|balanced|aggressive
DAILY_BUDGET_USD=<dollar_amount>
MONTHLY_BUDGET_USD=<dollar_amount>

# Quality Thresholds
MIN_QUALITY_DRAFT=0.6
MIN_QUALITY_PRODUCTION=0.8
MIN_QUALITY_FINAL=0.9
```

## 🚀 Application Features

### Feature Flags
```env
ENABLE_MULTI_PROVIDER=true
ENABLE_COST_TRACKING=true
ENABLE_ANALYTICS=false
ENABLE_DEBUG_MODE=true

# Content Generation
DEFAULT_SCRIPT_ANALYSIS_MODEL=gemini
DEFAULT_PROMPT_GENERATION_MODEL=claude
ENABLE_CHINESE_PROVIDERS=true
PREFER_COST_OPTIMIZATION=true
```

### Development Settings
```env
DEBUG=true
LOG_LEVEL=INFO|DEBUG|WARNING|ERROR
LOG_FORMAT=json|text

# CORS Settings
BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

# Session Management
MAX_SESSION_DURATION=7200
```

## 💾 Storage Configuration

### Local Storage
```env
STORAGE_PATH=./generated_content
IMAGE_STORAGE_PATH=./generated_images
PROMPT_STORAGE_PATH=./generated_prompts

# Cleanup Settings
STORAGE_CLEANUP_DAYS=7
MAX_FILE_SIZE_MB=10
```

## ⚡ Performance Settings

### API Performance
```env
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT=120000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000

# Memory Management
MAX_MEMORY_USAGE_MB=512
ENABLE_MEMORY_MONITORING=true
```

## 📊 Monitoring & Health

### Health Checks
```env
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_ENDPOINTS=true
PROVIDER_STATUS_CACHE_TTL=300

# Error Reporting
ENABLE_ERROR_REPORTING=true
ERROR_REPORT_LEVEL=warning|error|critical
```

## 🔒 Security Considerations

### API Key Management
- **Rotation**: All API keys should be rotated regularly
- **Scope**: Keys should have minimal required permissions
- **Storage**: Use secure environment variable management
- **Monitoring**: Track API key usage and costs

### Database Security
- **Connection**: Use SSL/TLS for database connections
- **Credentials**: Dedicated service account with limited permissions
- **Access**: Read-only access where possible
- **Auditing**: Log all database operations

### Network Security
- **CORS**: Restrict origins to known domains
- **Rate Limiting**: Implement per-IP and per-user limits
- **Firewall**: Restrict access to internal services
- **Monitoring**: Track unusual access patterns

## 🏗️ Implementation Architecture

### Provider Abstraction Layer
```typescript
interface AIProviderConfig {
  name: string;
  provider: AIProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1kTokens: number;
  isAvailable: boolean;
}
```

### Health Check System
```typescript
interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  latency: number;
  lastCheck: Date;
  errorRate: number;
}
```

### Cost Tracking
```typescript
interface CostMetrics {
  provider: string;
  tokensUsed: number;
  costUSD: number;
  requestCount: number;
  averageLatency: number;
  successRate: number;
}
```

## 📝 Development Workflow

### Local Development Setup
1. Copy `.env.example` to `.env`
2. Update database connection to StoryTeller dev instance
3. Configure at least one AI provider (recommend Gemini for development)
4. Set up SwarmUI connection if image generation is needed
5. Configure Redis connection to shared instance

### Testing Configuration
- Use dedicated test API keys with lower limits
- Point to development database with test data
- Enable debug logging and monitoring
- Use conservative cost optimization settings

### Production Deployment
- Use separate production API keys
- Configure production database connections
- Enable comprehensive monitoring and alerting
- Implement strict rate limiting and cost controls

## 🔄 Provider Failover Strategy

### Fallback Hierarchy
1. **Primary**: Configured default provider
2. **Secondary**: Next available provider in cost tier
3. **Emergency**: Gemini (most reliable uptime)
4. **Last Resort**: Local models if available

### Cost-Based Selection
1. **Chinese Providers**: First choice for cost optimization
2. **Western Budget**: Mid-tier providers (DeepSeek, smaller OpenAI models)
3. **Western Premium**: High-quality providers (Claude, GPT-4)
4. **Emergency**: Any available provider regardless of cost

This configuration enables StoryArt to leverage the same robust, cost-optimized AI infrastructure as StoryTeller while maintaining independent operation and security boundaries.