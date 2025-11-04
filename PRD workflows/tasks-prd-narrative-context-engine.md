# Task List: Narrative Context Engine Implementation

## Relevant Files

### Backend Components
- `app/models/outline.py` - SQLAlchemy models for outline versions, templates, and episode structures
- `app/models/plot_template.py` - Plot template definitions and metadata
- `app/schemas/outline.py` - Pydantic schemas for outline API requests/responses
- `app/api/v1/endpoints/outline.py` - FastAPI endpoints for outline CRUD operations
- `app/services/outline_service.py` - Core outline management business logic
- `app/services/narrative_context_service.py` - Context generation and validation service
- `app/services/agency_swarm/` - Directory for Agency Swarm agent implementations
- `app/services/agency_swarm/story_context_orchestrator.py` - Story context agent
- `app/services/agency_swarm/plot_arc_coordinator.py` - Plot arc management agent
- `app/services/agency_swarm/character_consistency_manager.py` - Character validation agent
- `app/services/agency_swarm/scene_coherence_validator.py` - Scene validation agent
- `app/services/agency_swarm/episode_outline_provider.py` - Episode context synthesis agent
- `alembic/versions/xxx_add_outline_tables.py` - Database migration for outline tables

### Frontend Components
- `frontend/src/components/OutlineManager.vue` - Main outline management interface
- `frontend/src/components/TemplateSelector.vue` - Plot template selection component
- `frontend/src/components/EpisodePlanner.vue` - Episode planning dashboard
- `frontend/src/components/OutlineEditor.vue` - Outline editing interface
- `frontend/src/components/VersionHistory.vue` - Version control and diff viewer
- `frontend/src/stores/outlineStore.ts` - Pinia store for outline state management
- `frontend/src/services/OutlineService.ts` - API communication service
- `frontend/src/types/outline.ts` - TypeScript type definitions

### Test Files
- `tests/test_outline_models.py` - Unit tests for outline models
- `tests/test_outline_service.py` - Unit tests for outline service logic
- `tests/test_agency_swarm_agents.py` - Unit tests for Agency Swarm agents
- `tests/test_outline_api.py` - Integration tests for outline API endpoints
- `frontend/src/components/__tests__/OutlineManager.test.ts` - Frontend component tests

### Notes
- Database migrations will extend existing PostgreSQL schema with new tables
- Neo4j relationships will be created through existing sync orchestrator
- PGVector embeddings will use existing embedding service infrastructure
- Agency Swarm agents will integrate with existing AI coordinator patterns

## Tasks

- [ ] 1.0 Database Schema Design & Migration
  - [ ] 1.1 Design outline_versions table with UUID primary keys and story_id relationships
  - [ ] 1.2 Design plot_templates table with template definitions and metadata
  - [ ] 1.3 Design scene_outline_dependencies table linking scenes to outline versions
  - [ ] 1.4 Design episode_structures table for configurable episode/scene layouts
  - [ ] 1.5 Create Alembic migration script for all new tables
  - [ ] 1.6 Add Neo4j relationship mappings for outline→episode→scene hierarchies
  - [ ] 1.7 Extend PGVector embedding tables for outline content search
  - [ ] 1.8 Test migration on development database and verify data integrity

- [ ] 2.0 Backend API Development
  - [ ] 2.1 Create SQLAlchemy models for outline_versions, plot_templates, and dependencies
  - [ ] 2.2 Create Pydantic schemas for outline requests, responses, and validation
  - [ ] 2.3 Implement outline CRUD endpoints (create, read, update, delete, list)
  - [ ] 2.4 Implement template management endpoints (list, select, customize)
  - [ ] 2.5 Implement version control endpoints (save, restore, diff, branch)
  - [ ] 2.6 Add outline content embedding integration for semantic search
  - [ ] 2.7 Create episode context API endpoint for scene generator integration
  - [ ] 2.8 Add outline validation endpoints with timeline and character consistency checks
  - [ ] 2.9 Implement async database operations with proper error handling and rollback

- [ ] 3.0 Agency Swarm Integration
  - [ ] 3.1 Install and configure Agency Swarm v1.0 framework
  - [ ] 3.2 Create Story Context Orchestrator agent for episode positioning and timeline management
  - [ ] 3.3 Create Plot Arc Coordinator agent for arc state tracking and progression analysis
  - [ ] 3.4 Create Character Consistency Manager agent for character validation and development tracking
  - [ ] 3.5 Create Scene Coherence Validator agent for timeline and consistency validation
  - [ ] 3.6 Create Episode Outline Provider agent for context synthesis and delivery
  - [ ] 3.7 Configure agent communication flows and data passing between agents
  - [ ] 3.8 Integrate agents with existing AI coordinator and provider selection
  - [ ] 3.9 Create agent testing framework and validation suite
  - [ ] 3.10 Implement agent error handling and fallback mechanisms

