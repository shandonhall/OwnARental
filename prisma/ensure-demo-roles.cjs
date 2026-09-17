/**
 * Creates local demo staff users for each Phase 1B role (dev/pitch only).
 * Prefer: npm run prisma:demo-roles
 *
 * Does NOT modify production credentials patterns beyond the existing
 * ensure-demo-admin approach. Safe to re-run (upsert by email).
 */
const { config } = require('dotenv');
const { resolve } = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

config({ path: resolve(process.cwd(), 'prisma/.env') });

const DEMO_PASSWORD = 'Password123';

const DEMO_USERS = [
  {
    email: 'admintest@ownarental.co.za',
    fullName: 'Demo Super Admin',
    role: 'SUPER_ADMIN',
  },
  {
    email: 'manager@ownarental.co.za',
    fullName: 'Demo Manager',
    role: 'ADMIN',
  },
  {
    email: 'fleet@ownarental.co.za',
    fullName: 'Demo Fleet',
    role: 'FLEET_MANAGER',
  },
  {
    email: 'finance@ownarental.co.za',
    fullName: 'Demo Finance',
    role: 'FINANCE',
  },
  {
    email: 'sales@ownarental.co.za',
    fullName: 'Demo Sales',
    role: 'SALES',
  },
];

async function ensureUser(supabase, db, demo) {
  let userId = null;

  const signIn = await supabase.auth.signInWithPassword({
    email: demo.email,
    password: DEMO_PASSWORD,
  });

  if (!signIn.error && signIn.data.user) {
    userId = signIn.data.user.id;
  } else {
    const signUp = await supabase.auth.signUp({
      email: demo.email,
      password: DEMO_PASSWORD,
      options: { data: { full_name: demo.fullName } },
    });
    if (!signUp.error && signUp.data.user?.id) {
      userId = signUp.data.user.id;
    } else {
      const looked = await db.query(
        `SELECT id::text AS id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
        [demo.email],
      );
      userId = looked.rows[0]?.id ?? null;
    }
  }

  if (!userId) {
    throw new Error(`Could not create or find ${demo.email}`);
  }

  await db.query(
    `UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
         updated_at = NOW()
     WHERE id = $1::uuid`,
    [userId],
  );

  await db.query(
    `INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
     VALUES ($1::uuid, $2, $3, $4::"Role", true, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE
     SET email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         is_active = true,
         updated_at = NOW()`,
    [userId, demo.email, demo.fullName, demo.role],
  );

  return userId;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!supabaseUrl || !anonKey || !databaseUrl) {
    throw new Error(
      'DATABASE_URL/DIRECT_URL and Supabase URL/anon key are required',
    );
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const db = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  try {
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'Role' AND e.enumlabel = 'SALES'
        ) THEN
          ALTER TYPE "Role" ADD VALUE 'SALES';
        END IF;
      END $$;
    `);
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'Role' AND e.enumlabel = 'FINANCE'
        ) THEN
          ALTER TYPE "Role" ADD VALUE 'FINANCE';
        END IF;
      END $$;
    `);

    console.log('Phase 1B demo roles ready (password for all: Password123)\n');
    for (const demo of DEMO_USERS) {
      const id = await ensureUser(supabase, db, demo);
      console.log(`  ${demo.role.padEnd(14)} ${demo.email}  id=${id}`);
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
