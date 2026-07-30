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
- [x] Location / mileage / driver-score / rule-breach events on each sync
- [x] Driver score breakdown (speeding, braking, acceleration, idling)
- [x] Live asset map (`/map`) with status-colored pins, provider badge, sync errors, auto-refresh
- [x] Mileage vs monthly limit (projected from average daily km)
- [x] Predictive maintenance (next service km + date) + dashboard / map service-due alerts
- [x] Scheduled fleet sync (inline every 5 min by default; BullMQ when `REDIS_URL` is set)
- [x] Super Admin immobilize / mobilize with confirmation + audit event

## Phase 3 routes

**API**

- `GET /api/telematics/status` (provider, auto-sync, last sync, errors, queue mode)
- `GET /api/telematics/map`
- `POST /api/telematics/sync`
- `POST /api/telematics/vehicles/:id/sync`
- `GET /api/telematics/vehicles/:id`
- `POST /api/telematics/vehicles/:id/immobilize` (`SUPER_ADMIN`, body `{ immobilize, confirm: true }`)

**Web**

- `/` (Today overview — default after login; includes service-due + rule-breach alerts)
- `/map`
- `/website` (modern marketing site preview for demos)
  - `/website/monthly`, `/website/rent-to-own`, `/website/deals`
  - Drag/tap “Keys as soon as today” strip → deal card (`#deal-{id}`)
- Vehicle detail: Sync CarTrack, score breakdown, rule breaches, Super Admin immobilize

**Env (optional live CarTrack + queue)**

```bash
CARTRACK_API_URL=https://your-cartrack-base/v1
CARTRACK_API_KEY=...
# Optional — enables BullMQ worker for fleet sync jobs
REDIS_URL=redis://localhost:6379
# Optional — defaults shown
TELEMATICS_AUTO_SYNC=true
TELEMATICS_SYNC_INTERVAL_MS=300000
```

Add to `prisma/.env` (loaded by the Nest API). Leave CarTrack unset to use the Randburg-area mock provider. Without `REDIS_URL`, scheduled sync runs inline (still production-usable for demos).

## Phase 4 checklist (Dashboard UI)

- [x] KPI banner — Active Fleet, Payment Alerts, Service Due, Contracts Nearing Completion (+ utilization)
- [x] Global search — `GET /api/search?q=` across clients, vehicles (reg/VIN), contracts / ID numbers
- [x] Search bar in dashboard chrome (debounced results dropdown)
- [x] Brand CSS alignment — shared `--oar-*` tokens, navy `#1a2832`, mist background, DM Sans + Barlow Condensed
- [x] Notification center — persisted alerts with per-user read state, shell bell + `/notifications` page
- [x] Master Fleet workspace already available at `/fleet` (status filters)

## Phase 4 routes

**API**

- `GET /api/search?q=&limit=`
- `GET /api/notifications?includeRead=&limit=`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/dashboard/overview` (now includes `kpi` + extended `summary`)

**Web**

- Header global search + Alerts bell on all dashboard pages
- `/notifications`
- `/` Today KPI banner

## Phase 5 checklist (Automation / GHL)

- [x] GoHighLevel provider handshake (live when `GHL_API_KEY` + `GHL_LOCATION_ID` set; otherwise mock)
- [x] Bi-directional CRM contact sync on client create/update (+ manual Sync to GHL)
- [x] Workflow webhooks: missed/late payments, rule breaches, speeding, geofence, low driver score
- [x] Immobilization trigger path: `IMMOBILIZE_RECOMMENDED` (geofence + arrears) + `IMMOBILIZED`/`MOBILIZED` after Super Admin action
- [x] End-of-term opportunity push (final 90 days → `ghlOpportunityId` + `END_OF_TERM` webhook)
- [x] Scheduled payment + end-of-term scan (`GHL_AUTO_COMMS`, default every 15 min)
- [x] Automation status UI at `/automation`

## Phase 5 routes

**API**

- `GET /api/ghl/status`
- `POST /api/ghl/comms/run` (`ADMIN` / `SUPER_ADMIN`)
- `POST /api/clients/:id/sync-ghl`

**Web**

- `/automation`
- Client detail: Sync to GHL + contact id

**Env (optional live GHL)**

```bash
GHL_API_KEY=...
GHL_LOCATION_ID=...
GHL_API_URL=https://services.leadconnectorhq.com
GHL_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/...
# Optional per-event overrides
GHL_WEBHOOK_PAYMENT_REMINDER=...
GHL_WEBHOOK_RULE_BREACH=...
GHL_WEBHOOK_END_OF_TERM=...
GHL_PIPELINE_ID=...
GHL_PIPELINE_STAGE_ID=...
GHL_AUTO_COMMS=true
GHL_COMMS_INTERVAL_MS=900000
```

Leave unset to use the mock provider (logs workflow payloads; still writes mock `ghlContactId` / opportunity ids for demos).

## Backups

| Location | What |
|----------|------|
| [GitHub `shandonhall/OwnARental`](https://github.com/shandonhall/OwnARental) | Code on `main` (env files ignored) |
| USB `H:\OwnARental\` | `SETUP-ON-NEW-MACHINE.txt`, `secrets\`, `project-full\` |

See `SETUP-ON-NEW-MACHINE.txt` for clone + env restore steps on a new machine. Never commit `secrets\` or `.env*` files.
