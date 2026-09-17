import { Role } from '../generated/prisma/enums';
import {
  ALL_PERMISSIONS,
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  permissionsForRole,
  roleLabel,
} from './permissions';
import {
  canAccessPath,
  hasPermission as webHasPermission,
  navLinksForRole,
  roleLabel as webRoleLabel,
  ROLE_PERMISSIONS as WEB_ROLE_PERMISSIONS,
} from '../../../web/src/lib/permissions';
import {
  sanitizeContractForViewer,
  sanitizeClientForViewer,
} from './contract-access';

describe('Phase 1B permissions matrix', () => {
  it('exposes SALES and FINANCE on the Role enum', () => {
    expect(Role.SALES).toBe('SALES');
    expect(Role.FINANCE).toBe('FINANCE');
    expect(Role.SUPER_ADMIN).toBe('SUPER_ADMIN');
    expect(Role.ADMIN).toBe('ADMIN');
    expect(Role.FLEET_MANAGER).toBe('FLEET_MANAGER');
  });

  it('uses friendly role labels', () => {
    expect(roleLabel(Role.SUPER_ADMIN)).toBe('Super Admin');
    expect(roleLabel(Role.ADMIN)).toBe('Manager / Admin');
    expect(roleLabel(Role.FLEET_MANAGER)).toBe('Fleet / Licensing');
    expect(roleLabel(Role.SALES)).toBe('Sales');
    expect(roleLabel(Role.FINANCE)).toBe('Finance');
  });

  it('gives SUPER_ADMIN every permission', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission(Role.SUPER_ADMIN, permission)).toBe(true);
    }
    expect(permissionsForRole(Role.SUPER_ADMIN)).toEqual(ALL_PERMISSIONS);
  });

  it('keeps ADMIN broad but without immobilize or user management', () => {
    expect(hasPermission(Role.ADMIN, Permission.FINANCE_READ)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.CONTRACTS_WRITE)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.AUTOMATION_MANAGE)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.CLIENTS_DELETE)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.TELEMATICS_IMMOBILIZE)).toBe(
      false,
    );
    expect(hasPermission(Role.ADMIN, Permission.USERS_MANAGE)).toBe(false);
  });

  it('keeps FLEET_MANAGER on fleet workflows without finance or users', () => {
    expect(hasPermission(Role.FLEET_MANAGER, Permission.FLEET_READ)).toBe(true);
    expect(hasPermission(Role.FLEET_MANAGER, Permission.FLEET_WRITE)).toBe(
      true,
    );
    expect(hasPermission(Role.FLEET_MANAGER, Permission.TELEMATICS_SYNC)).toBe(
      true,
    );
    expect(hasPermission(Role.FLEET_MANAGER, Permission.CONTRACTS_READ)).toBe(
      true,
    );
    expect(
      hasPermission(Role.FLEET_MANAGER, Permission.CONTRACTS_FINANCE_READ),
    ).toBe(false);
    expect(hasPermission(Role.FLEET_MANAGER, Permission.FINANCE_READ)).toBe(
      false,
    );
    expect(hasPermission(Role.FLEET_MANAGER, Permission.USERS_MANAGE)).toBe(
      false,
    );
    expect(
      hasPermission(Role.FLEET_MANAGER, Permission.TELEMATICS_IMMOBILIZE),
    ).toBe(false);
  });

  it('denies SALES finance/profitability and fleet-control APIs', () => {
    expect(hasPermission(Role.SALES, Permission.DASHBOARD_READ)).toBe(true);
    expect(hasPermission(Role.SALES, Permission.CLIENTS_READ)).toBe(true);
    expect(hasPermission(Role.SALES, Permission.FLEET_READ)).toBe(true);
    expect(hasPermission(Role.SALES, Permission.FINANCE_READ)).toBe(false);
    expect(hasPermission(Role.SALES, Permission.CONTRACTS_READ)).toBe(false);
    expect(hasPermission(Role.SALES, Permission.TELEMATICS_IMMOBILIZE)).toBe(
      false,
    );
    expect(hasPermission(Role.SALES, Permission.AUTOMATION_MANAGE)).toBe(false);
    expect(hasPermission(Role.SALES, Permission.USERS_MANAGE)).toBe(false);
    expect(hasPermission(Role.SALES, Permission.LICENCES_READ)).toBe(false);
    expect(hasPermission(Role.SALES, Permission.LICENCES_WRITE)).toBe(false);
  });

  it('Phase 1C licence permissions', () => {
    expect(hasPermission(Role.SUPER_ADMIN, Permission.LICENCES_WRITE)).toBe(
      true,
    );
    expect(hasPermission(Role.ADMIN, Permission.LICENCES_WRITE)).toBe(true);
    expect(hasPermission(Role.FLEET_MANAGER, Permission.LICENCES_WRITE)).toBe(
      true,
    );
    expect(hasPermission(Role.FINANCE, Permission.LICENCES_READ)).toBe(true);
    expect(hasPermission(Role.FINANCE, Permission.LICENCES_WRITE)).toBe(false);
  });

  it('Phase 2A lead permissions', () => {
    expect(hasPermission(Role.SUPER_ADMIN, Permission.LEADS_ASSIGN)).toBe(true);
    expect(hasPermission(Role.SUPER_ADMIN, Permission.LEADS_REPORTS)).toBe(
      true,
    );
    expect(hasPermission(Role.ADMIN, Permission.LEADS_READ)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.LEADS_WRITE)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.LEADS_ASSIGN)).toBe(true);
    expect(hasPermission(Role.ADMIN, Permission.LEADS_REPORTS)).toBe(true);
    expect(hasPermission(Role.SALES, Permission.LEADS_READ)).toBe(true);
    expect(hasPermission(Role.SALES, Permission.LEADS_WRITE)).toBe(true);
    expect(hasPermission(Role.SALES, Permission.LEADS_ASSIGN)).toBe(false);
    expect(hasPermission(Role.SALES, Permission.LEADS_REPORTS)).toBe(false);
    expect(hasPermission(Role.FLEET_MANAGER, Permission.LEADS_READ)).toBe(
      false,
    );
    expect(hasPermission(Role.FINANCE, Permission.LEADS_READ)).toBe(false);
  });

  it('allows FINANCE contract/finance access and denies immobilisation', () => {
    expect(hasPermission(Role.FINANCE, Permission.FINANCE_READ)).toBe(true);
    expect(hasPermission(Role.FINANCE, Permission.FINANCE_WRITE)).toBe(true);
    expect(hasPermission(Role.FINANCE, Permission.CONTRACTS_WRITE)).toBe(true);
    expect(hasPermission(Role.FINANCE, Permission.CONTRACTS_FINANCE_READ)).toBe(
      true,
    );
    expect(hasPermission(Role.FINANCE, Permission.TELEMATICS_IMMOBILIZE)).toBe(
      false,
    );
    expect(hasPermission(Role.FINANCE, Permission.USERS_MANAGE)).toBe(false);
  });

  it('strips Schedule A finance fields without CONTRACTS_FINANCE_READ', () => {
    const raw = {
      id: '1',
      monthlyRate: '4500.00',
      cipAmount: '100.00',
      status: 'ACTIVE',
      ledger: [{ id: 'l1', amount: '100' }],
    };
    const fleetView = sanitizeContractForViewer(
      raw,
      Role.FLEET_MANAGER,
    ) as typeof raw & {
      financeRestricted?: boolean;
    };
    expect(fleetView.monthlyRate).toBeNull();
    expect(fleetView.cipAmount).toBeNull();
    expect(fleetView.ledger).toEqual([]);
    expect(fleetView.financeRestricted).toBe(true);
    expect(fleetView.status).toBe('ACTIVE');

    const financeView = sanitizeContractForViewer(
      raw,
      Role.FINANCE,
    ) as typeof raw & {
      financeRestricted?: boolean;
    };
    expect(financeView.monthlyRate).toBe('4500.00');
    expect(financeView.financeRestricted).toBeUndefined();
  });

  it('strips client opsSummary money without FINANCE_READ', () => {
    const client = {
      id: 'c1',
      firstName: 'A',
      contracts: [{ monthlyRate: '1000', status: 'ACTIVE' }],
      opsSummary: {
        arrears: true,
        outstandingBalance: '500.00',
        pendingFineTotal: '50.00',
        alerts: [{ kind: 'ARREARS', amount: '500.00' }],
      },
    };
    const salesView = sanitizeClientForViewer(client, Role.SALES);
    const summary = salesView.opsSummary as {
      outstandingBalance: string | null;
      pendingFineTotal: string | null;
      alerts: Array<{ amount: string | null }>;
    };
    expect(summary.outstandingBalance).toBeNull();
    expect(summary.pendingFineTotal).toBeNull();
    expect(summary.alerts[0].amount).toBeNull();
  });
});

