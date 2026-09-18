import { createClient } from '@/lib/supabase/client';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'FLEET_MANAGER' | 'SALES' | 'FINANCE';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
};

export function isAdminRole(role: Role | string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function roleLabel(role: Role | string) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Admin';
  if (role === 'FLEET_MANAGER') return 'Fleet Manager';
  if (role === 'SALES') return 'Sales';
  if (role === 'FINANCE') return 'Finance';
  return 'User';
}

export type TaskCategory =
  | 'collections'
  | 'driver'
  | 'end_of_term'
  | 'fleet';

export function taskCategoryLabel(category: TaskCategory) {
  if (category === 'collections') return 'Collections & payments';
  if (category === 'driver') return 'Driver behaviour';
  if (category === 'end_of_term') return 'End of term';
  return 'Fleet & service';
}

export function taskCategoryHint(category: TaskCategory) {
  if (category === 'collections')
    return 'Arrears, late payments, and outstanding fines';
  if (category === 'driver')
    return 'Telematics rule breaches and behaviour alerts';
  if (category === 'end_of_term')
    return 'Ownership / return outreach before term ends';
  return 'Service due and fleet ops follow-ups';
}

export type VehicleStatus =
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'ARREARS'
  | 'PAID_UP'
  | 'RETURNED'
  | 'WRITTEN_OFF';

export type FicaStatus = 'PENDING' | 'PARTIAL' | 'COMPLETE' | 'REJECTED';

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  vin: string;
  registration: string;
  purchasePrice: string;
  purchaseDate: string | null;
  status: VehicleStatus;
  monthlyMileageLimit: number | null;
  carTrackDeviceId: string | null;
  currentOdometerKm: number;
  driverScore: number | null;
  isImmobilized?: boolean;
  warrantyProvider: string | null;
  warrantyStartDate: string | null;
  warrantyExpiryDate: string | null;
  warrantyKmLimit: number | null;
  warrantyNotes: string | null;
  nextServiceDueKm: number | null;
  nextServiceDueDate: string | null;
  notes: string | null;
  contracts: Array<{
    id: string;
    planType: string;
    status: string;
    monthlyRate: string;
    client: {
      id: string;
      firstName: string;
      lastName: string;
      city?: string;
    };
  }>;
};

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string | null;
  phone: string;
  altPhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  ficaStatus: FicaStatus;
  idDocumentUrl: string | null;
  driversLicenseUrl: string | null;
  payslipsUrl: string | null;
  bankStatementsUrl: string | null;
  proofOfResidenceUrl: string | null;
  handoverPhotosUrls: string[];
  notes: string | null;
  isActive: boolean;
  ghlContactId?: string | null;
  contracts: Array<{
    id: string;
    planType: string;
    status: string;
    outstandingBalance?: string;
    endDate?: string;
    vehicle?: {
      id: string;
      make: string;
      model: string;
      registration: string;
      driverScore?: number | null;
    };
  }>;
  opsSummary?: {
    arrears: boolean;
    outstandingBalance: string | null;
    pendingFineCount: number;
    pendingFineTotal: string;
    driverScore: number | null;
    activeContractId: string | null;
    alertCount: number;
    alerts: Array<{
      id: string;
      kind: string;
      detail: string;
      amount: string | null;
      contractId: string;
    }>;
  };
};

export type PendingFine = {
  id: string;
  type: 'FINE' | 'TOLL';
  amount: string;
  status: LedgerEntryStatus;
  dueDate: string | null;
  description: string | null;
  contractId: string;
  client: { id: string; firstName: string; lastName: string };
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
  } | null;
};

export type CreateClientInput = {
  firstName: string;
  lastName: string;
  idNumber: string;
  email?: string | null;
  phone: string;
  altPhone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  ficaStatus?: FicaStatus;
  idDocumentUrl?: string | null;
  driversLicenseUrl?: string | null;
  payslipsUrl?: string | null;
  bankStatementsUrl?: string | null;
  proofOfResidenceUrl?: string | null;
  notes?: string | null;
};

export type UpdateClientInput = Partial<CreateClientInput> & {
  isActive?: boolean;
};

