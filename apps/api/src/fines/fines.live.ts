import type { ExternalFine, FinesProvider } from './fines.types';

/**
 * Live municipal / SANRAL / AARTO adapter.
 * Expected GET {base}/fines?registration=XYZ JSON array or { fines: [...] }.
 */
export class LiveFinesProvider implements FinesProvider {
  readonly mode = 'live' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
  }

  async fetchOutstandingByRegistration(
    registration: string,
  ): Promise<ExternalFine[]> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/fines`);
    url.searchParams.set('registration', registration);

    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Fines API failed (${response.status})`);
    }

    const body = (await response.json()) as
      unknown[] | { fines?: unknown[]; results?: unknown[] };
    const rows = Array.isArray(body)
      ? body
      : Array.isArray(body.fines)
        ? body.fines
        : Array.isArray(body.results)
          ? body.results
          : [];

    return rows
      .map((row) => normalizeFine(row, registration))
      .filter((fine): fine is ExternalFine => fine != null);
  }

  async fetchFleetOutstanding(
    registrations: string[],
  ): Promise<ExternalFine[]> {
    const all: ExternalFine[] = [];
    for (const registration of registrations) {
      all.push(...(await this.fetchOutstandingByRegistration(registration)));
    }
    return all;
  }
}

function asDisplayString(value: unknown, fallback = ''): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return fallback;
}

function normalizeFine(
  row: unknown,
  fallbackRegistration: string,
): ExternalFine | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const externalId = asDisplayString(
    record.externalId ?? record.id ?? record.noticeNumber ?? record.reference,
  ).trim();
  const amount = Number(record.amount ?? record.total ?? record.value);
  if (!externalId || !Number.isFinite(amount) || amount <= 0) return null;

  const sourceRaw = asDisplayString(
    record.source ?? record.authority,
    'AARTO',
  ).toUpperCase();
  const source: ExternalFine['source'] =
    sourceRaw.includes('SANRAL') || sourceRaw.includes('TOLL')
      ? 'SANRAL'
      : sourceRaw.includes('MUNIC')
        ? 'MUNICIPAL'
        : 'AARTO';

  const offence = record.offenceDate ?? record.date ?? record.issuedAt ?? null;
  const offenceDate =
    typeof offence === 'string' || typeof offence === 'number'
      ? new Date(offence)
      : null;

  return {
    externalId,
    source,
    registration: asDisplayString(
      record.registration ?? record.plate,
      fallbackRegistration,
    ).toUpperCase(),
    offenceDate:
      offenceDate && !Number.isNaN(offenceDate.getTime()) ? offenceDate : null,
    amount,
    description: asDisplayString(
      record.description ?? record.offence,
      `${source} notice ${externalId}`,
    ),
    raw: record,
  };
}
