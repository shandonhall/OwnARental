import type { CarTrackProvider, CarTrackSnapshot } from './cartrack.types';

/** Deterministic demo provider when CARTRACK_API_URL is not configured. */
export class MockCarTrackProvider implements CarTrackProvider {
  readonly mode = 'mock' as const;

  async fetchSnapshot(deviceId: string): Promise<CarTrackSnapshot> {
    const seed = hashString(deviceId);
    const baseLat = -26.093 + ((seed % 1000) / 1000) * 0.25;
    const baseLng = 27.99 + (((seed >> 3) % 1000) / 1000) * 0.25;
    const jitter = ((Date.now() / 60000) % 50) / 10000;

    return {
      deviceId,
      lat: Number((baseLat + jitter).toFixed(7)),
      lng: Number((baseLng - jitter / 2).toFixed(7)),
      odometerKm: 12000 + (seed % 80000) + Math.floor((Date.now() / 1000 / 60) % 40),
      driverScore: 55 + (seed % 40),
      recordedAt: new Date(),
    };
  }

  async immobilize(_deviceId: string): Promise<void> {
    // Mock success — live provider would call CarTrack immobilize endpoint
  }

  async mobilize(_deviceId: string): Promise<void> {
    // Mock success
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
