export type CarTrackSnapshot = {
  deviceId: string;
  lat: number;
  lng: number;
  odometerKm: number;
  driverScore: number;
  recordedAt: Date;
};

export type CarTrackProvider = {
  readonly mode: 'mock' | 'live';
  fetchSnapshot(deviceId: string): Promise<CarTrackSnapshot>;
  immobilize(deviceId: string): Promise<void>;
  mobilize(deviceId: string): Promise<void>;
};
