# Product Requirements Document: Agency Swarm Integration for StoryTeller

## Introduction/Overview

The StoryTeller application currently generates episode roadmaps through sequential database retrieval of plot arcs, resulting in simplistic "Episode N: Plot Arc Name" structures that lack creative narrative planning. The current scene generator works well but operates without roadmap context, limiting its ability to produce coherent, series-aware content.

This PRD outlines a two-phase Agency Swarm integration that will first replace the sequential roadmap generation with AI-powered narrative planning, then create a new Agency Swarm-based scene generator for comparison with the existing system. The goal is to leverage multi-agent collaboration to create more sophisticated, contextually-aware story planning and scene generation while maintaining the existing proven scene generator as a baseline.

**Goal**: Transform StoryTeller from sequential database retrieval to AI-powered narrative orchestration using Agency Swarm v1.0, providing both superior roadmap generation and an alternative scene generation approach for user comparison.

## Goals

1. **Phase 1 - Self-Sufficient Agency Swarm Roadmap Generation**: Replace sequential plot arc retrieval with sophisticated multi-agent episode planning that creates narrative-coherent roadmaps with rich episode-level detail, character development arcs, and plot progression. Each episode in the roadmap will contain comprehensive context (title, description, key events, character arcs, plot points) that serves as complete guidance for subsequent scene generation.
2. **Phase 2 - Roadmap-Connected Scene Generation**: Create both Agency Swarm and existing scene generator approaches that consume episode-level context from Agency Swarm-generated roadmaps, eliminating the need for original story metadata during scene generation and focusing only on scene-specific requirements.
3. **Framework Integration**: Implement proper Agency Swarm v1.0 integration with automatic update mechanisms to ensure compatibility with the latest v1.x features.
4. **User-Driven Selection**: Provide authors with choice between Agency Swarm and current scene generation approaches, allowing data-driven decisions on preferred methods.
5. **Database Compatibility**: Model Agency Swarm components to work with existing database schemas without requiring structural changes.
6. **Comparative Analysis**: Establish framework for comparing quality, coherence, and user preference between Agency Swarm and current generation methods.

## User Stories

### Phase 1 - Roadmap Generation
1. **As a story creator**, I want to generate episode roadmaps using Agency Swarm AI agents so that I receive sophisticated narrative planning instead of sequential plot arc assignment.
2. **As a story creator**, I want Agency Swarm-generated roadmaps to include proper episode pacing, character development milestones, and plot crisis points so that my story has professional narrative structure.
3. **As a story creator**, I want to select from different episodic templates (3-act mini-series, 4-act TV season, etc.) that are enhanced by Agency Swarm analysis so that I can choose the optimal structure for my story.
4. **As a story creator**, I want to see episode titles, descriptions, and key events that are creatively generated rather than templated so that each episode feels unique and purposeful.
5. **As a story creator**, I want roadmap generation to consider character relationships, plot arc interactions, and story complexity so that the generated structure reflects my story's unique elements.
6. **As a story creator**, I want Agency Swarm to create episode structures that combine main plot arcs, sub-plots, and secondary plots within individual episodes so that each episode has rich narrative complexity and contributes to multiple story threads.
7. **As a story creator**, I want Agency Swarm-generated roadmaps to be fully modifiable both in episode sequence and internal metadata so that I can refine and adjust the AI-generated structure to match my creative vision.

### Phase 2 - Scene Generation
8. **As a story creator**, I want to generate scenes using both Agency Swarm and current generators that consume episode-level context from Agency Swarm roadmaps so that I can compare output quality without redundant story metadata.
9. **As a story creator**, I want scene generators to focus only on scene-specific requirements (characters, locations, plot arc context, narrative position) since all story context is baked into the roadmap episodes.
10. **As a story creator**, I want to choose between current and Agency Swarm scene generation methods so that I can select the approach that best suits my creative needs.
11. **As a story creator**, I want Agency Swarm scene generation to provide validation feedback from specialized agents (character consistency, plot coherence) so that I can understand quality reasoning behind generated scenes.
12. **As a story creator**, I want to provide feedback on which scene generation approach produces better results when using the same roadmap context so that future development can focus on the most effective methods.

