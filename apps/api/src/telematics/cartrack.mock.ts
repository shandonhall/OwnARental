import type {
  CarTrackProvider,
  CarTrackSnapshot,
  DriverScoreBreakdown,
  RuleBreach,
} from './cartrack.types';

/** Deterministic demo provider when CARTRACK_API_URL is not configured. */
export class MockCarTrackProvider implements CarTrackProvider {
  readonly mode = 'mock' as const;

  async fetchSnapshot(deviceId: string): Promise<CarTrackSnapshot> {
    const seed = hashString(deviceId);
    const baseLat = -26.093 + ((seed % 1000) / 1000) * 0.25;
    const baseLng = 27.99 + (((seed >> 3) % 1000) / 1000) * 0.25;
    const jitter = ((Date.now() / 60000) % 50) / 10000;
    const overall = 55 + (seed % 40);
    const scoreBreakdown = buildBreakdown(seed, overall);
    const ruleBreaches = buildBreaches(deviceId, seed, overall);

    return {
      deviceId,
      lat: Number((baseLat + jitter).toFixed(7)),
      lng: Number((baseLng - jitter / 2).toFixed(7)),
      odometerKm:
        12000 + (seed % 80000) + Math.floor((Date.now() / 1000 / 60) % 40),
      driverScore: overall,
      recordedAt: new Date(),
      scoreBreakdown,
      ruleBreaches,
    };
  }

  async immobilize(_deviceId: string): Promise<void> {
    // Mock success — live provider would call CarTrack immobilize endpoint
  }

  async mobilize(_deviceId: string): Promise<void> {
    // Mock success
  }
}

function buildBreakdown(seed: number, overall: number): DriverScoreBreakdown {
  const wobble = (offset: number) =>
    Math.min(100, Math.max(40, overall + ((seed >> offset) % 17) - 8));

  return {
    overall,
    speeding: wobble(1),
    harshBraking: wobble(2),
    harshAcceleration: wobble(3),
    idling: wobble(4),
  };
}

function buildBreaches(
  deviceId: string,
  seed: number,
  overall: number,
): RuleBreach[] {
  // Roughly one in three devices surfaces a demo breach each sync window.
  const slot = Math.floor(Date.now() / (1000 * 60 * 15));
  if ((seed + slot) % 3 !== 0 && overall >= 70) {
    return [];
  }

  const catalog: Array<Omit<RuleBreach, 'occurredAt'>> = [
    {
      code: 'SPEEDING',
      severity: 'medium',
      message: 'Exceeded posted speed limit for > 30s',
    },
    {
      code: 'HARSH_BRAKING',
      severity: 'low',
      message: 'Harsh braking event detected',
    },
    {
      code: 'GEOFENCE_EXIT',
      severity: 'high',
      message: 'Left approved operating zone',
    },
    {
      code: 'AFTER_HOURS',
      severity: 'medium',
      message: 'Movement outside contracted hours',
    },
  ];

  const pick = catalog[seed % catalog.length];
  return [
    {
      ...pick,
      occurredAt: new Date(Date.now() - (seed % 90) * 60_000),
      message: `${pick.message} (${deviceId})`,
    },
  ];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
