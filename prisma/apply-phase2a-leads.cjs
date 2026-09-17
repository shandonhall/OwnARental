const { config } = require('dotenv');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const { Client } = require('pg');

config({ path: resolve(process.cwd(), 'prisma/.env') });

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL or DIRECT_URL required');

  const db = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  try {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        'supabase/migrations/20260909180000_phase2a_leads.sql',
      ),
      'utf8',
    );
    await db.query(sql);

    const stages = await db.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'LeadStage'
      ORDER BY e.enumsortorder
    `);
    const table = await db.query(`
      SELECT to_regclass('public.leads') AS rel
    `);
    const idx = await db.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'leads_source_external_lead_id_uidx'
    `);
    console.log(
      'LeadStage:',
      stages.rows.map((r) => r.enumlabel).join(', '),
    );
    console.log('leads table:', table.rows[0]?.rel ? 'present' : 'MISSING');
    console.log(
      'externalLead idempotency index:',
      idx.rowCount > 0 ? 'present' : 'MISSING',
    );
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