### Framework Integration
13. **As a developer**, I want the system to automatically integrate Agency Swarm v1.0 updates so that we always have access to the latest multi-agent capabilities.
14. **As a developer**, I want Agency Swarm components to use existing database schemas so that integration doesn't require disruptive database changes.
15. **As a developer**, I want clear separation between Agency Swarm and current generation systems so that both can run independently for comparison purposes.
16. **As a developer**, I want comprehensive metrics on both generation approaches so that data-driven decisions can guide future development priorities.
17. **As a developer**, I want the system to maintain Agency Swarm v1.0 compatibility so that framework updates don't break existing functionality.

## Functional Requirements

### 1.0 Agency Swarm Framework Integration
1.1. The system must integrate Agency Swarm v1.0 framework with proper dependency management and version control.
1.2. The system must implement automatic update mechanisms to stay current with Agency Swarm v1.x releases while maintaining backward compatibility.
1.3. The system must provide configuration management for Agency Swarm agents, including AI model assignments and communication protocols.
1.4. The system must include error handling and fallback mechanisms for Agency Swarm agent communication failures.
1.5. The system must monitor Agency Swarm GitHub repository for v1.x updates and integrate improvements automatically.

### 2.0 Phase 1: Agency Swarm Roadmap Generation

#### 2.1 Story Context Integration Requirements
2.1.1. The system MUST provide Agency Swarm agents with comprehensive story context from the database to establish proper creative boundaries and narrative direction:

**Core Story Information (stories table):**
- **title**: Story title for narrative framing
- **description**: Overall story concept and premise
- **genre**: Genre classification for tone and style guidance
- **current_episode_number**: Current progress within the story

**AI Context Guidance (ai_contexts.context_data JSON):**
- **relationshipDynamics**: Character relationship frameworks and interaction patterns
- **narrativeTone**: Desired tone, style, and atmospheric guidance
- **thematicElements**: Core themes to be woven throughout the narrative

**Story Resolution Planning (stories table):**
- **planned_ending**: How the entire story should end (North Star guidance)
- **total_episodes**: Planned series length for proper pacing
- **series_conclusion**: Final story resolution details
- **character_final_states**: Where all major characters end up
- **relationship_resolutions**: How key relationships conclude
- **thematic_resolution**: Final thematic answers and resolutions

**Plot Arc Resolution Planning (plot_arcs table):**
- **resolution_goal**: How each individual arc should resolve
- **climax_description**: Peak moment descriptions for major plot points
- **ending_state**: Final state after arc resolution
- **resolution_episode**: Target episode for arc resolution
- **character_destinations**: Where characters end up after each arc
- **thematic_payoff**: Theme resolution for individual arcs

2.1.2. The system MUST integrate story context data into Agency Swarm agent decision-making processes to ensure roadmap generation operates within established creative boundaries.

2.1.3. The system MUST use resolution planning data to guide episode pacing and ensure generated roadmaps progress toward planned story conclusions.

2.1.4. The system MUST analyze character relationship dynamics and thematic elements to ensure roadmap content maintains consistency with authorial intent.

2.1.5. The system MUST consider genre-specific conventions and narrative expectations when generating episode structures.

#### 2.2 Prerequisites for Agency Swarm Roadmap Generation
2.2.1. **Story Metadata Validation**: The system MUST validate that essential story metadata exists before initiating Agency Swarm roadmap generation:
   - **REQUIRED**: Story title, description, and genre must be present
   - **REQUIRED**: At minimum, planned_ending or series_conclusion must be defined
   - **REQUIRED**: total_episodes must be specified (cannot be null/zero)
   - **STRONGLY RECOMMENDED**: AI context guidance with relationshipDynamics, narrativeTone, or thematicElements
   - **OPTIMAL**: Complete resolution planning data including character_final_states and relationship_resolutions

