# Own A Rental — Fleet Dashboard

Monorepo for the Own A Rental fleet dashboard. Architecture and phases are defined in `ProjectPlan.txt`.

## Apps

| App | Path | Port | Command |
|-----|------|------|---------|
| NestJS API | `apps/api` | 3001 | `npm run dev:api` |
| Next.js web | `apps/web` | 3000 | `npm run dev:web` |

## Database

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

Env vars live in `prisma/.env` (`DATABASE_URL`, `DIRECT_URL`, Supabase URL/anon key).

## Auth setup

1. Supabase Dashboard → Authentication → Users → create staff (email/password).
2. Sign in at `/login` (creates a `users` row as `FLEET_MANAGER` / User).
3. Promote to Admin in SQL when needed:

```sql
update users set role = 'ADMIN' where email = 'you@ownarental.co.za';
-- SUPER_ADMIN for immobilization later
```

| Role | Label | Rights |
|------|-------|--------|
| `FLEET_MANAGER` | User | View/create/edit clients & vehicles |
| `ADMIN` | Admin | + deactivate clients / retire vehicles |
| `SUPER_ADMIN` | Super Admin | + remote immobilize / mobilize |

## Phase 1 checklist (Foundation)

- [x] Supabase PostgreSQL + Prisma schema synced
- [x] Login screen (Supabase Auth) + Admin / User RBAC
- [x] Clients API CRUD (profiles + FICA Storage URL fields)
- [x] Vehicles API CRUD (fleet + CarTrack/warranty fields)
- [x] Master Fleet table with status filters + search
- [x] Client list/search + profile pages
- [x] Dashboard create/edit flows for clients and vehicles
- [x] Basic routing (`/fleet`, `/clients`, detail + edit routes)
- [x] Demo seed data

## Phase 1 routes

**API**

- `GET /api/health` (public)
- `GET /api/auth/me` (Bearer JWT)
- `GET|POST|PATCH /api/clients`, `DELETE` Admin+
- `GET|POST|PATCH /api/vehicles`, `DELETE` Admin+

**Web**

- `/login`
- `/fleet`, `/fleet/new`, `/fleet/[id]`, `/fleet/[id]/edit`
- `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`

## Phase 2 checklist (Finances)

- [x] Contracts API (create/list/detail/update) with plan types
- [x] Ledger entries (payments, fees, maintenance) linked to contracts
- [x] Outstanding balance + expected total recalculation
- [x] Term progress (% complete, days remaining, final 90 days)
- [x] Profitability tracker (purchase + costs vs rental income)
- [x] Contracts + Profitability dashboard pages

## Phase 2 routes

**API**

- `GET|POST /api/contracts`, `GET|PATCH|DELETE /api/contracts/:id`
- `GET /api/contracts/profitability`
- `POST|PATCH|DELETE /api/contracts/:id/ledger[/:entryId]`

**Web**

- `/contracts`, `/contracts/new`, `/contracts/[id]`
- `/profitability`

## Phase 3 checklist (Telematics)

- [x] CarTrack provider handshake (live when `CARTRACK_API_URL` + `CARTRACK_API_KEY` set; otherwise mock)
- [x] Fleet sync (odometer, GPS, driver score) + telematics event log
- [x] Live asset map (`/map`) with status-colored pins
- [x] Mileage vs monthly limit (projected from average daily km)
- [x] Predictive maintenance (next service km + date)
- [x] Super Admin immobilize / mobilize with confirmation + audit event

## Phase 3 routes

**API**

- `GET /api/telematics/status`
- `GET /api/telematics/map`
- `POST /api/telematics/sync`
- `POST /api/telematics/vehicles/:id/sync`
- `GET /api/telematics/vehicles/:id`
- `POST /api/telematics/vehicles/:id/immobilize` (`SUPER_ADMIN`, body `{ immobilize, confirm: true }`)

**Web**

- `/` (Today overview — default after login)
- `/map`
- `/website` (modern marketing site preview for demos)
- Vehicle detail: Sync CarTrack, mileage/service prediction, Super Admin immobilize

**Env (optional live CarTrack)**

```bash
CARTRACK_API_URL=https://your-cartrack-base/v1
CARTRACK_API_KEY=...
```

Add to `prisma/.env` (loaded by the Nest API). Leave unset to use the Randburg-area mock provider.
