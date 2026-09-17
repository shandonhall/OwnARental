import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { User } from '../generated/prisma/client';
import { hasPermission, Permission } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertCanAccessLead,
  assertSalesMayCreateSource,
  canAssignLeads,
  canEditAttribution,
  canViewAllLeads,
  rejectAttributionIfPresent,
  type LeadViewer,
} from './lead.access';
import { buildCreativeReport } from './lead.creative-report';
import type { LeadStageValue } from './lead.constants';
import {
  firstAttemptResponseMs,
  firstContactResponseMs,
  msToHours,
  responseAnchor,
} from './lead.response-time';
import {
  applyLeadMark,
  assertForwardOrClose,
  isTerminalLeadStage,
} from './lead.workflow';
import type {
  AssignLeadDto,
  ConvertClientDto,
  CreateLeadDto,
  CreativeReportQuery,
  ListLeadsQuery,
  UpdateLeadDto,
} from './leads.schemas';

const staffSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

const leadInclude = {
  assignedUser: { select: staffSelect },
  createdByUser: { select: staffSelect },
  requestedVehicle: {
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
      email: true,
    },
  },
} satisfies Prisma.LeadInclude;

type LeadRow = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;

function asViewer(user: User): LeadViewer {
  return { id: user.id, role: user.role };
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private project(row: LeadRow) {
    const anchor = responseAnchor(row.sourceCreatedAt, row.createdAt);
    return {
      ...row,
      responseBasis: anchor.basis,
      firstAttemptResponseHours: msToHours(firstAttemptResponseMs(row)),
      firstContactResponseHours: msToHours(firstContactResponseMs(row)),
      sourceCreatedAt: row.sourceCreatedAt?.toISOString() ?? null,
      firstAttemptAt: row.firstAttemptAt?.toISOString() ?? null,
      firstContactAt: row.firstContactAt?.toISOString() ?? null,
      lastContactAt: row.lastContactAt?.toISOString() ?? null,
      assignedAt: row.assignedAt?.toISOString() ?? null,
      documentsReceivedAt: row.documentsReceivedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      externalDeliveredAt: row.externalDeliveredAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async findPossibleDuplicates(opts: {
    cellphone: string;
    email?: string | null;
    excludeId?: string;
  }) {
    const digits = normalizePhone(opts.cellphone);
    const or: Prisma.LeadWhereInput[] = [
      { cellphone: { contains: digits.slice(-9) } },
    ];
    if (opts.email) {
      or.push({ email: { equals: opts.email, mode: 'insensitive' } });
    }
    return this.prisma.lead.findMany({
      where: {
        OR: or,
        ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
        archivedAt: null,
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cellphone: true,
        email: true,
        stage: true,
        creativeType: true,
        source: true,
        createdAt: true,
        assignedUserId: true,
      },
    });
  }

  async findAll(viewer: User, query: ListLeadsQuery) {
    const v = asViewer(viewer);

    if (query.unassigned && !canAssignLeads(v.role)) {
      throw new ForbiddenException('Missing permission: LEADS_ASSIGN');
    }
    if (query.assignedUserId && !canViewAllLeads(v.role)) {
      throw new ForbiddenException('Sales cannot filter by other assignees');
    }

    const where: Prisma.LeadWhereInput = {
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.qualification
        ? { qualificationStatus: query.qualification }
        : {}),
      ...(query.creativeType ? { creativeType: query.creativeType } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    if (!canViewAllLeads(v.role)) {
      where.assignedUserId = viewer.id;
    } else if (query.unassigned) {
      where.assignedUserId = null;
    } else if (query.mine) {
      where.assignedUserId = viewer.id;
    } else if (query.assignedUserId) {
      where.assignedUserId = query.assignedUserId;
    }

    if (query.search) {
      where.AND = [
        ...(where.AND
          ? Array.isArray(where.AND)
            ? where.AND
            : [where.AND]
          : []),
        {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { cellphone: { contains: query.search } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const rows = await this.prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => this.project(row));
  }

  async findOne(viewer: User, id: string) {
    const row = await this.prisma.lead.findUnique({
      where: { id },
      include: leadInclude,
    });
    assertCanAccessLead(asViewer(viewer), row);
    const possibleDuplicates = await this.findPossibleDuplicates({
      cellphone: row.cellphone,
      email: row.email,
      excludeId: row.id,
    });
    return {
      ...this.project(row),
      possibleDuplicates: possibleDuplicates.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async create(viewer: User, dto: CreateLeadDto) {
    const v = asViewer(viewer);
    assertSalesMayCreateSource(v, dto.source);

    if (!canEditAttribution(v.role)) {
      rejectAttributionIfPresent(v, dto);
    }

    if (dto.assignedUserId && !canAssignLeads(v.role)) {
      throw new ForbiddenException('Missing permission: LEADS_ASSIGN');
    }

    let assignedUserId: string | null = null;
    let assignedAt: Date | null = null;

    if (!canViewAllLeads(v.role)) {
      assignedUserId = viewer.id;
      assignedAt = new Date();
    } else if (dto.assignedUserId) {
      assignedUserId = dto.assignedUserId;
      assignedAt = new Date();
    }

    if (assignedUserId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: assignedUserId },
        select: { id: true, isActive: true },
      });
      if (!assignee?.isActive) {
        throw new BadRequestException('Assignee user not found or inactive');
      }
    }

    if (dto.requestedVehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: dto.requestedVehicleId },
        select: { id: true },
      });
      if (!vehicle) {
        throw new NotFoundException(
          `Vehicle ${dto.requestedVehicleId} not found`,
        );
      }
    }

    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          cellphone: dto.cellphone,
          email: dto.email ?? null,
          area: dto.area ?? null,
          salaryBand: dto.salaryBand ?? null,
          rentalType: dto.rentalType ?? null,
          vehicleNeededTiming: dto.vehicleNeededTiming ?? null,
          vehiclePreference: dto.vehiclePreference ?? null,
          hasValidDriversLicence: dto.hasValidDriversLicence ?? null,
          requestedVehicleId: dto.requestedVehicleId ?? null,
          source: dto.source,
          sourceDetail: dto.sourceDetail ?? null,
          platform: dto.platform ?? null,
          campaignId: dto.campaignId ?? null,
          campaignName: dto.campaignName ?? null,
          adSetId: dto.adSetId ?? null,
          adSetName: dto.adSetName ?? null,
          adId: dto.adId ?? null,
          adName: dto.adName ?? null,
          formId: dto.formId ?? null,
          formName: dto.formName ?? null,
          creativeType: dto.creativeType ?? 'UNKNOWN',
          creativeLabel: dto.creativeLabel ?? null,
          utmSource: dto.utmSource ?? null,
          utmMedium: dto.utmMedium ?? null,
          utmCampaign: dto.utmCampaign ?? null,
          utmContent: dto.utmContent ?? null,
          externalLeadId: dto.externalLeadId ?? null,
          sourceCreatedAt: dto.sourceCreatedAt ?? null,
          notes: dto.notes ?? null,
          duplicateOfLeadId: dto.duplicateOfLeadId ?? null,
          stage: 'NEW',
          qualificationStatus: 'UNASSESSED',
          deliverySystem: 'NONE',
          createdByUserId: viewer.id,
          assignedUserId,
          assignedAt,
        },
        include: leadInclude,
      });

      await tx.leadStageHistory.create({
        data: {
          leadId: lead.id,
          fromStage: null,
          toStage: 'NEW',
          actorUserId: viewer.id,
          changedAt: now,
          reason: 'Lead created',
        },
      });

      if (assignedUserId) {
        await tx.leadAssignment.create({
          data: {
            leadId: lead.id,
            userId: assignedUserId,
            assignedAt: assignedAt ?? now,
            assignedByUserId: viewer.id,
            reason: 'Initial assignment',
          },
        });
      }

      return lead;
    });

    const possibleDuplicates = await this.findPossibleDuplicates({
      cellphone: created.cellphone,
      email: created.email,
      excludeId: created.id,
    });

    return {
      ...this.project(created),
      possibleDuplicates: possibleDuplicates.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async update(viewer: User, id: string, dto: UpdateLeadDto) {
    const v = asViewer(viewer);
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    assertCanAccessLead(v, existing);

    if (isTerminalLeadStage(existing.stage) && dto.mark) {
      throw new BadRequestException(
        `Cannot apply mark on terminal stage ${existing.stage}`,
      );
    }

    rejectAttributionIfPresent(v, dto);
    if (!canEditAttribution(v.role) && dto.source !== undefined) {
      throw new ForbiddenException('Sales cannot change lead source');
    }

    const data: Prisma.LeadUncheckedUpdateInput = {};

    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.cellphone !== undefined) data.cellphone = dto.cellphone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.salaryBand !== undefined) data.salaryBand = dto.salaryBand;
    if (dto.rentalType !== undefined) data.rentalType = dto.rentalType;
    if (dto.vehicleNeededTiming !== undefined) {
      data.vehicleNeededTiming = dto.vehicleNeededTiming;
    }
    if (dto.vehiclePreference !== undefined) {
      data.vehiclePreference = dto.vehiclePreference;
    }
    if (dto.hasValidDriversLicence !== undefined) {
      data.hasValidDriversLicence = dto.hasValidDriversLicence;
    }
    if (dto.requestedVehicleId !== undefined) {
      data.requestedVehicleId = dto.requestedVehicleId;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.duplicateOfLeadId !== undefined) {
      data.duplicateOfLeadId = dto.duplicateOfLeadId;
    }
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.wonContractId !== undefined) data.wonContractId = dto.wonContractId;
    if (dto.archivedAt !== undefined) data.archivedAt = dto.archivedAt;

    if (canEditAttribution(v.role)) {
      if (dto.source !== undefined) data.source = dto.source;
      if (dto.sourceDetail !== undefined) data.sourceDetail = dto.sourceDetail;
      if (dto.platform !== undefined) data.platform = dto.platform;
      if (dto.campaignId !== undefined) data.campaignId = dto.campaignId;
      if (dto.campaignName !== undefined) data.campaignName = dto.campaignName;
      if (dto.adSetId !== undefined) data.adSetId = dto.adSetId;
      if (dto.adSetName !== undefined) data.adSetName = dto.adSetName;
      if (dto.adId !== undefined) data.adId = dto.adId;
      if (dto.adName !== undefined) data.adName = dto.adName;
      if (dto.formId !== undefined) data.formId = dto.formId;
      if (dto.formName !== undefined) data.formName = dto.formName;
      if (dto.creativeType !== undefined) data.creativeType = dto.creativeType;
      if (dto.creativeLabel !== undefined) {
        data.creativeLabel = dto.creativeLabel;
      }
      if (dto.utmSource !== undefined) data.utmSource = dto.utmSource;
      if (dto.utmMedium !== undefined) data.utmMedium = dto.utmMedium;
      if (dto.utmCampaign !== undefined) data.utmCampaign = dto.utmCampaign;
      if (dto.utmContent !== undefined) data.utmContent = dto.utmContent;
      if (dto.externalLeadId !== undefined) {
        data.externalLeadId = dto.externalLeadId;
      }
      if (dto.sourceCreatedAt !== undefined) {
        data.sourceCreatedAt = dto.sourceCreatedAt;
      }
    }

    let nextStage: LeadStageValue | undefined;
    const now = new Date();

    if (dto.mark) {
      const patch = applyLeadMark(dto.mark, {
        stage: existing.stage,
        qualificationStatus: existing.qualificationStatus,
        firstAttemptAt: existing.firstAttemptAt,
        firstContactAt: existing.firstContactAt,
        channel: dto.channel,
        disqualificationReason: dto.disqualificationReason,
        disqualificationNotes: dto.disqualificationNotes,
        lossReason: dto.lossReason,
        lossNotes: dto.lossNotes,
        advanceTo: dto.advanceTo,
        now,
      });
      if (patch.stage) {
        nextStage = patch.stage;
        data.stage = patch.stage;
      }
      if (patch.qualificationStatus) {
        data.qualificationStatus = patch.qualificationStatus;
      }
      if (patch.disqualificationReason !== undefined) {
        data.disqualificationReason = patch.disqualificationReason;
      }
      if (patch.disqualificationNotes !== undefined) {
        data.disqualificationNotes = patch.disqualificationNotes;
      }
      if (patch.lossReason !== undefined) data.lossReason = patch.lossReason;
      if (patch.lossNotes !== undefined) data.lossNotes = patch.lossNotes;
      if (patch.firstAttemptAt) data.firstAttemptAt = patch.firstAttemptAt;
      if (patch.firstAttemptChannel) {
        data.firstAttemptChannel = patch.firstAttemptChannel;
      }
      if (patch.firstContactAt) data.firstContactAt = patch.firstContactAt;
      if (patch.firstContactChannel) {
        data.firstContactChannel = patch.firstContactChannel;
      }
      if (patch.lastContactAt) data.lastContactAt = patch.lastContactAt;
      if (patch.documentsReceivedAt) {
        data.documentsReceivedAt = patch.documentsReceivedAt;
      }
      if (patch.closedAt) data.closedAt = patch.closedAt;
    } else if (dto.stage !== undefined) {
      if (!canViewAllLeads(v.role)) {
        throw new ForbiddenException(
          'Use mark actions to change stage; direct stage set requires admin',
        );
      }
      assertForwardOrClose(existing.stage, dto.stage);
      nextStage = dto.stage;
      data.stage = dto.stage;
      if (isTerminalLeadStage(dto.stage) && !existing.closedAt) {
        data.closedAt = now;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data,
        include: leadInclude,
      });

      if (nextStage && nextStage !== existing.stage) {
        await tx.leadStageHistory.create({
          data: {
            leadId: id,
            fromStage: existing.stage,
            toStage: nextStage,
            actorUserId: viewer.id,
            changedAt: now,
            reason: dto.mark ? `mark:${dto.mark}` : 'stage update',
          },
        });
      }

      return lead;
    });

    return this.project(updated);
  }

  async assign(viewer: User, id: string, dto: AssignLeadDto) {
    if (!canAssignLeads(viewer.role)) {
      throw new ForbiddenException('Missing permission: LEADS_ASSIGN');
    }

    const existing = await this.prisma.lead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Lead ${id} not found`);

    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, isActive: true },
    });
    if (!assignee?.isActive) {
      throw new BadRequestException('Assignee user not found or inactive');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      if (existing.assignedUserId) {
        await tx.leadAssignment.updateMany({
          where: {
            leadId: id,
            userId: existing.assignedUserId,
            unassignedAt: null,
          },
          data: { unassignedAt: now },
        });
      }

      await tx.leadAssignment.create({
        data: {
          leadId: id,
          userId: dto.userId,
          assignedAt: now,
          assignedByUserId: viewer.id,
          reason: dto.reason ?? null,
        },
      });

      return tx.lead.update({
        where: { id },
        data: {
          assignedUserId: dto.userId,
          assignedAt: now,
        },
        include: leadInclude,
      });
    });

    return this.project(updated);
  }

  async listAssignments(viewer: User, id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, assignedUserId: true },
    });
    assertCanAccessLead(asViewer(viewer), lead);

    const rows = await this.prisma.leadAssignment.findMany({
      where: { leadId: id },
      orderBy: { assignedAt: 'desc' },
      include: {
        user: { select: staffSelect },
        assignedByUser: { select: staffSelect },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      leadId: row.leadId,
      userId: row.userId,
      assignedAt: row.assignedAt.toISOString(),
      unassignedAt: row.unassignedAt?.toISOString() ?? null,
      assignedByUserId: row.assignedByUserId,
      reason: row.reason,
      user: row.user,
      assignedByUser: row.assignedByUser,
    }));
  }

  async listStages(viewer: User, id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, assignedUserId: true },
    });
    assertCanAccessLead(asViewer(viewer), lead);

    const rows = await this.prisma.leadStageHistory.findMany({
      where: { leadId: id },
      orderBy: { changedAt: 'asc' },
      include: {
        actor: { select: staffSelect },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      leadId: row.leadId,
      fromStage: row.fromStage,
      toStage: row.toStage,
      actorUserId: row.actorUserId,
      changedAt: row.changedAt.toISOString(),
      reason: row.reason,
      actorUser: row.actor,
    }));
  }

  async convertClient(viewer: User, id: string, dto: ConvertClientDto) {
    const existing = await this.prisma.lead.findUnique({ where: { id } });
    assertCanAccessLead(asViewer(viewer), existing);

    if (existing.clientId) {
      throw new ConflictException('Lead is already linked to a client');
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        select: { id: true },
      });
      if (!client) {
        throw new NotFoundException(`Client ${dto.clientId} not found`);
      }
      const updated = await this.prisma.lead.update({
        where: { id },
        data: { clientId: dto.clientId },
        include: leadInclude,
      });
      return this.project(updated);
    }

    if (!dto.create) {
      throw new BadRequestException('Provide clientId or create payload');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          firstName: dto.create!.firstName,
          lastName: dto.create!.lastName,
          idNumber: dto.create!.idNumber,
          email: dto.create!.email ?? null,
          phone: dto.create!.phone,
          altPhone: dto.create!.altPhone ?? null,
          addressLine1: dto.create!.addressLine1,
          addressLine2: dto.create!.addressLine2 ?? null,
          city: dto.create!.city,
          province: dto.create!.province ?? null,
          postalCode: dto.create!.postalCode ?? null,
          notes: dto.create!.notes ?? null,
        },
      });
      return tx.lead.update({
        where: { id },
        data: { clientId: client.id },
        include: leadInclude,
      });
    });

    return this.project(created);
  }

  async creativeReport(viewer: User, query: CreativeReportQuery) {
    if (!hasPermission(viewer.role, Permission.LEADS_REPORTS)) {
      throw new ForbiddenException('Missing permission: LEADS_REPORTS');
    }

    const rows = await this.prisma.lead.findMany({
      where: {
        ...(query.includeArchived ? {} : { archivedAt: null }),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      select: {
        creativeType: true,
        qualificationStatus: true,
        stage: true,
        sourceCreatedAt: true,
        createdAt: true,
        firstAttemptAt: true,
        firstContactAt: true,
        stageHistory: { select: { toStage: true } },
      },
    });

    return {
      label: 'Lead & Funnel Performance',
      note: 'Internal quality and handling metrics only — no advertising spend / CPL.',
      buckets: buildCreativeReport(
        rows.map((row) => ({
          ...row,
          reachedStages: [
            ...new Set([row.stage, ...row.stageHistory.map((h) => h.toStage)]),
          ],
        })),
      ),
    };
  }
}