2.2.2. **Context Completeness Assessment**: The system MUST assess the completeness of story context and provide feedback to users when critical elements are missing:
   - **CRITICAL MISSING**: If no ending direction is provided, warn user that roadmap generation will lack narrative purpose
   - **IMPORTANT MISSING**: If no episode count is specified, require user input before proceeding
   - **ENHANCEMENT OPPORTUNITY**: If AI context guidance is missing, suggest completing for better results
   - **QUALITY WARNING**: If plot arcs lack resolution planning, notify user that episode progression may be less focused

2.2.3. **Progressive Context Enhancement**: The system MUST allow users to provide missing story context through the roadmap generation interface when critical elements are not present:
   - **Inline Form Elements**: Allow entry of planned_ending, total_episodes, and genre directly in roadmap generation UI
   - **Context Enhancement Prompts**: Guide users to provide the most impactful missing elements first
   - **Save Progress**: Allow users to save story context updates before proceeding with roadmap generation
   - **Context Quality Scoring**: Provide feedback on context completeness and its expected impact on roadmap quality

2.2.4. **Story Context Dependency**: The system MUST enforce the requirement that Agency Swarm roadmap generation cannot proceed without minimum viable story context:
   - **Minimum Viable Context**: Title, description, genre, planned_ending, and total_episodes are mandatory
   - **Generation Gate**: Prevent Agency Swarm roadmap generation when minimum context is not available
   - **Fallback Option**: Offer sequential generation or context completion guidance when Agency Swarm is unavailable due to missing context
   - **Context First Workflow**: Guide users through story context completion before presenting Agency Swarm roadmap options

2.3. The system must replace sequential plot arc retrieval with multi-agent episode planning using existing Agency Swarm agents:
   - StoryContextOrchestrator for narrative direction
   - PlotArcCoordinator for plot structure management
   - CharacterConsistencyManager for character development
   - SceneCoherenceValidator for timeline validation
   - EpisodeOutlineProvider for episode synthesis
2.4. The system must generate creative episode titles and descriptions instead of templated "Episode N: Plot Arc Name" structures.
2.5. The system must analyze story complexity and suggest optimal episode counts based on narrative elements.
2.6. The system must support episodic template selection with Agency Swarm enhancement for structural guidance.
2.7. The system must create episode outlines that include character development milestones, plot crisis points, and narrative pacing.
2.8. The system must validate generated roadmaps for timeline consistency and character arc coherence.
2.9. The system must create episode structures that combine main plot arcs, sub-plots, and secondary plots within individual episodes, ensuring rich narrative complexity.
2.10. The system must store Agency Swarm-generated roadmaps using existing EpisodeOutline model schema.
2.11. The system must provide full modification capabilities for generated roadmaps, allowing users to adjust both episode sequence and internal metadata.
2.12. The system must provide roadmap quality metrics and confidence scores for user assessment.

### 3.0 Phase 2: Roadmap-Connected Scene Generation
3.1. The system must create a new Agency Swarm scene generator using multi-agent patterns, built from scratch without reusing current scene generator logic.
3.2. The system must implement Agency Swarm scene generation using the specialized agent architecture:
   - StoryContextOrchestrator for narrative positioning within episode context
   - CharacterConsistencyManager for character voice and relationships from episode roadmap
   - PlotArcCoordinator for plot arc progression based on episode key events
   - SceneCoherenceValidator for timeline and pacing validation within episode structure
   - EpisodeOutlineProvider for scene-specific context from roadmap episode data
3.3. **Roadmap Context Consumption**: Both Agency Swarm and existing scene generators must consume episode-level context from Agency Swarm-generated roadmaps instead of original story metadata:
   - **Episode Title & Description**: Narrative context for scene generation
   - **Key Events**: Major plot developments that scenes should support
   - **Character Arcs**: Character development points to incorporate
   - **Plot Points**: Specific plot elements that scenes should advance
   - **Episode Type**: Understanding if pilot, regular, finale, or special
   - **Complexity Score**: Guidance for scene intensity and depth