describe('Phase 1B web permission helpers', () => {
  it('keeps web ROLE_PERMISSIONS aligned with API for each role', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      expect([...WEB_ROLE_PERMISSIONS[role]].sort()).toEqual(
        [...ROLE_PERMISSIONS[role]].sort(),
      );
      expect(webRoleLabel(role)).toBe(roleLabel(role));
    }
  });

  it('filters navigation by role', () => {
    const superLinks = navLinksForRole('SUPER_ADMIN').map((l) => l.href);
    expect(superLinks).toEqual(
      expect.arrayContaining([
        '/',
        '/fleet',
        '/map',
        '/clients',
        '/contracts',
        '/profitability',
        '/automation',
      ]),
    );

    const salesLinks = navLinksForRole('SALES').map((l) => l.href);
    expect(salesLinks).toContain('/');
    expect(salesLinks).toContain('/clients');
    expect(salesLinks).toContain('/fleet');
    expect(salesLinks).not.toContain('/profitability');
    expect(salesLinks).not.toContain('/contracts');
    expect(salesLinks).not.toContain('/automation');
    expect(salesLinks).not.toContain('/map');

    const financeLinks = navLinksForRole('FINANCE').map((l) => l.href);
    expect(financeLinks).toContain('/contracts');
    expect(financeLinks).toContain('/profitability');
    expect(financeLinks).not.toContain('/map');
    expect(financeLinks).not.toContain('/automation');
    expect(financeLinks).not.toContain('/licences');

    const fleetLinks = navLinksForRole('FLEET_MANAGER').map((l) => l.href);
    expect(fleetLinks).toContain('/fleet');
    expect(fleetLinks).toContain('/map');
    expect(fleetLinks).toContain('/contracts');
    expect(fleetLinks).toContain('/licences');
    expect(fleetLinks).not.toContain('/profitability');

    expect(salesLinks).not.toContain('/licences');
    expect(salesLinks).toContain('/leads');
    expect(financeLinks).not.toContain('/leads');
    expect(fleetLinks).not.toContain('/leads');
  });

  it('blocks direct navigation to unauthorised paths', () => {
    expect(canAccessPath('SALES', '/profitability')).toBe(false);
    expect(canAccessPath('SALES', '/contracts/abc')).toBe(false);
    expect(canAccessPath('SALES', '/licences')).toBe(false);
    expect(canAccessPath('SALES', '/leads')).toBe(true);
    expect(canAccessPath('SALES', '/')).toBe(true);
    expect(canAccessPath('FINANCE', '/profitability')).toBe(true);
    expect(canAccessPath('FINANCE', '/licences')).toBe(true);
    expect(canAccessPath('FINANCE', '/leads')).toBe(false);
    expect(canAccessPath('FINANCE', '/map')).toBe(false);
    expect(canAccessPath('SUPER_ADMIN', '/automation')).toBe(true);
    expect(canAccessPath('FLEET_MANAGER', '/licences')).toBe(true);
    expect(canAccessPath('FLEET_MANAGER', '/leads')).toBe(false);
    expect(webHasPermission('FLEET_MANAGER', 'USERS_MANAGE')).toBe(false);
  });
});
