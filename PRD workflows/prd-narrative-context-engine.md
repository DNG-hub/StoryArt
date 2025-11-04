# Product Requirements Document: Narrative Context Engine

## Introduction/Overview

The Narrative Context Engine is a comprehensive episode outline generation and management system that addresses the critical gap in StoryTeller's scene generation workflow. Currently, the scene generator produces compelling individual scenes but lacks story coherence because it operates without episode-specific context or awareness of plot arc progression within established story structures.

This system will provide a sophisticated interface for creating, versioning, and managing episode outlines while integrating deeply with StoryTeller's existing database architecture (PostgreSQL, Neo4j, PGVector). The engine ensures that scene generation receives rich contextual information, enabling coherent storytelling across complex, multi-episode narrative structures.

**Goal**: Transform scene generation from isolated content creation into contextually-aware storytelling that respects established plot arcs, character development, and narrative pacing.

## Goals

1. **Contextual Scene Generation**: Provide episode-specific context to scene generation, eliminating random story element selection
2. **Story Coherence**: Ensure generated scenes respect character development, plot arc progression, and timeline consistency
3. **Flexible Outline Management**: Enable dynamic episode structure modification throughout the storytelling process
4. **Template-Driven Structure**: Leverage industry-standard plot templates with clear descriptions and pacing guidelines
5. **Version Control**: Maintain historical context and enable experimentation without losing established work
6. **Database Integration**: Seamlessly integrate with existing PostgreSQL, Neo4j, and PGVector architecture
7. **Historical Context Awareness**: Enable scene generation to reference previous dialogue and story progression

## User Stories

