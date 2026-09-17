import {
  firstAttemptResponseMs,
  firstContactResponseMs,
  medianNumber,
  msToHours,
  responseAnchor,
  responseBasisFor,
} from './lead.response-time';

describe('Phase 2A lead response-time', () => {
  it('prefers sourceCreatedAt as SOURCE basis', () => {
    const source = new Date('2026-09-01T08:00:00Z');
    const created = new Date('2026-09-01T09:00:00Z');
    expect(responseAnchor(source, created)).toEqual({
      at: source,
      basis: 'SOURCE',
    });
    expect(
      responseBasisFor({
        sourceCreatedAt: source,
        createdAt: created,
        firstAttemptAt: null,
        firstContactAt: null,
      }),
    ).toBe('SOURCE');
  });

  it('falls back to createdAt as INGEST basis', () => {
    const created = new Date('2026-09-01T09:00:00Z');
    expect(responseAnchor(null, created)).toEqual({
      at: created,
      basis: 'INGEST',
    });
  });

  it('computes first-attempt and first-contact elapsed ms', () => {
    const row = {
      sourceCreatedAt: new Date('2026-09-01T08:00:00Z'),
      createdAt: new Date('2026-09-01T09:00:00Z'),
      firstAttemptAt: new Date('2026-09-01T08:30:00Z'),
      firstContactAt: new Date('2026-09-01T10:00:00Z'),
    };
    expect(firstAttemptResponseMs(row)).toBe(30 * 60 * 1000);
    expect(firstContactResponseMs(row)).toBe(2 * 60 * 60 * 1000);
    expect(msToHours(3_600_000)).toBe(1);
  });

  it('returns median of even and odd samples', () => {
    expect(medianNumber([])).toBeNull();
    expect(medianNumber([1])).toBe(1);
    expect(medianNumber([1, 3, 2])).toBe(2);
    expect(medianNumber([1, 2, 3, 4])).toBe(2.5);
  });
});
