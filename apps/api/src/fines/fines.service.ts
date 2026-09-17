import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import {
  ContractStatus,
  FineImportStatus,
  LedgerEntryStatus,
  LedgerEntryType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MockFinesProvider } from './fines.mock';
import { LiveFinesProvider } from './fines.live';
import type { ExternalFine, FinesProvider } from './fines.types';
import type { ListFinesQuery, SyncFinesDto } from './fines.schemas';
import { GhlService } from '../ghl/ghl.service';

@Injectable()
export class FinesService {
  private readonly logger = new Logger(FinesService.name);
  private readonly provider: FinesProvider;
  private readonly adminFeeZar: number;
  private lastSyncAt: Date | null = null;
  private lastError: string | null = null;
  private lastImported = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly ghl: GhlService,
  ) {
    const baseUrl = this.config.get<string>('FINES_API_URL')?.trim();
    const apiKey = this.config.get<string>('FINES_API_KEY')?.trim();
    this.provider =
      baseUrl && apiKey
        ? new LiveFinesProvider(baseUrl, apiKey)
        : new MockFinesProvider();

    const fee = Number(this.config.get<string>('FINES_ADMIN_FEE_ZAR') ?? '150');
    this.adminFeeZar = Number.isFinite(fee) && fee >= 0 ? fee : 150;
  }

  getStatus(schedulerMeta?: { autoSyncEnabled: boolean; intervalMs: number }) {
    return {
      provider: this.provider.mode,
      handshake: 'ok' as const,
      message:
        this.provider.mode === 'live'
          ? 'Connected to fines API'
          : 'Using mock fines provider (set FINES_API_URL + FINES_API_KEY for live)',
      adminFeeZar: this.adminFeeZar,
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      lastError: this.lastError,
      lastImported: this.lastImported,
      autoSyncEnabled: schedulerMeta?.autoSyncEnabled ?? false,
      syncIntervalMs: schedulerMeta?.intervalMs ?? null,
    };
  }

  async list(query: ListFinesQuery) {
    const imports = await this.prisma.fineImport.findMany({
      where: query.status ? { status: query.status } : undefined,
      include: {
        contract: {
          include: {
            client: true,
            vehicle: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return imports.map((item) => serializeFine(item));
  }

  async sync(body: SyncFinesDto = {}) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: body.registration
        ? {
            registration: {
              equals: body.registration,
              mode: 'insensitive',
            },
          }
        : {
            status: { in: ['ACTIVE', 'ARREARS', 'AVAILABLE'] },
          },
      select: { id: true, registration: true },
    });

    const registrations = vehicles.map((vehicle) => vehicle.registration);
    let external: ExternalFine[] = [];
    try {
      external = await this.provider.fetchFleetOutstanding(registrations);
      this.lastError = null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Fines sync failed';
      this.lastError = message;
      this.logger.warn(message);
      throw error;
    }

    let imported = 0;
    for (const fine of external) {
      const created = await this.ingestFine(fine);
      if (created) imported += 1;
    }

    this.lastSyncAt = new Date();
    this.lastImported = imported;
    return {
      provider: this.provider.mode,
      scanned: registrations.length,
      fetched: external.length,
      imported,
      adminFeeZar: this.adminFeeZar,
    };
  }

  async invoice(id: string) {
    const item = await this.prisma.fineImport.findUnique({
      where: { id },
      include: {
        contract: { include: { client: true, vehicle: true } },
      },
    });
    if (!item) {
      throw new NotFoundException(`Fine import ${id} not found`);
    }
    if (item.status === FineImportStatus.INVOICED) {
      return serializeFine(item);
    }
    if (!item.contractId || !item.contract) {
      throw new NotFoundException(
        'Fine is unmatched — cannot invoice without a contract',
      );
    }

    const result = await this.createLedgerInvoices(item);
    return serializeFine(result);
  }

  private async ingestFine(fine: ExternalFine) {
    const existing = await this.prisma.fineImport.findUnique({
      where: { externalId: fine.externalId },
    });
    if (existing) {
      return false;
    }

    const contract = await this.prisma.contract.findFirst({
      where: {
        status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
        vehicle: {
          registration: {
            equals: fine.registration,
            mode: 'insensitive',
          },
        },
      },
      include: { client: true, vehicle: true },
    });

    const created = await this.prisma.fineImport.create({
      data: {
        externalId: fine.externalId,
        source: fine.source,
        registration: fine.registration,
        offenceDate: fine.offenceDate,
        amount: new Prisma.Decimal(fine.amount),
        description: fine.description,
        rawPayload:
          fine.raw != null ? (fine.raw as Prisma.InputJsonValue) : undefined,
        contractId: contract?.id ?? null,
        status: contract
          ? FineImportStatus.MATCHED
          : FineImportStatus.UNMATCHED,
      },
    });

    if (contract) {
      await this.createLedgerInvoices({
        ...created,
        contract,
      });
      return true;
    }

    return true;
  }

  private async createLedgerInvoices(item: {
    id: string;
    externalId: string;
    source: string;
    registration: string;
    amount: Prisma.Decimal;
    description: string | null;
    contractId: string | null;
    fineLedgerId: string | null;
    adminFeeLedgerId: string | null;
    contract?: {
      id: string;
      client: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string;
        email: string | null;
        ghlContactId: string | null;
      };
      vehicle: {
        id: string;
        registration: string;
        make: string;
        model: string;
        driverScore: number | null;
        status: string;
      };
      planType: string;
      status: string;
      endDate: Date;
    } | null;
  }) {
    if (!item.contractId || !item.contract) {
      throw new NotFoundException('Fine has no matched contract');
    }
    if (item.fineLedgerId && item.adminFeeLedgerId) {
      return this.prisma.fineImport.findUniqueOrThrow({
        where: { id: item.id },
        include: {
          contract: { include: { client: true, vehicle: true } },
        },
      });
    }

    const fineType =
      item.source.toUpperCase().includes('SANRAL') ||
      item.source.toUpperCase().includes('TOLL')
        ? LedgerEntryType.TOLL
        : LedgerEntryType.FINE;

    const result = await this.prisma.$transaction(async (tx) => {
      const fineLedger = await tx.ledgerEntry.create({
        data: {
          contractId: item.contractId!,
          type: fineType,
          status: LedgerEntryStatus.PENDING,
          amount: item.amount,
          reference: item.externalId,
          description:
            item.description ?? `${item.source} fine for ${item.registration}`,
          metadata: {
            fineImportId: item.id,
            externalId: item.externalId,
            source: item.source,
          },
        },
      });

      let adminLedgerId: string | null = item.adminFeeLedgerId;
      if (this.adminFeeZar > 0 && !adminLedgerId) {
        const adminLedger = await tx.ledgerEntry.create({
          data: {
            contractId: item.contractId!,
            type: LedgerEntryType.ADMIN_FEE,
            status: LedgerEntryStatus.PENDING,
            amount: new Prisma.Decimal(this.adminFeeZar),
            reference: `${item.externalId}-ADMIN`,
            description: `Admin handling fee for ${item.externalId}`,
            metadata: {
              fineImportId: item.id,
              externalId: item.externalId,
              source: item.source,
            },
          },
        });
        adminLedgerId = adminLedger.id;
      }

      return tx.fineImport.update({
        where: { id: item.id },
        data: {
          fineLedgerId: fineLedger.id,
          adminFeeLedgerId: adminLedgerId,
          invoicedAt: new Date(),
          status: FineImportStatus.INVOICED,
          contractId: item.contractId,
        },
        include: {
          contract: { include: { client: true, vehicle: true } },
        },
      });
    });

    const contract = result.contract;
    if (contract) {
      await this.ghl.emitEvent({
        event: 'FINE_INVOICE',
        occurredAt: new Date().toISOString(),
        client: {
          id: contract.client.id,
          firstName: contract.client.firstName,
          lastName: contract.client.lastName,
          phone: contract.client.phone,
          email: contract.client.email,
          ghlContactId: contract.client.ghlContactId,
        },
        vehicle: {
          id: contract.vehicle.id,
          registration: contract.vehicle.registration,
          make: contract.vehicle.make,
          model: contract.vehicle.model,
          driverScore: contract.vehicle.driverScore,
          status: contract.vehicle.status,
        },
        contract: {
          id: contract.id,
          planType: contract.planType,
          status: contract.status,
          endDate: contract.endDate.toISOString(),
        },
        amount: Number(item.amount),
        detail: `${item.source} invoice ${item.externalId} + admin fee R${this.adminFeeZar}`,
        metadata: {
          fineImportId: item.id,
          externalId: item.externalId,
          adminFeeZar: this.adminFeeZar,
        },
      });
    }

    return result;
  }
}

