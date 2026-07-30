import { createClient } from '@/lib/supabase/client';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'FLEET_MANAGER';

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
  return 'User';
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
    vehicle?: {
      id: string;
      make: string;
      model: string;
      registration: string;
    };
  }>;
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
  profit: string;
  roiPercent: string;
  contractCount: number;
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
  getProfitability: () =>
    apiFetch<ProfitabilityRow[]>('/contracts/profitability'),

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
  type: 'client' | 'vehicle' | 'contract';
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

export type DashboardAlert = {
  id: string;
  kind:
    | 'MISSED_PAYMENT'
    | 'ARREARS'
    | 'LATE_PAYMENT'
    | 'PENDING_FINE'
    | 'SERVICE_DUE'
    | 'RULE_BREACH';
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

export type DashboardOverview = {
  generatedAt: string;
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
