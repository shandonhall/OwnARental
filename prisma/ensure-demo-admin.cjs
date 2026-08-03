const { config } = require('dotenv');
const { resolve } = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

config({ path: resolve(process.cwd(), 'prisma/.env') });

const DEMO_EMAIL = 'admintest@ownarental.co.za';
const DEMO_PASSWORD = 'Password123';
const DEMO_NAME = 'Demo Admin';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  // Use DIRECT_URL for auth.users updates (session mode)
  const db = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  try {
    let userId = null;

    const signIn = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (!signIn.error && signIn.data.user) {
      userId = signIn.data.user.id;
      console.log('signed_in_existing', userId);
    } else {
      console.log('signin_err', signIn.error?.message);
      const signUp = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: { data: { full_name: DEMO_NAME } },
      });
      if (!signUp.error && signUp.data.user?.id) {
        userId = signUp.data.user.id;
        console.log('signed_up', userId);
      } else {
        console.log('signup_err', signUp.error?.message);
        const looked = await db.query(
          'SELECT id::text AS id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1',
          [DEMO_EMAIL],
        );
        userId = looked.rows[0]?.id ?? null;
        console.log('looked_up', userId);
      }
    }

    if (!userId) {
      throw new Error('Could not resolve auth user id');
    }

    await db.query(
      `UPDATE auth.users
       SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [userId],
    );
    console.log('email_confirmed');

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
    console.log('users_row_upserted SUPER_ADMIN');

    const verify = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (verify.error) {
      throw new Error('Login verify failed: ' + verify.error.message);
    }
    console.log('LOGIN_OK');
    console.log('email=' + DEMO_EMAIL);
    console.log('password=' + DEMO_PASSWORD);
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
