import type { CarTrackProvider, CarTrackSnapshot } from './cartrack.types';

/**
 * Live CarTrack HTTP adapter.
 * Configure CARTRACK_API_URL + CARTRACK_API_KEY to enable.
 * Expected GET {base}/devices/{deviceId}/telemetry JSON shape is normalized below.
 */
export class LiveCarTrackProvider implements CarTrackProvider {
  readonly mode = 'live' as const;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async fetchSnapshot(deviceId: string): Promise<CarTrackSnapshot> {
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/devices/${encodeURIComponent(deviceId)}/telemetry`,
      { headers: this.headers() },
    );

    if (!response.ok) {
      throw new Error(`CarTrack telemetry failed (${response.status})`);
    }

    const body = (await response.json()) as Record<string, unknown>;
    const lat = Number(body.lat ?? body.latitude);
    const lng = Number(body.lng ?? body.longitude);
    const odometerKm = Number(body.odometerKm ?? body.odometer ?? body.mileage);
    const driverScore = Number(body.driverScore ?? body.score ?? 70);

    if (![lat, lng, odometerKm].every((value) => Number.isFinite(value))) {
      throw new Error('CarTrack telemetry payload missing lat/lng/odometer');
    }

    return {
      deviceId,
      lat,
      lng,
      odometerKm: Math.round(odometerKm),
      driverScore: Math.min(100, Math.max(0, Math.round(driverScore))),
      recordedAt: new Date(),
    };
  }

  async immobilize(deviceId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/devices/${encodeURIComponent(deviceId)}/immobilize`,
      { method: 'POST', headers: this.headers() },
    );
    if (!response.ok) {
      throw new Error(`CarTrack immobilize failed (${response.status})`);
    }
  }

  async mobilize(deviceId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/devices/${encodeURIComponent(deviceId)}/mobilize`,
      { method: 'POST', headers: this.headers() },
    );
    if (!response.ok) {
      throw new Error(`CarTrack mobilize failed (${response.status})`);
    }
  }
}