function serializeFine(item: {
  id: string;
  externalId: string;
  source: string;
  registration: string;
  offenceDate: Date | null;
  amount: Prisma.Decimal;
  description: string | null;
  status: FineImportStatus;
  contractId: string | null;
  fineLedgerId: string | null;
  adminFeeLedgerId: string | null;
  invoicedAt: Date | null;
  createdAt: Date;
  contract?: {
    id: string;
    client: { id: string; firstName: string; lastName: string };
    vehicle: { id: string; registration: string };
  } | null;
}) {
  return {
    id: item.id,
    externalId: item.externalId,
    source: item.source,
    registration: item.registration,
    offenceDate: item.offenceDate?.toISOString() ?? null,
    amount: Number(item.amount).toFixed(2),
    description: item.description,
    status: item.status,
    contractId: item.contractId,
    fineLedgerId: item.fineLedgerId,
    adminFeeLedgerId: item.adminFeeLedgerId,
    invoicedAt: item.invoicedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    href: item.contractId ? `/contracts/${item.contractId}` : null,
    client: item.contract
      ? {
          id: item.contract.client.id,
          firstName: item.contract.client.firstName,
          lastName: item.contract.client.lastName,
        }
      : null,
    vehicle: item.contract
      ? {
          id: item.contract.vehicle.id,
          registration: item.contract.vehicle.registration,
        }
      : null,
  };
}
