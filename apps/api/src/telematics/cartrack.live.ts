import type {
  CarTrackProvider,
  CarTrackSnapshot,
  DriverScoreBreakdown,
  RuleBreach,
  SnapshotContext,
} from './cartrack.types';

/**
 * Live CarTrack HTTP adapter.
 * Configure CARTRACK_API_URL + CARTRACK_API_KEY to enable.
 * Accepts several common telemetry payload shapes and normalizes them.
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

  async fetchSnapshot(
    deviceId: string,
    context?: SnapshotContext,
  ): Promise<CarTrackSnapshot> {
    void context;
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, '')}/devices/${encodeURIComponent(deviceId)}/telemetry`,
      { headers: this.headers() },
    );

    if (!response.ok) {
      throw new Error(`CarTrack telemetry failed (${response.status})`);
    }

    const body = (await response.json()) as Record<string, unknown>;
    return normalizeTelemetry(deviceId, body);
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

export function normalizeTelemetry(
  deviceId: string,
  body: Record<string, unknown>,
): CarTrackSnapshot {
  const location =
    asRecord(body.location) ??
    asRecord(body.gps) ??
    asRecord(body.position) ??
    body;

  const lat = firstFinite(
    location.lat,
    location.latitude,
    location.Latitude,
    body.lat,
    body.latitude,
  );
  const lng = firstFinite(
    location.lng,
    location.lon,
    location.longitude,
    location.Longitude,
    body.lng,
    body.longitude,
  );
  const odometerKm = firstFinite(
    body.odometerKm,
    body.odometer_km,
    body.odometer,
    body.mileage,
    body.mileageKm,
    asRecord(body.vehicle)?.odometer,
  );
  const driverScore = clampScore(
    firstFinite(
      body.driverScore,
      body.driver_score,
      body.score,
      asRecord(body.driver)?.score,
      70,
    ) ?? 70,
  );

  if (lat == null || lng == null || odometerKm == null) {
    throw new Error('CarTrack telemetry payload missing lat/lng/odometer');
  }

  const recordedAt =
    parseDate(
      body.recordedAt ??
        body.recorded_at ??
        body.timestamp ??
        body.updatedAt ??
        body.lastSeenAt,
    ) ?? new Date();

  const scoreBreakdown = parseBreakdown(body, driverScore);
  const ruleBreaches = parseBreaches(body);

  return {
    deviceId,
    lat,
    lng,
    odometerKm: Math.round(odometerKm),
    driverScore,
    recordedAt,
    scoreBreakdown,
    ruleBreaches,
  };
}

function parseBreakdown(
  body: Record<string, unknown>,
  overall: number,
): DriverScoreBreakdown {
  const source =
    asRecord(body.scoreBreakdown) ??
    asRecord(body.score_breakdown) ??
    asRecord(body.driverScoreBreakdown) ??
    asRecord(body.scores) ??
    {};

  return {
    overall,
    speeding: clampScore(
      firstFinite(source.speeding, source.speed, overall) ?? overall,
    ),
    harshBraking: clampScore(
      firstFinite(
        source.harshBraking,
        source.harsh_braking,
        source.braking,
        overall,
      ) ?? overall,
    ),
    harshAcceleration: clampScore(
      firstFinite(
        source.harshAcceleration,
        source.harsh_acceleration,
        source.acceleration,
        overall,
      ) ?? overall,
    ),
    idling: clampScore(
      firstFinite(source.idling, source.idle, overall) ?? overall,
    ),
  };
}

function parseBreaches(body: Record<string, unknown>): RuleBreach[] {
  const raw =
    body.ruleBreaches ??
    body.rule_breaches ??
    body.breaches ??
    body.events ??
    body.alerts;

  if (!Array.isArray(raw)) {
    return [];
  }

  const breaches: RuleBreach[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) continue;

    const type = asDisplayString(
      record.type ?? record.code ?? record.event ?? record.kind,
    ).toUpperCase();
    if (!type) continue;

    // Skip non-breach telemetry events when provider reuses an events array.
    if (
      [
        'LOCATION',
        'ODOMETER',
        'MILEAGE',
        'SYNC',
        'TELEMETRY',
        'HEARTBEAT',
      ].includes(type)
    ) {
      continue;
    }

    const severityRaw = asDisplayString(
      record.severity ?? record.level,
      'medium',
    ).toLowerCase();
    const severity: RuleBreach['severity'] =
      severityRaw === 'high' || severityRaw === 'critical'
        ? 'high'
        : severityRaw === 'low'
          ? 'low'
          : 'medium';

    breaches.push({
      code: type.slice(0, 64),
      severity,
      message: asDisplayString(
        record.message ?? record.description ?? record.detail,
        type,
      ).slice(0, 500),
      occurredAt:
        parseDate(record.occurredAt ?? record.timestamp ?? record.at) ??
        new Date(),
    });
  }

  return breaches.slice(0, 20);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
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

function firstFinite(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate == null || candidate === '') continue;
    const value = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
