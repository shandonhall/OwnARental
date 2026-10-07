import { NextResponse } from 'next/server';
import { LeadSource } from '@/generated/prisma/enums';
import { ingestExternalLead } from '@/lib/leads/ingest-external-lead';
import { getVehicleBySlug, vehicleTitle } from '@/lib/site/vehicles';

export const runtime = 'nodejs';

const MIN_FILL_MS = 3_000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 5;

/** Best-effort per-instance throttle; serverless instances do not share it. */
const recentByIp = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recentByIp.get(ip) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  hits.push(now);
  recentByIp.set(ip, hits);
  return hits.length > RATE_MAX;
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Public website application → Lead (source WEBSITE) on the staff Leads board.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Bots fill the hidden field or submit instantly; accept silently without storing.
  const elapsed = Number(body.elapsedMs);
  if (text(body.company, 200) || !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many applications. Please try again later or WhatsApp us.' },
      { status: 429 },
    );
  }

  const firstName = text(body.firstName, 80);
  const lastName = text(body.lastName, 80);
  const cellphone = text(body.cellphone, 30);
  const email = text(body.email, 160);
  const area = text(body.area, 120);
  const message = text(body.message, 1000);
  const licence = body.hasValidDriversLicence;
  const errors: Record<string, string> = {};

  if (!firstName) errors.firstName = 'Please enter your first name';
  if (!lastName) errors.lastName = 'Please enter your surname';
  const digits = cellphone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) errors.cellphone = 'Please enter a valid cellphone number';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address';
  if (body.consent !== true) errors.consent = 'Please confirm so we can contact you';
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: 'Please check the highlighted fields', errors }, { status: 400 });
  }

  const vehicleSlug = text(body.vehicle, 120);
  const vehicle = vehicleSlug ? await getVehicleBySlug(vehicleSlug) : null;
  const vehiclePreference = vehicle
    ? `${vehicleTitle(vehicle)}${vehicle.variant ? ` ${vehicle.variant}` : ''} (website: ${vehicle.slug})`
    : null;

  try {
    await ingestExternalLead(
      {
        firstName,
        lastName,
        cellphone,
        email: email || null,
        area: area || null,
        notes: message || null,
        platform: 'website',
        sourceDetail: 'Website application form',
        utm_source: text(body.utmSource, 120) || null,
        utm_campaign: text(body.utmCampaign, 120) || null,
      },
      {
        source: LeadSource.WEBSITE,
        historyReason: 'Website application',
        vehiclePreference,
        hasValidDriversLicence: typeof licence === 'boolean' ? licence : null,
      },
    );
  } catch (error) {
    console.error('Website application failed', error);
    return NextResponse.json(
      { error: 'We could not send your application. Please try again or WhatsApp us.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
