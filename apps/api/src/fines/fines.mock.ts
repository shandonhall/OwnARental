import type { ExternalFine, FinesProvider } from './fines.types';

/** Deterministic demo fines when FINES_API_URL is not configured. */
export class MockFinesProvider implements FinesProvider {
  readonly mode = 'mock' as const;

  async fetchOutstandingByRegistration(
    registration: string,
  ): Promise<ExternalFine[]> {
    const seed = hashString(registration.toUpperCase());
    if (seed % 3 === 0) {
      return [];
    }

    const amount = 350 + (seed % 12) * 50;
    const isToll = seed % 2 === 0;
    return [
      {
        externalId: `MOCK-${registration.toUpperCase().replace(/\s+/g, '')}-${seed % 10000}`,
        source: isToll ? 'SANRAL' : 'AARTO',
        registration: registration.toUpperCase(),
        offenceDate: new Date(Date.now() - (seed % 40) * 86_400_000),
        amount,
        description: isToll
          ? `SANRAL e-toll notice · ${registration.toUpperCase()}`
          : `AARTO infringement · ${registration.toUpperCase()}`,
        raw: { mock: true, seed },
      },
    ];
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

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
