const { config } = require('dotenv');
const { resolve } = require('node:path');
const { Client } = require('pg');

config({ path: resolve(process.cwd(), 'prisma/.env') });

/** Reset corrupted demo averages after mock odometer jumps. */
const FIXES = [
  { registration: 'CA123456', avg: 45 },
  { registration: 'GP78BCGP', avg: 55 },
  { registration: 'FJ12KLM', avg: 95 },
  { registration: 'GP45XYZ', avg: 38 },
  { registration: 'GP90QRS', avg: 20 },
  { registration: 'NJ33TUV', avg: 40 },
  { registration: 'GP11AAA', avg: 35 },
  { registration: 'GP55EOT', avg: 42 },
];

async function main() {
  const db = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  try {
    for (const row of FIXES) {
      const result = await db.query(
        `UPDATE vehicles
         SET average_daily_km = $1,
             updated_at = NOW()
         WHERE registration = $2`,
        [row.avg, row.registration],
      );
      console.log(row.registration, '→', row.avg, 'km/day', `(${result.rowCount})`);
    }
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
