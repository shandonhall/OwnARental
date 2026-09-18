import { NextResponse } from 'next/server';
import { ingestExternalLead } from '@/lib/leads/ingest-external-lead';

export const runtime = 'nodejs';

/**
 * Facebook Lead Form → GHL → this URL (Vercel).
 * Header: x-oar-webhook-secret: <GHL_LEADS_WEBHOOK_SECRET>
 */
export async function POST(req: Request) {
  const expected = process.env.GHL_LEADS_WEBHOOK_SECRET?.trim();
  const secret = req.headers.get('x-oar-webhook-secret') ?? undefined;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await ingestExternalLead(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
