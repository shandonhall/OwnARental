import type { Role } from '../generated/prisma/enums';
import { hasPermission, Permission } from '../auth/permissions';

/** Schedule A commercial fields stripped without CONTRACTS_FINANCE_READ. */
const CONTRACT_FINANCE_KEYS = [
  'vehicleValue',
  'cipAmount',
  'initialOnRoadCosts',
  'vehicleRentalAmount',
  'administrationAmount',
  'warrantyAmount',
  'servicePlanAmount',
  'trackingAmount',
  'licenceFeeAmount',
  'insuranceAmount',
  'lifeInsuranceAmount',
  'otherMonthlyAmount',
  'depositAmount',
  'balloonAmount',
  'cipPercent',
  'monthlyRate',
  'totalPaid',
  'outstandingBalance',
  'outstandingExBalloon',
  'balloonOutstanding',
  'hasBalloon',
  'balloonPaid',
  'monthOwed',
  'expectedTotal',
  'pricingBreakdownCaptured',
  'pricingBreakdownComplete',
  'calculatedComponentsTotal',
  'componentsMatchMonthlyRate',
  'ledger',
] as const;

export function canReadContractFinance(role: Role): boolean {
  return hasPermission(role, Permission.CONTRACTS_FINANCE_READ);
}

export function sanitizeContractForViewer<T extends Record<string, unknown>>(
  contract: T,
  role: Role,
): T {
  if (canReadContractFinance(role)) return contract;

  const copy: Record<string, unknown> = { ...contract };
  for (const key of CONTRACT_FINANCE_KEYS) {
    if (key in copy) {
      if (key === 'ledger') {
        copy[key] = [];
      } else if (
        key === 'hasBalloon' ||
        key === 'balloonPaid' ||
        key === 'pricingBreakdownCaptured' ||
        key === 'pricingBreakdownComplete'
      ) {
        copy[key] = false;
      } else if (key === 'componentsMatchMonthlyRate') {
        copy[key] = null;
      } else {
        copy[key] = null;
      }
    }
  }
  copy.financeRestricted = true;
  return copy as T;
}

export function sanitizeContractsForViewer<T extends Record<string, unknown>>(
  contracts: T[],
  role: Role,
): T[] {
  return contracts.map((contract) => sanitizeContractForViewer(contract, role));
}

type OpsSummary = {
  arrears?: boolean;
  outstandingBalance?: string | null;
  pendingFineCount?: number;
  pendingFineTotal?: string | null;
  driverScore?: number | null;
  activeContractId?: string | null;
  alertCount?: number;
  alerts?: Array<Record<string, unknown>>;
};

/** Strip nested contract finance and ledger amounts without FINANCE_READ. */
export function sanitizeClientForViewer<T extends Record<string, unknown>>(
  client: T,
  role: Role,
): T {
  const contracts = Array.isArray(client.contracts)
    ? sanitizeContractsForViewer(
        client.contracts as Record<string, unknown>[],
        role,
      )
    : client.contracts;

  const canSeeFinance = hasPermission(role, Permission.FINANCE_READ);
  const opsSummary = client.opsSummary as OpsSummary | undefined;

  if (!opsSummary || canSeeFinance) {
    return { ...client, contracts };
  }

  const alerts = (opsSummary.alerts ?? []).map((alert) => {
    const next = { ...alert };
    if ('amount' in next) next.amount = null;
    return next;
  });

  return {
    ...client,
    contracts,
    opsSummary: {
      ...opsSummary,
      outstandingBalance: null,
      pendingFineTotal: null,
      alerts,
      alertCount: alerts.length,
    },
  };
}

export function sanitizeClientsForViewer<T extends Record<string, unknown>>(
  clients: T[],
  role: Role,
): T[] {
  return clients.map((client) => sanitizeClientForViewer(client, role));
}
