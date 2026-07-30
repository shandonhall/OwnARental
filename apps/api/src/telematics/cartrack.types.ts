export type DriverScoreBreakdown = {
  overall: number;
  speeding: number;
  harshBraking: number;
  harshAcceleration: number;
  idling: number;
};

export type RuleBreach = {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  occurredAt: Date;
};

export type CarTrackSnapshot = {
  deviceId: string;
  lat: number;
  lng: number;
  odometerKm: number;
  driverScore: number;
  recordedAt: Date;
  scoreBreakdown: DriverScoreBreakdown;
  ruleBreaches: RuleBreach[];
};

export type CarTrackProvider = {
  readonly mode: 'mock' | 'live';
  fetchSnapshot(deviceId: string): Promise<CarTrackSnapshot>;
  immobilize(deviceId: string): Promise<void>;
  mobilize(deviceId: string): Promise<void>;
};

export const TELEMATICS_SYNC_QUEUE = 'telematics-sync';
