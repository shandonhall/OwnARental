import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { User } from '../generated/prisma/client';
import {
  LeadQualificationStatus,
  LeadSource,
  LeadStage,
  NotificationKind,
  NotificationSeverity,
} from '../generated/prisma/enums';
import { ClientsService } from '../clients/clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { LEAD_STAGES } from './leads.schemas';
import type {
  AssignLeadDto,
  ConvertLeadDto,
  CreateLeadDto,
  ListLeadsQuery,
  LogLeadContactDto,
  QualifyLeadDto,
  UpdateLeadDto,
  UpdateLeadStageDto,
} from './leads.schemas';

const leadInclude = {
  assignedUser: {
    select: { id: true, fullName: true, email: true, role: true },
  },
  createdByUser: {
    select: { id: true, fullName: true, email: true, role: true },
  },
  requestedVehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      registration: true,
      year: true,
    },
  },
  client: {
    select: { id: true, firstName: true, lastName: true },
  },
  wonContract: {
    select: { id: true, status: true, planType: true },
  },
  stageHistory: {
    orderBy: { changedAt: 'desc' as const },
    take: 20,
    include: {
      actor: {
        select: { id: true, fullName: true },
      },
    },
  },
} satisfies Prisma.LeadInclude;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: ClientsService,
  ) {}

  async getBoard(query: ListLeadsQuery) {
    const leads = await this.findMany(query);
    const cards = leads.map((lead) => this.serialize(lead));
    return {
      generatedAt: new Date().toISOString(),
      total: cards.length,
      columns: LEAD_STAGES.map((stage) => ({
        stage,
        label: stageLabel(stage),
        cards: cards.filter((card) => card.stage === stage),
      })),
    };
  }

  async findAll(query: ListLeadsQuery) {
    const leads = await this.findMany(query);
    return leads.map((lead) => this.serialize(lead));
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: leadInclude,
    });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    return this.serialize(lead);
  }

  async create(body: CreateLeadDto, actor: User) {
    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          cellphone: body.cellphone.trim(),
          email: body.email ?? null,
          area: body.area ?? null,
          salaryBand: body.salaryBand ?? null,
          rentalType: body.rentalType ?? null,
          vehicleNeededTiming: body.vehicleNeededTiming ?? null,
          vehiclePreference: body.vehiclePreference ?? null,
          hasValidDriversLicence: body.hasValidDriversLicence ?? null,
          source: body.source ?? LeadSource.MANUAL,
          sourceDetail: body.sourceDetail ?? null,
          notes: body.notes ?? null,
          createdByUserId: actor.id,
        },
      });
      await tx.leadStageHistory.create({
        data: {
          leadId: created.id,
          fromStage: null,
          toStage: LeadStage.NEW,
          actorUserId: actor.id,
          reason: 'Lead created',
        },
      });
      return tx.lead.findUniqueOrThrow({
        where: { id: created.id },
        include: leadInclude,
      });
    });
    return this.serialize(lead);
  }

  async update(id: string, body: UpdateLeadDto) {
    await this.requireLead(id);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(body.firstName != null ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName != null ? { lastName: body.lastName.trim() } : {}),
        ...(body.cellphone != null ? { cellphone: body.cellphone.trim() } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.area !== undefined ? { area: body.area } : {}),
        ...(body.salaryBand !== undefined ? { salaryBand: body.salaryBand } : {}),
        ...(body.rentalType !== undefined ? { rentalType: body.rentalType } : {}),
        ...(body.vehicleNeededTiming !== undefined
          ? { vehicleNeededTiming: body.vehicleNeededTiming }
          : {}),
        ...(body.vehiclePreference !== undefined
          ? { vehiclePreference: body.vehiclePreference }
          : {}),
        ...(body.hasValidDriversLicence !== undefined
          ? { hasValidDriversLicence: body.hasValidDriversLicence }
          : {}),
        ...(body.source != null ? { source: body.source } : {}),
        ...(body.sourceDetail !== undefined
          ? { sourceDetail: body.sourceDetail }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.requestedVehicleId !== undefined
          ? { requestedVehicleId: body.requestedVehicleId }
          : {}),
      },
      include: leadInclude,
    });
    return this.serialize(lead);
  }

  async updateStage(id: string, body: UpdateLeadStageDto, actor: User) {
    const existing = await this.requireLead(id);
    if (existing.stage === body.stage) {
      return this.findOne(id);
    }
    if (
      body.stage === LeadStage.CLOSED_LOST &&
      existing.qualificationStatus !== LeadQualificationStatus.UNQUALIFIED &&
      !body.lossReason
    ) {
      throw new BadRequestException(
        'A loss reason is required to close a lead as lost',
      );
    }

    const closed =
      body.stage === LeadStage.CLOSED_WON ||
      body.stage === LeadStage.CLOSED_LOST;

    const lead = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: {
          stage: body.stage,
          closedAt: closed ? existing.closedAt ?? new Date() : null,
          ...(body.lossReason !== undefined
            ? { lossReason: body.lossReason }
            : {}),
          ...(body.lossNotes !== undefined ? { lossNotes: body.lossNotes } : {}),
          ...(body.stage === LeadStage.DOCUMENTS_REQUESTED &&
          !existing.documentsReceivedAt
            ? {}
            : {}),
        },
      });
      await tx.leadStageHistory.create({
        data: {
          leadId: id,
          fromStage: existing.stage,
          toStage: body.stage,
          actorUserId: actor.id,
          reason: body.reason ?? null,
        },
      });
      return tx.lead.findUniqueOrThrow({
        where: { id: updated.id },
        include: leadInclude,
      });
    });
    return this.serialize(lead);
  }

  async assign(id: string, body: AssignLeadDto, actor: User) {
    const existing = await this.requireLead(id);
    const nextUserId = body.userId;

    if (nextUserId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: nextUserId },
      });
      if (!assignee || !assignee.isActive) {
        throw new BadRequestException('Assignee is not an active staff user');
      }
    }

    const lead = await this.prisma.$transaction(async (tx) => {
      if (existing.assignedUserId && existing.assignedUserId !== nextUserId) {
        await tx.leadAssignment.updateMany({
          where: {
            leadId: id,
            userId: existing.assignedUserId,
            unassignedAt: null,
          },
          data: { unassignedAt: new Date() },
        });
      }

      if (nextUserId && existing.assignedUserId !== nextUserId) {
        await tx.leadAssignment.create({
          data: {
            leadId: id,
            userId: nextUserId,
            assignedByUserId: actor.id,
            reason: body.reason ?? null,
          },
        });
      }

      const updated = await tx.lead.update({
        where: { id },
        data: {
          assignedUserId: nextUserId,
          assignedAt: nextUserId ? new Date() : null,
        },
        include: leadInclude,
      });

      if (nextUserId) {
        const title = `${updated.firstName} ${updated.lastName} assigned`;
        await tx.notification.upsert({
          where: { dedupeKey: `lead-assigned:${id}:${nextUserId}` },
          create: {
            dedupeKey: `lead-assigned:${id}:${nextUserId}`,
            kind: NotificationKind.LEAD_ASSIGNED,
            severity: NotificationSeverity.MEDIUM,
            title,
            detail: `Assigned by ${actor.fullName}`,
            href: `/leads/${id}`,
            entityType: 'lead',
            entityId: id,
          },
          update: {
            active: true,
            title,
            detail: `Assigned by ${actor.fullName}`,
            href: `/leads/${id}`,
          },
        });
      }

      return updated;
    });

    return this.serialize(lead);
  }

  async qualify(id: string, body: QualifyLeadDto, actor: User) {
    const existing = await this.requireLead(id);
    const unqualified =
      body.qualificationStatus === LeadQualificationStatus.UNQUALIFIED;
    const nextStage = unqualified ? LeadStage.CLOSED_LOST : existing.stage;

    const lead = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: {
          qualificationStatus: body.qualificationStatus,
          disqualificationReason: unqualified
            ? body.disqualificationReason ?? null
            : null,
          disqualificationNotes: unqualified
            ? body.disqualificationNotes ?? null
            : null,
          stage: nextStage,
          closedAt: unqualified ? existing.closedAt ?? new Date() : existing.closedAt,
          ...(unqualified
            ? { lossReason: existing.lossReason ?? undefined }
            : {}),
        },
      });

      if (nextStage !== existing.stage) {
        await tx.leadStageHistory.create({
          data: {
            leadId: id,
            fromStage: existing.stage,
            toStage: nextStage,
            actorUserId: actor.id,
            reason: unqualified
              ? body.disqualificationReason ?? 'Unqualified'
              : null,
          },
        });
      }

      if (
        body.qualificationStatus === LeadQualificationStatus.QUALIFIED &&
        existing.stage === LeadStage.NEW
      ) {
        await tx.lead.update({
          where: { id },
          data: { stage: LeadStage.QUALIFYING },
        });
        await tx.leadStageHistory.create({
          data: {
            leadId: id,
            fromStage: LeadStage.NEW,
            toStage: LeadStage.QUALIFYING,
            actorUserId: actor.id,
            reason: 'Marked qualified',
          },
        });
      }

      return tx.lead.findUniqueOrThrow({
        where: { id: updated.id },
        include: leadInclude,
      });
    });

    return this.serialize(lead);
  }

  async logContact(id: string, body: LogLeadContactDto, actor: User) {
    const existing = await this.requireLead(id);
    const now = new Date();
    const reached = body.outcome === 'reached';
    const shouldAdvance =
      reached && existing.stage === LeadStage.NEW;

    const lead = await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: {
          lastContactAt: now,
          ...(existing.firstAttemptAt
            ? {}
            : {
                firstAttemptAt: now,
                firstAttemptChannel: body.channel,
              }),
          ...(reached && !existing.firstContactAt
            ? {
                firstContactAt: now,
                firstContactChannel: body.channel,
              }
            : {}),
          ...(shouldAdvance ? { stage: LeadStage.CONTACTED } : {}),
        },
      });

      if (shouldAdvance) {
        await tx.leadStageHistory.create({
          data: {
            leadId: id,
            fromStage: existing.stage,
            toStage: LeadStage.CONTACTED,
            actorUserId: actor.id,
            reason: `Reached via ${body.channel}`,
          },
        });
      }

      return tx.lead.findUniqueOrThrow({
        where: { id },
        include: leadInclude,
      });
    });

    return this.serialize(lead);
  }

  async convertToClient(id: string, body: ConvertLeadDto, actor: User) {
    const existing = await this.requireLead(id);
    if (existing.clientId) {
      throw new BadRequestException(
        'This lead is already linked to a client',
      );
    }
    if (existing.stage === LeadStage.CLOSED_LOST) {
      throw new BadRequestException(
        'Cannot convert a closed-lost lead. Re-open the stage first.',
      );
    }

    const idNumber = body.idNumber.trim();
    let clientId: string;
    let createdNew = false;

    const existingClient = await this.prisma.client.findUnique({
      where: { idNumber },
    });

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      try {
        const noteParts = [
          existing.notes?.trim() || null,
          `Converted from lead ${existing.id}`,
        ].filter(Boolean);
        const client = await this.clients.create({
          firstName: existing.firstName,
          lastName: existing.lastName,
          idNumber,
          phone: existing.cellphone,
          email: existing.email,
          addressLine1: body.addressLine1.trim(),
          addressLine2: body.addressLine2 ?? null,
          city: body.city.trim(),
          province: body.province ?? null,
          postalCode: body.postalCode ?? null,
          notes: noteParts.join('\n'),
        });
        clientId = client.id;
        createdNew = true;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'A client with this ID number already exists',
          );
        }
        throw error;
      }
    }

    const markWon = body.markWon !== false;
    const shouldCloseWon =
      markWon && existing.stage !== LeadStage.CLOSED_WON;

    const lead = await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: {
          clientId,
          ...(shouldCloseWon
            ? {
                stage: LeadStage.CLOSED_WON,
                closedAt: existing.closedAt ?? new Date(),
              }
            : {}),
        },
      });

      if (shouldCloseWon) {
        await tx.leadStageHistory.create({
          data: {
            leadId: id,
            fromStage: existing.stage,
            toStage: LeadStage.CLOSED_WON,
            actorUserId: actor.id,
            reason: createdNew
              ? 'Converted to new client'
              : 'Linked to existing client',
          },
        });
      }

      return tx.lead.findUniqueOrThrow({
        where: { id },
        include: leadInclude,
      });
    });

    return this.serialize(lead);
  }

  /**
   * Ingest a lead from GHL / Meta (flexible payload keys).
   * Idempotent on externalLeadId when provided.
   */
  async ingestExternalLead(payload: Record<string, unknown>) {
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = payload[key];
        if (value == null) continue;
        const text = String(value).trim();
        if (text) return text;
      }
      return null;
    };

    const firstName =
      pick('firstName', 'first_name', 'First Name', 'first name') ?? 'Unknown';
    const lastName =
      pick('lastName', 'last_name', 'Last Name', 'last name') ?? 'Lead';
    const cellphone =
      pick(
        'cellphone',
        'phone',
        'Phone',
        'phone_number',
        'mobile',
        'Mobile Phone',
      ) ?? null;
    if (!cellphone || cellphone.length < 7) {
      throw new BadRequestException(
        'Inbound lead requires a phone number (phone / cellphone)',
      );
    }

    const email = pick('email', 'Email', 'email_address');
    const externalLeadId = pick(
      'externalLeadId',
      'external_lead_id',
      'lead_id',
      'id',
      'contact_id',
      'contactId',
    );
    const campaignName = pick(
      'campaignName',
      'campaign_name',
      'Campaign Name',
      'campaign',
    );
    const adName = pick('adName', 'ad_name', 'Ad Name', 'ad');
    const formName = pick('formName', 'form_name', 'Form Name', 'form');
    const platform = pick('platform', 'Platform') ?? 'facebook';
    const area = pick('area', 'city', 'City', 'location');
    const notes = pick('notes', 'Notes', 'message', 'Message');
    const sourceDetail = pick('sourceDetail', 'source_detail') ?? 'GHL webhook';

    if (externalLeadId) {
      const existing = await this.prisma.lead.findFirst({
        where: { externalLeadId },
        include: leadInclude,
      });
      if (existing) {
        return {
          ok: true,
          duplicate: true,
          lead: this.serialize(existing),
        };
      }
    }

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          firstName,
          lastName,
          cellphone,
          email,
          area,
          source: LeadSource.META_LEAD_FORM,
          sourceDetail,
          platform,
          campaignName,
          adName,
          formName,
          externalLeadId,
          notes,
          utmSource: pick('utm_source', 'utmSource'),
          utmCampaign: pick('utm_campaign', 'utmCampaign'),
        },
      });
      await tx.leadStageHistory.create({
        data: {
          leadId: created.id,
          fromStage: null,
          toStage: LeadStage.NEW,
          actorUserId: null,
          reason: 'Inbound GHL / Meta lead',
        },
      });
      return tx.lead.findUniqueOrThrow({
        where: { id: created.id },
        include: leadInclude,
      });
    });

    return {
      ok: true,
      duplicate: false,
      lead: this.serialize(lead),
    };
  }

  private async findMany(query: ListLeadsQuery) {
    const search = query.search?.trim();
    return this.prisma.lead.findMany({
      where: {
        ...(query.includeArchived ? {} : { archivedAt: null }),
        ...(query.stage ? { stage: query.stage } : {}),
        ...(query.source ? { source: query.source } : {}),
        ...(query.assignedUserId
          ? { assignedUserId: query.assignedUserId }
          : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { cellphone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
                { area: { contains: search, mode: 'insensitive' } },
                { campaignName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: leadInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private async requireLead(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    return lead;
  }

  private serialize(
    lead: Prisma.LeadGetPayload<{ include: typeof leadInclude }>,
  ) {
    return {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      fullName: `${lead.firstName} ${lead.lastName}`,
      cellphone: lead.cellphone,
      email: lead.email,
      area: lead.area,
      salaryBand: lead.salaryBand,
      rentalType: lead.rentalType,
      vehicleNeededTiming: lead.vehicleNeededTiming,
      vehiclePreference: lead.vehiclePreference,
      hasValidDriversLicence: lead.hasValidDriversLicence,
      source: lead.source,
      sourceDetail: lead.sourceDetail,
      platform: lead.platform,
      campaignName: lead.campaignName,
      adName: lead.adName,
      formName: lead.formName,
      utmSource: lead.utmSource,
      utmCampaign: lead.utmCampaign,
      externalLeadId: lead.externalLeadId,
      stage: lead.stage,
      qualificationStatus: lead.qualificationStatus,
      disqualificationReason: lead.disqualificationReason,
      disqualificationNotes: lead.disqualificationNotes,
      lossReason: lead.lossReason,
      lossNotes: lead.lossNotes,
      notes: lead.notes,
      assignedAt: lead.assignedAt?.toISOString() ?? null,
      firstAttemptAt: lead.firstAttemptAt?.toISOString() ?? null,
      firstAttemptChannel: lead.firstAttemptChannel,
      firstContactAt: lead.firstContactAt?.toISOString() ?? null,
      firstContactChannel: lead.firstContactChannel,
      lastContactAt: lead.lastContactAt?.toISOString() ?? null,
      documentsReceivedAt: lead.documentsReceivedAt?.toISOString() ?? null,
      closedAt: lead.closedAt?.toISOString() ?? null,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      href: `/leads/${lead.id}`,
      assignedUser: lead.assignedUser,
      createdByUser: lead.createdByUser,
      requestedVehicle: lead.requestedVehicle,
      client: lead.client,
      wonContract: lead.wonContract,
      stageHistory: lead.stageHistory.map((entry) => ({
        id: entry.id,
        fromStage: entry.fromStage,
        toStage: entry.toStage,
        reason: entry.reason,
        changedAt: entry.changedAt.toISOString(),
        actor: entry.actor,
      })),
    };
  }
}

function stageLabel(stage: LeadStage) {
  switch (stage) {
    case LeadStage.NEW:
      return 'New';
    case LeadStage.CONTACTED:
      return 'Contacted';
    case LeadStage.QUALIFYING:
      return 'Qualifying';
    case LeadStage.DOCUMENTS_REQUESTED:
      return 'Documents';
    case LeadStage.APPLICATION_SUBMITTED:
      return 'Application';
    case LeadStage.APPROVED:
      return 'Approved';
    case LeadStage.VEHICLE_SELECTED:
      return 'Vehicle selected';
    case LeadStage.CLOSED_WON:
      return 'Won';
    case LeadStage.CLOSED_LOST:
      return 'Lost';
    default:
      return stage;
  }
}
