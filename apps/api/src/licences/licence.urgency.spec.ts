import {
  calendarDaysRemaining,
  johannesburgToday,
  licenceUrgencyForExpiry,
  licenceUrgencyFromDays,
  toUtcDateOnly,
} from './licence.urgency';

describe('Phase 1C licence urgency', () => {
  const noonJhb = (isoDate: string) => {
    // Construct a Date that is midday in Johannesburg on the given calendar day.
    return new Date(`${isoDate}T12:00:00+02:00`);
  };

  it('uses Africa/Johannesburg calendar today', () => {
    const today = johannesburgToday(noonJhb('2026-09-09'));
    expect(today.toISOString().slice(0, 10)).toBe('2026-09-09');
  });

  it('normalizes date-only values', () => {
    expect(toUtcDateOnly('2026-09-30').toISOString().slice(0, 10)).toBe(
      '2026-09-30',
    );
  });

  it('applies exact 60/30/today/yesterday boundaries', () => {
    const now = noonJhb('2026-09-09');
    expect(calendarDaysRemaining('2026-11-09', now)).toBe(61);
    expect(licenceUrgencyFromDays(61)).toBe('OK');
    expect(licenceUrgencyForExpiry('2026-11-08', now).urgency).toBe('WARN_60');
    expect(licenceUrgencyForExpiry('2026-11-08', now).daysRemaining).toBe(60);
    expect(licenceUrgencyForExpiry('2026-10-10', now).urgency).toBe('WARN_60');
    expect(licenceUrgencyForExpiry('2026-10-10', now).daysRemaining).toBe(31);
    expect(licenceUrgencyForExpiry('2026-10-09', now).urgency).toBe(
      'ACTION_30',
    );
    expect(licenceUrgencyForExpiry('2026-10-09', now).daysRemaining).toBe(30);
    expect(licenceUrgencyForExpiry('2026-09-09', now).urgency).toBe(
      'ACTION_30',
    );
    expect(licenceUrgencyForExpiry('2026-09-09', now).daysRemaining).toBe(0);
    expect(licenceUrgencyForExpiry('2026-09-08', now).urgency).toBe('EXPIRED');
    expect(licenceUrgencyForExpiry('2026-09-08', now).daysRemaining).toBe(-1);
  });
});
