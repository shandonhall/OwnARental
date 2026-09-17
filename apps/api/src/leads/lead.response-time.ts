export type ResponseBasis = 'SOURCE' | 'INGEST';

export type ResponseAnchor = {
  at: Date;
  basis: ResponseBasis;
};

/** Anchor for response-time: sourceCreatedAt when present, else createdAt. */
export function responseAnchor(
  sourceCreatedAt: Date | null | undefined,
  createdAt: Date,
): ResponseAnchor {
  if (sourceCreatedAt) {
    return { at: sourceCreatedAt, basis: 'SOURCE' };
  }
  return { at: createdAt, basis: 'INGEST' };
}

export function elapsedMs(
  from: Date,
  to: Date | null | undefined,
): number | null {
  if (!to) return null;
  return to.getTime() - from.getTime();
}

/** Median of numeric samples; null when empty. */
export function medianNumber(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function msToHours(ms: number | null): number | null {
  if (ms == null) return null;
  return Math.round((ms / 3_600_000) * 1000) / 1000;
}

export type LeadTimingRow = {
  sourceCreatedAt: Date | null;
  createdAt: Date;
  firstAttemptAt: Date | null;
  firstContactAt: Date | null;
};

export function firstAttemptResponseMs(row: LeadTimingRow): number | null {
  const anchor = responseAnchor(row.sourceCreatedAt, row.createdAt);
  return elapsedMs(anchor.at, row.firstAttemptAt);
}

export function firstContactResponseMs(row: LeadTimingRow): number | null {
  const anchor = responseAnchor(row.sourceCreatedAt, row.createdAt);
  return elapsedMs(anchor.at, row.firstContactAt);
}

export function responseBasisFor(row: LeadTimingRow): ResponseBasis {
  return responseAnchor(row.sourceCreatedAt, row.createdAt).basis;
}
