/**
 * Phase A Data Quality Audit
 *
 * Checks readiness of location and character data for Phase A implementation.
 * Uses actual PostgreSQL database queries to check real data.
 *
 * Usage: tsx scripts/audit-phase-a-data-quality.ts
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const CAT_DANIEL_STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

// Database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL,
});

interface LocationData {
  id: string;
  name: string;
  visual_description: string;
  location_type: string;
}

interface ArtifactData {
  id: string;
  artifact_name: string;
  swarmui_prompt_fragment: string;
  location_arc_id: string;
  location_name: string;
}

interface CharacterLocationData {
  id: string;
  character_name: string;
  location_name: string;
  swarmui_prompt_override: string;
}

async function runAudit() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           Phase A Data Quality Audit                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Story ID: ${CAT_DANIEL_STORY_ID}`);
  console.log('Fetching data from PostgreSQL database...');
  console.log('');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('');

    // 1. Check Location Data
    console.log('📊 Checking Location Data...');
    console.log('');

    const locationsResult = await pool.query<LocationData>(`
      SELECT id, name, visual_description, location_type
      FROM location_arcs
      WHERE story_id = $1
      ORDER BY created_at
    `, [CAT_DANIEL_STORY_ID]);

    const locations = locationsResult.rows.map(loc => ({
      id: loc.id,
      name: loc.name,
      visual_description: loc.visual_description || '',
      length: (loc.visual_description || '').length,
      location_type: loc.location_type
    }));

    console.log(`Found ${locations.length} locations`);
    console.log('');

    if (locations.length === 0) {
      console.log('⚠️  No locations found in database');
      console.log('   → This story may not have location data yet');
    } else {
      console.log('Location Quality Assessment:');
      locations.forEach(loc => {
        const status = loc.length >= 100 ? '✅' : '⚠️';
        const quality = loc.length >= 300 ? 'EXCELLENT' : loc.length >= 100 ? 'GOOD' : 'NEEDS IMPROVEMENT';
        console.log(`${status} ${loc.name}: ${loc.length} chars (${quality})`);
        if (loc.length < 300) {
          const preview = loc.visual_description.substring(0, 80);
          console.log(`   → Current: "${preview}${loc.visual_description.length > 80 ? '...' : ''}"`);
          console.log(`   → Recommendation: ${loc.length < 100 ? 'Add' : 'Expand to'} 300-500 chars with specific visual details`);
        }
      });
    }
    console.log('');

    // 2. Check Character Override Data
    console.log('📊 Checking Character Data...');
    console.log('');

    const characterOverridesResult = await pool.query<CharacterLocationData>(`
      SELECT
        clc.id,
        c.name as character_name,
        loc.name as location_name,
        clc.swarmui_prompt_override
      FROM character_location_contexts clc
      JOIN characters c ON clc.character_id = c.id
      JOIN location_arcs loc ON clc.location_arc_id = loc.id
      WHERE c.story_id = $1
      ORDER BY c.name, loc.name
    `, [CAT_DANIEL_STORY_ID]);

    // Group by character
    const characterMap = new Map<string, {
      name: string;
      total_locations: number;
      locations_with_overrides: number;
      overrides: Array<{ location: string; override: string }>;
    }>();

    characterOverridesResult.rows.forEach(row => {
      if (!characterMap.has(row.character_name)) {
        characterMap.set(row.character_name, {
          name: row.character_name,
          total_locations: 0,
          locations_with_overrides: 0,
          overrides: []
        });
      }
      const charData = characterMap.get(row.character_name)!;
      charData.total_locations++;
      if (row.swarmui_prompt_override && row.swarmui_prompt_override.trim().length > 0) {
        charData.locations_with_overrides++;
        charData.overrides.push({
          location: row.location_name,
          override: row.swarmui_prompt_override
        });
      }
    });

    const characters = Array.from(characterMap.values());

    console.log(`Found ${characters.length} characters with location contexts`);
    console.log('');

    if (characters.length === 0) {
      console.log('⚠️  No character location contexts found');
      console.log('   → Characters may not have location-specific appearance data yet');
    } else {
      console.log('Character Override Coverage:');
      characters.forEach(char => {
        const coverage = char.total_locations > 0
          ? (char.locations_with_overrides / char.total_locations) * 100
          : 0;
        const status = coverage >= 60 ? '✅' : '⚠️';
        const quality = coverage >= 80 ? 'EXCELLENT' : coverage >= 60 ? 'GOOD' : 'NEEDS MORE';
        console.log(`${status} ${char.name}: ${char.locations_with_overrides}/${char.total_locations} locations (${coverage.toFixed(0)}% coverage, ${quality})`);

        if (char.overrides.length > 0) {
          console.log(`   → Has overrides for: ${char.overrides.map(o => o.location).join(', ')}`);
          const sample = char.overrides[0].override.substring(0, 80);
          console.log(`   → Sample: "${sample}..."`);
        }

        if (coverage < 60) {
          const needed = Math.ceil((char.total_locations * 0.6) - char.locations_with_overrides);
          console.log(`   → Recommendation: Add overrides for ${needed} more location(s)`);
        }
      });
    }
    console.log('');

    // 3. Check Artifact Data
    console.log('📊 Checking Artifact Data...');
    console.log('');

    const artifactsResult = await pool.query<ArtifactData>(`
      SELECT
        la.id,
        la.artifact_name,
        la.swarmui_prompt_fragment,
        la.location_arc_id,
        loc.name as location_name
      FROM location_artifacts la
      JOIN location_arcs loc ON la.location_arc_id = loc.id
      WHERE loc.story_id = $1
      ORDER BY loc.name, la.created_at
    `, [CAT_DANIEL_STORY_ID]);

    // Group by location
    const artifactsByLocation = locations.map(loc => {
      const locArtifacts = artifactsResult.rows.filter(a => a.location_arc_id === loc.id);
      return {
        location: loc.name,
        location_id: loc.id,
        count: locArtifacts.length,
        with_prompt_fragments: locArtifacts.filter(a =>
          a.swarmui_prompt_fragment && a.swarmui_prompt_fragment.trim().length > 0
        ).length,
        artifacts: locArtifacts
      };
    });

    console.log(`Found artifacts across ${locations.length} locations`);
    console.log('');

    console.log('Artifact Coverage:');
    artifactsByLocation.forEach(art => {
      const has_fragments = art.with_prompt_fragments === art.count && art.count > 0;
      const status = art.count >= 3 && has_fragments ? '✅' : '⚠️';
      const quality = art.count >= 5 && has_fragments ? 'EXCELLENT' : art.count >= 3 && has_fragments ? 'GOOD' : 'NEEDS MORE';
      console.log(`${status} ${art.location}: ${art.count} artifacts, ${art.with_prompt_fragments} with prompts (${quality})`);

      if (art.artifacts.length > 0) {
        console.log(`   → Artifacts: ${art.artifacts.map(a => a.artifact_name).join(', ')}`);
        if (art.artifacts[0].swarmui_prompt_fragment) {
          const sample = art.artifacts[0].swarmui_prompt_fragment.substring(0, 60);
          console.log(`   → Sample fragment: "${sample}..."`);
        }
      }

      if (art.count < 3) {
        console.log(`   → Recommendation: Add ${3 - art.count} more artifacts with visual details`);
      }
      if (art.with_prompt_fragments < art.count) {
        console.log(`   → Recommendation: Add prompt fragments for ${art.count - art.with_prompt_fragments} artifact(s)`);
      }
    });
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 AUDIT SUMMARY');
    console.log('');

    const locationsPassing = locations.filter(l => l.length >= 100).length;
    const locationsTotal = locations.length;
    const locationScore = locationsTotal > 0 ? (locationsPassing / locationsTotal) * 100 : 0;

    const charactersPassing = characters.filter(c =>
      c.total_locations > 0 && (c.locations_with_overrides / c.total_locations) >= 0.6
    ).length;
    const charactersTotal = characters.length;
    const characterScore = charactersTotal > 0 ? (charactersPassing / charactersTotal) * 100 : 0;

    const artifactsPassing = artifactsByLocation.filter(a =>
      a.count >= 3 && a.with_prompt_fragments === a.count
    ).length;
    const artifactsTotal = artifactsByLocation.length;
    const artifactScore = artifactsTotal > 0 ? (artifactsPassing / artifactsTotal) * 100 : 0;

    console.log(`Locations Ready: ${locationsPassing}/${locationsTotal} (${locationScore.toFixed(0)}%)`);
    console.log(`Characters Ready: ${charactersPassing}/${charactersTotal} (${characterScore.toFixed(0)}%)`);
    console.log(`Artifacts Ready: ${artifactsPassing}/${artifactsTotal} (${artifactScore.toFixed(0)}%)`);
    console.log('');

    const overallScore = (locationScore + characterScore + artifactScore) / 3;
    console.log(`Overall Readiness: ${overallScore.toFixed(0)}%`);
    console.log('');

    // Recommendations
    if (overallScore >= 70) {
      console.log('✅ READY FOR PHASE A');
      console.log('Data quality is sufficient to begin implementation.');
      console.log('');
      console.log('Recommended next step: Start building locationContextService.ts');
    } else if (overallScore >= 50) {
      console.log('⚠️  PROCEED WITH CAUTION');
      console.log('Data quality is marginal. Consider improving before starting.');
      console.log('');
      console.log('Options:');
      console.log('  1. Improve data now (recommended)');
      console.log('  2. Start Phase A with hybrid approach (database + manual fallback)');
    } else {
      console.log('❌ NOT READY FOR PHASE A');
      console.log('Data quality needs improvement before implementation.');
      console.log('');
      console.log('Required actions:');
      if (locationsPassing < locationsTotal) {
        console.log('  - Improve location visual descriptions (need 300-500 chars each)');
      }
      if (charactersTotal === 0 || charactersPassing < charactersTotal) {
        console.log('  - Add character location overrides (need ≥60% coverage per character)');
      }
      if (artifactsPassing < artifactsTotal) {
        console.log('  - Create artifacts with prompt fragments (need 3+ per location)');
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Database: Connected to ${process.env.VITE_DATABASE_URL?.split('@')[1] || 'PostgreSQL'}`);
    console.log('');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    console.error('');
    if (error instanceof Error && error.message.includes('connect')) {
      console.error('This appears to be a database connection issue.');
      console.error('Check your VITE_DATABASE_URL environment variable.');
    } else {
      console.error('This may indicate schema problems or missing tables.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the audit
runAudit()
  .then(() => {
    console.log('✅ Audit complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Audit error:', error);
    process.exit(1);
  });
