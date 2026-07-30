export type ExternalFine = {
  externalId: string;
  source: 'AARTO' | 'SANRAL' | 'MUNICIPAL' | 'MOCK';
  registration: string;
  offenceDate: Date | null;
  amount: number;
  description: string;
  raw?: Record<string, unknown>;
};

export type FinesProvider = {
  readonly mode: 'mock' | 'live';
  fetchOutstandingByRegistration(
    registration: string,
  ): Promise<ExternalFine[]>;
  fetchFleetOutstanding(
    registrations: string[],
  ): Promise<ExternalFine[]>;
};
