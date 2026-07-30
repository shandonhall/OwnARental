import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { TelematicsEventType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';
import type { CarTrackProvider } from './cartrack.types';
import { MockCarTrackProvider } from './cartrack.mock';
import { LiveCarTrackProvider } from './cartrack.live';
import {
  estimateAverageDailyKm,
  mileageAgainstLimit,
  predictNextService,
} from './telematics.utils';

@Injectable()
export class TelematicsService {
  private readonly provider: CarTrackProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const baseUrl = this.config.get<string>('CARTRACK_API_URL');
    const apiKey = this.config.get<string>('CARTRACK_API_KEY');
    this.provider =
      baseUrl && apiKey
        ? new LiveCarTrackProvider(baseUrl, apiKey)
        : new MockCarTrackProvider();
  }

  getStatus() {
    return {
      provider: this.provider.mode,
      handshake: 'ok',
      message:
        this.provider.mode === 'live'
          ? 'Connected to CarTrack API'
          : 'Using mock CarTrack provider (set CARTRACK_API_URL + CARTRACK_API_KEY for live)',
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

    return vehicles.map((vehicle) => {
      const contract = vehicle.contracts[0];
      const mileage = mileageAgainstLimit({
        currentOdometerKm: vehicle.currentOdometerKm,
        monthlyLimit: vehicle.monthlyMileageLimit,
        contractMonthlyLimit: contract?.monthlyKmLimit,
        averageDailyKm: vehicle.averageDailyKm,
      });

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
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

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
          type: TelematicsEventType.SYNC,
          odometerKm: snapshot.odometerKm,
          lat: new Prisma.Decimal(snapshot.lat),
          lng: new Prisma.Decimal(snapshot.lng),
          driverScore: snapshot.driverScore,
          message: `Synced via ${this.provider.mode} provider`,
          payload: {
            provider: this.provider.mode,
            prediction,
          },
          recordedAt: snapshot.recordedAt,
        },
      });

      return next;
    });

    const contract = vehicle.contracts[0];
    return {
      vehicle: updated,
      prediction,
      mileage: mileageAgainstLimit({
        currentOdometerKm: updated.currentOdometerKm,
        monthlyLimit: updated.monthlyMileageLimit,
        contractMonthlyLimit: contract?.monthlyKmLimit,
        averageDailyKm: updated.averageDailyKm,
      }),
      provider: this.provider.mode,
    };
  }

  async syncFleet() {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        status: { in: ['ACTIVE', 'ARREARS', 'AVAILABLE'] },
      },
      select: { id: true },
    });

    const results = [];
    for (const vehicle of vehicles) {
      results.push(await this.syncVehicle(vehicle.id));
    }
    return {
      provider: this.provider.mode,
      synced: results.length,
      results,
    };
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
          take: 25,
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

    return {
      vehicle,
      prediction,
      mileage: mileageAgainstLimit({
        currentOdometerKm: vehicle.currentOdometerKm,
        monthlyLimit: vehicle.monthlyMileageLimit,
        contractMonthlyLimit: contract?.monthlyKmLimit,
        averageDailyKm: vehicle.averageDailyKm,
      }),
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
          lastImmobilizedAt: immobilize ? new Date() : vehicle.lastImmobilizedAt,
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

    return updated;
  }
}
