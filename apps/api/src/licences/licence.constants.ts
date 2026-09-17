/** Central licence urgency horizons (days). Change here only. */
export const LICENCE_URGENCY = {
  WARN_DAYS: 60,
  ACTION_DAYS: 30,
} as const;

export type LicenceUrgency = 'OK' | 'WARN_60' | 'ACTION_30' | 'EXPIRED';

export const NON_TERMINAL_LICENCE_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RENEWED',
  'RECEIVED',
] as const;

export const TERMINAL_LICENCE_STATUSES = ['COMPLETED', 'CANCELLED'] as const;
