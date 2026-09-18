# Deploy Own A Rental — Facebook leads on Vercel (no Railway)

For now we only host what you need for **Facebook → GHL → leads board**.

| Piece | Where |
|-------|--------|
| Dashboard + lead webhook | **Vercel** |
| Database / Auth | **Supabase** (already) |
| Full Nest ops API | Local for now |

---

## 1) Deploy to Vercel (npm workspaces monorepo)

Next.js lives in `apps/web`. Do **not** copy `.next` to the repo root.

### Project settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `apps/web` |
| Framework | Next.js (auto) |
| Install Command | from `apps/web/vercel.json`: `cd ../.. && npm install` |
| Build Command | from `apps/web/vercel.json`: `cd ../.. && npm run prisma:generate && npm run build -w web` |
| Output Directory | leave empty (Next.js default) |

`apps/web/vercel.json` already sets install/build. Confirm Root Directory is `apps/web` in the Vercel dashboard (Settings → General).

### Environment variables

Set these in the Vercel project (Production + Preview as needed):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | Leave as your local API for now, or omit until API is hosted |
| `DATABASE_URL` | Same Supabase Postgres URL as `prisma/.env` (needed for webhook inserts) |
| `DIRECT_URL` | Direct (non-pooler) Postgres URL — preferred for Prisma CLI; optional for generate if `DATABASE_URL` is set |
| `GHL_LEADS_WEBHOOK_SECRET` | Long random string you invent |

Build runs `prisma generate` because clients under `apps/*/src/generated` are gitignored.

4. Deploy (push to `main` or Redeploy in the dashboard).

Webhook URL (after deploy):

```text
POST https://<your-app>.vercel.app/api/webhooks/ghl/leads
Header: x-oar-webhook-secret: <GHL_LEADS_WEBHOOK_SECRET>
```

---

## 2) Connect GoHighLevel / Facebook

1. In GHL, workflow trigger: **Facebook Lead Form** (or form submitted).
2. Action: **Webhook** → the Vercel URL above.
3. Custom header: `x-oar-webhook-secret` = same secret as Vercel env.
4. JSON body must include a phone + name. Example:

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

Leads land on `/leads` with source `META_LEAD_FORM`. Duplicates with the same `contact_id` are ignored.

**Note:** Demo seeded leads show an amber **Demo** badge. Live Meta leads will not.

---

## 3) Local test

```bash
curl -X POST http://localhost:3000/api/webhooks/ghl/leads ^
  -H "Content-Type: application/json" ^
  -H "x-oar-webhook-secret: YOUR_SECRET" ^
  -d "{\"first_name\":\"Test\",\"last_name\":\"Lead\",\"phone\":\"0820000000\",\"contact_id\":\"test-1\"}"
```

(Requires `DATABASE_URL` and `GHL_LEADS_WEBHOOK_SECRET` in `apps/web/.env.local`.)

---

## Later (optional)

When you want the **full** hosted dashboard (fleet, map, Nest APIs), add an always-on API host (Railway/Render/Fly) and point `NEXT_PUBLIC_API_URL` at it. Not required for Facebook lead ingest.
