import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ingestionSecretsMatch } from './lead-ingestion.auth';
import type { IngestLeadDto } from './leads.schemas';

const staffSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

@Injectable()
export class LeadIngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  assertBearerSecret(authorizationHeader: string | undefined): void {
    const expected = this.config.get<string>('LEAD_INGESTION_SECRET')?.trim();
    if (!expected) {
      throw new UnauthorizedException('Lead ingestion is not configured');
    }
    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (!token || !ingestionSecretsMatch(token, expected)) {
      throw new UnauthorizedException('Invalid ingestion credentials');
    }
  }

  /**
   * Idempotent create on (source, externalLeadId).
   * Returns { lead, created } — created=false when an existing row is returned.
   */
  async ingest(dto: IngestLeadDto): Promise<{
    created: boolean;
    lead: Record<string, unknown>;
  }> {
    const existing = await this.prisma.lead.findFirst({
      where: {
        source: dto.source,
        externalLeadId: dto.externalLeadId,
      },
      include: {
        assignedUser: { select: staffSelect },
      },
    });

    if (existing) {
      return {
        created: false,
        lead: this.project(existing),
      };
    }

    const now = new Date();
    try {
      const lead = await this.prisma.$transaction(async (tx) => {
        const created = await tx.lead.create({
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
            externalLeadId: dto.externalLeadId,
            sourceCreatedAt: dto.sourceCreatedAt ?? null,
            notes: dto.notes ?? null,
            stage: 'NEW',
            qualificationStatus: 'UNASSESSED',
            deliverySystem: 'NONE',
          },
          include: {
            assignedUser: { select: staffSelect },
          },
        });

        await tx.leadStageHistory.create({
          data: {
            leadId: created.id,
            fromStage: null,
            toStage: 'NEW',
            actorUserId: null,
            changedAt: now,
            reason: 'Ingested',
          },
        });

        return created;
      });

      return { created: true, lead: this.project(lead) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.prisma.lead.findFirst({
          where: {
            source: dto.source,
            externalLeadId: dto.externalLeadId,
          },
          include: {
            assignedUser: { select: staffSelect },
          },
        });
        if (raced) {
          return { created: false, lead: this.project(raced) };
        }
      }
      throw error;
    }
  }

  private project(row: {
    id: string;
    firstName: string;
    lastName: string;
    cellphone: string;
    email: string | null;
    source: string;
    externalLeadId: string | null;
    creativeType: string;
    stage: string;
    qualificationStatus: string;
    sourceCreatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    assignedUserId: string | null;
    assignedUser: {
      id: string;
      fullName: string;
      email: string;
      role: string;
    } | null;
  }): Record<string, unknown> {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      cellphone: row.cellphone,
      email: row.email,
      source: row.source,
      externalLeadId: row.externalLeadId,
      creativeType: row.creativeType,
      stage: row.stage,
      qualificationStatus: row.qualificationStatus,
      assignedUserId: row.assignedUserId,
      assignedUser: row.assignedUser,
      sourceCreatedAt: row.sourceCreatedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
