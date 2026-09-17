const { config } = require('dotenv');
const { resolve } = require('path');
const fs = require('fs');
const pg = require('pg');

config({ path: resolve(process.cwd(), 'prisma/.env') });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL / DIRECT_URL required');
  process.exit(1);
}

const sql = fs.readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260909120000_phase1a_contract_schedule_a.sql',
  ),
  'utf8',
);

async function main() {
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(sql);
  const cols = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contracts'
      and column_name in (
        'agreement_number',
        'cip_amount',
        'vehicle_rental_amount',
        'annual_km_limit',
        'rental_due_day',
        'vehicle_kept_address'
      )
    order by 1
  `);
  console.log(
    'Phase 1A columns present:',
    cols.rows.map((row) => row.column_name).join(', '),
  );
  await client.end();
  console.log('Migration applied (additive only).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
