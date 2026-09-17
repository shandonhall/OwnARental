import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { LedgerEntryStatus, LedgerEntryType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import { CreateLedgerEntryDto, UpdateLedgerEntryDto } from './ledger.schemas';
import type { User } from '../generated/prisma/client';
import { GhlService } from '../ghl/ghl.service';

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: ContractsService,
    private readonly ghl: GhlService,
  ) {}

  private async ensureContract(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }
    return contract;
  }

  async create(contractId: string, data: CreateLedgerEntryDto, user?: User) {
    await this.ensureContract(contractId);

    const status = data.status ?? LedgerEntryStatus.PENDING;
    const paidAt =
      data.paidAt ??
      (status !== LedgerEntryStatus.PENDING &&
      status !== LedgerEntryStatus.FAILED &&
      status !== LedgerEntryStatus.VOID
        ? new Date()
        : null);

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        contractId,
        type: data.type,
        status,
        amount: new Prisma.Decimal(data.amount),
        currency: data.currency ?? 'ZAR',
        dueDate: data.dueDate ?? null,
        paidAt,
        reference: data.reference ?? null,
        description: data.description ?? null,
        createdById: user?.id ?? null,
      },
    });

    await this.maybeNotifyPayment(entry.id);
    return this.contractsService.findOne(contractId);
  }

  async update(
    contractId: string,
    entryId: string,
    data: UpdateLedgerEntryDto,
  ) {
    await this.ensureContract(contractId);
    const entry = await this.prisma.ledgerEntry.findFirst({
      where: { id: entryId, contractId },
    });
    if (!entry) {
      throw new NotFoundException(`Ledger entry ${entryId} not found`);
    }

    await this.prisma.ledgerEntry.update({
      where: { id: entryId },
      data: {
        ...(data.type ? { type: data.type } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.amount !== undefined
          ? { amount: new Prisma.Decimal(data.amount) }
          : {}),
        ...(data.currency ? { currency: data.currency } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...(data.paidAt !== undefined ? { paidAt: data.paidAt } : {}),
        ...(data.reference !== undefined ? { reference: data.reference } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
      },
    });

    if (data.status === LedgerEntryStatus.LATE) {
      await this.maybeNotifyPayment(entryId);
    }

    return this.contractsService.findOne(contractId);
  }

  async remove(contractId: string, entryId: string) {
    await this.ensureContract(contractId);
    const entry = await this.prisma.ledgerEntry.findFirst({
      where: { id: entryId, contractId },
    });
    if (!entry) {
      throw new NotFoundException(`Ledger entry ${entryId} not found`);
    }

    await this.prisma.ledgerEntry.update({
      where: { id: entryId },
      data: { status: LedgerEntryStatus.VOID },
    });

    return this.contractsService.findOne(contractId);
  }

  private async maybeNotifyPayment(entryId: string) {
    const entry = await this.prisma.ledgerEntry.findUnique({
      where: { id: entryId },
      include: {
        contract: { include: { client: true, vehicle: true } },
      },
    });
    if (!entry || entry.type !== LedgerEntryType.RENTAL_PAYMENT) return;

    const metadata =
      entry.metadata &&
      typeof entry.metadata === 'object' &&
      !Array.isArray(entry.metadata)
        ? (entry.metadata as Record<string, unknown>)
        : {};
    if (metadata.ghlNotifiedAt || metadata.ghlMessageId) return;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    let event: 'LATE_PAYMENT' | 'MISSED_PAYMENT' | null = null;
    if (entry.status === LedgerEntryStatus.LATE) {
      event = 'LATE_PAYMENT';
    } else if (
      entry.status === LedgerEntryStatus.PENDING &&
      entry.dueDate &&
      entry.dueDate < startOfToday
    ) {
      event = 'MISSED_PAYMENT';
    }

    if (!event) return;

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
  }
}
