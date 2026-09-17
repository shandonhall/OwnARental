import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  ContractStatus,
  LicenceRenewalStatus,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NON_TERMINAL_LICENCE_STATUSES } from './licence.constants';
import { licenceUrgencyForExpiry, toUtcDateOnly } from './licence.urgency';
import {
  assertLicenceCompletionReady,
  nextCycleCreateData,
} from './licence.completion';
import {
  assertForwardOrCancel,
  isTerminalStatus,
  statusForMark,
  timestampPatchForMark,
} from './licence.workflow';
import type {
  CreateLicenceDto,
  ListLicencesQuery,
  UpdateLicenceDto,
} from './licences.schemas';

const renewalInclude = {
  vehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      registration: true,
      status: true,
    },
  },
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
  contract: {
    select: {
      id: true,
      status: true,
      agreementNumber: true,
    },
  },
  responsibleUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
} satisfies Prisma.LicenceRenewalInclude;

type RenewalRow = Prisma.LicenceRenewalGetPayload<{
  include: typeof renewalInclude;
}>;

@Injectable()
export class LicencesService {
  constructor(private readonly prisma: PrismaService) {}

  private project(row: RenewalRow, now = new Date()) {
    const { daysRemaining, urgency } = licenceUrgencyForExpiry(
      row.expiryDate,
      now,
    );
    return {
      ...row,
      renewalCost:
        row.renewalCost != null ? Number(row.renewalCost).toFixed(2) : null,
      expiryDate: toUtcDateOnly(row.expiryDate).toISOString().slice(0, 10),
      renewedExpiryDate: row.renewedExpiryDate
        ? toUtcDateOnly(row.renewedExpiryDate).toISOString().slice(0, 10)
        : null,
      daysRemaining,
      urgency,
    };
  }