1. **As a story creator**, I want to select from industry-standard plot templates (Three-Act TV, Five-Act Limited Series, Hero's Journey) with clear descriptions so I understand their structural implications and can choose the best fit for my story.

2. **As a story creator**, I want to determine the optimal episode count for my story's natural resolution so pacing feels appropriate and the narrative arc reaches a satisfying conclusion.

3. **As a story creator**, I want to generate Scene 1 of Episode 15 with proper contextual awareness so it continues active plot arcs appropriately and maintains character consistency.

4. **As a story creator**, I want to save and version my outline iterations so I can experiment with different approaches and revert changes without losing established work.

5. **As a story creator**, I want to modify outlines during the development process when new story insights emerge from scene generation, ensuring the narrative structure remains flexible and responsive.

6. **As a story creator**, I want character behavior in generated scenes to match their established psychology and development trajectory so scenes feel authentic and consistent.

7. **As a story creator**, I want to avoid timeline contradictions and character inconsistencies so my multi-episode structure remains coherent throughout.

8. **As a story creator**, I want each episode to have configurable scenes with 10-12 minute duration constraints so episodes maintain proper pacing and structure.

## Functional Requirements

1. **Template Management System**
   1.1. The system must provide a library of industry-standard plot templates including Three-Act TV Drama, Five-Act Limited Series, Hero's Journey, Fichtean Curve, and British Three-Act structure.
   1.2. Each template must include descriptive text explaining its structure, typical episode count, pacing characteristics, and appropriate use cases.
   1.3. The system must default to "Standard TV Drama Three-Act Structure" for new projects.
   1.4. Users must be able to create and save custom plot templates.

2. **Episode Architecture Management**
   2.1. The system must provide an episode count calculator that analyzes story complexity and suggests optimal episode counts for natural resolution.
   2.2. Users must be able to dynamically add or remove episodes with automatic plot redistribution.
   2.3. Each episode must support configurable scene counts with 10-12 minute duration tracking and validation.
   2.4. The system must provide crisis point positioning, character arc milestones, and resolution timing controls.

3. **Outline Generation and Management**
   3.1. The system must generate episode-by-episode breakdowns with scene timing and plot arc progression.
   3.2. Users must be able to create, edit, and delete episode outlines through an intuitive interface.
   3.3. The system must track which plot arcs are active, peaking, or resolving at specific episodes.
   3.4. Character development tracking must be maintained across all episodes.

4. **Version Control System**
   4.1. The system must create immutable outline versions with each modification.
   4.2. Users must be able to save outline versions with descriptive names and restoration capabilities.
   4.3. The system must provide a diff viewer to compare outline versions and identify changes.
   4.4. Users must be able to create branching outline versions for experimentation.
   4.5. The system must maintain links between outline versions and scenes generated from them.

5. **Database Integration**
   5.1. All outline data must be stored in PostgreSQL with proper UUID relationships to existing story components.
   5.2. Outline relationships must be mapped in Neo4j including Story→Episode→Scene hierarchies and Plot_Arc→Episode_Involvement connections.
   5.3. Episode outline content must be embedded in PGVector for semantic search and similarity matching.
   5.4. The system must maintain story_id filtering for multi-story database support.

6. **Historical Context Management**
   6.1. The system must store scene generation snapshots linking each scene to its originating outline version.
   6.2. Scene generators must be able to reconstruct exact story context at any historical generation point.
   6.3. The system must provide access to previous scene dialogue via PGVector similarity search.
   6.4. Character dialogue patterns and development arcs must be tracked and accessible for consistency validation.

7. **Scene Generator Integration**
   7.1. The system must provide scene generators with episode-specific context objects including active plot arcs, character states, and previous scene summaries.
   7.2. Scene validation must ensure generated content aligns with established story progression and character development.
   7.3. The system must detect and flag timeline contradictions or character inconsistencies.
   7.4. Context retrieval queries must complete within 200ms for real-time scene generation support.

8. **User Interface Requirements**
   8.1. The template selection interface must display templates in a grid/dropdown with preview descriptions and structural details.
   8.2. The episode planning dashboard must provide episode count controls, scene breakdowns with timing indicators, and plot arc timeline visualization.
   8.3. The outline editor must support inline editing with real-time validation of scene timing constraints and plot arc conflict detection.
   8.4. Version history must be accessible through a sidebar with save/restore controls.

## Non-Goals (Out of Scope)

1. **Story Creation**: This system will NOT create new stories from scratch - it only enhances existing story databases.
2. **Content Rewriting**: The system will NOT rewrite or modify existing story content, only provide context and validation.
3. **AI Orchestration Replacement**: The system will NOT replace existing AI coordination infrastructure, only enhance it with better context.
4. **Scene Content Generation**: The system will NOT generate actual scene content, only provide contextual guidance for existing scene generators.
5. **Character Profile Creation**: The system will NOT create new character profiles, only track development of existing characters.
6. **Plot Arc Creation**: The system will NOT create new plot arcs, only manage progression of established arcs.

## Design Considerations

**Template Selection Interface:**
- Grid layout displaying template cards with titles, descriptions, and typical episode counts
- Preview pane showing structural phases and crisis points
- Filter options for template type (TV Drama, Limited Series, Film Adaptation, etc.)

**Episode Planning Dashboard:**
- Central timeline view with episode blocks and plot arc overlays
- Sidebar controls for episode count adjustment and scene configuration
- Bottom panel for template information and pacing guidelines

**Outline Editor:**
- Split-pane design with episode list on left and detailed content on right
- Inline editing with auto-save and validation feedback
- Context panels showing character states and active plot arcs

**Version Management:**
- Timeline view of outline versions with branching visualization
- Comparison tools for version diff analysis
- Restoration workflow with confirmation dialogs

## Technical Considerations

**Database Schema Extensions:**
- New tables: outline_versions, plot_templates, scene_outline_dependencies, episode_structures
- Enhanced relationships in Neo4j for outline→episode→scene dependencies
- PGVector integration for outline content embeddings and similarity search

**API Integration:**
- REST endpoints for outline CRUD operations following existing FastAPI patterns
- WebSocket connections for real-time outline collaboration (future consideration)
- Integration with existing async SQLAlchemy sessions and UUID patterns

**Performance Requirements:**
- Context retrieval queries must complete under 200ms
- Outline version comparisons must render within 1 second
- Scene validation must provide feedback within 500ms

**Caching Strategy:**
- Active outline versions cached in Redis for quick access
- Template definitions cached at application startup
- Character development states cached per episode for rapid validation

## Success Metrics

1. **Scene Coherence**: Generated scenes demonstrate proper continuation of plot arcs and character consistency (measured through user validation and automated consistency scoring).
2. **Context Retrieval Performance**: Database queries for historical context complete within 200ms in 95% of cases.
3. **User Workflow Efficiency**: Time from outline modification to scene generation decreases by 60% compared to manual context gathering.
4. **Story Continuity**: Automated detection identifies 90%+ of potential timeline contradictions and character inconsistencies before scene generation.
5. **Template Utilization**: Users successfully select and apply appropriate plot templates for their story structures in 80%+ of cases.
6. **Version Management Adoption**: Users create and manage multiple outline versions in 70%+ of active story projects.
7. **Database Performance**: No degradation in existing StoryTeller functionality with new database schema additions.

## Open Questions

1. **Outline Modification Frequency**: Should the system save versions on every edit or only on explicit user save actions?
2. **Scene Regeneration Workflow**: When outline changes significantly affect existing scenes, should the system automatically flag them for regeneration or require manual review?
3. **Context Window Size**: What is the optimal number of previous scenes to include in context for new scene generation (5, 10, or configurable)?
4. **Template Customization Depth**: Should users be able to modify existing templates or only create entirely new ones?
5. **Collaboration Support**: Should multiple users be able to edit outlines simultaneously (future scope consideration)?
6. **Mobile Interface**: Should the outline management interface be responsive for tablet/mobile access or remain desktop-focused?
7. **Export Capabilities**: Should the system provide export functionality for outlines (PDF, Word, Final Draft format)?
8. **Integration Testing Strategy**: How should we validate that outline changes don't break existing scene generation workflows during development?