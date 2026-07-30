import { Logger } from '@nestjs/common';
import type {
  GhlContactInput,
  GhlOpportunityInput,
  GhlProvider,
  GhlWorkflowPayload,
} from './ghl.types';

/** Demo provider when GHL credentials are not configured. */
export class MockGhlProvider implements GhlProvider {
  readonly mode = 'mock' as const;
  private readonly logger = new Logger(MockGhlProvider.name);

  async upsertContact(
    input: GhlContactInput,
  ): Promise<{ contactId: string }> {
    const contactId =
      input.existingContactId ??
      `MOCK-CONTACT-${input.clientId.replace(/-/g, '').slice(0, 10)}`;
    this.logger.log(
      `[mock] upsert contact ${contactId} · ${input.firstName} ${input.lastName} · ${input.phone}`,
    );
    return { contactId };
  }

  async createOpportunity(
    input: GhlOpportunityInput,
  ): Promise<{ opportunityId: string }> {
    const opportunityId =
      input.existingOpportunityId ??
      `MOCK-OPP-${input.contractId.replace(/-/g, '').slice(0, 10)}`;
    this.logger.log(
      `[mock] opportunity ${opportunityId} · ${input.clientName} · ${input.vehicleRegistration} · ${input.daysRemaining}d remaining`,
    );
    return { opportunityId };
  }

  async emitWorkflow(
    payload: GhlWorkflowPayload,
  ): Promise<{ messageId: string }> {
    const messageId = `mock-msg-${Date.now().toString(36)}`;
    this.logger.log(
      `[mock] workflow ${payload.event} → ${payload.client?.phone ?? 'n/a'} · ${payload.detail ?? ''}`,
    );
    return { messageId };
  }
}
