-- Own A Rental — lock down public schema for PostgREST (anon / authenticated).
-- The Next.js app uses Supabase Auth only; NestJS uses Prisma + DATABASE_URL (postgres).
-- With RLS enabled and no permissive policies, REST clients cannot read fleet/client data.

-- Application tables (Prisma @@map names)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.telematics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fine_imports ENABLE ROW LEVEL SECURITY;

-- Prisma migrate metadata (only if you use prisma migrate deploy — skip when using db push)
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated';
  END IF;
END $$;

-- Remove broad table grants Supabase may have applied to API roles
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.clients FROM anon, authenticated;
REVOKE ALL ON TABLE public.vehicles FROM anon, authenticated;
REVOKE ALL ON TABLE public.telematics_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.contracts FROM anon, authenticated;
REVOKE ALL ON TABLE public.ledger_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
REVOKE ALL ON TABLE public.notification_reads FROM anon, authenticated;
REVOKE ALL ON TABLE public.fine_imports FROM anon, authenticated;

-- Staff profile row: signed-in users may read only their own row via PostgREST (defence in depth).
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());
GRANT SELECT ON TABLE public.users TO authenticated;

-- No INSERT/UPDATE/DELETE policies for authenticated on business tables — NestJS + Prisma only.
