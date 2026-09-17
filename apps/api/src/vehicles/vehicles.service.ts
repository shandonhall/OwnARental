import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { LicenceRenewalStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVehicleDto,
  ListVehiclesQuery,
  UpdateVehicleDto,
} from './vehicles.schemas';
import { NON_TERMINAL_LICENCE_STATUSES } from '../licences/licence.constants';
import {
  licenceUrgencyForExpiry,
  toUtcDateOnly,
} from '../licences/licence.urgency';

const openLicenceInclude = {
  where: {
    status: {
      in: [...NON_TERMINAL_LICENCE_STATUSES] as LicenceRenewalStatus[],
    },
  },
  orderBy: { expiryDate: 'asc' as const },
  take: 1,
  include: {
    responsibleUser: {
      select: { id: true, fullName: true, email: true, role: true },
    },
    client: {
      select: { id: true, firstName: true, lastName: true },
    },
  },
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private projectCurrentLicence<
    T extends {
      licenceRenewals?: Array<{
        id: string;
        expiryDate: Date;
        renewedExpiryDate: Date | null;
        renewalCost: Prisma.Decimal | null;
        status: LicenceRenewalStatus;
        clientNotifiedAt: Date | null;
        responsibleUser: {
          id: string;
          fullName: string;
          email: string;
          role: string;
        } | null;
        client: {
          id: string;
          firstName: string;
          lastName: string;
        } | null;
      }>;
    },
  >(vehicle: T) {
    const { licenceRenewals, ...rest } = vehicle;
    const row = licenceRenewals?.[0] ?? null;
    if (!row) {
      return { ...rest, currentLicence: null };
    }
    const { daysRemaining, urgency } = licenceUrgencyForExpiry(row.expiryDate);
    return {
      ...rest,
      currentLicence: {
        id: row.id,
        status: row.status,
        expiryDate: toUtcDateOnly(row.expiryDate).toISOString().slice(0, 10),
        renewedExpiryDate: row.renewedExpiryDate
          ? toUtcDateOnly(row.renewedExpiryDate).toISOString().slice(0, 10)
          : null,
        renewalCost:
          row.renewalCost != null ? Number(row.renewalCost).toFixed(2) : null,
        clientNotifiedAt: row.clientNotifiedAt,
        daysRemaining,
        urgency,
        responsibleUser: row.responsibleUser,
        client: row.client,
      },
    };
  }

  create(data: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        make: data.make,
        model: data.model,
        year: data.year,
        color: data.color ?? null,
        vin: data.vin,
        registration: data.registration,
        purchasePrice: new Prisma.Decimal(data.purchasePrice),
        purchaseDate: data.purchaseDate ?? null,
        status: data.status,
        monthlyMileageLimit: data.monthlyMileageLimit ?? null,
        carTrackDeviceId: data.carTrackDeviceId ?? null,
        warrantyProvider: data.warrantyProvider ?? null,
        warrantyStartDate: data.warrantyStartDate ?? null,
        warrantyExpiryDate: data.warrantyExpiryDate ?? null,
        warrantyKmLimit: data.warrantyKmLimit ?? null,
        warrantyNotes: data.warrantyNotes ?? null,
        nextServiceDueKm: data.nextServiceDueKm ?? null,
        nextServiceDueDate: data.nextServiceDueDate ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  async findAll(query: ListVehiclesQuery) {
    const where: Prisma.VehicleWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { make: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { vin: { contains: query.search, mode: 'insensitive' } },
              {
                registration: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      orderBy: [{ status: 'asc' }, { make: 'asc' }, { model: 'asc' }],
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'ARREARS', 'DRAFT'] } },
          include: { client: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        licenceRenewals: openLicenceInclude,
      },
    });

    return vehicles.map((vehicle) => this.projectCurrentLicence(vehicle));
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { client: true },
          orderBy: { createdAt: 'desc' },
        },
        licenceRenewals: openLicenceInclude,
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    return this.projectCurrentLicence(vehicle);
  }

  async update(id: string, data: UpdateVehicleDto) {
    await this.findOne(id);

    const { purchasePrice, ...rest } = data;

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...rest,
        ...(purchasePrice !== undefined
          ? { purchasePrice: new Prisma.Decimal(purchasePrice) }
          : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { status: 'RETURNED' },
    });
  }
}
