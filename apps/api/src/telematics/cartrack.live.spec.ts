import { normalizeTelemetry } from './cartrack.live';

describe('normalizeTelemetry', () => {
  it('maps nested GPS + alternate field names', () => {
    const snapshot = normalizeTelemetry('DEV-1', {
      gps: { latitude: '-26.1', longitude: '28.05' },
      mileage: '45210.4',
      driver_score: 82,
      score_breakdown: {
        speeding: 90,
        harsh_braking: 70,
        harsh_acceleration: 75,
        idle: 88,
      },
      events: [
        {
          type: 'SPEEDING',
          severity: 'high',
          message: 'Speed limit exceeded',
          timestamp: '2026-07-30T10:00:00.000Z',
        },
        { type: 'LOCATION', message: 'ignored' },
      ],
      timestamp: '2026-07-30T10:05:00.000Z',
    });

    expect(snapshot.lat).toBeCloseTo(-26.1);
    expect(snapshot.lng).toBeCloseTo(28.05);
    expect(snapshot.odometerKm).toBe(45210);
    expect(snapshot.driverScore).toBe(82);
    expect(snapshot.scoreBreakdown.speeding).toBe(90);
    expect(snapshot.scoreBreakdown.harshBraking).toBe(70);
    expect(snapshot.ruleBreaches).toHaveLength(1);
    expect(snapshot.ruleBreaches[0]?.code).toBe('SPEEDING');
  });

  it('throws when coordinates are missing', () => {
    expect(() => normalizeTelemetry('DEV-2', { odometerKm: 1000 })).toThrow(
      /missing lat\/lng\/odometer/,
    );
  });
});
