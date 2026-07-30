export type GhlWorkflowEvent =
  | 'PAYMENT_REMINDER'
  | 'LATE_PAYMENT'
  | 'MISSED_PAYMENT'
  | 'RULE_BREACH'
  | 'SPEEDING'
  | 'GEOFENCE_EXIT'
  | 'LOW_DRIVER_SCORE'
  | 'END_OF_TERM'
  | 'IMMOBILIZE_RECOMMENDED'
  | 'IMMOBILIZED'
  | 'MOBILIZED';

export type GhlContactInput = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  idNumber: string;
  addressLine1: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  existingContactId?: string | null;
  tags?: string[];
};

export type GhlOpportunityInput = {
  contractId: string;
  contactId: string | null;
  clientName: string;
  vehicleRegistration: string;
  planType: string;
  endDate: string;
  daysRemaining: number;
  existingOpportunityId?: string | null;
};

export type GhlWorkflowPayload = {
  event: GhlWorkflowEvent;
  occurredAt: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    ghlContactId: string | null;
  };
  vehicle?: {
    id: string;
    registration: string;
    make: string;
    model: string;
    driverScore: number | null;
    status: string;
  };
  contract?: {
    id: string;
    planType: string;
    status: string;
    endDate: string | null;
  };
  amount?: number | null;
  detail?: string;
  code?: string;
  severity?: string;
  metadata?: Record<string, unknown>;
};

export type GhlProvider = {
  readonly mode: 'mock' | 'live';
  upsertContact(input: GhlContactInput): Promise<{ contactId: string }>;
  createOpportunity(
    input: GhlOpportunityInput,
  ): Promise<{ opportunityId: string }>;
  emitWorkflow(payload: GhlWorkflowPayload): Promise<{ messageId: string }>;
};
