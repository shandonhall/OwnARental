import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';
import {
  ContractStatus,
  LedgerEntryStatus,
  LedgerEntryType,
  Role,
  TelematicsEventType,
  VehicleStatus,
} from '../generated/prisma/enums';
import { hasPermission, Permission } from '../auth/permissions';
import { NON_TERMINAL_LICENCE_STATUSES } from '../licences/licence.constants';
import { licenceUrgencyForExpiry } from '../licences/licence.urgency';
import { LicenceRenewalStatus } from '../generated/prisma/enums';

export type TaskCategory = 'collections' | 'driver' | 'end_of_term' | 'fleet';

type TaskKind =
  | 'MISSED_PAYMENT'
  | 'ARREARS'
  | 'LATE_PAYMENT'
  | 'PENDING_FINE'
  | 'SERVICE_DUE'
  | 'RULE_BREACH'
  | 'END_OF_TERM'
  | 'LICENCE_DUE';

function taskCategory(kind: TaskKind): TaskCategory {
  if (kind === 'RULE_BREACH') return 'driver';
  if (kind === 'END_OF_TERM') return 'end_of_term';
  if (kind === 'SERVICE_DUE' || kind === 'LICENCE_DUE') return 'fleet';
  return 'collections';
}

function assigneeRoleForCategory(category: TaskCategory): Role {
  if (category === 'driver' || category === 'fleet') {
    return Role.FLEET_MANAGER;
  }
  return Role.ADMIN;
}