export type CreateVehicleInput = {
  make: string;
  model: string;
  year: number;
  color?: string | null;
  vin: string;
  registration: string;
  purchasePrice: number | string;
  purchaseDate?: string | null;
  status?: VehicleStatus;
  monthlyMileageLimit?: number | null;
  carTrackDeviceId?: string | null;
  warrantyProvider?: string | null;
  warrantyStartDate?: string | null;
  warrantyExpiryDate?: string | null;
  warrantyKmLimit?: number | null;
  warrantyNotes?: string | null;
  nextServiceDueKm?: number | null;
  nextServiceDueDate?: string | null;
  notes?: string | null;
};

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export type PlanType = 'CIP_10' | 'CIP_20' | 'LONG_TERM';
export type ContractStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ARREARS'
  | 'COMPLETED'
  | 'DEFAULTED'
  | 'CANCELLED';

export type LedgerEntryType =
  | 'RENTAL_PAYMENT'
  | 'DEPOSIT'
  | 'BALLOON_PAYMENT'
  | 'FINE'
  | 'TOLL'
  | 'ADMIN_FEE'
  | 'MAINTENANCE'
  | 'ADJUSTMENT'
  | 'REFUND';

export type LedgerEntryStatus =
  | 'PENDING'
  | 'ON_TIME'
  | 'EARLY'
  | 'LATE'
  | 'FAILED'
  | 'VOID';

export type TermProgress = {
  percent: number;
  monthsElapsed: number;
  termMonths: number;
  daysRemaining: number;
  isFinalNinetyDays: boolean;
};

export type LedgerEntry = {
  id: string;
  contractId: string;
  type: LedgerEntryType;
  status: LedgerEntryStatus;
  amount: string;
  currency: string;
  dueDate: string | null;
  paidAt: string | null;
  reference: string | null;
  description: string | null;
};

export type Contract = {
  id: string;
  clientId: string;
  vehicleId: string;
  planType: PlanType;
  status: ContractStatus;
  termMonths: number;
  monthlyRate: string;
  depositAmount: string;
  balloonAmount: string | null;
  cipPercent: number | null;
  startDate: string;
  endDate: string;
  monthlyKmLimit: number | null;
  totalPaid: string;
  outstandingBalance: string;
  outstandingExBalloon?: string;
  balloonOutstanding?: string;
  hasBalloon?: boolean;
  balloonPaid?: boolean;
  monthOwed?: string;
  expectedTotal: string;
  notes: string | null;
  ghlOpportunityId?: string | null;
  endOfTermNotifiedAt?: string | null;
  termProgress: TermProgress;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    idNumber: string;
    phone: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    registration: string;
    purchasePrice: string;
  };
  ledger: LedgerEntry[];
};

export type CreateContractInput = {
  clientId: string;
  vehicleId: string;
  planType: PlanType;
  status?: ContractStatus;
  termMonths: number;
  monthlyRate: number | string;
  depositAmount?: number | string;
  balloonAmount?: number | string | null;
  cipPercent?: number | null;
  startDate: string;
  endDate?: string;
  monthlyKmLimit?: number | null;
  notes?: string | null;
};

export type UpdateContractInput = Partial<
  Omit<CreateContractInput, 'clientId' | 'vehicleId'>
>;

export type CreateLedgerInput = {
  type: LedgerEntryType;
  status?: LedgerEntryStatus;
  amount: number | string;
  dueDate?: string | null;
  paidAt?: string | null;
  reference?: string | null;
  description?: string | null;
};

export type ProfitabilityRow = {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  registration: string;
  status: VehicleStatus;
  purchasePrice: string;
  maintenanceAndFees: string;
  totalCost: string;
  rentalIncome: string;
  outstandingIncome: string;
  expectedIncome: string;
  profit: string;
  forecastProfit?: string;
  roiPercent: string | null;
  contractCount: number;
  mode?: 'lifetime' | 'period';
  from?: string | null;
  to?: string | null;
};

export type ProfitabilityTrendPoint = {
  key: string;
  label: string;
  year: number;
  month: number;
  received: string;
  costs: string;
  expected: string;
  owed: string;
  profit: string;
  forecastProfit: string;
};

