import { LICENCE_URGENCY, type LicenceUrgency } from './licence.constants';

const DAY_MS = 86_400_000;

/** Calendar "today" in Africa/Johannesburg as a UTC date-only instant. */
export function johannesburgToday(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Normalize a @db.Date / ISO date string to UTC midnight date-only. */
export function toUtcDateOnly(value: Date | string): Date {
  if (typeof value === 'string') {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

/** Whole calendar days from Johannesburg today until expiry (negative if past). */
export function calendarDaysRemaining(
  expiryDate: Date | string,
  now: Date = new Date(),
): number {
  const today = johannesburgToday(now);
  const expiry = toUtcDateOnly(expiryDate);
  return Math.round((expiry.getTime() - today.getTime()) / DAY_MS);
}

export function licenceUrgencyFromDays(daysRemaining: number): LicenceUrgency {
  if (daysRemaining > LICENCE_URGENCY.WARN_DAYS) return 'OK';
  if (daysRemaining > LICENCE_URGENCY.ACTION_DAYS) return 'WARN_60';
  if (daysRemaining >= 0) return 'ACTION_30';
  return 'EXPIRED';
}

export function licenceUrgencyForExpiry(
  expiryDate: Date | string,
  now: Date = new Date(),
): { daysRemaining: number; urgency: LicenceUrgency } {
  const daysRemaining = calendarDaysRemaining(expiryDate, now);
  return {
    daysRemaining,
    urgency: licenceUrgencyFromDays(daysRemaining),
  };
}
