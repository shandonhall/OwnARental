import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContractStatus,
  LedgerEntryStatus,
  LedgerEntryType,
  TelematicsEventType,
  VehicleStatus,
} from '../generated/prisma/enums';

const ATTENTION_LIMIT = 8;
const WINS_LIMIT = 6;
const EARLY_LOOKBACK_DAYS = 45;
const COMPLETED_LOOKBACK_DAYS = 90;
const SERVICE_DUE_DAYS = 14;
const BREACH_LOOKBACK_DAYS = 7;

const FLEET_STATUS_ORDER: VehicleStatus[] = [
  VehicleStatus.ACTIVE,
  VehicleStatus.ARREARS,
  VehicleStatus.AVAILABLE,
  VehicleStatus.PAID_UP,
  VehicleStatus.RETURNED,
  VehicleStatus.WRITTEN_OFF,
];

export type DashboardAlert = {
  id: string;
  kind:
    | 'MISSED_PAYMENT'
    | 'ARREARS'
    | 'LATE_PAYMENT'
    | 'PENDING_FINE'
    | 'SERVICE_DUE'
    | 'RULE_BREACH';
  severity: 'high' | 'medium';
  title: string;
  detail: string;
  amount: string | null;
  date: string | null;
  client: { id: string; firstName: string; lastName: string } | null;
  contractId: string | null;
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
  } | null;
};

