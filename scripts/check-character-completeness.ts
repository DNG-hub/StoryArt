import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL });

async function checkCharacters() {
  const chars = await pool.query(`
    SELECT id, name, base_trigger
    FROM characters
    WHERE story_id = '59f64b1e-726a-439d-a6bc-0dfefcababdb'
    ORDER BY name
  `);

  console.log('📊 Characters in Database:\n');

  for (const char of chars.rows) {
    console.log(`Character: ${char.name}`);
    console.log(`  Base Trigger: ${char.base_trigger || 'NONE'}`);

    const overrides = await pool.query(`
      SELECT
        loc.name as location_name,
        LENGTH(clc.swarmui_prompt_override) as override_length
      FROM character_location_contexts clc
      JOIN location_arcs loc ON clc.location_arc_id = loc.id
      WHERE clc.character_id = $1
      ORDER BY loc.name
    `, [char.id]);

    console.log(`  Location Overrides: ${overrides.rows.length}`);
    for (const ov of overrides.rows) {
      const status = ov.override_length > 0 ? '✅' : '❌';
      console.log(`    ${status} ${ov.location_name}: ${ov.override_length} chars`);
    }
    console.log('');
  }

  await pool.end();
}

checkCharacters().catch(console.error);
