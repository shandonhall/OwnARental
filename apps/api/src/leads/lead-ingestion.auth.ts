import { timingSafeEqual } from 'node:crypto';

/** Timing-safe secret compare for LEAD_INGESTION_SECRET Bearer tokens. */
export function ingestionSecretsMatch(
  provided: string,
  expected: string,
): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}
