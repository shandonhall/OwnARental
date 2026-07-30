import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContractStatus,
  LedgerEntryStatus,
  LedgerEntryType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { GhlService } from './ghl.service';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const END_OF_TERM_DAYS = 90;

@Injectable()
export class GhlSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GhlSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | null = null;
  readonly autoEnabled: boolean;
  readonly intervalMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ghl: GhlService,
  ) {
    this.autoEnabled =
      (this.config.get<string>('GHL_AUTO_COMMS') ?? 'true') !== 'false';
    const configured = Number(this.config.get<string>('GHL_COMMS_INTERVAL_MS'));
    this.intervalMs =
      Number.isFinite(configured) && configured >= 60_000
        ? configured
        : DEFAULT_INTERVAL_MS;
  }

  onModuleInit() {
    if (!this.autoEnabled) {
      this.logger.log('GHL auto-comms disabled (GHL_AUTO_COMMS=false)');
      return;
    }

    this.logger.log(`GHL auto-comms every ${this.intervalMs}ms`);
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    this.bootTimer = setTimeout(() => {
      void this.tick();
    }, 20_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.bootTimer) clearTimeout(this.bootTimer);
  }

  getMeta() {
    return {
      autoEnabled: this.autoEnabled,
      intervalMs: this.intervalMs,
    };
  }

  async tick() {
    try {
      const payment = await this.processPaymentAlerts();
      const term = await this.processEndOfTerm();
      this.logger.debug(
        `GHL comms tick · payments=${payment} · endOfTerm=${term}`,
      );
    } catch (error) {
      this.logger.warn(
        `GHL comms tick failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async processPaymentAlerts() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const overdue = await this.prisma.ledgerEntry.findMany({
      where: {
        type: LedgerEntryType.RENTAL_PAYMENT,
        status: {
          in: [LedgerEntryStatus.PENDING, LedgerEntryStatus.LATE],
        },
        OR: [
          {
            status: LedgerEntryStatus.PENDING,
            dueDate: { lt: startOfToday },
          },
          { status: LedgerEntryStatus.LATE },
        ],
        contract: {
          status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
        },
      },
      include: {
        contract: {
          include: { client: true, vehicle: true },
        },
      },
      take: 40,
      orderBy: { dueDate: 'asc' },
    });

    let sent = 0;
    for (const entry of overdue) {
      if (alreadyNotified(entry.metadata)) continue;

      const event =
        entry.status === LedgerEntryStatus.LATE
          ? 'LATE_PAYMENT'
          : 'MISSED_PAYMENT';

      await this.ghl.notifyPaymentIssue({
        event,
        client: entry.contract.client,
        contract: entry.contract,
        vehicle: entry.contract.vehicle,
        amount: Number(entry.amount),
        detail:
          event === 'LATE_PAYMENT'
            ? 'Late rental payment notice'
            : 'Missed rental payment reminder',
        ledgerEntryId: entry.id,
      });
      sent += 1;
    }
    return sent;
  }

  private async processEndOfTerm() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + END_OF_TERM_DAYS);

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
        endDate: { gte: startOfToday, lte: horizon },
        OR: [{ ghlOpportunityId: null }, { endOfTermNotifiedAt: null }],
      },
      take: 30,
    });

    let pushed = 0;
    for (const contract of contracts) {
      const id = await this.ghl.pushEndOfTermOpportunity(contract.id);
      if (id) pushed += 1;
    }
    return pushed;
  }
}

function alreadyNotified(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  const record = metadata as Record<string, unknown>;
  return Boolean(record.ghlNotifiedAt || record.ghlMessageId);
}
