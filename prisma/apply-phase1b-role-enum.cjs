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
        'supabase/migrations/20260909140000_phase1b_role_enum.sql',
      ),
      'utf8',
    );
    await db.query(sql);
    const r = await db.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'Role'
      ORDER BY e.enumsortorder
    `);
    console.log(
      'Role enum values:',
      r.rows.map((row) => row.enumlabel).join(', '),
    );
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
