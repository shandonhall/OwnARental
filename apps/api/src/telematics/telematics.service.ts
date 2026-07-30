import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { TelematicsEventType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';
import type {
  CarTrackProvider,
  DriverScoreBreakdown,
} from './cartrack.types';
import { MockCarTrackProvider } from './cartrack.mock';
import { LiveCarTrackProvider } from './cartrack.live';
import {
  estimateAverageDailyKm,
  mileageAgainstLimit,
  predictNextService,
} from './telematics.utils';
import { GhlService } from '../ghl/ghl.service';

export type FleetSyncError = {
  vehicleId: string;
  registration?: string;
  message: string;
};

export type FleetSyncResult = {
  provider: 'mock' | 'live';
  synced: number;
  failed: number;
  errors: FleetSyncError[];
  triggeredBy: 'manual' | 'schedule' | 'queue';
  completedAt: string;
};

@Injectable()
export class TelematicsService {
  private readonly logger = new Logger(TelematicsService.name);
  private readonly provider: CarTrackProvider;
  private lastFleetSyncAt: Date | null = null;
  private lastFleetSyncError: string | null = null;
  private lastFleetSyncResult: FleetSyncResult | null = null;
  private syncInFlight = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly ghl: GhlService,
  ) {
    const baseUrl = this.config.get<string>('CARTRACK_API_URL');
    const apiKey = this.config.get<string>('CARTRACK_API_KEY');
    this.provider =
      baseUrl && apiKey
        ? new LiveCarTrackProvider(baseUrl, apiKey)
        : new MockCarTrackProvider();
  }

  getStatus(schedulerMeta?: {
    autoSyncEnabled: boolean;
    intervalMs: number;
    queueEnabled: boolean;
  }) {
    return {
      provider: this.provider.mode,
      handshake: 'ok' as const,
      message:
        this.provider.mode === 'live'
          ? 'Connected to CarTrack API'
          : 'Using mock CarTrack provider (set CARTRACK_API_URL + CARTRACK_API_KEY for live)',
      lastFleetSyncAt: this.lastFleetSyncAt?.toISOString() ?? null,
      lastFleetSyncError: this.lastFleetSyncError,
      lastFleetSync: this.lastFleetSyncResult,
      syncInFlight: this.syncInFlight,
      autoSyncEnabled: schedulerMeta?.autoSyncEnabled ?? false,
      syncIntervalMs: schedulerMeta?.intervalMs ?? null,
      queueEnabled: schedulerMeta?.queueEnabled ?? false,
    };
  }

  async getMapAssets() {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        OR: [
          { status: { in: ['ACTIVE', 'ARREARS', 'AVAILABLE'] } },
          { lastKnownLat: { not: null } },
        ],
      },
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'ARREARS'] } },
          include: { client: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { registration: 'asc' },
    });

    const now = Date.now();
    return vehicles.map((vehicle) => {
      const contract = vehicle.contracts[0];
      const mileage = mileageAgainstLimit({
        currentOdometerKm: vehicle.currentOdometerKm,
        monthlyLimit: vehicle.monthlyMileageLimit,
        contractMonthlyLimit: contract?.monthlyKmLimit,
        averageDailyKm: vehicle.averageDailyKm,
      });

      const serviceDueDate = vehicle.nextServiceDueDate;
      const daysUntilService =
        serviceDueDate != null
          ? Math.ceil(
              (serviceDueDate.getTime() - now) / (1000 * 60 * 60 * 24),
            )
          : null;

      return {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        registration: vehicle.registration,
        status: vehicle.status,
        lat: vehicle.lastKnownLat ? Number(vehicle.lastKnownLat) : null,
        lng: vehicle.lastKnownLng ? Number(vehicle.lastKnownLng) : null,
        lastLocationAt: vehicle.lastLocationAt,
        currentOdometerKm: vehicle.currentOdometerKm,
        driverScore: vehicle.driverScore,
        isImmobilized: vehicle.isImmobilized,
        nextServiceDueKm: vehicle.nextServiceDueKm,
        nextServiceDueDate: vehicle.nextServiceDueDate,
        daysUntilService,
        serviceDueSoon:
          daysUntilService != null && daysUntilService <= 14,
        averageDailyKm: vehicle.averageDailyKm
          ? Number(vehicle.averageDailyKm)
          : null,
        mileage,
        client: contract?.client
          ? {
              id: contract.client.id,
              firstName: contract.client.firstName,
              lastName: contract.client.lastName,
            }
          : null,
        carTrackDeviceId: vehicle.carTrackDeviceId,
        lastTelematicsSyncAt: vehicle.lastTelematicsSyncAt,
      };
    });
  }

  async syncVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'ARREARS'] } },
          include: { client: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const previousScore = vehicle.driverScore;
    const deviceId =
      vehicle.carTrackDeviceId ?? `MOCK-${vehicle.registration}`;

    if (!vehicle.carTrackDeviceId) {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { carTrackDeviceId: deviceId },
      });
    }

    const snapshot = await this.provider.fetchSnapshot(deviceId);
    const averageDailyKm = estimateAverageDailyKm({
      previousOdometer: vehicle.currentOdometerKm,
      previousSyncedAt: vehicle.lastTelematicsSyncAt,
      newOdometer: snapshot.odometerKm,
      existingAverage: vehicle.averageDailyKm,
    });

    const prediction = predictNextService({
      currentOdometerKm: snapshot.odometerKm,
      averageDailyKm,
      nextServiceDueKm: vehicle.nextServiceDueKm,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          carTrackDeviceId: deviceId,
          lastKnownLat: new Prisma.Decimal(snapshot.lat),
          lastKnownLng: new Prisma.Decimal(snapshot.lng),
          lastLocationAt: snapshot.recordedAt,
          currentOdometerKm: snapshot.odometerKm,
          driverScore: snapshot.driverScore,
          averageDailyKm,
          nextServiceDueKm: prediction.nextServiceDueKm,
          nextServiceDueDate: prediction.nextServiceDueDate,
          lastTelematicsSyncAt: snapshot.recordedAt,
        },
      });

      await tx.telematicsEvent.create({
        data: {
          vehicleId,
          type: TelematicsEventType.LOCATION,
          lat: new Prisma.Decimal(snapshot.lat),
          lng: new Prisma.Decimal(snapshot.lng),
          message: 'Location ping',
          recordedAt: snapshot.recordedAt,
        },
      });

      await tx.telematicsEvent.create({
        data: {
          vehicleId,
          type: TelematicsEventType.MILEAGE,
          odometerKm: snapshot.odometerKm,
          message: `Odometer ${snapshot.odometerKm.toLocaleString()} km`,
          recordedAt: snapshot.recordedAt,
        },
      });

      await tx.telematicsEvent.create({
        data: {
          vehicleId,
          type: TelematicsEventType.DRIVER_SCORE,
          driverScore: snapshot.driverScore,
          message: `Driver score ${snapshot.driverScore}`,
          payload: {
            breakdown: snapshot.scoreBreakdown,
          },
          recordedAt: snapshot.recordedAt,
        },
      });

      for (const breach of snapshot.ruleBreaches) {
        await tx.telematicsEvent.create({
          data: {
            vehicleId,
            type: TelematicsEventType.RULE_BREACH,
            driverScore: snapshot.driverScore,
            message: breach.message,
            payload: {
              code: breach.code,
              severity: breach.severity,
            },
            recordedAt: breach.occurredAt,
          },
        });
      }

      await tx.telematicsEvent.create({
        data: {
          vehicleId,
          type: TelematicsEventType.SYNC,
          odometerKm: snapshot.odometerKm,
          lat: new Prisma.Decimal(snapshot.lat),
          lng: new Prisma.Decimal(snapshot.lng),
          driverScore: snapshot.driverScore,
          message: `Synced via ${this.provider.mode} provider`,
          payload: {
            provider: this.provider.mode,
            prediction,
            breachCount: snapshot.ruleBreaches.length,
            breakdown: snapshot.scoreBreakdown,
          },
          recordedAt: snapshot.recordedAt,
        },
      });

      return next;
    });

    const contract = vehicle.contracts[0] ?? null;
    const client = contract?.client ?? null;

    for (const breach of snapshot.ruleBreaches) {
      await this.ghl.notifyRuleBreach({
        vehicle: updated,
        client,
        contract,
        code: breach.code,
        severity: breach.severity,
        message: breach.message,
      });
    }

    await this.ghl.notifyLowDriverScore({
      vehicle: updated,
      client,
      previousScore,
      score: snapshot.driverScore,
    });

    return {
      vehicle: updated,
      prediction,
      mileage: mileageAgainstLimit({
        currentOdometerKm: updated.currentOdometerKm,
        monthlyLimit: updated.monthlyMileageLimit,
        contractMonthlyLimit: contract?.monthlyKmLimit,
        averageDailyKm: updated.averageDailyKm,
      }),
      scoreBreakdown: snapshot.scoreBreakdown,
      ruleBreaches: snapshot.ruleBreaches.map((breach) => ({
        code: breach.code,
        severity: breach.severity,
        message: breach.message,
        occurredAt: breach.occurredAt.toISOString(),
      })),
      provider: this.provider.mode,
    };
  }

  async syncFleet(
    triggeredBy: FleetSyncResult['triggeredBy'] = 'manual',
  ): Promise<FleetSyncResult> {
    if (this.syncInFlight) {
      return (
        this.lastFleetSyncResult ?? {
          provider: this.provider.mode,
          synced: 0,
          failed: 0,
          errors: [],
          triggeredBy,
          completedAt: new Date().toISOString(),
        }
      );
    }

    this.syncInFlight = true;
    const errors: FleetSyncError[] = [];
    let synced = 0;

    try {
      const vehicles = await this.prisma.vehicle.findMany({
        where: {
          status: { in: ['ACTIVE', 'ARREARS', 'AVAILABLE'] },
        },
        select: { id: true, registration: true },
      });

      for (const vehicle of vehicles) {
        try {
          await this.syncVehicle(vehicle.id);
          synced += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown sync error';
          this.logger.warn(
            `Telematics sync failed for ${vehicle.registration}: ${message}`,
          );
          errors.push({
            vehicleId: vehicle.id,
            registration: vehicle.registration,
            message,
          });
        }
      }

      const result: FleetSyncResult = {
        provider: this.provider.mode,
        synced,
        failed: errors.length,
        errors,
        triggeredBy,
        completedAt: new Date().toISOString(),
      };

      this.lastFleetSyncAt = new Date();
      this.lastFleetSyncError =
        errors.length > 0
          ? `${errors.length} vehicle(s) failed to sync`
          : null;
      this.lastFleetSyncResult = result;
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Fleet sync failed';
      this.lastFleetSyncError = message;
      this.logger.error(message);
      throw error;
    } finally {
      this.syncInFlight = false;
    }
  }

  async getVehicleTelematics(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'ARREARS'] } },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        telematicsEvents: {
          orderBy: { recordedAt: 'desc' },
          take: 40,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const contract = vehicle.contracts[0];
    const prediction =
      vehicle.averageDailyKm != null
        ? predictNextService({
            currentOdometerKm: vehicle.currentOdometerKm,
            averageDailyKm: vehicle.averageDailyKm,
            nextServiceDueKm: vehicle.nextServiceDueKm,
          })
        : null;

    const scoreEvent = vehicle.telematicsEvents.find(
      (event) => event.type === TelematicsEventType.DRIVER_SCORE,
    );
    const scoreBreakdown = extractBreakdown(scoreEvent?.payload);

    const recentBreaches = vehicle.telematicsEvents
      .filter((event) => event.type === TelematicsEventType.RULE_BREACH)
      .slice(0, 8)
      .map((event) => ({
        id: event.id,
        code:
          typeof event.payload === 'object' &&
          event.payload &&
          'code' in event.payload
            ? String((event.payload as { code?: unknown }).code ?? 'BREACH')
            : 'BREACH',
        severity:
          typeof event.payload === 'object' &&
          event.payload &&
          'severity' in event.payload
            ? String(
                (event.payload as { severity?: unknown }).severity ?? 'medium',
              )
            : 'medium',
        message: event.message ?? 'Rule breach',
        occurredAt: event.recordedAt.toISOString(),
      }));

    return {
      vehicle,
      prediction,
      mileage: mileageAgainstLimit({
        currentOdometerKm: vehicle.currentOdometerKm,
        monthlyLimit: vehicle.monthlyMileageLimit,
        contractMonthlyLimit: contract?.monthlyKmLimit,
        averageDailyKm: vehicle.averageDailyKm,
      }),
      scoreBreakdown,
      recentBreaches,
      provider: this.provider.mode,
    };
  }

  async setImmobilized(
    vehicleId: string,
    immobilize: boolean,
    actor: User,
  ) {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only Super Admin can immobilize or mobilize vehicles',
      );
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'ARREARS'] } },
          include: { client: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const deviceId = vehicle.carTrackDeviceId;
    if (!deviceId) {
      throw new BadRequestException(
        'Vehicle has no CarTrack device ID — sync telematics first',
      );
    }

    if (immobilize) {
      await this.provider.immobilize(deviceId);
    } else {
      await this.provider.mobilize(deviceId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          isImmobilized: immobilize,
          lastImmobilizedAt: immobilize
            ? new Date()
            : vehicle.lastImmobilizedAt,
        },
      });

      await tx.telematicsEvent.create({
        data: {
          vehicleId,
          type: immobilize
            ? TelematicsEventType.IMMOBILIZE
            : TelematicsEventType.MOBILIZE,
          message: `${immobilize ? 'Immobilized' : 'Mobilized'} by ${actor.email}`,
          payload: {
            actorId: actor.id,
            actorEmail: actor.email,
            provider: this.provider.mode,
          },
        },
      });

      return next;
    });

    await this.ghl.notifyImmobilizeChange({
      immobilize,
      vehicle: updated,
      client: vehicle.contracts[0]?.client ?? null,
      actorEmail: actor.email,
    });

    return updated;
  }
}

function extractBreakdown(
  payload: Prisma.JsonValue | null | undefined,
): DriverScoreBreakdown | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const source =
    record.breakdown &&
    typeof record.breakdown === 'object' &&
    !Array.isArray(record.breakdown)
      ? (record.breakdown as Record<string, unknown>)
      : record;

  const overall = Number(source.overall);
  if (!Number.isFinite(overall)) return null;

  return {
    overall: Math.round(overall),
    speeding: Math.round(Number(source.speeding ?? overall)),
    harshBraking: Math.round(Number(source.harshBraking ?? overall)),
    harshAcceleration: Math.round(Number(source.harshAcceleration ?? overall)),
    idling: Math.round(Number(source.idling ?? overall)),
  };
}
