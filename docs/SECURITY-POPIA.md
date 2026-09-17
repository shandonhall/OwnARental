# Security & POPIA compliance

Own A Rental processes **personal information** (SA ID numbers, addresses, FICA documents, telematics, payment behaviour). This document is the operational checklist for keeping the stack secure and aligned with POPIA principles (lawful processing, purpose limitation, security safeguards, access control).

## Architecture (defence in depth)

| Layer | Responsibility |
|--------|----------------|
| **Supabase Auth** | Staff login only; JWT validated on every API request |
| **NestJS API** | RBAC, validation (Zod), business rules; sole path to Postgres for app data |
| **Prisma + `DATABASE_URL`** | Server-side DB access (not exposed to browsers) |
| **Supabase PostgREST** | Must **not** expose `public` tables — RLS + revoke grants |
| **Supabase Storage** | FICA files in **private** buckets; access via API + service role |

The Next.js app uses the **anon** key only for Auth session cookies, not for querying tables.

## Supabase Dashboard (required)

Run both SQL migrations in **SQL Editor** (order matters):

1. `supabase/migrations/20260805100000_enable_rls_public_tables.sql`
2. `supabase/migrations/20260805110000_fica_storage_private.sql`

Then configure:

- **Authentication → Providers**: disable public sign-up if not needed; use **invite-only** or admin-created users.
- **Authentication → URL configuration**: restrict redirect URLs to your real dashboard host(s).
- **Database → Security Advisor**: resolve remaining findings (RLS, extensions, etc.).
- **Project Settings → API**: never expose `service_role` in the web app or client bundles.

### Verify RLS

```http
GET https://<project>.supabase.co/rest/v1/clients?select=id
apikey: <anon-key>
Authorization: Bearer <anon-key>
```

Expect **empty data** or **permission denied**, not client rows.

## API environment (`prisma/.env` — server only)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` / `DIRECT_URL` | Postgres (pooler + migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth JWT verification |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth JWT verification |
| `SUPABASE_SERVICE_ROLE_KEY` | (When implemented) FICA upload/signed URLs — **never** in web |
| `WEB_ORIGIN` | Production dashboard origin for CORS (e.g. `https://dashboard.ownarental.co.za`) |
| `STAFF_AUTO_PROVISION` | `false` in production (recommended); `true` only if Supabase sign-up is locked down |
| `NODE_ENV` | `production` in live environments |

## Web environment (`apps/web/.env.local`)

Only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (e.g. `https://api.ownarental.co.za/api`)

## Staff provisioning (production)

With `STAFF_AUTO_PROVISION=false` (default when `NODE_ENV=production`):

1. Create the user in **Supabase Auth** (invite or admin create).
2. Insert or update their row in `public.users` (role + `is_active`):

```sql
INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
       'FLEET_MANAGER', true, NOW(), NOW()
FROM auth.users
WHERE lower(email) = lower('staff@ownarental.co.za')
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role, is_active = true, updated_at = NOW();
```

Promote to Admin / Super Admin only via SQL (or controlled internal tooling):

```sql
UPDATE public.users SET role = 'ADMIN' WHERE email = 'you@ownarental.co.za';
-- SUPER_ADMIN for remote immobilization
```

Demo pitch accounts (local only): `npm run prisma:demo-admin` or `npm run prisma:demo-roles` (Super Admin, Manager, Fleet, Finance, Sales). Do not use demo passwords in production.

## RBAC (enforced in API)

Roles (stored enum → display): `SUPER_ADMIN` (Super Admin), `ADMIN` (Manager / Admin), `FLEET_MANAGER` (Fleet / Licensing), `SALES` (Sales), `FINANCE` (Finance).

Domain capabilities live in `apps/api/src/auth/permissions.ts` (`ROLE_PERMISSIONS` + `@RequirePermissions`). UI mirrors the same matrix in `apps/web/src/lib/permissions.ts`. Hiding a nav link is not authorisation — Nest `PermissionsGuard` is authoritative.

| Capability (examples) | Typical roles |
|--------|--------|
| Dashboard / clients / fleet read | SUPER_ADMIN, ADMIN, FLEET_MANAGER, FINANCE, SALES |
| Contracts + Schedule A finance | SUPER_ADMIN, ADMIN, FINANCE (Fleet: contract ops summary without commercial breakdown) |
| Profitability / ledger write | SUPER_ADMIN, ADMIN, FINANCE |
| Telematics sync / live map | SUPER_ADMIN, ADMIN, FLEET_MANAGER |
| Deactivate client / retire vehicle | SUPER_ADMIN, ADMIN (`CLIENTS_DELETE` / `FLEET_DELETE`) |
| Remote immobilize / mobilize | `SUPER_ADMIN` only (`TELEMATICS_IMMOBILIZE`) |
| Automation manage (GHL run) | SUPER_ADMIN, ADMIN |
| User management | Reserved (`USERS_MANAGE` → SUPER_ADMIN; no staff admin UI yet) |

Inactive users (`is_active = false`) cannot obtain API access.

## POPIA-oriented data handling

- **FICA**: store **URLs** in Postgres, files in **private** Storage; no document binaries in the database.
- **Purpose limitation**: client PII used for rent-to-own operations, collections, and legal compliance — not exported to marketing without consent.
- **Minimisation**: notes fields should not duplicate full ID numbers unnecessarily; structured address fields preferred.
- **Retention**: define retention for inactive clients and written-off vehicles (policy + periodic review); implement archival/deletion workflows before go-live.
- **Telematics**: location and behaviour data — disclose in client contracts; restrict access to authorised staff.
- **Third parties**: CarTrack, GHL, fines providers — ensure contracts and POPIA operator agreements where required.
- **Breach response**: document internal escalation (who to notify, ITC/regulator timelines under POPIA).

## Application hardening (in repo)

- Global `AuthGuard` + `RolesGuard` + `PermissionsGuard` on Nest controllers
- Zod validation on mutating endpoints
- Helmet on API; security headers on Next.js
- CORS limited to `WEB_ORIGIN` (+ localhost in non-production)
- No automatic `SUPER_ADMIN` promotion by email on login (roles set via DB / demo script)

## After schema changes

When `prisma db push` adds tables:

```sql
ALTER TABLE public.<new_table> ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.<new_table> FROM anon, authenticated;
```

Re-run Security Advisor.

## Ongoing

- [ ] Production `WEB_ORIGIN` and `STAFF_AUTO_PROVISION=false`
- [ ] Supabase sign-up disabled or invite-only
- [ ] RLS migrations applied and verified
- [ ] FICA bucket private; uploads via API with service role
- [ ] Secrets only in server env / secret manager (not git)
- [ ] Dependency and OS patching cadence
- [ ] Access reviews for `ADMIN` / `SUPER_ADMIN` quarterly
- [ ] POPIA retention & deletion policy signed off