3.4. **Scene-Specific Focus**: Scene generators must focus only on scene-level requirements:
   - **Character Metadata**: Backstory, relationships, and current states
   - **Location Information**: Where the scene takes place and environmental details
   - **Plot Arc Context**: What specific plot elements are being addressed
   - **Narrative Position**: Where in the episode and overall story this scene occurs
   - **Intensity & Pacing**: Emotional intensity, conflict level, and pacing requirements
3.5. The system must generate scenes with validation feedback from specialized agents.
3.6. The system must support the same scene types as the current generator (ACTION, DIALOGUE, DESCRIPTION, FLASHBACK, MONTAGE, combinations).
3.7. The system must store Agency Swarm-generated scenes using existing Scene model schema.
3.8. The system must provide comparison metrics between Agency Swarm and current scene generation outputs when using identical roadmap context.

### 4.0 Database Integration
4.1. The system must use existing database tables and columns without requiring schema modifications.
4.2. The system must integrate with existing story, character, plot arc, and location data models.
4.3. The system must maintain story_id filtering for multi-story support across all Agency Swarm operations.
4.4. The system must use existing UUID relationship patterns for database consistency.
4.5. The system must ensure compatibility with existing Neo4j graph relationships and PGVector embeddings.

### 5.0 User Interface and Selection
5.1. The system must provide user interface elements for selecting between current and Agency Swarm generation methods.
5.2. The system must display Agency Swarm-generated roadmaps with quality indicators and confidence scores.
5.3. The system must enable side-by-side comparison of current vs Agency Swarm scene generation outputs.
5.4. The system must collect user preference feedback between generation approaches.
5.5. The system must provide clear visual indicators when Agency Swarm methods are being used vs traditional methods.

### 6.0 Performance and Reliability
6.1. The system must maintain Agency Swarm v1.0 compatibility and handle framework updates gracefully.
6.2. The system must provide fallback mechanisms when Agency Swarm agents are unavailable or fail.
6.3. The system must monitor generation performance and cost metrics for both approaches.
6.4. The system must ensure that Agency Swarm operations don't degrade existing system performance.
6.5. The system must implement proper error handling and logging for Agency Swarm operations.

## Non-Goals (Out of Scope)

1. **Current Scene Generator Replacement**: This system will NOT replace the existing scene generator - both will coexist for comparison.
2. **Database Schema Modifications**: The system will NOT modify existing database tables or create new schemas.
3. **Disruption of Current Operations**: The system will NOT change or disable existing functionality for non-Agency Swarm operations.
4. **Agency Swarm v2.0 Compatibility**: The system will focus on v1.0 compatibility only - v2.0 integration is out of scope.
5. **Removal of Sequential Generation**: While sequential roadmap generation will be replaced, other sequential operations may remain if appropriate.
6. **Forced Migration**: Users will NOT be forced to use Agency Swarm methods - choice will be preserved.
7. **Framework Modification**: The system will NOT modify core Agency Swarm framework code - only integrate with it.

## Design Considerations

### User Interface Flow
- **Roadmap Generation**: Users select "Generate with Agency Swarm" option on roadmap creation interface
- **Template Selection**: Episodic templates are enhanced by Agency Swarm analysis before application
- **Scene Generation**: Users can choose "Current Generator" or "Agency Swarm Generator" when creating scenes
- **Comparison Interface**: Side-by-side display of generation results with quality metrics
- **Feedback Collection**: Simple preference voting and detailed feedback forms

### Technical Architecture
- **Agent Coordination**: Existing Agency Swarm agents coordinate through established communication patterns
- **Database Access**: Agents use existing service layers and models for data access
- **API Integration**: New endpoints for Agency Swarm operations alongside existing endpoints
- **Error Handling**: Graceful degradation when Agency Swarm components fail
- **Update Management**: Automated Agency Swarm version checking and integration

