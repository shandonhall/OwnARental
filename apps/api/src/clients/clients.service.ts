import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, UpdateClientDto } from './clients.schemas';
import { GhlService } from '../ghl/ghl.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ghl: GhlService,
  ) {}

  async create(data: CreateClientDto) {
    const client = await this.prisma.client.create({
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

    await this.ghl.syncClientContact(client);
    return this.findOne(client.id);
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
          include: {
            vehicle: true,
            ledger: {
              where: {
                type: { in: ['FINE', 'TOLL'] },
                status: 'PENDING',
              },
              orderBy: { dueDate: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    const activeContract =
      client.contracts.find((c) => ['ACTIVE', 'ARREARS'].includes(c.status)) ??
      client.contracts[0] ??
      null;

    const pendingFines = client.contracts.flatMap((c) =>
      c.ledger.map((entry) => ({
        id: entry.id,
        kind: entry.type,
        detail: entry.type === 'TOLL' ? 'Outstanding toll' : 'Outstanding fine',
        amount: Number(entry.amount).toFixed(2),
        contractId: c.id,
      })),
    );

    const alerts = [
      ...(activeContract?.status === 'ARREARS'
        ? [
            {
              id: `arrears-${activeContract.id}`,
              kind: 'ARREARS',
              detail: 'Contract in arrears',
              amount: Number(activeContract.outstandingBalance).toFixed(2),
              contractId: activeContract.id,
            },
          ]
        : []),
      ...pendingFines,
    ];

    return {
      ...client,
      opsSummary: {
        arrears: activeContract?.status === 'ARREARS',
        outstandingBalance: activeContract
          ? Number(activeContract.outstandingBalance).toFixed(2)
          : null,
        pendingFineCount: pendingFines.length,
        pendingFineTotal: pendingFines
          .reduce((sum, fine) => sum + Number(fine.amount), 0)
          .toFixed(2),
        driverScore: activeContract?.vehicle?.driverScore ?? null,
        activeContractId: activeContract?.id ?? null,
        alertCount: alerts.length,
        alerts,
      },
    };
  }

  async update(id: string, data: UpdateClientDto) {
    await this.findOne(id);
    const client = await this.prisma.client.update({
      where: { id },
      data,
    });
    await this.ghl.syncClientContact(client);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async syncToGhl(id: string) {
    const client = await this.findOne(id);
    const contactId = await this.ghl.syncClientContact(client);
    if (!contactId) {
      this.logger.warn(`GHL sync returned no contact id for client ${id}`);
    }
    return this.findOne(id);
  }
}
