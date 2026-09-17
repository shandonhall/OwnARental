import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  ContractStatus,
  LedgerEntryStatus,
  LedgerEntryType,
  NotificationKind,
  NotificationSeverity,
  TelematicsEventType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';
import type { ListNotificationsQuery } from './notifications.schemas';
import { NON_TERMINAL_LICENCE_STATUSES } from '../licences/licence.constants';
import { licenceUrgencyForExpiry } from '../licences/licence.urgency';
import { LicenceRenewalStatus } from '../generated/prisma/enums';

const SERVICE_DUE_DAYS = 14;
const BREACH_LOOKBACK_DAYS = 7;
const END_OF_TERM_DAYS = 90;

type SeedNotification = {
  dedupeKey: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  href: string | null;
  amount: Prisma.Decimal | null;
  entityType: string | null;
  entityId: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: User, query: ListNotificationsQuery) {
    await this.syncFromOperations();

    const notifications = await this.prisma.notification.findMany({
      where: { active: true },
      orderBy: [{ severity: 'asc' }, { updatedAt: 'desc' }],
      take: query.limit,
      include: {
        reads: {
          where: { userId: user.id },
          take: 1,
        },
      },
    });

    const items = notifications
      .map((notification) => {
        const readAt = notification.reads[0]?.readAt ?? null;
        return {
          id: notification.id,
          kind: notification.kind,
          severity: notification.severity,
          title: notification.title,
          detail: notification.detail,
          href: notification.href,
          amount:
            notification.amount != null
              ? Number(notification.amount).toFixed(2)
              : null,
          entityType: notification.entityType,
          entityId: notification.entityId,
          createdAt: notification.createdAt.toISOString(),
          updatedAt: notification.updatedAt.toISOString(),
          readAt: readAt?.toISOString() ?? null,
          isRead: Boolean(readAt),
        };
      })
      .sort((a, b) => Number(a.isRead) - Number(b.isRead));

    return {
      unreadCount: items.filter((item) => !item.isRead).length,
      items:
        query.includeRead === false
          ? items.filter((item) => !item.isRead)
          : items,
    };
  }

  async markRead(user: User, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || !notification.active) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    await this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId: user.id,
        },
      },
      create: {
        notificationId,
        userId: user.id,
      },
      update: {
        readAt: new Date(),
      },
    });

    return { ok: true };
  }

  async markAllRead(user: User) {
    await this.syncFromOperations();
    const active = await this.prisma.notification.findMany({
      where: { active: true },
      select: { id: true },
    });

    for (const notification of active) {
      await this.prisma.notificationRead.upsert({
        where: {
          notificationId_userId: {
            notificationId: notification.id,
            userId: user.id,
          },
        },
        create: {
          notificationId: notification.id,
          userId: user.id,
        },
        update: {
          readAt: new Date(),
        },
      });
    }

    return { ok: true, marked: active.length };
  }

  async syncFromOperations() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const breachSince = new Date(now);
    breachSince.setDate(breachSince.getDate() - BREACH_LOOKBACK_DAYS);

    const termHorizon = new Date(now);
    termHorizon.setDate(termHorizon.getDate() + END_OF_TERM_DAYS);

    const serviceHorizon = new Date(now);
    serviceHorizon.setDate(serviceHorizon.getDate() + SERVICE_DUE_DAYS);

    const [
      overduePayments,
      arrearsContracts,
      pendingFines,
      recentBreaches,
      serviceDueVehicles,
      nearingContracts,
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
          contract: { include: { client: true, vehicle: true } },
        },
        take: 40,
      }),
      this.prisma.contract.findMany({
        where: { status: ContractStatus.ARREARS },
        include: { client: true, vehicle: true },
        take: 20,
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          type: { in: [LedgerEntryType.FINE, LedgerEntryType.TOLL] },
          status: LedgerEntryStatus.PENDING,
        },
        include: {
          contract: { include: { client: true, vehicle: true } },
        },
        take: 20,
      }),
      this.prisma.telematicsEvent.findMany({
        where: {
          type: TelematicsEventType.RULE_BREACH,
          recordedAt: { gte: breachSince },
        },
        include: { vehicle: true },
        orderBy: { recordedAt: 'desc' },
        take: 20,
      }),
      this.prisma.vehicle.findMany({
        where: {
          nextServiceDueDate: { lte: serviceHorizon },
          status: {
            in: ['ACTIVE', 'ARREARS', 'AVAILABLE'],
          },
        },
        take: 30,
      }),
      this.prisma.contract.findMany({
        where: {
          status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
          endDate: { gte: startOfToday, lte: termHorizon },
        },
        include: { client: true, vehicle: true },
        take: 30,
      }),
      this.prisma.licenceRenewal.findMany({
        where: {
          status: {
            in: [...NON_TERMINAL_LICENCE_STATUSES] as LicenceRenewalStatus[],
          },
        },
        include: {
          vehicle: { select: { id: true, registration: true } },
        },
        take: 80,
      }),
    ]);

    const seeds: SeedNotification[] = [];

    for (const entry of overduePayments) {
      seeds.push({
        dedupeKey: `missed-${entry.id}`,
        kind: NotificationKind.MISSED_PAYMENT,
        severity: NotificationSeverity.HIGH,
        title: `${entry.contract.client.firstName} ${entry.contract.client.lastName}`,
        detail: 'Missed rental payment',
        href: `/contracts/${entry.contractId}`,
        amount: entry.amount,
        entityType: 'CONTRACT',
        entityId: entry.contractId,
      });
    }

    for (const contract of arrearsContracts) {
      seeds.push({
        dedupeKey: `arrears-${contract.id}`,
        kind: NotificationKind.ARREARS,
        severity: NotificationSeverity.HIGH,
        title: `${contract.client.firstName} ${contract.client.lastName}`,
        detail: `Contract in arrears · ${contract.vehicle.registration}`,
        href: `/contracts/${contract.id}`,
        amount: contract.outstandingBalance,
        entityType: 'CONTRACT',
        entityId: contract.id,
      });
    }

    for (const entry of pendingFines) {
      seeds.push({
        dedupeKey: `fine-${entry.id}`,
        kind: NotificationKind.PENDING_FINE,
        severity: NotificationSeverity.MEDIUM,
        title: `${entry.contract.client.firstName} ${entry.contract.client.lastName}`,
        detail:
          entry.type === LedgerEntryType.TOLL
            ? 'Outstanding toll'
            : 'Outstanding fine',
        href: `/contracts/${entry.contractId}`,
        amount: entry.amount,
        entityType: 'CONTRACT',
        entityId: entry.contractId,
      });
    }

    for (const event of recentBreaches) {
      seeds.push({
        dedupeKey: `breach-${event.id}`,
        kind: NotificationKind.RULE_BREACH,
        severity: NotificationSeverity.HIGH,
        title: event.vehicle.registration,
        detail: event.message ?? 'Telematics rule breach',
        href: `/fleet/${event.vehicleId}`,
        amount: null,
        entityType: 'VEHICLE',
        entityId: event.vehicleId,
      });
    }

    for (const vehicle of serviceDueVehicles) {
      seeds.push({
        dedupeKey: `service-${vehicle.id}`,
        kind: NotificationKind.SERVICE_DUE,
        severity: NotificationSeverity.MEDIUM,
        title: vehicle.registration,
        detail: 'Service due soon',
        href: `/fleet/${vehicle.id}`,
        amount: null,
        entityType: 'VEHICLE',
        entityId: vehicle.id,
      });
    }

    for (const contract of nearingContracts) {
      const days = Math.ceil(
        (contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      seeds.push({
        dedupeKey: `term-${contract.id}`,
        kind: NotificationKind.END_OF_TERM,
        severity:
          days <= 30 ? NotificationSeverity.HIGH : NotificationSeverity.MEDIUM,
        title: `${contract.client.firstName} ${contract.client.lastName}`,
        detail: `Contract ends in ${days} day${days === 1 ? '' : 's'} · ${contract.vehicle.registration}`,
        href: `/contracts/${contract.id}`,
        amount: null,
        entityType: 'CONTRACT',
        entityId: contract.id,
      });
    }

    for (const renewal of openLicences) {
      const { daysRemaining, urgency } = licenceUrgencyForExpiry(
        renewal.expiryDate,
        now,
      );
      if (
        urgency !== 'WARN_60' &&
        urgency !== 'ACTION_30' &&
        urgency !== 'EXPIRED'
      ) {
        continue;
      }
      const detail =
        urgency === 'EXPIRED'
          ? `Licence expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`
          : `Licence due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
      seeds.push({
        dedupeKey: `licence-${renewal.id}`,
        kind: NotificationKind.LICENCE_DUE,
        severity:
          urgency === 'WARN_60'
            ? NotificationSeverity.MEDIUM
            : NotificationSeverity.HIGH,
        title: renewal.vehicle.registration,
        detail,
        href: `/licences`,
        amount: null,
        entityType: 'LICENCE_RENEWAL',
        entityId: renewal.id,
      });
    }

    const keys = seeds.map((seed) => seed.dedupeKey);

    for (const seed of seeds) {
      await this.prisma.notification.upsert({
        where: { dedupeKey: seed.dedupeKey },
        create: { ...seed, active: true },
        update: {
          kind: seed.kind,
          severity: seed.severity,
          title: seed.title,
          detail: seed.detail,
          href: seed.href,
          amount: seed.amount,
          entityType: seed.entityType,
          entityId: seed.entityId,
          active: true,
        },
      });
    }

    if (keys.length > 0) {
      await this.prisma.notification.updateMany({
        where: {
          active: true,
          dedupeKey: { notIn: keys },
        },
        data: { active: false },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { active: true },
        data: { active: false },
      });
    }
  }
}
