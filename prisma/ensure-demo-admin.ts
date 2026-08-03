/**
 * Ensures the pitch/demo Super Admin exists in Supabase Auth + public.users.
 * Prefer: npm run prisma:demo-admin
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

config({ path: resolve(process.cwd(), 'prisma/.env') });

const DEMO_EMAIL = 'admintest@ownarental.co.za';
const DEMO_PASSWORD = 'Password123';
const DEMO_NAME = 'Demo Admin';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!supabaseUrl || !anonKey || !databaseUrl) {
    throw new Error('DATABASE_URL/DIRECT_URL and Supabase URL/anon key are required');
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const db = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  try {
    let userId: string | null = null;

    const signIn = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (!signIn.error && signIn.data.user) {
      userId = signIn.data.user.id;
    } else {
      const signUp = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: { data: { full_name: DEMO_NAME } },
      });
      if (!signUp.error && signUp.data.user?.id) {
        userId = signUp.data.user.id;
      } else {
        const looked = await db.query<{ id: string }>(
          `SELECT id::text AS id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
          [DEMO_EMAIL],
        );
        userId = looked.rows[0]?.id ?? null;
      }
    }

    if (!userId) {
      throw new Error('Could not create or find the demo auth user');
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
       VALUES ($1::uuid, $2, $3, 'SUPER_ADMIN', true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           full_name = EXCLUDED.full_name,
           role = 'SUPER_ADMIN',
           is_active = true,
           updated_at = NOW()`,
      [userId, DEMO_EMAIL, DEMO_NAME],
    );

    const verify = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (verify.error) {
      throw new Error(`Login verify failed: ${verify.error.message}`);
    }

    console.log('Demo admin ready:');
    console.log(`  email    ${DEMO_EMAIL}`);
    console.log(`  password ${DEMO_PASSWORD}`);
    console.log('  role     SUPER_ADMIN');
    console.log(`  id       ${userId}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
