import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client, Contract, Vehicle } from '../generated/prisma/client';
import { EndOfTermStage } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MockGhlProvider } from './ghl.mock';
import { LiveGhlProvider } from './ghl.live';
import type {
  GhlProvider,
  GhlWorkflowEvent,
  GhlWorkflowPayload,
} from './ghl.types';

type ClientLike = Pick<
  Client,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'idNumber'
  | 'addressLine1'
  | 'city'
  | 'province'
  | 'postalCode'
  | 'ghlContactId'
>;

@Injectable()
export class GhlService {
  private readonly logger = new Logger(GhlService.name);
  private readonly provider: GhlProvider;
  private lastError: string | null = null;
  private lastEventAt: Date | null = null;
  private lastEvent: GhlWorkflowEvent | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GHL_API_KEY')?.trim();
    const locationId = this.config.get<string>('GHL_LOCATION_ID')?.trim();
    const apiUrl =
      this.config.get<string>('GHL_API_URL')?.trim() ||
      'https://services.leadconnectorhq.com';
    const webhookUrl = this.config.get<string>('GHL_WEBHOOK_URL')?.trim() || null;

    if (apiKey && locationId) {
      this.provider = new LiveGhlProvider(
        apiKey,
        locationId,
        apiUrl,
        webhookUrl,
        {
          PAYMENT_REMINDER: this.config
            .get<string>('GHL_WEBHOOK_PAYMENT_REMINDER')
            ?.trim(),
          LATE_PAYMENT: this.config
            .get<string>('GHL_WEBHOOK_LATE_PAYMENT')
            ?.trim(),
          MISSED_PAYMENT: this.config
            .get<string>('GHL_WEBHOOK_MISSED_PAYMENT')
            ?.trim(),
          RULE_BREACH: this.config
            .get<string>('GHL_WEBHOOK_RULE_BREACH')
            ?.trim(),
          SPEEDING: this.config.get<string>('GHL_WEBHOOK_SPEEDING')?.trim(),
          GEOFENCE_EXIT: this.config
            .get<string>('GHL_WEBHOOK_GEOFENCE')
            ?.trim(),
          LOW_DRIVER_SCORE: this.config
            .get<string>('GHL_WEBHOOK_LOW_SCORE')
            ?.trim(),
          END_OF_TERM: this.config
            .get<string>('GHL_WEBHOOK_END_OF_TERM')
            ?.trim(),
          IMMOBILIZE_RECOMMENDED: this.config
            .get<string>('GHL_WEBHOOK_IMMOBILIZE')
            ?.trim(),
          IMMOBILIZED: this.config
            .get<string>('GHL_WEBHOOK_IMMOBILIZE')
            ?.trim(),
          MOBILIZED: this.config
            .get<string>('GHL_WEBHOOK_IMMOBILIZE')
            ?.trim(),
          FINE_INVOICE: this.config
            .get<string>('GHL_WEBHOOK_FINE_INVOICE')
            ?.trim(),
        },
        this.config.get<string>('GHL_PIPELINE_ID')?.trim() || null,
        this.config.get<string>('GHL_PIPELINE_STAGE_ID')?.trim() || null,
      );
    } else {
      this.provider = new MockGhlProvider();
    }
  }

  getStatus() {
    return {
      provider: this.provider.mode,
      handshake: 'ok' as const,
      message:
        this.provider.mode === 'live'
          ? 'Connected to GoHighLevel API'
          : 'Using mock GHL provider (set GHL_API_KEY + GHL_LOCATION_ID for live)',
      lastError: this.lastError,
      lastEvent: this.lastEvent,
      lastEventAt: this.lastEventAt?.toISOString() ?? null,
      webhookConfigured: Boolean(
        this.config.get<string>('GHL_WEBHOOK_URL')?.trim(),
      ),
    };
  }

  async syncClientContact(client: ClientLike) {
    try {
      const result = await this.provider.upsertContact({
        clientId: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        idNumber: client.idNumber,
        addressLine1: client.addressLine1,
        city: client.city,
        province: client.province,
        postalCode: client.postalCode,
        existingContactId: client.ghlContactId,
        tags: ['own-a-rental', 'fleet-client'],
      });

      if (result.contactId !== client.ghlContactId) {
        await this.prisma.client.update({
          where: { id: client.id },
          data: { ghlContactId: result.contactId },
        });
      }

      this.lastError = null;
      return result.contactId;
    } catch (error) {
      this.captureError(error, 'syncClientContact');
      return client.ghlContactId;
    }
  }

  async emitEvent(payload: GhlWorkflowPayload) {
    try {
      const result = await this.provider.emitWorkflow(payload);
      this.lastEvent = payload.event;
      this.lastEventAt = new Date();
      this.lastError = null;
      return result;
    } catch (error) {
      this.captureError(error, `emitEvent:${payload.event}`);
      return null;
    }
  }

  async notifyRuleBreach(input: {
    vehicle: Pick<
      Vehicle,
      'id' | 'registration' | 'make' | 'model' | 'driverScore' | 'status'
    >;
    client: ClientLike | null;
    contract: Pick<Contract, 'id' | 'planType' | 'status'> | null;
    code: string;
    severity: string;
    message: string;
  }) {
    const event = mapBreachEvent(input.code);
    await this.emitEvent({
      event,
      occurredAt: new Date().toISOString(),
      client: input.client ? toClientPayload(input.client) : undefined,
      vehicle: {
        id: input.vehicle.id,
        registration: input.vehicle.registration,
        make: input.vehicle.make,
        model: input.vehicle.model,
        driverScore: input.vehicle.driverScore,
        status: input.vehicle.status,
      },
      contract: input.contract
        ? {
            id: input.contract.id,
            planType: input.contract.planType,
            status: input.contract.status,
            endDate: null,
          }
        : undefined,
      code: input.code,
      severity: input.severity,
      detail: input.message,
    });

    if (
      input.code === 'GEOFENCE_EXIT' &&
      input.severity === 'high' &&
      (input.vehicle.status === 'ARREARS' ||
        input.contract?.status === 'ARREARS')
    ) {
      await this.emitEvent({
        event: 'IMMOBILIZE_RECOMMENDED',
        occurredAt: new Date().toISOString(),
        client: input.client ? toClientPayload(input.client) : undefined,
        vehicle: {
          id: input.vehicle.id,
          registration: input.vehicle.registration,
          make: input.vehicle.make,
          model: input.vehicle.model,
          driverScore: input.vehicle.driverScore,
          status: input.vehicle.status,
        },
        contract: input.contract
          ? {
              id: input.contract.id,
              planType: input.contract.planType,
              status: input.contract.status,
              endDate: null,
            }
          : undefined,
        code: input.code,
        severity: 'high',
        detail:
          'High-risk geofence exit while in arrears — Super Admin review for immobilization',
      });
    }
  }

  async notifyLowDriverScore(input: {
    vehicle: Pick<
      Vehicle,
      'id' | 'registration' | 'make' | 'model' | 'driverScore' | 'status'
    >;
    client: ClientLike | null;
    previousScore: number | null;
    score: number;
  }) {
    if (input.score >= 65) return;
    if (input.previousScore != null && input.previousScore < 65) return;

    await this.emitEvent({
      event: 'LOW_DRIVER_SCORE',
      occurredAt: new Date().toISOString(),
      client: input.client ? toClientPayload(input.client) : undefined,
      vehicle: {
        id: input.vehicle.id,
        registration: input.vehicle.registration,
        make: input.vehicle.make,
        model: input.vehicle.model,
        driverScore: input.score,
        status: input.vehicle.status,
      },
      detail: `Driver score dropped to ${input.score}`,
      metadata: { previousScore: input.previousScore },
    });
  }

  async notifyImmobilizeChange(input: {
    immobilize: boolean;
    vehicle: Pick<
      Vehicle,
      'id' | 'registration' | 'make' | 'model' | 'driverScore' | 'status'
    >;
    client: ClientLike | null;
    actorEmail: string;
  }) {
    await this.emitEvent({
      event: input.immobilize ? 'IMMOBILIZED' : 'MOBILIZED',
      occurredAt: new Date().toISOString(),
      client: input.client ? toClientPayload(input.client) : undefined,
      vehicle: {
        id: input.vehicle.id,
        registration: input.vehicle.registration,
        make: input.vehicle.make,
        model: input.vehicle.model,
        driverScore: input.vehicle.driverScore,
        status: input.vehicle.status,
      },
      detail: `${input.immobilize ? 'Immobilized' : 'Mobilized'} by ${input.actorEmail}`,
    });
  }

  async notifyPaymentIssue(input: {
    event: Extract<
      GhlWorkflowEvent,
      'PAYMENT_REMINDER' | 'LATE_PAYMENT' | 'MISSED_PAYMENT'
    >;
    client: ClientLike;
    contract: Pick<Contract, 'id' | 'planType' | 'status' | 'endDate'>;
    vehicle: Pick<
      Vehicle,
      'id' | 'registration' | 'make' | 'model' | 'driverScore' | 'status'
    > | null;
    amount: number;
    detail: string;
    ledgerEntryId: string;
  }) {
    const result = await this.emitEvent({
      event: input.event,
      occurredAt: new Date().toISOString(),
      client: toClientPayload(input.client),
      contract: {
        id: input.contract.id,
        planType: input.contract.planType,
        status: input.contract.status,
        endDate: input.contract.endDate.toISOString(),
      },
      vehicle: input.vehicle
        ? {
            id: input.vehicle.id,
            registration: input.vehicle.registration,
            make: input.vehicle.make,
            model: input.vehicle.model,
            driverScore: input.vehicle.driverScore,
            status: input.vehicle.status,
          }
        : undefined,
      amount: input.amount,
      detail: input.detail,
      metadata: { ledgerEntryId: input.ledgerEntryId },
    });

    if (result) {
      const entry = await this.prisma.ledgerEntry.findUnique({
        where: { id: input.ledgerEntryId },
        select: { metadata: true },
      });
      const metadata =
        entry?.metadata &&
        typeof entry.metadata === 'object' &&
        !Array.isArray(entry.metadata)
          ? { ...(entry.metadata as Record<string, unknown>) }
          : {};
      await this.prisma.ledgerEntry.update({
        where: { id: input.ledgerEntryId },
        data: {
          metadata: {
            ...metadata,
            ghlMessageId: result.messageId,
            ghlNotifiedAt: new Date().toISOString(),
            ghlEvent: input.event,
          },
        },
      });
    }
  }

  async pushEndOfTermOpportunity(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { client: true, vehicle: true },
    });
    if (!contract) return null;
    if (contract.ghlOpportunityId && contract.endOfTermNotifiedAt) {
      return contract.ghlOpportunityId;
    }

    let contactId = contract.client.ghlContactId;
    if (!contactId) {
      contactId = (await this.syncClientContact(contract.client)) ?? null;
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );

    try {
      const opportunity = await this.provider.createOpportunity({
        contractId: contract.id,
        contactId,
        clientName: `${contract.client.firstName} ${contract.client.lastName}`,
        vehicleRegistration: contract.vehicle.registration,
        planType: contract.planType,
        endDate: contract.endDate.toISOString(),
        daysRemaining,
        existingOpportunityId: contract.ghlOpportunityId,
      });

      await this.prisma.contract.update({
        where: { id: contract.id },
        data: {
          ghlOpportunityId: opportunity.opportunityId,
          endOfTermNotifiedAt: new Date(),
          endOfTermStage: EndOfTermStage.CONTACTED,
        },
      });

      await this.emitEvent({
        event: 'END_OF_TERM',
        occurredAt: new Date().toISOString(),
        client: toClientPayload({
          ...contract.client,
          ghlContactId: contactId,
        }),
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
        detail: `Final ${daysRemaining} days — opportunity ${opportunity.opportunityId}`,
        metadata: { opportunityId: opportunity.opportunityId, daysRemaining },
      });

      this.lastError = null;
      return opportunity.opportunityId;
    } catch (error) {
      this.captureError(error, 'pushEndOfTermOpportunity');
      return null;
    }
  }

  private captureError(error: unknown, context: string) {
    const message =
      error instanceof Error ? error.message : 'Unknown GHL error';
    this.lastError = `${context}: ${message}`;
    this.logger.warn(this.lastError);
  }
}

function toClientPayload(client: ClientLike) {
  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    email: client.email,
    ghlContactId: client.ghlContactId,
  };
}

function mapBreachEvent(code: string): GhlWorkflowEvent {
  const normalized = code.toUpperCase();
  if (normalized.includes('SPEED')) return 'SPEEDING';
  if (normalized.includes('GEOFENCE')) return 'GEOFENCE_EXIT';
  return 'RULE_BREACH';
}
