import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Convert Python-style connection string to pg format
let dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
dbUrl = dbUrl.replace('postgresql+asyncpg://', 'postgresql://');

const pool = new Pool({ connectionString: dbUrl });
const STORY_ID = '59f64b1e-726a-439d-a6bc-0dfefcababdb';

async function listAllCharacters() {
  try {
    console.log('📊 ALL Characters in Database:\n');

    // Get all characters (first check what columns exist)
    const schema = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'characters'
      ORDER BY ordinal_position
    `);

    console.log('Characters table columns:', schema.rows.map(r => r.column_name).join(', '));
    console.log('');

    const chars = await pool.query(`
      SELECT id, name, lora_trigger, created_at
      FROM characters
      WHERE story_id = $1
      ORDER BY name
    `, [STORY_ID]);

    console.log(`Found ${chars.rows.length} total characters\n`);

    for (const char of chars.rows) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Character: ${char.name}`);
      console.log(`LoRA Trigger: ${char.lora_trigger || '❌ NONE'}`);

      // Check location overrides
      const overrides = await pool.query(`
        SELECT
          loc.name as location_name,
          LENGTH(COALESCE(clc.swarmui_prompt_override, '')) as override_length,
          clc.temporal_context
        FROM character_location_contexts clc
        JOIN location_arcs loc ON clc.location_arc_id = loc.id
        WHERE clc.character_id = $1
        ORDER BY loc.name
      `, [char.id]);

      if (overrides.rows.length === 0) {
        console.log(`Location Overrides: ❌ NONE (0 locations)`);
        console.log(`Status: Trigger exists but no location-specific appearance data`);
      } else {
        console.log(`Location Overrides: ${overrides.rows.length} locations`);
        let withData = 0;
        for (const ov of overrides.rows) {
          const status = ov.override_length > 0 ? '✅' : '❌';
          if (ov.override_length > 0) withData++;
          console.log(`  ${status} ${ov.location_name}: ${ov.override_length} chars`);
        }
        const coverage = (withData / overrides.rows.length) * 100;
        console.log(`Coverage: ${withData}/${overrides.rows.length} (${coverage.toFixed(0)}%)`);
      }
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('\n📋 SUMMARY:\n');

    const withTriggers = chars.rows.filter(c => c.lora_trigger && c.lora_trigger.length > 0);
    const withoutTriggers = chars.rows.filter(c => !c.lora_trigger || c.lora_trigger.length === 0);

    console.log(`Characters with triggers: ${withTriggers.length}/${chars.rows.length}`);
    console.log(`Characters without triggers: ${withoutTriggers.length}/${chars.rows.length}`);

    if (withoutTriggers.length > 0) {
      console.log(`\nCharacters needing triggers:`);
      withoutTriggers.forEach(c => console.log(`  - ${c.name}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

listAllCharacters();
