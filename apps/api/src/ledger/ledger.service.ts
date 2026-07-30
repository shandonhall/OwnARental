import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { LedgerEntryStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import {
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
} from './ledger.schemas';
import type { User } from '../generated/prisma/client';

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: ContractsService,
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

  async create(
    contractId: string,
    data: CreateLedgerEntryDto,
    user?: User,
  ) {
    await this.ensureContract(contractId);

    const status = data.status ?? LedgerEntryStatus.PENDING;
    const paidAt =
      data.paidAt ??
      (status !== LedgerEntryStatus.PENDING &&
      status !== LedgerEntryStatus.FAILED &&
      status !== LedgerEntryStatus.VOID
        ? new Date()
        : null);

    await this.prisma.ledgerEntry.create({
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
}
