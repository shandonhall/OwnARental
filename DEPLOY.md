# Deploy Own A Rental (leads + dashboard)

This stack is a **monorepo**: Next.js web + NestJS API + Supabase Postgres.
Facebook leads via GoHighLevel need a **public API URL**, so hosting is split.

## Recommended setup

| Piece | Where | Why |
|-------|--------|-----|
| Dashboard (Next) | **Vercel** | Static/SSR front-end |
| API (Nest) | **Railway / Render / Fly** | Always-on Node (schedulers, webhooks, Prisma) |
| Database / Auth | **Supabase** (already) | Postgres + Auth |

> Nest does **not** belong on Vercel alone — telematics/GHL/fines schedulers need a long-running process.

---

## 1) API host (do this first)

Deploy `apps/api` (or the whole monorepo with start command `npm run start:prod -w api` after build).

**Env on the API host** (from `prisma/.env` + GHL secrets):

- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (token validation)
- `WEB_ORIGIN` = your Vercel URL, e.g. `https://ownarental.vercel.app`
- `PORT` = provided by the host
- GHL outbound (optional): `GHL_API_KEY`, `GHL_LOCATION_ID`, …
- **Inbound Facebook leads:** `GHL_LEADS_WEBHOOK_SECRET` = a long random string

Health check: `GET https://<api-host>/api/health`

### GHL → Own A Rental leads webhook

1. In GHL, create a workflow triggered by **Facebook Lead Form** (or inbound webhook from Meta).
2. Add action **Webhook** →  
   `POST https://<api-host>/api/webhooks/ghl/leads`
3. Header: `x-oar-webhook-secret: <same as GHL_LEADS_WEBHOOK_SECRET>`
4. Body: JSON including at least phone + name. Supported keys (flexible):

```json
{
  "first_name": "Thabo",
  "last_name": "Mokoena",
  "phone": "0821112233",
  "email": "thabo@example.com",
  "contact_id": "ghl-contact-123",
  "campaign_name": "Keys as soon as today",
  "form_name": "Lead form A",
  "platform": "facebook"
}
```

Idempotent on `contact_id` / `external_lead_id` / `id` when present.

---

## 2) Vercel (web)

1. Import the GitHub repo `shandonhall/OwnARental` into Vercel.
2. Root directory: repo root (uses `vercel.json`).
3. Env on Vercel:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | `https://<api-host>/api` |

4. Deploy. Login uses Supabase Auth against the same project as local.

---

## 3) Demo leads

Seeded leads use `sourceDetail: "DEMO"` and notes starting with `[DEMO]`.  
The board/detail UI shows an amber **Demo** badge so they are not confused with live Meta leads.

Reseed locally: `npm run prisma:seed` (wipes and recreates demo fleet + demo leads).

---

## Local test of the webhook

```bash
curl -X POST http://localhost:3001/api/webhooks/ghl/leads ^
  -H "Content-Type: application/json" ^
  -H "x-oar-webhook-secret: YOUR_SECRET" ^
  -d "{\"first_name\":\"Test\",\"last_name\":\"Lead\",\"phone\":\"0820000000\",\"contact_id\":\"test-1\"}"
```
