import type {
  GhlContactInput,
  GhlOpportunityInput,
  GhlProvider,
  GhlWorkflowPayload,
} from './ghl.types';

/**
 * Live GoHighLevel adapter (API v2 + workflow inbound webhooks).
 * Requires GHL_API_KEY + GHL_LOCATION_ID. Optional GHL_API_URL / webhook URLs.
 */
export class LiveGhlProvider implements GhlProvider {
  readonly mode = 'live' as const;

  constructor(
    private readonly apiKey: string,
    private readonly locationId: string,
    private readonly apiUrl: string,
    private readonly webhookUrl: string | null,
    private readonly webhookByEvent: Partial<
      Record<GhlWorkflowPayload['event'], string>
    >,
    private readonly pipelineId: string | null,
    private readonly pipelineStageId: string | null,
  ) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Version: '2021-07-28',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private base() {
    return this.apiUrl.replace(/\/$/, '');
  }

  async upsertContact(input: GhlContactInput): Promise<{ contactId: string }> {
    const body = {
      locationId: this.locationId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? undefined,
      phone: input.phone,
      address1: input.addressLine1,
      city: input.city,
      state: input.province ?? undefined,
      postalCode: input.postalCode ?? undefined,
      tags: input.tags ?? ['own-a-rental', 'fleet-client'],
      customFields: [
        { key: 'sa_id_number', field_value: input.idNumber },
        { key: 'oar_client_id', field_value: input.clientId },
      ],
    };

    if (input.existingContactId) {
      const response = await fetch(
        `${this.base()}/contacts/${encodeURIComponent(input.existingContactId)}`,
        {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        throw new Error(`GHL contact update failed (${response.status})`);
      }
      return { contactId: input.existingContactId };
    }

    const response = await fetch(`${this.base()}/contacts/upsert`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`GHL contact upsert failed (${response.status})`);
    }

    const json = (await response.json()) as {
      contact?: { id?: string };
      id?: string;
    };
    const contactId = json.contact?.id ?? json.id;
    if (!contactId) {
      throw new Error('GHL contact upsert returned no id');
    }
    return { contactId };
  }

  async createOpportunity(
    input: GhlOpportunityInput,
  ): Promise<{ opportunityId: string }> {
    if (input.existingOpportunityId) {
      return { opportunityId: input.existingOpportunityId };
    }

    const body: Record<string, unknown> = {
      locationId: this.locationId,
      name: `${input.clientName} · ${input.vehicleRegistration} · End of term`,
      status: 'open',
      contactId: input.contactId ?? undefined,
      monetaryValue: 0,
      source: 'Own A Rental dashboard',
    };

    if (this.pipelineId) body.pipelineId = this.pipelineId;
    if (this.pipelineStageId) body.pipelineStageId = this.pipelineStageId;

    const response = await fetch(`${this.base()}/opportunities/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`GHL opportunity create failed (${response.status})`);
    }

    const json = (await response.json()) as {
      opportunity?: { id?: string };
      id?: string;
    };
    const opportunityId = json.opportunity?.id ?? json.id;
    if (!opportunityId) {
      throw new Error('GHL opportunity create returned no id');
    }
    return { opportunityId };
  }

  async emitWorkflow(
    payload: GhlWorkflowPayload,
  ): Promise<{ messageId: string }> {
    const url = this.webhookByEvent[payload.event] ?? this.webhookUrl ?? null;
    if (!url) {
      throw new Error(
        `No GHL webhook configured for event ${payload.event} (set GHL_WEBHOOK_URL or event-specific URL)`,
      );
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...payload,
        locationId: this.locationId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GHL workflow webhook failed for ${payload.event} (${response.status})`,
      );
    }

    return { messageId: `ghl-${payload.event}-${Date.now()}` };
  }
}
