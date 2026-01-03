-- ============================================================================
-- DATA QUALITY AUDIT FOR PHASE B: EPISODE CONTEXT ENHANCEMENT
-- ============================================================================
-- Purpose: Validate that required story intelligence data exists before development
-- Run this: psql -h localhost -p 5439 -U storyteller_user -d storyteller_dev -f data-quality-audit.sql
-- ============================================================================

\echo '\n========================================='
\echo 'DATA QUALITY AUDIT: Story Intelligence'
\echo '=========================================\n'

-- Story: Cat & Daniel
\echo '\n--- STORY DATA AUDIT ---'
SELECT
  id,
  title,
  CASE
    WHEN story_context IS NULL THEN 'NULL'
    WHEN story_context = '' THEN 'EMPTY'
    WHEN LENGTH(story_context) < 50 THEN 'TOO SHORT (<50 chars)'
    ELSE 'OK (' || LENGTH(story_context) || ' chars)'
  END AS story_context_status,
  CASE
    WHEN narrative_tone IS NULL THEN 'NULL'
    WHEN narrative_tone = '' THEN 'EMPTY'
    WHEN LENGTH(narrative_tone) < 20 THEN 'TOO SHORT (<20 chars)'
    ELSE 'OK (' || LENGTH(narrative_tone) || ' chars)'
  END AS narrative_tone_status,
  CASE
    WHEN core_themes IS NULL THEN 'NULL'
    WHEN core_themes = '' THEN 'EMPTY'
    WHEN LENGTH(core_themes) < 20 THEN 'TOO SHORT (<20 chars)'
    ELSE 'OK (' || LENGTH(core_themes) || ' chars)'
  END AS core_themes_status
FROM stories
WHERE id = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

\echo '\n--- ACTUAL STORY CONTEXT DATA ---'
SELECT
  'story_context' AS field,
  story_context AS value
FROM stories
WHERE id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'
UNION ALL
SELECT
  'narrative_tone',
  narrative_tone
FROM stories
WHERE id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'
UNION ALL
SELECT
  'core_themes',
  core_themes
FROM stories
WHERE id = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

\echo '\n--- PLOT ARCS AUDIT (For Phase A) ---'
SELECT
  arc_number,
  type,
  arc_hierarchy,
  activation_episode,
  peak_episode,
  resolution_episode,
  CASE
    WHEN activation_episode IS NOT NULL AND peak_episode IS NOT NULL AND resolution_episode IS NOT NULL THEN 'COMPLETE'
    ELSE 'INCOMPLETE (missing episode markers)'
  END AS episode_tracking_status
FROM plot_arcs
WHERE story_id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'
ORDER BY arc_number;

\echo '\n--- CHARACTER PROGRESSION DATA AUDIT (For Phase A/C) ---'
SELECT
  c.name,
  c.supernatural_influence_level,
  c.revenge_programming_resistance,
  CASE
    WHEN c.humanity_choice_evolution IS NOT NULL THEN 'HAS DATA'
    ELSE 'NULL'
  END AS humanity_evolution_status,
  COUNT(clc.id) AS location_contexts_count
FROM characters c
LEFT JOIN character_location_contexts clc ON c.id = clc.character_id
WHERE c.story_id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'
GROUP BY c.id, c.name, c.supernatural_influence_level, c.revenge_programming_resistance, c.humanity_choice_evolution;

\echo '\n--- LOCATION DATA COMPLETENESS ---'
SELECT
  COUNT(*) AS total_locations,
  COUNT(visual_description) AS has_visual_description,
  COUNT(atmosphere_category) AS has_atmosphere_category,
  ROUND(100.0 * COUNT(visual_description) / COUNT(*), 2) AS pct_with_visual_desc
FROM location_arcs
WHERE story_id = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

\echo '\n--- ARTIFACTS WITH SWARMUI PROMPTS ---'
SELECT
  COUNT(*) AS total_artifacts,
  COUNT(swarmui_prompt_fragment) FILTER (WHERE swarmui_prompt_fragment IS NOT NULL AND swarmui_prompt_fragment != '') AS has_prompt_fragment,
  ROUND(100.0 * COUNT(swarmui_prompt_fragment) FILTER (WHERE swarmui_prompt_fragment IS NOT NULL AND swarmui_prompt_fragment != '') / COUNT(*), 2) AS pct_with_prompts
FROM location_artifacts la
JOIN location_arcs loc ON la.location_arc_id = loc.id
WHERE loc.story_id = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

\echo '\n========================================='
\echo 'PHASE B READINESS ASSESSMENT'
\echo '=========================================\n'

-- Determine if Phase B can proceed
WITH readiness AS (
  SELECT
    CASE
      WHEN story_context IS NOT NULL AND story_context != '' AND LENGTH(story_context) >= 50 THEN 1
      ELSE 0
    END AS has_story_context,
    CASE
      WHEN narrative_tone IS NOT NULL AND narrative_tone != '' AND LENGTH(narrative_tone) >= 20 THEN 1
      ELSE 0
    END AS has_narrative_tone,
    CASE
      WHEN core_themes IS NOT NULL AND core_themes != '' AND LENGTH(core_themes) >= 20 THEN 1
      ELSE 0
    END AS has_core_themes
  FROM stories
  WHERE id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'
)
SELECT
  CASE
    WHEN has_story_context + has_narrative_tone + has_core_themes >= 2 THEN 'READY FOR PHASE B'
    WHEN has_story_context + has_narrative_tone + has_core_themes = 1 THEN 'PARTIAL DATA - PROCEED WITH CAUTION'
    ELSE 'NOT READY - DATA QUALITY ISSUES'
  END AS phase_b_readiness,
  CASE WHEN has_story_context = 1 THEN 'OK' ELSE 'MISSING/INCOMPLETE' END AS story_context,
  CASE WHEN has_narrative_tone = 1 THEN 'OK' ELSE 'MISSING/INCOMPLETE' END AS narrative_tone,
  CASE WHEN has_core_themes = 1 THEN 'OK' ELSE 'MISSING/INCOMPLETE' END AS core_themes
FROM readiness;

\echo '\n--- DATA QUALITY RECOMMENDATIONS ---'
\echo 'If Phase B readiness is NOT READY or PARTIAL:'
\echo '  1. Populate missing fields in stories table'
\echo '  2. Ensure story_context is at least 50 characters (comprehensive description)'
\echo '  3. Ensure narrative_tone is at least 20 characters (clear tone description)'
\echo '  4. Ensure core_themes is at least 20 characters (meaningful themes)'
\echo '\n'
\echo 'For Phase A planning:'
\echo '  - Verify plot_arcs have activation_episode, peak_episode, resolution_episode'
\echo '  - Check that arcs span appropriate episode ranges'
\echo '\n'
\echo 'For Phase C planning:'
\echo '  - Review character progression data (supernatural_influence_level, revenge_programming_resistance)'
\echo '  - Verify character_location_contexts exist for key characters'
\echo '\n'
