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
  isCostLedgerType,
  isIncomeLedgerType,
  sumExpectedIncome,
  sumOutstandingIncome,
  sumRecognizedCosts,
  sumPaidIncome,
  withFinanceSummary,
} from '../finance/finance.utils';
import {
  CreateContractDto,
  ListContractsQuery,
  UpdateContractDto,
} from './contracts.schemas';

function eachMonthStart(from: Date, to: Date): Date[] {
  const months: Date[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function dueInMonth(
  due: Date | null | undefined,
  monthStart: Date,
): boolean {
  if (!due) return false;
  return (
    due.getFullYear() === monthStart.getFullYear() &&
    due.getMonth() === monthStart.getMonth()
  );
}

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

  async profitability(range?: { from?: string; to?: string }) {
    const from = range?.from ? new Date(range.from) : null;
    const to = range?.to ? new Date(range.to) : null;
    if (to && !Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
    }
    const periodMode = Boolean(from || to);

    const inRangeByDue = (entry: {
      type: Parameters<typeof isCostLedgerType>[0];
      paidAt: Date | null;
      dueDate: Date | null;
      createdAt: Date;
    }) => {
      if (!periodMode) return true;
      // Period views key off due date so full-month expected includes future dues.
      const stamp =
        isCostLedgerType(entry.type) || isIncomeLedgerType(entry.type)
          ? (entry.dueDate ?? entry.paidAt ?? entry.createdAt)
          : (entry.paidAt ?? entry.dueDate ?? entry.createdAt);
      if (from && stamp < from) return false;
      if (to && stamp > to) return false;
      return true;
    };

    const vehicles = await this.prisma.vehicle.findMany({
      include: {
        contracts: {
          include: { ledger: true },
        },
      },
      orderBy: [{ make: 'asc' }, { model: 'asc' }],
    });

    const monthsInRange =
      periodMode && from && to ? eachMonthStart(from, to) : [];

    return vehicles.map((vehicle) => {
      const allLedger = vehicle.contracts.flatMap((contract) => contract.ledger);
      const periodLedger = periodMode
        ? allLedger.filter(inRangeByDue)
        : allLedger;

      let rentalIncome = sumPaidIncome(periodLedger);
      let outstandingIncome = sumOutstandingIncome(periodLedger);
      let expectedIncome = sumExpectedIncome(periodLedger);

      if (!periodMode) {
        // Lifetime forecast: full deal economics (every scheduled month + deposit + balloon),
        // not only ledger lines raised so far.
        let contractualExpected = new Prisma.Decimal(0);
        for (const contract of vehicle.contracts) {
          if (
            contract.status === ContractStatus.CANCELLED ||
            contract.status === ContractStatus.DRAFT
          ) {
            continue;
          }
          contractualExpected = contractualExpected.add(
            expectedContractTotal({
              monthlyRate: contract.monthlyRate,
              termMonths: contract.termMonths,
              depositAmount: contract.depositAmount,
              balloonAmount: contract.balloonAmount,
            }),
          );
        }
        expectedIncome = contractualExpected;
        outstandingIncome = Prisma.Decimal.max(
          contractualExpected.sub(rentalIncome),
          new Prisma.Decimal(0),
        );
      }

      // Schedule gap: active contracts still expect monthly rent even if the
      // ledger line for a month in-range has not been created yet.
      if (periodMode && monthsInRange.length > 0) {
        for (const contract of vehicle.contracts) {
          if (
            contract.status !== ContractStatus.ACTIVE &&
            contract.status !== ContractStatus.ARREARS
          ) {
            continue;
          }
          const rate = new Prisma.Decimal(contract.monthlyRate);
          for (const monthStart of monthsInRange) {
            const monthEnd = new Date(
              monthStart.getFullYear(),
              monthStart.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
            if (contract.startDate > monthEnd) continue;
            if (contract.endDate < monthStart) continue;

            const hasRentalDue = contract.ledger.some(
              (entry) =>
                entry.type === 'RENTAL_PAYMENT' &&
                dueInMonth(entry.dueDate, monthStart),
            );
            if (hasRentalDue) continue;

            expectedIncome = expectedIncome.add(rate);
            outstandingIncome = outstandingIncome.add(rate);
          }
        }
      }

      // Include pending fines/fees — period views were dropping all unpaid costs.
      const maintenanceAndFees = sumRecognizedCosts(periodLedger);
      const purchasePrice = new Prisma.Decimal(vehicle.purchasePrice);
      // Period view: operating P&L only. Lifetime: include purchase capital.
      const totalCost = periodMode
        ? maintenanceAndFees
        : purchasePrice.add(maintenanceAndFees);
      const profit = rentalIncome.sub(totalCost);
      const forecastProfit = expectedIncome.sub(totalCost);
      const roiPercent = totalCost.eq(0)
        ? null
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
        outstandingIncome: outstandingIncome.toFixed(2),
        expectedIncome: expectedIncome.toFixed(2),
        profit: profit.toFixed(2),
        forecastProfit: forecastProfit.toFixed(2),
        roiPercent: roiPercent == null ? null : roiPercent.toFixed(1),
        contractCount: vehicle.contracts.length,
        mode: periodMode ? 'period' : 'lifetime',
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      };
    });
  }

  /**
   * Month-on-month operating totals for finance charts.
   * Each bucket uses the same period rules as profitability({ from, to }).
   */
  async profitabilityTrend(months = 6) {
    const count = Math.min(Math.max(Math.floor(months), 3), 24);
    const now = new Date();
    const series: Array<{
      key: string;
      label: string;
      year: number;
      month: number;
      received: string;
      costs: string;
      expected: string;
      owed: string;
      profit: string;
      forecastProfit: string;
    }> = [];

    for (let i = count - 1; i >= 0; i -= 1) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
      );
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);
      const rows = await this.profitability({ from: fromStr, to: toStr });

      let received = new Prisma.Decimal(0);
      let costs = new Prisma.Decimal(0);
      let expected = new Prisma.Decimal(0);
      let owed = new Prisma.Decimal(0);
      for (const row of rows) {
        received = received.add(row.rentalIncome);
        costs = costs.add(row.totalCost);
        expected = expected.add(row.expectedIncome);
        owed = owed.add(row.outstandingIncome);
      }
      const profit = received.sub(costs);
      const forecastProfit = expected.sub(costs);

      series.push({
        key: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
        label: from.toLocaleString('en-ZA', { month: 'short' }),
        year: from.getFullYear(),
        month: from.getMonth() + 1,
        received: received.toFixed(2),
        costs: costs.toFixed(2),
        expected: expected.toFixed(2),
        owed: owed.toFixed(2),
        profit: profit.toFixed(2),
        forecastProfit: forecastProfit.toFixed(2),
      });
    }

    return { months: count, series };
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