export type ProfitabilityTrendResponse = {
  months: number;
  series: ProfitabilityTrendPoint[];
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getMe: () => apiFetch<AuthUser>('/auth/me'),

  getVehicles: (params?: { status?: VehicleStatus; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiFetch<Vehicle[]>(`/vehicles${qs ? `?${qs}` : ''}`);
  },
  /** Fleet page alias — same path as getVehicles (`GET /api/vehicles`). */
  getFleet: (params?: { status?: VehicleStatus; search?: string }) =>
    api.getVehicles(params),
  getVehicle: (id: string) => apiFetch<Vehicle>(`/vehicles/${id}`),
  createVehicle: (data: CreateVehicleInput) =>
    apiFetch<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateVehicle: (id: string, data: UpdateVehicleInput) =>
    apiFetch<Vehicle>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteVehicle: (id: string) =>
    apiFetch<Vehicle>(`/vehicles/${id}`, { method: 'DELETE' }),

  getClients: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch<Client[]>(`/clients${qs}`);
  },
  getClient: (id: string) => apiFetch<Client>(`/clients/${id}`),
  createClient: (data: CreateClientInput) =>
    apiFetch<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateClient: (id: string, data: UpdateClientInput) =>
    apiFetch<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteClient: (id: string) =>
    apiFetch<Client>(`/clients/${id}`, { method: 'DELETE' }),

  getContracts: (params?: {
    status?: ContractStatus;
    clientId?: string;
    vehicleId?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.clientId) query.set('clientId', params.clientId);
    if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiFetch<Contract[]>(`/contracts${qs ? `?${qs}` : ''}`);
  },
  getContract: (id: string) => apiFetch<Contract>(`/contracts/${id}`),
  createContract: (data: CreateContractInput) =>
    apiFetch<Contract>('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateContract: (id: string, data: UpdateContractInput) =>
    apiFetch<Contract>(`/contracts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteContract: (id: string) =>
    apiFetch<Contract>(`/contracts/${id}`, { method: 'DELETE' }),
  getProfitability: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    return apiFetch<ProfitabilityRow[]>(
      `/contracts/profitability${qs ? `?${qs}` : ''}`,
    );
  },
  getProfitabilityTrend: (months = 6) =>
    apiFetch<ProfitabilityTrendResponse>(
      `/contracts/profitability/trend?months=${months}`,
    ),

  createLedgerEntry: (contractId: string, data: CreateLedgerInput) =>
    apiFetch<Contract>(`/contracts/${contractId}/ledger`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLedgerEntry: (
    contractId: string,
    entryId: string,
    data: Partial<CreateLedgerInput>,
  ) =>
    apiFetch<Contract>(`/contracts/${contractId}/ledger/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteLedgerEntry: (contractId: string, entryId: string) =>
    apiFetch<Contract>(`/contracts/${contractId}/ledger/${entryId}`, {
      method: 'DELETE',
    }),

  getTelematicsStatus: () =>
    apiFetch<{
      provider: string;
      handshake: string;
      message: string;
      lastFleetSyncAt: string | null;
      lastFleetSyncError: string | null;
      lastFleetSync: {
        provider: string;
        synced: number;
        failed: number;
        errors: Array<{
          vehicleId: string;
          registration?: string;
          message: string;
        }>;
        triggeredBy: string;
        completedAt: string;
      } | null;
      syncInFlight: boolean;
      autoSyncEnabled: boolean;
      syncIntervalMs: number | null;
      queueEnabled: boolean;
    }>('/telematics/status'),
  getMapAssets: () => apiFetch<MapAsset[]>('/telematics/map'),
  syncFleet: () =>
    apiFetch<{
      provider: string;
      synced: number;
      failed: number;
      errors: Array<{
        vehicleId: string;
        registration?: string;
        message: string;
      }>;
      triggeredBy: string;
      completedAt: string;
    }>('/telematics/sync', {
      method: 'POST',
    }),
  syncVehicle: (id: string) =>
    apiFetch<VehicleTelematicsDetail>(`/telematics/vehicles/${id}/sync`, {
      method: 'POST',
    }),
  getVehicleTelematics: (id: string) =>
    apiFetch<VehicleTelematicsDetail>(`/telematics/vehicles/${id}`),
  setImmobilized: (
    id: string,
    immobilize: boolean,
  ) =>
    apiFetch<Vehicle>(`/telematics/vehicles/${id}/immobilize`, {
      method: 'POST',
      body: JSON.stringify({ immobilize, confirm: true }),
    }),

  getDashboardOverview: () =>
    apiFetch<DashboardOverview>('/dashboard/overview'),

  getGhlStatus: () =>
    apiFetch<{
      provider: string;
      handshake: string;
      message: string;
      lastError: string | null;
      lastEvent: string | null;
      lastEventAt: string | null;
      webhookConfigured: boolean;
      autoEnabled: boolean;
      intervalMs: number;
    }>('/ghl/status'),
  runGhlComms: () =>
    apiFetch<{ ok: boolean; status: { provider: string; lastError: string | null } }>(
      '/ghl/comms/run',
      { method: 'POST' },
    ),
  syncClientGhl: (id: string) =>
    apiFetch<Client>(`/clients/${id}/sync-ghl`, { method: 'POST' }),

  getEndOfTermBoard: () =>
    apiFetch<EndOfTermBoard>('/pipeline/end-of-term'),
  updateEndOfTermStage: (id: string, stage: EndOfTermStage) =>
    apiFetch<{ id: string; stage: EndOfTermStage }>(
      `/pipeline/end-of-term/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      },
    ),

  getFinesStatus: () =>
    apiFetch<{
      provider: string;
      handshake: string;
      message: string;
      adminFeeZar: number;
      lastSyncAt: string | null;
      lastError: string | null;
      lastImported: number;
      autoSyncEnabled: boolean;
      syncIntervalMs: number | null;
    }>('/fines/status'),
  getFines: (opts?: { status?: FineImportStatus; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return apiFetch<FineImportRow[]>(`/fines${qs ? `?${qs}` : ''}`);
  },
  syncFines: (registration?: string) => {
    const qs = registration
      ? `?registration=${encodeURIComponent(registration)}`
      : '';
    return apiFetch<{
      provider: string;
      scanned: number;
      fetched: number;
      imported: number;
      adminFeeZar: number;
    }>(`/fines/sync${qs}`, { method: 'POST' });
  },
  invoiceFine: (id: string) =>
    apiFetch<FineImportRow>(`/fines/${id}/invoice`, { method: 'POST' }),

  getLeadsBoard: (params?: { search?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiFetch<LeadsBoard>(`/leads/board${qs ? `?${qs}` : ''}`);
  },
  getLeadsStaff: () => apiFetch<LeadStaff[]>(`/leads/staff`),
  getLead: (id: string) => apiFetch<Lead>(`/leads/${id}`),
  createLead: (data: CreateLeadInput) =>
    apiFetch<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateLead: (id: string, data: UpdateLeadInput) =>
    apiFetch<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  updateLeadStage: (
    id: string,
    data: { stage: LeadStage; reason?: string | null; lossReason?: LeadLossReason | null; lossNotes?: string | null },
  ) =>
    apiFetch<Lead>(`/leads/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  assignLead: (id: string, data: { userId: string | null; reason?: string | null }) =>
    apiFetch<Lead>(`/leads/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  qualifyLead: (
    id: string,
    data: {
      qualificationStatus: LeadQualificationStatus;
      disqualificationReason?: LeadDisqualificationReason | null;
      disqualificationNotes?: string | null;
    },
  ) =>
    apiFetch<Lead>(`/leads/${id}/qualify`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  logLeadContact: (
    id: string,
    data: { outcome: 'attempted' | 'reached'; channel: LeadContactChannel },
  ) =>
    apiFetch<Lead>(`/leads/${id}/contact`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  convertLead: (
    id: string,
    data: {
      idNumber: string;
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      province?: string | null;
      postalCode?: string | null;
      markWon?: boolean;
    },
  ) =>
    apiFetch<Lead>(`/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  globalSearch: (q: string, limit = 8) =>
    apiFetch<GlobalSearchResponse>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),

  getNotifications: (opts?: { includeRead?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.includeRead != null) {
      params.set('includeRead', String(opts.includeRead));
    }
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return apiFetch<NotificationsResponse>(
      `/notifications${qs ? `?${qs}` : ''}`,
    );
  },
  markNotificationRead: (id: string) =>
    apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    apiFetch<{ ok: boolean; marked: number }>('/notifications/read-all', {
      method: 'POST',
    }),
};

export type GlobalSearchResult = {
  type: 'client' | 'vehicle' | 'contract' | 'lead';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type GlobalSearchResponse = {
  q: string;
  clients: GlobalSearchResult[];
  vehicles: GlobalSearchResult[];
  contracts: GlobalSearchResult[];
  leads: GlobalSearchResult[];
};

export type AppNotification = {
  id: string;
  kind: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  title: string;
  detail: string;
  href: string | null;
  amount: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
  isRead: boolean;
};

export type NotificationsResponse = {
  unreadCount: number;
  items: AppNotification[];
};

export type EndOfTermStage =
  | 'FINAL_90'
  | 'CONTACTED'
  | 'BALLOON_PENDING'
  | 'HANDOVER'
  | 'RETURNED';

export type EndOfTermCard = {
  id: string;
  stage: EndOfTermStage;
  planType: string;
  status: string;
  endDate: string;
  balloonAmount: string | null;
  balloonPaid: boolean;
  ghlOpportunityId: string | null;
  endOfTermNotifiedAt: string | null;
  termProgress: TermProgress;
  href: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
    status: string;
  };
};

export type EndOfTermBoard = {
  generatedAt: string;
  total: number;
  columns: Array<{
    stage: EndOfTermStage;
    label: string;
    cards: EndOfTermCard[];
  }>;
};

export type FineImportStatus = 'UNMATCHED' | 'MATCHED' | 'INVOICED' | 'VOID';

export type FineImportRow = {
  id: string;
  externalId: string;
  source: string;
  registration: string;
  offenceDate: string | null;
  amount: string;
  description: string | null;
  status: FineImportStatus;
  contractId: string | null;
  fineLedgerId: string | null;
  adminFeeLedgerId: string | null;
  invoicedAt: string | null;
  createdAt: string;
  href: string | null;
  client: { id: string; firstName: string; lastName: string } | null;
  vehicle: { id: string; registration: string } | null;
};

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFYING'
  | 'DOCUMENTS_REQUESTED'
  | 'APPLICATION_SUBMITTED'
  | 'APPROVED'
  | 'VEHICLE_SELECTED'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type LeadSource =
  | 'META_LEAD_FORM'
  | 'WEBSITE'
  | 'MANUAL'
  | 'PHONE_IN'
  | 'FACEBOOK_MESSENGER'
  | 'OTHER';

export type LeadQualificationStatus = 'UNASSESSED' | 'QUALIFIED' | 'UNQUALIFIED';

export type LeadDisqualificationReason =
  | 'UBER_BOLT'
  | 'AFFORDABILITY'
  | 'INVALID_OR_NO_DRIVERS_LICENCE'
  | 'UNREACHABLE'
  | 'NOT_INTERESTED'
  | 'OUTSIDE_REQUIREMENTS'
  | 'NO_SUITABLE_VEHICLE'
  | 'DUPLICATE'
  | 'OTHER';

export type LeadLossReason =
  | 'APPLICATION_DECLINED'
  | 'CUSTOMER_WITHDREW'
  | 'NO_SUITABLE_VEHICLE'
  | 'UNREACHABLE'
  | 'DUPLICATE'
  | 'OTHER';

export type LeadContactChannel = 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'OTHER';

export type LeadStaff = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
};

export type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  cellphone: string;
  email: string | null;
  area: string | null;
  salaryBand: string | null;
  rentalType: string | null;
  vehicleNeededTiming: string | null;
  vehiclePreference: string | null;
  hasValidDriversLicence: boolean | null;
  source: LeadSource;
  sourceDetail: string | null;
  platform: string | null;
  campaignName: string | null;
  adName: string | null;
  formName: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  externalLeadId: string | null;
  stage: LeadStage;
  qualificationStatus: LeadQualificationStatus;
  disqualificationReason: LeadDisqualificationReason | null;
  disqualificationNotes: string | null;
  lossReason: LeadLossReason | null;
  lossNotes: string | null;
  notes: string | null;
  assignedAt: string | null;
  firstAttemptAt: string | null;
  firstAttemptChannel: LeadContactChannel | null;
  firstContactAt: string | null;
  firstContactChannel: LeadContactChannel | null;
  lastContactAt: string | null;
  documentsReceivedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  href: string;
  assignedUser: LeadStaff | null;
  createdByUser: LeadStaff | null;
  requestedVehicle: {
    id: string;
    make: string;
    model: string;
    registration: string;
    year: number;
  } | null;
  client: { id: string; firstName: string; lastName: string } | null;
  wonContract: { id: string; status: string; planType: string } | null;
  stageHistory: Array<{
    id: string;
    fromStage: LeadStage | null;
    toStage: LeadStage;
    reason: string | null;
    changedAt: string;
    actor: { id: string; fullName: string } | null;
  }>;
};

export type CreateLeadInput = {
  firstName: string;
  lastName: string;
  cellphone: string;
  email?: string | null;
  area?: string | null;
  salaryBand?: string | null;
  rentalType?: string | null;
  vehicleNeededTiming?: string | null;
  vehiclePreference?: string | null;
  hasValidDriversLicence?: boolean | null;
  source?: LeadSource;
  sourceDetail?: string | null;
  notes?: string | null;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;

export type LeadsBoard = {
  generatedAt: string;
  total: number;
  columns: Array<{
    stage: LeadStage;
    label: string;
    cards: Lead[];
  }>;
};

export type DashboardAlert = {
  id: string;
  kind:
    | 'MISSED_PAYMENT'
    | 'ARREARS'
    | 'LATE_PAYMENT'
    | 'PENDING_FINE'
    | 'SERVICE_DUE'
    | 'RULE_BREACH'
    | 'END_OF_TERM';
  severity: 'high' | 'medium';
  title: string;
  detail: string;
  amount: string | null;
  date: string | null;
  client: { id: string; firstName: string; lastName: string } | null;
  contractId: string | null;
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
  } | null;
};

export function alertCategory(
  kind: DashboardAlert['kind'],
): 'internal' | 'driver' {
  return kind === 'RULE_BREACH' ? 'driver' : 'internal';
}

export type NotificationCategory =
  | 'payments'
  | 'service'
  | 'driver'
  | 'end_of_term'
  | 'leads'
  | 'other';

export function notificationCategory(kind: string): NotificationCategory {
  switch (kind) {
    case 'MISSED_PAYMENT':
    case 'ARREARS':
    case 'LATE_PAYMENT':
    case 'PENDING_FINE':
      return 'payments';
    case 'SERVICE_DUE':
      return 'service';
    case 'RULE_BREACH':
      return 'driver';
    case 'END_OF_TERM':
      return 'end_of_term';
    case 'LEAD_ASSIGNED':
      return 'leads';
    default:
      return 'other';
  }
}

export function notificationCategoryLabel(category: NotificationCategory) {
  if (category === 'payments') return 'Payments & fines';
  if (category === 'service') return 'Service';
  if (category === 'driver') return 'Driver behaviour';
  if (category === 'end_of_term') return 'End of term';
  if (category === 'leads') return 'Leads';
  return 'Other';
}

export type DashboardWin = {
  id: string;
  kind: 'EARLY_PAYMENT' | 'PAID_UP';
  title: string;
  detail: string;
  amount: string | null;
  date: string | null;
  client: { id: string; firstName: string; lastName: string };
  contractId: string;
  vehicle: {
    id: string;
    registration: string;
    make: string;
    model: string;
  } | null;
};

export type DashboardTask = {
  id: string;
  label: string;
  severity: 'high' | 'medium';
  contractId: string | null;
  clientId: string | null;
  kind: DashboardAlert['kind'] | 'END_OF_TERM';
  category: TaskCategory;
  assigneeRole: Role;
  assignee: {
    userId: string | null;
    fullName: string;
    role: Role;
    unassigned: boolean;
  };
  advancePipelineTo?: string | null;
};

export type DashboardOverview = {
  generatedAt: string;
  viewer?: {
    id: string;
    fullName: string;
    role: Role;
    canSeeAllTasks: boolean;
  };
  summary: {
    attentionCount: number;
    winsCount: number;
    fleetTotal: number;
    onContract: number;
    available: number;
    arrears: number;
    utilizationPercent: number;
    activeFleet: number;
    paymentAlerts: number;
    serviceDue: number;
    contractsNearingCompletion: number;
    pendingFineCount?: number;
  };
  kpi: {
    activeFleet: number;
    paymentAlerts: number;
    serviceDue: number;
    contractsNearingCompletion: number;
    utilizationPercent: number;
  };
  fleet: {
    total: number;
    onContract: number;
    available: number;
    active: number;
    arrears: number;
    paidUp: number;
    immobilized: number;
    utilizationPercent: number;
    averageDriverScore: number | null;
    byStatus: Array<{
      status: VehicleStatus;
      count: number;
      percent: number;
    }>;
    vehicles: Array<{
      id: string;
      make: string;
      model: string;
      year: number;
      registration: string;
      status: VehicleStatus;
      currentOdometerKm: number;
      driverScore: number | null;
      isImmobilized: boolean;
      contractId: string | null;
      planType: string | null;
      client: { id: string; firstName: string; lastName: string } | null;
    }>;
  };
  attention: DashboardAlert[];
  wins: DashboardWin[];
  analytics?: {
    geography: Array<{ area: string; count: number }>;
    contractHealth: {
      healthy: number;
      ending: number;
      needsAttention: number;
      byStatus: Array<{ status: string; count: number }>;
    };
    endOfTerm: {
      watch: number;
      finalNinety: number;
      contacted: number;
      closing: number;
      completed: number;
    };
    endingClients?: Array<{
      clientId: string;
      firstName: string;
      lastName: string;
      contractId: string;
      registration: string;
      daysRemaining: number;
    }>;
    pendingFineCount: number;
  };
  myTasks?: DashboardTask[];
  tasksByCategory?: Record<TaskCategory, DashboardTask[]>;
};

export type MapAsset = {
  id: string;
  make: string;
  model: string;
  year: number;
  registration: string;
  status: VehicleStatus;
  lat: number | null;
  lng: number | null;
  lastLocationAt: string | null;
  currentOdometerKm: number;
  driverScore: number | null;
  isImmobilized: boolean;
  nextServiceDueKm: number | null;
  nextServiceDueDate: string | null;
  daysUntilService: number | null;
  serviceDueSoon: boolean;
  averageDailyKm: number | null;
  mileage: {
    monthlyLimitKm: number | null;
    projectedMonthlyKm: number;
    overLimit: boolean;
    usagePercent: number | null;
  };
  client: { id: string; firstName: string; lastName: string } | null;
  carTrackDeviceId: string | null;
  lastTelematicsSyncAt: string | null;
};

export type DriverScoreBreakdown = {
  overall: number;
  speeding: number;
  harshBraking: number;
  harshAcceleration: number;
  idling: number;
};

export type VehicleTelematicsDetail = {
  vehicle: Vehicle & {
    isImmobilized: boolean;
    lastKnownLat: string | null;
    lastKnownLng: string | null;
    averageDailyKm: string | null;
    lastTelematicsSyncAt: string | null;
    telematicsEvents?: Array<{
      id: string;
      type: string;
      message: string | null;
      recordedAt: string;
      odometerKm: number | null;
      driverScore: number | null;
    }>;
  };
  prediction: {
    nextServiceDueKm: number;
    nextServiceDueDate: string;
    remainingKm: number;
    estimatedDaysUntilService: number;
  } | null;
  mileage: MapAsset['mileage'];
  scoreBreakdown: DriverScoreBreakdown | null;
  recentBreaches?: Array<{
    id: string;
    code: string;
    severity: string;
    message: string;
    occurredAt: string;
  }>;
  ruleBreaches?: Array<{
    code: string;
    severity: string;
    message: string;
    occurredAt: string;
  }>;
  provider: string;
};

export function statusLabel(status: VehicleStatus | string) {
  switch (status) {
    case 'AVAILABLE':
      return 'New / Available';
    case 'ACTIVE':
      return 'Active';
    case 'ARREARS':
      return 'Arrears';
    case 'PAID_UP':
      return 'Paid Up';
    case 'RETURNED':
      return 'Returned';
    case 'WRITTEN_OFF':
      return 'Written Off';
    default:
      return status;
  }
}
