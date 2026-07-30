import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVehicleDto,
  ListVehiclesQuery,
  UpdateVehicleDto,
} from './vehicles.schemas';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

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

  findAll(query: ListVehiclesQuery) {
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

    return this.prisma.vehicle.findMany({
      where,
      orderBy: [{ status: 'asc' }, { make: 'asc' }, { model: 'asc' }],
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'ARREARS', 'DRAFT'] } },
          include: { client: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { client: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    return vehicle;
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