function isAdminViewer(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

function isFinanceViewer(role: Role) {
  return role === Role.FINANCE || isAdminViewer(role);
}

const ATTENTION_LIMIT = 40;
const WINS_LIMIT = 6;
const EARLY_LOOKBACK_DAYS = 45;
const COMPLETED_LOOKBACK_DAYS = 90;
const SERVICE_DUE_DAYS = 14;
const BREACH_LOOKBACK_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
    | 'RULE_BREACH'
    | 'LICENCE_DUE';
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

  async getOverview(viewer: User) {
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
      activeClients,
      openContracts,
      staffUsers,
      openLicences,
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
      this.prisma.client.findMany({
        where: { isActive: true },
        select: { id: true, city: true, province: true },
      }),
      this.prisma.contract.findMany({
        where: {
          status: {
            in: [
              ContractStatus.DRAFT,
              ContractStatus.ACTIVE,
              ContractStatus.ARREARS,
              ContractStatus.COMPLETED,
            ],
          },
        },
        select: {
          id: true,
          status: true,
          endDate: true,
          endOfTermNotifiedAt: true,
          clientId: true,
          client: {
            select: { id: true, firstName: true, lastName: true },
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
      this.prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.licenceRenewal.findMany({
        where: {
          status: {
            in: [...NON_TERMINAL_LICENCE_STATUSES] as LicenceRenewalStatus[],
          },
        },
        include: {
          vehicle: {
            select: {
              id: true,
              registration: true,
              make: true,
              model: true,
            },
          },
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: 80,
      }),
    ]);

    const staffByRole: Record<
      Role,
      Array<{
        id: string;
        fullName: string;
        email: string;
        role: Role;
      }>
    > = {
      [Role.SUPER_ADMIN]: [],
      [Role.ADMIN]: [],
      [Role.FLEET_MANAGER]: [],
      [Role.SALES]: [],
      [Role.FINANCE]: [],
    };
    for (const staff of staffUsers) {
      staffByRole[staff.role].push(staff);
    }

    const pickAssignee = (role: Role, index: number) => {
      const pool =
        role === Role.ADMIN
          ? [...staffByRole[Role.ADMIN], ...staffByRole[Role.SUPER_ADMIN]]
          : staffByRole[role];
      if (pool.length === 0) {
        return {
          userId: null as string | null,
          fullName:
            role === Role.FLEET_MANAGER ? 'Fleet Manager desk' : 'Admin desk',
          role,
          unassigned: true,
        };
      }
      const person = pool[index % pool.length];
      return {
        userId: person.id,
        fullName: person.fullName,
        role: person.role,
        unassigned: false,
      };
    };

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

    const licenceCounts = { expired: 0, due30: 0, due60: 0 };
    for (const renewal of openLicences) {
      const { daysRemaining, urgency } = licenceUrgencyForExpiry(
        renewal.expiryDate,
        now,
      );
      if (urgency === 'EXPIRED') licenceCounts.expired += 1;
      else if (urgency === 'ACTION_30') licenceCounts.due30 += 1;
      else if (urgency === 'WARN_60') licenceCounts.due60 += 1;

      if (
        urgency !== 'WARN_60' &&
        urgency !== 'ACTION_30' &&
        urgency !== 'EXPIRED'
      ) {
        continue;
      }

      pushAttention({
        id: `licence-${renewal.id}`,
        kind: 'LICENCE_DUE',
        severity: urgency === 'WARN_60' ? 'medium' : 'high',
        title: renewal.vehicle.registration,
        detail:
          urgency === 'EXPIRED'
            ? `Licence expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`
            : `Licence due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
        amount: null,
        date: renewal.expiryDate.toISOString(),
        client: renewal.client
          ? {
              id: renewal.client.id,
              firstName: renewal.client.firstName,
              lastName: renewal.client.lastName,
            }
          : null,
        contractId: null,
        vehicle: {
          id: renewal.vehicle.id,
          registration: renewal.vehicle.registration,
          make: renewal.vehicle.make,
          model: renewal.vehicle.model,
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
      total > 0 ? Math.round(((active + arrears) / total) * 1000) / 10 : 0;

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

    const pendingFineCount = pendingFines.length;
    const attentionClientIds = new Set(
      attention
        .map((item) => item.client?.id)
        .filter((id): id is string => id != null),
    );

    const geographyMap = new Map<string, number>();
    for (const client of activeClients) {
      const area = (client.city || client.province || 'Unknown').trim();
      geographyMap.set(area, (geographyMap.get(area) ?? 0) + 1);
    }
    const geography = [...geographyMap.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    let healthy = 0;
    let ending = 0;
    let needsAttention = 0;
    const endOfTerm = {
      watch: 0,
      finalNinety: 0,
      contacted: 0,
      closing: 0,
      completed: 0,
    };
    const endingClients: Array<{
      clientId: string;
      firstName: string;
      lastName: string;
      contractId: string;
      registration: string;
      daysRemaining: number;
    }> = [];

    const contractHealthByStatus: Record<string, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      ARREARS: 0,
      COMPLETED: 0,
    };

    for (const contract of openContracts) {
      if (contract.status in contractHealthByStatus) {
        contractHealthByStatus[contract.status] += 1;
      }

      const daysLeft = Math.ceil(
        (contract.endDate.getTime() - now.getTime()) / MS_PER_DAY,
      );

      if (contract.status === ContractStatus.COMPLETED) {
        endOfTerm.completed += 1;
        continue;
      }

      if (
        contract.status === ContractStatus.ACTIVE ||
        contract.status === ContractStatus.ARREARS
      ) {
        if (attentionClientIds.has(contract.clientId)) {
          needsAttention += 1;
        } else if (daysLeft <= 90) {
          ending += 1;
          endingClients.push({
            clientId: contract.client.id,
            firstName: contract.client.firstName,
            lastName: contract.client.lastName,
            contractId: contract.id,
            registration: contract.vehicle.registration,
            daysRemaining: daysLeft,
          });
        } else {
          healthy += 1;
        }

        if (contract.endOfTermNotifiedAt) {
          endOfTerm.contacted += 1;
        } else if (daysLeft <= 30) {
          endOfTerm.closing += 1;
        } else if (daysLeft <= 90) {
          endOfTerm.finalNinety += 1;
        } else if (daysLeft <= 180) {
          endOfTerm.watch += 1;
        }
      }
    }

    endingClients.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const categoryCounters: Record<TaskCategory, number> = {
      collections: 0,
      driver: 0,
      end_of_term: 0,
      fleet: 0,
    };

    const buildTask = (input: {
      id: string;
      label: string;
      severity: 'high' | 'medium';
      contractId: string | null;
      clientId: string | null;
      kind: TaskKind;
      advancePipelineTo?: string | null;
    }) => {
      const category = taskCategory(input.kind);
      const assigneeRole = assigneeRoleForCategory(category);
      const assignee = pickAssignee(assigneeRole, categoryCounters[category]++);
      return {
        id: input.id,
        label: input.label,
        severity: input.severity,
        contractId: input.contractId,
        clientId: input.clientId,
        kind: input.kind,
        category,
        assigneeRole,
        assignee,
        advancePipelineTo: input.advancePipelineTo ?? null,
      };
    };

    const allTasks = [
      ...attention
        .filter(
          (item) =>
            item.kind === 'SERVICE_DUE' ||
            item.kind === 'LICENCE_DUE' ||
            item.kind === 'RULE_BREACH' ||
            (item.client && item.contractId),
        )
        .map((item) =>
          buildTask({
            id: item.id,
            label: `${item.title} — ${item.detail}`,
            severity: item.severity,
            contractId: item.contractId,
            clientId: item.client?.id ?? null,
            kind: item.kind,
            advancePipelineTo: null,
          }),
        ),
      ...endingClients.map((item) =>
        buildTask({
          id: `eot-${item.contractId}`,
          label: `End of term — contact ${item.firstName} ${item.lastName} (${item.registration}, ${item.daysRemaining}d)`,
          severity: 'medium',
          contractId: item.contractId,
          clientId: item.clientId,
          kind: 'END_OF_TERM',
          advancePipelineTo: 'CONTACTED',
        }),
      ),
    ];

    const adminView = isAdminViewer(viewer.role);
    const financeView = isFinanceViewer(viewer.role);
    const canSeeFinanceDetail = hasPermission(
      viewer.role,
      Permission.FINANCE_READ,
    );
    const myTasks = allTasks.filter((task) => {
      if (adminView) return true;
      if (financeView && task.category === 'collections') return true;
      if (task.assignee.userId && task.assignee.userId === viewer.id) {
        return true;
      }
      return task.assigneeRole === viewer.role;
    });

    const tasksByCategory = {
      collections: myTasks.filter((t) => t.category === 'collections'),
      driver: myTasks.filter((t) => t.category === 'driver'),
      end_of_term: myTasks.filter((t) => t.category === 'end_of_term'),
      fleet: myTasks.filter((t) => t.category === 'fleet'),
    };

    const isLicenceOperator =
      viewer.role === Role.SUPER_ADMIN ||
      viewer.role === Role.ADMIN ||
      viewer.role === Role.FLEET_MANAGER;

    const canReadLeads = hasPermission(viewer.role, Permission.LEADS_READ);
    const canAssignLeads = hasPermission(viewer.role, Permission.LEADS_ASSIGN);

    let leadsUnassigned = 0;
    let leadsNotAttempted = 0;
    let leadsMyNew = 0;
    let leadsMyNotAttempted = 0;

    if (canReadLeads) {
      if (canAssignLeads) {
        const [unassigned, notAttempted] = await Promise.all([
          this.prisma.lead.count({
            where: { archivedAt: null, assignedUserId: null },
          }),
          this.prisma.lead.count({
            where: {
              archivedAt: null,
              firstAttemptAt: null,
              stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
            },
          }),
        ]);
        leadsUnassigned = unassigned;
        leadsNotAttempted = notAttempted;
      } else {
        const [myNew, myNotAttempted] = await Promise.all([
          this.prisma.lead.count({
            where: {
              archivedAt: null,
              assignedUserId: viewer.id,
              stage: 'NEW',
            },
          }),
          this.prisma.lead.count({
            where: {
              archivedAt: null,
              assignedUserId: viewer.id,
              firstAttemptAt: null,
              stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
            },
          }),
        ]);
        leadsMyNew = myNew;
        leadsMyNotAttempted = myNotAttempted;
      }
    }

    const safeAttention = (
      canSeeFinanceDetail
        ? attention
        : attention.filter(
            (item) =>
              item.kind === 'SERVICE_DUE' ||
              item.kind === 'RULE_BREACH' ||
              item.kind === 'LICENCE_DUE',
          )
    ).filter((item) => item.kind !== 'LICENCE_DUE' || isLicenceOperator);

    const safeWins = canSeeFinanceDetail ? wins : [];
    const safeLicenceCounts = isLicenceOperator
      ? licenceCounts
      : { expired: 0, due30: 0, due60: 0 };

    return {
      generatedAt: now.toISOString(),
      viewer: {
        id: viewer.id,
        fullName: viewer.fullName,
        role: viewer.role,
        canSeeAllTasks: adminView,
      },
      summary: {
        attentionCount: safeAttention.length,
        winsCount: safeWins.length,
        fleetTotal: total,
        onContract,
        available,
        arrears: canSeeFinanceDetail ? arrears : 0,
        utilizationPercent,
        activeFleet,
        paymentAlerts: canSeeFinanceDetail ? paymentAlerts : 0,
        serviceDue: serviceDueCount,
        contractsNearingCompletion,
        pendingFineCount: canSeeFinanceDetail ? pendingFineCount : 0,
        licenceExpired: safeLicenceCounts.expired,
        licenceDue30: safeLicenceCounts.due30,
        licenceDue60: safeLicenceCounts.due60,
        leadsUnassigned,
        leadsNotAttempted,
        leadsMyNew,
        leadsMyNotAttempted,
      },
      kpi: {
        activeFleet,
        paymentAlerts: canSeeFinanceDetail ? paymentAlerts : 0,
        serviceDue: serviceDueCount,
        contractsNearingCompletion,
        utilizationPercent,
        licenceExpired: safeLicenceCounts.expired,
        licenceDue30: safeLicenceCounts.due30,
        licenceDue60: safeLicenceCounts.due60,
        leadsUnassigned,
        leadsNotAttempted,
        leadsMyNew,
        leadsMyNotAttempted,
      },
      fleet: {
        total,
        onContract,
        available,
        active,
        arrears: canSeeFinanceDetail ? arrears : 0,
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
      attention: safeAttention,
      wins: safeWins,
      analytics: {
        geography,
        contractHealth: {
          healthy,
          ending,
          needsAttention: canSeeFinanceDetail ? needsAttention : 0,
          byStatus: Object.entries(contractHealthByStatus)
            .map(([status, count]) => ({ status, count }))
            .filter((row) => row.count > 0),
        },
        endOfTerm,
        endingClients: canSeeFinanceDetail ? endingClients : [],
        pendingFineCount: canSeeFinanceDetail ? pendingFineCount : 0,
      },
      myTasks,
      tasksByCategory,
    };
  }
}
