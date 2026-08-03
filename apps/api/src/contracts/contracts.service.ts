import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ContractStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  addMonths,
  expectedContractTotal,
  sumPaidIncome,
  withFinanceSummary,
} from '../finance/finance.utils';
import {
  CreateContractDto,
  ListContractsQuery,
  UpdateContractDto,
} from './contracts.schemas';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  private contractInclude = {
    client: true,
    vehicle: true,
    ledger: {
      orderBy: [{ dueDate: 'asc' as const }, { createdAt: 'asc' as const }],
    },
  };

  async recalculateBalances(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { ledger: true },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const expectedTotal = expectedContractTotal(contract);
    const totalPaid = sumPaidIncome(contract.ledger);
    const outstandingBalance = Prisma.Decimal.max(
      expectedTotal.sub(totalPaid),
      new Prisma.Decimal(0),
    );

    return this.prisma.contract.update({
      where: { id: contractId },
      data: {
        totalPaid,
        outstandingBalance,
      },
      include: this.contractInclude,
    });
  }

  async create(data: CreateContractDto) {
    const [client, vehicle] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: data.clientId } }),
      this.prisma.vehicle.findUnique({ where: { id: data.vehicleId } }),
    ]);

    if (!client || !client.isActive) {
      throw new BadRequestException('Client not found or inactive');
    }
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    const activeOnVehicle = await this.prisma.contract.findFirst({
      where: {
        vehicleId: data.vehicleId,
        status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
      },
    });
    if (activeOnVehicle) {
      throw new BadRequestException(
        'Vehicle already has an active/arrears contract',
      );
    }

    const startDate = data.startDate;
    const endDate = data.endDate ?? addMonths(startDate, data.termMonths);
    const monthlyRate = new Prisma.Decimal(data.monthlyRate);
    const depositAmount = new Prisma.Decimal(data.depositAmount ?? 0);
    const balloonAmount =
      data.balloonAmount == null || data.balloonAmount === ''
        ? null
        : new Prisma.Decimal(data.balloonAmount);

    const cipPercent =
      data.cipPercent ??
      (data.planType === 'CIP_10' ? 10 : data.planType === 'CIP_20' ? 20 : null);

    const expectedTotal = expectedContractTotal({
      monthlyRate,
      termMonths: data.termMonths,
      depositAmount,
      balloonAmount,
    });

    const status = data.status ?? ContractStatus.DRAFT;

    const contract = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          clientId: data.clientId,
          vehicleId: data.vehicleId,
          planType: data.planType,
          status,
          termMonths: data.termMonths,
          monthlyRate,
          depositAmount,
          balloonAmount,
          cipPercent,
          startDate,
          endDate,
          monthlyKmLimit: data.monthlyKmLimit ?? null,
          notes: data.notes ?? null,
          totalPaid: 0,
          outstandingBalance: expectedTotal,
        },
        include: this.contractInclude,
      });

      if (
        status === ContractStatus.ACTIVE ||
        status === ContractStatus.ARREARS
      ) {
        await tx.vehicle.update({
          where: { id: data.vehicleId },
          data: {
            status: status === ContractStatus.ARREARS ? 'ARREARS' : 'ACTIVE',
          },
        });
      }

      return created;
    });

    return withFinanceSummary(contract);
  }

  async findAll(query: ListContractsQuery) {
    const contracts = await this.prisma.contract.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(query.search
          ? {
              OR: [
                {
                  client: {
                    firstName: { contains: query.search, mode: 'insensitive' },
                  },
                },
                {
                  client: {
                    lastName: { contains: query.search, mode: 'insensitive' },
                  },
                },
                {
                  vehicle: {
                    registration: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  vehicle: {
                    vin: { contains: query.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: this.contractInclude,
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    });

    return contracts.map((contract) => withFinanceSummary(contract));
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: this.contractInclude,
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }
    return withFinanceSummary(contract);
  }

  async update(id: string, data: UpdateContractDto) {
    const existing = await this.findOne(id);

    const monthlyRate =
      data.monthlyRate !== undefined
        ? new Prisma.Decimal(data.monthlyRate)
        : undefined;
    const depositAmount =
      data.depositAmount !== undefined
        ? new Prisma.Decimal(data.depositAmount ?? 0)
        : undefined;
    const balloonAmount =
      data.balloonAmount !== undefined
        ? data.balloonAmount == null || data.balloonAmount === ''
          ? null
          : new Prisma.Decimal(data.balloonAmount)
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: {
          ...(data.planType ? { planType: data.planType } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.termMonths !== undefined
            ? { termMonths: data.termMonths }
            : {}),
          ...(monthlyRate ? { monthlyRate } : {}),
          ...(depositAmount ? { depositAmount } : {}),
          ...(balloonAmount !== undefined ? { balloonAmount } : {}),
          ...(data.cipPercent !== undefined
            ? { cipPercent: data.cipPercent }
            : {}),
          ...(data.startDate ? { startDate: data.startDate } : {}),
          ...(data.endDate ? { endDate: data.endDate } : {}),
          ...(data.monthlyKmLimit !== undefined
            ? { monthlyKmLimit: data.monthlyKmLimit }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
      });

      if (data.status === ContractStatus.ACTIVE) {
        await tx.vehicle.update({
          where: { id: existing.vehicleId },
          data: { status: 'ACTIVE' },
        });
      }
      if (data.status === ContractStatus.ARREARS) {
        await tx.vehicle.update({
          where: { id: existing.vehicleId },
          data: { status: 'ARREARS' },
        });
      }
      if (data.status === ContractStatus.COMPLETED) {
        await tx.vehicle.update({
          where: { id: existing.vehicleId },
          data: { status: 'PAID_UP' },
        });
      }
    });

    const refreshed = await this.recalculateBalances(id);
    return withFinanceSummary(refreshed);
  }

  async remove(id: string) {
    const contract = await this.findOne(id);
    if (contract.status === ContractStatus.ACTIVE) {
      throw new BadRequestException('Cancel active contracts before deleting');
    }
    await this.prisma.contract.update({
      where: { id },
      data: { status: ContractStatus.CANCELLED },
    });
    return this.findOne(id);
  }

  async profitability() {
    const vehicles = await this.prisma.vehicle.findMany({
      include: {
        contracts: {
          include: { ledger: true },
        },
      },
      orderBy: [{ make: 'asc' }, { model: 'asc' }],
    });

    return vehicles.map((vehicle) => {
      const rentalIncome = vehicle.contracts.reduce((sum, contract) => {
        return sum.add(sumPaidIncome(contract.ledger));
      }, new Prisma.Decimal(0));

      const maintenanceAndFees = vehicle.contracts.reduce((sum, contract) => {
        return sum.add(
          contract.ledger.reduce((ledgerSum, entry) => {
            if (
              !['MAINTENANCE', 'FINE', 'TOLL', 'ADMIN_FEE'].includes(entry.type)
            ) {
              return ledgerSum;
            }
            if (!['ON_TIME', 'EARLY', 'LATE'].includes(entry.status)) {
              return ledgerSum;
            }
            return ledgerSum.add(entry.amount);
          }, new Prisma.Decimal(0)),
        );
      }, new Prisma.Decimal(0));

      const purchasePrice = new Prisma.Decimal(vehicle.purchasePrice);
      const totalCost = purchasePrice.add(maintenanceAndFees);
      const profit = rentalIncome.sub(totalCost);
      const roiPercent = totalCost.eq(0)
        ? new Prisma.Decimal(0)
        : profit.div(totalCost).mul(100);

      return {
        vehicleId: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        registration: vehicle.registration,
        status: vehicle.status,
        purchasePrice: purchasePrice.toFixed(2),
        maintenanceAndFees: maintenanceAndFees.toFixed(2),
        totalCost: totalCost.toFixed(2),
        rentalIncome: rentalIncome.toFixed(2),
        profit: profit.toFixed(2),
        roiPercent: roiPercent.toFixed(1),
        contractCount: vehicle.contracts.length,
      };
    });
  }

  async pendingFines() {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        type: { in: ['FINE', 'TOLL'] },
        status: 'PENDING',
      },
      include: {
        contract: {
          include: {
            client: true,
            vehicle: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return entries.map((entry) => ({
      id: entry.id,
      type: entry.type as 'FINE' | 'TOLL',
      amount: Number(entry.amount).toFixed(2),
      status: entry.status,
      dueDate: entry.dueDate?.toISOString() ?? null,
      description: entry.description,
      contractId: entry.contractId,
      client: {
        id: entry.contract.client.id,
        firstName: entry.contract.client.firstName,
        lastName: entry.contract.client.lastName,
      },
      vehicle: entry.contract.vehicle
        ? {
            id: entry.contract.vehicle.id,
            registration: entry.contract.vehicle.registration,
            make: entry.contract.vehicle.make,
            model: entry.contract.vehicle.model,
          }
        : null,
    }));
  }
}
