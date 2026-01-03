# StoryArt Development Guidelines

## Core Development Principles

### Real Data Over Mock Data

**CRITICAL PRINCIPLE: Always test with real data. Mock data only when absolutely necessary.**

**Rationale:**
Mock data makes presuppositions about data structure, content, and edge cases that are consistently found to be invalid when real data is injected into the system. This leads to:
- False confidence in implementations
- Missed edge cases and data quality issues
- Rework when integrating with actual database
- Invalid assumptions about data completeness and format

**Guidelines:**

1. **Default to Real Data:**
   - Connect to actual StoryTeller database (postgresql://localhost:5439/storyteller_dev)
   - Use actual story data for testing
   - Test with real episodes, characters, locations from production stories

2. **When Mock Data is Acceptable:**
   - Database is unavailable (offline development)
   - Testing specific error conditions (database failures, timeouts)
   - Unit testing pure functions with no external dependencies
   - Performance testing where real data query overhead is prohibitive

3. **Mock Data Requirements (When Necessary):**
   - Must be derived from actual database samples
   - Must include real edge cases (null values, empty strings, long text)
   - Must match actual schema exactly (no simplified versions)
   - Must be clearly marked as mock data in code comments
   - Must include a TODO to replace with real data when possible

4. **Implementation Pattern:**
```typescript
// GOOD: Real data with fallback
async function getStoryData(storyId: string): Promise<StoryData> {
  try {
    // Attempt real database query
    const result = await queryDatabase('SELECT * FROM stories WHERE id = $1', [storyId]);
    return result[0];
  } catch (error) {
    console.error('Database query failed, falling back to mock data:', error);
    // Only use mock data as fallback
    return getMockStoryData(storyId);
  }
}

// BAD: Mock data by default
async function getStoryData(storyId: string): Promise<StoryData> {
  // Simulating database query for development
  return {
    id: storyId,
    title: "Mock Story",
    story_context: "Mock context"
  };
}
```

5. **Data Quality Validation:**
   - Before implementing features, audit actual database for data quality
   - Document what data actually exists vs. what schema defines
   - Test with incomplete data (missing fields, null values)
   - Validate assumptions against reality

6. **Feature Flag Pattern:**
```typescript
const USE_REAL_DATABASE = import.meta.env.VITE_USE_REAL_DATABASE !== 'false';

if (USE_REAL_DATABASE) {
  return await queryRealDatabase(query, params);
} else {
  console.warn('Using mock data - set VITE_USE_REAL_DATABASE=true for real data');
  return getMockData();
}
```

**Example of Mock Data Presupposition Failures:**

1. **Presupposition:** story_context is always a single paragraph
   - **Reality:** Can be empty, can be multiple paragraphs, can include newlines

2. **Presupposition:** All characters have location contexts
   - **Reality:** Some characters may not have any location_contexts entries

3. **Presupposition:** Artifacts always have swarmui_prompt_fragment
   - **Reality:** Many artifacts have null or empty swarmui_prompt_fragment

4. **Presupposition:** Episodes are sequential (1, 2, 3...)
   - **Reality:** May have gaps, may start at episode 0, may be non-sequential

**Benefits of Real Data Testing:**
- Discover actual data quality issues early
- Build robust error handling for real-world scenarios
- Validate that database schema matches documentation
- Identify missing data that needs to be populated
- Build confidence that code works in production

**When in Doubt:**
- Query the real database
- Inspect actual data
- Test with production stories
- Document what you find

---

**Last Updated:** 2025-11-26
**Owner:** Development Team
**Status:** Active Development Guideline