### Integration Points
- **Roadmap Service**: Enhanced to use Agency Swarm agents instead of sequential logic
- **Scene Generation**: Parallel implementation using Agency Swarm patterns
- **UI Components**: Extended to support generation method selection and comparison
- **Database Services**: Leveraged without modification for data persistence
- **AI Coordination**: Enhanced to include Agency Swarm agent management

### Story Context Data Flow
- **Story Context Retrieval**: Agency Swarm agents access comprehensive story data from multiple database tables
- **Guidance Integration**: AI context guidance and resolution planning data informs agent decision-making
- **Boundary Establishment**: Genre, themes, and planned endings provide creative constraints for generation
- **Progress Tracking**: Current episode number and resolution targets ensure proper narrative pacing
- **Consistency Maintenance**: Character relationships and thematic elements are maintained across generated content

## Technical Considerations

### Agency Swarm v1.0 Integration
- **Version Management**: Implement semantic version checking for v1.x compatibility
- **Update Monitoring**: GitHub API integration for release tracking
- **Dependency Management**: Proper pip dependency resolution with version constraints
- **Configuration Management**: Environment-based configuration for agent behavior
- **Fallback Strategy**: Graceful handling of Agency Swarm unavailability

### Database Compatibility
- **Model Mapping**: Map Agency Swarm data structures to existing database models
- **Relationship Preservation**: Maintain existing UUID relationships and foreign key constraints
- **Query Optimization**: Ensure Agency Swarm operations don't impact database performance
- **Transaction Management**: Proper transaction handling for multi-agent operations
- **Data Validation**: Ensure Agency Swarm outputs conform to existing data constraints

### Performance Optimization
- **Agent Caching**: Cache agent configurations and communication patterns
- **Resource Management**: Proper resource allocation for concurrent agent operations
- **Monitoring**: Performance metrics collection for Agency Swarm vs traditional methods
- **Cost Tracking**: Token usage and cost comparison between generation approaches
- **Response Time**: Ensure Agency Swarm operations meet acceptable response time thresholds

## Success Metrics

1. **Roadmap Quality**: Agency Swarm-generated roadmaps demonstrate superior narrative structure compared to sequential generation (measured through user preference ratings and coherence scores).
2. **Scene Generation Comparison**: User preference data shows clear preference between Agency Swarm and current scene generation approaches (measured through A/B testing feedback).
3. **Framework Integration**: Agency Swarm v1.0 integration achieves 95%+ compatibility with automatic update handling (measured through integration test success rate).
4. **Database Compatibility**: Agency Swarm operations work with existing schemas without requiring modifications (measured through schema compliance tests).
5. **User Adoption**: 70%+ of users try Agency Swarm generation methods when available (measured through feature usage analytics).
6. **System Stability**: Agency Swarm integration doesn't increase system error rates or degrade performance (measured through system monitoring).
7. **Cost Efficiency**: Agency Swarm operations maintain cost-effectiveness while providing improved quality (measured through cost-per-output metrics).

## Open Questions

1. **Agent Configuration**: What is the optimal configuration for Agency Swarm agents to balance quality and performance?
2. **Update Frequency**: How often should Agency Swarm GitHub integration check for updates, and what level of version change requires testing?
3. **User Interface**: How should users be presented with the choice between generation methods to encourage experimentation without confusion?
4. **Quality Metrics**: What specific metrics should be used to compare Agency Swarm vs current generation quality beyond user preference?
5. **Fallback Strategy**: What specific fallback mechanisms should be implemented when Agency Swarm components fail?
6. **Agent Specialization**: Should additional specialized agents be created for specific story genres or content types?
7. **Training Data**: What training data or examples should be provided to Agency Swarm agents to optimize their performance for story generation?
8. **Scaling Performance**: How will the system perform with multiple concurrent Agency Swarm operations?