  async findActiveAssignment(vehicleId: string) {
    return this.prisma.contract.findFirst({
      where: {
        vehicleId,
        status: { in: [ContractStatus.ACTIVE, ContractStatus.ARREARS] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, clientId: true },
    });
  }

  async assertNoOpenCycle(vehicleId: string, excludeId?: string) {
    const existing = await this.prisma.licenceRenewal.findFirst({
      where: {
        vehicleId,
        status: { in: [...NON_TERMINAL_LICENCE_STATUSES] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, status: true },
    });
    if (existing) {
      throw new ConflictException(
        `Vehicle already has an open licence renewal (${existing.status}). Cancel or complete it before creating another.`,
      );
    }
  }

  async create(dto: CreateLicenceDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
      select: { id: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
    }

    await this.assertNoOpenCycle(dto.vehicleId);

    let contractId: string | null = null;
    let clientId: string | null = null;
    if (dto.snapshotAssignment !== false) {
      const assignment = await this.findActiveAssignment(dto.vehicleId);
      if (assignment) {
        contractId = assignment.id;
        clientId = assignment.clientId;
      }
    }

    try {
      const created = await this.prisma.licenceRenewal.create({
        data: {
          vehicleId: dto.vehicleId,
          expiryDate: toUtcDateOnly(dto.expiryDate),
          responsibleUserId: dto.responsibleUserId ?? null,
          renewalCost:
            dto.renewalCost == null
              ? null
              : new Prisma.Decimal(dto.renewalCost),
          notes: dto.notes ?? null,
          contractId,
          clientId,
          status: LicenceRenewalStatus.OPEN,
        },
        include: renewalInclude,
      });
      return this.project(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Vehicle already has an open licence renewal',
        );
      }
      throw error;
    }
  }

  async findAll(query: ListLicencesQuery) {
    const where: Prisma.LicenceRenewalWhereInput = {};

    if (query.status) {
      where.status = query.status;
    } else if (query.pipeline === 'OPEN') {
      where.status = { in: [...NON_TERMINAL_LICENCE_STATUSES] };
    } else if (query.pipeline === 'TERMINAL') {
      where.status = {
        in: [LicenceRenewalStatus.COMPLETED, LicenceRenewalStatus.CANCELLED],
      };
    }

    if (query.responsibleUserId) {
      where.responsibleUserId = query.responsibleUserId;
    }

    if (query.search) {
      const q = query.search;
      where.OR = [
        {
          vehicle: {
            registration: { contains: q, mode: 'insensitive' },
          },
        },
        { vehicle: { make: { contains: q, mode: 'insensitive' } } },
        { vehicle: { model: { contains: q, mode: 'insensitive' } } },
        { client: { firstName: { contains: q, mode: 'insensitive' } } },
        { client: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const rows = await this.prisma.licenceRenewal.findMany({
      where,
      include: renewalInclude,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });

    const projected = rows.map((row) => this.project(row));
    if (!query.urgency || query.urgency === 'ALL') return projected;
    return projected.filter((row) => row.urgency === query.urgency);
  }

  async findOne(id: string) {
    const row = await this.prisma.licenceRenewal.findUnique({
      where: { id },
      include: renewalInclude,
    });
    if (!row) {
      throw new NotFoundException(`Licence renewal ${id} not found`);
    }
    return this.project(row);
  }

  async findForVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const rows = await this.prisma.licenceRenewal.findMany({
      where: { vehicleId },
      include: renewalInclude,
      orderBy: [{ expiryDate: 'desc' }, { createdAt: 'desc' }],
    });

    const projected = rows.map((row) => this.project(row));
    const current =
      projected.find((row) =>
        (NON_TERMINAL_LICENCE_STATUSES as readonly string[]).includes(
          row.status,
        ),
      ) ?? null;

    return { current, history: projected };
  }

  async currentForVehicle(vehicleId: string) {
    const row = await this.prisma.licenceRenewal.findFirst({
      where: {
        vehicleId,
        status: { in: [...NON_TERMINAL_LICENCE_STATUSES] },
      },
      include: renewalInclude,
      orderBy: { expiryDate: 'asc' },
    });
    return row ? this.project(row) : null;
  }

  async update(id: string, dto: UpdateLicenceDto) {
    const existing = await this.prisma.licenceRenewal.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Licence renewal ${id} not found`);
    }

    if (dto.mark === 'client_notified') {
      const updated = await this.prisma.licenceRenewal.update({
        where: { id },
        data: { clientNotifiedAt: new Date() },
        include: renewalInclude,
      });
      return { renewal: this.project(updated), nextCycle: null };
    }

    if (isTerminalStatus(existing.status) && (dto.mark || dto.status)) {
      throw new BadRequestException(
        `Cannot change workflow from terminal status ${existing.status}`,
      );
    }

    const now = new Date();
    let nextStatus = existing.status;
    const data: Prisma.LicenceRenewalUpdateInput = {};

    if (dto.mark) {
      const target = statusForMark(dto.mark);
      if (target) {
        assertForwardOrCancel(existing.status, target);
        nextStatus = target;
        data.status = target;
      }
      const stamps = timestampPatchForMark(dto.mark, now);
      for (const [key, value] of Object.entries(stamps)) {
        const current = existing[key as keyof typeof existing];
        if (current == null) {
          (data as Record<string, Date>)[key] = value;
        }
      }
    } else if (dto.status && dto.status !== existing.status) {
      assertForwardOrCancel(existing.status, dto.status);
      nextStatus = dto.status;
      data.status = dto.status;
    }

    if (dto.responsibleUserId !== undefined) {
      data.responsibleUser =
        dto.responsibleUserId === null
          ? { disconnect: true }
          : { connect: { id: dto.responsibleUserId } };
    }
    if (dto.renewalCost !== undefined) {
      data.renewalCost =
        dto.renewalCost == null ? null : new Prisma.Decimal(dto.renewalCost);
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }
    if (dto.renewedExpiryDate !== undefined) {
      data.renewedExpiryDate =
        dto.renewedExpiryDate == null
          ? null
          : toUtcDateOnly(dto.renewedExpiryDate);
    }
    if (dto.contractId !== undefined) {
      data.contract =
        dto.contractId == null
          ? { disconnect: true }
          : { connect: { id: dto.contractId } };
    }
    if (dto.clientId !== undefined) {
      data.client =
        dto.clientId == null
          ? { disconnect: true }
          : { connect: { id: dto.clientId } };
    }

    // Snapshot assignment when work begins if still null (any forward leave from OPEN,
    // including skip-ahead). Do not overwrite once populated.
    if (
      existing.status === LicenceRenewalStatus.OPEN &&
      nextStatus !== LicenceRenewalStatus.OPEN &&
      nextStatus !== LicenceRenewalStatus.CANCELLED &&
      existing.contractId == null &&
      existing.clientId == null &&
      dto.contractId === undefined &&
      dto.clientId === undefined
    ) {
      const assignment = await this.findActiveAssignment(existing.vehicleId);
      if (assignment) {
        data.contract = { connect: { id: assignment.id } };
        data.client = { connect: { id: assignment.clientId } };
      }
    }

    if (nextStatus === LicenceRenewalStatus.COMPLETED) {
      return this.completeCycle(existing, data, dto);
    }

    const updated = await this.prisma.licenceRenewal.update({
      where: { id },
      data,
      include: renewalInclude,
    });
    return { renewal: this.project(updated), nextCycle: null };
  }

  private async completeCycle(
    existing: {
      id: string;
      vehicleId: string;
      expiryDate: Date;
      renewedExpiryDate: Date | null;
      sentAt: Date | null;
      collectedAt: Date | null;
      status: LicenceRenewalStatus;
    },
    data: Prisma.LicenceRenewalUpdateInput,
    dto: UpdateLicenceDto,
  ) {
    const renewedExpiry =
      dto.renewedExpiryDate != null
        ? toUtcDateOnly(dto.renewedExpiryDate)
        : data.renewedExpiryDate instanceof Date
          ? data.renewedExpiryDate
          : existing.renewedExpiryDate
            ? toUtcDateOnly(existing.renewedExpiryDate)
            : null;

    const sentAt = data.sentAt instanceof Date ? data.sentAt : existing.sentAt;
    const collectedAt =
      data.collectedAt instanceof Date
        ? data.collectedAt
        : existing.collectedAt;

    const { renewedExpiry: validatedRenewedExpiry } =
      assertLicenceCompletionReady({
        expiryDate: existing.expiryDate,
        renewedExpiryDate: renewedExpiry,
        sentAt,
        collectedAt,
      });

    await this.assertNoOpenCycle(existing.vehicleId, existing.id);

    data.status = LicenceRenewalStatus.COMPLETED;
    data.renewedExpiryDate = validatedRenewedExpiry;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const completed = await tx.licenceRenewal.update({
          where: { id: existing.id },
          data,
          include: renewalInclude,
        });

        const nextOpen = await tx.licenceRenewal.findFirst({
          where: {
            vehicleId: existing.vehicleId,
            status: { in: [...NON_TERMINAL_LICENCE_STATUSES] },
            id: { not: existing.id },
          },
        });
        if (nextOpen) {
          throw new ConflictException(
            'Vehicle already has another open licence renewal',
          );
        }

        const next = await tx.licenceRenewal.create({
          data: nextCycleCreateData({
            vehicleId: existing.vehicleId,
            renewedExpiry: validatedRenewedExpiry,
          }),
          include: renewalInclude,
        });

        return { completed, next };
      });

      return {
        renewal: this.project(result.completed),
        nextCycle: this.project(result.next),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Vehicle already has an open licence renewal',
        );
      }
      throw error;
    }
  }

  /** Dashboard counts for open cycles. */
  async urgencyCounts(now = new Date()) {
    const open = await this.prisma.licenceRenewal.findMany({
      where: { status: { in: [...NON_TERMINAL_LICENCE_STATUSES] } },
      select: { expiryDate: true },
    });
    const counts = {
      expired: 0,
      due30: 0,
      due60: 0,
    };
    for (const row of open) {
      const { urgency } = licenceUrgencyForExpiry(row.expiryDate, now);
      if (urgency === 'EXPIRED') counts.expired += 1;
      else if (urgency === 'ACTION_30') counts.due30 += 1;
      else if (urgency === 'WARN_60') counts.due60 += 1;
    }
    return counts;
  }

  async listDueForNotifications(now = new Date()) {
    const open = await this.prisma.licenceRenewal.findMany({
      where: { status: { in: [...NON_TERMINAL_LICENCE_STATUSES] } },
      include: {
        vehicle: {
          select: { id: true, registration: true },
        },
      },
    });

    return open
      .map((row) => {
        const { daysRemaining, urgency } = licenceUrgencyForExpiry(
          row.expiryDate,
          now,
        );
        return { ...row, daysRemaining, urgency };
      })
      .filter(
        (row) =>
          row.urgency === 'WARN_60' ||
          row.urgency === 'ACTION_30' ||
          row.urgency === 'EXPIRED',
      );
  }
}