- [ ] 4.0 Frontend User Interface
  - [ ] 4.1 Create OutlineManager main component with navigation and overview
  - [ ] 4.2 Create TemplateSelector component with grid layout and descriptions
  - [ ] 4.3 Create EpisodePlanner dashboard with timeline visualization and controls
  - [ ] 4.4 Create OutlineEditor with split-pane design and inline editing
  - [ ] 4.5 Create VersionHistory component with diff viewer and restoration workflows
  - [ ] 4.6 Implement real-time validation and feedback for scene timing constraints
  - [ ] 4.7 Add plot arc timeline visualization with active/peaking/resolving states
  - [ ] 4.8 Create character state panels showing development tracking
  - [ ] 4.9 Implement auto-save functionality with draft state management
  - [ ] 4.10 Add responsive design for tablet access and mobile compatibility

- [ ] 5.0 Template Management System
  - [ ] 5.1 Create plot template database with industry-standard structures
  - [ ] 5.2 Implement Three-Act TV Drama template with 22-24 episode structure
  - [ ] 5.3 Implement Five-Act Limited Series template with crisis point mapping
  - [ ] 5.4 Implement Hero's Journey template with character arc integration
  - [ ] 5.5 Implement Fichtean Curve template (current Cat & Daniel structure)
  - [ ] 5.6 Implement British Three-Act template for alternative pacing
  - [ ] 5.7 Create template customization interface for user-defined structures
  - [ ] 5.8 Add episode count calculator based on story complexity analysis
  - [ ] 5.9 Implement crisis point positioning and character milestone tracking
  - [ ] 5.10 Add template preview and comparison functionality

- [ ] 6.0 Version Control & Historical Context
  - [ ] 6.1 Implement immutable outline versioning with descriptive metadata
  - [ ] 6.2 Create outline diff algorithm for comparing versions and highlighting changes
  - [ ] 6.3 Implement branching system for experimental outline variations
  - [ ] 6.4 Create scene-to-outline-version linking system for historical reconstruction
  - [ ] 6.5 Implement version restoration with conflict detection and resolution
  - [ ] 6.6 Add version tagging system for major milestones and releases
  - [ ] 6.7 Create historical context query system for scene generation
  - [ ] 6.8 Implement timeline-based version browser with visual representation
  - [ ] 6.9 Add version comparison analytics and change impact analysis
  - [ ] 6.10 Create version cleanup and archival system for storage management

- [ ] 7.0 Scene Generator Integration
  - [ ] 7.1 Create EpisodeContext data structure with all required scene generation metadata
  - [ ] 7.2 Implement context retrieval service with <200ms performance requirement
  - [ ] 7.3 Integrate outline context into existing scene generation workflows
  - [ ] 7.4 Create character dialogue pattern lookup using PGVector similarity search
  - [ ] 7.5 Implement plot arc state validation for generated scenes
  - [ ] 7.6 Add timeline consistency checking with automatic conflict detection
  - [ ] 7.7 Create scene validation feedback system with actionable recommendations
  - [ ] 7.8 Implement context caching strategy for improved performance
  - [ ] 7.9 Add scene regeneration flagging when outline changes affect existing scenes
  - [ ] 7.10 Create scene generation analytics and success metrics tracking

- [ ] 8.0 Testing & Validation
  - [ ] 8.1 Create unit tests for all outline models with comprehensive data validation
  - [ ] 8.2 Create integration tests for outline API endpoints with database rollback
  - [ ] 8.3 Create Agency Swarm agent tests with mock data and response validation
  - [ ] 8.4 Create frontend component tests with Vue Test Utils and user interaction simulation
  - [ ] 8.5 Implement end-to-end testing with Playwright covering complete user workflows
  - [ ] 8.6 Create performance tests for database queries and context retrieval
  - [ ] 8.7 Add load testing for concurrent outline editing and version management
  - [ ] 8.8 Create data consistency tests across PostgreSQL, Neo4j, and PGVector
  - [ ] 8.9 Implement story boundary compliance tests ensuring proper story_id filtering
  - [ ] 8.10 Add regression testing suite for existing StoryTeller functionality