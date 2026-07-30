import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './clients.schemas';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        ...data,
        email: data.email ?? null,
        altPhone: data.altPhone ?? null,
        addressLine2: data.addressLine2 ?? null,
        province: data.province ?? null,
        postalCode: data.postalCode ?? null,
        handoverPhotosUrls: data.handoverPhotosUrls ?? [],
      },
    });
  }

  findAll(search?: string) {
    const where: Prisma.ClientWhereInput = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { idNumber: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.client.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        contracts: {
          where: { status: { in: ['ACTIVE', 'ARREARS', 'DRAFT'] } },
          include: { vehicle: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { vehicle: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return client;
  }

  async update(id: string, data: UpdateClientDto) {
    await this.findOne(id);
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