export type DashboardWin = {
  id: string;
  kind: 'EARLY_PAYMENT' | 'PAID_UP';
  title: string;
  detail: string;
  amount: string | null;
  date: string | null;
  client: { id: string; firstName: string; lastName: string };
  contractId: string;
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
  } | null;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const earlySince = new Date(now);
    earlySince.setDate(earlySince.getDate() - EARLY_LOOKBACK_DAYS);

    const completedSince = new Date(now);
    completedSince.setDate(completedSince.getDate() - COMPLETED_LOOKBACK_DAYS);

    const breachSince = new Date(now);
    breachSince.setDate(breachSince.getDate() - BREACH_LOOKBACK_DAYS);

    const [
      overduePayments,
      latePayments,
      arrearsContracts,
      pendingFines,
      earlyPayments,
      completedContracts,
      vehicles,
      recentBreaches,
    ] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: {
          type: LedgerEntryType.RENTAL_PAYMENT,
          status: LedgerEntryStatus.PENDING,
          dueDate: { lt: startOfToday },
          contract: {
            status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
          },
        },
        include: {
          contract: {
            include: {
              client: true,
              vehicle: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          type: LedgerEntryType.RENTAL_PAYMENT,
          status: LedgerEntryStatus.LATE,
          paidAt: { gte: earlySince },
        },
        include: {
          contract: {
            include: {
              client: true,
              vehicle: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: 10,
      }),
      this.prisma.contract.findMany({
        where: { status: ContractStatus.ARREARS },
        include: { client: true, vehicle: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          type: { in: [LedgerEntryType.FINE, LedgerEntryType.TOLL] },
          status: LedgerEntryStatus.PENDING,
        },
        include: {
          contract: {
            include: {
              client: true,
              vehicle: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          type: {
            in: [
              LedgerEntryType.RENTAL_PAYMENT,
              LedgerEntryType.DEPOSIT,
              LedgerEntryType.BALLOON_PAYMENT,
            ],
          },
          status: LedgerEntryStatus.EARLY,
          paidAt: { gte: earlySince },
        },
        include: {
          contract: {
            include: {
              client: true,
              vehicle: true,
            },
          },
        },
        orderBy: { paidAt: 'desc' },
        take: 20,
      }),
      this.prisma.contract.findMany({
        where: {
          status: ContractStatus.COMPLETED,
          updatedAt: { gte: completedSince },
        },
        include: { client: true, vehicle: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      this.prisma.vehicle.findMany({
        include: {
          contracts: {
            where: {
              status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
            },
            include: { client: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ status: 'asc' }, { registration: 'asc' }],
      }),
      this.prisma.telematicsEvent.findMany({
        where: {
          type: TelematicsEventType.RULE_BREACH,
          recordedAt: { gte: breachSince },
        },
        include: {
          vehicle: {
            include: {
              contracts: {
                where: {
                  status: {
                    in: [ContractStatus.ACTIVE, ContractStatus.ARREARS],
                  },
                },
                include: { client: true },
                take: 1,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: { recordedAt: 'desc' },
        take: 10,
      }),
    ]);

    const attention: DashboardAlert[] = [];
    const seenAttention = new Set<string>();

    const pushAttention = (item: DashboardAlert) => {
      if (seenAttention.has(item.id) || attention.length >= ATTENTION_LIMIT) {
        return;
      }
      seenAttention.add(item.id);
      attention.push(item);
    };

    for (const entry of overduePayments) {
      const days = entry.dueDate
        ? Math.max(
            1,
            Math.ceil(
              (startOfToday.getTime() - entry.dueDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : null;
      pushAttention({
        id: `missed-${entry.id}`,
        kind: 'MISSED_PAYMENT',
        severity: 'high',
        title: `${entry.contract.client.firstName} ${entry.contract.client.lastName}`,
        detail:
          days != null
            ? `Missed rental · ${days} day${days === 1 ? '' : 's'} overdue`
            : 'Missed rental payment',
        amount: Number(entry.amount).toFixed(2),
        date: entry.dueDate?.toISOString() ?? null,
        client: {
          id: entry.contract.client.id,
          firstName: entry.contract.client.firstName,
          lastName: entry.contract.client.lastName,
        },
        contractId: entry.contractId,
        vehicle: entry.contract.vehicle
          ? {
              id: entry.contract.vehicle.id,
              registration: entry.contract.vehicle.registration,
              make: entry.contract.vehicle.make,
              model: entry.contract.vehicle.model,
            }
          : null,
      });
    }

    for (const contract of arrearsContracts) {
      pushAttention({
        id: `arrears-${contract.id}`,
        kind: 'ARREARS',
        severity: 'high',
        title: `${contract.client.firstName} ${contract.client.lastName}`,
        detail: `Contract in arrears · ${contract.vehicle.registration}`,
        amount: Number(contract.outstandingBalance).toFixed(2),
        date: contract.updatedAt.toISOString(),
        client: {
          id: contract.client.id,
          firstName: contract.client.firstName,
          lastName: contract.client.lastName,
        },
        contractId: contract.id,
        vehicle: {
          id: contract.vehicle.id,
          registration: contract.vehicle.registration,
          make: contract.vehicle.make,
          model: contract.vehicle.model,
        },
      });
    }

    for (const entry of latePayments) {
      pushAttention({
        id: `late-${entry.id}`,
        kind: 'LATE_PAYMENT',
        severity: 'medium',
        title: `${entry.contract.client.firstName} ${entry.contract.client.lastName}`,
        detail: 'Paid late this month',
        amount: Number(entry.amount).toFixed(2),
        date: entry.paidAt?.toISOString() ?? null,
        client: {
          id: entry.contract.client.id,
          firstName: entry.contract.client.firstName,
          lastName: entry.contract.client.lastName,
        },
        contractId: entry.contractId,
        vehicle: entry.contract.vehicle
          ? {
              id: entry.contract.vehicle.id,
              registration: entry.contract.vehicle.registration,
              make: entry.contract.vehicle.make,
              model: entry.contract.vehicle.model,
            }
          : null,
      });
    }

    for (const entry of pendingFines) {
      pushAttention({
        id: `fine-${entry.id}`,
        kind: 'PENDING_FINE',
        severity: 'medium',
        title: `${entry.contract.client.firstName} ${entry.contract.client.lastName}`,
        detail:
          entry.type === LedgerEntryType.TOLL
            ? 'Outstanding toll'
            : 'Outstanding fine',
        amount: Number(entry.amount).toFixed(2),
        date: entry.dueDate?.toISOString() ?? null,
        client: {
          id: entry.contract.client.id,
          firstName: entry.contract.client.firstName,
          lastName: entry.contract.client.lastName,
        },
        contractId: entry.contractId,
        vehicle: entry.contract.vehicle
          ? {
              id: entry.contract.vehicle.id,
              registration: entry.contract.vehicle.registration,
              make: entry.contract.vehicle.make,
              model: entry.contract.vehicle.model,
            }
          : null,
      });
    }

    for (const event of recentBreaches) {
      const contract = event.vehicle.contracts[0] ?? null;
      const severityRaw =
        event.payload &&
        typeof event.payload === 'object' &&
        !Array.isArray(event.payload) &&
        'severity' in event.payload
          ? String((event.payload as { severity?: unknown }).severity)
          : 'medium';
      pushAttention({
        id: `breach-${event.id}`,
        kind: 'RULE_BREACH',
        severity: severityRaw === 'high' ? 'high' : 'medium',
        title: event.vehicle.registration,
        detail: event.message ?? 'Telematics rule breach',
        amount: null,
        date: event.recordedAt.toISOString(),
        client: contract?.client
          ? {
              id: contract.client.id,
              firstName: contract.client.firstName,
              lastName: contract.client.lastName,
            }
          : null,
        contractId: contract?.id ?? null,
        vehicle: {
          id: event.vehicle.id,
          registration: event.vehicle.registration,
          make: event.vehicle.make,
          model: event.vehicle.model,
        },
      });
    }

    for (const vehicle of vehicles) {
      if (!vehicle.nextServiceDueDate) continue;
      const daysUntil = Math.ceil(
        (vehicle.nextServiceDueDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysUntil > SERVICE_DUE_DAYS) continue;
      const contract = vehicle.contracts[0] ?? null;
      pushAttention({
        id: `service-${vehicle.id}`,
        kind: 'SERVICE_DUE',
        severity: daysUntil <= 3 ? 'high' : 'medium',
        title: vehicle.registration,
        detail:
          daysUntil < 0
            ? `Service overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'}`
            : daysUntil === 0
              ? 'Service due today'
              : `Service due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
        amount: null,
        date: vehicle.nextServiceDueDate.toISOString(),
        client: contract?.client
          ? {
              id: contract.client.id,
              firstName: contract.client.firstName,
              lastName: contract.client.lastName,
            }
          : null,
        contractId: contract?.id ?? null,
        vehicle: {
          id: vehicle.id,
          registration: vehicle.registration,
          make: vehicle.make,
          model: vehicle.model,
        },
      });
    }

    const wins: DashboardWin[] = [];

    for (const entry of earlyPayments) {
      if (wins.length >= WINS_LIMIT) break;
      wins.push({
        id: `early-${entry.id}`,
        kind: 'EARLY_PAYMENT',
        title: `${entry.contract.client.firstName} ${entry.contract.client.lastName}`,
        detail: 'Paid early',
        amount: Number(entry.amount).toFixed(2),
        date: entry.paidAt?.toISOString() ?? null,
        client: {
          id: entry.contract.client.id,
          firstName: entry.contract.client.firstName,
          lastName: entry.contract.client.lastName,
        },
        contractId: entry.contractId,
        vehicle: entry.contract.vehicle
          ? {
              id: entry.contract.vehicle.id,
              registration: entry.contract.vehicle.registration,
              make: entry.contract.vehicle.make,
              model: entry.contract.vehicle.model,
            }
          : null,
      });
    }

    for (const contract of completedContracts) {
      if (wins.length >= WINS_LIMIT) break;
      wins.push({
        id: `paidup-${contract.id}`,
        kind: 'PAID_UP',
        title: `${contract.client.firstName} ${contract.client.lastName}`,
        detail: `Paid up · ${contract.vehicle.registration}`,
        amount: null,
        date: contract.updatedAt.toISOString(),
        client: {
          id: contract.client.id,
          firstName: contract.client.firstName,
          lastName: contract.client.lastName,
        },
        contractId: contract.id,
        vehicle: {
          id: contract.vehicle.id,
          registration: contract.vehicle.registration,
          make: contract.vehicle.make,
          model: contract.vehicle.model,
        },
      });
    }

    const statusCounts = Object.fromEntries(
      FLEET_STATUS_ORDER.map((status) => [status, 0]),
    ) as Record<VehicleStatus, number>;

    let immobilized = 0;
    let driverScoreSum = 0;
    let driverScoreCount = 0;
    let onContract = 0;

    const fleetVehicles = vehicles.map((vehicle) => {
      statusCounts[vehicle.status] += 1;
      if (vehicle.isImmobilized) immobilized += 1;
      if (vehicle.driverScore != null) {
        driverScoreSum += vehicle.driverScore;
        driverScoreCount += 1;
      }

      const contract = vehicle.contracts[0] ?? null;
      if (contract) onContract += 1;

      return {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        registration: vehicle.registration,
        status: vehicle.status,
        currentOdometerKm: vehicle.currentOdometerKm,
        driverScore: vehicle.driverScore,
        isImmobilized: vehicle.isImmobilized,
        contractId: contract?.id ?? null,
        planType: contract?.planType ?? null,
        client: contract
          ? {
              id: contract.client.id,
              firstName: contract.client.firstName,
              lastName: contract.client.lastName,
            }
          : null,
      };
    });

    const total = vehicles.length;
    const available = statusCounts.AVAILABLE;
    const active = statusCounts.ACTIVE;
    const arrears = statusCounts.ARREARS;
    const paidUp = statusCounts.PAID_UP;
    const utilizationPercent =
      total > 0
        ? Math.round(((active + arrears) / total) * 1000) / 10
        : 0;

    const byStatus = FLEET_STATUS_ORDER.map((status) => {
      const count = statusCounts[status];
      return {
        status,
        count,
        percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
    }).filter((row) => row.count > 0);

    const paymentAlerts = attention.filter((item) =>
      ['MISSED_PAYMENT', 'ARREARS', 'LATE_PAYMENT'].includes(item.kind),
    ).length;
    const serviceDueCount = attention.filter(
      (item) => item.kind === 'SERVICE_DUE',
    ).length;

    const termHorizon = new Date(now);
    termHorizon.setDate(termHorizon.getDate() + 90);
    const contractsNearingCompletion = await this.prisma.contract.count({
      where: {
        status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
        endDate: { gte: startOfToday, lte: termHorizon },
      },
    });

    const activeFleet = active + arrears;

    return {
      generatedAt: now.toISOString(),
      summary: {
        attentionCount: attention.length,
        winsCount: wins.length,
        fleetTotal: total,
        onContract,
        available,
        arrears,
        utilizationPercent,
        activeFleet,
        paymentAlerts,
        serviceDue: serviceDueCount,
        contractsNearingCompletion,
      },
      kpi: {
        activeFleet,
        paymentAlerts,
        serviceDue: serviceDueCount,
        contractsNearingCompletion,
        utilizationPercent,
      },
      fleet: {
        total,
        onContract,
        available,
        active,
        arrears,
        paidUp,
        immobilized,
        utilizationPercent,
        averageDriverScore:
          driverScoreCount > 0
            ? Math.round((driverScoreSum / driverScoreCount) * 10) / 10
            : null,
        byStatus,
        vehicles: fleetVehicles,
      },
      attention,
      wins,
    };
  }
}
