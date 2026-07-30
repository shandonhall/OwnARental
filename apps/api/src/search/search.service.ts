import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SearchQuery } from './search.schemas';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQuery) {
    const q = query.q;
    const take = query.limit;

    const [clients, vehicles, contracts] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { idNumber: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          idNumber: true,
          phone: true,
          email: true,
        },
      }),
      this.prisma.vehicle.findMany({
        where: {
          OR: [
            { make: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { vin: { contains: q, mode: 'insensitive' } },
            { registration: { contains: q, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { registration: 'asc' },
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          registration: true,
          vin: true,
          status: true,
        },
      }),
      this.prisma.contract.findMany({
        where: {
          OR: [
            {
              client: {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { idNumber: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
            {
              vehicle: {
                OR: [
                  { registration: { contains: q, mode: 'insensitive' } },
                  { vin: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          planType: true,
          status: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              registration: true,
              make: true,
              model: true,
            },
          },
        },
      }),
    ]);

    return {
      q,
      clients: clients.map((client) => ({
        type: 'client' as const,
        id: client.id,
        title: `${client.firstName} ${client.lastName}`,
        subtitle: `ID ${client.idNumber} · ${client.phone}`,
        href: `/clients/${client.id}`,
      })),
      vehicles: vehicles.map((vehicle) => ({
        type: 'vehicle' as const,
        id: vehicle.id,
        title: vehicle.registration,
        subtitle: `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.status}`,
        href: `/fleet/${vehicle.id}`,
      })),
      contracts: contracts.map((contract) => ({
        type: 'contract' as const,
        id: contract.id,
        title: `${contract.client.firstName} ${contract.client.lastName}`,
        subtitle: `${contract.vehicle.registration} · ${contract.planType} · ${contract.status}`,
        href: `/contracts/${contract.id}`,
      })),
    };
  }
}
