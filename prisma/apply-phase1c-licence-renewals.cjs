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
        'supabase/migrations/20260909160000_phase1c_licence_renewals.sql',
      ),
      'utf8',
    );
    await db.query(sql);

    const statusEnum = await db.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'LicenceRenewalStatus'
      ORDER BY e.enumsortorder
    `);
    const kindEnum = await db.query(`
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'NotificationKind' AND e.enumlabel = 'LICENCE_DUE'
    `);
    const table = await db.query(`
      SELECT to_regclass('public.licence_renewals') AS rel
    `);
    const partialIdx = await db.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'licence_renewals_one_open_per_vehicle_idx'
    `);

    console.log(
      'LicenceRenewalStatus:',
      statusEnum.rows.map((row) => row.enumlabel).join(', '),
    );
    console.log(
      'NotificationKind LICENCE_DUE:',
      kindEnum.rowCount > 0 ? 'present' : 'MISSING',
    );
    console.log(
      'licence_renewals table:',
      table.rows[0]?.rel ? 'present' : 'MISSING',
    );
    console.log(
      'one-open partial unique index:',
      partialIdx.rowCount > 0 ? 'present' : 'MISSING',
    );
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
